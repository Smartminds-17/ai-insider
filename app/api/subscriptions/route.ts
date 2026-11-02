import { authOptions } from '@/src/infrastructure/auth/auth';
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-09-30.endive',
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId } = await req.json();

  if (!priceId) {
    return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        stripe_customer_id: true, // Correct Prisma schema field name (snake_case)
      },
    });

    let stripeCustomerId = user?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });
      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          stripe_customer_id: stripeCustomerId, // Correct Prisma schema field name
        },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      automatic_tax: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?subscription=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    // Handle Stripe-specific errors gracefully
    if ((error as { type?: string }).type === 'StripeInvalidRequestError') {
      // Check for the specific tax configuration error (missing head office address)
      if ((error as { message?: string }).message?.includes('valid head office address') || 
          (error as { code?: string }).code === 'tax_invalid_head_office_address') {
        return NextResponse.json({ 
          error: 'Subscription setup is temporarily unavailable. The platform administrator needs to configure tax settings. Please try again later.' 
        }, { status: 503, headers: { 'Retry-After': '300' } }); // Retry after 5 minutes
      }
      
      // Handle other Stripe invalid request errors
      return NextResponse.json({ 
        error: 'Invalid subscription request. Please check your input and try again.' 
      }, { status: 400 });
    }
    
    // Handle database connectivity errors
    if ((error as { code?: string }).code === 'P1001' || (error as { code?: string }).code === 'P2024') {
      return NextResponse.json({ 
        error: "Service temporarily unavailable",
        retryAfter: 30
      }, { status: 503, headers: { 'Retry-After': '30' } });
    }
    
    // Generic error for unexpected cases
    return NextResponse.json({ error: 'Error creating subscription' }, { status: 500 });
  }
}