import type { Config } from 'drizzle-kit'

/**
 * Drizzle Kit Configuration for Umami Analytics Schema
 *
 * This configuration manages the Umami analytics schema in the 'umami' PostgreSQL namespace.
 * It uses separate credentials from AWS Secrets Manager for security isolation.
 *
 * Story 1.2: Aurora PostgreSQL Schema for Umami
 *
 * Usage:
 * - `npx drizzle-kit generate --config drizzle.umami.config.ts` - Generate migration files
 * - `npx drizzle-kit push --config drizzle.umami.config.ts` - Push schema changes directly
 * - `npx drizzle-kit studio --config drizzle.umami.config.ts` - Open Drizzle Studio for Umami schema
 * - `npx drizzle-kit migrate --config drizzle.umami.config.ts` - Apply migrations
 *
 * Environment Variables (for development):
 * - UMAMI_DATABASE_URL: Connection string for umami_user
 *   Format: postgresql://umami_user:password@host:5432/database?schema=umami
 *
 * For production, credentials are retrieved from AWS Secrets Manager automatically.
 */

export default {
  schema: './core/database/schema/umami.ts',
  out: './core/database/migrations/umami',
  dialect: 'postgresql',
  schemaFilter: ['umami'], // Only manage tables in the 'umami' schema
  dbCredentials: {
    // Development: Use environment variable if available
    url: process.env.UMAMI_DATABASE_URL || buildConnectionString(),
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'umami',
    table: '_prisma_migrations',
    schema: 'umami',
  },
} satisfies Config

/**
 * Build connection string from individual environment variables
 * Fallback when UMAMI_DATABASE_URL is not set
 */
function buildConnectionString(): string {
  const host = process.env.POSTGRES_HOST || 'localhost'
  const port = process.env.POSTGRES_PORT || '5432'
  const database = process.env.POSTGRES_DATABASE || 'lego_projects'
  const username = process.env.UMAMI_USERNAME || 'umami_user'
  const password = process.env.UMAMI_PASSWORD || ''

  if (!password) {
    throw new Error(
      'Umami database credentials not found. ' +
        'Set UMAMI_DATABASE_URL or UMAMI_PASSWORD environment variable, ' +
        'or run the setup script first: npm run db:setup-umami',
    )
  }

  return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=umami`
}
