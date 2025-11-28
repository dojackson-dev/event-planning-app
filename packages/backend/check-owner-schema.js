const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSchema() {
  console.log('Checking for owners and user_owners tables...\n');
  
  // Check if owners table exists
  const { data: ownersData, error: ownersError } = await supabase
    .from('owners')
    .select('*')
    .limit(1);
  
  if (ownersError) {
    console.log('❌ owners table:', ownersError.message);
  } else {
    console.log('✅ owners table exists');
    if (ownersData.length > 0) {
      console.log('Sample owner:', ownersData[0]);
    }
  }
  
  // Check if user_owners table exists
  const { data: userOwnersData, error: userOwnersError } = await supabase
    .from('user_owners')
    .select('*')
    .limit(1);
  
  if (userOwnersError) {
    console.log('❌ user_owners table:', userOwnersError.message);
  } else {
    console.log('✅ user_owners table exists');
    if (userOwnersData.length > 0) {
      console.log('Sample user_owner:', userOwnersData[0]);
    }
  }
  
  // Check users table for owner_id
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (!usersError && usersData.length > 0) {
    console.log('\n✅ users table structure:');
    console.log('Columns:', Object.keys(usersData[0]));
  }
}

checkSchema().catch(console.error);
