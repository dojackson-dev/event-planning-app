const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMAIL = 'larry@curesickecell.org';

async function main() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: EMAIL,
    options: { redirectTo: 'https://eventecos.com/promoter/reset-password' },
  });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  // The action_link may point to localhost — fix it to production
  let link = data?.properties?.action_link || '';
  link = link.replace(/http:\/\/localhost:\d+/g, 'https://eventecos.com');

  console.log('\n✅ Password reset link for', EMAIL);
  console.log('\nSend this link to the user:\n');
  console.log(link);
  console.log('\n(Link expires in 1 hour)\n');
}

main().catch(console.error);
