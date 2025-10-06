#!/usr/bin/env node

/**
 * Test script to create a new MOC instruction
 * 
 * This script demonstrates how to:
 * 1. Get a test authentication token
 * 2. Create a MOC instruction with metadata only
 * 3. Create a MOC instruction with files (instructions file + optional parts lists + optional images)
 */

import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

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

// Step 3: Create MOC with files (requires actual files)
async function createMocWithFiles(token) {
  console.log('\n📁 Creating MOC with files...');
  
  // Create form data for multipart upload
  const form = new FormData();
  
  // Add metadata
  form.append('title', 'LEGO Spaceship with Instructions');
  form.append('description', 'A detailed spaceship MOC with complete building instructions');
  form.append('tags', JSON.stringify(['spaceship', 'sci-fi', 'intermediate']));
  
  // Note: In a real scenario, you would add actual files like this:
  // Multiple instruction files (1 or more required)
  // form.append('instructionsFile', fs.createReadStream('path/to/instructions-part1.pdf'));
  // form.append('instructionsFile', fs.createReadStream('path/to/instructions-part2.pdf'));
  // form.append('instructionsFile', fs.createReadStream('path/to/instructions.io'));
  // form.append('partsLists', fs.createReadStream('path/to/parts-list.csv'));
  // form.append('images', fs.createReadStream('path/to/image1.jpg'));
  // form.append('images', fs.createReadStream('path/to/image2.jpg'));

  console.log('⚠️  File upload requires actual files. Skipping for demo.');
  console.log('   To test with files, add:');
  console.log('   - instructionsFile: 1 or more PDF or .io files (required)');
  console.log('   - partsLists: CSV, XML, JSON, or PDF files (optional, 0-10)');
  console.log('   - images: JPEG, PNG, WebP files (optional, 0-3)');
  
  return null;
  
  // Uncomment below when you have actual files to test:
  /*
  const { data } = await makeRequest(`${API_BASE_URL}/with-files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  });
  
  console.log('✅ MOC with files created successfully:', data.moc.id);
  console.log('   Files uploaded:', data.moc.files?.length || 0);
  
  return data.moc;
  */
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting MOC creation test...\n');
    
    // Get authentication token
    const token = await getTestToken();
    
    // Create MOC with metadata only
    const moc1 = await createMocMetadataOnly(token);
    
    // Attempt to create MOC with files (demo only)
    const moc2 = await createMocWithFiles(token);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Use the /api/mocs endpoint for metadata-only MOCs');
    console.log('2. Use the /api/mocs/with-files endpoint for MOCs with file uploads');
    console.log('3. Required files: instructionsFile (1 or more PDF or .io files)');
    console.log('4. Optional files: partsLists (0-10), images (0-3)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main();

export {
  getTestToken,
  createMocMetadataOnly,
  createMocWithFiles
};
