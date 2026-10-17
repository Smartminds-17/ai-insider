import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import Redis from 'ioredis';

// Initialize Redis for WebSocket event broadcasting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const ONLINE_THRESHOLD_SECONDS = 300; // Consider offline after 5 minutes of inactivity

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, isTyping } = body;

    // Update user's base presence
    const updateData: any = {
      lastActiveAt: new Date()
    };

    // If this is a global online status update (no conversationId)
    if (!conversationId) {
      updateData.isOnline = true;
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: updateData
    });

    // If this is a typing status update for a specific conversation
    if (conversationId && typeof isTyping === 'boolean') {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true }
      });

      if (user) {
        // Update ConversationParticipant's isTyping status
        await prisma.conversationParticipant.updateMany({
          where: {
            conversationId,
            userId: user.id
          },
          data: { isTyping }
        });

        // Broadcast typing event to all participants via Redis pub/sub
        await redis.publish('typing-events', JSON.stringify({
          conversationId,
          userId: user.id,
          userName: user.name,
          isTyping
        }));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Background job to mark inactive users as offline
export async function GET() {
  try {
    const offlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
    
    const updated = await prisma.user.updateMany({
      where: {
        lastActiveAt: { lt: offlineThreshold },
        isOnline: true
      },
      data: { isOnline: false }
    });

    // Also reset all isTyping flags (inactive users can't be typing)
    await prisma.conversationParticipant.updateMany({
      where: { isTyping: true },
      data: { isTyping: false }
    });

    return NextResponse.json({ 
      success: true, 
      usersMarkedOffline: updated.count 
    });
  } catch (error) {
    console.error('Error cleaning up user presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}