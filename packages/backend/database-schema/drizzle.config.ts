import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

// Load environment variables from monorepo root
config({ path: '../../../.env.local' })
config({ path: '../../../.env' })

/**
 * Drizzle Kit Configuration
 *
 * Usage:
 * - `pnpm db:generate` - Generate migration files from schema changes
 * - `pnpm db:migrate` - Apply pending migrations to database
 * - `pnpm db:push` - Push schema changes directly (dev only)
 * - `pnpm db:studio` - Open Drizzle Studio GUI
 */

export default {
  schema: './src/schema/index.ts',
  out: './src/migrations/app',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'lego_projects',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: true,
} satisfies Config
