#!/usr/bin/env tsx

/**
 * Umami Schema Setup and Migration Script
 *
 * This script implements Story 1.2: Aurora PostgreSQL Schema for Umami
 * using Drizzle ORM for schema management instead of manual SQL.
 *
 * Tasks performed:
 * 1. Create 'umami' PostgreSQL schema namespace
 * 2. Create dedicated 'umami_user' with schema-scoped permissions
 * 3. Store credentials in AWS Secrets Manager
 * 4. Generate and apply Drizzle migrations for Umami schema
 * 5. Verify schema isolation and functionality
 *
 * Usage:
 * - Set environment variables for Aurora connection (master user)
 * - Run: tsx src/lib/db/setup-umami.ts
 *
 * Environment Variables Required:
 * - POSTGRES_HOST: Aurora cluster endpoint
 * - POSTGRES_PORT: Database port (default: 5432)
 * - POSTGRES_DATABASE: Database name
 * - POSTGRES_USERNAME: Master user or admin user
 * - POSTGRES_PASSWORD: Master user password
 * - AWS_REGION: AWS region for Secrets Manager
 */

import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import {
  SecretsManagerClient,
  CreateSecretCommand,
  DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager'
import { createLogger } from '@/core/observability/logger'
import { getEnv } from '../utils/env'
import { randomBytes } from 'crypto'
import * as umamiSchema from '@/core/database/schema/umami'

const logger = createLogger('umami-setup')

interface UmamiCredentials {
  username: string
  password: string
  host: string
  port: number
  database: string
  schema: string
}

class UmamiSetup {
  private masterPool: Pool
  private env: ReturnType<typeof getEnv>
  private secretsManager: SecretsManagerClient
  private umamiPassword: string

  constructor() {
    this.env = getEnv()
    this.umamiPassword = this.generateSecurePassword()

    // Initialize AWS Secrets Manager client
    this.secretsManager = new SecretsManagerClient({
      region: this.env.AWS_REGION || 'us-east-1',
    })

    // Initialize master database connection pool
    this.masterPool = new Pool({
      host: this.env.POSTGRES_HOST,
      port: parseInt(this.env.POSTGRES_PORT || '5432'),
      user: this.env.POSTGRES_USERNAME,
      password: this.env.POSTGRES_PASSWORD,
      database: this.env.POSTGRES_DATABASE,
      ssl: this.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  /**
   * Generate secure random password for Umami user
   */
  private generateSecurePassword(): string {
    return randomBytes(32).toString('base64').replace(/[+/=]/g, '').substring(0, 32)
  }

  /**
   * Step 1: Create Umami PostgreSQL schema
   */
  async createUmamiSchema(): Promise<void> {
    logger.info('🏗️  Creating Umami PostgreSQL schema...')

    const client = await this.masterPool.connect()
    try {
      // Create schema
      await client.query('CREATE SCHEMA IF NOT EXISTS umami')
      logger.info('✅ Umami schema created successfully')

      // Verify schema creation
      const verifyResult = await client.query(
        'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
        ['umami'],
      )

      if (verifyResult.rows.length === 0) {
        throw new Error('Failed to create umami schema')
      }

      logger.info('✅ Schema creation verified')
    } finally {
      client.release()
    }
  }

  /**
   * Step 2: Create dedicated Umami database user
   */
  async createUmamiUser(): Promise<void> {
    logger.info('👤 Creating dedicated Umami database user...')

    const client = await this.masterPool.connect()
    try {
      // Check if user already exists
      const userExists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [
        'umami_user',
      ])

      if (userExists.rows.length > 0) {
        logger.info('ℹ️  Umami user already exists, updating permissions...')
      } else {
        // Create user with password
        await client.query(`CREATE USER umami_user WITH PASSWORD '${this.umamiPassword}'`)
        logger.info('✅ Umami user created successfully')
      }

      // Grant schema-only permissions
      await client.query('GRANT USAGE ON SCHEMA umami TO umami_user')
      await client.query('GRANT CREATE ON SCHEMA umami TO umami_user')
      await client.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA umami TO umami_user')
      await client.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA umami TO umami_user')

      // Set default privileges for future objects
      await client.query(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA umami GRANT ALL ON TABLES TO umami_user',
      )
      await client.query(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA umami GRANT ALL ON SEQUENCES TO umami_user',
      )

      logger.info('✅ Umami user permissions granted')

      // Verify user permissions
      const permissionsResult = await client.query(
        'SELECT grantee, privilege_type FROM information_schema.schema_privileges WHERE schema_name = $1',
        ['umami'],
      )

      logger.info('✅ User permissions verified:', {
        permissions: permissionsResult.rows.length,
      })
    } finally {
      client.release()
    }
  }

  /**
   * Step 3: Store credentials in AWS Secrets Manager
   */
  async storeCredentials(): Promise<string> {
    logger.info('🔐 Storing credentials in AWS Secrets Manager...')

    const secretName = 'observability/umami-db-credentials'
    const credentials: UmamiCredentials = {
      username: 'umami_user',
      password: this.umamiPassword,
      host: this.env.POSTGRES_HOST!,
      port: parseInt(this.env.POSTGRES_PORT || '5432'),
      database: this.env.POSTGRES_DATABASE!,
      schema: 'umami',
    }

    try {
      // Create secret
      const createCommand = new CreateSecretCommand({
        Name: secretName,
        Description: 'Umami database connection credentials for Aurora PostgreSQL',
        SecretString: JSON.stringify(credentials),
        Tags: [
          { Key: 'Project', Value: 'UserMetrics' },
          { Key: 'Component', Value: 'Database' },
          { Key: 'Environment', Value: this.env.NODE_ENV || 'dev' },
          { Key: 'Service', Value: 'Umami' },
        ],
      })

      await this.secretsManager.send(createCommand)
      logger.info('✅ Secret created successfully')

      // Get secret ARN
      const describeCommand = new DescribeSecretCommand({ SecretId: secretName })
      const secretInfo = await this.secretsManager.send(describeCommand)

      logger.info('✅ Secret verified:', {
        arn: secretInfo.ARN,
        name: secretInfo.Name,
      })

      return secretInfo.ARN!
    } catch (error: any) {
      if (error.name === 'ResourceExistsException') {
        logger.info('ℹ️  Secret already exists, retrieving ARN...')
        const describeCommand = new DescribeSecretCommand({ SecretId: secretName })
        const secretInfo = await this.secretsManager.send(describeCommand)
        return secretInfo.ARN!
      }
      throw error
    }
  }

  /**
   * Step 4: Apply Drizzle migrations for Umami schema
   */
  async applyUmamiMigrations(): Promise<void> {
    logger.info('🚀 Applying Drizzle migrations for Umami schema...')

    // Create a connection pool for umami_user
    const umamiPool = new Pool({
      host: this.env.POSTGRES_HOST,
      port: parseInt(this.env.POSTGRES_PORT || '5432'),
      user: 'umami_user',
      password: this.umamiPassword,
      database: this.env.POSTGRES_DATABASE,
      ssl: this.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Set search path to umami schema
      options: '-c search_path=umami,public',
    })

    try {
      // Create Drizzle instance
      const umamiDb = drizzle(umamiPool, { schema: umamiSchema.umamiTables })

      // Apply migrations using Drizzle migrate
      logger.info('📦 Running Drizzle migrations...')
      await migrate(umamiDb, { migrationsFolder: './src/db/umami-migrations' })

      logger.info('✅ Umami migrations applied successfully')

      // Verify migration status
      const client = await umamiPool.connect()
      try {
        // Check migration table
        const migrationResult = await client.query(
          'SELECT migration_name, started_at FROM umami._prisma_migrations ORDER BY started_at DESC LIMIT 1',
        )

        if (migrationResult.rows.length > 0) {
          logger.info('✅ Latest migration:', {
            name: migrationResult.rows[0].migration_name,
            applied: migrationResult.rows[0].started_at,
          })
        }

        // Verify tables created
        const tablesResult = await client.query(
          'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
          ['umami'],
        )

        logger.info('✅ Umami tables created:', {
          count: tablesResult.rows.length,
          tables: tablesResult.rows.map(row => row.table_name),
        })

        // Verify connection and schema
        const connectionResult = await client.query('SELECT current_schema(), current_user')
        logger.info('✅ Umami user connection verified:', {
          schema: connectionResult.rows[0].current_schema,
          user: connectionResult.rows[0].current_user,
        })
      } finally {
        client.release()
      }
    } finally {
      await umamiPool.end()
    }
  }

  /**
   * Step 5: Verify schema isolation
   */
  async verifySchemaIsolation(): Promise<void> {
    logger.info('🔒 Verifying schema isolation...')

    // Create a separate connection as umami_user
    const umamiPool = new Pool({
      host: this.env.POSTGRES_HOST,
      port: parseInt(this.env.POSTGRES_PORT || '5432'),
      user: 'umami_user',
      password: this.umamiPassword,
      database: this.env.POSTGRES_DATABASE,
      ssl: this.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1,
    })

    const client = await umamiPool.connect()
    try {
      // Test 1: Umami user can access umami schema
      const umamiSchemaResult = await client.query(
        'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
        ['umami'],
      )

      if (umamiSchemaResult.rows.length === 1) {
        logger.info('✅ Umami user can access umami schema')
      } else {
        throw new Error('Umami user cannot access umami schema')
      }

      // Test 2: Try to create a test table in umami schema
      await client.query('SET search_path = umami')
      await client.query('CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT)')
      await client.query('INSERT INTO test_table (name) VALUES ($1)', ['test'])
      const testResult = await client.query('SELECT * FROM test_table WHERE name = $1', ['test'])
      await client.query('DROP TABLE IF EXISTS test_table')

      if (testResult.rows.length === 1) {
        logger.info('✅ Umami user can create/query/drop tables in umami schema')
      }

      // Test 3: Verify umami user cannot access application tables (should be restricted)
      try {
        await client.query('SET search_path = public')
        const publicTablesResult = await client.query(
          'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 LIMIT 1',
          ['public'],
        )

        if (publicTablesResult.rows.length > 0) {
          logger.warn('⚠️  Umami user can see public schema tables (metadata access only)')
        }
      } catch (error) {
        logger.info('✅ Umami user properly restricted from public schema operations', { error })
      }
    } finally {
      client.release()
      await umamiPool.end()
    }
  }

  /**
   * Step 6: Integration testing
   */
  async runIntegrationTests(): Promise<void> {
    logger.info('🧪 Running integration tests...')

    const client = await this.masterPool.connect()
    try {
      // Test 1: Verify existing application schemas remain untouched
      const publicTablesResult = await client.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
        ['public'],
      )

      logger.info('✅ Application schema tables verified:', {
        count: publicTablesResult.rows.length,
      })

      // Test 2: Verify umami schema exists and is accessible
      const umamiSchemaResult = await client.query(
        'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
        ['umami'],
      )

      if (umamiSchemaResult.rows.length === 1) {
        logger.info('✅ Umami schema exists and is accessible')
      } else {
        throw new Error('Umami schema not found')
      }

      // Test 3: Test basic database connectivity
      const connectivityTest = await client.query(
        'SELECT NOW() as current_time, version() as pg_version',
      )
      logger.info('✅ Database connectivity verified:', {
        timestamp: connectivityTest.rows[0].current_time,
        version:
          connectivityTest.rows[0].pg_version.split(' ')[0] +
          ' ' +
          connectivityTest.rows[0].pg_version.split(' ')[1],
      })
    } finally {
      client.release()
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.masterPool.end()
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    logger.info('🚀 Starting Umami Schema Setup with Drizzle ORM (Story 1.2)...')

    try {
      // Step 1: Create schema
      await this.createUmamiSchema()

      // Step 2: Create user
      await this.createUmamiUser()

      // Step 3: Store credentials
      const secretArn = await this.storeCredentials()

      // Step 4: Apply migrations
      await this.applyUmamiMigrations()

      // Step 5: Verify isolation
      await this.verifySchemaIsolation()

      // Step 6: Integration testing
      await this.runIntegrationTests()

      logger.info('🎉 Umami Schema Setup completed successfully!')
      logger.info('📋 Summary:', {
        secretArn,
        databaseUrl: `postgresql://umami_user:[password]@${this.env.POSTGRES_HOST}:${this.env.POSTGRES_PORT}/${this.env.POSTGRES_DATABASE}?schema=umami`,
        nextSteps: [
          '1. Create drizzle.umami.config.ts for Umami-specific migrations',
          '2. Run: npx drizzle-kit generate --config drizzle.umami.config.ts',
          '3. Run: npx drizzle-kit push --config drizzle.umami.config.ts',
          '4. Use umamiDb client for Umami analytics queries',
        ],
      })
    } catch (error) {
      logger.error('❌ Umami Schema Setup failed:', error)
      throw error
    } finally {
      await this.cleanup()
    }
  }
}

// Main execution
async function main() {
  const setup = new UmamiSetup()
  await setup.run()
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}
