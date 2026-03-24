import pg from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

// Parse .env file
const envPath = join(process.cwd(), 'apps/api/knowledge-base/.env')
const envContent = readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc: Record<string, string>, line) => {
    const [key, ...value] = line.split('=')
    acc[key] = value.join('=')
    return acc
  }, {})

async function main() {
  const client = new pg.Client({
    host: envContent.PGHOST || 'localhost',
    port: parseInt(envContent.PGPORT || '5432'),
    user: envContent.PGUSER || 'postgres',
    password: envContent.PGPASSWORD,
    database: envContent.PGDATABASE || 'lego',
    connectionTimeoutMillis: 5000,
  })

  try {
    await client.connect()
    
    // Query for story and artifacts
    const result = await client.query(`
      SELECT 
        s.id,
        s.state,
        s.created_at,
        json_agg(json_build_object(
          'id', a.id,
          'type', a.type,
          'name', a.name,
          'created_at', a.created_at
        )) FILTER (WHERE a.id IS NOT NULL) as artifacts
      FROM public.story s
      LEFT JOIN public.artifact a ON a.story_id = s.id
      WHERE s.id = 'APRS-3010'
      GROUP BY s.id, s.state, s.created_at
    `)
    
    if (result.rows.length === 0) {
      console.log('STORY_NOT_FOUND')
      process.exit(1)
    }
    
    const story = result.rows[0]
    console.log(JSON.stringify(story, null, 2))
    
    process.exit(0)
  } catch (error: any) {
    console.error('ERROR:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
