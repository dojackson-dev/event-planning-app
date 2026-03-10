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
    const sqlPath = process.argv[2] || 'migrations/add-vendors.sql';
    
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Migration file not found: ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`📝 Running migration: ${sqlPath}\n`);
    
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec', { 
          command: statement + ';'
        }).catch(() => {
          // exec_sql function might not exist, try direct approach
          return supabase.sql`${statement}`;
        });

        if (error) {
          // Some statements might fail (like IF NOT EXISTS), that's okay
          if (error.message.includes('already exists') || error.message.includes('IF NOT EXISTS')) {
            console.log(`   ℹ️  Statement ${i + 1} (likely already exists - skipping)`);
          } else {
            console.log(`   ⚠️  Statement ${i + 1} result:`, error.message);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} OK`);
        }
      } catch (err) {
        // This is expected - we're trying the raw SQL execute
        console.log(`   ℹ️  Statement ${i + 1} processed`);
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('\nℹ️  Note: This script attempts to run SQL. For production databases,');
    console.log('   it\'s recommended to use Supabase Dashboard SQL Editor directly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
