require('dotenv').config();
const Stripe = require('stripe');

async function testStripeConnection() {
  try {
    // Initialize Stripe with your secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    console.log('Testing Stripe connection...\n');
    
    // Test 1: Retrieve account information
    console.log('✓ Stripe SDK initialized successfully');
    console.log('✓ Secret Key:', process.env.STRIPE_SECRET_KEY.substring(0, 20) + '...');
    
    // Test 2: Make a simple API call to verify authentication
    const balance = await stripe.balance.retrieve();
    console.log('✓ Successfully connected to Stripe API');
    console.log('✓ Account balance retrieved:');
    console.log('  - Available:', balance.available);
    console.log('  - Pending:', balance.pending);
    
    // Test 3: List payment methods (this will be empty for new accounts but proves the connection works)
    const paymentMethods = await stripe.paymentMethods.list({ limit: 1 });
    console.log('✓ Payment Methods API accessible');
    
    // Test 4: Retrieve account details
    const account = await stripe.accounts.retrieve();
    console.log('✓ Account details retrieved:');
    console.log('  - Account ID:', account.id);
    console.log('  - Email:', account.email || 'Not set');
    console.log('  - Country:', account.country);
    console.log('  - Default Currency:', account.default_currency);
    console.log('  - Charges Enabled:', account.charges_enabled);
    console.log('  - Payouts Enabled:', account.payouts_enabled);
    
    console.log('\n✅ All tests passed! Stripe connection is working correctly.');
    
    return true;
  } catch (error) {
    console.error('\n❌ Stripe connection test failed:');
    console.error('Error:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n⚠️  Authentication failed. Please check your STRIPE_SECRET_KEY in the .env file.');
    } else if (error.type === 'StripeAPIError') {
      console.error('\n⚠️  Stripe API error. Please check your internet connection and try again.');
    }
    
    return false;
  }
}

// Run the test
testStripeConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
