const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMAIL      = 'larry@curesickecell.org';
const FIRST_NAME = 'Don';
const LAST_NAME  = 'King';
// Temporary random password — user will reset via email
const TEMP_PASS  = crypto.randomBytes(16).toString('hex') + 'Aa1!';

async function main() {
  console.log(`\nCreating promoter account for ${EMAIL}...\n`);

  // 1. Create Supabase auth user (email pre-confirmed)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: TEMP_PASS,
    email_confirm: true,
    user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
  });

  if (authErr) {
    console.error('❌ Auth user creation failed:', authErr.message);
    process.exit(1);
  }
  const userId = authData.user.id;
  console.log('✅ Auth user created:', userId);

  // 2. Insert into users table
  const { error: userErr } = await supabase.from('users').insert({
    id:             userId,
    email:          EMAIL,
    first_name:     FIRST_NAME,
    last_name:      LAST_NAME,
    role:           'promoter',
    roles:          ['promoter'],
    status:         'active',
    email_verified: true,
    phone_verified: false,
    sms_opt_in:     false,
  });

  if (userErr) {
    console.error('❌ users table insert failed:', userErr.message);
    process.exit(1);
  }
  console.log('✅ users table record created');

  // 3. Send password reset email so user can set their own password
  const { error: resetErr } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: EMAIL,
    options: { redirectTo: 'https://eventecos.com/promoter/login' },
  });

  if (resetErr) {
    console.error('⚠️  Could not generate reset link:', resetErr.message);
    console.log('   User can still use "Forgot password" on the login page.');
  } else {
    console.log('✅ Password reset email sent to', EMAIL);
  }

  console.log('\n🎉 Done! larry@curesickecell.org can now log in at https://eventecos.com/promoter/login');
  console.log('   They need to click the reset link in their email to set a password first.\n');
}

main().catch(console.error);
