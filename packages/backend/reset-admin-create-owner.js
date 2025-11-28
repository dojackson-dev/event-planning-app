const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetToAdmin() {
  console.log('🔧 Resetting admin@dovenuesuites.com back to admin role...\n');
  
  const { data: updated, error } = await adminClient
    .from('users')
    .update({ role: 'admin' })
    .eq('email', 'admin@dovenuesuites.com')
    .select()
    .single();
  
  if (error) {
    console.log('❌ Update failed:', error.message);
  } else {
    console.log('✅ User updated successfully!');
    console.log(`   ${updated.email} is now role='${updated.role}'`);
  }
  
  // Now create a proper test owner user
  console.log('\n👤 Creating test owner user...\n');
  
  // First, try to create the auth user
  const testEmail = 'owner@test.com';
  const testPassword = 'testpass123';
  
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });
  
  let userId;
  
  if (authError) {
    console.log('⚠️  User already exists in auth, fetching from users table...');
    
    // Try to get from auth.users first
    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (!listError && authUsers.users) {
      const existingAuthUser = authUsers.users.find(u => u.email === testEmail);
      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(`   Found in auth: ${userId}`);
      }
    }
    
    // If not found, check users table
    if (!userId) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('email', testEmail)
        .single();
      userId = existingUser?.id;
      if (userId) {
        console.log(`   Found in users table: ${userId}`);
      }
    }
    
    if (!userId) {
      console.log('❌ Could not find existing user. Try deleting owner@test.com first.');
      return;
    }
  } else {
    userId = authUser.user.id;
    console.log('✅ Auth user created');
  }
  
  if (!userId) {
    console.log('❌ Could not get user ID');
    return;
  }
  
  console.log(`   User ID: ${userId}`);
  
  // Insert/update in users table with owner role
  const { data: ownerUser, error: ownerError } = await adminClient
    .from('users')
    .upsert({
      id: userId,
      email: testEmail,
      first_name: 'Test',
      last_name: 'Owner',
      role: 'owner',
      tenant_id: null
    })
    .select()
    .single();
  
  if (ownerError) {
    console.log('❌ Owner user creation failed:', ownerError.message);
  } else {
    console.log('✅ Test owner user created!');
    console.log(`   Email: ${ownerUser.email}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Role: ${ownerUser.role}`);
    console.log(`   User ID: ${ownerUser.id}`);
    console.log('\n✅ You can now test with this owner user!');
  }
}

resetToAdmin().catch(console.error);
