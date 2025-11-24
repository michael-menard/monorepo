#!/usr/bin/env tsx

/**
 * Umami Database Migration Runner
 *
 * This script applies Drizzle migrations to the Umami schema in Aurora PostgreSQL.
 * It uses the umami_user credentials from AWS Secrets Manager for secure access.
 *
 * Story 1.2: Aurora PostgreSQL Schema for Umami
 *
 * Usage:
 * - `npm run db:umami:migrate` - Apply all pending Umami migrations
 * - `tsx src/lib/db/migrate-umami.ts` - Direct execution
 *
 * Prerequisites:
 * 1. Umami schema and user must be created (run setup-umami.ts first)
 * 2. AWS Secrets Manager must contain umami-db-credentials
 * 3. Migration files must exist in src/db/umami-migrations/
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('umami-migrate')

interface UmamiCredentials {
  username: string
  password: string
  host: string
  port: number
  database: string
  schema: string
}

/**
 * Retrieve Umami database credentials from AWS Secrets Manager
 */
async function getUmamiCredentials(): Promise<UmamiCredentials> {
  const secretName = 'observability/umami-db-credentials'

  try {
    const secretsManager = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })

    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await secretsManager.send(command)

    if (!response.SecretString) {
      throw new Error('Secret value is empty')
    }

    const credentials = JSON.parse(response.SecretString) as UmamiCredentials

    // Validate required fields
    if (!credentials.username || !credentials.password || !credentials.host) {
      throw new Error('Invalid credentials structure in secret')
    }

    return credentials
  } catch (error) {
    logger.error('Failed to retrieve Umami credentials from Secrets Manager:', error)

    // Fallback to environment variables for development
    if (process.env.NODE_ENV === 'development' && process.env.UMAMI_DATABASE_URL) {
      logger.info('Using development environment variables for Umami connection')
      const url = new URL(process.env.UMAMI_DATABASE_URL)
      return {
        username: url.username,
        password: url.password,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1),
        schema: 'umami',
      }
    }

    throw new Error(`Failed to get Umami database credentials: ${error}`)
  }
}

/**
 * Run Umami database migrations
 */
async function runUmamiMigrations() {
  logger.info('🔄 Starting Umami database migrations...')

  let pool: Pool | null = null

  try {
    // Get Umami credentials
    const credentials = await getUmamiCredentials()
    logger.info('✅ Retrieved Umami database credentials')

    // Create connection pool for migrations
    pool = new Pool({
      host: credentials.host,
      port: credentials.port,
      user: credentials.username,
      password: credentials.password,
      database: credentials.database,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Set search path to umami schema
      options: '-c search_path=umami,public',
    })

    // Test connection
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT current_schema(), current_user, version()')
      logger.info('✅ Database connection established:', {
        schema: result.rows[0].current_schema,
        user: result.rows[0].current_user,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
      })
    } finally {
      client.release()
    }

    // Create Drizzle instance
    const db = drizzle(pool)

    // Run migrations
    logger.info('🚀 Applying Umami migrations...')
    await migrate(db, { migrationsFolder: './src/db/umami-migrations' })

    logger.info('✅ Umami database migrations completed successfully')

    // Verify migration status
    const migrationCheck = await pool.query(
      'SELECT migration_name, started_at, finished_at FROM umami._prisma_migrations ORDER BY started_at DESC LIMIT 5',
    )

    logger.info('📋 Recent migrations:', {
      count: migrationCheck.rows.length,
      latest: migrationCheck.rows[0]?.migration_name || 'none',
      migrations: migrationCheck.rows.map(row => ({
        name: row.migration_name,
        started: row.started_at,
        finished: row.finished_at,
      })),
    })

    // Verify table creation
    const tableCheck = await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
      ['umami'],
    )

    logger.info('📊 Umami schema tables:', {
      count: tableCheck.rows.length,
      tables: tableCheck.rows.map(row => row.table_name),
    })
  } catch (error) {
    logger.error('❌ Umami migration failed:', error)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
      logger.info('🔌 Database connection closed')
    }
  }
}

// Main execution
async function main() {
  await runUmamiMigrations()
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
}

export { runUmamiMigrations }
