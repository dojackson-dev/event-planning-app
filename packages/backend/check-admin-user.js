require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data: { users } } = await s.auth.admin.listUsers();
  const au = (users || []).find(u => u.email === 'admin@dovenuesuite.com');
  const { data: dbUser } = await s.from('users').select('id,email,role').eq('email', 'admin@dovenuesuite.com').maybeSingle();
  console.log(JSON.stringify({ authUser: au ? { id: au.id, email: au.email, confirmed: au.email_confirmed_at } : null, dbUser }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
