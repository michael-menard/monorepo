import {drizzle} from 'drizzle-orm/node-postgres'
import {Pool} from 'pg'
import * as schema from './schema'

// Create database connection with fallback to explicit parameters
// This ensures connection works even if DATABASE_URL isn't properly loaded
const createDatabaseConnection = () => {
  // Try DATABASE_URL first
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL for database connection')
    return new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }

  // Fallback to explicit parameters (which we know work)
  console.log('🔗 Using explicit parameters for database connection')
  return new Pool({
    host: 'localhost',
    port: 5432,
    database: 'lego_projects',
    user: 'postgres',
    password: 'password',
  })
}

const pool = createDatabaseConnection()

export const db = drizzle(pool, { schema })
