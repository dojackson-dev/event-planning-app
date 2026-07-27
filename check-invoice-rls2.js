const { createClient } = require('./event-planning-app/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  // 1. Check what RLS policies exist on invoices table
  console.log('=== RLS Policies on invoices ===');
  const { data: policies, error: pErr } = await admin.rpc('get_policies_for_table', { table_name: 'invoices' });
  if (pErr) {
    // Try direct postgres function
    const { data, error } = await admin.from('pg_policies').select('policyname, cmd, qual, with_check').eq('tablename', 'invoices');
    if (error) console.log('Cannot query pg_policies:', error.message);
    else console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(policies, null, 2));
  }

  // 2. Check if 'bookings' table exists (policies reference it)
  console.log('\n=== Check if bookings (plural) table exists ===');
  const { data: bookings, error: bErr } = await admin.from('bookings').select('id').limit(1);
  if (bErr) console.log('bookings table ERROR:', bErr.message, bErr.code);
  else console.log('bookings table OK, rows:', bookings.length);
  
  // 3. Check booking (singular) table
  const { data: booking, error: bsErr } = await admin.from('booking').select('id').limit(1);
  if (bsErr) console.log('booking table ERROR:', bsErr.message);
  else console.log('booking table OK, rows:', booking.length);

  // 4. Check invoice_items RLS
  console.log('\n=== invoice_items simple select ===');
  const { data: items, error: iErr } = await admin.from('invoice_items').select('id').limit(1);
  if (iErr) console.log('invoice_items ERROR:', iErr.message);
  else console.log('invoice_items OK');

  // 5. Test the full join query but as admin to see the actual data
  console.log('\n=== Full invoice join query (admin) ===');
  const { data: fullData, error: fullErr } = await admin
    .from('invoices')
    .select('id, owner_id, booking_id, intake_form_id, booking:booking(id), intake_form:intake_forms(id), items:invoice_items(id)')
    .limit(2);
  if (fullErr) console.log('Full join ERROR:', JSON.stringify(fullErr));
  else console.log('Full join OK, first:', JSON.stringify(fullData[0]));

  // 6. Get owner_id from invoices to understand auth
  console.log('\n=== Invoice owner_ids ===');
  const { data: invs } = await admin.from('invoices').select('id, owner_id, created_by').limit(5);
  if (invs) invs.forEach(i => console.log(`inv ${i.id.substring(0,8)}: owner=${i.owner_id}, created_by=${i.created_by}`));
  
  // 7. Get the user IDs from auth
  console.log('\n=== Users in auth ===');
  const { data: users } = await admin.from('users').select('id, email, role').limit(5);
  if (users) users.forEach(u => console.log(`user ${u.id.substring(0,8)}: ${u.email} (${u.role})`));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
