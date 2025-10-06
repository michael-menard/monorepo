#!/usr/bin/env node

/**
 * Simple test script to create a new MOC instruction (metadata only)
 * This tests the basic functionality without file uploads
 */

const API_BASE_URL = 'http://localhost:9000/api/mocs';

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }
    
    return { data, headers: response.headers };
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}

// Step 1: Get test authentication token
async function getTestToken() {
  console.log('🔑 Getting test authentication token...');
  
  const { data } = await makeRequest(`${API_BASE_URL}/test-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Test token generated for user:', data.userId);
  return data.token;
}

// Step 2: Create MOC with metadata only
async function createMocMetadataOnly(token) {
  console.log('\n📝 Creating MOC with metadata only...');
  
  const mocData = {
    title: 'My Awesome LEGO Castle',
    description: 'A medieval castle with working drawbridge and detailed interior',
    tags: ['castle', 'medieval', 'architecture', 'advanced']
  };
  
  const { data } = await makeRequest(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(mocData)
  });
  
  console.log('✅ MOC created successfully:', data.moc.id);
  console.log('   Title:', data.moc.title);
  console.log('   Description:', data.moc.description);
  console.log('   Tags:', data.moc.tags);
  
  return data.moc;
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting simple MOC creation test...\n');
    
    // Get authentication token
    const token = await getTestToken();
    
    // Create MOC with metadata only
    const moc = await createMocMetadataOnly(token);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\nAPI Summary:');
    console.log('✅ Metadata-only endpoint: POST /api/mocs');
    console.log('✅ File upload endpoint: POST /api/mocs/with-files');
    console.log('✅ Required for file uploads: 1+ instruction files (PDF or .io)');
    console.log('✅ Optional: parts lists (0-10), images (0-3)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main();

export {
  getTestToken,
  createMocMetadataOnly
};
