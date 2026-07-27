const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', 'add-responded-at-to-estimates.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      return;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Running migration: add-responded-at-to-estimates.sql\n');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the responded_at column was added
    const { data: tableInfo, error: tableError } = await supabase
      .from('estimates')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('\n⚠️ Could not verify table structure:', tableError.message);
    } else {
      console.log('\n✅ Table structure verified');
      if (tableInfo && tableInfo.length > 0) {
        const columns = Object.keys(tableInfo[0]);
        console.log(`Columns (${columns.length} total):`, columns.join(', '));
        
        if (columns.includes('responded_at')) {
          console.log('✅ responded_at column confirmed!');
        } else {
          console.log('⚠️ responded_at column not found - migration may have failed');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
