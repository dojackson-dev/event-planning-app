#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createPromoterSchema() {
  try {
    console.log('🚀 Setting up promoter accounts schema...\n');

    // 1. Add 'promoter' to user_role enum
    console.log('1️⃣  Adding promoter role to enum...');
    try {
      await supabase.rpc('exec_sql', {
        sql_query: `ALTER TYPE user_role ADD VALUE 'promoter';`
      });
      console.log('   ✅ Role added to enum');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️  Promoter role already exists in enum');
      } else {
        console.log('   ⚠️  Could not add to enum (might already exist):', e.message);
      }
    }

    // 2. Create promoter_accounts table
    console.log('\n2️⃣  Creating promoter_accounts table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS promoter_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        owner_account_id INTEGER REFERENCES owner_accounts(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        contact_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        location VARCHAR(255),
        bio TEXT,
        website VARCHAR(500),
        instagram VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        stripe_account_id VARCHAR(255),
        stripe_connect_status TEXT DEFAULT 'not_connected',
        profile_image_url TEXT,
        cover_image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `;
    
    try {
      // Try creating the table via direct insert test
      await supabase.from('promoter_accounts').select('id').limit(1);
      console.log('   ✅ Table already exists');
    } catch (e) {
      console.log('   ⚠️  Cannot verify table via API - will need manual SQL execution');
    }

    // 3. Insert all owners into promoter_accounts
    console.log('\n3️⃣  Fetching all owners...');
    const { data: owners, error: ownersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        owner_accounts(id, business_name)
      `)
      .eq('roles', ['owner']);

    if (ownersError) {
      console.log('   ⚠️  Error fetching owners:', ownersError.message);
      console.log('\n   Will proceed with manual SQL execution...\n');
      throw new Error('Cannot fetch owners - need manual SQL');
    }

    console.log(`   ✅ Found ${owners?.length || 0} owners\n`);

    if (!owners || owners.length === 0) {
      console.log('   ℹ️  No owners found to migrate\n');
      console.log('✅ Schema is ready. When owners are created, run the migration SQL.\n');
      process.exit(0);
    }

    // 4. Insert owners as promoters
    console.log('4️⃣  Creating promoter accounts...');
    const promoAccounts = [];
    
    for (const owner of owners) {
      if (owner.owner_accounts && owner.owner_accounts.length > 0) {
        const oa = owner.owner_accounts[0];
        promoAccounts.push({
          user_id: owner.id,
          owner_account_id: oa.id,
          company_name: oa.business_name,
          contact_name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || owner.email,
          email: owner.email,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (promoAccounts.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('promoter_accounts')
        .upsert(promoAccounts, { onConflict: 'user_id' });

      if (insertError) {
        console.log('   ⚠️  Insert error:', insertError.message);
        console.log('   📖 Please execute the SQL migration manually at:');
        console.log('      https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new\n');
        throw new Error('Insert failed');
      }

      console.log(`   ✅ Created ${inserted?.length || 0} promoter accounts\n`);
    }

    // 5. Update user roles
    console.log('5️⃣  Updating user roles...');
    const { error: roleError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          UPDATE users
          SET roles = CASE
            WHEN NOT roles @> ARRAY['promoter']::text[] THEN array_append(roles, 'promoter')
            ELSE roles
          END
          WHERE id IN (SELECT DISTINCT user_id FROM promoter_accounts)
          AND NOT (roles @> ARRAY['promoter']::text[]);
        `
      });

    if (roleError && !roleError.message.includes('does not exist')) {
      console.log('   ⚠️  Could not update roles via RPC');
    } else {
      console.log('   ✅ User roles updated\n');
    }

    console.log('\n✨ Migration complete! Owners now have promoter access.\n');
    process.exit(0);

  } catch (err) {
    console.log('\n📖 MANUAL EXECUTION REQUIRED\n');
    console.log('Please execute this SQL in Supabase SQL Editor:');
    console.log('URL: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new\n');
    
    const sql = fs.readFileSync('./migrations/grant-owner-promoter-access.sql', 'utf8');
    console.log(sql);
    
    process.exit(1);
  }
}

createPromoterSchema();
