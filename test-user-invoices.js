const { createClient } = require('./event-planning-app/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM';

async function run() {
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: 'testitem@test.com',
    password: 'Test123!'
  });
  if (authError) { console.log('Auth failed:', authError.message); return; }
  
  const token = authData.session.access_token;
  const userId = authData.user.id;
  console.log('Logged in as:', userId);
  
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  
  // Test 1: Simple select without joins
  console.log('\n1. Simple select (no joins):');
  const { data: d1, error: e1 } = await userClient.from('invoices').select('*').limit(5);
  if (e1) console.log('ERROR:', JSON.stringify(e1));
  else console.log('OK, count:', d1.length);
  
  // Test 2: With invoice_items join
  console.log('\n2. With invoice_items join:');
  const { data: d2, error: e2 } = await userClient.from('invoices').select('*, items:invoice_items(*)').limit(5);
  if (e2) console.log('ERROR:', JSON.stringify(e2));
  else console.log('OK, count:', d2.length);
  
  // Test 3: With booking join
  console.log('\n3. With booking join:');
  const { data: d3, error: e3 } = await userClient.from('invoices').select('*, booking:booking(*)').limit(5);
  if (e3) console.log('ERROR:', JSON.stringify(e3));
  else console.log('OK, count:', d3.length);
  
  // Test 4: With intake_forms join
  console.log('\n4. With intake_forms join:');
  const { data: d4, error: e4 } = await userClient.from('invoices').select('*, intake_form:intake_forms(*)').limit(5);
  if (e4) console.log('ERROR:', JSON.stringify(e4));
  else console.log('OK, count:', d4.length);
  
  // Test 5: All joins together
  console.log('\n5. All joins (full query):');
  const { data: d5, error: e5 } = await userClient.from('invoices')
    .select('*, booking:booking(*), intake_form:intake_forms(*), items:invoice_items(*)')
    .order('created_at', { ascending: false });
  if (e5) console.log('ERROR:', JSON.stringify(e5));
  else console.log('OK, count:', d5.length);
  
  // Test 6: Check if users table blocks it
  console.log('\n6. Query users table:');
  const { data: d6, error: e6 } = await userClient.from('users').select('id, email').eq('id', userId).single();
  if (e6) console.log('ERROR:', JSON.stringify(e6));
  else console.log('OK:', d6);
  
  // Test 7: Check memberships
  console.log('\n7. Query memberships:');
  const { data: d7, error: e7 } = await userClient.from('memberships').select('*').eq('user_id', userId);
  if (e7) console.log('ERROR:', JSON.stringify(e7));
  else console.log('OK, count:', d7?.length, d7?.[0]);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
