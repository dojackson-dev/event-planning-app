const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTcxNjczMiwiZXhwIjoyMDQ1MjkyNzMyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const sql = fs.readFileSync('migrations/add-intake-slug.sql', 'utf8');
  console.log('Running intake-slug migration…\n');
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  console.log('✅ Migration complete!');

  // Show current slugs
  const { data } = await supabase
    .from('owner_accounts')
    .select('business_name, intake_slug')
    .not('intake_slug', 'is', null);
  if (data && data.length) {
    console.log('\nCurrent intake slugs:');
    data.forEach(r => console.log(`  "${r.business_name}" → ${r.intake_slug}`));
  }
}

run();
