import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import Redis from 'ioredis';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

// WebSocket connection manager to track active clients
const clients = new Map<string, Set<WebSocket>>();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Subscribe to Redis typing events and broadcast to relevant clients
redis.subscribe('typing-events', (err) => {
  if (err) console.error('Failed to subscribe to typing-events:', err);
});

redis.on('message', (channel, message) => {
  if (channel === 'typing-events') {
    const event = JSON.parse(message);
    // Broadcast to all clients subscribed to this conversation
    const conversationClients = clients.get(event.conversationId) || new Set();
    conversationClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    });
  }
});

// Upgrade HTTP connection to WebSocket
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
  }

  // Verify user is a participant in the conversation
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      user: { email: session.user.email }
    }
  });

  if (!participant) {
    return NextResponse.json({ error: 'Not a conversation participant' }, { status: 403 });
  }

  // This is a simplified WebSocket setup for Next.js - in production, use a dedicated WebSocket server
  // For Next.js App Router, we need to use the native WebSocket API with upgrade
  const { upgrade } = request as any;
  if (!upgrade) {
    return NextResponse.json({ error: 'WebSocket upgrade not supported' }, { status: 501 });
  }

  upgrade(request, (ws: WebSocket) => {
    // Add client to conversation's client set
    if (!clients.has(conversationId)) {
      clients.set(conversationId, new Set());
    }
    clients.get(conversationId)!.add(ws);

    // Clean up when client disconnects
    ws.on('close', () => {
      const conversationClients = clients.get(conversationId);
      if (conversationClients) {
        conversationClients.delete(ws);
        if (conversationClients.size === 0) {
          clients.delete(conversationId);
        }
      }
    });

    // Send initial typing status to new client
    const typingUsers = await prisma.conversationParticipant.findMany({
      where: { conversationId, isTyping: true },
      select: { userId: true, user: { select: { name: true } } }
    });

    typingUsers.forEach((user) => {
      ws.send(JSON.stringify({
        conversationId,
        userId: user.userId,
        userName: user.user.name,
        isTyping: true
      }));
    });
  });

  return new NextResponse(null, { status: 101 }); // Switching protocols
}