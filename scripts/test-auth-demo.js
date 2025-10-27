#!/usr/bin/env node

/**
 * Auth Service Demo Script
 *
 * This script demonstrates how to interact with the Auth Service API
 * for testing and development purposes.
 *
 * Usage:
 *   node scripts/test-auth-demo.js
 *
 * Prerequisites:
 *   - Auth service running on localhost:5000
 *   - MongoDB running (either Docker or native)
 */

const https = require('https')
const http = require('http')

const BASE_URL = 'http://localhost:5000'
const API_BASE = `${BASE_URL}/api/auth`

// Test user data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'SecureTestPassword123!',
  name: 'Test User Demo',
}

let csrfToken = ''
let authCookie = ''

/**
 * Make HTTP request with proper error handling
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        // Extract cookies if present
        if (res.headers['set-cookie']) {
          res.headers['set-cookie'].forEach(cookie => {
            if (cookie.startsWith('token=')) {
              authCookie = cookie.split(';')[0]
            }
          })
        }

        try {
          const jsonData = JSON.parse(data)
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          })
        }
      })
    })

    req.on('error', err => {
      reject(err)
    })

    if (postData) {
      req.write(postData)
    }

    req.end()
  })
}

/**
 * Test service health
 */
async function testHealth() {
  console.log('🔍 Testing service health...')

  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/health',
      method: 'GET',
    }

    const response = await makeRequest(options)

    if (response.statusCode === 200) {
      console.log('✅ Service is healthy')
      console.log(`   Response: ${JSON.stringify(response.data)}`)
      return true
    } else {
      console.log(`❌ Health check failed: ${response.statusCode}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`)
    return false
  }
}

/**
 * Get CSRF token
 */
async function getCSRFToken() {
  console.log('\n🔐 Getting CSRF token...')

  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/csrf',
      method: 'GET',
    }

    const response = await makeRequest(options)

    if (response.statusCode === 200 && response.data.token) {
      csrfToken = response.data.token
      console.log('✅ CSRF token obtained')
      return true
    } else {
      console.log(`❌ Failed to get CSRF token: ${response.statusCode}`)
      return false
    }
  } catch (error) {
    console.log(`❌ CSRF token error: ${error.message}`)
    return false
  }
}

/**
 * Register a new user
 */
async function registerUser() {
  console.log('\n👤 Registering user...')
  console.log(`   Email: ${testUser.email}`)

  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/sign-up',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    }

    const postData = JSON.stringify(testUser)
    const response = await makeRequest(options, postData)

    if (response.statusCode === 201) {
      console.log('✅ User registered successfully')
      console.log('📧 Check your email for verification code (if email is configured)')
      return true
    } else {
      console.log(`❌ Registration failed: ${response.statusCode}`)
      console.log(`   Error: ${JSON.stringify(response.data)}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Registration error: ${error.message}`)
    return false
  }
}

/**
 * Attempt login (will likely fail due to email verification requirement)
 */
async function attemptLogin() {
  console.log('\n🔓 Attempting login...')

  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    }

    const postData = JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    })

    const response = await makeRequest(options, postData)

    if (response.statusCode === 200) {
      console.log('✅ Login successful')
      return true
    } else if (response.statusCode === 403) {
      console.log('⚠️  Login blocked - email not verified (expected behavior)')
      console.log(`   Message: ${response.data.message}`)
      return false
    } else {
      console.log(`❌ Login failed: ${response.statusCode}`)
      console.log(`   Error: ${JSON.stringify(response.data)}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Login error: ${error.message}`)
    return false
  }
}

/**
 * Test password reset request
 */
async function testPasswordReset() {
  console.log('\n🔄 Testing password reset...')

  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    }

    const postData = JSON.stringify({
      email: testUser.email,
    })

    const response = await makeRequest(options, postData)

    if (response.statusCode === 200) {
      console.log('✅ Password reset email sent')
      console.log('📧 Check your email for reset link (if email is configured)')
      return true
    } else {
      console.log(`❌ Password reset failed: ${response.statusCode}`)
      console.log(`   Error: ${JSON.stringify(response.data)}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Password reset error: ${error.message}`)
    return false
  }
}

/**
 * Main demo function
 */
async function runDemo() {
  console.log('🚀 Auth Service Demo Starting...\n')
  console.log('This demo will test the auth service endpoints with a temporary user.')
  console.log('='.repeat(70))

  // Test service health
  const isHealthy = await testHealth()
  if (!isHealthy) {
    console.log(
      '\n❌ Service is not healthy. Please ensure the auth service is running on localhost:5000',
    )
    process.exit(1)
  }

  // Get CSRF token
  const hasCSRF = await getCSRFToken()
  if (!hasCSRF) {
    console.log('\n❌ Could not obtain CSRF token. Demo cannot continue.')
    process.exit(1)
  }

  // Register user
  const isRegistered = await registerUser()
  if (!isRegistered) {
    console.log('\n❌ User registration failed. Demo cannot continue.')
    process.exit(1)
  }

  // Attempt login (expected to fail due to email verification)
  await attemptLogin()

  // Test password reset
  await testPasswordReset()

  console.log('\n' + '='.repeat(70))
  console.log('🎉 Auth Service Demo Complete!')
  console.log('\nNext steps to fully test the auth flow:')
  console.log('1. Configure email service (see AUTH-DEV-SETUP.md)')
  console.log('2. Check your email for verification code')
  console.log('3. Use the HTTP files in __http__/auth-service.http for manual testing')
  console.log('4. View API documentation: apps/api/auth-service/__docs__/swagger.yaml')

  console.log(`\n📊 Test Summary:`)
  console.log(`   Email: ${testUser.email}`)
  console.log(`   Password: ${testUser.password}`)
  console.log(`   CSRF Token: ${csrfToken ? '✅ Obtained' : '❌ Failed'}`)
  console.log(`   Auth Cookie: ${authCookie ? '✅ Set' : '❌ Not set'}`)
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Demo interrupted by user')
  process.exit(0)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the demo
if (require.main === module) {
  runDemo().catch(error => {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  })
}

module.exports = {
  runDemo,
  testHealth,
  getCSRFToken,
  registerUser,
  attemptLogin,
  testPasswordReset,
}
