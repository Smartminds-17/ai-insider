import { getCommunityRoot } from '@/domain/communityRoot';
import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

/** Rejoin only the community matched to a path owned by the current user. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const pathId = typeof body?.pathId === 'string' ? body.pathId : '';
  if (!pathId) {
    return NextResponse.json({ error: 'Path ID is required' }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, userId: currentUser.id },
    select: { prompt: true },
  });
  if (!path) {
    return NextResponse.json({ error: 'Path not found' }, { status: 404 });
  }

  const root = getCommunityRoot(path.prompt);
  if (!root) {
    return NextResponse.json({ error: 'This path has no specific topic community' }, { status: 409 });
  }

  const community = await prisma.conversation.findUnique({
    where: { communityKey: root.key },
    select: { id: true },
  });
  if (!community) {
    return NextResponse.json({ error: 'No matching community is available' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const membership = await tx.conversationParticipant.createMany({
        data: [{ conversationId: community.id, userId: currentUser.id, role: 'MEMBER' }],
        skipDuplicates: true,
      });

      if (membership.count > 0) {
        await tx.conversation.update({
          where: { id: community.id },
          data: { memberCount: { increment: membership.count } },
        });
      }
    });

    return NextResponse.json({ success: true, communityId: community.id });
  } catch (error) {
    console.error('Error assigning learning community:', error);
    return NextResponse.json({ error: 'Failed to assign learning community' }, { status: 500 });
  }
}
