const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

console.log('Using Supabase URL:', supabaseUrl);
console.log('Service Role Key length:', serviceRoleKey?.length);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUsers() {
  console.log('Checking users table...\n');
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*');
  
  if (usersError) {
    console.error('Error fetching users:', usersError.message);
  } else {
    console.log(`Found ${users.length} users in users table:`);
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Tenant: ${user.tenant_id}`);
    });
  }
  
  console.log('\nChecking Supabase Auth users...\n');
  
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError.message);
  } else {
    console.log(`Found ${authUsers.length} auth users:`);
    authUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Created: ${user.created_at}`);
      if (user.user_metadata) {
        console.log(`    Metadata:`, user.user_metadata);
      }
    });
  }
}

checkUsers().catch(console.error);
