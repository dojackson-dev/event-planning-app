require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function deepDiagnostics() {
  try {
    console.log('=== Deep Stripe Diagnostics ===\n');
    
    // Check account
    const account = await stripe.account.retrieve();
    console.log('1. Account Status:');
    console.log(`   Charges Enabled: ${account.charges_enabled}`);
    console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
    console.log(`   Country: ${account.country}`);
    console.log(`   Type: ${account.type}`);
    
    // Check if account is restricted
    console.log('\n2. Restrictions:');
    if (account.requirements?.currently_due?.length > 0) {
      console.log('   ⚠️  RESTRICTED - Missing:');
      account.requirements.currently_due.forEach(item => console.log(`      - ${item}`));
    } else {
      console.log('   ✅ No restrictions');
    }
    
    // List recent sessions
    console.log('\n3. Recent Checkout Sessions:');
    const sessions = await stripe.checkout.sessions.list({ limit: 5 });
    sessions.data.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.id}`);
      console.log(`      Status: ${s.payment_status}`);
      console.log(`      URL Valid: ${s.url ? 'YES' : 'NO'}`);
    });
    
    // Check products
    console.log('\n4. Products:');
    const products = await stripe.products.list({ limit: 5 });
    products.data.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.name} (${p.id}) - Active: ${p.active}`);
    });
    
    // Check payment methods on account
    console.log('\n5. Payment Methods on Account:');
    const paymentMethods = await stripe.paymentMethods.list({ 
      customer: 'cus_U56BYcEuf2e1kS',
      type: 'card',
      limit: 5 
    });
    if (paymentMethods.data.length > 0) {
      paymentMethods.data.forEach((pm, i) => {
        console.log(`   ${i+1}. Card ending in ${pm.card.last4}`);
      });
    } else {
      console.log('   No payment methods attached');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.raw?.message) {
      console.error('Details:', error.raw.message);
    }
  }
}

deepDiagnostics();
