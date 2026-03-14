import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '../../../.env.local' })
config({ path: '../../../.env' })

export default {
  schema: './src/schema/index.ts',
  out: './src/migrations/app',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'monorepo',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: true,
} satisfies Config
