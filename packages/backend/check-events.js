const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEvents() {
  console.log('Checking events in database...\n');
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, date')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }
  
  console.log(`Found ${events.length} events:`);
  events.forEach(event => {
    console.log(`  - ID: ${event.id}`);
    console.log(`    Name: ${event.name}`);
    console.log(`    Date: ${event.date}`);
    console.log('');
  });
}

checkEvents().then(() => process.exit(0));
