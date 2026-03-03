require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkAccountStatus() {
  try {
    console.log('Checking Stripe account status...\n');
    
    // Get account details
    const account = await stripe.account.retrieve();
    
    console.log('Account Details:');
    console.log(`ID: ${account.id}`);
    console.log(`Type: ${account.type}`);
    console.log(`Country: ${account.country}`);
    console.log(`Email: ${account.email}`);
    console.log(`Charges Enabled: ${account.charges_enabled}`);
    console.log(`Payouts Enabled: ${account.payouts_enabled}`);
    console.log(`Business Type: ${account.business_type}`);
    
    console.log('\n--- Restrictions ---');
    if (account.requirements) {
      console.log('Status: ' + (account.requirements.currently_due?.length ? 'RESTRICTED' : 'ACTIVE'));
      if (account.requirements.currently_due?.length) {
        console.log('Currently Due:');
        account.requirements.currently_due.forEach(item => console.log(`  - ${item}`));
      }
      if (account.requirements.eventually_due?.length) {
        console.log('\nEventually Due:');
        account.requirements.eventually_due.forEach(item => console.log(`  - ${item}`));
      }
    }
    
    console.log('\n--- Capabilities ---');
    if (account.capabilities) {
      console.log('Card Payments: ' + account.capabilities.card_payments);
      console.log('Transfers: ' + account.capabilities.transfers);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAccountStatus();
