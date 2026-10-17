import { authOptions } from '@/infrastructure/auth/auth';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

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
        email: true,
        isOnline: true,
        lastActiveAt: true,
        mentorProfile: {
          select: {
            availability: true,
            expertise: true,
            averageRating: true
          }
        }
      },
      orderBy: [
        { isOnline: 'desc' },
        { lastActiveAt: 'desc' }
      ]
    });

    // Transform users to add isMentor flag for easier client-side use
    const transformedUsers = users.map(user => ({
      ...user,
      isMentor: !!user.mentorProfile,
      mentorAvailability: user.mentorProfile?.availability,
      mentorRating: user.mentorProfile?.averageRating ? Number(user.mentorProfile.averageRating) : null
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}