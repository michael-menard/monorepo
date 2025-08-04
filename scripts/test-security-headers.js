#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security headers to check
const requiredHeaders = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'X-XSS-Protection',
  'Referrer-Policy',
  'Permissions-Policy',
  'Content-Security-Policy'
];

// Expected values for security headers
const expectedValues = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': (value) => {
    return value && value.includes("default-src 'self'") && 
           value.includes("script-src 'self'") &&
           value.includes("object-src 'none'") &&
           value.includes("frame-src 'none'");
  }
};

async function testSecurityHeaders() {
  console.log('🔒 Testing Security Headers...\n');
  
  try {
    // Start the development server
    const devServer = spawn('pnpm', ['dev'], {
      cwd: join(__dirname, '../apps/web/lego-moc-instructions-app'),
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test headers using curl
    const testUrl = 'http://localhost:3000';
    const curlProcess = spawn('curl', ['-I', '-s', testUrl]);
    
    let output = '';
    curlProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    await new Promise((resolve, reject) => {
      curlProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`curl failed with code ${code}`));
        }
      });
    });
    
    // Parse headers
    const headers = {};
    output.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(': ');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(': ').trim();
      }
    });
    
    // Check each required header
    let allPassed = true;
    
    for (const header of requiredHeaders) {
      const value = headers[header];
      const expected = expectedValues[header];
      
      if (!value) {
        console.log(`❌ Missing header: ${header}`);
        allPassed = false;
        continue;
      }
      
      if (typeof expected === 'function') {
        if (expected(value)) {
          console.log(`✅ ${header}: ${value.substring(0, 100)}...`);
        } else {
          console.log(`❌ ${header}: Invalid value`);
          console.log(`   Expected: CSP with required directives`);
          console.log(`   Got: ${value}`);
          allPassed = false;
        }
      } else if (value === expected) {
        console.log(`✅ ${header}: ${value}`);
      } else {
        console.log(`❌ ${header}: Expected "${expected}", got "${value}"`);
        allPassed = false;
      }
    }
    
    // Additional security checks
    console.log('\n🔍 Additional Security Checks:');
    
    // Check for HTTPS in production-like environments
    if (process.env.NODE_ENV === 'production') {
      if (!headers['Strict-Transport-Security']) {
        console.log('⚠️  Missing HSTS header (recommended for production)');
      } else {
        console.log('✅ HSTS header present');
      }
    }
    
    // Check for secure cookie attributes
    const setCookieHeaders = Object.keys(headers).filter(key => 
      key.toLowerCase() === 'set-cookie'
    );
    
    if (setCookieHeaders.length > 0) {
      const hasSecureCookies = setCookieHeaders.some(key => 
        headers[key].includes('Secure') && headers[key].includes('HttpOnly')
      );
      
      if (hasSecureCookies) {
        console.log('✅ Secure cookie attributes present');
      } else {
        console.log('⚠️  Cookies should have Secure and HttpOnly attributes');
      }
    }
    
    // Kill the dev server
    devServer.kill();
    
    if (allPassed) {
      console.log('\n🎉 All security headers are properly configured!');
      process.exit(0);
    } else {
      console.log('\n❌ Some security headers are missing or incorrectly configured.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error testing security headers:', error.message);
    process.exit(1);
  }
}

// Run the test
testSecurityHeaders(); 