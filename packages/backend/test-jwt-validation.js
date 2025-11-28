const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IlVJeDdrMlZRRlBlUmEwYlEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3VuemZrY21tYWt5eWpncnVleHB5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlODk3ZWZiYi04OGU0LTRmZTUtOGM5My00YzlmZmNiZDVjZmMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY0MjEyODAwLCJpYXQiOjE3NjQyMDkyMDAsImVtYWlsIjoib3duZXJAdGVzdC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2NDIwOTIwMH1dLCJzZXNzaW9uX2lkIjoiZmI2OTNkYjItOTg1YS00ODE2LTkyMjMtNjAxYjEwOGQzNjAxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.Dt5KfNk9Pqxl5kIDwcKtQt5cYryhRUeZA8KMeaiScfo';

async function testJWT() {
  console.log('Testing JWT validation...');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
  
  // Test 1: Regular client with auth context
  console.log('\n=== Test 1: Creating client with auth header ===');
  const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  
  const { data: { user: user1 }, error: error1 } = await supabaseWithAuth.auth.getUser(token);
  console.log('User:', user1);
  console.log('Error:', error1);
  
  // Test 2: Regular client without auth context
  console.log('\n=== Test 2: Regular client calling getUser ===');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user: user2 }, error: error2 } = await supabase.auth.getUser(token);
  console.log('User:', user2);
  console.log('Error:', error2);
  
  // Decode JWT to see claims
  console.log('\n=== JWT Payload ===');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log(JSON.stringify(payload, null, 2));
}

testJWT().catch(console.error);
