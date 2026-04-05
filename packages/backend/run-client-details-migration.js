const { Client } = require('pg');
require('dotenv').config();

// Use session pooler (port 5432) — transaction pooler (6543) does not support DDL
// URL-encode special chars in password (e.g. @ -> %40)
const password = (process.env.DB_PASSWORD || '').replace(/@/g, '%40').replace(/!/g, '%21');
const connectionString = `postgresql://postgres.unzfkcmmakyyjgruexpy:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  console.log('📝 Adding client_email, client_phone, client_address to invoices...\n');

  const steps = [
    { label: 'Add client_email column',   sql: `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email TEXT;` },
    { label: 'Add client_phone column',   sql: `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_phone TEXT;` },
    { label: 'Add client_address column', sql: `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_address TEXT;` },
    {
      label: 'Backfill email & phone from intake_forms',
      sql: `
        UPDATE invoices i
        SET
          client_email = COALESCE(i.client_email, f.contact_email),
          client_phone = COALESCE(i.client_phone, f.contact_phone)
        FROM intake_forms f
        WHERE i.intake_form_id = f.id
          AND (i.client_email IS NULL OR i.client_phone IS NULL);
      `
    },
  ];

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    for (const step of steps) {
      await client.query(step.sql);
      console.log(`✅ ${step.label}`);
    }

    // Verify
    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'invoices'
        AND column_name IN ('client_email', 'client_phone', 'client_address')
      ORDER BY column_name;
    `);
    console.log('\n✅ Migration complete! Verified columns:', res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

