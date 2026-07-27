#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function insertPromoterAccounts() {
  try {
    console.log('🚀 Migrating owner accounts to promoter accounts...\n');

    // Fetch all owners and their owner accounts
    console.log('1️⃣  Fetching all owners...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, roles');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      process.exit(1);
    }

    const owners = users.filter(u => 
      u.roles && Array.isArray(u.roles) && u.roles.includes('owner')
    );

    console.log(`   ✅ Found ${owners.length} owners\n`);

    if (owners.length === 0) {
      console.log('   ℹ️  No owners to migrate\n');
      process.exit(0);
    }

    // Get their owner accounts
    console.log('2️⃣  Fetching owner accounts...');
    const { data: ownerAccounts, error: acctError } = await supabase
      .from('owner_accounts')
      .select('id, primary_owner_id, business_name');

    if (acctError) {
      console.error('❌ Error fetching owner accounts:', acctError);
      process.exit(1);
    }

    console.log(`   ✅ Found ${ownerAccounts.length} owner accounts\n`);

    // Create promoter account records
    console.log('3️⃣  Preparing promoter account data...');
    const promoAccounts = [];
    
    for (const owner of owners) {
      const ownerAcct = ownerAccounts.find(oa => oa.primary_owner_id === owner.id);
      if (ownerAcct) {
        promoAccounts.push({
          user_id: owner.id,
          owner_account_id: ownerAcct.id,
          company_name: ownerAcct.business_name,
          contact_name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || owner.email,
          email: owner.email,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    console.log(`   ✅ Prepared ${promoAccounts.length} promoter accounts\n`);

    // Insert into promoter_accounts
    console.log('4️⃣  Inserting promoter accounts...');
    if (promoAccounts.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('promoter_accounts')
        .upsert(promoAccounts, { onConflict: 'user_id' });

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        process.exit(1);
      }

      console.log(`   ✅ Inserted ${inserted?.length || promoAccounts.length} promoter accounts\n`);
    }

    // Update user roles
    console.log('5️⃣  Updating user roles to include promoter...');
    for (const owner of owners) {
      if (!owner.roles.includes('promoter')) {
        owner.roles.push('promoter');
        const { error: updateError } = await supabase
          .from('users')
          .update({ roles: owner.roles })
          .eq('id', owner.id);

        if (updateError) {
          console.error(`❌ Error updating user ${owner.email}:`, updateError);
        }
      }
    }

    console.log(`   ✅ Updated ${owners.length} user roles\n`);

    console.log('✨ Migration complete!\n');
    console.log('📊 Summary:');
    console.log(`   • ${owners.length} owners migrated`);
    console.log(`   • ${promoAccounts.length} promoter accounts created`);
    console.log(`   • All owners now have promoter role\n`);
    console.log('🎉 Owners can now access the promoter dashboard!\n');

    process.exit(0);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

insertPromoterAccounts();
