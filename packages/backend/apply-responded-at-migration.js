#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function executeUsingRPC() {
  console.log('  Trying exec_sql RPC...');
  try {
    const sql = 'ALTER TABLE estimates ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;';
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (!error) {
      console.log('    ✅ Success via exec_sql RPC');
      return true;
    }
  } catch (e) {
    // Fall through to next method
  }
  return false;
}

async function executeUsingSql() {
  console.log('  Trying raw SQL method...');
  try {
    // PostgreSQL function approach
    const { data, error } = await supabase.rpc('sql', { 
      query: 'ALTER TABLE estimates ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;'
    });
    if (!error) {
      console.log('    ✅ Success via sql RPC');
      return true;
    }
  } catch (e) {
    // Fall through
  }
  return false;
}

async function verifyColumn() {
  try {
    const { data, error } = await supabase
      .from('estimates')
      .select('responded_at')
      .limit(1);
    
    if (!error && data) {
      return 'responded_at' in data[0];
    }
  } catch (e) {
    // Column doesn't exist yet
  }
  return false;
}

async function main() {
  console.log('\n📝 Migration: Add responded_at column to estimates table\n');
  
  // First check current state
  console.log('🔍 Checking current state...');
  const exists = await verifyColumn();
  
  if (exists) {
    console.log('✅ Column responded_at already exists!\n');
    return;
  }
  
  console.log('⚠️  Column responded_at does not exist yet.\n');
  console.log('Attempting automated migration...\n');
  
  let success = false;
  
  // Try RPC methods
  success = success || await executeUsingRPC();
  success = success || await executeUsingSql();
  
  if (!success) {
    console.log('\n⚠️  Automated execution not available.\n');
    const migrationPath = path.join(__dirname, 'migrations', 'add-responded-at-to-estimates.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Manual Migration Steps:\n');
    console.log('1. Go to Supabase Dashboard: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql');
    console.log('2. Create a new query');
    console.log('3. Copy and paste this SQL:\n');
    console.log('---');
    console.log(sql);
    console.log('---\n');
    console.log('4. Click "Run"');
    console.log('5. Verify the migration completed\n');
    return;
  }
  
  // Verify it worked
  console.log('\n✨ Verifying migration...');
  const verified = await verifyColumn();
  if (verified) {
    console.log('✅ SUCCESS! responded_at column is now available.\n');
  } else {
    console.log('⚠️  Migration may not have completed. Please verify manually.\n');
  }
}

main().catch(console.error);
