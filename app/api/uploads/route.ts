import { authOptions } from '@/infrastructure/auth/auth';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

// Maximum file size for images: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: Request) {
  try {
    // Verify authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user ID
    const prisma = (await import('@prisma/client')).PrismaClient;
    const db = new prisma();
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse form data for file upload
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;
    const messageType = formData.get('messageType') as 'IMAGE' | 'FILE' | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum image size is 10MB' 
      }, { status: 400 });
    }

    // Initialize Supabase storage client
    const supabase = await createSupabaseServerClient();
    
    // Create unique file path: user-id/timestamp-filename to prevent collisions
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = `${currentUser.id}/${fileName}`;

    // Upload file to Supabase Storage (chat-images bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(filePath, file, {
        cacheControl: '31536000', // 1 year cache
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(filePath);

    // Create message in database
    
    // Verify user is a participant in the conversation
    const participant = await db.conversationParticipant.findFirst({
      where: {
        conversationId: conversationId,
        userId: currentUser.id
      }
    });

    if (!participant) {
      await db.$disconnect();
      return NextResponse.json({ error: 'Not authorized to send messages in this conversation' }, { status: 403 });
    }

    // Create the message
    const message = await db.message.create({
      data: {
        conversationId: conversationId,
        senderId: currentUser.id,
        content: file.name,
        messageType: messageType || 'IMAGE',
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        replies: { include: { sender: { select: { id: true, name: true, image: true } } } },
        reactions: { include: { user: { select: { id: true, name: true } } } }
      }
    });

    await db.$disconnect();

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}