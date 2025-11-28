const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testOwnerItems() {
  console.log('🔍 Testing owner-specific items...\n');
  
  // 1. Verify migration
  console.log('1️⃣ Checking table structure...');
  const { data: sampleItem } = await adminClient
    .from('service_items')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleItem) {
    const hasOwnerColumn = 'owner_id' in sampleItem;
    console.log(`✅ owner_id column: ${hasOwnerColumn ? 'EXISTS' : 'MISSING'}`);
  }
  
  // 2. Find or create a test owner user
  console.log('\n2️⃣ Setting up test owner user...');
  
  // Check if we have any owner users
  const { data: owners, error: ownerError } = await adminClient
    .from('users')
    .select('id, email, role, tenant_id')
    .eq('role', 'owner')
    .limit(1);
  
  let ownerId;
  if (owners && owners.length > 0) {
    ownerId = owners[0].id;
    console.log(`✅ Found existing owner: ${owners[0].email}`);
    console.log(`   Owner ID: ${ownerId}`);
    console.log(`   Tenant ID: ${owners[0].tenant_id}`);
  } else {
    console.log('⚠️  No owner users found in database');
    console.log('   Create an owner user first or update existing user role to "owner"');
    return;
  }
  
  // 3. Create a test item for this owner
  console.log('\n3️⃣ Creating owner-specific item...');
  
  const testItem = {
    name: 'Owner Exclusive Sound System',
    description: 'This item belongs to a specific owner/venue',
    category: 'sound_system',
    default_price: 1500,
    is_active: true,
    owner_id: ownerId
  };
  
  const { data: createdItem, error: createError } = await adminClient
    .from('service_items')
    .insert(testItem)
    .select()
    .single();
  
  if (createError) {
    console.log('❌ Failed to create item:', createError.message);
  } else {
    console.log('✅ Item created successfully!');
    console.log(`   Item ID: ${createdItem.id}`);
    console.log(`   Item Name: ${createdItem.name}`);
    console.log(`   Owner ID: ${createdItem.owner_id}`);
  }
  
  // 4. Query items by owner
  console.log('\n4️⃣ Querying owner-specific items...');
  
  const { data: ownerItems, error: queryError } = await adminClient
    .from('service_items')
    .select('id, name, owner_id')
    .eq('owner_id', ownerId);
  
  if (queryError) {
    console.log('❌ Query failed:', queryError.message);
  } else {
    console.log(`✅ Found ${ownerItems.length} items for this owner:`);
    ownerItems.forEach(item => {
      console.log(`   - ${item.name} (ID: ${item.id})`);
    });
  }
  
  // 5. Query global items
  console.log('\n5️⃣ Querying global items (owner_id IS NULL)...');
  
  const { data: globalItems, error: globalError } = await adminClient
    .from('service_items')
    .select('id, name, owner_id')
    .is('owner_id', null);
  
  if (globalError) {
    console.log('❌ Query failed:', globalError.message);
  } else {
    console.log(`✅ Found ${globalItems.length} global items`);
  }
  
  // 6. Summary
  console.log('\n📊 Summary:');
  const { count: totalCount } = await adminClient
    .from('service_items')
    .select('*', { count: 'exact', head: true });
  
  const { count: ownedCount } = await adminClient
    .from('service_items')
    .select('*', { count: 'exact', head: true })
    .not('owner_id', 'is', null);
  
  const { count: globalCount } = await adminClient
    .from('service_items')
    .select('*', { count: 'exact', head: true })
    .is('owner_id', null);
  
  console.log(`   Total items: ${totalCount}`);
  console.log(`   Owner-specific: ${ownedCount}`);
  console.log(`   Global items: ${globalCount}`);
  
  console.log('\n✅ Migration verification complete!');
  console.log('\nNext steps:');
  console.log('   1. Update ServiceItemsService to use regular client with auth context');
  console.log('   2. Ensure owner_id is set from auth.uid() on INSERT');
  console.log('   3. Test RLS policies with authenticated users');
}

testOwnerItems().catch(console.error);
