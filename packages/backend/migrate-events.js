const { Client } = require('pg');

const client = new Client({
  host: 'db.unzfkcmmakyyjgruexpy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'L0ve090@!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database');

  // Add owner_id column
  await client.query(`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES owner_accounts(id) ON DELETE SET NULL
  `);
  console.log('✅ owner_id column added');

  // Add venue_id column
  await client.query(`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL
  `);
  console.log('✅ venue_id column added');

  // Verify final columns
  const { rows } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'events'
    ORDER BY ordinal_position
  `);
  console.log('\nEvents table columns:');
  rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
