#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('\n📝 Migration: Add responded_at column to estimates table\n');
  
  const migrationPath = path.join(__dirname, 'migrations', 'add-responded-at-to-estimates.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('SQL to execute:');
  console.log('------------------------------------------');
  console.log(sql);
  console.log('------------------------------------------\n');
  
  console.log('🔍 Checking current estimates table structure...\n');
  
  try {
    const { data, error } = await supabase
      .from('estimates')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying estimates:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]).sort();
      console.log(`Current columns (${columns.length}):`);
      columns.forEach(col => console.log(`  • ${col}`));
      
      if (columns.includes('responded_at')) {
        console.log('\n✅ SUCCESS: responded_at column already exists!\n');
      } else {
        console.log('\n⚠️  responded_at column NOT found.\n');
        console.log('📋 To apply this migration:\n');
        console.log('1. Go to Supabase Dashboard: https://app.supabase.com');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the SQL above');
        console.log('4. Click "Run"\n');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
