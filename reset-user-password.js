const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = 'sales@eventecos.com';

async function resetPassword(newPassword) {
  // Find user by email
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  const user = users.find(u => u.email === EMAIL);
  if (!user) {
    console.error(`User ${EMAIL} not found.`);
    process.exit(1);
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) throw error;

  console.log(`Password updated successfully for ${EMAIL}`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// Hide input by overriding _writeToOutput
rl._writeToOutput = (str) => {
  if (str.trim()) process.stdout.write('*');
};

process.stdout.write('Enter new password: ');
rl.question('', (password) => {
  rl.close();
  process.stdout.write('\n');
  if (!password) { console.error('No password entered.'); process.exit(1); }
  resetPassword(password).catch(err => { console.error(err.message); process.exit(1); });
});
