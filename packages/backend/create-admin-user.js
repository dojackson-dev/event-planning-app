require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_EMAIL = 'admin@dovenuesuite.com';
const ADMIN_PASSWORD = 'DoVenueAdmin2026!';

(async () => {
  // Create in Supabase Auth
  const { data: authData, error: authError } = await s.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError && !authError.message.includes('already been registered')) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    // User may already exist, look it up
    const { data: { users } } = await s.auth.admin.listUsers();
    const existing = (users || []).find(u => u.email === ADMIN_EMAIL);
    if (!existing) { console.error('Could not find or create admin auth user'); process.exit(1); }
    console.log('Admin auth user already exists:', existing.id);

    // Upsert in users table
    await s.from('users').upsert({ id: existing.id, email: ADMIN_EMAIL, role: 'admin', first_name: 'DoVenue', last_name: 'Admin' }, { onConflict: 'id' });
    console.log('Done. Admin user ready.');
    return;
  }

  // Insert into users table
  const { error: dbError } = await s.from('users').insert({
    id: userId,
    email: ADMIN_EMAIL,
    role: 'admin',
    first_name: 'DoVenue',
    last_name: 'Admin',
  });

  if (dbError) console.warn('DB insert warning:', dbError.message);

  console.log('Admin user created!');
  console.log('  Email:', ADMIN_EMAIL);
  console.log('  Password:', ADMIN_PASSWORD);
  console.log('  ID:', userId);
})().catch(e => { console.error(e); process.exit(1); });
