#!/usr/bin/env node
/**
 * Applies create-email-jobs-table.sql via a direct Postgres connection
 * (session pooler, port 5432 — required for DDL).
 * Usage: node apply-email-jobs-migration.js
 */
const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// URL-encode special chars in password (e.g. @ -> %40, ! -> %21)
const password = (process.env.DB_PASSWORD || '').replace(/@/g, '%40').replace(/!/g, '%21');
const connectionString = `postgresql://postgres:${password}@db.unzfkcmmakyyjgruexpy.supabase.co:5432/postgres`;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'create-email-jobs-table.sql'),
    'utf8',
  );

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    await client.query(sql);
    console.log('✅ email_jobs table + users.email_unsubscribed_at ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
