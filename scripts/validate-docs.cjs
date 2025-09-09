#!/usr/bin/env node

/**
 * Documentation Validation Script
 * Validates that all LEGO API documentation is complete and consistent
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating LEGO Projects API Documentation...\n');

const requiredFiles = [
  // HTTP Test Files
  '__http__/lego-projects-api.http',
  '__http__/README.md',
  '__http__/test-files/README.md',
  
  // API Documentation
  'apps/api/lego-projects-api/__docs__/swagger.yaml',
  'apps/api/lego-projects-api/README.md',
  '__docs__/API_DOCUMENTATION.md',
  
  // Infrastructure
  'test-infrastructure.sh',
  'docker-compose-dev.yml'
];

let allValid = true;

// Check required files exist
console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
    allValid = false;
  }
});

// Check HTTP file contains key endpoints
console.log('\n🌐 Validating HTTP test file...');
const httpFile = '__http__/lego-projects-api.http';
if (fs.existsSync(httpFile)) {
  const content = fs.readFileSync(httpFile, 'utf8');
  
  const endpoints = [
    'GET {{baseUrl}}/',
    'GET {{baseUrl}}/api/csrf',
    'GET {{baseUrl}}/api/users/{{userId}}',
    'POST {{baseUrl}}/api/images',
    'GET {{baseUrl}}/api/gallery',
    'POST {{baseUrl}}/api/mocs',
    'GET {{baseUrl}}/api/mocs/search',
    'GET {{baseUrl}}/api/wishlist',
    'POST {{baseUrl}}/api/wishlist/reorder'
  ];
  
  endpoints.forEach(endpoint => {
    if (content.includes(endpoint)) {
      console.log(`✅ ${endpoint}`);
    } else {
      console.log(`❌ Missing endpoint: ${endpoint}`);
      allValid = false;
    }
  });
} else {
  allValid = false;
}

// Check Swagger file has correct server URL
console.log('\n📋 Validating Swagger documentation...');
const swaggerFile = 'apps/api/lego-projects-api/__docs__/swagger.yaml';
if (fs.existsSync(swaggerFile)) {
  const content = fs.readFileSync(swaggerFile, 'utf8');
  
  if (content.includes('http://localhost:3000')) {
    console.log('✅ Swagger server URL configured for native development');
  } else {
    console.log('❌ Swagger server URL not configured correctly');
    allValid = false;
  }
  
  if (content.includes('Native development server')) {
    console.log('✅ Swagger server description mentions native development');
  } else {
    console.log('❌ Swagger server description missing native development info');
    allValid = false;
  }
} else {
  allValid = false;
}

// Check README has native setup instructions
console.log('\n📖 Validating README documentation...');
const readmeFile = 'apps/api/lego-projects-api/README.md';
if (fs.existsSync(readmeFile)) {
  const content = fs.readFileSync(readmeFile, 'utf8');
  
  const requirements = [
    'Native Development Setup',
    'docker-compose-dev.yml',
    'pnpm dev',
    'http://localhost:3000'
  ];
  
  requirements.forEach(req => {
    if (content.includes(req)) {
      console.log(`✅ README includes: ${req}`);
    } else {
      console.log(`❌ README missing: ${req}`);
      allValid = false;
    }
  });
} else {
  allValid = false;
}

// Final validation summary
console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('🎉 All documentation validation checks passed!');
  console.log('\n✅ LEGO Projects API documentation is complete and ready for native development');
  console.log('\nNext steps for developers:');
  console.log('1. Start infrastructure: docker-compose -f docker-compose-dev.yml up -d');
  console.log('2. Navigate to API: cd apps/api/lego-projects-api');
  console.log('3. Install deps: pnpm install');
  console.log('4. Setup DB: pnpm drizzle-kit push');
  console.log('5. Start API: pnpm dev');
  console.log('6. Test with: __http__/lego-projects-api.http');
  process.exit(0);
} else {
  console.log('❌ Documentation validation failed!');
  console.log('\nPlease fix the issues above before completing the task.');
  process.exit(1);
}
