const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const adminClient = createClient(supabaseUrl, serviceKey);

async function checkCategories() {
  const { data, error } = await adminClient
    .from('service_items')
    .select('category')
    .limit(20);
  
  if (error) {
    console.log('Error:', error);
  } else {
    const categories = [...new Set(data.map(item => item.category))];
    console.log('Existing categories:', categories);
  }
}

checkCategories();
