import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const expertise = searchParams.get('expertise');
    const rawLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const rawPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

    const whereClause: Prisma.MentorProfileWhereInput = { availability: true };

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

    const body = await request.json().catch(() => null);
    const bio = typeof body?.bio === 'string' ? body.bio.trim() : '';
    const expertise = Array.isArray(body?.expertise) ? body.expertise.filter((item: unknown): item is string => typeof item === 'string').map((item: string) => item.trim()).filter(Boolean).slice(0, 20) : [];
    const availability = typeof body?.availability === 'boolean' ? body.availability : true;
    const maxMentees = Number.isInteger(body?.maxMentees) ? Math.min(50, Math.max(1, body.maxMentees)) : 5;
    if (bio.length > 2000 || expertise.length === 0 || expertise.some((item: string) => item.length > 60)) {
      return NextResponse.json({ error: 'Add expertise and keep profile fields within their limits' }, { status: 400 });
    }

    const mentorProfile = await prisma.mentorProfile.create({
      data: {
        userId: currentUser.id,
        bio: bio || null,
        expertise,
        availability,
        maxMentees,
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 });
    const { bio, expertise, availability, maxMentees } = body;

    const updateData: Prisma.MentorProfileUpdateInput = {};
    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.trim().length > 2000) return NextResponse.json({ error: 'Bio must be 2000 characters or fewer' }, { status: 400 });
      updateData.bio = bio.trim() || null;
    }
    if (expertise !== undefined) {
      if (!Array.isArray(expertise) || expertise.length > 20 || expertise.some((item: unknown) => typeof item !== 'string' || item.trim().length === 0 || item.trim().length > 60)) return NextResponse.json({ error: 'Expertise must be a list of up to 20 skills' }, { status: 400 });
      updateData.expertise = expertise.map((item: string) => item.trim());
    }
    if (availability !== undefined) updateData.availability = availability;
    if (maxMentees !== undefined) {
      if (!Number.isInteger(maxMentees) || maxMentees < 1 || maxMentees > 50) return NextResponse.json({ error: 'Capacity must be between 1 and 50' }, { status: 400 });
      updateData.maxMentees = maxMentees;
    }

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