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

async function grantPromoterAccess() {
  try {
    const sql = fs.readFileSync('migrations/grant-owner-promoter-access.sql', 'utf8');
    
    console.log('🎬 Granting promoter access to all owner accounts...\n');
    console.log('📝 SQL migration file is ready at: migrations/grant-owner-promoter-access.sql\n');
    console.log('⚙️  To execute this migration, you have several options:\n');
    
    console.log('Option 1: Run in Supabase SQL Editor (Recommended)');
    console.log('  1. Go to: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new');
    console.log('  2. Copy and paste the SQL migration file contents');
    console.log('  3. Click "RUN"\n');
    
    console.log('Option 2: Use psql command line');
    console.log('  psql -h [your-db-host] -U postgres -d postgres < migrations/grant-owner-promoter-access.sql\n');
    
    console.log('Option 3: Create a backend migration runner');
    console.log('  Implement exec_sql RPC function in Supabase\n');
    
    console.log('📋 SQL Preview:\n');
    console.log(sql.substring(0, 500) + '...\n');
    
    console.log('✅ Migration file is ready. Run it using one of the methods above.');
    console.log('   After running, owners will have promoter access automatically.\n');
    
    console.log('📋 SQL Preview:\n');
    console.log(sql.substring(0, 500) + '...\n');
    
    console.log('✅ Migration file is ready. Run it using one of the methods above.');
    console.log('   After running, owners will have promoter access automatically.\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

grantPromoterAccess();
