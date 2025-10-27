import {drizzle} from 'drizzle-orm/node-postgres'
import {Pool} from 'pg'
import * as schema from './schema'

/**
 * Create database connection with support for both local and AWS RDS
 */
const createDatabaseConnection = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const useAwsServices = process.env.USE_AWS_SERVICES === 'true' || isProd

  if (useAwsServices && process.env.DATABASE_URL) {
    // AWS RDS connection (from Secrets Manager or environment)
    console.log('🔗 Using AWS RDS PostgreSQL connection')
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
    console.log('🔗 Using DATABASE_URL for local PostgreSQL connection')
    return new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  } else {
    // Fallback to explicit local parameters
    console.log('🔗 Using explicit parameters for local PostgreSQL connection')
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
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

export const db = drizzle(pool, { schema })
