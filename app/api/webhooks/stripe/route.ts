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
      await prisma.user.update({
        where: {
          stripe_customer_id: stripeCustomerId, // Correct Prisma snake_case field name
        },
        data: {
          stripe_subscription_id: subscriptionId, // Correct Prisma snake_case field name
          stripe_price_id: items.data[0].price.id, // Correct Prisma snake_case field name
          stripe_current_period_end: new Date(currentPeriodEnd * 1000), // Correct Prisma snake_case field name
        },
      });
      console.log(`✅ Subscription ${event.type} for customer ${stripeCustomerId}`);
    } catch (error) {
      console.error(`Failed to handle subscription event ${event.type}:`, error);
    }
  }

  return NextResponse.json({ received: true });
}