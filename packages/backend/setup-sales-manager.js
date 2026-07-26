/**
 * setup-sales-manager.js
 *
 * Sets up sales@eventecos.com as an affiliate with the special manager role.
 * Run from packages/backend:  node setup-sales-manager.js
 *
 * What it does:
 *  1. Finds or creates the auth user for sales@eventecos.com
 *  2. Upserts the users row with role='affiliate'
 *  3. Upserts the affiliates row (so /affiliates/me works)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const SALES_EMAIL    = 'sales@eventecos.com';
const SALES_PASSWORD = process.env.SALES_MANAGER_PASSWORD || 'EventEcos_Sales2026!';

;(async () => {
  console.log('Setting up sales manager account:', SALES_EMAIL);

  // ── 1. Find or create auth user ──────────────────────────────────────────
  let userId;

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = (users || []).find(u => u.email === SALES_EMAIL);

  if (existing) {
    userId = existing.id;
    console.log('Auth user already exists:', userId);

    // Make sure email is confirmed
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  } else {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: SALES_EMAIL,
      password: SALES_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: 'Sales',
        last_name: 'Manager',
        role: 'affiliate',
      },
    });

    if (createErr) {
      console.error('Failed to create auth user:', createErr.message);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log('Auth user created:', userId);
  }

  // ── 2. Upsert users table with role='affiliate' ───────────────────────────
  const { error: userErr } = await admin.from('users').upsert(
    {
      id:           userId,
      email:        SALES_EMAIL,
      first_name:   'Sales',
      last_name:    'Manager',
      role:         'affiliate',
      roles:        ['affiliate'],
      status:       'active',
    },
    { onConflict: 'id' },
  );

  if (userErr) {
    console.error('Failed to upsert users row:', userErr.message);
    process.exit(1);
  }
  console.log('users table row upserted with role=affiliate');

  // ── 3. Upsert affiliates table ────────────────────────────────────────────
  const { error: affErr } = await admin.from('affiliates').upsert(
    {
      user_id:      userId,
      first_name:   'Sales',
      last_name:    'Manager',
      email:        SALES_EMAIL,
      referral_code: 'EVENTECOSSALES',
      status:       'active',
    },
    { onConflict: 'user_id' },
  );

  if (affErr) {
    console.error('Failed to upsert affiliates row:', affErr.message);
    process.exit(1);
  }
  console.log('affiliates table row upserted');

  console.log('\nDone! sales@eventecos.com is ready.');
  console.log('  Login URL : /sales-portal/login');
  console.log('  Password  :', SALES_PASSWORD);
  console.log('\nBoth the main login and the sales portal login will now work correctly.');
})().catch(e => { console.error(e); process.exit(1); });
