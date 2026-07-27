/**
 * fix-owner-memberships.js
 *
 * Diagnoses and repairs owner accounts that are missing:
 *  - memberships row (links user_id → owner_account_id)
 *  - primary_owner_id on owner_accounts
 *
 * Run: node fix-owner-memberships.js
 * Optional: node fix-owner-memberships.js <email>  ← checks one specific user
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const targetEmail = process.argv[2] || null;

async function main() {
  console.log('=== Owner Membership Repair Tool ===\n');

  // 1. Get all auth users (or just one)
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) { console.error('Failed to list auth users:', authErr.message); process.exit(1); }

  const filtered = targetEmail
    ? authUsers.filter(u => u.email?.toLowerCase() === targetEmail.toLowerCase())
    : authUsers;

  console.log(`Checking ${filtered.length} auth user(s)...\n`);

  for (const authUser of filtered) {
    console.log(`\n--- ${authUser.email} (auth id: ${authUser.id}) ---`);

    // 2. Check users table
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!dbUser) {
      console.log('  ⚠️  No row in users table for this auth user. Skipping.');
      continue;
    }
    console.log(`  ✅ users table row found. role=${dbUser.role}`);

    if (dbUser.role !== 'owner') {
      console.log('  ℹ️  Not an owner — skipping.');
      continue;
    }

    // 3. Check memberships
    const { data: membership } = await supabase
      .from('memberships')
      .select('id, owner_account_id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (membership) {
      console.log(`  ✅ memberships row found. owner_account_id=${membership.owner_account_id}`);

      // Ensure primary_owner_id is set on the owner_accounts row
      const { data: oa } = await supabase
        .from('owner_accounts')
        .select('id, primary_owner_id, business_name')
        .eq('id', membership.owner_account_id)
        .maybeSingle();

      if (!oa) {
        console.log('  ⚠️  owner_accounts row not found for membership.owner_account_id!');
        continue;
      }

      console.log(`  ✅ owner_accounts found: "${oa.business_name}" (id=${oa.id})`);

      if (!oa.primary_owner_id) {
        console.log('  🔧 primary_owner_id is NULL — fixing...');
        const { error: fixErr } = await supabase
          .from('owner_accounts')
          .update({ primary_owner_id: authUser.id })
          .eq('id', oa.id);
        if (fixErr) console.error('  ❌ Fix failed:', fixErr.message);
        else console.log('  ✅ primary_owner_id set to', authUser.id);
      } else if (oa.primary_owner_id !== authUser.id) {
        console.log(`  ⚠️  primary_owner_id mismatch! stored=${oa.primary_owner_id} expected=${authUser.id}`);
      } else {
        console.log(`  ✅ primary_owner_id already correct`);
      }
      continue;
    }

    // No membership — try to find owner_accounts by primary_owner_id
    console.log('  ⚠️  No memberships row found.');
    const { data: oaByPid } = await supabase
      .from('owner_accounts')
      .select('id, business_name, primary_owner_id')
      .eq('primary_owner_id', authUser.id)
      .maybeSingle();

    if (oaByPid) {
      console.log(`  ✅ owner_accounts found by primary_owner_id: "${oaByPid.business_name}" (id=${oaByPid.id})`);
      console.log('  🔧 Creating missing memberships row...');
      const { error: mErr } = await supabase
        .from('memberships')
        .insert({ user_id: authUser.id, owner_account_id: oaByPid.id, role: 'owner', is_active: true });
      if (mErr) console.error('  ❌ memberships insert failed:', mErr.message);
      else console.log('  ✅ memberships row created');
      continue;
    }

    // Last resort: find by email match in business context (no reliable link)
    console.log('  ❌ Cannot automatically link — no primary_owner_id and no memberships row.');
    console.log('     Run this SQL in Supabase to list owner_accounts without a user link:');
    console.log(`     SELECT id, business_name, primary_owner_id FROM owner_accounts WHERE primary_owner_id IS NULL;`);
    console.log(`     Then run:`);
    console.log(`     UPDATE owner_accounts SET primary_owner_id = '${authUser.id}' WHERE id = <the_id>;`);
    console.log(`     INSERT INTO memberships (user_id, owner_account_id, role, is_active)`);
    console.log(`       VALUES ('${authUser.id}', <the_id>, 'owner', true);`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
