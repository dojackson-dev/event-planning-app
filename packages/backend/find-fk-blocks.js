const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const userIds = [
  '25ef1e74-4a5d-42bd-b31b-b4427c715f1c', // events@therookeryms.com
  '578a9e07-de07-4191-80c7-2ee45e951d8a',  // larry@curesicklecell.org
];

// Known public tables to check
const tables = [
  'owner_accounts', 'vendor_accounts', 'artist_accounts', 'memberships',
  'venues', 'intake_forms', 'events', 'vendor_bookings', 'invoices',
  'contracts', 'payments', 'service_items', 'categories', 'client_details',
  'owner_service_items', 'intake_slugs', 'phone_verifications',
];

async function run() {
  for (const tbl of tables) {
    for (const id of userIds) {
      const { data, error } = await supabase.from(tbl).select('id').eq('user_id', id).limit(1);
      if (error && (error.message.includes('does not exist') || error.message.includes('column'))) continue;
      if (error) console.log(tbl, 'error:', error.message);
      else if (data?.length > 0) console.log('FOUND row in', tbl, 'user_id =', id);
    }
  }

  // Also check owner_id column variant
  for (const tbl of ['events', 'intake_forms', 'invoices', 'contracts']) {
    for (const id of userIds) {
      const { data, error } = await supabase.from(tbl).select('id').eq('owner_id', id).limit(1);
      if (error) continue;
      if (data?.length > 0) console.log('FOUND row in', tbl, 'owner_id =', id);
    }
  }

  // Try to delete - Supabase returns detailed error sometimes
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) console.log('Delete error for', id, ':', JSON.stringify(error));
    else console.log('Deleted:', id);
  }

  console.log('done');
}
run();
