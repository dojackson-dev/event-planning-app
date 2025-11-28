const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupOwner() {
  console.log('👤 Checking users...\n');
  
  // Get all users
  const { data: users, error } = await adminClient
    .from('users')
    .select('id, email, role, tenant_id');
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  console.log(`Found ${users.length} users:\n`);
  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Role: ${user.role || 'null'}`);
    console.log(`   Tenant ID: ${user.tenant_id || 'null'}\n`);
  });
  
  // Update first user to be an owner
  if (users.length > 0) {
    const firstUser = users[0];
    console.log(`\n🔧 Updating ${firstUser.email} to role='owner'...\n`);
    
    const { data: updated, error: updateError } = await adminClient
      .from('users')
      .update({ role: 'owner' })
      .eq('id', firstUser.id)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Update failed:', updateError.message);
    } else {
      console.log('✅ User updated successfully!');
      console.log(`   ${updated.email} is now role='owner'`);
      console.log(`\nYou can now run: node test-owner-items.js`);
    }
  }
}

setupOwner().catch(console.error);
