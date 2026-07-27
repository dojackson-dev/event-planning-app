const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSecurityFk() {
  console.log('Checking tables and FK constraints...\n');

  // Check what tables exist
  const { data: tables, error: tablesErr } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public');
  if (!tablesErr) {
    const eventTables = (tables || []).filter(t => t.tablename.includes('event'));
    console.log('Event-related tables:', eventTables.map(t => t.tablename));
  } else {
    console.log('pg_tables error:', tablesErr.message);
  }

  // Check FK constraint details via pg_constraint
  const { data: fkData, error: fkErr } = await supabase
    .from('pg_constraint')
    .select('conname, contype, confrelid')
    .eq('conname', 'security_event_id_fkey');
  if (!fkErr) console.log('FK constraint data:', fkData);
  else console.log('pg_constraint error:', fkErr.message);

  // Try inserting a security record without event_id to confirm that works
  console.log('\nTo fix: run this SQL in the Supabase dashboard SQL editor:');
  console.log(`
  ALTER TABLE security DROP CONSTRAINT IF EXISTS security_event_id_fkey;
  ALTER TABLE security
    ADD CONSTRAINT security_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE SET NULL;
  `);
}

fixSecurityFk();
