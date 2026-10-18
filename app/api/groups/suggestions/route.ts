import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

/** Return only groups the signed-in learner already belongs to. */
export async function GET() {
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

  const communities = await prisma.conversation.findMany({
    where: {
      type: 'GROUP',
      participants: { some: { userId: currentUser.id } },
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      memberCount: true,
      lastActivityAt: true,
    },
    orderBy: { lastActivityAt: 'desc' },
  });

  return NextResponse.json(communities.map((community) => ({
    ...community,
    lastActivityAt: community.lastActivityAt.toISOString(),
  })));
}
