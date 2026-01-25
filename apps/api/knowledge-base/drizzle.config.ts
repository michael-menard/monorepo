import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

// Load .env for local development
config({ path: '.env' })

/**
 * Drizzle Kit Configuration for Knowledge Base
 *
 * This configuration connects to the local PostgreSQL database with pgvector.
 * Database credentials are provided via KB_DB_* environment variables.
 *
 * Usage:
 * - `pnpm db:generate` - Generate migration files from schema changes
 * - `pnpm db:migrate` - Apply pending migrations to database
 * - `pnpm db:push` - Push schema changes directly (dev only)
 * - `pnpm db:studio` - Open Drizzle Studio GUI
 *
 * IMPORTANT:
 * - Port 5433 is used by default to avoid conflict with root docker-compose (5432)
 * - VECTOR(1536) dimension is tied to OpenAI text-embedding-3-small model
 */

function getDbPassword(): string {
  const password = process.env.KB_DB_PASSWORD
  if (!password) {
    throw new Error(
      'KB_DB_PASSWORD environment variable is required. ' +
        'Set it in your .env file. See .env.example for guidance.',
    )
  }
  return password
}

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433'),
    user: process.env.KB_DB_USER || 'kbuser',
    password: getDbPassword(),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    ssl: false, // Local development only
  },
  verbose: true,
  strict: true,
} satisfies Config
