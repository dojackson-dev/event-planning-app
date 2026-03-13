const http = require('http');

const API_URL = 'http://localhost:3001';
let testsPassed = 0;
let testsFailed = 0;

// Helper to make API calls
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('🧪 Testing Vendors API Endpoints\n');

  // Test 1: Categories endpoint
  await test('GET /vendors/categories', async () => {
    const res = await makeRequest('GET', '/vendors/categories');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected array response');
    if (res.data.length === 0) throw new Error('Expected categories list');
  });

  // Test 2: Public vendors (no auth)
  await test('GET /vendors/public', async () => {
    const res = await makeRequest('GET', '/vendors/public');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected array response');
  });

  // Test 3: Search with params
  await test('GET /vendors/search (with lat/lng)', async () => {
    const res = await makeRequest('GET', '/vendors/search?lat=37.7749&lng=-122.4194&radiusMiles=30');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.vendors || !res.data.venues) throw new Error('Expected {vendors, venues}');
  });

  // Test 4: Search with category filter
  await test('GET /vendors/search (with category filter)', async () => {
    const res = await makeRequest('GET', '/vendors/search?lat=37.7749&lng=-122.4194&radiusMiles=30&category=dj');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.vendors) throw new Error('Expected vendors in response');
  });

  // Test 5: Vendor signup (will fail without valid email/password but should reach endpoint)
  await test('POST /auth/flow/vendor/signup (endpoint exists)', async () => {
    const res = await makeRequest('POST', '/auth/flow/vendor/signup', {
      email: 'test@vendor.com',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Vendor'
    });
    if (res.status === 404) throw new Error('Endpoint not found');
    // Could be 200, 400, or other - just checking it exists
  });

  // Test 6: Vendor login (will fail without valid credentials but should reach endpoint)
  await test('POST /auth/flow/vendor/login (endpoint exists)', async () => {
    const res = await makeRequest('POST', '/auth/flow/vendor/login', {
      email: 'test@vendor.com',
      password: 'Test123!@#'
    });
    if (res.status === 404) throw new Error('Endpoint not found');
    // Could be 200, 400, 401, etc. - just checking it exists
  });

  // Test 7: Get vendor by ID (with fake ID, should return 404 or error but not endpoint not found)
  await test('GET /vendors/:id (endpoint exists)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await makeRequest('GET', `/vendors/${fakeId}`);
    if (res.status === 404 && res.data?.message?.includes('route')) {
      throw new Error('Endpoint not found');
    }
    // Expected to return 404 for not found vendor, that's fine
  });

  // Test 8: Get vendor reviews (endpoint exists)
  await test('GET /vendors/:id/reviews (endpoint exists)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await makeRequest('GET', `/vendors/${fakeId}/reviews`);
    if (res.status === 404 && res.data?.message?.includes('route')) {
      throw new Error('Endpoint not found');
    }
    // Expected to return 404 for not found vendor
  });

  // Summary
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`\n${testsFailed === 0 ? '✨ All tests passed!' : '⚠️  Some tests failed'}\n`);

  if (testsFailed === 0) {
    console.log('📝 Next steps:');
    console.log('   1. Run: node seed-test-vendors.js');
    console.log('   2. Visit: http://localhost:3000/vendors\n');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('❌ Test runner error:', err.message);
  console.log('\n⚠️  Make sure backend is running on localhost:3001');
  console.log('   npm run start:dev (in packages/backend)\n');
  process.exit(1);
});
