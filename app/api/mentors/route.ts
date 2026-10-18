import { authOptions } from '@/infrastructure/auth/auth';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const expertise = searchParams.get('expertise');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const whereClause: Prisma.MentorProfileWhereInput = { availability: true };
    
    if (expertise) {
      whereClause.expertise = { has: expertise };
    }

    const mentors = await prisma.mentorProfile.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, image: true, isOnline: true, lastActiveAt: true } }
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Sort: online mentors first, then by average rating (highest first)
    const sortedMentors = [...mentors].sort((a, b) => {
      // First prioritize online status (coerce booleans to numbers for safe comparison)
      const onlineA = Number(a.user.isOnline);
      const onlineB = Number(b.user.isOnline);
      if (onlineA !== onlineB) {
        return onlineB - onlineA; // true (1) comes before false (0)
      }
      // Then sort by average rating (descending)
      const ratingA = Number(a.averageRating) || 0;
      const ratingB = Number(b.averageRating) || 0;
      return ratingB - ratingA;
    });

    const total = await prisma.mentorProfile.count({ where: whereClause });

    return NextResponse.json({
      mentors: sortedMentors,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
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

    // Check if user already has a mentor profile
    const existingProfile = await prisma.mentorProfile.findUnique({
      where: { userId: currentUser.id }
    });

    if (existingProfile) {
      return NextResponse.json({ error: 'Mentor profile already exists' }, { status: 400 });
    }

    const body = await request.json();
    const { bio, expertise, hourlyRate, availability = true } = body;

    const mentorProfile = await prisma.mentorProfile.create({
      data: {
        userId: currentUser.id,
        bio: bio || null,
        expertise: expertise || [],
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        availability
      },
      include: {
        user: { select: { id: true, name: true, image: true, isOnline: true, lastActiveAt: true } }
      }
    });

    return NextResponse.json(mentorProfile);
  } catch (error) {
    console.error('Error creating mentor profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT to update mentor profile
export async function PUT(request: Request) {
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
    const { bio, expertise, hourlyRate, availability } = body;

    const updateData: Prisma.MentorProfileUpdateInput = {};
    if (bio !== undefined) updateData.bio = bio;
    if (expertise) updateData.expertise = expertise;
    if (hourlyRate) updateData.hourlyRate = parseFloat(hourlyRate);
    if (availability !== undefined) updateData.availability = availability;
    updateData.updatedAt = new Date();

    const updatedProfile = await prisma.mentorProfile.update({
      where: { userId: currentUser.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
