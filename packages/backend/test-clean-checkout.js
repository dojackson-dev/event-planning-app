require('dotenv').config();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCleanCheckout() {
  try {
    const { data: owners } = await supabase
      .from('owner_accounts')
      .select('id, business_name, primary_owner_id, users!owner_accounts_primary_owner_id_fkey(email)')
      .limit(1);

    if (!owners?.length) {
      console.error('No owner found');
      return;
    }

    const owner = owners[0];
    const email = owner.users?.email || 'test@example.com';
    const ownerAccountId = owner.id;

    // Get or create customer
    const { data: existingOwner } = await supabase
      .from('owner_accounts')
      .select('stripe_customer_id')
      .eq('id', ownerAccountId)
      .single();

    let customerId = existingOwner?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { owner_account_id: ownerAccountId },
      });
      customerId = customer.id;

      await supabase
        .from('owner_accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', ownerAccountId);
    }

    // Create session with minimal config
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PLAN_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'https://checkout.stripe.com/success',
      cancel_url: 'https://checkout.stripe.com/cancel',
    });

    console.log('Checkout URL (without hash):\n');
    console.log(session.url.split('#')[0]);
    console.log('\nOr with hash:\n');
    console.log(session.url);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createCleanCheckout();
