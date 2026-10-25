import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-09-30.endive',
});

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
      mentorships = await prisma.mentorship.findMany({
        where: { menteeId: currentUser.id },
        include: {
          MentorProfile: { // Prisma schema relation name for mentor
            include: { User: { select: { id: true, name: true, image: true, email: true } } } // Correct Prisma user relation
          },
          MentorshipSession: { orderBy: { startTime: 'desc' }, take: 5 }, // Correct Prisma session relation
          MentorReview: true // Correct Prisma review relation
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (asMentor) {
      const mentorProfile = await prisma.mentorProfile.findUnique({
        where: { userId: currentUser.id }
      });

      if (!mentorProfile) {
        return NextResponse.json({ error: 'No mentor profile found' }, { status: 404 });
      }

      mentorships = await prisma.mentorship.findMany({
        where: { mentorId: mentorProfile.id },
        include: {
          User: { select: { id: true, name: true, image: true, email: true } }, // Prisma schema relation name for mentee
          MentorshipSession: { orderBy: { startTime: 'desc' }, take: 5 }, // Correct Prisma session relation
          MentorReview: true // Correct Prisma review relation
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return NextResponse.json({ error: 'Must specify asMentee or asMentor' }, { status: 400 });
    }

    // Map Prisma's schema relation names to frontend-expected API keys (consistent pattern across all routes)
    const mappedMentorships = mentorships.map((m: any) => ({
      ...m,
      mentor: m.MentorProfile || m.mentor, // Map Prisma's "MentorProfile" to frontend's "mentor" (fallback for existing code)
      mentee: m.User || m.mentee, // Map Prisma's "User" to frontend's "mentee" (fallback for existing code)
      sessions: m.MentorshipSession || m.sessions, // Map Prisma's "MentorshipSession" to frontend's "sessions"
      reviews: m.MentorReview || m.reviews // Map Prisma's "MentorReview" to frontend's "reviews"
    }));

    return NextResponse.json(mappedMentorships);
  } catch (error) {
    console.error('Error fetching mentorships:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_URL) {
    console.error("Stripe is not configured. Missing STRIPE_SECRET_KEY or NEXT_PUBLIC_URL.");
    return NextResponse.json(
      { error: "Payment processing is not available at this time." },
      { status: 500 }
    );
  }

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

    const body = await request.json().catch(() => null);
    const mentorId = typeof body?.mentorId === 'string' ? body.mentorId : '';
    const requestMessage = typeof body?.requestMessage === 'string' ? body.requestMessage.trim() : '';

    if (!mentorId || requestMessage.length > 1000) {
      return NextResponse.json({ error: 'Mentor ID is required and request message must be under 1000 characters' }, { status: 400 });
    }

    const mentor = await prisma.mentorProfile.findUnique({
      where: { id: mentorId },
      select: {
        userId: true,
        availability: true,
        maxMentees: true,
        hourlyRate: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        User: { // Correct Prisma schema relation name (capitalized model name)
          select: {
            name: true,
            image: true,
          }
        }
      }
    });
    if (!mentor || mentor.userId === currentUser.id) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }
    if (!mentor.availability) return NextResponse.json({ error: 'This mentor is not accepting requests' }, { status: 409 });
    if (!mentor.stripeOnboardingComplete || !mentor.stripeAccountId) {
      return NextResponse.json({ error: 'This mentor has not completed Stripe onboarding and cannot accept payments.' }, { status: 409 });
    }

    const activeCount = await prisma.mentorship.count({ where: { mentorId, status: 'ACCEPTED' } });
    if (mentor.maxMentees !== null && activeCount >= mentor.maxMentees) {
      return NextResponse.json({ error: 'This mentor has reached their maximum mentee limit' }, { status: 409 });
    }

    const existingMentorship = await prisma.mentorship.findFirst({
      where: { 
        mentorId, 
        menteeId: currentUser.id,
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });
    if (existingMentorship) {
      return NextResponse.json({ error: 'You already have an active or pending mentorship with this mentor' }, { status: 409 });
    }

    try {
      const unitAmount = mentor.hourlyRate ? parseInt(mentor.hourlyRate.toString()) * 100 : 5000; // Default to $50
      const applicationFee = Math.floor(unitAmount * 0.10); // 10% fee

      const session = await stripe.checkout.sessions.create({

        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Mentorship with ${mentor.User.name}`,
                images: mentor.User.image ? [mentor.User.image] : [],
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
      automatic_tax: { enabled: true },
        success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/mentorships?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/mentorships?payment=cancelled`,
        metadata: {
          mentorId,
          menteeId: currentUser.id,
          requestMessage,
        },
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: mentor.stripeAccountId,
          },
        },
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (e) {
      const error = e as Error;
      console.error('Stripe error:', error.message);
      return NextResponse.json({ error: 'Failed to create Stripe session' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating mentorship request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { mentorshipId, action, ...data } = body;

    if (typeof mentorshipId !== 'string' || !mentorshipId) {
      return NextResponse.json({ error: 'Mentorship ID is required' }, { status: 400 });
    }

    const mentorship = await prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: { MentorProfile: true, User: true } // Include both Prisma relations for IDOR check
    });

    if (!mentorship) {
      return NextResponse.json({ error: 'Mentorship not found' }, { status: 404 });
    }

    // CRITICAL: Strict IDOR protection - verify user is explicitly part of this mentorship
    const isMentor = mentorship.MentorProfile.userId === currentUser.id;
    const isMentee = mentorship.User.id === currentUser.id; // Use Prisma's User relation for mentee ID check

    if (!isMentor && !isMentee) {
      console.warn(`Unauthorized access attempt to mentorship ${mentorshipId} by user ${currentUser.id}`);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle different actions
    if (action === 'updateStatus') {
      const { status } = data;
      if (typeof status !== 'string') {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }
      if (!['ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid mentorship status' }, { status: 400 });
      }
      const nextStatus = status as 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

      if ((status === 'ACCEPTED' || status === 'REJECTED') && !isMentor) {
        return NextResponse.json({ error: 'Only mentors can accept or reject requests' }, { status: 403 });
      }

      const transitionAllowed = nextStatus === 'CANCELLED'
        ? (isMentee || isMentor) && (mentorship.status === 'PENDING' || mentorship.status === 'ACCEPTED')
        : nextStatus === 'COMPLETED'
          ? (isMentee || isMentor) && mentorship.status === 'ACCEPTED'
          : isMentor && mentorship.status === 'PENDING';
      if (!transitionAllowed) {
        return NextResponse.json({ error: 'This mentorship can no longer be updated' }, { status: 409 });
      }

      const updatedMentorship = await prisma.$transaction(async (tx) => {
        if (nextStatus === 'ACCEPTED') {
          const activeCount = await tx.mentorship.count({ where: { mentorId: mentorship.mentorId, status: 'ACCEPTED' } });
          if (!mentorship.MentorProfile.availability || activeCount >= mentorship.MentorProfile.maxMentees) return null;
        }
        const changed = await tx.mentorship.updateMany({
          where: { id: mentorshipId, status: mentorship.status },
          data: { 
            status: nextStatus, 
            ...(nextStatus === 'ACCEPTED' ? { startDate: new Date() } : {}), 
            ...(nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED' ? { endDate: new Date() } : {}) 
          },
        });
        if (changed.count !== 1) return null;

        if (nextStatus === 'ACCEPTED') {
          await tx.mentorProfile.update({
            where: { id: mentorship.mentorId },
            data: { totalMenteeCount: { increment: 1 } },
          });

          const participantIds = [mentorship.MentorProfile.userId, mentorship.User.id];
          await tx.conversation.create({
            data: {
              type: 'DIRECT',
              name: 'Mentorship',
              description: 'Private conversation for this mentorship',
              memberCount: 2,
              ConversationParticipant: { create: participantIds.map((userId) => ({ userId, role: 'MEMBER' })) }, // Correct Prisma relation name
            },
          });
        }

        return tx.mentorship.findUnique({
          where: { id: mentorshipId },
          include: {
            MentorProfile: { include: { User: { select: { id: true, name: true, image: true } } } }, // Correct Prisma relation names
            User: { select: { id: true, name: true, image: true } },
            MentorshipSession: true
          },
        });
      });
      if (!updatedMentorship) {
        return NextResponse.json({ error: 'This mentorship was updated by another request' }, { status: 409 });
      }

      return NextResponse.json(updatedMentorship);
    } else if (action === 'scheduleSession') {
      if (!isMentor) {
        return NextResponse.json({ error: 'Only mentors can schedule sessions' }, { status: 403 });
      }
      if (mentorship.status !== 'ACCEPTED') {
        return NextResponse.json({ error: 'Can only schedule sessions for active mentorships' }, { status: 409 });
      }

      const { title, startTime, endTime, meetingLink, description } = data;
      if (!title || !startTime || !endTime) {
        return NextResponse.json({ error: 'Title, start time, and end time are required' }, { status: 400 });
      }

      const newSession = await prisma.mentorshipSession.create({
        data: {
          mentorshipId,
          title,
          description: description || null,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          meetingLink: meetingLink || null,
          status: 'SCHEDULED'
        }
      });

      return NextResponse.json({ success: true, session: newSession });
    } else if (action === 'submitReview') {
      if (!isMentee) {
        return NextResponse.json({ error: 'Only mentees can submit reviews' }, { status: 403 });
      }
      if (mentorship.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Can only submit reviews for completed mentorships' }, { status: 409 });
      }

      const existingReview = await prisma.mentorReview.findUnique({
        where: { mentorshipId_reviewerId: { mentorshipId, reviewerId: currentUser.id } }
      });
      if (existingReview) {
        return NextResponse.json({ error: 'You have already submitted a review for this mentorship' }, { status: 400 });
      }

      const { rating, comment } = data;
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }

      const review = await prisma.$transaction(async (tx) => {
        const newReview = await tx.mentorReview.create({
          data: {
            mentorshipId,
            reviewerId: currentUser.id,
            mentorProfileId: mentorship.mentorId,
            rating,
            comment: comment || null
          }
        });

        const allReviews = await tx.mentorReview.findMany({
          where: { mentorProfileId: mentorship.mentorId }
        });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await tx.mentorProfile.update({
          where: { id: mentorship.mentorId },
          data: { averageRating: parseFloat(avgRating.toFixed(2)) }
        });

        return newReview;
      });

      return NextResponse.json({ success: true, review });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating mentorship:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}