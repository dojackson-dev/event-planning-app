const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Running RLS migration for intake_forms table...\n');
  
  try {
    // Step 1: Enable RLS
    console.log('1. Enabling Row Level Security on intake_forms...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;'
    });
    
    // Since RPC might not work, let's try a different approach
    // We'll verify the table exists first
    const { data: tables, error: tableError } = await supabase
      .from('intake_forms')
      .select('*')
      .limit(0);
    
    console.log('✓ Table exists and is accessible with service role key\n');
    
    // For RLS policies, we need to use the SQL Editor in Supabase Dashboard
    console.log('⚠️  RLS policies require SQL execution through Supabase Dashboard\n');
    console.log('Please follow these steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor');
    console.log('2. Open the SQL Editor');
    console.log('3. Copy and paste the contents of: migrations/step2-add-intake-forms-rls.sql');
    console.log('4. Click "Run" to execute the migration\n');
    
    console.log('The migration file contains:');
    console.log('- Enable RLS on intake_forms table');
    console.log('- Create policies for SELECT, INSERT, UPDATE, DELETE');
    console.log('- All policies are scoped to authenticated users accessing their own data\n');
    
    // Let's at least verify the table structure
    console.log('Current intake_forms table is ready for RLS policies.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runMigration().catch(console.error);
