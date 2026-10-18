import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { createRedisClient } from '@/infrastructure/redis/client';
import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const redis = createRedisClient('presence');
const ONLINE_THRESHOLD_SECONDS = 300; // Consider offline after 5 minutes of inactivity

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.text();
    let body: { conversationId?: unknown; isTyping?: unknown } = {};

    if (rawBody.trim()) {
      try {
        const parsed: unknown = JSON.parse(rawBody);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return NextResponse.json({ error: 'Expected a JSON object' }, { status: 400 });
        }
        body = parsed as typeof body;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    const { conversationId, isTyping } = body;
    if (conversationId !== undefined && typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'Conversation ID must be a string' }, { status: 400 });
    }
    if (isTyping !== undefined && typeof isTyping !== 'boolean') {
      return NextResponse.json({ error: 'Typing status must be a boolean' }, { status: 400 });
    }

    // Update user's base presence
    const updateData: Prisma.UserUpdateInput = {
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
        const membership = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId: user.id },
          select: { id: true },
        });
        if (!membership) {
          return NextResponse.json({ error: 'Not a conversation participant' }, { status: 403 });
        }
        if (!redis) {
          return NextResponse.json({ error: 'Typing indicators are unavailable' }, { status: 503 });
        }
        // Broadcast typing event to all participants via Redis pub/sub
        try {
          await redis.publish('typing-events', JSON.stringify({
            conversationId,
            userId: user.id,
            userName: user.name,
            isTyping
          }));
        } catch {
          return NextResponse.json({ error: 'Typing indicators are unavailable' }, { status: 503 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Background job to mark inactive users as offline
function isInternalRequest(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const received = Buffer.from(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '');
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const offlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
    
    const updated = await prisma.user.updateMany({
      where: {
        lastActiveAt: { lt: offlineThreshold },
        isOnline: true
      },
      data: { isOnline: false }
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
