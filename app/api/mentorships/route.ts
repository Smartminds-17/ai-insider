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

    if (typeof mentorshipId !== 'string' || !mentorshipId || typeof status !== 'string') {
      return NextResponse.json({ error: 'Mentorship ID and status are required' }, { status: 400 });
    }
    if (!['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid mentorship status' }, { status: 400 });
    }
    const nextStatus = status as 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

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

    if ((status === 'ACCEPTED' || status === 'REJECTED') && !isMentor) {
      return NextResponse.json({ error: 'Only mentors can accept or reject requests' }, { status: 403 });
    }

    const transitionAllowed = nextStatus === 'CANCELLED'
      ? mentorship.status === 'PENDING' || mentorship.status === 'ACCEPTED'
      : mentorship.status === 'PENDING';
    if (!transitionAllowed) {
      return NextResponse.json({ error: 'This mentorship can no longer be updated' }, { status: 409 });
    }

    const updatedMentorship = await prisma.$transaction(async (tx) => {
      const changed = await tx.mentorship.updateMany({
        where: { id: mentorshipId, status: mentorship.status },
        data: { status: nextStatus, ...(nextStatus === 'ACCEPTED' ? { startDate: new Date() } : {}) },
      });
      if (changed.count !== 1) return null;

      if (nextStatus === 'ACCEPTED') {
        await tx.mentorProfile.update({
          where: { id: mentorship.mentorId },
          data: { totalMenteeCount: { increment: 1 } },
        });

        const participantIds = [mentorship.mentor.userId, mentorship.menteeId];
        const existingConversation = await tx.conversation.findFirst({
          where: {
            type: 'DIRECT',
            AND: [
              { participants: { some: { userId: participantIds[0] } } },
              { participants: { some: { userId: participantIds[1] } } },
              { participants: { every: { userId: { in: participantIds } } } },
            ],
          },
          select: { id: true },
        });
        if (!existingConversation) {
          await tx.conversation.create({
            data: {
              type: 'DIRECT',
              memberCount: 2,
              participants: { create: participantIds.map((userId) => ({ userId, role: 'MEMBER' })) },
            },
          });
        }
      }

      return tx.mentorship.findUnique({
        where: { id: mentorshipId },
        include: {
          mentor: { include: { user: { select: { id: true, name: true, image: true } } } },
          mentee: { select: { id: true, name: true, image: true } },
        },
      });
    });
    if (!updatedMentorship) {
      return NextResponse.json({ error: 'This mentorship was updated by another request' }, { status: 409 });
    }

    return NextResponse.json(updatedMentorship);
  } catch (error) {
    console.error('Error updating mentorship:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
