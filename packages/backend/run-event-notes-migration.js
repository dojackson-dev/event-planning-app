#!/usr/bin/env node
/**
 * Applies the event_notes table migration.
 *
 * Usage:
 *   node run-event-notes-migration.js          # uses production creds from .env
 *   NODE_ENV=demo node run-event-notes-migration.js   # uses demo creds from .env.demo
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or DEMO_SUPABASE_URL /
 * DEMO_SUPABASE_SERVICE_ROLE_KEY when NODE_ENV=demo) to be set — loaded from
 * the local .env files, never hardcoded here.
 */

require('dotenv').config({ path: process.env.NODE_ENV === 'demo' ? '.env.demo' : '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NODE_ENV === 'demo'
  ? (process.env.SUPABASE_URL || process.env.DEMO_SUPABASE_URL)
  : (process.env.SUPABASE_URL || process.env.DEMO_SUPABASE_URL);
const supabaseKey = process.env.NODE_ENV === 'demo'
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY)
  : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log(`Running event_notes migration against ${supabaseUrl} ...`);

  const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'create-event-notes-table.sql'), 'utf8');

  let { error } = await supabase.rpc('exec_sql', { sql });
  if (error && /Could not find the function/i.test(error.message)) {
    // Some environments expose exec_sql with a differently named parameter.
    ({ error } = await supabase.rpc('exec_sql', { sql_query: sql }));
  }

  if (error) {
    console.error('Migration failed:', error.message);
    console.error('If exec_sql RPC is unavailable, run migrations/create-event-notes-table.sql manually in the Supabase SQL editor.');
    process.exit(1);
  }

  console.log('event_notes table created successfully.');

  const { error: verifyError } = await supabase.from('event_notes').select('id').limit(1);
  if (verifyError) {
    console.error('Verification query failed:', verifyError.message);
  } else {
    console.log('Verified: event_notes table is queryable.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
