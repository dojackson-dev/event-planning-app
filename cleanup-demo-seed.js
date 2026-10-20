/**
 * Cleanup: removes demo seed data accidentally inserted into the main database.
 * Deletes in dependency order (children first, then parents).
 *
 * Run:
 *   node cleanup-demo-seed.js
 *
 * Uses the same env vars as the backend (.env is loaded automatically).
 */

require('dotenv').config({ path: './packages/backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function ok(msg)   { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }

async function del(table, col, values, label) {
  if (!values || values.length === 0) { console.log(`  — skipping ${label} (nothing to delete)`); return; }
  const { error, count } = await supabase.from(table).delete({ count: 'exact' }).in(col, values);
  if (error) warn(`${label}: ${error.message}`);
  else ok(`Deleted ${count ?? '?'} row(s) from ${label}`);
}

async function delWhere(table, col, value, label) {
  const { error, count } = await supabase.from(table).delete({ count: 'exact' }).eq(col, value);
  if (error) warn(`${label}: ${error.message}`);
  else ok(`Deleted ${count ?? '?'} row(s) from ${label}`);
}

async function main() {
  console.log('\n🧹 Cleaning up demo seed data from main database...\n');

  // ── Resolve IDs ──────────────────────────────────────────────────────────────

  // Auth users
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const demoEmails = ['alex@demovenue.com', 'marcus@demopromoter.com'];
  const authUserIds = users.filter(u => demoEmails.includes(u.email)).map(u => u.id);
  console.log(`Found ${authUserIds.length} demo auth user(s): ${authUserIds.join(', ')}`);

  // Tenant
  const { data: tenants } = await supabase.from('tenants').select('id').eq('subdomain', 'grand-venue');
  const tenantIds = (tenants || []).map(t => t.id);

  // Owner account
  const { data: ownerAccts } = authUserIds.length
    ? await supabase.from('owner_accounts').select('id').in('primary_owner_id', authUserIds)
    : { data: [] };
  const ownerAcctIds = (ownerAccts || []).map(a => a.id);

  // Venue
  const { data: venues } = ownerAcctIds.length
    ? await supabase.from('venues').select('id').in('owner_account_id', ownerAcctIds)
    : { data: [] };
  const venueIds = (venues || []).map(v => v.id);

  // Private events (from tenant)
  const { data: privateEvents } = tenantIds.length
    ? await supabase.from('event').select('id').in('tenant_id', tenantIds)
    : { data: [] };
  const privateEventIds = (privateEvents || []).map(e => e.id);

  // Promoter accounts
  const { data: promoAccts } = authUserIds.length
    ? await supabase.from('promoter_accounts').select('id').in('user_id', authUserIds)
    : { data: [] };
  const promoAcctIds = (promoAccts || []).map(p => p.id);

  // Public events
  const { data: pubEvents } = promoAcctIds.length
    ? await supabase.from('public_events').select('id').in('promoter_account_id', promoAcctIds)
    : { data: [] };
  const pubEventIds = (pubEvents || []).map(e => e.id);

  // Intake forms (clients)
  const { data: intakeForms } = authUserIds.length
    ? await supabase.from('intake_forms').select('id').in('user_id', authUserIds)
    : { data: [] };
  const intakeFormIds = (intakeForms || []).map(f => f.id);

  // Invoices
  const { data: invoices } = authUserIds.length
    ? await supabase.from('invoices').select('id').in('owner_id', authUserIds)
    : { data: [] };
  const invoiceIds = (invoices || []).map(i => i.id);

  // VIP sections
  const { data: vipSections } = pubEventIds.length
    ? await supabase.from('vip_sections').select('id').in('public_event_id', pubEventIds)
    : { data: [] };
  const vipSectionIds = (vipSections || []).map(s => s.id);

  console.log('');

  // ── Delete in order ──────────────────────────────────────────────────────────

  // Invoice items
  if (invoiceIds.length) await del('invoice_items', 'invoice_id', invoiceIds, 'invoice_items');

  // Invoices
  if (invoiceIds.length) await del('invoices', 'id', invoiceIds, 'invoices');

  // Intake forms
  if (intakeFormIds.length) await del('intake_forms', 'id', intakeFormIds, 'intake_forms');

  // VIP packages
  if (vipSectionIds.length) await del('vip_packages', 'section_id', vipSectionIds, 'vip_packages');

  // VIP sections
  if (pubEventIds.length) await del('vip_sections', 'public_event_id', pubEventIds, 'vip_sections');

  // Ticket tiers
  if (pubEventIds.length) await del('ticket_tiers', 'public_event_id', pubEventIds, 'ticket_tiers');

  // Public events
  if (pubEventIds.length) await del('public_events', 'id', pubEventIds, 'public_events');

  // Promoter accounts
  if (promoAcctIds.length) await del('promoter_accounts', 'id', promoAcctIds, 'promoter_accounts');

  // Bookings linked to private events
  if (privateEventIds.length) await del('bookings', 'event_id', privateEventIds, 'bookings');

  // Private events
  if (privateEventIds.length) await del('event', 'id', privateEventIds, 'events (private)');

  // Service items
  if (authUserIds.length) await del('service_items', 'owner_id', authUserIds[0] ? [authUserIds[0]] : [], 'service_items');

  // Venues
  if (venueIds.length) await del('venues', 'id', venueIds, 'venues');

  // Owner accounts
  if (ownerAcctIds.length) await del('owner_accounts', 'id', ownerAcctIds, 'owner_accounts');

  // Tenants
  if (tenantIds.length) await del('tenants', 'id', tenantIds, 'tenants');

  // Users table rows
  if (authUserIds.length) await del('users', 'id', authUserIds, 'users (public)');

  // Auth users (last)
  console.log('');
  for (const uid of authUserIds) {
    const email = users.find(u => u.id === uid)?.email;
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) warn(`auth.deleteUser ${email}: ${error.message}`);
    else ok(`Deleted auth user: ${email}`);
  }

  console.log('\n✨ Cleanup complete.\n');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
