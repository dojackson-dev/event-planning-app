const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTables() {
  console.log('Checking for service_items table...\n');
  
  const { data, error } = await supabase
    .from('service_items')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('\nThe service_items table does not exist or there is a permission issue.');
  } else {
    console.log('Success! Found', data.length, 'items in service_items table');
    if (data.length > 0) {
      console.log('Sample item:', data[0]);
    }
  }
}

checkTables().catch(console.error);
