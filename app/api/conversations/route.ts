import { authOptions } from '@/infrastructure/auth/auth';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

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
        participants: {
          some: { userId: currentUser.id }
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastActiveAt: true } }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, image: true } }
          }
        },
        learningPath: { select: { id: true, title: true } }
      }
    });

    // Process conversations to sort direct chats with online users first
    const processedConversations = conversations.map(conv => {
      if (conv.type === 'DIRECT') {
        // Get the other user's online status
        const otherUser = conv.participants.find(p => p.userId !== currentUser.id)?.user;
        return {
          ...conv,
          _sortKey: otherUser?.isOnline ? 0 : 1, // Online first (0 comes before 1)
          otherUserOnline: otherUser?.isOnline || false
        };
      }
      return { ...conv, _sortKey: 2, otherUserOnline: false };
    }).sort((a, b) => {
      // First sort by online status, then by lastMessageAt
      if (a._sortKey !== b._sortKey) return a._sortKey - b._sortKey;
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });

    return NextResponse.json(processedConversations);
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

    const body = await request.json();
    const { type, participantIds, learningPathId, name } = body;

    // Create direct chat (1:1)
    if (type === 'DIRECT') {
      if (!participantIds || participantIds.length !== 1) {
        return NextResponse.json({ error: 'Direct chat requires exactly one participant' }, { status: 400 });
      }

      // Check if conversation already exists between these two users
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: {
              userId: { in: [currentUser.id, participantIds[0]] }
            }
          }
        }
      });

      if (existingConversation) {
        return NextResponse.json(existingConversation);
      }

      // Create new direct conversation
      const newConversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          participants: {
            create: [
              { userId: currentUser.id, role: 'MEMBER' },
              { userId: participantIds[0], role: 'MEMBER' }
            ]
          }
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, image: true, email: true } } }
          }
        }
      });

      console.log(`✅ Created new DIRECT conversation: ${newConversation.id} between ${currentUser.id} and ${participantIds[0]}`);
      return NextResponse.json(newConversation);
    }
    
    // Create group chat (can be auto-created for learning paths)
    if (type === 'GROUP') {
      const allParticipants = participantIds || [];
      if (!allParticipants.includes(currentUser.id)) {
        allParticipants.push(currentUser.id);
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
            await prisma.conversationParticipant.create({
              data: {
                conversationId: existingGroup.id,
                userId: currentUser.id,
                role: 'MEMBER'
              }
            });

            // Add system message
            await prisma.message.create({
              data: {
                conversationId: existingGroup.id,
                senderId: currentUser.id,
                content: `${currentUser.name || 'A new user'} joined the group`,
                messageType: 'SYSTEM'
              }
            });
          }

          return NextResponse.json(existingGroup);
        }
      }

      // Create new group conversation
      const groupName = name || (learningPathId ? 'Learning Community' : 'New Group');

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
      participants: {
        create: allParticipants.map((userId: string, index: number) => ({
          userId,
          role: index === 0 ? 'ADMIN' : 'MEMBER' // First user is admin
        }))
      }
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, image: true, email: true } } }
      }
    }
  });

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

      return NextResponse.json(newGroup);
    }

    return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}