require('dotenv').config({ path: 'packages/backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = 'testartist@eventecos.com';
const PASSWORD = 'TestArtist2026!';

(async () => {
  const { data: authData, error: authError } = await s.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (authError && !authError.message.includes('already been registered')) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }

  let userId = authData?.user?.id;

  if (!userId) {
    const { data: { users } } = await s.auth.admin.listUsers();
    const existing = (users || []).find(u => u.email === EMAIL);
    if (!existing) { console.error('Could not find or create artist auth user'); process.exit(1); }
    userId = existing.id;
    console.log('Auth user already exists:', userId);
  }

  const { error: dbError } = await s.from('users').upsert({
    id: userId,
    email: EMAIL,
    role: 'artist',
    roles: ['artist'],
    first_name: 'Test',
    last_name: 'Artist',
    status: 'active',
    email_verified: true,
  }, { onConflict: 'id' });

  if (dbError) console.warn('DB upsert warning:', dbError.message);

  console.log('\nTest artist account ready!');
  console.log('  Email:   ', EMAIL);
  console.log('  Password:', PASSWORD);
  console.log('  User ID: ', userId);
})().catch(e => { console.error(e); process.exit(1); });
