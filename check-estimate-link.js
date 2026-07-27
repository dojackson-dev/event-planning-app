const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EVENT_ID = '947020d6-61c7-42ce-9be7-09ca8dc61b9f';

async function run() {
  // 1. Get the event
  const { data: event, error: eventErr } = await supabase
    .from('event')
    .select('id, owner_id, intake_form_id, venue_id')
    .eq('id', EVENT_ID)
    .single();
  console.log('Event:', event, eventErr ? '  ERROR:' + eventErr.message : '');

  // 2. Get bookings linked to this event
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, event_id, owner_id')
    .eq('event_id', EVENT_ID);
  console.log('Bookings for event:', bookings);

  // 3. Get all estimates for this owner (using event.owner_id)
  if (event?.owner_id) {
    const { data: estimates } = await supabase
      .from('estimates')
      .select('id, status, event_id, booking_id, intake_form_id, owner_id')
      .eq('owner_id', event.owner_id)
      .order('created_at', { ascending: false });
    console.log('\nAll estimates for owner:');
    (estimates || []).forEach(e => {
      const matchEvent = e.event_id === EVENT_ID ? ' ✅ event_id match' : '';
      const matchIntake = event.intake_form_id && e.intake_form_id === event.intake_form_id ? ' ✅ intake_form_id match' : '';
      const matchBooking = (bookings || []).some(b => b.id === e.booking_id) ? ' ✅ booking_id match' : '';
      console.log(`  id=${e.id} status=${e.status} event_id=${e.event_id} booking_id=${e.booking_id} intake_form_id=${e.intake_form_id}${matchEvent}${matchIntake}${matchBooking}`);
    });
  }
}

run().catch(console.error);
