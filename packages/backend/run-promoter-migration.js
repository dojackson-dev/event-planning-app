const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runPromoterMigration() {
  try {
    console.log('🚀 Executing promoter access migration...\n');
    
    const sql = fs.readFileSync('./migrations/grant-owner-promoter-access.sql', 'utf8');
    
    // Execute using Supabase's rpc for raw SQL execution
    const { error, data } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async (err) => {
      // If RPC doesn't exist, try with direct query (this will fail but shows the issue)
      console.log('❌ exec_sql RPC function not found.\n');
      console.log('📖 Please run the migration manually using Supabase SQL Editor:\n');
      console.log('1. Go to: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new');
      console.log('2. Paste the SQL from: migrations/grant-owner-promoter-access.sql');
      console.log('3. Click "RUN"\n');
      console.log('SQL to execute:\n');
      console.log(sql);
      process.exit(1);
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!\n');
    console.log('📊 Results:', data);
    console.log('\n✨ All owners now have promoter access!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error running migration:', err.message);
    console.log('\n📖 Manual execution instructions:\n');
    console.log('1. Go to: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new');
    console.log('2. Paste the contents of: migrations/grant-owner-promoter-access.sql');
    console.log('3. Click "RUN"\n');
    process.exit(1);
  }
}

runPromoterMigration();
