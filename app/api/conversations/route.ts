import { authOptions } from '@/src/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

// helper function 
function toTag(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // More robust session check - use id if available, fall back to email
    const userIdentifier = session?.user?.id || session?.user?.email;
    if (!userIdentifier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: userIdentifier },
          { email: session.user?.email }
        ]
      },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all conversations the user is part of
    const conversations = await prisma.conversation.findMany({
      where: {
        ConversationParticipant: {
          some: { userId: currentUser.id }
        }
      },
      include: {
        ConversationParticipant: {
          include: {
            User: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastActiveAt: true, emailVerified: true } }
          }
        },
        Message: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            User: { select: { id: true, name: true, image: true, emailVerified: true } }
          },
        },
      }
    });

    // Process conversations to sort direct chats with online users first
    const processedConversations = conversations.map(conv => {
      // Rename ConversationParticipant to participants for frontend compatibility
      const { ConversationParticipant, Message, ...rest } = conv;
      // Filter out unregistered (unverified) users from participants and messages
      const verifiedParticipants = ConversationParticipant.filter(p => p.User?.emailVerified != null);
      const verifiedMessages = Message.filter(m => m.User?.emailVerified != null);
      const convWithFrontendKeys = {
        ...rest,
        participants: verifiedParticipants.map(p => ({
          ...p,
          user: p.User // Map User to user for frontend type compatibility
        })),
        messages: verifiedMessages.map(m => ({
          ...m,
          sender: m.User
        }))
      };
      
      if (convWithFrontendKeys.type === 'DIRECT') {
        // Get the other user's online status
        const otherUser = convWithFrontendKeys.participants.find(p => p.userId !== currentUser.id)?.user;
        return {
          ...convWithFrontendKeys,
          _sortKey: otherUser?.isOnline ? 0 : 1, // Online first (0 comes before 1), safe fallback if otherUser is undefined
          otherUserOnline: otherUser?.isOnline ?? false // Use nullish coalescing for safer undefined check
        };
      }
      return { ...convWithFrontendKeys, _sortKey: 2, otherUserOnline: false };
    }).sort((a, b) => {
      // First sort by online status, then by lastMessageAt
      if (a._sortKey !== b._sortKey) return a._sortKey - b._sortKey;
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });

    // Filter out any direct conversations that have no other registered participants
    const validConversations = processedConversations.filter(conv => {
      if (conv.type === 'DIRECT') {
        // For direct chats, keep only if there's another registered user
        return conv.participants.some(p => p.userId !== currentUser.id);
      }
      // For group chats, keep if there are still other participants
      return conv.participants.length > 1;
    });

    const visibleConversations = validConversations.map((conversation) => {
      const {
        _sortKey,
        learningPathId,
        topicTags,
        communityKey,
        ...visibleConversation
      } = conversation;
      return visibleConversation;
    });

    return NextResponse.json(visibleConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // More robust session check - use id if available, fall back to email
    const userIdentifier = session?.user?.id || session?.user?.email;
    if (!userIdentifier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: userIdentifier },
          { email: session.user?.email }
        ]
      },
      select: { id: true, name: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected a JSON object' }, { status: 400 });
    }
    const { type, participantIds, learningPathId, name } = body as {
      type?: unknown;
      participantIds?: unknown;
      learningPathId?: unknown;
      name?: unknown;
    };

    // Create direct chat (1:1)
    if (type === 'DIRECT') {
      if (!Array.isArray(participantIds) || participantIds.length !== 1 || typeof participantIds[0] !== 'string') {
        return NextResponse.json({ error: 'Invalid participantIds for direct chat' }, { status: 400 });
      }
      
      // Only allow creating chats with registered users
      const otherUser = await prisma.user.findUnique({
        where: { id: participantIds[0] },
        select: { id: true, emailVerified: true }
      });
      
      if (!otherUser || !otherUser.emailVerified) {
        return NextResponse.json({ error: 'Can only create chats with registered users' }, { status: 400 });
      }

      // Check if direct conversation already exists
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          ConversationParticipant: {
            every: {
              userId: { in: [currentUser.id, otherUser.id] }
            }
          }
        },
        select: { id: true }
      });

      if (existingConversation) {
        return NextResponse.json({ id: existingConversation.id }, { status: 200 });
      }

      // Create new direct conversation
      const newConversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          ConversationParticipant: {
            create: [
              { userId: currentUser.id },
              { userId: otherUser.id }
            ]
          }
        },
        select: { id: true }
      });

      return NextResponse.json({ id: newConversation.id }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported conversation type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}