const { createClient } = require('./event-planning-app/node_modules/@supabase/supabase-js');
const admin = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'
);

async function check() {
  const { data, error } = await admin
    .from('invoices')
    .select('id, invoice_number, status, total_amount, amount_paid, amount_due, paid_date, stripe_payment_intent_id, stripe_checkout_session_id, client_name, created_at, updated_at')
    .eq('invoice_number', '00012')
    .maybeSingle();

  if (error) console.log('Error:', error.message);
  else if (!data) console.log('No invoice found with number 00012');
  else console.log('Invoice 00012:', JSON.stringify(data, null, 2));
}
check();
