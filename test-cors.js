#!/usr/bin/env node

// Test script to verify CORS configuration
const fetch = require('node-fetch');

const testOrigins = [
  'https://extrahand.in',
  'https://www.extrahand.in',
  'http://localhost:3000',
  'https://extrahandbackend.llp.trizenventures.com'
];

const backendUrl = process.env.BACKEND_URL || 'https://extrahandbackend.llp.trizenventures.com';

async function testCors(origin) {
  try {
    console.log(`\n🧪 Testing CORS for origin: ${origin}`);
    
    // Test preflight request
    const preflightResponse = await fetch(`${backendUrl}/api/v1/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log(`   Preflight Status: ${preflightResponse.status}`);
    console.log(`   Preflight Headers:`, Object.fromEntries(preflightResponse.headers.entries()));
    
    // Test actual request
    const actualResponse = await fetch(`${backendUrl}/api/v1/health`, {
      method: 'GET',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Actual Status: ${actualResponse.status}`);
    console.log(`   Actual Headers:`, Object.fromEntries(actualResponse.headers.entries()));
    
    if (actualResponse.ok) {
      const data = await actualResponse.json();
      console.log(`   ✅ Success: ${data.status}`);
    } else {
      console.log(`   ❌ Failed: ${actualResponse.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log(`🚀 Testing CORS configuration for backend: ${backendUrl}`);
  
  for (const origin of testOrigins) {
    await testCors(origin);
  }
  
  console.log('\n✅ CORS testing completed');
}

runTests().catch(console.error);
