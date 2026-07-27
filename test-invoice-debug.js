const { createClient } = require('./event-planning-app/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

async function run() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Get users who own invoices  
  const { data: invOwners } = await admin.from('invoices').select('owner_id').limit(5);
  const ownerIds = [...new Set(invOwners?.map(i => i.owner_id))];
  console.log('Invoice owner IDs:', ownerIds);
  
  // Get auth users for these owner IDs
  for (const ownerId of ownerIds) {
    const { data: user } = await admin.from('users').select('id, email, role').eq('id', ownerId).single();
    if (user) console.log(`  ${ownerId}: ${user.email} (${user.role})`);
  }
  
  // Try to create a session for the owner user using admin.auth.admin
  console.log('\n=== Creating admin session for owner ===');
  // Create a magic link or OTP won't work from script
  // Instead, let's use service role to impersonate
  
  // Create a session directly via admin API
  const ownerId = ownerIds[0];
  const { data: sessionData, error: sessionErr } = await admin.auth.admin.createUser({
    email: `test_owner_session_${Date.now()}@test.com`,
    password: 'TempTest123!',
    email_confirm: true
  });
  
  if (sessionErr && !sessionErr.message.includes('already registered')) {
    console.log('Create test user error:', sessionErr.message);
  }
  
  // Better: test the query directly as user by generating a JWT manually
  // Use service role to set custom claims
  
  // Actually, let's just test the query with the service role but mimicking user auth
  // The issue might be in how NestJS handles the error, not the query itself
  
  // Test: does the query fail when there ARE results?
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  
  // Create a session via admin.generateLink  
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'testitem@test.com',
  });
  if (linkErr) console.log('Link error:', linkErr.message);
  else console.log('Link generated for testitem@test.com');
  
  // The real question: what does the backend error message say?
  // Let's decode the error from the production backend
  console.log('\n=== Testing production backend with testitem credentials ===');
  const https = require('https');
  
  const { data: auth2, error: auth2Err } = await authClient.auth.signInWithPassword({
    email: 'testitem@test.com', password: 'Test123!'
  });
  if (auth2Err) { console.log('Auth failed:', auth2Err.message); return; }
  
  const token = auth2.session.access_token;
  console.log('Token obtained, making request to production...');
  
  // Make request to production with verbose error capturing
  const makeRequest = (path) => new Promise((resolve) => {
    const url = new URL('https://event-planning-app-backend-dq3s.onrender.com' + path);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.setTimeout(30000, () => resolve({ error: 'timeout' }));
    req.end();
  });
  
  // Test with owner_id that HAS invoices (e897efbb)
  const r1 = await makeRequest('/invoices?ownerId=e897efbb-88e4-4fe5-8c93-4c9ffcbd5cfc');
  console.log(`\nGET /invoices?ownerId=e897efbb... status=${r1.status}`);
  console.log('Response body:', r1.body?.substring(0, 500));
  
  // Test without ownerId  
  const r2 = await makeRequest('/invoices');
  console.log(`\nGET /invoices status=${r2.status}`);
  console.log('Response body:', r2.body?.substring(0, 500));
  
  // Test health/ping
  const r3 = await makeRequest('/');
  console.log(`\nGET / status=${r3.status}, body=${r3.body?.substring(0, 100)}`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
