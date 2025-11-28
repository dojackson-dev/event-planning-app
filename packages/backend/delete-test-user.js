const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteTestUser() {
  const userId = '22391a17-b6bc-4272-a284-92b6972fd078';
  
  console.log('Deleting test@test.com user...');
  
  const { error } = await supabase.auth.admin.deleteUser(userId);
  
  if (error) {
    console.error('Error deleting user:', error.message);
  } else {
    console.log('✓ User deleted successfully!');
  }
}

deleteTestUser().catch(console.error);
