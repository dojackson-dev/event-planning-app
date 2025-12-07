const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForeignKeys() {
  console.log('Checking guest_lists table structure...\n');
  
  // Query PostgreSQL system tables to find foreign keys
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'guest_lists';
    `
  });
  
  if (error) {
    console.error('Error:', error);
    console.log('\nTrying direct query instead...');
    
    // Try a simpler approach
    const result = await supabase
      .from('guest_lists')
      .select('*')
      .limit(1);
    
    console.log('Guest lists sample:', result.data);
  } else {
    console.log('Foreign keys:', data);
  }
}

checkForeignKeys().then(() => process.exit(0));
