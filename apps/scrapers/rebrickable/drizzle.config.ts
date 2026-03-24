import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '.env' })

function getDbPassword(): string {
  const password = process.env.SCRAPER_DB_PASSWORD
  if (!password) {
    throw new Error(
      'SCRAPER_DB_PASSWORD environment variable is required. ' +
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
    host: process.env.SCRAPER_DB_HOST || 'localhost',
    port: parseInt(process.env.SCRAPER_DB_PORT || '5432'),
    user: process.env.SCRAPER_DB_USER || 'postgres',
    password: getDbPassword(),
    database: process.env.SCRAPER_DB_NAME || 'rebrickable',
    ssl: false,
  },
  verbose: true,
  strict: true,
} satisfies Config
