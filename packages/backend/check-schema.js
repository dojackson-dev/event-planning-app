const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSchema() {
  console.log('🔍 Checking table schemas...\n');
  
  try {
    // Check users structure
    const { data: users } = await supabase.from('users').select('*').limit(1);
    if (users && users.length > 0) {
      console.log('👥 Users columns:', Object.keys(users[0]).join(', '));
    }
    
    // Check owner_accounts structure
    const { data: ownerAccounts } = await supabase.from('owner_accounts').select('*').limit(1);
    if (ownerAccounts && ownerAccounts.length > 0) {
      console.log('🏢 Owner Accounts columns:', Object.keys(ownerAccounts[0]).join(', '));
    }
    
    // Check venues structure
    const { data: venues } = await supabase.from('venues').select('*').limit(1);
    if (venues && venues.length > 0) {
      console.log('📍 Venues columns:', Object.keys(venues[0]).join(', '));
    }
    
    // Check memberships structure
    const { data: memberships } = await supabase.from('memberships').select('*').limit(1);
    if (memberships && memberships.length > 0) {
      console.log('🔗 Memberships columns:', Object.keys(memberships[0]).join(', '));
    }
    
    // Check invites structure
    const { data: invites } = await supabase.from('invites').select('*').limit(1);
    if (invites) {
      console.log('✉️ Invites columns:', invites.length > 0 ? Object.keys(invites[0]).join(', ') : '(no records yet)');
    }
    
    // Check client_profiles structure
    const { data: clientProfiles } = await supabase.from('client_profiles').select('*').limit(1);
    if (clientProfiles) {
      console.log('👤 Client Profiles columns:', clientProfiles.length > 0 ? Object.keys(clientProfiles[0]).join(', ') : '(no records yet)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
