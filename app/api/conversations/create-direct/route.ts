import { authOptions } from '@/src/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Verify authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the target user ID from the request body
    const { targetUserId } = await request.json();
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Invalid target user ID' }, { status: 400 });
    }

    // Get the current user's ID from the database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }
    if (targetUserId === currentUser.id) {
      return NextResponse.json({ error: 'Cannot create a conversation with yourself' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if a direct conversation already exists between these two users (exactly these two users, no more)
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        memberCount: 2,
        AND: [
          { ConversationParticipant: { every: { userId: { in: [currentUser.id, targetUserId] } } } },
          { ConversationParticipant: { some: { userId: currentUser.id } } },
          { ConversationParticipant: { some: { userId: targetUserId } } }
        ]
      },
      include: {
        ConversationParticipant: {
          include: {
            User: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastActiveAt: true } }
          }
        }
      }
    });

    // If it exists, return it mapped to frontend keys
    if (existingConversation) {
      const { ConversationParticipant, ...rest } = existingConversation;
      const mapped = {
        ...rest,
        participants: ConversationParticipant.map(p => ({ ...p, user: p.User }))
      };
      return NextResponse.json(mapped);
    }

    // If not, create a new direct conversation
    const newConversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        ConversationParticipant: {
          create: [
            { userId: currentUser.id },
            { userId: targetUserId }
          ]
        },
        memberCount: 2
      },
      include: {
        ConversationParticipant: {
          include: {
            User: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastActiveAt: true } }
          }
        }
      }
    });

    // Map to frontend expected keys
    const { ConversationParticipant: convParticipants, ...rest } = newConversation;
    const mappedNew = {
      ...rest,
      participants: convParticipants.map(p => ({ ...p, user: p.User }))
    };
    return NextResponse.json(mappedNew);
  } catch (error) {
    console.error('Error creating direct conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}