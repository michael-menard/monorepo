import type { Config } from 'drizzle-kit'

/**
 * Drizzle Kit Configuration for SST Serverless Migration
 *
 * This configuration connects to the RDS PostgreSQL database provisioned by SST.
 * Database credentials are automatically provided via SST Resource linking at runtime.
 *
 * Usage:
 * - `pnpm db:generate` - Generate migration files from schema changes
 * - `pnpm db:migrate` - Apply pending migrations to database
 * - `pnpm db:push` - Push schema changes directly (dev only)
 * - `pnpm db:studio` - Open Drizzle Studio GUI
 */

export default {
  schema: './core/database/schema/index.ts',
  out: './core/database/migrations/app',
  dialect: 'postgresql',
  dbCredentials: {
    // These environment variables are auto-populated by SST Resource linking
    // See sst.config.ts for Resource definitions
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
