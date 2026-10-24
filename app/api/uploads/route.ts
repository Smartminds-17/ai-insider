import { publishChatMessageCreated } from '@/infrastructure/redis/chatEvents';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { authOptions } from '@/src/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

// Maximum file size for images: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

type ImageKind = { mimeType: string; extension: string };

// The browser reports a file's type, but that value is chosen by the sender.
// Checking the first bytes of the file tells us what it really is.
function detectImageKind(bytes: Uint8Array): ImageKind | null {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value);

  if (startsWith([0xff, 0xd8, 0xff])) return { mimeType: 'image/jpeg', extension: 'jpg' };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mimeType: 'image/png', extension: 'png' };
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return { mimeType: 'image/gif', extension: 'gif' };
  // WebP files start with "RIFF", then a 4-byte size, then "WEBP".
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // 1. Who is asking? Must be a signed-in user.
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Read and sanity-check the form fields.
    const formData = await request.formData();
    const file = formData.get('file');
    const conversationId = formData.get('conversationId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (typeof conversationId !== 'string' || !conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`File size exceeded by user ${currentUser.id}: ${file.size} bytes`);
      return NextResponse.json({ error: 'File too large. Maximum image size is 10MB' }, { status: 400 });
    }

    // Additional filename sanitation - block malicious paths/names
    if (file.name && (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\'))) {
      console.warn(`Malicious filename attempt by user ${currentUser.id}: ${file.name}`);
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // 3. Are they allowed to post here? This runs BEFORE anything is stored,
    //    so outsiders cannot fill the storage bucket.
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: currentUser.id },
      select: { id: true },
    });
    if (!participant) {
      console.warn(`Unauthorized upload attempt by user ${currentUser.id} to conversation ${conversationId}`);
      return NextResponse.json({ error: 'Not authorized to send messages in this conversation' }, { status: 403 });
    }

    // 4. Confirm the file really is an allowed image, using its actual bytes.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imageKind = detectImageKind(bytes);
    if (!imageKind) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed' },
        { status: 400 },
      );
    }

    // 5. Store the file. The name and type come from our own checks,
    //    not from what the browser claimed.
    const supabase = await createSupabaseServerClient();
    const storedName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${imageKind.extension}`;
    const filePath = `${currentUser.id}/${storedName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(filePath, bytes, {
        cacheControl: '31536000', // 1 year cache
        upsert: false,
        contentType: imageKind.mimeType,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(filePath);

    // 6. Save the chat message. If this fails, remove the stored file so we
    //    do not leave orphaned images behind.
    const displayName = (file.name || 'image').slice(0, MAX_FILE_NAME_LENGTH);
    try {
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: currentUser.id,
          content: displayName,
          messageType: 'IMAGE', // only images are accepted above
          fileUrl: publicUrl,
          fileName: displayName,
          fileSize: file.size,
        },
        include: {
          sender: { select: { id: true, name: true, image: true } },
          replies: { include: { sender: { select: { id: true, name: true, image: true } } } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      await publishChatMessageCreated(conversationId);
      return NextResponse.json(message);
    } catch (messageError) {
      await supabase.storage.from('chat-images').remove([filePath]);
      throw messageError;
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}