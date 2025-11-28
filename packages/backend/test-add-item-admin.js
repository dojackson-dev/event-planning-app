const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAddItemDirectly() {
  console.log('Testing direct insert to service_items table with service role...\n');
  
  const itemData = {
    name: 'Test Direct Insert',
    description: 'Testing direct database insert',
    category: 'misc',
    default_price: 150.00,
    is_active: true,
    sort_order: 99,
  };

  const { data, error } = await supabase
    .from('service_items')
    .insert(itemData)
    .select()
    .single();

  if (error) {
    console.error('Error inserting item:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
  } else {
    console.log('Success! Item created:');
    console.log(JSON.stringify(data, null, 2));
    
    // Fetch all items to confirm
    const { data: allItems } = await supabase
      .from('service_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`\nLast 5 items in database:`);
    allItems.forEach(item => {
      console.log(`- ${item.name} (${item.category}) - $${item.default_price}`);
    });
  }
}

testAddItemDirectly().catch(console.error);
