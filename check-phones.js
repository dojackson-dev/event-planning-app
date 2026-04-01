const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'
);

// Evaluate whether a phone number is valid US E.164 or can be fixed
function diagnose(phone) {
  if (!phone) return { status: 'EMPTY', fixed: null };
  const digits = phone.replace(/\D/g, '');
  if (phone.match(/^\+1\d{10}$/)) return { status: 'OK', fixed: phone };
  if (digits.length === 10) return { status: 'FIX_ADD_COUNTRY', fixed: '+1' + digits };
  if (digits.length === 11 && digits.startsWith('1')) return { status: 'FIX_ADD_PLUS', fixed: '+' + digits };
  if (digits.length === 9) return { status: 'BAD_9DIGITS', fixed: null };
  if (digits.length < 9) return { status: 'TOO_SHORT', fixed: null };
  if (digits.length > 11) return { status: 'TOO_LONG', fixed: null };
  return { status: 'UNKNOWN', fixed: null };
}

async function checkTable(table, nameField, phoneField, extra) {
  const cols = [extra, nameField, phoneField, 'id'].filter(Boolean).join(',');
  const { data, error } = await sb.from(table).select(cols).limit(200);
  if (error) { console.log(`  ${table}: ${error.message}`); return []; }
  const issues = [];
  data.forEach(row => {
    const phone = row[phoneField];
    const d = diagnose(phone);
    const name = row[nameField] || row.id;
    if (d.status !== 'OK' && d.status !== 'EMPTY') {
      issues.push({ table, id: row.id, name, phone, ...d });
    }
    const marker = d.status === 'OK' ? '?' : d.status === 'EMPTY' ? '  ' : '?';
    const fix = d.fixed ? ` ? FIX: ${d.fixed}` : '';
    if (d.status !== 'EMPTY') {
      console.log(`  ${marker} [${d.status}] ${name}: "${phone}"${fix}`);
    }
  });
  return issues;
}

async function main() {
  const allFixes = [];

  console.log('\n=== intake_forms ===');
  const f1 = await checkTable('intake_forms', 'contact_name', 'contact_phone', 'status');
  allFixes.push(...f1);

  console.log('\n=== booking ===');
  const f2 = await checkTable('booking', 'contact_name', 'contact_phone', 'status');
  allFixes.push(...f2);

  console.log('\n=== users ===');
  const f3 = await checkTable('users', 'email', 'phone', 'role');
  allFixes.push(...f3);

  console.log('\n=== profiles ===');
  const f4 = await checkTable('profiles', 'full_name', 'phone', null);
  allFixes.push(...f4);

  console.log('\n=== vendors (phone) ===');
  const f5 = await checkTable('vendors', 'name', 'phone', null);
  allFixes.push(...f5);

  console.log('\n=== vendors (contact_phone) ===');
  const f6 = await checkTable('vendors', 'name', 'contact_phone', null);
  allFixes.push(...f6);

  // Summary
  console.log('\n========== SUMMARY ==========');
  if (allFixes.length === 0) {
    console.log('All phone numbers are correctly formatted ?');
  } else {
    console.log(`Found ${allFixes.length} phone number issue(s):\n`);
    allFixes.forEach(f => {
      console.log(`  Table: ${f.table}`);
      console.log(`  Name:  ${f.name}`);
      console.log(`  ID:    ${f.id}`);
      console.log(`  Phone: "${f.phone}" [${f.status}]`);
      console.log(`  Fix:   ${f.fixed || 'MANUAL REVIEW NEEDED'}`);
      console.log('');
    });
  }

  // Auto-apply safe fixes
  const safeFixes = allFixes.filter(f => f.fixed);
  if (safeFixes.length > 0) {
    console.log(`Applying ${safeFixes.length} automatic fix(es)...`);
    for (const f of safeFixes) {
      const phoneField = f.table === 'intake_forms' || f.table === 'booking' ? 'contact_phone' : 'phone';
      const update = { [phoneField]: f.fixed };
      const { error } = await sb.from(f.table).update(update).eq('id', f.id);
      if (error) {
        console.log(`  ? Failed to fix ${f.name} in ${f.table}: ${error.message}`);
      } else {
        console.log(`  ? Fixed ${f.name} (${f.table}): "${f.phone}" ? "${f.fixed}"`);
      }
    }
  }
}

main().catch(err => console.error('Fatal:', err.message));
