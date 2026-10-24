import { authOptions } from '@/infrastructure/auth/auth';
import { createRedisClient } from '@/infrastructure/redis/client';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type TypingEvent = {
  conversationId: string;
  userId: string;
  userName: string | null;
  isTyping: boolean;
};

const encoder = new TextEncoder();
const clients = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();
const subscriber = createRedisClient('typing-stream');

function sendToConversation(conversationId: string, payload: Uint8Array) {
  for (const controller of clients.get(conversationId) ?? []) {
    try {
      controller.enqueue(payload);
    } catch {
      clients.get(conversationId)?.delete(controller);
    }
  }
}

if (subscriber) {
  void subscriber.subscribe('typing-events', 'chat-message-events').catch((error) => {
    console.error('Failed to subscribe to typing events:', error);
  });

  subscriber.on('message', (channel, rawMessage) => {
    try {
      const event = JSON.parse(rawMessage) as { conversationId?: unknown; userId?: unknown; userName?: unknown; isTyping?: unknown };
      if (typeof event.conversationId !== 'string') return;

      if (channel === 'typing-events') {
        if (typeof event.userId !== 'string' || typeof event.isTyping !== 'boolean') return;
        const typingEvent: TypingEvent = {
          conversationId: event.conversationId,
          userId: event.userId,
          userName: typeof event.userName === 'string' ? event.userName : null,
          isTyping: event.isTyping,
        };
        sendToConversation(event.conversationId, encoder.encode(`data: ${JSON.stringify(typingEvent)}\n\n`));
      } else if (channel === 'chat-message-events') {
        // Send only a notification. Clients must reload through the membership-checked messages API.
        const notification = JSON.stringify({ conversationId: event.conversationId });
        sendToConversation(event.conversationId, encoder.encode(`event: chat-message\ndata: ${notification}\n\n`));
      }
    } catch {
      // Ignore malformed pub/sub messages.
    }
  });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!subscriber || subscriber.status !== 'ready') {
    return NextResponse.json({ error: 'Typing indicators are unavailable' }, { status: 503 });
  }

  const conversationId = new URL(request.url).searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
  }

  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, user: { email: session.user.email } },
    select: { id: true },
  });
  if (!participant) {
    return NextResponse.json({ error: 'Not a conversation participant' }, { status: 403 });
  }

  let removeClient = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const conversationClients = clients.get(conversationId) ?? new Set();
      conversationClients.add(controller);
      clients.set(conversationId, conversationClients);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId, typingUsers: [] })}\n\n`));
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);
      removeClient = () => {
        clearInterval(heartbeat);
        const activeClients = clients.get(conversationId);
        activeClients?.delete(controller);
        if (activeClients?.size === 0) clients.delete(conversationId);
      };
      request.signal.addEventListener('abort', removeClient, { once: true });
    },
    cancel() {
      removeClient();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}