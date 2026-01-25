import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import * as schema from '@/core/database/schema'
import { getEnv } from '@/core/utils/env'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('db-client')

// Secrets Manager client (reused across invocations)
const secretsClient = new SecretsManagerClient({})

// Cached credentials
let cachedCredentials: { username: string; password: string } | null = null

// Story 5.3: Import X-Ray for PostgreSQL query tracing
let AWSXRay: any = null
try {
  AWSXRay = require('aws-xray-sdk-core')
} catch (error) {
  logger.warn('X-Ray SDK not available for database tracing', { error })
}

/**
 * Database Client Configuration for Lambda Functions (Story 5.3: X-Ray enabled)
 *
 * This module provides a configured Drizzle ORM client for accessing PostgreSQL.
 * Connection pooling is optimized for serverless environments with RDS Proxy.
 *
 * Key Features:
 * - Connection reuse across Lambda invocations (initialized outside handler)
 * - RDS Proxy handles connection pooling at infrastructure level
 * - Environment-based configuration via SST Resource linking
 * - Type-safe queries with Drizzle ORM
 * - X-Ray tracing for all database queries (Story 5.3)
 *
 * Usage:
 * ```typescript
 * import { db } from '@/core/database/client';
 *
 * export async function handler(event) {
 *   const users = await db.select().from(schema.mocInstructions);
 *   // Query is automatically traced in X-Ray
 *   return { statusCode: 200, body: JSON.stringify(users) };
 * }
 * ```
 */

// Initialize connection pool outside handler for reuse across invocations
let _pool: Pool | null = null

/**
 * Fetch database credentials from Secrets Manager
 * - Cached for the lifetime of the Lambda container
 */
async function getCredentials(): Promise<{ username: string; password: string }> {
  if (cachedCredentials) {
    return cachedCredentials
  }

  const secretArn = process.env.DB_SECRET_ARN
  if (!secretArn) {
    // Fall back to environment variables if no secret ARN
    const env = getEnv()
    if (!env.POSTGRES_PASSWORD) {
      throw new Error(
        'Database credentials not configured. Either set DB_SECRET_ARN for Secrets Manager ' +
          'or set POSTGRES_PASSWORD environment variable. Never use fallback passwords.',
      )
    }
    return {
      username: env.POSTGRES_USERNAME || 'postgres',
      password: env.POSTGRES_PASSWORD,
    }
  }

  try {
    logger.info('Fetching database credentials from Secrets Manager')
    const command = new GetSecretValueCommand({ SecretId: secretArn })
    const response = await secretsClient.send(command)

    if (!response.SecretString) {
      throw new Error('Secret string is empty')
    }

    const secret = JSON.parse(response.SecretString)
    cachedCredentials = {
      username: secret.username,
      password: secret.password,
    }
    logger.info('Database credentials fetched successfully')
    return cachedCredentials
  } catch (error) {
    logger.error('Failed to fetch database credentials from Secrets Manager', error)
    throw error
  }
}

/**
 * Get or create PostgreSQL connection pool
 * - Pool is created once per Lambda container lifecycle
 * - Fetches credentials from Secrets Manager
 * - Lambda connection pool kept small (max 1 connection)
 * - Story 5.3: Instrumented with X-Ray for query tracing
 */
async function getPoolAsync(): Promise<Pool> {
  if (!_pool) {
    const env = getEnv()
    const credentials = await getCredentials()

    logger.info('Creating PostgreSQL connection pool', {
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      database: env.POSTGRES_DATABASE,
      username: credentials.username,
    })

    _pool = new Pool({
      host: env.POSTGRES_HOST,
      port: parseInt(env.POSTGRES_PORT || '5432'),
      user: credentials.username,
      password: credentials.password,
      database: env.POSTGRES_DATABASE,
      // Serverless-optimized connection pool settings
      max: 1, // Single connection per Lambda (RDS Proxy handles pooling)
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Fail fast on connection issues
      ssl: { rejectUnauthorized: false }, // Aurora requires SSL
    })

    // Story 5.3: Instrument PostgreSQL with X-Ray for automatic query tracing
    if (AWSXRay) {
      try {
        AWSXRay.capturePostgres(_pool)
        logger.info('PostgreSQL client instrumented with X-Ray')
      } catch (error) {
        logger.warn('Failed to instrument PostgreSQL with X-Ray', { error })
      }
    }

    // Handle pool errors gracefully
    _pool.on('error', err => {
      logger.error('Unexpected database pool error:', err)
    })
  }

  return _pool
}

/**
 * Drizzle ORM Database Client (lazy initialized)
 * - Type-safe queries with full schema inference
 * - Lazy-loaded relationships
 * - Transaction support
 * - Uses getDbAsync() for async initialization with Secrets Manager
 */
let _db: ReturnType<typeof drizzle> | null = null

/**
 * Get async-initialized Drizzle client
 * - Fetches credentials from Secrets Manager on first call
 * - Pool and client are cached for Lambda container lifecycle
 */
export async function getDbAsync() {
  if (!_db) {
    const pool = await getPoolAsync()
    _db = drizzle(pool, { schema, logger: false })
  }
  return _db
}

/**
 * Legacy sync db export - for backwards compatibility only
 * WARNING: This may not work with Secrets Manager credentials
 * Use getDbAsync() for proper async initialization
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (_db) {
      return (_db as any)[prop]
    }
    throw new Error(
      'Database not initialized. Call getDbAsync() first or use testConnection() to initialize.',
    )
  },
})

/**
 * Gracefully close database connection pool
 * - Call this in Lambda function cleanup if needed
 * - Generally not required as Lambda handles cleanup
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end()
    _pool = null
  }
}

/**
 * Test database connectivity
 * - Used by health check Lambda
 * - Returns true if connection successful
 * - Uses async pool with Secrets Manager credentials
 */
export async function testConnection(): Promise<boolean> {
  try {
    const pool = await getPoolAsync()
    const result = await pool.query('SELECT 1 as health_check')
    return result.rows[0]?.health_check === 1
  } catch (error) {
    logger.error('Database connection test failed:', error)
    return false
  }
}
