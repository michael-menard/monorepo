import {drizzle} from 'drizzle-orm/node-postgres'
import {Pool} from 'pg'
import { createLogger } from '../utils/logger'
import * as schema from './schema'

const logger = createLogger('db-client')

/**
 * Create database connection with support for both local and AWS RDS
 */
const createDatabaseConnection = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const useAwsServices = process.env.USE_AWS_SERVICES === 'true' || isProd

  if (useAwsServices && process.env.DATABASE_URL) {
    // AWS RDS connection (from Secrets Manager or environment)
    logger.info('🔗 Using AWS RDS PostgreSQL connection')
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // AWS RDS requires SSL
      },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    })
  } else if (process.env.DATABASE_URL) {
    // Local PostgreSQL with DATABASE_URL
    logger.info('🔗 Using DATABASE_URL for local PostgreSQL connection')
    return new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  } else {
    // Fallback to explicit local parameters
    logger.info('🔗 Using explicit parameters for local PostgreSQL connection')
    return new Pool({
      host: 'localhost',
      port: 5432,
      database: 'lego_projects',
      user: 'postgres',
      password: 'password',
    })
  }
}

const pool = createDatabaseConnection()

// Handle pool errors
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client')
  process.exit(-1)
})

export const db = drizzle(pool, { schema })
