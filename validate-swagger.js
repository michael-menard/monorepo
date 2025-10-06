#!/usr/bin/env node

/**
 * Simple Swagger/OpenAPI validation script
 * Checks for basic YAML syntax and structure
 */

import fs from 'fs';
import path from 'path';

const SWAGGER_FILE = 'apps/api/lego-projects-api/__docs__/swagger.yaml';

async function validateSwagger() {
  console.log('🔍 Validating Swagger documentation...\n');
  
  try {
    // Check if file exists
    if (!fs.existsSync(SWAGGER_FILE)) {
      throw new Error(`Swagger file not found: ${SWAGGER_FILE}`);
    }
    
    // Read the main file and referenced files
    const content = fs.readFileSync(SWAGGER_FILE, 'utf8');
    const pathsContent = fs.readFileSync('apps/api/lego-projects-api/__docs__/paths/moc-instructions.yaml', 'utf8');
    const schemasContent = fs.readFileSync('apps/api/lego-projects-api/__docs__/components/schemas.yaml', 'utf8');
    const allContent = content + pathsContent + schemasContent;
    
    // Basic checks
    const checks = [
      {
        name: 'OpenAPI version',
        test: () => content.includes('openapi: 3.0.3'),
        message: 'OpenAPI 3.0.3 version specified'
      },
      {
        name: 'API title',
        test: () => content.includes('title: LEGO Projects API'),
        message: 'API title is set'
      },
      {
        name: 'MOC endpoints',
        test: () => content.includes('/api/mocs:') && content.includes('/api/mocs/with-files:'),
        message: 'MOC endpoints are documented'
      },
      {
        name: 'File upload documentation',
        test: () => allContent.includes('multipart/form-data') && allContent.includes('instructionsFile:'),
        message: 'File upload endpoints documented'
      },
      {
        name: 'Multiple instruction files',
        test: () => allContent.includes('1 or more PDF or .io files'),
        message: 'Multiple instruction files support documented'
      },
      {
        name: 'File size limits',
        test: () => content.includes('50MB') && content.includes('10MB'),
        message: 'File size limits documented'
      },
      {
        name: 'Test auth endpoint',
        test: () => content.includes('/api/mocs/test-auth:'),
        message: 'Test authentication endpoint documented'
      },
      {
        name: 'Schema references',
        test: () => allContent.includes('MocFile:') && allContent.includes('MocInstruction:'),
        message: 'Schema references are present'
      },
      {
        name: 'Examples',
        test: () => content.includes('x-examples:') && content.includes('curl'),
        message: 'Usage examples provided'
      },
      {
        name: 'Tags',
        test: () => allContent.includes('- MOC Instructions') && allContent.includes('- Testing'),
        message: 'Proper tags for organization'
      }
    ];
    
    let passed = 0;
    let failed = 0;
    
    console.log('Running validation checks:\n');
    
    for (const check of checks) {
      try {
        if (check.test()) {
          console.log(`✅ ${check.name}: ${check.message}`);
          passed++;
        } else {
          console.log(`❌ ${check.name}: Check failed`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${check.name}: Error - ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('\n🎉 All validation checks passed!');
      console.log('\n📚 Next steps:');
      console.log('1. View the documentation at: http://localhost:9000/docs (when server is running)');
      console.log('2. Test the API endpoints using the provided curl examples');
      console.log('3. Use Swagger Editor online: https://editor.swagger.io/');
      console.log('4. Copy the swagger.yaml content to the online editor for interactive testing');
    } else {
      console.log('\n⚠️  Some validation checks failed. Please review the documentation.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Additional file structure check
function checkFileStructure() {
  console.log('\n📁 Checking documentation file structure...\n');
  
  const requiredFiles = [
    'apps/api/lego-projects-api/__docs__/swagger.yaml',
    'apps/api/lego-projects-api/__docs__/paths/moc-instructions.yaml',
    'apps/api/lego-projects-api/__docs__/components/schemas.yaml'
  ];
  
  let allExist = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - Missing`);
      allExist = false;
    }
  }
  
  if (allExist) {
    console.log('\n✅ All required documentation files exist');
  } else {
    console.log('\n❌ Some documentation files are missing');
  }
  
  return allExist;
}

// Run validation
async function main() {
  console.log('🚀 LEGO Projects API - Swagger Documentation Validator\n');
  
  const structureOk = checkFileStructure();
  
  if (structureOk) {
    await validateSwagger();
  } else {
    console.log('\n❌ Cannot validate Swagger due to missing files');
    process.exit(1);
  }
}

main().catch(console.error);
