// Save this as api-test.js and run it with Node.js
// npm install axios before running

const axios = require('axios');

// You may need to adjust this URL to match your environment
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

async function testAPIEndpoints() {
  console.log('Testing API connectivity...');
  console.log(`Using API URL: ${API_URL}`);
  
  // Test health endpoint first
  try {
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('Health check response:', healthResponse.data);
    console.log('✅ Health endpoint is working!');
  } catch (error) {
    console.error('❌ Health endpoint failed:');
    logError(error);
    console.log('This indicates your server might not be running or the base URL is incorrect.');
    return;
  }
  
  // Test registration endpoint with a random user
  const username = `test_user_${Math.floor(Math.random() * 10000)}`;
  const email = `${username}@example.com`;
  
  try {
    console.log('\n2. Testing registration endpoint...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      username,
      email,
      password: 'TestPassword123',
      name: 'Test User'
    });
    console.log('Registration response status:', registerResponse.status);
    console.log('✅ Registration endpoint is working!');
    console.log(`Created user: ${username}`);
  } catch (error) {
    console.error('❌ Registration endpoint failed:');
    logError(error);
  }
  
  // Test login endpoint with the newly created user
  try {
    console.log('\n3. Testing login endpoint...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username,
      password: 'TestPassword123'
    });
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.data && loginResponse.data.token) {
      console.log('✅ Login endpoint is working!');
      console.log('Token received with length:', loginResponse.data.token.length);
      
      // Store token for further requests
      const token = loginResponse.data.token;
      
      // Test authenticated endpoint
      try {
        console.log('\n4. Testing authenticated endpoint (current user)...');
        const userResponse = await axios.get(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('User data response status:', userResponse.status);
        console.log('✅ Authenticated endpoint is working!');
      } catch (error) {
        console.error('❌ Authenticated endpoint failed:');
        logError(error);
      }
    } else {
      console.error('❌ Login endpoint returned success but no token was found in the response!');
      console.log('Response data:', loginResponse.data);
    }
  } catch (error) {
    console.error('❌ Login endpoint failed:');
    logError(error);
  }
  
  console.log('\nAPI Test Summary:');
  console.log('-----------------');
  console.log('If any tests failed, check:');
  console.log('1. Is your server running?');
  console.log('2. Is the API_URL correct?');
  console.log('3. Do you have CORS configured properly?');
  console.log('4. Are all required environment variables set on the server?');
  console.log('5. Check the server logs for more detailed error information.');
}

function logError(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log('Status:', error.response.status);
    console.log('Headers:', error.response.headers);
    console.log('Data:', error.response.data);
  } else if (error.request) {
    // The request was made but no response was received
    console.log('No response received. The server might be down or not accessible.');
    console.log('Request:', error.request);
  } else {
    // Something happened in setting up the request
    console.log('Error setting up request:', error.message);
  }
  
  if (error.config) {
    console.log('Request config:');
    console.log('- URL:', error.config.url);
    console.log('- Method:', error.config.method);
    console.log('- Headers:', error.config.headers);
    console.log('- Timeout:', error.config.timeout);
  }
}

testAPIEndpoints().catch(console.error);