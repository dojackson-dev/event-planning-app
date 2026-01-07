/**
 * Script to set all existing owners to active subscription status for testing
 * Run with: node set-owners-subscribed.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setOwnersSubscribed() {
  console.log('🔧 Setting all existing owners to subscribed status...\n');

  // 1. Get all owner users
  const { data: owners, error: ownersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('role', 'owner');

  if (ownersError) {
    console.error('❌ Error fetching owners:', ownersError.message);
    return;
  }

  console.log(`Found ${owners.length} owner user(s)\n`);

  for (const owner of owners) {
    console.log(`Processing: ${owner.email} (${owner.first_name} ${owner.last_name})`);

    // 2. Check if owner has owner_account
    const { data: membership } = await supabase
      .from('memberships')
      .select('owner_account_id, owner_accounts(*)')
      .eq('user_id', owner.id)
      .eq('role', 'owner')
      .single();

    if (membership && membership.owner_account_id) {
      // Update existing owner_account
      const { error: updateError } = await supabase
        .from('owner_accounts')
        .update({
          subscription_status: 'active',
          plan_id: 'test-plan',
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        })
        .eq('id', membership.owner_account_id);

      if (updateError) {
        console.error(`  ❌ Error updating account: ${updateError.message}`);
      } else {
        console.log(`  ✅ Subscription activated for existing account`);
      }
    } else {
      // Create owner_account if missing
      const { data: newAccount, error: accountError } = await supabase
        .from('owner_accounts')
        .insert({
          business_name: `${owner.first_name}'s Venue`,
          primary_owner_id: owner.id,
          subscription_status: 'active',
          plan_id: 'test-plan',
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (accountError) {
        console.error(`  ❌ Error creating account: ${accountError.message}`);
        continue;
      }

      console.log(`  ✅ Owner account created: ${newAccount.id}`);

      // Create membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({
          user_id: owner.id,
          owner_account_id: newAccount.id,
          role: 'owner',
          is_active: true,
        });

      if (memberError) {
        console.error(`  ❌ Error creating membership: ${memberError.message}`);
      } else {
        console.log(`  ✅ Membership created`);
      }

      // Create a default venue if none exists
      const { data: venues } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_account_id', newAccount.id);

      if (!venues || venues.length === 0) {
        const { error: venueError } = await supabase
          .from('venues')
          .insert({
            owner_account_id: newAccount.id,
            name: `${owner.first_name}'s Event Center`,
            address: '123 Test Street',
            capacity: 200,
          });

        if (venueError) {
          console.error(`  ❌ Error creating venue: ${venueError.message}`);
        } else {
          console.log(`  ✅ Default venue created`);
        }
      }
    }

    // Update user verification flags for testing
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        phone_verified: true,
        sms_opt_in: true,
        status: 'active',
      })
      .eq('id', owner.id);

    if (userUpdateError) {
      console.error(`  ❌ Error updating user: ${userUpdateError.message}`);
    } else {
      console.log(`  ✅ User verification flags set\n`);
    }
  }

  console.log('\n✅ All owners set to active subscription status!');
  console.log('🔐 All owners can now access the application without Stripe setup');
}

setOwnersSubscribed().catch(console.error);
