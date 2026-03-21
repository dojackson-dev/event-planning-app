require('dotenv').config();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createBillingPortal() {
  try {
    const { data: owners } = await supabase
      .from('owner_accounts')
      .select('id, stripe_customer_id')
      .eq('id', '3f16f3c5-900d-4ea1-9444-a0402c760988')
      .single();

    if (!owners?.stripe_customer_id) {
      console.error('No Stripe customer found');
      return;
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: owners.stripe_customer_id,
      return_url: 'https://example.com',
    });

    console.log('Billing Portal URL:\n');
    console.log(session.url);
    console.log('\nThis allows you to manage subscriptions directly.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createBillingPortal();
