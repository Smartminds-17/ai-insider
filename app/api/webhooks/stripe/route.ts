import { prisma } from '@/src/infrastructure/db/prisma';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-09-30.endive',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured. Missing STRIPE_WEBHOOK_SECRET.');
    return NextResponse.json({ error: 'Webhook processing is not configured.' }, { status: 500 });
  }

  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Error message: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const { mentorId, menteeId, requestMessage } = checkoutSession.metadata!;

    if (!mentorId || !menteeId) {
      console.error('Missing metadata in checkout session:', checkoutSession.id);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const paymentIntentId = typeof checkoutSession.payment_intent === 'string' 
      ? checkoutSession.payment_intent 
      : null;
    
    if (!paymentIntentId) {
      console.error('Missing payment intent ID in checkout session:', checkoutSession.id);
      return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 });
    }

    // CRITICAL: Idempotency check - prevent duplicate mentorships on Stripe retries
    const existingMentorship = await prisma.mentorship.findUnique({
      where: { stripePaymentIntentId: paymentIntentId }
    });

    if (existingMentorship) {
      console.log('⚠️ Mentorship already exists for payment intent:', paymentIntentId);
      return NextResponse.json({ received: true, existing: true });
    }

    try {
      const newMentorship = await prisma.mentorship.create({
        data: {
          mentorId,
          menteeId,
          requestMessage: requestMessage || '',
          status: 'PENDING',
          paymentStatus: 'PAID',
          stripePaymentIntentId: paymentIntentId,
        },
      });
      console.log('✅ Mentorship created:', newMentorship.id);
    } catch (error) {
      console.error('Failed to create mentorship after payment:', error);
      // We still return a 200 to Stripe to acknowledge receipt of the event
      // but we should have monitoring on this error.
    }
  } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as unknown as {
      customer: string;
      id: string;
      items: { data: Array<{ price: { id: string } }> };
      current_period_end: number;
    };
    const stripeCustomerId = subscription.customer;
    const subscriptionId = subscription.id;
    const items = subscription.items;
    const currentPeriodEnd = subscription.current_period_end;

    try {
      const priceId = items.data[0].price.id;
      const GUIDED_EXPEDITION_PRICE_ID = process.env.STRIPE_GUIDED_EXPEDITION_PRICE_ID!;
      
      // Refresh mentorship credits only for Guided expedition subscribers when subscription renews
      const isGuidedExpedition = priceId === GUIDED_EXPEDITION_PRICE_ID;
      const existingUser = await prisma.user.findUnique({
        where: { stripe_customer_id: stripeCustomerId },
        select: { id: true, mentorship_credits_last_refreshed: true, mentorship_credits_remaining: true }
      });

      // Only refresh credits if it's a new subscription period (last refreshed was over 25 days ago)
      const shouldRefreshCredits = isGuidedExpedition && existingUser && (
        !existingUser.mentorship_credits_last_refreshed || 
        (new Date().getTime() - new Date(existingUser.mentorship_credits_last_refreshed).getTime() > 25 * 24 * 60 * 60 * 1000)
      );

      await prisma.user.update({
        where: {
          stripe_customer_id: stripeCustomerId,
        },
        data: {
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          stripe_current_period_end: new Date(currentPeriodEnd * 1000),
          // Reset to 2 credits only for Guided expedition users when their subscription renews
          ...(shouldRefreshCredits ? {
            mentorship_credits_remaining: 2,
            mentorship_credits_last_refreshed: new Date()
          } : {}),
          // If user downgrades from Guided to a lower tier, set credits to 0
          ...(!isGuidedExpedition && existingUser && existingUser.mentorship_credits_remaining > 0 ? {
            mentorship_credits_remaining: 0
          } : {})
        },
      });
      console.log(`✅ Subscription ${event.type} for customer ${stripeCustomerId}${shouldRefreshCredits ? ' - refreshed 2 mentorship credits for Guided expedition' : ''}`);
    } catch (error) {
      console.error(`Failed to handle subscription event ${event.type}:`, error);
    }
  }

  return NextResponse.json({ received: true });
}