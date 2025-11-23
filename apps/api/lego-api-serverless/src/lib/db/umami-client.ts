/**
 * Umami Database Client
 *
 * This module provides a configured Drizzle ORM client for accessing the Umami analytics schema.
 * It uses separate connection credentials stored in AWS Secrets Manager for security isolation.
 *
 * Story 1.2: Aurora PostgreSQL Schema for Umami
 *
 * Key Features:
 * - Separate connection pool for Umami schema access
 * - Uses dedicated 'umami_user' database credentials from Secrets Manager
 * - Schema-isolated queries (only umami schema access)
 * - Connection reuse across Lambda invocations
 * - Type-safe queries with Drizzle ORM
 *
 * Usage:
 * ```typescript
 * import { umamiDb } from '@/lib/db/umami-client';
 * import { website } from '@/db/umami-schema';
 *
 * export async function handler(event) {
 *   const websites = await umamiDb.select().from(website);
 *   return { websites };
 * }
 * ```
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import * as umamiSchema from '@/db/umami-schema'
import { createLogger } from '../utils/logger'

const logger = createLogger('umami-db-client')

// Global connection pool for reuse across Lambda invocations
let _umamiPool: Pool | null = null
let _secretsManager: SecretsManagerClient | null = null

/**
 * Umami Database Credentials Interface
 * Matches the structure stored in AWS Secrets Manager
 */
interface UmamiCredentials {
  username: string
  password: string
  host: string
  port: number
  database: string
  schema: string
}

/**
 * Get AWS Secrets Manager client (singleton)
 */
function getSecretsManager(): SecretsManagerClient {
  if (!_secretsManager) {
    _secretsManager = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
  }
  return _secretsManager
}

/**
 * Retrieve Umami database credentials from AWS Secrets Manager
 */
async function getUmamiCredentials(): Promise<UmamiCredentials> {
  const secretName = 'observability/umami-db-credentials'

  try {
    const secretsManager = getSecretsManager()
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
    throw new Error(`Failed to get Umami database credentials: ${error}`)
  }
}

/**
 * Get or create Umami database connection pool
 * Connection pool is reused across Lambda invocations for performance
 */
async function getUmamiPool(): Promise<Pool> {
  if (_umamiPool) {
    return _umamiPool
  }

  logger.info('Initializing Umami database connection pool...')

  const credentials = await getUmamiCredentials()

  _umamiPool = new Pool({
    host: credentials.host,
    port: credentials.port,
    user: credentials.username,
    password: credentials.password,
    database: credentials.database,
    // Umami-specific connection pool settings
    max: 2, // Small pool for analytics queries
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast on connection issues
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Set default schema to 'umami' for all connections
    options: '-c search_path=umami,public',
  })

  // Handle pool errors gracefully
  _umamiPool.on('error', err => {
    logger.error('Unexpected Umami database pool error:', err)
  })

  logger.info('Umami database connection pool initialized')
  return _umamiPool
}

/**
 * Drizzle ORM Database Client for Umami Schema
 * - Type-safe queries with full schema inference
 * - Lazy-loaded relationships
 * - Transaction support
 * - Schema-isolated to 'umami' namespace
 */
export const umamiDb = drizzle(await getUmamiPool(), {
  schema: {
    ...umamiSchema.umamiTables,
    ...umamiSchema.umamiRelations,
  },
  logger: process.env.NODE_ENV === 'development',
})

/**
 * Test Umami database connectivity
 * Useful for health checks and debugging
 */
export async function testUmamiConnection(): Promise<boolean> {
  try {
    const pool = await getUmamiPool()
    const client = await pool.connect()

    try {
      // Test basic connectivity and schema access
      const result = await client.query('SELECT NOW() as current_time, current_schema() as schema')
      logger.info('Umami database connection test successful:', {
        timestamp: result.rows[0].current_time,
        schema: result.rows[0].schema,
      })
      return true
    } finally {
      client.release()
    }
  } catch (error) {
    logger.error('Umami database connection test failed:', error)
    return false
  }
}

/**
 * Get Umami database connection info (for debugging)
 * Returns connection details without sensitive information
 */
export async function getUmamiConnectionInfo(): Promise<{
  host: string
  port: number
  database: string
  schema: string
  poolSize: number
  idleConnections: number
  totalConnections: number
}> {
  const credentials = await getUmamiCredentials()
  const pool = await getUmamiPool()

  return {
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    schema: credentials.schema,
    poolSize: pool.totalCount,
    idleConnections: pool.idleCount,
    totalConnections: pool.totalCount,
  }
}

/**
 * Cleanup Umami database connections
 * Should be called during Lambda shutdown or testing cleanup
 */
export async function closeUmamiConnections(): Promise<void> {
  if (_umamiPool) {
    logger.info('Closing Umami database connection pool...')
    await _umamiPool.end()
    _umamiPool = null
    logger.info('Umami database connection pool closed')
  }
}
