require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function listPrices() {
  try {
    console.log('Fetching all Stripe products and prices...\n');
    
    // List all products first
    const products = await stripe.products.list({ limit: 10 });
    console.log(`Found ${products.data.length} product(s):\n`);
    
    for (const product of products.data) {
      console.log(`Product: ${product.name}`);
      console.log(`  ID: ${product.id}`);
      console.log(`  Active: ${product.active}`);
      console.log(`  Description: ${product.description || 'N/A'}`);
      
      // Get prices for this product
      const prices = await stripe.prices.list({ product: product.id, limit: 10 });
      if (prices.data.length > 0) {
        console.log(`  Prices:`);
        prices.data.forEach((price) => {
          console.log(`    - ${price.id}: $${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()} / ${price.recurring?.interval || 'one-time'} (Active: ${price.active})`);
        });
      } else {
        console.log(`  No prices found`);
      }
      console.log('');
    }

    // Also list all prices directly
    console.log('\nAll prices (direct query):');
    const allPrices = await stripe.prices.list({ limit: 20 });
    allPrices.data.forEach((price) => {
      console.log(`\n${price.id}`);
      console.log(`  Product: ${price.product}`);
      console.log(`  Amount: $${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
      console.log(`  Interval: ${price.recurring?.interval || 'one-time'}`);
      console.log(`  Active: ${price.active}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

listPrices();
