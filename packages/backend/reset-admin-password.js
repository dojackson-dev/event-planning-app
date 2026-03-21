require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: { users } } = await s.auth.admin.listUsers();
  const admin = (users || []).find(u => u.email === 'admin@dovenuesuite.com');
  if (!admin) { console.error('Admin user not found'); process.exit(1); }

  const { error } = await s.auth.admin.updateUserById(admin.id, { password: 'M@rshall!!!' });
  if (error) { console.error('Error:', error.message); process.exit(1); }

  console.log('Password updated successfully for admin@dovenuesuite.com');
})().catch(e => { console.error(e); process.exit(1); });
