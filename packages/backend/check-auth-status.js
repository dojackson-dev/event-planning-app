const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAuthSetup() {
  console.log('🔍 Checking Auth Setup Status\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check users with verification status
    const { data: users } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, email_verified, phone_verified, sms_opt_in, status')
      .order('created_at', { ascending: false });
    
    console.log('\n👥 USERS:');
    users.forEach(u => {
      console.log(`\n   📧 ${u.email}`);
      console.log(`      Name: ${u.first_name} ${u.last_name}`);
      console.log(`      Role: ${u.role}`);
      console.log(`      Status: ${u.status || 'N/A'}`);
      console.log(`      Verified: Email=${u.email_verified || false}, Phone=${u.phone_verified || false}`);
      console.log(`      SMS Opt-in: ${u.sms_opt_in || false}`);
    });
    
    // 2. Check owner accounts
    const { data: ownerAccounts } = await supabase
      .from('owner_accounts')
      .select(`
        id, 
        business_name, 
        primary_owner_id,
        subscription_status, 
        plan_id,
        stripe_customer_id,
        current_period_end
      `);
    
    console.log('\n\n🏢 OWNER ACCOUNTS:');
    ownerAccounts.forEach(oa => {
      console.log(`\n   Business: ${oa.business_name}`);
      console.log(`      Owner ID: ${oa.primary_owner_id}`);
      console.log(`      Subscription: ${oa.subscription_status}`);
      console.log(`      Plan: ${oa.plan_id || 'N/A'}`);
      console.log(`      Stripe Customer: ${oa.stripe_customer_id || 'Not connected'}`);
      if (oa.current_period_end) {
        console.log(`      Expires: ${new Date(oa.current_period_end).toLocaleDateString()}`);
      }
    });
    
    // 3. Check venues
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name, owner_account_id, address, capacity');
    
    console.log('\n\n📍 VENUES:');
    if (venues.length === 0) {
      console.log('   (none)');
    } else {
      venues.forEach(v => {
        console.log(`\n   ${v.name}`);
        console.log(`      Owner Account: ${v.owner_account_id}`);
        console.log(`      Address: ${v.address || 'Not set'}`);
        console.log(`      Capacity: ${v.capacity || 'Not set'}`);
      });
    }
    
    // 4. Check memberships
    const { data: memberships } = await supabase
      .from('memberships')
      .select('user_id, owner_account_id, role, is_active');
    
    console.log('\n\n🔗 MEMBERSHIPS:');
    memberships.forEach(m => {
      const user = users.find(u => u.id === m.user_id);
      console.log(`\n   ${user ? user.email : m.user_id.substring(0, 8) + '...'}`);
      console.log(`      → Owner Account: ${m.owner_account_id}`);
      console.log(`      Role: ${m.role}`);
      console.log(`      Active: ${m.is_active}`);
    });
    
    console.log('\n\n' + '='.repeat(60));
    console.log('\n✅ AUTH SETUP STATUS:');
    console.log(`   • ${users.length} user(s)`);
    console.log(`   • ${ownerAccounts.length} owner account(s)`);
    console.log(`   • ${venues.length} venue(s)`);
    console.log(`   • ${memberships.length} membership(s)`);
    
    const ownersWithSub = ownerAccounts.filter(oa => 
      oa.subscription_status === 'active' || oa.subscription_status === 'trialing'
    );
    console.log(`   • ${ownersWithSub.length} active subscription(s)`);
    
    console.log('\n📋 READY TO TEST:');
    console.log('   1. Backend should be running on http://localhost:3001');
    console.log('   2. Test owner login at POST /auth/flow/owner/login');
    console.log('   3. SMS codes will appear in backend console');
    console.log('   4. Stripe checkout returns mock URLs');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkAuthSetup();
