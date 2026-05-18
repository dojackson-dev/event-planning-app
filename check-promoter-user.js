const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TARGET_EMAIL = 'larry@curesickecell.org';

async function main() {
  console.log(`\nChecking user: ${TARGET_EMAIL}\n`);

  // 1. Check users table
  const { data: dbUser, error: dbErr } = await supabase
    .from('users')
    .select('id, email, role, roles, status, created_at')
    .eq('email', TARGET_EMAIL)
    .single();

  if (dbErr || !dbUser) {
    console.log('❌ Not found in users table:', dbErr?.message);
  } else {
    console.log('✅ Found in users table:');
    console.log('   role:', dbUser.role);
    console.log('   roles:', JSON.stringify(dbUser.roles));
    console.log('   status:', dbUser.status);
    console.log('   id:', dbUser.id);

    const hasPromoterRole =
      dbUser.role === 'promoter' ||
      (Array.isArray(dbUser.roles) && dbUser.roles.includes('promoter'));

    if (!hasPromoterRole) {
      console.log('\n⚠️  PROBLEM: promoter is NOT in role/roles — fixing now...');

      const newRoles = Array.isArray(dbUser.roles)
        ? [...new Set([...dbUser.roles, 'promoter'])]
        : [dbUser.role, 'promoter'].filter(Boolean);

      const { error: fixErr } = await supabase
        .from('users')
        .update({ role: 'promoter', roles: newRoles })
        .eq('id', dbUser.id);

      if (fixErr) {
        console.log('❌ Fix failed:', fixErr.message);
      } else {
        console.log('✅ Fixed! role=promoter, roles=', JSON.stringify(newRoles));
      }
    } else {
      console.log('\n✅ Roles look correct — promoter is present.');
    }
  }

  // 2. Check Supabase Auth record
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers();
  if (!authErr) {
    const authUser = authUsers.find(u => u.email === TARGET_EMAIL);
    if (!authUser) {
      console.log('\n❌ Not found in Supabase Auth — user cannot sign in at all.');
      console.log('   They need to be created via /promoter/signup or the Supabase dashboard.');
    } else {
      console.log('\n✅ Found in Supabase Auth:');
      console.log('   confirmed_at:', authUser.confirmed_at || '(not confirmed — email not verified)');
      console.log('   last_sign_in_at:', authUser.last_sign_in_at);
      if (!authUser.confirmed_at) {
        console.log('\n⚠️  Email not verified — manually confirming now...');
        const { error: confirmErr } = await supabase.auth.admin.updateUserById(authUser.id, {
          email_confirm: true
        });
        if (confirmErr) {
          console.log('❌ Could not confirm email:', confirmErr.message);
        } else {
          console.log('✅ Email confirmed.');
        }
      }
    }
  }

  // 3. Check promoter_accounts
  if (dbUser?.id) {
    const { data: pa } = await supabase
      .from('promoter_accounts')
      .select('id, company_name, contact_name, status')
      .eq('user_id', dbUser.id)
      .single();
    if (!pa) {
      console.log('\n⚠️  No promoter_accounts record found for this user.');
    } else {
      console.log('\n✅ promoter_accounts found:', pa.company_name || pa.contact_name, '| status:', pa.status);
    }
  }
}

main().catch(console.error);
