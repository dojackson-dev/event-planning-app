const { createClient } = require('./event-planning-app/node_modules/@supabase/supabase-js');
const admin = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'
);

async function check() {
  // Sign in as the owner to get a real user JWT
  const anonClient = createClient(
    'https://unzfkcmmakyyjgruexpy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM'
  );
  
  const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
    email: 'larry.nixon@posmiss.com',
    password: 'Admin123!'
  });
  
  if (authErr) {
    console.log('Auth error:', authErr.message);
    return;
  }
  
  const token = authData.session.access_token;
  console.log('Got token for user:', authData.user.id);
  
  // Create user-scoped client
  const userClient = createClient(
    'https://unzfkcmmakyyjgruexpy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  
  // Test the exact query the service runs
  console.log('\n--- Testing user-scoped invoices query ---');
  const { data, error } = await userClient
    .from('invoices')
    .select('*, booking:booking(*), intake_form:intake_forms(*), items:invoice_items(*)')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.log('ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS, count:', data.length);
    if (data[0]) console.log('First invoice keys:', Object.keys(data[0]));
  }
  
  // Test simple invoices query without joins
  console.log('\n--- Testing simple invoices query ---');
  const { data: simple, error: simpleErr } = await userClient
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (simpleErr) console.log('Simple ERROR:', JSON.stringify(simpleErr));
  else console.log('Simple SUCCESS, count:', simple.length);
  
  // Test invoice_items
  console.log('\n--- Testing invoice_items ---');
  const { data: items, error: itemsErr } = await userClient
    .from('invoice_items')
    .select('*').limit(1);
  if (itemsErr) console.log('invoice_items ERROR:', JSON.stringify(itemsErr));
  else console.log('invoice_items OK, count:', items.length);
  
  // Test intake_forms
  console.log('\n--- Testing intake_forms ---');
  const { data: forms, error: formsErr } = await userClient
    .from('intake_forms')
    .select('*').limit(1);
  if (formsErr) console.log('intake_forms ERROR:', JSON.stringify(formsErr));
  else console.log('intake_forms OK, count:', forms.length);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
