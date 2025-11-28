const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unzfkcmmakyyjgruexpy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testWithUserToken() {
  console.log('Testing service_items access with actual user token...\n');
  
  // First login to get a real user token
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyMDIsImV4cCI6MjA3ODgyNzIwMn0.5Ml1lqqyR33kAM8I9c6q_9Ly6Y1iSP2UK5d16eJahyM';
  const authClient = createClient(supabaseUrl, anonKey);
  
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: 'testitem@test.com',
    password: 'Test123!'
  });
  
  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  
  console.log('✅ Login successful');
  const token = authData.session.access_token;
  
  // Create client with user token
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
  
  // Try to query service_items
  console.log('\nTrying to SELECT from service_items...');
  const { data: selectData, error: selectError } = await userClient
    .from('service_items')
    .select('id, name')
    .limit(3);
  
  if (selectError) {
    console.log('❌ SELECT failed:', selectError.message);
    console.log('Code:', selectError.code);
  } else {
    console.log('✅ SELECT succeeded, found', selectData.length, 'items');
    selectData.forEach(item => console.log(`  - ${item.name}`));
  }
  
  // Try to insert
  console.log('\nTrying to INSERT into service_items...');
  const { data: insertData, error: insertError } = await userClient
    .from('service_items')
    .insert({
      name: 'RLS Test Item',
      description: 'Testing RLS with user token',
      category: 'misc',
      default_price: 99.99,
      is_active: true,
      sort_order: 100
    })
    .select();
  
  if (insertError) {
    console.log('❌ INSERT failed:', insertError.message);
    console.log('Code:', insertError.code);
    console.log('Details:', insertError.details);
  } else {
    console.log('✅ INSERT succeeded');
    console.log('Created item:', insertData[0].name);
  }
  
  // Try to update
  console.log('\nTrying to UPDATE in service_items...');
  const { data: updateData, error: updateError } = await userClient
    .from('service_items')
    .update({ default_price: 199.99 })
    .eq('name', 'RLS Test Item')
    .select();
  
  if (updateError) {
    console.log('❌ UPDATE failed:', updateError.message);
  } else {
    console.log('✅ UPDATE succeeded');
  }
  
  // Try to delete
  console.log('\nTrying to DELETE from service_items...');
  const { error: deleteError } = await userClient
    .from('service_items')
    .delete()
    .eq('name', 'RLS Test Item');
  
  if (deleteError) {
    console.log('❌ DELETE failed:', deleteError.message);
  } else {
    console.log('✅ DELETE succeeded');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:');
  console.log('='.repeat(50));
  if (selectError && insertError && updateError && deleteError) {
    console.log('❌ RLS is ENABLED and BLOCKING all operations');
    console.log('\n💡 Recommendation: Either:');
    console.log('   1. Keep using admin client (current solution) ✅');
    console.log('   2. Create RLS policies for authenticated users');
    console.log('   3. Disable RLS on service_items table');
  } else if (!selectError && !insertError && !updateError && !deleteError) {
    console.log('✅ RLS allows full access for authenticated users');
    console.log('\n💡 You can switch to using regular client with user tokens');
  } else {
    console.log('⚠️  RLS has partial restrictions:');
    console.log(`   SELECT: ${selectError ? '❌' : '✅'}`);
    console.log(`   INSERT: ${insertError ? '❌' : '✅'}`);
    console.log(`   UPDATE: ${updateError ? '❌' : '✅'}`);
    console.log(`   DELETE: ${deleteError ? '❌' : '✅'}`);
  }
}

testWithUserToken().catch(console.error);
