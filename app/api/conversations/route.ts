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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
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
            User: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastActiveAt: true } }
          }
        },
        Message: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            User: { select: { id: true, name: true, image: true } }
          }
        },
      }
    });

    // Process conversations to sort direct chats with online users first
    const processedConversations = conversations.map(conv => {
      // Rename ConversationParticipant to participants for frontend compatibility
      const { ConversationParticipant, Message, ...rest } = conv;
      const convWithFrontendKeys = {
        ...rest,
        participants: ConversationParticipant.map(p => ({
          ...p,
          user: p.User // Map User to user for frontend type compatibility
        })),
        messages: Message.map(m => ({
          ...m,
          sender: m.User
        }))
      };
      
      if (convWithFrontendKeys.type === 'DIRECT') {
        // Get the other user's online status
        const otherUser = convWithFrontendKeys.participants.find(p => p.userId !== currentUser.id)?.user;
        return {
          ...convWithFrontendKeys,
          _sortKey: otherUser?.isOnline ? 0 : 1, // Online first (0 comes before 1)
          otherUserOnline: otherUser?.isOnline || false
        };
      }
      return { ...convWithFrontendKeys, _sortKey: 2, otherUserOnline: false };
    }).sort((a, b) => {
      // First sort by online status, then by lastMessageAt
      if (a._sortKey !== b._sortKey) return a._sortKey - b._sortKey;
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });

    const visibleConversations = processedConversations.map((conversation) => {
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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
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
        return NextResponse.json({ error: 'Direct chat requires exactly one participant' }, { status: 400 });
      }
      const targetUserId = participantIds[0];
      if (targetUserId === currentUser.id) {
        return NextResponse.json({ error: 'Cannot create a conversation with yourself' }, { status: 400 });
      }
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
      if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // Check if conversation already exists between these two users (exactly these two users, no more)
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          memberCount: 2,
          AND: [
            { ConversationParticipant: { every: { userId: { in: [currentUser.id, targetUserId] } } } },
            { ConversationParticipant: { some: { userId: currentUser.id } } },
            { ConversationParticipant: { some: { userId: targetUserId } } }
          ]
        }
      });

      if (existingConversation) {
        return NextResponse.json(existingConversation);
      }

      // Create new direct conversation
      const newConversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          memberCount: 2,
          ConversationParticipant: {
            create: [
              { userId: currentUser.id, role: 'MEMBER' },
              { userId: targetUserId, role: 'MEMBER' }
            ]
          }
        },
        include: {
          ConversationParticipant: {
            include: { User: { select: { id: true, name: true, image: true, email: true } } }
          }
        }
      });

      // Map to frontend expected keys
      const { ConversationParticipant, ...rest } = newConversation;
      const mappedConversation = {
        ...rest,
        participants: ConversationParticipant.map(p => ({
          ...p,
          user: p.User
        }))
      };
      console.log(`✅ Created new DIRECT conversation: ${newConversation.id} between ${currentUser.id} and ${participantIds[0]}`);
      return NextResponse.json(mappedConversation);
    }
    
    // Create group chat (can be auto-created for learning paths)
    if (type === 'GROUP') {
      if (participantIds !== undefined && (!Array.isArray(participantIds) || participantIds.some((id) => typeof id !== 'string'))) {
        return NextResponse.json({ error: 'Participant IDs must be strings' }, { status: 400 });
      }
      if (Array.isArray(participantIds) && participantIds.length > 99) {
        return NextResponse.json({ error: 'A group can have at most 100 participants' }, { status: 400 });
      }
      const allParticipants = [...new Set([...(Array.isArray(participantIds) ? participantIds as string[] : []), currentUser.id])];
      if (allParticipants.length !== 1) {
        return NextResponse.json({ error: 'Add members through an invitation they accept' }, { status: 400 });
      }
      if (learningPathId !== undefined && (typeof learningPathId !== 'string' || !learningPathId)) {
        return NextResponse.json({ error: 'Invalid learning path ID' }, { status: 400 });
      }
      if (typeof name === 'string' && name.trim().length > 80) {
        return NextResponse.json({ error: 'Group name must be 80 characters or fewer' }, { status: 400 });
      }
      if (learningPathId) {
        const ownedPath = await prisma.learningPath.findFirst({
          where: { id: learningPathId, userId: currentUser.id },
          select: { id: true },
        });
        if (!ownedPath) return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
      }
      if (allParticipants.length > 1) {
        const validUsers = await prisma.user.count({ where: { id: { in: allParticipants } } });
        if (validUsers !== allParticipants.length) {
          return NextResponse.json({ error: 'One or more participants were not found' }, { status: 404 });
        }
      }

      // If it's a learning path group, check if it already exists
      if (learningPathId) {
        const existingGroup = await prisma.conversation.findFirst({
          where: {
            type: 'GROUP',
            learningPathId: learningPathId
          }
        });

        if (existingGroup) {
          // Add the user to the existing group if not already a member
          const isMember = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId: existingGroup.id,
              userId: currentUser.id
            }
          });

          if (!isMember) {
            await prisma.$transaction(async (tx) => {
              const membership = await tx.conversationParticipant.createMany({
                data: [{ conversationId: existingGroup.id, userId: currentUser.id, role: 'MEMBER' }],
                skipDuplicates: true,
              });
              if (membership.count) {
                await tx.conversation.update({ where: { id: existingGroup.id }, data: { memberCount: { increment: 1 } } });
                await tx.message.create({
                  data: {
                    conversationId: existingGroup.id,
                    senderId: currentUser.id,
                    content: `${currentUser.name || 'A new user'} joined the group`,
                    messageType: 'SYSTEM'
                  }
                });
              }
            });
          }

          return NextResponse.json(existingGroup);
        }
      }

      // Create new group conversation
      const groupName = typeof name === 'string' && name.trim()
        ? name.trim()
        : (learningPathId ? 'Learning Community' : 'New Group');

      // Generate topicTags from learning path if available
      let topicTags: string[] = [];
      if (learningPathId) {
        const learningPath = await prisma.learningPath.findUnique({
          where: { id: learningPathId },
          select: { title: true }
        });
        if (learningPath?.title) {
          topicTags = [toTag(learningPath.title)];
        }
      }

      const newGroup = await prisma.conversation.create({
        data: {
          type: 'GROUP',
          name: groupName,
          learningPathId: learningPathId || null,
          topicTags: topicTags,
          ConversationParticipant: {
            create: allParticipants.map((userId: string) => ({
              userId,
              role: userId === currentUser.id ? 'ADMIN' : 'MEMBER'
            }))
          }
        },
        include: {
          ConversationParticipant: {
            include: { User: { select: { id: true, name: true, image: true, email: true } } }
          }
        }
      });

  // Map to frontend expected keys
      const { ConversationParticipant: groupParticipants, ...groupRest } = newGroup;
      const mappedGroup = {
        ...groupRest,
        participants: groupParticipants.map(p => ({
          ...p,
          user: p.User
        }))
      };
      console.log(`✅ Created new GROUP conversation: ${newGroup.id} "${groupName}" with ${allParticipants.length} participants`);

      // Add welcome system message
      await prisma.message.create({
        data: {
          conversationId: newGroup.id,
          senderId: currentUser.id,
          content: `Welcome to ${groupName}! This is the start of your community chat.`,
          messageType: 'SYSTEM'
        }
      });

      return NextResponse.json(mappedGroup);
    }

    return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}