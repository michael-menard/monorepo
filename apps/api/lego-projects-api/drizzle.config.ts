import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Get database configuration for Drizzle migrations
 */
const getDatabaseUrl = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const useAwsServices = process.env.USE_AWS_SERVICES === 'true' || isProd

  if (useAwsServices && process.env.DATABASE_URL) {
    // AWS RDS connection
    console.log('🔗 Using AWS RDS for Drizzle migrations')
    return process.env.DATABASE_URL
  } else {
    // Local PostgreSQL connection
    return process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/lego_projects'
  }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
    ssl: process.env.USE_AWS_SERVICES === 'true' ? { rejectUnauthorized: false } : false,
  },
})
