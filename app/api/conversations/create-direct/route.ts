import { authOptions } from '@/infrastructure/auth/auth';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

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

    // Check if a direct conversation already exists between these two users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: currentUser.id } } },
          { participants: { some: { userId: targetUserId } } },
          { participants: { every: { userId: { in: [currentUser.id, targetUserId] } } } },
        ]
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastActiveAt: true } }
          }
        }
      }
    });

    // If it exists, return it
    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    // If not, create a new direct conversation
    const newConversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [
            { userId: currentUser.id },
            { userId: targetUserId }
          ]
        },
        memberCount: 2
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastActiveAt: true } }
          }
        }
      }
    });

    return NextResponse.json(newConversation);
  } catch (error) {
    console.error('Error creating direct conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
