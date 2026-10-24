import Stripe from 'stripe';

async function setupStripe() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-09-30.endive',
  });

  try {
    // Check if the product already exists
    const products = await stripe.products.list({ limit: 100 });
    let proProduct = products.data.find(p => p.name === 'Pro Tier');

    if (!proProduct) {
        console.log('Creating "Pro Tier" product...');
        proProduct = await stripe.products.create({
            name: 'Pro Tier',
            description: 'Unlimited access to all features.',
        });
        console.log('"Pro Tier" product created:', proProduct.id);
    } else {
        console.log('"Pro Tier" product already exists:', proProduct.id);
    }

    // Check if the price already exists
    const prices = await stripe.prices.list({ product: proProduct.id, limit: 100 });
    const monthlyPrice = prices.data.find(p => p.nickname === 'Pro Monthly');

    if (!monthlyPrice) {
        console.log('Creating monthly price for "Pro Tier"...');
        const newPrice = await stripe.prices.create({
            product: proProduct.id,
            unit_amount: 900, // $9.00
            currency: 'usd',
            recurring: { interval: 'month' },
            nickname: 'Pro Monthly',
        });
        console.log('Monthly price created:', newPrice.id);
    } else {
        console.log('Monthly price already exists:', monthlyPrice.id);
    }

    console.log('Stripe setup complete!');

  } catch (error) {
    console.error('Error setting up Stripe:', error);
    process.exit(1);
  }
}

setupStripe();