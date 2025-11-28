const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.t5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const adminClient = createClient(supabaseUrl, serviceKey);

async function verify() {
  console.log('🔍 Verifying migration...\n');
  
  // 1. Check table structure
  console.log('1️⃣ Checking table structure...');
  const { data: items, error: fetchError } = await adminClient
    .from('service_items')
    .select('*')
    .limit(1);
  
  if (fetchError) {
    console.log('❌ Error fetching items:', fetchError.message);
    return;
  }
  
  if (items.length > 0) {
    const columns = Object.keys(items[0]);
    console.log('✅ Columns:', columns.join(', '));
    
    if (columns.includes('owner_id')) {
      console.log('✅ owner_id column exists');
    } else {
      console.log('❌ owner_id column NOT found');
    }
  }
  
  // 2. Test with authenticated owner user
  console.log('\n2️⃣ Testing with owner user (testitem@test.com)...');
  
  // Use API to get auth token
  const loginResponse = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testitem@test.com',
      password: 'testpass123',
    }),
  });
  
  if (!loginResponse.ok) {
    console.log('❌ Login failed:', await loginResponse.text());
    return;
  }
  
  const authResult = await loginResponse.json();
  const token = authResult.access_token;
  
  console.log('✅ Logged in as: testitem@test.com');
  console.log('   Token:', token.substring(0, 20) + '...');
  console.log('✅ Logged in as: testitem@test.com');
  console.log('   Token:', token.substring(0, 20) + '...');
  
  // Get user info using admin client
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('id, role, tenant_id')
    .eq('email', 'testitem@test.com')
    .single();
  
  if (userData) {
    console.log('   User ID:', userData.id);
    console.log('   Role:', userData.role);
    console.log('   Tenant ID:', userData.tenant_id);
  }
  
  // 3. Test INSERT with owner_id via API
  console.log('\n3️⃣ Testing INSERT with owner_id via API...');
  
  const createResponse = await fetch('http://localhost:3000/service-items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Owner Test Item',
      description: 'Testing owner-specific item creation after migration',
      category: 'dj',
      default_price: 500,
      is_active: true,
      owner_id: userData.id
    }),
  });
  
  if (!createResponse.ok) {
    console.log('❌ INSERT failed:', await createResponse.text());
  } else {
    const insertData = await createResponse.json();
    console.log('✅ INSERT succeeded!');
    console.log('   Item ID:', insertData.id);
    console.log('   Owner ID:', insertData.owner_id);
  }
  
  // 4. Test SELECT - should see own items via API
  console.log('\n4️⃣ Testing SELECT via API...');
  
  const listResponse = await fetch('http://localhost:3000/service-items', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!listResponse.ok) {
    console.log('❌ SELECT failed:', await listResponse.text());
  } else {
    const items = await listResponse.json();
    const ownItems = items.filter(item => item.owner_id === userData.id);
    const globalItems = items.filter(item => !item.owner_id);
    console.log(`✅ Found ${items.length} total items`);
    console.log(`   - ${ownItems.length} owned by this user`);
    console.log(`   - ${globalItems.length} global items`);
  }
  
  console.log('\n✅ Migration verification complete!');
}

verify().catch(console.error);
