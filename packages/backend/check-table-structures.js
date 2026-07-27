#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTableStructure(tableName) {
  console.log(`\n📋 Checking ${tableName} table structure...\n`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]).sort();
      console.log(`✅ Columns found (${columns.length} total):\n`);
      columns.forEach((col, i) => console.log(`  ${i + 1}. ${col}`));
    } else {
      console.log('⚠️  No records found in table');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function main() {
  console.log('🔍 Checking Database Tables\n');
  console.log('='.repeat(50));
  
  await checkTableStructure('invoices');
  await checkTableStructure('invoice_items');
  await checkTableStructure('contracts');
  await checkTableStructure('estimates');
}

main();
