import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { plans } from '@repo/knowledge-base/db'

const pool = new Pool({
  connectionString: 'postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase',
})
const database = drizzle(pool)

const result = await database.select().from(plans).limit(1)
console.log('Result:', JSON.stringify(result, null, 2))

await pool.end()
