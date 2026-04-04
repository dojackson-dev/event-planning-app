const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTcxNjczMiwiZXhwIjoyMDQ1MjkyNzMyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const migrations = [
  {
    name: 'fix-contracts-missing-columns',
    sql: `
-- 1. Add intake_form_id column
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS intake_form_id UUID REFERENCES intake_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_intake_form_id ON contracts(intake_form_id);

-- 2. Add client contact info columns
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_contracts_client_phone ON contracts(client_phone)
  WHERE client_phone IS NOT NULL;

-- 3. Backfill existing contracts from linked intake forms
UPDATE contracts c
SET
  client_name  = COALESCE(c.client_name,  f.contact_name),
  client_phone = COALESCE(c.client_phone, f.contact_phone),
  client_email = COALESCE(c.client_email, f.contact_email)
FROM intake_forms f
WHERE c.intake_form_id = f.id
  AND (c.client_phone IS NULL OR c.client_name IS NULL);
    `
  },
  {
    name: 'fix-guest-lists-one-per-event',
    sql: `
-- Remove any duplicate rows first (keep the oldest one per event)
DELETE FROM guest_lists
WHERE id NOT IN (
  SELECT MIN(id)
  FROM guest_lists
  WHERE event_id IS NOT NULL
  GROUP BY event_id
)
AND event_id IS NOT NULL;

-- Add unique constraint
ALTER TABLE guest_lists
  ADD CONSTRAINT guest_lists_event_id_unique UNIQUE (event_id);
    `
  },
];

async function run() {
  for (const m of migrations) {
    console.log(`\n▶ Running: ${m.name}`);
    const statements = m.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error) {
        // Some errors are benign (already exists, etc.)
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`  ⚠️  Skipped (already exists): ${stmt.substring(0, 60)}...`);
        } else {
          console.error(`  ❌ Error in: ${stmt.substring(0, 80)}`);
          console.error(`     ${error.message}`);
        }
      } else {
        console.log(`  ✅ OK: ${stmt.substring(0, 80)}`);
      }
    }
  }
  console.log('\nDone.');
}

run();
