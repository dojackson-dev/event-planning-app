const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Try to insert a minimal test row to see the actual error
  const { data, error } = await supabase
    .from('security')
    .insert([{ name: 'TEST', phone: '5550000000' }])
    .select()
    .single();

  if (error) {
    console.log('Insert error:', error.message, error.details, error.hint);
  } else {
    console.log('Insert succeeded, columns:', Object.keys(data));
    // Clean up
    await supabase.from('security').delete().eq('id', data.id);
    console.log('Test row deleted.');
  }
}

run().catch(console.error);
