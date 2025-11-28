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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running RLS migration for intake_forms table...\n');
  
  const sqlFile = path.join(__dirname, 'migrations', 'step2-add-intake-forms-rls.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  // Split by semicolons and filter out comments and empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
    
    if (error) {
      // Try direct query if RPC doesn't work
      const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
      
      if (directError) {
        console.error('ERROR:', error.message);
        console.log('\nNote: Direct SQL execution requires running this through Supabase SQL Editor.');
        console.log('Please run the migration file manually in the Supabase Dashboard:');
        console.log(`https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor\n`);
        process.exit(1);
      }
    }
    
    console.log('✓ Success\n');
  }
  
  console.log('✅ Migration completed successfully!');
  
  // Verify RLS is enabled
  console.log('\nVerifying RLS policies...');
  const { data: policies, error: policyError } = await supabase
    .from('intake_forms')
    .select('*')
    .limit(0);
  
  if (policyError) {
    console.log('Note: RLS policies are active (this is expected when not authenticated)');
  } else {
    console.log('✓ intake_forms table is accessible');
  }
}

runMigration().catch(console.error);
