const { Client } = require('pg');

async function addPromoterToEnum() {
  console.log('🚀 Adding promoter to user_role enum via direct PostgreSQL connection...\n');

  // Get connection string from Supabase
  // Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
  const connectionString = 'postgresql://postgres.unzfkcmmakyyjgruexpy:pP8zKd3bkHp5mJ9n@db.unzfkcmmakyyjgruexpy.supabase.co:5432/postgres';

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');

    // Step 1: Check current enum values
    console.log('1️⃣  Checking current enum values...');
    const checkResult = await client.query(`
      SELECT enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'user_role' 
      ORDER BY enumlabel;
    `);

    const enumValues = checkResult.rows.map(r => r.enumlabel);
    console.log('   Current values:', enumValues.join(', '));

    if (enumValues.includes('promoter')) {
      console.log('   ✅ Promoter already exists!\n');
    } else {
      console.log('   ❌ Promoter not found, adding...\n');

      // Step 2: Add promoter to enum
      console.log('2️⃣  Adding promoter to enum...');
      try {
        await client.query(`ALTER TYPE user_role ADD VALUE 'promoter';`);
        console.log('   ✅ Successfully added promoter\n');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('   ℹ️  Promoter already exists (concurrent add)\n');
        } else {
          throw err;
        }
      }
    }

    // Step 3: Verify
    console.log('3️⃣  Verifying enum...');
    const verifyResult = await client.query(`
      SELECT enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'user_role' 
      ORDER BY enumlabel;
    `);

    const finalValues = verifyResult.rows.map(r => r.enumlabel);
    console.log('   Final values:', finalValues.join(', '));

    if (finalValues.includes('promoter')) {
      console.log('\n✅ Promoter is now in the enum!\n');
      console.log('✨ You can now create promoter accounts from the homepage!\n');
    } else {
      console.log('\n❌ Promoter still not in enum\n');
    }

    await client.end();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

addPromoterToEnum();
