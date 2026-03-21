require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function verifySession() {
  try {
    const sessionId = 'cs_live_a1gOhBJddR1GmFRw8FEJyq503Kc4KbhXpoz6ahK2wZKi8iDkBBu9Wqksax';
    
    console.log('Fetching session details...\n');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Session Details:');
    console.log(`ID: ${session.id}`);
    console.log(`Status: ${session.payment_status}`);
    console.log(`Mode: ${session.mode}`);
    console.log(`URL: ${session.url}`);
    console.log(`Customer: ${session.customer}`);
    console.log(`Client Reference: ${session.client_reference_id}`);
    console.log(`Success URL: ${session.success_url}`);
    console.log(`Cancel URL: ${session.cancel_url}`);
    
    if (session.url) {
      console.log(`\n✅ Session URL (use this directly):\n${session.url}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifySession();
