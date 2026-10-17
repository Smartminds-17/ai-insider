import { authOptions } from '@/infrastructure/auth/auth';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
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
    const asMentee = searchParams.get('asMentee') === 'true';
    const asMentor = searchParams.get('asMentor') === 'true';

    let mentorships;
    
    if (asMentee) {
      // Get mentorships where current user is the mentee
      mentorships = await prisma.mentorship.findMany({
        where: { menteeId: currentUser.id },
        include: {
          mentor: {
            include: { user: { select: { id: true, name: true, image: true, email: true } } }
          },
          sessions: { orderBy: { startTime: 'desc' }, take: 5 },
          reviews: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (asMentor) {
      // Get mentorships where current user is the mentor
      const mentorProfile = await prisma.mentorProfile.findUnique({
        where: { userId: currentUser.id }
      });

      if (!mentorProfile) {
        return NextResponse.json({ error: 'No mentor profile found' }, { status: 404 });
      }

      mentorships = await prisma.mentorship.findMany({
        where: { mentorId: mentorProfile.id },
        include: {
          mentee: { select: { id: true, name: true, image: true, email: true } },
          sessions: { orderBy: { startTime: 'desc' }, take: 5 },
          reviews: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return NextResponse.json({ error: 'Must specify asMentee or asMentor' }, { status: 400 });
    }

    return NextResponse.json(mentorships);
  } catch (error) {
    console.error('Error fetching mentorships:', error);
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
    const { mentorId } = body;

    if (!mentorId) {
      return NextResponse.json({ error: 'Mentor ID is required' }, { status: 400 });
    }

    // Check if mentorship request already exists
    const existingMentorship = await prisma.mentorship.findFirst({
      where: {
        mentorId,
        menteeId: currentUser.id
      }
    });

    if (existingMentorship) {
      return NextResponse.json({ error: 'Mentorship request already exists' }, { status: 400 });
    }

    // Create new mentorship request
    const mentorship = await prisma.mentorship.create({
      data: {
        mentorId,
        menteeId: currentUser.id,
        status: 'PENDING'
      },
      include: {
        mentor: {
          include: { user: { select: { id: true, name: true, image: true, email: true } } }
        }
      }
    });

    return NextResponse.json(mentorship);
  } catch (error) {
    console.error('Error creating mentorship request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH to update mentorship status (accept/reject/cancel)
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
    const { mentorshipId, status } = body;

    if (!mentorshipId || !status) {
      return NextResponse.json({ error: 'Mentorship ID and status are required' }, { status: 400 });
    }

    // Verify user has permission to update this mentorship
    const mentorship = await prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: { mentor: true }
    });

    if (!mentorship) {
      return NextResponse.json({ error: 'Mentorship not found' }, { status: 404 });
    }

    const isMentor = mentorship.mentor.userId === currentUser.id;
    const isMentee = mentorship.menteeId === currentUser.id;

    if (!isMentor && !isMentee) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only mentors can accept/reject, both can cancel
    if ((status === 'ACCEPTED' || status === 'REJECTED') && !isMentor) {
      return NextResponse.json({ error: 'Only mentors can accept or reject requests' }, { status: 403 });
    }

    if (status === 'CANCELLED' && !isMentor && !isMentee) {
      return NextResponse.json({ error: 'Only involved parties can cancel mentorships' }, { status: 403 });
    }

    // Update mentorship
    const updatedMentorship = await prisma.mentorship.update({
      where: { id: mentorshipId },
      data: {
        status,
        ...(status === 'ACCEPTED' && { startDate: new Date() })
      },
      include: {
        mentor: { include: { user: { select: { id: true, name: true, image: true } } } },
        mentee: { select: { id: true, name: true, image: true } }
      }
    });

    // If accepted, increment mentor's mentee count
    if (status === 'ACCEPTED') {
      await prisma.mentorProfile.update({
        where: { id: mentorship.mentorId },
        data: { totalMenteeCount: { increment: 1 } }
      });

      // Auto-create a direct chat between mentor and mentee
      await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          participants: {
            create: [
              { userId: currentUser.id, role: 'MEMBER' },
              { userId: isMentor ? mentorship.menteeId : mentorship.mentor.userId, role: 'MEMBER' }
            ]
          }
        }
      });
    }

    return NextResponse.json(updatedMentorship);
  } catch (error) {
    console.error('Error updating mentorship:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}