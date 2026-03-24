const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('Running migration: add client_confirmation_status to booking...');

  const { error: colErr } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE booking ADD COLUMN IF NOT EXISTS client_confirmation_status VARCHAR(20);`
  });
  if (colErr) {
    console.error('Failed to add column:', colErr.message);
    return;
  }
  console.log('Column added.');

  const { error: idxErr } = await supabase.rpc('exec_sql', {
    sql: `CREATE INDEX IF NOT EXISTS idx_booking_client_confirmation ON booking(client_confirmation_status) WHERE client_confirmation_status IS NOT NULL;`
  });
  if (idxErr) {
    console.error('Failed to create index:', idxErr.message);
    return;
  }
  console.log('Index created.');

  // Verify
  const { data, error: verifyErr } = await supabase
    .from('booking')
    .select('client_confirmation_status')
    .limit(1);

  if (verifyErr) {
    console.error('Verification failed:', verifyErr.message);
  } else {
    console.log('Migration complete. Column verified.');
  }
}

run().catch(console.error);
