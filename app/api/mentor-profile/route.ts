import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { rateLimit, rateLimits } from '@/infrastructure/rate-limit';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        // Apply general API rate limiting
        const { success } = await rateLimit(req, rateLimits.api);
        if (!success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

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

        const mentorProfile = await prisma.mentorProfile.findUnique({
            where: { userId: currentUser.id },
        });

        if (!mentorProfile) {
            return NextResponse.json({ error: 'Mentor profile not found' }, { status: 404 });
        }

        return NextResponse.json(mentorProfile);
    } catch (error) {
        console.error('Error fetching mentor profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Apply general API rate limiting
        const { success } = await rateLimit(req, rateLimits.api);
        if (!success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

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

        // Parse and validate request body first
        let data;
        try {
            data = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        // Sanitize input and validate types
        const allowedFields = ['bio', 'hourlyRate', 'expertise', 'availability', 'maxMentees'];
        const sanitizedData: Record<string, unknown> = {
          expertise: [], // Default to empty array
        };
        
        Object.entries(data).forEach(([key, value]) => {
            if (!allowedFields.includes(key)) return;
            
            // Type validation for numeric fields
            if (key === 'hourlyRate' && typeof value === 'string') {
                const parsed = parseFloat(value);
                if (!isNaN(parsed) && parsed >= 0) {
                    sanitizedData[key] = parsed;
                }
            } else if (key === 'hourlyRate' && typeof value === 'number' && value >= 0) {
                sanitizedData[key] = value;
            } else if (key === 'expertise' && Array.isArray(value)) {
                sanitizedData[key] = value.filter(item => typeof item === 'string');
            } else if (key !== 'hourlyRate' && key !== 'expertise') {
                sanitizedData[key] = value;
            }
        });

        const createData: Prisma.MentorProfileCreateInput = {
            User: { connect: { id: currentUser.id } },
            bio: sanitizedData.bio as string | undefined,
            hourlyRate: sanitizedData.hourlyRate as number | undefined,
            expertise: sanitizedData.expertise as string[],
            availability: sanitizedData.availability as boolean | undefined,
            maxMentees: sanitizedData.maxMentees as number | undefined,
        };

        const newMentorProfile = await prisma.mentorProfile.create({
            data: createData,
        });

        return NextResponse.json(newMentorProfile);
    } catch (error) {
        console.error('Error creating mentor profile:', error);
        
        // Handle Prisma unique constraint violation (P2002) for race conditions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.code === 'P2002') {
            return NextResponse.json({ error: 'Mentor profile already exists' }, { status: 409 });
        }
        
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        // Apply general API rate limiting
        const { success } = await rateLimit(req, rateLimits.api);
        if (!success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

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

        // First verify the mentor profile actually belongs to the current user
        const existingProfile = await prisma.mentorProfile.findUnique({
            where: { userId: currentUser.id },
        });

        if (!existingProfile) {
            console.warn(`Unauthorized profile update attempt by user ${currentUser.id} - no profile exists`);
            return NextResponse.json({ error: 'Mentor profile not found' }, { status: 404 });
        }

        // Parse and validate request body
        let data;
        try {
            data = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        // Sanitize input and validate types
        const allowedFields = ['bio', 'hourlyRate', 'expertise', 'availability', 'maxMentees'];
        const sanitizedData: Record<string, unknown> = {};
        
        Object.entries(data).forEach(([key, value]) => {
            if (!allowedFields.includes(key)) return;
            
            // Type validation for numeric fields
            if (key === 'hourlyRate' && typeof value === 'string') {
                const parsed = parseFloat(value);
                if (!isNaN(parsed) && parsed >= 0) {
                    sanitizedData[key] = parsed;
                }
            } else if (key === 'hourlyRate' && typeof value === 'number' && value >= 0) {
                sanitizedData[key] = value;
            } else if (key === 'expertise' && Array.isArray(value)) {
                sanitizedData[key] = value.filter(item => typeof item === 'string');
            } else if (key !== 'hourlyRate' && key !== 'expertise') {
                sanitizedData[key] = value;
            }
        });

        const updateData: Prisma.MentorProfileUpdateInput = {};
        if ('bio' in sanitizedData) {
            updateData.bio = sanitizedData.bio as string;
        }
        if ('hourlyRate' in sanitizedData) {
            updateData.hourlyRate = sanitizedData.hourlyRate as number;
        }
        if ('expertise' in sanitizedData) {
            updateData.expertise = sanitizedData.expertise as string[];
        }
        if ('maxMentees' in sanitizedData) {
            updateData.maxMentees = sanitizedData.maxMentees as number;
        }
        if ('availability' in sanitizedData) {
            updateData.availability = sanitizedData.availability as boolean;
        }

        const updatedMentorProfile = await prisma.mentorProfile.update({
            where: { userId: currentUser.id },
            data: updateData,
        });

        return NextResponse.json(updatedMentorProfile);
    } catch (error) {
        console.error('Error updating mentor profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}