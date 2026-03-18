// One-time fix: set is_active = true for any vendor_accounts where is_active IS NULL
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixVendorActive() {
  // First show which vendors are affected
  const { data: nullVendors, error: fetchErr } = await supabase
    .from('vendor_accounts')
    .select('id, business_name, is_active')
    .is('is_active', null)

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1) }

  if (!nullVendors || nullVendors.length === 0) {
    console.log('✅ No vendors with is_active = NULL found. Nothing to fix.')
    return
  }

  console.log(`Found ${nullVendors.length} vendor(s) with is_active = NULL:`)
  nullVendors.forEach(v => console.log(`  - ${v.business_name} (${v.id})`))

  const { data, error } = await supabase
    .from('vendor_accounts')
    .update({ is_active: true })
    .is('is_active', null)
    .select('id, business_name, is_active')

  if (error) { console.error('Update error:', error.message); process.exit(1) }

  console.log(`\n✅ Fixed ${data.length} vendor(s):`)
  data.forEach(v => console.log(`  - ${v.business_name} → is_active: ${v.is_active}`))
}

fixVendorActive()
