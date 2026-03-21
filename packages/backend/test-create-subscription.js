require('dotenv').config();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestSubscription() {
  try {
    console.log('Fetching owner accounts...\n');
    
    // Get all owner accounts with user email
    const { data: owners, error } = await supabase
      .from('owner_accounts')
      .select('id, business_name, primary_owner_id, users!owner_accounts_primary_owner_id_fkey(email)')
      .limit(5);

    if (error) {
      console.error('Error fetching owners:', error);
      return;
    }

    if (!owners || owners.length === 0) {
      console.log('No owner accounts found in database.');
      return;
    }

    console.log('Available owner accounts:');
    owners.forEach((owner, idx) => {
      const email = owner.users?.email || 'N/A';
      console.log(`${idx + 1}. ${owner.business_name || 'N/A'} (${email})`);
      console.log(`   ID: ${owner.id}\n`);
    });

    // Use the first owner for testing
    const testOwner = owners[0];
    const email = testOwner.users?.email || 'test@example.com';
    const businessName = testOwner.business_name || 'Test Business';
    const ownerAccountId = testOwner.id;

    console.log(`\nCreating subscription for: ${businessName} (${email})`);
    console.log(`Owner Account ID: ${ownerAccountId}\n`);

    // Create or retrieve Stripe customer
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

      // Update owner_accounts with stripe_customer_id
      await supabase
        .from('owner_accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', ownerAccountId);

      console.log(`Created Stripe customer: ${customerId}\n`);
    } else {
      console.log(`Using existing Stripe customer: ${customerId}\n`);
    }

    // Create subscription directly (for testing)
    console.log(`Creating subscription with price: ${process.env.STRIPE_PLAN_ID}`);
    
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_PLAN_ID }],
      metadata: { owner_account_id: ownerAccountId },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    console.log(`\n✅ Subscription created successfully!`);
    console.log(`Subscription ID: ${subscription.id}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Current period: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);

    // Update owner_accounts in database
    const updateData = {
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      plan_id: process.env.STRIPE_PLAN_ID,
    };

    const { error: updateError } = await supabase
      .from('owner_accounts')
      .update(updateData)
      .eq('id', ownerAccountId);

    if (updateError) {
      console.error('Error updating owner_accounts:', updateError);
    } else {
      console.log('\n✅ Database updated successfully!');
    }

    // Get payment intent client secret if needed
    if (subscription.latest_invoice?.payment_intent?.client_secret) {
      console.log(`\nPayment Intent Client Secret: ${subscription.latest_invoice.payment_intent.client_secret}`);
      console.log('Note: Customer needs to complete payment using this client secret');
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('Details:', error.raw?.message);
    }
  }
}

createTestSubscription();
