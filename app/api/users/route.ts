import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function GET() {
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

    // Fetch all users except the current user, with their mentor profile data
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUser.id } // Exclude current user from the list
      },
      select: {
        id: true,
        name: true,
        image: true,
        isOnline: true,
      },
      orderBy: [
        { isOnline: 'desc' },
        { lastActiveAt: 'desc' }
      ],
      take: 100,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
