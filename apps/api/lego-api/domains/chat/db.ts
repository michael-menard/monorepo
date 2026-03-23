import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

let _pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env.KB_DATABASE_URL
    if (!connectionString) {
      throw new Error('KB_DATABASE_URL environment variable is required for chat domain')
    }
    _pool = new pg.Pool({ connectionString, max: 5 })
  }
  return _pool
}

export function getDb() {
  return drizzle(getPool(), { schema })
}

export type ChatDb = ReturnType<typeof getDb>
