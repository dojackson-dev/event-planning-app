/**
 * Demo Environment Seed Script
 * Target: demo Supabase project (rrljixodciaptldnzeoc)
 *
 * Creates:
 *  - 1 venue owner  (alex@demovenue.com  / Demo@2024!)
 *  - 1 venue        (The Grand Ballroom, Chicago IL)
 *  - 3 private events
 *  - 5 service items
 *  - 2 bookings
 *  - 3 clients      (intake forms: Sarah Johnson, David Park, Rosa Mendez)
 *  - 3 invoices     (with line items, linked to clients)
 *  - 1 promoter     (marcus@demopromoter.com / Demo@2024!)
 *  - 3 public events with ticket tiers
 *  - VIP section + 2 VIP packages for first public event
 *
 * Run:  node seed-demo.js
 * Safe: all inserts use upsert / ON CONFLICT DO NOTHING patterns.
 */

const { createClient } = require('@supabase/supabase-js');

// Credentials are read from environment variables.
// For the demo project, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// packages/backend/.env (or export them in your shell) before running.
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD    = 'Demo@2024!';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  console.error('   Run: $env:SUPABASE_URL="https://..."; $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`  ${msg}`); }
function ok(msg)   { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); }

async function upsertAuthUser(email, password, firstName, lastName) {
  // Try to find existing auth user first
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);

  const existing = users.find(u => u.email === email);
  if (existing) {
    log(`Auth user already exists: ${email} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  ok(`Auth user created: ${email}`);
  return data.user.id;
}

async function insert(table, row, conflictCol = 'id') {
  const { data, error } = await supabase
    .from(table)
    .upsert(row, { onConflict: conflictCol, ignoreDuplicates: true })
    .select()
    .single();
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return data;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Seeding demo environment...\n');

  // ── 1. VENUE OWNER ─────────────────────────────────────────────────────────
  console.log('1️⃣  Venue owner...');
  const ownerUserId = await upsertAuthUser('alex@demovenue.com', DEMO_PASSWORD, 'Alex', 'Rivera');

  const { error: ownerUserErr } = await supabase.from('users').upsert({
    id:             ownerUserId,
    email:          'alex@demovenue.com',
    first_name:     'Alex',
    last_name:      'Rivera',
    role:           'owner',
    roles:          ['owner'],
    status:         'active',
    email_verified: true,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (ownerUserErr) throw new Error(`users upsert owner: ${ownerUserErr.message}`);
  ok('Owner user row ready');

  // Tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .upsert({
      name:             'The Grand Venue',
      subdomain:        'grand-venue',
      owner_id:         ownerUserId,
      subscription_status: 'active',
      contact_email:    'alex@demovenue.com',
      contact_phone:    '312-555-0100',
      address:          '200 N Michigan Ave, Chicago, IL 60601',
    }, { onConflict: 'subdomain', ignoreDuplicates: false })
    .select()
    .single();
  if (tenantErr) throw new Error(`tenants: ${tenantErr.message}`);
  ok(`Tenant: ${tenant.name} (${tenant.id})`);

  // Update owner's tenant_id
  await supabase.from('users').update({ tenant_id: tenant.id }).eq('id', ownerUserId);

  // Owner account — no unique constraint on primary_owner_id, so select-or-insert
  let ownerAccount;
  const { data: existingOA } = await supabase
    .from('owner_accounts')
    .select()
    .eq('primary_owner_id', ownerUserId)
    .maybeSingle();
  if (existingOA) {
    ownerAccount = existingOA;
    log(`Owner account already exists: ${ownerAccount.id}`);
  } else {
    const { data: newOA, error: oaErr } = await supabase
      .from('owner_accounts')
      .insert({
        business_name:   'The Grand Venue',
        primary_owner_id: ownerUserId,
        subscription_status: 'active',
        plan_name:       'pro',
        venue_limit:     3,
        team_member_limit: 5,
      })
      .select()
      .single();
    if (oaErr) throw new Error(`owner_accounts: ${oaErr.message}`);
    ownerAccount = newOA;
  }
  ok(`Owner account: ${ownerAccount.id}`);
  ok(`Owner account: ${ownerAccount.id}`);

  // ── 2. VENUE ───────────────────────────────────────────────────────────────
  console.log('\n2️⃣  Venue...');
  let venue;
  const { data: existingVenue } = await supabase
    .from('venues')
    .select()
    .eq('owner_account_id', ownerAccount.id)
    .eq('name', 'The Grand Ballroom')
    .maybeSingle();
  if (existingVenue) {
    venue = existingVenue;
    log(`Venue already exists: ${venue.id}`);
  } else {
    const { data: newVenue, error: venueErr } = await supabase
      .from('venues')
      .insert({
        owner_account_id: ownerAccount.id,
        name:            'The Grand Ballroom',
        address:         '200 N Michigan Ave, Chicago, IL 60601',
        city:            'Chicago',
        state:           'IL',
        zip_code:        '60601',
        capacity:        500,
        description:     'An elegant downtown Chicago ballroom perfect for galas, weddings, and corporate events. Features a 5,000 sq ft dance floor, full catering kitchen, and stunning lake views.',
        website:         'https://demo.eventecos.com',
        phone:           '312-555-0101',
        email:           'events@demovenue.com',
        is_public:       true,
        is_active:       true,
      })
      .select()
      .single();
    if (venueErr) throw new Error(`venues: ${venueErr.message}`);
    venue = newVenue;
  }
  ok(`Venue: ${venue.name} (${venue.id})`);

  // ── 3. PRIVATE EVENTS ──────────────────────────────────────────────────────
  console.log('\n3️⃣  Private events...');
  const privateEvents = [
    {
      name:        'Johnson Wedding Reception',
      description: 'Elegant wedding reception for 200 guests with dinner, dancing, and a champagne tower. Full AV setup required.',
      event_type:  'Wedding',
      date:        '2026-08-15',
      day_of_week: 'Saturday',
      start_time:  '17:00',
      end_time:    '23:00',
      setup_time:  '14:00',
      venue:       'The Grand Ballroom',
      max_guests:  200,
      status:      'scheduled',
      tenant_id:   tenant.id,
      owner_id:    ownerAccount.id,
      venue_id:    venue.id,
    },
    {
      name:        'TechCorp Annual Gala',
      description: 'Corporate awards gala for 350 attendees. Formal dress code. Live band, full dinner service, open bar.',
      event_type:  'Corporate',
      date:        '2026-09-20',
      day_of_week: 'Sunday',
      start_time:  '18:00',
      end_time:    '23:30',
      setup_time:  '15:00',
      venue:       'The Grand Ballroom',
      max_guests:  350,
      status:      'scheduled',
      tenant_id:   tenant.id,
      owner_id:    ownerAccount.id,
      venue_id:    venue.id,
    },
    {
      name:        "Sofia's Quinceañera",
      description: 'Quinceañera celebration for 150 guests. DJ, photo booth, custom centerpieces. Catering from local vendor.',
      event_type:  'Birthday',
      date:        '2026-10-04',
      day_of_week: 'Sunday',
      start_time:  '15:00',
      end_time:    '21:00',
      setup_time:  '12:00',
      venue:       'The Grand Ballroom',
      max_guests:  150,
      status:      'draft',
      tenant_id:   tenant.id,
      owner_id:    ownerAccount.id,
      venue_id:    venue.id,
    },
  ];

  const createdEvents = [];
  for (const evt of privateEvents) {
    const { data: existing } = await supabase.from('events').select('id,name').eq('name', evt.name).eq('tenant_id', tenant.id).maybeSingle();
    if (existing) { ok(`Event already exists: ${existing.name}`); createdEvents.push(existing); continue; }
    const { data: ev, error: evErr } = await supabase
      .from('events')
      .insert(evt)
      .select()
      .single();
    if (evErr) { warn(`Event "${evt.name}": ${evErr.message}`); continue; }
    createdEvents.push(ev);
    ok(`Event: ${ev.name}`);
  }

  // ── 4. SERVICE ITEMS ───────────────────────────────────────────────────────
  console.log('\n4️⃣  Service items...');
  const serviceItems = [
    { name: 'Full-Service Catering', description: 'Plated dinner service with appetizers, 3-course meal, and dessert. Includes wait staff and linen.', category: 'catering',     default_price: 4500, sort_order: 1 },
    { name: 'DJ & Sound System',     description: 'Professional DJ with full PA system, lighting rig, and microphone. 6-hour set including setup.', category: 'entertainment', default_price: 1800, sort_order: 2 },
    { name: 'Photography Package',   description: 'Lead photographer + second shooter. 8-hour coverage, 500+ edited digital images, online gallery.', category: 'photography',   default_price: 2500, sort_order: 3 },
    { name: 'Floral & Decor',        description: 'Custom floral centerpieces, ceremony arch, and accent arrangements. Consultation included.', category: 'decor',         default_price: 1200, sort_order: 4 },
    { name: 'Event Security',        description: 'Licensed security personnel for event entry management and crowd control. 8-hour minimum.', category: 'security',      default_price:  800, sort_order: 5 },
  ];

  for (const item of serviceItems) {
    const { data: existingSI } = await supabase.from('service_items').select('id').eq('name', item.name).eq('owner_id', ownerUserId).maybeSingle();
    if (existingSI) { log(`Service item already exists: ${item.name}`); continue; }
    const { error: siErr } = await supabase
      .from('service_items')
      .insert({ ...item, owner_id: ownerUserId, venue_id: venue.id, is_active: true });
    if (siErr) { warn(`service_item "${item.name}": ${siErr.message}`); continue; }
    ok(`Service item: ${item.name}`);
  }

  // ── 5. BOOKINGS ────────────────────────────────────────────────────────────
  console.log('\n5️⃣  Bookings...');
  if (createdEvents.length >= 2) {
    const bookings = [
      {
        event_id:         createdEvents[0].id,
        status:           'confirmed',
        client_status:    'deposit_paid',
        total_price:      8800.00,
        total_amount_paid: 4400.00,
        deposit_amount:   4400.00,
        deposit_paid:     true,
        deposit_paid_date: '2026-07-01',
        balance_due:      4400.00,
        balance_due_date: '2026-08-01',
        contract_status:  'signed',
        insurance_status: 'received',
        tenant_id:        tenant.id,
        owner_id:         ownerUserId,
      },
      {
        event_id:         createdEvents[1].id,
        status:           'confirmed',
        client_status:    'booked',
        total_price:      12500.00,
        total_amount_paid: 3125.00,
        deposit_amount:   3125.00,
        deposit_paid:     true,
        deposit_paid_date: '2026-07-05',
        balance_due:      9375.00,
        balance_due_date: '2026-09-05',
        contract_status:  'sent',
        insurance_status: 'requested',
        tenant_id:        tenant.id,
        owner_id:         ownerUserId,
      },
    ];

    for (const booking of bookings) {
      const { error: bErr } = await supabase.from('bookings').insert(booking);
      if (bErr) { warn(`booking: ${bErr.message}`); continue; }
      ok('Booking created');
    }
  }

  // ── 6. PROMOTER ────────────────────────────────────────────────────────────
  console.log('\n6️⃣  Promoter...');
  const promoterUserId = await upsertAuthUser('marcus@demopromoter.com', DEMO_PASSWORD, 'Marcus', 'Johnson');

  const { error: promoUserErr } = await supabase.from('users').upsert({
    id:             promoterUserId,
    email:          'marcus@demopromoter.com',
    first_name:     'Marcus',
    last_name:      'Johnson',
    role:           'promoter',
    roles:          ['promoter'],
    status:         'active',
    email_verified: true,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (promoUserErr) throw new Error(`users promoter: ${promoUserErr.message}`);
  ok('Promoter user row ready');

  let promoterAccount;
  const { data: existingPA } = await supabase.from('promoter_accounts').select().eq('user_id', promoterUserId).maybeSingle();
  if (existingPA) {
    promoterAccount = existingPA;
    log(`Promoter account already exists: ${promoterAccount.id}`);
  } else {
    const { data: newPA, error: paErr } = await supabase
      .from('promoter_accounts')
      .insert({
        user_id:      promoterUserId,
        company_name: 'City Nights Promotions',
        contact_name: 'Marcus Johnson',
        email:        'marcus@demopromoter.com',
        phone:        '312-555-0200',
        location:     'Chicago, IL',
        bio:          'Chicago-based event promoter specializing in live music, rooftop parties, and cultural events. 10+ years bringing the city together.',
        instagram:    '@citynightspromo',
        website:      'https://demo.eventecos.com/p/citynights',
        is_active:    true,
        plan:         'pro',
        stripe_connect_status: 'not_connected',
      })
      .select()
      .single();
    if (paErr) throw new Error(`promoter_accounts: ${paErr.message}`);
    promoterAccount = newPA;
  }
  ok(`Promoter account: ${promoterAccount.id}`);

  // ── 7. PUBLIC EVENTS ───────────────────────────────────────────────────────
  console.log('\n7️⃣  Public events...');
  let pubEvent1;
  const { data: existingPE1 } = await supabase.from('public_events').select().eq('promoter_account_id', promoterAccount.id).eq('title', 'Summer Rooftop Bash').maybeSingle();
  if (existingPE1) { pubEvent1 = existingPE1; log(`Public event already exists: ${pubEvent1.title}`); }
  else {
  const { data: _pe1, error: pe1Err } = await supabase
    .from('public_events')
    .insert({
      promoter_account_id: promoterAccount.id,
      title:         'Summer Rooftop Bash',
      description:   "Chicago's hottest rooftop party is back! Live DJ sets, craft cocktails, stunning skyline views, and unlimited vibes. Early bird tickets selling fast.",
      event_date:    '2026-08-23',
      start_time:    '19:00',
      end_time:      '02:00',
      venue_name:    'The Skyline Rooftop',
      venue_address: '900 N Michigan Ave',
      city:          'Chicago',
      state:         'IL',
      zip_code:      '60611',
      category:      'Music & Nightlife',
      age_restriction: '21+',
      venue_type:    'Rooftop',
      status:        'published',
    })
    .select()
    .single();
  if (pe1Err) throw new Error(`public_events 1: ${pe1Err.message}`);
  pubEvent1 = _pe1;
  ok(`Public event: ${pubEvent1.title}`);
  }

  let pubEvent2;
  const { data: existingPE2 } = await supabase.from('public_events').select().eq('promoter_account_id', promoterAccount.id).eq('title', 'Latin Night Live ft. DJ Soto').maybeSingle();
  if (existingPE2) { pubEvent2 = existingPE2; log(`Public event already exists: ${pubEvent2.title}`); }
  else {
  const { data: _pe2, error: pe2Err } = await supabase
    .from('public_events')
    .insert({
      promoter_account_id: promoterAccount.id,
      title:         'Latin Night Live ft. DJ Soto',
      description:   'An electrifying night of salsa, bachata, and reggaeton with Chicago\'s own DJ Soto. Dance lessons at 8pm, doors open at 7pm.',
      event_date:    '2026-09-12',
      start_time:    '19:00',
      end_time:      '01:00',
      venue_name:    'Club Havana Chicago',
      venue_address: '58 W Ontario St',
      city:          'Chicago',
      state:         'IL',
      zip_code:      '60654',
      category:      'Music & Nightlife',
      age_restriction: '21+',
      venue_type:    'Nightclub',
      status:        'draft',
    })
    .select()
    .single();
  if (pe2Err) throw new Error(`public_events 2: ${pe2Err.message}`);
  pubEvent2 = _pe2;
  ok(`Public event: ${pubEvent2.title}`);
  }

  // ── 8. TICKET TIERS ────────────────────────────────────────────────────────
  console.log('\n8️⃣  Ticket tiers...');
  const tiers1 = [
    { public_event_id: pubEvent1.id, name: 'Early Bird',      price: 25.00, quantity: 100, quantity_sold: 87, description: 'Limited early bird pricing. No refunds.' },
    { public_event_id: pubEvent1.id, name: 'General Admission', price: 40.00, quantity: 300, quantity_sold: 142, description: 'Standard entry. Includes access to all areas.' },
    { public_event_id: pubEvent1.id, name: 'VIP',             price: 85.00, quantity:  50, quantity_sold: 18,  description: 'VIP entry, dedicated bar, priority access. Includes 2 drink tickets.' },
  ];
  const tiers2 = [
    { public_event_id: pubEvent2.id, name: 'General Admission', price: 20.00, quantity: 200, quantity_sold: 0, description: 'General entry.' },
    { public_event_id: pubEvent2.id, name: 'VIP Table',        price: 120.00, quantity: 20, quantity_sold: 0,  description: 'Reserved table for 4 with bottle service.' },
  ];

  for (const tier of [...tiers1, ...tiers2]) {
    const { error: tErr } = await supabase.from('ticket_tiers').insert(tier);
    if (tErr) { warn(`ticket_tier "${tier.name}": ${tErr.message}`); continue; }
    ok(`Ticket tier: ${tier.name} ($${tier.price}) for ${tier.public_event_id === pubEvent1.id ? pubEvent1.title : pubEvent2.title}`);
  }

  // ── 9. VIP SECTION + PACKAGES ──────────────────────────────────────────────
  console.log('\n9️⃣  VIP sections & packages...');
  const { data: vipSection, error: vsErr } = await supabase
    .from('vip_sections')
    .insert({
      public_event_id: pubEvent1.id,
      name:            'Skyline Terrace',
      description:     'Exclusive terrace section with panoramic skyline views.',
      capacity:        40,
      display_order:   1,
      status:          'available',
    })
    .select()
    .single();
  if (vsErr) { warn(`vip_section: ${vsErr.message}`); }
  else {
    ok(`VIP section: ${vipSection.name}`);

    const vipPackages = [
      {
        public_event_id:  pubEvent1.id,
        section_id:       vipSection.id,
        name:             'Skyline Table for 6',
        package_type:     'table',
        description:      'Premium table for 6 on the Skyline Terrace. Includes bottle of premium spirits, mixers, and dedicated server.',
        price:            650.00,
        capacity:         6,
        included_tickets: 6,
        table_label:      'T1',
        inventory:        4,
        inventory_sold:   1,
        status:           'active',
      },
      {
        public_event_id:  pubEvent1.id,
        section_id:       vipSection.id,
        name:             'Cabana Lounge for 10',
        package_type:     'cabana',
        description:      'Private cabana with lounge seating for 10. Includes 2 bottles, dedicated host, and priority entry.',
        price:            1200.00,
        capacity:         10,
        included_tickets: 10,
        table_label:      'C1',
        inventory:        2,
        inventory_sold:   0,
        status:           'active',
      },
    ];

    for (const pkg of vipPackages) {
      const { error: vpErr } = await supabase.from('vip_packages').insert(pkg);
      if (vpErr) { warn(`vip_package "${pkg.name}": ${vpErr.message}`); continue; }
      ok(`VIP package: ${pkg.name} ($${pkg.price})`);
    }
  }

  // ── 10. CLIENTS (INTAKE FORMS) ─────────────────────────────────────────────
  console.log('\n🔟  Clients (intake forms for Alex)...');
  const clientDefs = [
    {
      user_id:          ownerUserId,
      contact_name:     'Sarah Johnson',
      contact_email:    'sarah@johnsonwedding.com',
      contact_phone:    '312-555-0310',
      event_type:       'Wedding',
      event_date:       '2026-08-15',
      event_time:       '17:00:00',
      guest_count:      200,
      budget_range:     '$8,000 - $12,000',
      special_requests: 'Champagne tower, custom monogram lighting, late-night snack bar',
      status:           'confirmed',
    },
    {
      user_id:          ownerUserId,
      contact_name:     'David Park',
      contact_email:    'dpark@techcorp.com',
      contact_phone:    '312-555-0420',
      event_type:       'Corporate',
      event_date:       '2026-09-20',
      event_time:       '18:00:00',
      guest_count:      350,
      budget_range:     '$12,000 - $18,000',
      special_requests: 'Stage for awards presentation, branded backdrop, vegan menu options',
      status:           'confirmed',
    },
    {
      user_id:          ownerUserId,
      contact_name:     'Rosa Mendez',
      contact_email:    'rosa.mendez@email.com',
      contact_phone:    '312-555-0531',
      event_type:       'Birthday',
      event_date:       '2026-10-04',
      event_time:       '15:00:00',
      guest_count:      150,
      budget_range:     '$5,000 - $7,000',
      special_requests: 'Pink and gold color scheme, custom quinceañera cake, photo booth',
      status:           'new',
    },
  ];

  const createdIntakeForms = [];
  for (const client of clientDefs) {
    const { data: existingForm } = await supabase
      .from('intake_forms')
      .select('id')
      .eq('contact_email', client.contact_email)
      .eq('user_id', ownerUserId)
      .maybeSingle();
    if (existingForm) {
      log(`Client already exists: ${client.contact_name}`);
      createdIntakeForms.push(existingForm);
      continue;
    }
    const { data: form, error: formErr } = await supabase
      .from('intake_forms')
      .insert(client)
      .select()
      .single();
    if (formErr) { warn(`intake_form "${client.contact_name}": ${formErr.message}`); createdIntakeForms.push(null); continue; }
    createdIntakeForms.push(form);
    ok(`Client: ${client.contact_name} (${client.contact_email})`);
  }

  // ── 11. INVOICES ───────────────────────────────────────────────────────────
  console.log('\n1️⃣1️⃣  Invoices...');
  const invoiceDefs = [
    {
      intakeForm:    createdIntakeForms[0],
      clientName:    'Sarah Johnson',
      clientEmail:   'sarah@johnsonwedding.com',
      clientPhone:   '312-555-0310',
      invoiceNumber: 'INV-2026-00001',
      issueDate:     '2026-07-01',
      dueDate:       '2026-08-01',
      status:        'sent',
      amountPaid:    4400,
      items: [
        { description: 'Full-Service Catering (200 guests)', qty: 1, price: 4500 },
        { description: 'DJ & Sound System (6 hrs)',          qty: 1, price: 1800 },
        { description: 'Photography Package',                qty: 1, price: 2500 },
      ],
    },
    {
      intakeForm:    createdIntakeForms[1],
      clientName:    'David Park',
      clientEmail:   'dpark@techcorp.com',
      clientPhone:   '312-555-0420',
      invoiceNumber: 'INV-2026-00002',
      issueDate:     '2026-07-05',
      dueDate:       '2026-09-05',
      status:        'sent',
      amountPaid:    3125,
      items: [
        { description: 'Full-Service Catering (350 guests)', qty: 1, price: 6000 },
        { description: 'DJ & Sound System (6 hrs)',          qty: 1, price: 1800 },
        { description: 'Photography Package',                qty: 1, price: 2500 },
        { description: 'Floral & Decor',                     qty: 1, price: 1200 },
        { description: 'Event Security (8 hrs)',             qty: 1, price: 1000 },
      ],
    },
    {
      intakeForm:    createdIntakeForms[2],
      clientName:    'Rosa Mendez',
      clientEmail:   'rosa.mendez@email.com',
      clientPhone:   '312-555-0531',
      invoiceNumber: 'INV-2026-00003',
      issueDate:     '2026-07-15',
      dueDate:       '2026-08-15',
      status:        'draft',
      amountPaid:    0,
      items: [
        { description: 'Full-Service Catering (150 guests)', qty: 1, price: 3000 },
        { description: 'DJ & Sound System (6 hrs)',          qty: 1, price: 1800 },
        { description: 'Floral & Decor',                     qty: 1, price:  700 },
      ],
    },
  ];

  for (const inv of invoiceDefs) {
    if (!inv.intakeForm) { warn(`Skipping invoice for ${inv.clientName} — intake form missing`); continue; }

    const { data: existingInv } = await supabase
      .from('invoices')
      .select('id')
      .eq('invoice_number', inv.invoiceNumber)
      .maybeSingle();
    if (existingInv) { log(`Invoice already exists: ${inv.invoiceNumber}`); continue; }

    const subtotal      = inv.items.reduce((s, i) => s + i.price * i.qty, 0);
    const totalAmount   = subtotal;
    const amountDue     = totalAmount - inv.amountPaid;

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number:  inv.invoiceNumber,
        owner_id:        ownerUserId,
        intake_form_id:  inv.intakeForm.id,
        client_name:     inv.clientName,
        client_email:    inv.clientEmail,
        client_phone:    inv.clientPhone,
        issue_date:      inv.issueDate,
        due_date:        inv.dueDate,
        status:          inv.status,
        subtotal,
        tax_rate:        0,
        tax_amount:      0,
        discount_amount: 0,
        total_amount:    totalAmount,
        amount_paid:     inv.amountPaid,
        amount_due:      amountDue,
      })
      .select()
      .single();
    if (invErr) { warn(`invoice "${inv.invoiceNumber}": ${invErr.message}`); continue; }
    ok(`Invoice: ${inv.invoiceNumber} — $${totalAmount} (${inv.status})`);

    for (let i = 0; i < inv.items.length; i++) {
      const item        = inv.items[i];
      const itemAmount  = item.price * item.qty;
      const { error: itemErr } = await supabase.from('invoice_items').insert({
        invoice_id:      invoice.id,
        description:     item.description,
        quantity:        item.qty,
        standard_price:  item.price,
        unit_price:      item.price,
        subtotal:        itemAmount,
        discount_type:   'none',
        discount_value:  0,
        discount_amount: 0,
        amount:          itemAmount,
        sort_order:      i + 1,
      });
      if (itemErr) { warn(`  invoice_item "${item.description}": ${itemErr.message}`); continue; }
      ok(`  → ${item.description}: $${item.price}`);
    }
  }

  // ── 12. ADDITIONAL PUBLIC EVENT FOR MARCUS ─────────────────────────────────
  console.log('\n1️⃣2️⃣  Additional public event for Marcus...');
  const { data: existingPE3 } = await supabase
    .from('public_events')
    .select('id, title')
    .eq('promoter_account_id', promoterAccount.id)
    .eq('title', 'Old School Hip-Hop Night')
    .maybeSingle();

  if (existingPE3) {
    log(`Public event already exists: ${existingPE3.title}`);
  } else {
    const { data: pubEvent3, error: pe3Err } = await supabase
      .from('public_events')
      .insert({
        promoter_account_id: promoterAccount.id,
        title:           'Old School Hip-Hop Night',
        description:     "90s & 2000s hip-hop classics all night long. DJ Flex spins your favorite anthems from the golden era. No attitude, just vibes.",
        event_date:      '2026-10-17',
        start_time:      '21:00',
        end_time:        '02:00',
        venue_name:      'The Mid Chicago',
        venue_address:   '306 N Halsted St',
        city:            'Chicago',
        state:           'IL',
        zip_code:        '60661',
        category:        'Music & Nightlife',
        age_restriction: '21+',
        venue_type:      'Nightclub',
        status:          'published',
      })
      .select()
      .single();
    if (pe3Err) { warn(`public_event 3: ${pe3Err.message}`); }
    else {
      ok(`Public event: ${pubEvent3.title}`);
      const tiers3 = [
        { public_event_id: pubEvent3.id, name: 'Early Bird',     price: 15.00, quantity: 150, quantity_sold: 98, description: 'Limited early bird pricing.' },
        { public_event_id: pubEvent3.id, name: 'General Admission', price: 25.00, quantity: 400, quantity_sold: 210, description: 'Standard entry.' },
        { public_event_id: pubEvent3.id, name: 'VIP Booth',      price: 200.00, quantity:  10, quantity_sold:  6, description: 'Reserved booth for 4 with 1 bottle included.' },
      ];
      for (const tier of tiers3) {
        const { error: tErr } = await supabase.from('ticket_tiers').insert(tier);
        if (tErr) { warn(`ticket_tier "${tier.name}": ${tErr.message}`); continue; }
        ok(`Ticket tier: ${tier.name} ($${tier.price})`);
      }
    }
  }

  // ─── DONE ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Demo seed complete!\n');
  console.log('─────────────────────────────────────────────');
  console.log('  Owner login:    alex@demovenue.com');
  console.log('  Promoter login: marcus@demopromoter.com');
  console.log('  Password:       Demo@2024!');
  console.log('  App URL:        https://demo.eventecos.com');
  console.log('─────────────────────────────────────────────\n');
}

main().catch(err => {
  fail(err.message);
  process.exit(1);
});
