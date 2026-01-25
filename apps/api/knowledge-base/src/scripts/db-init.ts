/**
 * Database Initialization Script
 *
 * Combines all setup steps into a single command:
 * 1. Starts Docker Compose (if not running)
 * 2. Waits for database to be healthy
 * 3. Runs database migrations
 *
 * Usage: pnpm db:init
 *
 * @see README.md for troubleshooting
 */

import { execSync, spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '../..')

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step: number, total: number, message: string): void {
  log(`\n[${step}/${total}] ${message}`, 'cyan')
}

function logSuccess(message: string): void {
  log(`  [OK] ${message}`, 'green')
}

function logError(message: string): void {
  log(`  [ERROR] ${message}`, 'red')
}

function logWarning(message: string): void {
  log(`  [WARN] ${message}`, 'yellow')
}

/**
 * Check if Docker is running
 */
function checkDocker(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore', cwd: packageRoot })
    return true
  } catch {
    return false
  }
}

/**
 * Check if .env file exists
 */
function checkEnvFile(): boolean {
  const envPath = resolve(packageRoot, '.env')
  return existsSync(envPath)
}

/**
 * Copy .env.example to .env if .env doesn't exist
 */
function setupEnvFile(): void {
  const envPath = resolve(packageRoot, '.env')
  const examplePath = resolve(packageRoot, '.env.example')

  if (!existsSync(envPath) && existsSync(examplePath)) {
    const content = readFileSync(examplePath, 'utf-8')
    require('fs').writeFileSync(envPath, content)
    logSuccess('Created .env from .env.example')
  }
}

/**
 * Start Docker Compose
 */
function startDockerCompose(): void {
  execSync('docker-compose up -d', {
    cwd: packageRoot,
    stdio: 'inherit',
  })
}

/**
 * Wait for database to be healthy
 */
async function waitForHealthy(maxAttempts: number = 30): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = execSync('docker-compose ps --format json', {
        cwd: packageRoot,
        encoding: 'utf-8',
      })

      // Parse the output (each line is a JSON object)
      const lines = result.trim().split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const container = JSON.parse(line)
          if (container.Service === 'kb-postgres' && container.Health === 'healthy') {
            return true
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    } catch {
      // Ignore errors during health check
    }

    process.stdout.write(`  Waiting for database... (${attempt}/${maxAttempts})\r`)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return false
}

/**
 * Validate and sanitize identifier (database name, username)
 * Prevents command injection by ensuring only alphanumeric and underscore
 */
function sanitizeIdentifier(value: string, name: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '')
  if (sanitized !== value) {
    throw new Error(
      `Invalid ${name}: "${value}". Only alphanumeric characters and underscores are allowed.`,
    )
  }
  if (sanitized.length === 0) {
    throw new Error(`${name} cannot be empty`)
  }
  return sanitized
}

/**
 * Run database migrations
 */
function runMigrations(): void {
  // Run the SQL migration directly using psql
  const migrationPath = resolve(packageRoot, 'src/db/migrations/0000_initial_schema.sql')

  if (!existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`)
  }

  // Load environment variables
  const { config } = require('dotenv')
  config({ path: resolve(packageRoot, '.env') })

  const database = sanitizeIdentifier(process.env.KB_DB_NAME || 'knowledgebase', 'KB_DB_NAME')
  const user = sanitizeIdentifier(process.env.KB_DB_USER || 'kbuser', 'KB_DB_USER')
  const password = process.env.KB_DB_PASSWORD

  if (!password) {
    throw new Error('KB_DB_PASSWORD environment variable is required')
  }

  // Run migration via docker exec to use psql inside the container
  // Note: We connect to the container directly, so host/port are not needed
  // Using spawnSync with array arguments prevents command injection
  const migrationContent = readFileSync(migrationPath, 'utf-8')

  const result = spawnSync(
    'docker',
    ['exec', '-i', 'knowledge-base-postgres', 'psql', '-U', user, '-d', database],
    {
      cwd: packageRoot,
      input: migrationContent,
      stdio: ['pipe', 'inherit', 'inherit'],
      env: {
        PGPASSWORD: password,
      },
    },
  )

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`Migration failed with exit code ${result.status}`)
  }
}

/**
 * Verify pgvector extension
 */
function verifyPgvector(): boolean {
  try {
    const { config } = require('dotenv')
    config({ path: resolve(packageRoot, '.env') })

    const user = sanitizeIdentifier(process.env.KB_DB_USER || 'kbuser', 'KB_DB_USER')
    const database = sanitizeIdentifier(process.env.KB_DB_NAME || 'knowledgebase', 'KB_DB_NAME')

    // Use spawnSync with array arguments to prevent command injection
    const result = spawnSync(
      'docker',
      [
        'exec',
        'knowledge-base-postgres',
        'psql',
        '-U',
        user,
        '-d',
        database,
        '-t',
        '-c',
        "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
      ],
      { cwd: packageRoot, encoding: 'utf-8' },
    )

    if (result.error || result.status !== 0) {
      return false
    }

    const version = result.stdout.trim()
    if (version) {
      logSuccess(`pgvector extension version: ${version}`)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Verify tables exist
 */
function verifyTables(): boolean {
  try {
    const { config } = require('dotenv')
    config({ path: resolve(packageRoot, '.env') })

    const user = sanitizeIdentifier(process.env.KB_DB_USER || 'kbuser', 'KB_DB_USER')
    const database = sanitizeIdentifier(process.env.KB_DB_NAME || 'knowledgebase', 'KB_DB_NAME')

    // Use spawnSync with array arguments to prevent command injection
    const result = spawnSync(
      'docker',
      [
        'exec',
        'knowledge-base-postgres',
        'psql',
        '-U',
        user,
        '-d',
        database,
        '-t',
        '-c',
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('knowledge_entries', 'embedding_cache')",
      ],
      { cwd: packageRoot, encoding: 'utf-8' },
    )

    if (result.error || result.status !== 0) {
      return false
    }

    const tables = result.stdout
      .trim()
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean)
    const hasKnowledgeEntries = tables.includes('knowledge_entries')
    const hasEmbeddingCache = tables.includes('embedding_cache')

    if (hasKnowledgeEntries) logSuccess('Table: knowledge_entries')
    if (hasEmbeddingCache) logSuccess('Table: embedding_cache')

    return hasKnowledgeEntries && hasEmbeddingCache
  } catch {
    return false
  }
}

/**
 * Main initialization function
 */
async function main(): Promise<void> {
  const totalSteps = 5

  log('\n========================================', 'cyan')
  log('  Knowledge Base Database Initialization', 'cyan')
  log('========================================\n', 'cyan')

  // Step 1: Check Docker
  logStep(1, totalSteps, 'Checking Docker...')
  if (!checkDocker()) {
    logError('Docker is not running!')
    log('')
    log('Please start Docker Desktop and try again.', 'yellow')
    log('See README.md troubleshooting section for help.', 'yellow')
    process.exit(1)
  }
  logSuccess('Docker is running')

  // Step 2: Setup environment
  logStep(2, totalSteps, 'Setting up environment...')
  if (!checkEnvFile()) {
    setupEnvFile()
  } else {
    logSuccess('.env file exists')
  }

  // Step 3: Start Docker Compose
  logStep(3, totalSteps, 'Starting PostgreSQL with pgvector...')
  try {
    startDockerCompose()
    logSuccess('Docker Compose started')
  } catch (error) {
    logError('Failed to start Docker Compose')
    log('')
    if (error instanceof Error) {
      log(error.message, 'red')
    }
    log('See README.md troubleshooting section for help.', 'yellow')
    process.exit(1)
  }

  // Wait for database to be healthy
  log('  Waiting for database to be healthy...')
  const isHealthy = await waitForHealthy()
  if (!isHealthy) {
    logError('Database failed to become healthy within 30 seconds')
    log('')
    log('Try checking Docker logs:', 'yellow')
    log('  docker-compose logs kb-postgres', 'yellow')
    process.exit(1)
  }
  console.log('') // Clear the waiting line
  logSuccess('Database is healthy')

  // Step 4: Run migrations
  logStep(4, totalSteps, 'Running database migrations...')
  try {
    runMigrations()
    logSuccess('Migrations completed')
  } catch (error) {
    logError('Migration failed')
    log('')
    if (error instanceof Error) {
      log(error.message, 'red')
    }
    log('See README.md troubleshooting section for help.', 'yellow')
    process.exit(1)
  }

  // Step 5: Verify setup
  logStep(5, totalSteps, 'Verifying setup...')

  if (!verifyPgvector()) {
    logWarning('pgvector extension not found - this may indicate an issue')
  }

  if (!verifyTables()) {
    logWarning('Some tables not found - this may indicate an issue')
  }

  // Success!
  log('\n========================================', 'green')
  log('  Database initialization complete!', 'green')
  log('========================================\n', 'green')

  log('Next steps:')
  log('  1. Run tests:     pnpm test')
  log('  2. Seed data:     pnpm db:seed')
  log('  3. Open Studio:   pnpm db:studio')
  log('')
}

// Run main function
main().catch(error => {
  logError('Unexpected error during initialization')
  console.error(error)
  process.exit(1)
})
