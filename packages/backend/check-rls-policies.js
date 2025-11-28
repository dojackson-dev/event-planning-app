const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRLSPolicies() {
  console.log('Checking RLS policies on service_items table...\n');
  
  // Query pg_policies to see what policies exist
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'service_items');
  
  if (error) {
    console.error('Error fetching policies:', error.message);
    
    // Try alternative query using rpc
    console.log('\nTrying alternative method to check RLS status...');
    
    const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname, 
          tablename, 
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE tablename = 'service_items'
      `
    });
    
    if (rlsError) {
      console.error('Alternative query failed:', rlsError.message);
      console.log('\nManual check: Try querying as regular user...');
      
      // Test with anon key
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.t5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM';
      const anonClient = createClient(supabaseUrl, anonKey);
      
      const { data: testData, error: testError } = await anonClient
        .from('service_items')
        .select('count');
      
      if (testError) {
        console.log('❌ Anon user CANNOT query service_items');
        console.log('Error:', testError.message);
        console.log('\n⚠️  RLS is likely ENABLED and blocking access');
      } else {
        console.log('✅ Anon user CAN query service_items');
        console.log('Data:', testData);
        console.log('\n✅ RLS is either DISABLED or has permissive policies');
      }
    } else {
      console.log('RLS status:', rlsData);
    }
  } else {
    if (data.length === 0) {
      console.log('⚠️  No RLS policies found for service_items table');
      console.log('This means either:');
      console.log('  1. RLS is disabled on the table (anyone can access)');
      console.log('  2. RLS is enabled but no policies exist (no one can access except service_role)');
    } else {
      console.log(`Found ${data.length} RLS policies:\n`);
      data.forEach(policy => {
        console.log(`Policy: ${policy.policyname}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Roles: ${policy.roles}`);
        console.log(`  Using: ${policy.qual || 'N/A'}`);
        console.log(`  With Check: ${policy.with_check || 'N/A'}`);
        console.log('');
      });
    }
  }
}

checkRLSPolicies().catch(console.error);
