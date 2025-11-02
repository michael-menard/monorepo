#!/usr/bin/env tsx

/**
 * Database Migration Runner
 *
 * This script applies pending Drizzle migrations to the PostgreSQL database.
 * It should be run before deploying Lambda functions to ensure schema is up-to-date.
 *
 * Usage:
 * - `pnpm db:migrate` - Apply all pending migrations
 * - Called automatically during SST deployment via DevCommand
 *
 * Environment Variables (auto-populated by SST):
 * - POSTGRES_HOST
 * - POSTGRES_PORT
 * - POSTGRES_DATABASE
 * - POSTGRES_USERNAME
 * - POSTGRES_PASSWORD
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { getEnv } from '@/lib/utils/env'

async function runMigrations() {
  console.log('🔄 Starting database migrations...')

  const env = getEnv()

  // Create connection pool for migrations
  const pool = new Pool({
    host: env.POSTGRES_HOST,
    port: parseInt(env.POSTGRES_PORT || '5432'),
    user: env.POSTGRES_USERNAME,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DATABASE,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    const db = drizzle(pool)

    // Run migrations
    await migrate(db, { migrationsFolder: './src/db/migrations' })

    console.log('✅ Database migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migrations
runMigrations()
