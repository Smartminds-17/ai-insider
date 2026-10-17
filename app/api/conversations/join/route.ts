import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/infrastructure/auth/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { conversationId } = await request.json();
  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  // Get current user with name for system message
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true }
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if user is already in the conversation
  const existingParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: currentUser.id
      }
    }
  });

  if (existingParticipant) {
    return NextResponse.json({ success: true, message: 'Already in conversation' });
  }

  try {
    // Add user to the conversation, update memberCount, and create system message atomically
    await prisma.$transaction([
      // Add participant
      prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId: currentUser.id
        }
      }),
      // Increment member count
      prisma.conversation.update({
        where: { id: conversationId },
        data: { memberCount: { increment: 1 } }
      }),
      // Create system message to notify everyone the user joined
      prisma.message.create({
        data: {
          conversationId,
          senderId: currentUser.id,
          content: `${currentUser.name || 'A new user'} joined the group`,
          messageType: 'SYSTEM'
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining conversation:', error);
    return NextResponse.json({ error: 'Failed to join conversation' }, { status: 500 });
  }
}
