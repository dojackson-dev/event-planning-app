require('dotenv').config();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSubscriptionDirectly() {
  try {
    const ownerAccountId = '3f16f3c5-900d-4ea1-9444-a0402c760988';
    
    // Get owner and customer
    const { data: owner } = await supabase
      .from('owner_accounts')
      .select('id, stripe_customer_id')
      .eq('id', ownerAccountId)
      .single();

    if (!owner?.stripe_customer_id) {
      console.error('No Stripe customer found');
      return;
    }

    console.log('Creating subscription directly via API...\n');

    // Create subscription directly (no checkout needed)
    const subscription = await stripe.subscriptions.create({
      customer: owner.stripe_customer_id,
      items: [{ price: process.env.STRIPE_PLAN_ID }],
      metadata: { owner_account_id: ownerAccountId },
      collection_method: 'send_invoice',
      days_until_due: 30,
    });

    console.log('✅ Subscription created successfully!\n');
    console.log(`Subscription ID: ${subscription.id}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Current Period: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);
    console.log(`Items: ${subscription.items.data.length}`);
    console.log(`Amount: $${subscription.items.data[0]?.price?.unit_amount / 100}/month`);
    
    // Update database
    await supabase
      .from('owner_accounts')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        plan_id: process.env.STRIPE_PLAN_ID,
      })
      .eq('id', ownerAccountId);

    console.log('\n✅ Database updated!');
    console.log('\nNote: This subscription uses "send_invoice" mode (invoice-based, not card-based)');
    console.log('An invoice will be sent via email.');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.raw?.message) {
      console.error('Details:', error.raw.message);
    }
  }
}

createSubscriptionDirectly();
