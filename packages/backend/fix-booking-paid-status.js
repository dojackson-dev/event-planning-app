/**
 * Backfill: mark vendor_bookings as 'paid' where the linked vendor_invoice is paid.
 * Run: node fix-booking-paid-status.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('Fetching paid owner_booking invoices with a linked vendor_booking_id...');

  const { data: invoices, error } = await admin
    .from('vendor_invoices')
    .select('id, invoice_number, status, vendor_booking_id, owner_account_id')
    .eq('status', 'paid')
    .eq('invoice_type', 'owner_booking')
    .not('vendor_booking_id', 'is', null);

  if (error) {
    console.error('Error fetching invoices:', error.message);
    process.exit(1);
  }

  if (!invoices || invoices.length === 0) {
    console.log('No paid owner_booking invoices found with a linked booking.');
    return;
  }

  console.log(`Found ${invoices.length} paid invoice(s). Updating linked bookings...`);

  for (const inv of invoices) {
    const { data: booking, error: bErr } = await admin
      .from('vendor_bookings')
      .select('id, status')
      .eq('id', inv.vendor_booking_id)
      .single();

    if (bErr || !booking) {
      console.warn(`  ⚠ No booking found for invoice ${inv.invoice_number} (booking_id: ${inv.vendor_booking_id})`);
      continue;
    }

    if (booking.status === 'paid') {
      console.log(`  ✓ Booking ${booking.id} already paid — skipping`);
      continue;
    }

    const { error: uErr } = await admin
      .from('vendor_bookings')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', booking.id);

    if (uErr) {
      console.error(`  ✗ Failed to update booking ${booking.id}:`, uErr.message);
    } else {
      console.log(`  ✓ Booking ${booking.id} (${inv.invoice_number}) → status set to 'paid'`);
    }
  }

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
