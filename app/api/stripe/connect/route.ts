import { authOptions } from '@/src/infrastructure/auth/auth';
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

    if (!currentUser || !currentUser.mentorProfile) {
      return NextResponse.json({ error: 'Mentor profile not found' }, { status: 404 });
    }

    let stripeAccountId = currentUser.mentorProfile.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: session.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          email: session.user.email,
        },
      });
      stripeAccountId = account.id;

      await prisma.mentorProfile.update({
        where: { id: currentUser.mentorProfile.id },
        data: { stripeAccountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/mentors/create`,
      return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/mentors/create?onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to create Stripe Connect onboarding link: ${errorMessage}` }, { status: 500 });
  }
}