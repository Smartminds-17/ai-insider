import { authOptions } from '@/infrastructure/auth/auth';
import { publishChatMessageCreated } from '@/infrastructure/redis/chatEvents';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Cursor for pagination

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

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

    // Verify user is part of the conversation
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: currentUser.id
      }
    });

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch messages with pagination (using Prisma's exact relation names from schema)
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(before && { createdAt: { lt: new Date(before) } })
      },
      include: {
        User: { select: { id: true, name: true, image: true } }, // Prisma schema relation name
        other_Message: {
          include: { User: { select: { id: true, name: true, image: true } } }
        },
        MessageReaction: {
          include: { User: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Map to frontend expected API keys (consistent sender naming across all endpoints)
    const mappedMessages = messages.map(m => ({
      ...m,
      sender: m.User, // Map Prisma's "User" to "sender" for frontend compatibility
      replies: m.other_Message.map(r => ({ ...r, sender: r.User })),
      reactions: m.MessageReaction.map(r => ({ ...r, user: r.User }))
    }));

    // Update last read timestamp
    await prisma.conversationParticipant.update({
      where: { id: isParticipant.id },
      data: { lastReadAt: new Date() }
    });

    return NextResponse.json(mappedMessages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
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
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { conversationId, content, messageType = 'TEXT', parentMessageId, fileUrl, fileName, fileSize } = body;

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'Conversation ID and content are required' }, { status: 400 });
    }

    // Verify user is part of the conversation
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: currentUser.id
      }
    });

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the message (using Prisma's exact relation names from schema)
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUser.id,
        content,
        messageType,
        parentMessageId: parentMessageId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null
      },
      include: {
        User: { select: { id: true, name: true, image: true } }, // Prisma schema relation name
        MessageReaction: true
      }
    });

    // Map to frontend expected API keys (consistent sender naming across all endpoints)
    const mappedNewMessage = {
      ...newMessage,
      sender: newMessage.User, // Map Prisma's "User" to "sender" for frontend compatibility
      reactions: newMessage.MessageReaction
    };

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    });

    await publishChatMessageCreated(conversationId);

    return NextResponse.json(mappedNewMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH endpoint for editing messages
export async function PATCH(request: Request) {
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

    const body = await request.json();
    const { messageId, content } = body;

    if (!messageId || !content) {
      return NextResponse.json({ error: 'Message ID and content are required' }, { status: 400 });
    }

    // Verify user owns the message
    const message = await prisma.message.findFirst({
      where: { id: messageId, senderId: currentUser.id }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        editedAt: new Date()
      },
      include: {
        User: { select: { id: true, name: true, image: true } }
      }
    });

    const mappedUpdatedMessage = {
      ...updatedMessage,
      sender: updatedMessage.User
    };

    return NextResponse.json(mappedUpdatedMessage);
  } catch (error) {
    console.error('Error editing message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE endpoint for soft-deleting messages
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Check if user is sender or admin/moderator
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        Conversation: {
          include: {
            ConversationParticipant: {
              where: { userId: currentUser.id },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const userParticipant = message.Conversation.ConversationParticipant[0];
    const canDelete = message.senderId === currentUser.id || 
                      userParticipant?.role === 'ADMIN' || 
                      userParticipant?.role === 'MODERATOR';

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete the message
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}