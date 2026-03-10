const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const CATEGORIES = ['dj', 'decorator', 'planner_coordinator', 'furniture', 'photographer', 'musicians', 'mc_host'];
const CITIES = ['San Francisco', 'Oakland', 'Berkeley', 'San Jose', 'Palo Alto'];
const STATES = ['CA', 'CA', 'CA', 'CA', 'CA'];
const ZIP_CODES = ['94102', '94607', '94704', '95101', '94301'];

const VENDOR_TEMPLATES = {
  dj: {
    business_name: 'DJ Name',
    bio: 'Professional DJ with 10+ years experience. Specializing in weddings, corporate events, and parties.',
    hourly_rate: 150,
    flat_rate: 800,
  },
  decorator: {
    business_name: 'Floral & Event Decor',
    bio: 'Expert event decorator with stunning floral arrangements and venue transformation.',
    hourly_rate: 75,
    flat_rate: 500,
  },
  planner_coordinator: {
    business_name: 'Event Planner Co.',
    bio: 'Full-service event planning and coordination. We handle all the details!',
    hourly_rate: 100,
    flat_rate: 1200,
  },
  furniture: {
    business_name: 'Elegant Furnishings Rental',
    bio: 'Premium furniture and linens for any event. Tables, chairs, lighting, and more.',
    hourly_rate: 0,
    flat_rate: 300,
  },
  photographer: {
    business_name: 'Photography Studio',
    bio: 'Capturing your special moments with professional photography. Packages available.',
    hourly_rate: 200,
    flat_rate: 2000,
  },
  musicians: {
    business_name: 'Live Band Entertainment',
    bio: 'Professional musicians and live bands for weddings, corporate events, and celebrations.',
    hourly_rate: 250,
    flat_rate: 1500,
  },
  mc_host: {
    business_name: 'MC & Host Services',
    bio: 'Professional MC and host services. Guaranteed to energize your event!',
    hourly_rate: 120,
    flat_rate: 600,
  }
};

async function seedTestVendors() {
  console.log('🌱 Seeding test vendors...\n');

  try {
    // Get a test user to use as vendor
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users?.users || users.users.length === 0) {
      console.error('❌ No users found. Create a test user first.');
      process.exit(1);
    }

    const testUser = users.users[0];
    console.log(`Using user: ${testUser.email}\n`);

    // Create vendor accounts
    let createdCount = 0;
    for (let i = 0; i < CATEGORIES.length; i++) {
      const category = CATEGORIES[i];
      const template = VENDOR_TEMPLATES[category];
      const cityIndex = i % CITIES.length;

      const vendorData = {
        user_id: testUser.id,
        business_name: `${template.business_name} #${i + 1}`,
        category,
        bio: template.bio,
        city: CITIES[cityIndex],
        state: STATES[cityIndex],
        zip_code: ZIP_CODES[cityIndex],
        hourly_rate: template.hourly_rate || null,
        flat_rate: template.flat_rate || null,
        phone: `(415) 555-${String(1000 + i).slice(-4)}`,
        email: `vendor${i + 1}@test.com`,
        website: `https://example.com/vendor${i + 1}`,
        instagram: `@vendor${i + 1}`,
        is_active: true,
        is_verified: i % 2 === 0,
        // Add lat/lng (approximations for the cities)
        latitude: 37.7749 + (Math.random() - 0.5) * 0.5,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.5,
      };

      const { data, error } = await supabase
        .from('vendor_accounts')
        .insert([vendorData])
        .select();

      if (error) {
        console.log(`❌ Failed to create ${category} vendor: ${error.message}`);
      } else {
        console.log(`✅ Created ${category} vendor: ${data[0]?.business_name}`);
        createdCount++;

        // Add sample reviews if vendor created
        if (data[0]?.id) {
          const reviews = [
            { rating: 5, text: 'Excellent service! Highly recommend.' },
            { rating: 4, text: 'Great work, very professional.' },
            { rating: 5, text: 'Amazing! Will hire again.' }
          ];

          for (const review of reviews) {
            await supabase
              .from('vendor_reviews')
              .insert([{
                vendor_account_id: data[0].id,
                reviewer_user_id: testUser.id,
                rating: review.rating,
                review_text: review.text,
                is_public: true
              }])
              .catch(err => console.log(`  (Review insert info: ${err.message})`));
          }
        }
      }
    }

    console.log(`\n✨ Seeding complete! Created ${createdCount} test vendors.\n`);

    // Show search test
    console.log('🔍 Testing geo-search...');
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_vendors_by_location',
      {
        search_lat: 37.7749,
        search_lng: -122.4194,
        radius_miles: 100,
        filter_category: null
      }
    );

    if (searchError) {
      console.log(`❌ Search error: ${searchError.message}`);
    } else {
      console.log(`✅ Found ${searchResults?.length || 0} vendors within 100 miles\n`);
      if (searchResults && searchResults.length > 0) {
        console.log('Sample results:');
        searchResults.slice(0, 3).forEach(v => {
          console.log(`   • ${v.business_name} (${v.category}) - ${v.distance_miles} miles away`);
        });
      }
    }

    console.log('\n📝 You can now:');
    console.log('   1. Test API: GET http://localhost:3001/vendors/public');
    console.log('   2. Search: GET http://localhost:3001/vendors/search?lat=37.7749&lng=-122.4194&radiusMiles=30');
    console.log('   3. Frontend: http://localhost:3000/vendors\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedTestVendors();
