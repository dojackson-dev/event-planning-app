const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTcxNjczMiwiZXhwIjoyMDQ1MjkyNzMyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('migrations/add-tenant-to-service-items.sql', 'utf8');
    
    console.log('📝 Running migration...\n');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('Data:', data);
    
    // Verify the owner_id column was added
    const { data: tableInfo, error: tableError } = await supabase
      .from('service_items')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('\n⚠️ Could not verify table structure:', tableError.message);
    } else {
      console.log('\n✅ Table structure verified');
      if (tableInfo.length > 0) {
        console.log('Columns:', Object.keys(tableInfo[0]).join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
