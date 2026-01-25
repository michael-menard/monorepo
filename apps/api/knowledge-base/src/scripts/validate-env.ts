/**
 * Environment Variable Validation Script
 *
 * Validates that all required KB_DB_* environment variables are set
 * before running database operations.
 *
 * Usage: pnpm validate:env
 *
 * @see README.md for troubleshooting environment issues
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../.env') })

interface EnvVariable {
  name: string
  required: boolean
  default?: string
  description: string
}

const ENV_VARIABLES: EnvVariable[] = [
  {
    name: 'KB_DB_HOST',
    required: true,
    default: 'localhost',
    description: 'Database host',
  },
  {
    name: 'KB_DB_PORT',
    required: true,
    default: '5433',
    description: 'Database port (default: 5433 to avoid conflict with root docker-compose)',
  },
  {
    name: 'KB_DB_NAME',
    required: true,
    default: 'knowledgebase',
    description: 'Database name',
  },
  {
    name: 'KB_DB_USER',
    required: true,
    default: 'kbuser',
    description: 'Database user',
  },
  {
    name: 'KB_DB_PASSWORD',
    required: true,
    description: 'Database password (no default - must be explicitly set)',
  },
  {
    name: 'KB_DB_MAX_CONNECTIONS',
    required: false,
    default: '10',
    description: 'Maximum number of connections in the pool',
  },
  {
    name: 'KB_DB_IDLE_TIMEOUT_MS',
    required: false,
    default: '10000',
    description: 'Idle timeout in milliseconds',
  },
  {
    name: 'KB_DB_CONNECTION_TIMEOUT_MS',
    required: false,
    default: '5000',
    description: 'Connection timeout in milliseconds',
  },
]

/**
 * Validate password strength
 * Requires:
 * - Minimum 16 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 16) {
    errors.push('Password must be at least 16 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateEnv(): boolean {
  console.log('Validating Knowledge Base environment variables...\n')

  const missing: EnvVariable[] = []
  const present: EnvVariable[] = []
  const passwordErrors: string[] = []

  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.name]

    if (!value && envVar.required) {
      missing.push(envVar)
    } else {
      present.push(envVar)

      // Validate password strength if it's the password field
      if (envVar.name === 'KB_DB_PASSWORD' && value) {
        const validation = validatePasswordStrength(value)
        if (!validation.valid) {
          passwordErrors.push(...validation.errors)
        }
      }
    }
  }

  // Report present variables
  if (present.length > 0) {
    console.log('Present variables:')
    for (const envVar of present) {
      const value = process.env[envVar.name]
      const displayValue = envVar.name.includes('PASSWORD') ? '********' : value || envVar.default
      const source = value ? 'env' : 'default'
      console.log(`  ${envVar.name}=${displayValue} (${source})`)
    }
    console.log('')
  }

  // Report missing variables
  if (missing.length > 0) {
    console.error('Missing required environment variables:\n')

    for (const envVar of missing) {
      console.error(`  ${envVar.name}`)
      console.error(`    Description: ${envVar.description}`)
      if (envVar.default) {
        console.error(`    Default: ${envVar.default}`)
      }
      console.error('')
    }

    console.error('How to fix:')
    console.error('  1. Copy .env.example to .env:')
    console.error('     cp .env.example .env')
    console.error('')
    console.error('  2. Edit .env with your values')
    console.error('')
    console.error('See README.md troubleshooting section for more details.')
    console.error('')

    return false
  }

  // Report password strength errors
  if (passwordErrors.length > 0) {
    console.error('Password strength requirements not met:\n')
    for (const error of passwordErrors) {
      console.error(`  - ${error}`)
    }
    console.error('')
    console.error('For security, KB_DB_PASSWORD must meet the following requirements:')
    console.error('  - Minimum 16 characters')
    console.error('  - At least one uppercase letter (A-Z)')
    console.error('  - At least one lowercase letter (a-z)')
    console.error('  - At least one number (0-9)')
    console.error('  - At least one special character (!@#$%^&*, etc.)')
    console.error('')
    console.error('Update your .env file with a stronger password.')
    console.error('')
    return false
  }

  console.log('All required environment variables are set!')
  console.log('Password strength requirements met.')
  console.log('')
  console.log('Connection string:')
  const host = process.env.KB_DB_HOST || 'localhost'
  const port = process.env.KB_DB_PORT || '5433'
  const name = process.env.KB_DB_NAME || 'knowledgebase'
  const user = process.env.KB_DB_USER || 'kbuser'
  console.log(`  postgresql://${user}:****@${host}:${port}/${name}`)
  console.log('')

  return true
}

// Run validation
const isValid = validateEnv()
process.exit(isValid ? 0 : 1)
