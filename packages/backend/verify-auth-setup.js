const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifySetup() {
  console.log('🔍 Verifying auth architecture setup...\n');
  
  try {
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role, email_verified, phone_verified, sms_opt_in, status');
    
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log('👥 Users:');
      users.forEach(u => {
        console.log(`   ${u.email} (${u.role})`);
        console.log(`      Verified: email=${u.email_verified}, phone=${u.phone_verified}, sms=${u.sms_opt_in}`);
        console.log(`      Status: ${u.status}`);
      });
    }
    
    // Check owner_accounts
    const { data: ownerAccounts, error: ownerError } = await supabase
      .from('owner_accounts')
      .select('id, user_id, business_name, subscription_status, plan_id');
    
    if (ownerError) {
      console.error('❌ Owner accounts error:', ownerError);
    } else {
      console.log('\n🏢 Owner Accounts:');
      ownerAccounts.forEach(oa => {
        console.log(`   ${oa.business_name}`);
        console.log(`      Subscription: ${oa.subscription_status} (${oa.plan_id})`);
      });
    }
    
    // Check venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, owner_account_id, is_active');
    
    if (venuesError) {
      console.error('❌ Venues error:', venuesError);
    } else {
      console.log('\n📍 Venues:');
      venues.forEach(v => {
        console.log(`   ${v.name} (${v.is_active ? 'active' : 'inactive'})`);
      });
    }
    
    // Check memberships
    const { data: memberships, error: memberError } = await supabase
      .from('memberships')
      .select('id, user_id, owner_account_id, role');
    
    if (memberError) {
      console.error('❌ Memberships error:', memberError);
    } else {
      console.log('\n🔗 Memberships:');
      memberships.forEach(m => {
        console.log(`   User ${m.user_id.substring(0, 8)}... → Owner Account ${m.owner_account_id} (${m.role})`);
      });
    }
    
    console.log('\n✅ Setup verification complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start backend: npm run start:dev');
    console.log('   2. Test endpoints:');
    console.log('      - POST /auth/flow/owner/login');
    console.log('      - POST /auth/flow/owner/signup (for new owners)');
    console.log('      - POST /auth/flow/client/invite (create invite)');
    console.log('   3. Check console for SMS OTP codes');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifySetup();
