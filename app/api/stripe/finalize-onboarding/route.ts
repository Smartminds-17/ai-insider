import { authOptions } from '@/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { featureFlags } from '@/src/lib/feature-flags';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-09-30.endive',
});

export async function POST(req: NextRequest) {
    if (!featureFlags.FEATURE_PAYMENTS) {
        return NextResponse.json({ error: 'This feature is not enabled.' }, { status: 404 });
    }
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { mentorProfile: true },
        });

        if (!currentUser || !currentUser.mentorProfile || !currentUser.mentorProfile.stripeAccountId) {
            return NextResponse.json({ error: 'Mentor profile or Stripe account not found' }, { status: 404 });
        }

        const stripeAccount = await stripe.accounts.retrieve(currentUser.mentorProfile.stripeAccountId);

        if (stripeAccount.charges_enabled) {
            const updatedProfile = await prisma.mentorProfile.update({
                where: { id: currentUser.mentorProfile.id },
                data: { stripeOnboardingComplete: true },
            });
            return NextResponse.json(updatedProfile);
        } else {
            return NextResponse.json({ error: 'Stripe onboarding not complete' }, { status: 400 });
        }
    } catch (error) {
        console.error('Stripe onboarding finalization error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}