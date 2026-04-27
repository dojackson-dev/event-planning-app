const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Old test accounts to delete (created before major schema changes)
const ACCOUNTS_TO_DELETE = [
  { id: '2fbe92e3-3275-459a-9a26-00c526cd69db', email: 'admin@dovenuesuites.com' },   // typo duplicate admin
  { id: '4b193fae-0ff4-4301-a7bd-305de5e0ad37', email: 'test@test.com' },
  { id: 'b66fd542-de15-4139-9236-a3738bfb092a', email: 'testitem@test.com' },
  { id: 'e897efbb-88e4-4fe5-8c93-4c9ffcbd5cfc', email: 'owner@test.com' },
  { id: 'c3ef233c-bd88-490e-ac8c-82162100c7ba', email: 'tester@test.com' },
  { id: '6c81421c-f722-48fe-b64c-0f5892fb66bf', email: 'testclient@example.com' },
];

async function main() {
  console.log(`Deleting ${ACCOUNTS_TO_DELETE.length} test accounts...\n`);

  for (const account of ACCOUNTS_TO_DELETE) {
    try {
      // Delete from users table first (cascades to owner_accounts)
      const { error: dbErr } = await supabase
        .from('users')
        .delete()
        .eq('id', account.id);

      if (dbErr) {
        console.warn(`  ⚠️  DB delete for ${account.email}: ${dbErr.message}`);
      } else {
        console.log(`  ✅ Deleted from users table: ${account.email}`);
      }

      // Delete from Supabase Auth
      const { error: authErr } = await supabase.auth.admin.deleteUser(account.id);
      if (authErr) {
        console.warn(`  ⚠️  Auth delete for ${account.email}: ${authErr.message}`);
      } else {
        console.log(`  ✅ Deleted from auth: ${account.email}`);
      }
    } catch (e) {
      console.error(`  ❌ Failed for ${account.email}:`, e.message);
    }
    console.log();
  }

  // Verify remaining users
  const { data: remaining } = await supabase
    .from('users')
    .select('email, role, created_at')
    .order('created_at');

  console.log('Remaining users:');
  remaining?.forEach(u => console.log(`  - ${u.email} (${u.role})`));
}

main().catch(console.error);
