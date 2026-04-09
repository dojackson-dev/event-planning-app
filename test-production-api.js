const https = require('https');
const { createClient } = require('./event-planning-app/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM';
const BACKEND_URL = 'https://event-planning-app-backend-dq3s.onrender.com';

async function makeRequest(path, token) {
  return new Promise((resolve) => {
    const url = new URL(BACKEND_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    let data = '';
    const req = https.request(options, (res) => {
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data.substring(0, 500) });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(30000, () => resolve({ error: 'timeout' }));
    req.end();
  });
}

async function run() {
  // Get a fresh token for larry
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  
  // Try different known credentials
  const credentials = [
    { email: 'testitem@test.com', password: 'Test123!' },
    { email: 'owner@test.com', password: 'Test123!' },
    { email: 'owner@test.com', password: 'testpass123' },
    { email: 'admin@dovenuesuites.com', password: 'DoVenueAdmin2026!' },
  ];
  
  let token = null;
  let userId = null;
  
  for (const cred of credentials) {
    const { data, error } = await authClient.auth.signInWithPassword(cred);
    if (!error && data.session) {
      token = data.session.access_token;
      userId = data.user.id;
      console.log(`✅ Logged in as ${cred.email} (${userId})`);
      break;
    } else {
      console.log(`❌ ${cred.email}: ${error?.message}`);
    }
  }
  
  if (!token) {
    console.log('Could not get a token');
    return;
  }
  
  // Test the production backend
  console.log('\n=== Testing production backend ===');
  
  console.log('\n1. GET /invoices (no params):');
  const r1 = await makeRequest('/invoices', token);
  console.log('Status:', r1.status, 'Body:', JSON.stringify(r1.body).substring(0, 300));
  
  console.log('\n2. GET /invoices?ownerId=' + userId);
  const r2 = await makeRequest('/invoices?ownerId=' + userId, token);
  console.log('Status:', r2.status, 'Body:', JSON.stringify(r2.body).substring(0, 300));
  
  console.log('\n3. GET /owner/profile:');
  const r3 = await makeRequest('/owner/profile', token);
  console.log('Status:', r3.status, 'Body:', JSON.stringify(r3.body).substring(0, 200));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
