require('dotenv').config();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCheckoutSession() {
  try {
    console.log('Fetching owner accounts...\n');
    
    // Get the first owner account
    const { data: owners, error } = await supabase
      .from('owner_accounts')
      .select('id, business_name, primary_owner_id, users!owner_accounts_primary_owner_id_fkey(email)')
      .limit(1);

    if (error || !owners || owners.length === 0) {
      console.error('Error fetching owner:', error);
      return;
    }

    const testOwner = owners[0];
    const email = testOwner.users?.email || 'test@example.com';
    const businessName = testOwner.business_name || 'Test Business';
    const ownerAccountId = testOwner.id;

    console.log(`Creating checkout session for: ${businessName} (${email})`);
    console.log(`Owner Account ID: ${ownerAccountId}\n`);

    // Get or create Stripe customer
    const { data: existingOwner } = await supabase
      .from('owner_accounts')
      .select('stripe_customer_id')
      .eq('id', ownerAccountId)
      .single();

    let customerId = existingOwner?.stripe_customer_id;

    if (!customerId) {
      console.log('Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email,
        name: businessName,
        metadata: { owner_account_id: ownerAccountId },
      });
      customerId = customer.id;

      await supabase
        .from('owner_accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', ownerAccountId);

      console.log(`Created Stripe customer: ${customerId}\n`);
    } else {
      console.log(`Using existing Stripe customer: ${customerId}\n`);
    }

    // Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ 
        price: process.env.STRIPE_PLAN_ID, 
        quantity: 1 
      }],
      mode: 'subscription',
      success_url: `${frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&subscribed=true`,
      cancel_url: `${frontendUrl}/billing?canceled=true`,
      client_reference_id: ownerAccountId,
      subscription_data: {
        metadata: { owner_account_id: ownerAccountId },
      },
    });

    console.log('✅ Checkout session created successfully!\n');
    console.log(`Session ID: ${session.id}`);
    console.log(`\n🔗 Checkout URL:\n${session.url}\n`);
    console.log('Open this URL in a browser to complete the subscription payment.');
    console.log('Use test card: 4242 4242 4242 4242, any future expiry, any CVC\n');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('Details:', error.raw?.message);
    }
  }
}

createCheckoutSession();
