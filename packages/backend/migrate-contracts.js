require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function migrate() {
  const connStr = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connStr) {
    // Fall back to supabase-js approach
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Test: try inserting with body field to see the error
    const { error } = await supabase.from('contracts').select('body').limit(0);
    if (!error) {
      console.log('body column already exists');
    } else {
      console.log('body column missing:', error.message);
      console.log('Please run this SQL in your Supabase dashboard SQL editor:');
      console.log('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS body TEXT;');
      console.log("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'upload';");
    }
    return;
  }

  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    await client.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS body TEXT');
    await client.query("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'upload'");
    console.log('Migration complete: body and contract_type columns added to contracts');
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await client.end();
  }
}

migrate();
