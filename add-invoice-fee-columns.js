const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // Try inserting a test row with these columns to check if they exist already
  const { data: sample } = await sb.from('artist_invoices').select('platform_fee_amount, processing_fee_amount').limit(1);
  if (sample !== null) {
    console.log('Columns already exist:', sample);
    return;
  }

  // Columns don't exist — run migration via SQL function if available
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      ALTER TABLE artist_invoices
        ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS processing_fee_amount DECIMAL(10,2) DEFAULT 0.00;
      NOTIFY pgrst, 'reload schema';
    `
  });
  console.log('Result:', JSON.stringify({ data, error }));
}
run().catch(console.error);
