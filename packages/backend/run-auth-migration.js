const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
    console.log('📝 Reading migration file...');
    const sql = fs.readFileSync('migrations/create-auth-architecture.sql', 'utf8');
    
    console.log('🚀 Running auth architecture migration...\n');
    
    // Split by semicolon but be careful with function definitions
    const statements = sql
      .split(/;(?=\s*(?:--|$|\n))/g) // Split on semicolons followed by comments or newlines
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--')); // Remove empty and comment-only lines
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      // Show progress for key operations
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE.*?(\w+)/);
        if (match) {
          console.log(`Creating table: ${match[1]}`);
        }
      }
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        // Ignore "already exists" errors
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key')
        )) {
          // Skip silently
        } else {
          console.error(`❌ Error on statement ${i + 1}:`, error.message.substring(0, 150));
          errorCount++;
        }
      } else {
        successCount++;
      }
    }
    
    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} statements`);
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = ['owner_accounts', 'venues', 'memberships', 'client_profiles', 'invites'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (error) {
        console.log(`   ❌ ${table}: NOT FOUND`);
      } else {
        console.log(`   ✅ ${table}: exists`);
      }
    }
    
    console.log('\n🎉 Auth architecture migration complete!');
    console.log('📌 Next step: Run "node set-owners-subscribed.js" to activate existing owners');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

runMigration();
