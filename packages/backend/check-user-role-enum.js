const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://unzfkcmmakyyjgruexpy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuemZrY21tYWt5eWpncnVleHB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1MTIwMiwiZXhwIjoyMDc4ODI3MjAyfQ.liPZTtijwOG1szjJ-Y5NCRxC7mu0hRSzKQhTnV7LuZI'
);

async function checkAndFixEnum() {
  try {
    console.log('🔍 Checking user_role enum values...\n');

    // Check current enum values
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT enumlabel FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role' 
        ORDER BY enumlabel;`
    });

    if (error) {
      console.log('❌ Could not query enum:', error.message);
      console.log('\n📝 Checking user table to see what roles exist...');
      
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('role')
        .limit(5);
      
      if (!userError) {
        const roles = [...new Set(users.map(u => u.role))];
        console.log('Current user roles in database:', roles);
      }
      
      throw new Error('Cannot verify enum - you may need to add promoter manually');
    }

    const enumValues = data?.map(e => e.enumlabel) || [];
    console.log('Current user_role enum values:');
    enumValues.forEach(v => console.log(`  • ${v}`));
    
    const hasPromoter = enumValues.includes('promoter');
    console.log(`\nPromoter in enum: ${hasPromoter ? '✅ YES' : '❌ NO'}`);

    if (!hasPromoter) {
      console.log('\n⚠️  Adding promoter to enum...');
      
      const { error: addError } = await supabase.rpc('exec_sql', {
        sql_query: `ALTER TYPE user_role ADD VALUE 'promoter';`
      });

      if (addError) {
        if (addError.message.includes('already exists')) {
          console.log('✅ Promoter already exists (race condition)');
        } else {
          console.error('❌ Error adding promoter:', addError.message);
          throw addError;
        }
      } else {
        console.log('✅ Successfully added promoter to enum\n');
      }
    }

    // Verify it was added
    const { data: updated, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT enumlabel FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role' 
        ORDER BY enumlabel;`
    });

    if (!verifyError) {
      const finalValues = updated?.map(e => e.enumlabel) || [];
      console.log('\nFinal user_role enum values:');
      finalValues.forEach(v => console.log(`  • ${v}`));
    }

    console.log('\n✨ Enum verification complete!\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAndFixEnum();
