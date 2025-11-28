async function testAddItem() {
  try {
    // Register a new user for testing
    console.log('Registering test user...');
    const registerResponse = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testitem@test.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'owner',
      }),
    });

    let token;
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('Registration successful!');
      console.log('User:', registerData.user.email);
      token = registerData.session.access_token;
    } else if (registerResponse.status === 400 || registerResponse.status === 401) {
      // User might already exist, try to login
      console.log('User already exists, trying to login...');
      const loginResponse = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testitem@test.com',
          password: 'Test123!',
        }),
      });

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        throw new Error(`Login failed: ${loginResponse.status} - ${errorText}`);
      }

      const loginData = await loginResponse.json();
      console.log('Login successful!');
      console.log('User:', loginData.user.email);
      token = loginData.access_token;
    } else {
      const errorText = await registerResponse.text();
      throw new Error(`Registration failed: ${registerResponse.status} - ${errorText}`);
    }

    // Now create a service item
    console.log('\nCreating service item...');
    const itemData = {
      name: 'Test DJ Service',
      description: 'Professional DJ service with equipment',
      category: 'misc',
      default_price: 500.00,
      is_active: true,
      sort_order: 10,
    };

    const createResponse = await fetch('http://localhost:3000/service-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(itemData),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Create failed: ${createResponse.status} - ${errorText}`);
    }

    const createdItem = await createResponse.json();
    console.log('Service item created successfully!');
    console.log('Item:', JSON.stringify(createdItem, null, 2));

    // Get all items to verify
    console.log('\nFetching all service items...');
    const getAllResponse = await fetch('http://localhost:3000/service-items', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!getAllResponse.ok) {
      throw new Error(`Get all failed: ${getAllResponse.status}`);
    }

    const allItems = await getAllResponse.json();
    console.log(`Found ${allItems.length} service items:`);
    allItems.forEach(item => {
      console.log(`- ${item.name} (${item.category}) - $${item.default_price}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testAddItem();
