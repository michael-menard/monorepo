/**
 * Centralized Environment Configuration Loader
 *
 * This module loads environment variables from the monorepo root .env file
 * and makes them available to all services in the monorepo.
 *
 * Usage:
 * - Import this file at the top of your service's main file
 * - All environment variables from the root .env will be available via process.env
 */

const path = require('path')
const dotenv = require('dotenv')
const { EnvironmentVariableError, ServiceDetectionError, validatePort } = require('./errors')

// Load environment variables from the monorepo root .env file
const rootEnvPath = path.resolve(__dirname, '../../.env')

// Load the root .env file
const result = dotenv.config({ path: rootEnvPath })

if (result.error) {
  console.warn(`Warning: Could not load root .env file from ${rootEnvPath}`)
  console.warn('Falling back to local .env files only')
} else {
  console.log(`✅ Loaded centralized environment configuration from ${rootEnvPath}`)
}

// Also load local .env file if it exists (for service-specific overrides)
const localEnvPath = path.resolve(process.cwd(), '.env')
const localResult = dotenv.config({ path: localEnvPath })

if (!localResult.error) {
  console.log(`✅ Loaded local environment overrides from ${localEnvPath}`)
}

// Map centralized environment variables to service-specific ones
const envMappings = {
  // Map centralized URLs to legacy variable names
  AUTH_API: process.env.AUTH_SERVICE_URL || process.env.AUTH_API,
  CLIENT_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL,
  APP_ORIGIN: process.env.FRONTEND_URL || process.env.APP_ORIGIN,

  // Ensure consistent JWT secret
  JWT_SECRET: process.env.JWT_SECRET,

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  MONGO_URI: process.env.MONGO_URI,

  // Feature flags
  NODE_ENV: process.env.NODE_ENV || 'development',
}

// Apply mappings to process.env
Object.entries(envMappings).forEach(([key, value]) => {
  if (value && !process.env[key]) {
    process.env[key] = value
  }
})

// Service-specific port detection and assignment
const detectServicePort = () => {
  const cwd = process.cwd()

  if (cwd.includes('auth-service')) {
    const port = validatePort('AUTH_SERVICE_PORT', process.env.AUTH_SERVICE_PORT, {
      serviceType: 'Auth Service',
    })
    process.env.PORT = port.toString()
    console.log(`🔧 Auth Service detected - using port ${process.env.PORT}`)
  } else if (cwd.includes('lego-projects-api')) {
    const port = validatePort('LEGO_API_PORT', process.env.LEGO_API_PORT, {
      serviceType: 'LEGO API',
    })
    process.env.PORT = port.toString()
    console.log(`🔧 LEGO API Service detected - using port ${process.env.PORT}`)
  } else {
    throw new ServiceDetectionError(cwd, {
      suggestion: 'Run from a recognized service directory (auth-service or lego-projects-api)',
      example: 'cd apps/api/auth-service && npm start',
    })
  }
}

detectServicePort()

// Export configuration for use by other modules
module.exports = {
  ports: {
    auth: process.env.AUTH_SERVICE_PORT || '9300',
    api: process.env.LEGO_API_PORT || '9000',
    frontend: process.env.FRONTEND_PORT || '3002',
  },
  urls: {
    auth:
      process.env.AUTH_SERVICE_URL || `http://localhost:${process.env.AUTH_SERVICE_PORT || '9300'}`,
    api: process.env.LEGO_API_URL || `http://localhost:${process.env.LEGO_API_PORT || '9000'}`,
    frontend: process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || '3002'}`,
  },
  database: {
    postgres: process.env.DATABASE_URL,
    mongo: process.env.MONGO_URI,
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
}

console.log('🌍 Environment configuration loaded successfully')
console.log(`📍 Current service port: ${process.env.PORT}`)
console.log(`🔧 Environment: ${process.env.NODE_ENV}`)
