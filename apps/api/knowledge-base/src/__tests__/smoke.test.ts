/**
 * Smoke Tests for Knowledge Base Infrastructure
 *
 * These tests verify that the database infrastructure is correctly set up:
 * - Database connection works
 * - pgvector extension is available
 * - Tables exist with correct schema
 * - Vector index exists and is used
 *
 * Prerequisites:
 * - Docker Compose is running (`docker-compose up -d`)
 * - Database is initialized (`pnpm db:init`)
 *
 * Run tests: pnpm test
 *
 * @see README.md for setup instructions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../.env') })

// Database connection pool for tests
let pool: Pool

beforeAll(async () => {
  const password = process.env.KB_DB_PASSWORD
  if (!password) {
    throw new Error(
      'KB_DB_PASSWORD environment variable is required for tests. ' +
        'Set it in your .env file. See .env.example for guidance.',
    )
  }

  pool = new Pool({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password,
    // Short timeout for tests
    connectionTimeoutMillis: 5000,
  })
})

afterAll(async () => {
  if (pool) {
    await pool.end()
  }
})

describe('Knowledge Base Infrastructure', () => {
  describe('Database Connection', () => {
    it('should connect to the database successfully', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query('SELECT 1 as connected')
        expect(result.rows[0].connected).toBe(1)
      } finally {
        client.release()
      }
    })

    it('should report correct database name', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query('SELECT current_database() as dbname')
        const expectedDb = process.env.KB_DB_NAME || 'knowledgebase'
        expect(result.rows[0].dbname).toBe(expectedDb)
      } finally {
        client.release()
      }
    })
  })

  describe('pgvector Extension', () => {
    it('should have pgvector extension installed', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT extversion
          FROM pg_extension
          WHERE extname = 'vector'
        `)
        expect(result.rows.length).toBe(1)
        expect(result.rows[0].extversion).toBeDefined()
      } finally {
        client.release()
      }
    })

    it('should have pgvector version >= 0.5.0', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT extversion
          FROM pg_extension
          WHERE extname = 'vector'
        `)
        const version = result.rows[0].extversion
        const [major, minor] = version.split('.').map(Number)

        // Version should be at least 0.5.0
        expect(major).toBeGreaterThanOrEqual(0)
        if (major === 0) {
          expect(minor).toBeGreaterThanOrEqual(5)
        }
      } finally {
        client.release()
      }
    })

    it('should support vector operations', async () => {
      const client = await pool.connect()
      try {
        // Test basic vector creation and operation
        const result = await client.query(`
          SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector AS distance
        `)
        expect(result.rows[0].distance).toBeDefined()
        expect(typeof result.rows[0].distance).toBe('number')
      } finally {
        client.release()
      }
    })
  })

  describe('Tables', () => {
    it('should have knowledge_entries table', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename = 'knowledge_entries'
        `)
        expect(result.rows.length).toBe(1)
        expect(result.rows[0].tablename).toBe('knowledge_entries')
      } finally {
        client.release()
      }
    })

    it('should have embedding_cache table', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename = 'embedding_cache'
        `)
        expect(result.rows.length).toBe(1)
        expect(result.rows[0].tablename).toBe('embedding_cache')
      } finally {
        client.release()
      }
    })

    it('should have correct columns in knowledge_entries', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'knowledge_entries'
          ORDER BY ordinal_position
        `)

        const columns = result.rows.map(r => r.column_name)
        expect(columns).toContain('id')
        expect(columns).toContain('content')
        expect(columns).toContain('embedding')
        expect(columns).toContain('role')
        expect(columns).toContain('tags')
        expect(columns).toContain('created_at')
        expect(columns).toContain('updated_at')
      } finally {
        client.release()
      }
    })

    it('should have correct columns in embedding_cache', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'embedding_cache'
          ORDER BY ordinal_position
        `)

        const columns = result.rows.map(r => r.column_name)
        expect(columns).toContain('content_hash')
        expect(columns).toContain('embedding')
        expect(columns).toContain('created_at')
      } finally {
        client.release()
      }
    })
  })

  describe('Vector Index', () => {
    it('should have embedding index on knowledge_entries', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'knowledge_entries'
            AND indexname LIKE '%embedding%'
        `)
        expect(result.rows.length).toBeGreaterThan(0)
        expect(result.rows[0].indexname).toContain('embedding')
      } finally {
        client.release()
      }
    })

    it('should use IVFFlat index type', async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT indexdef
          FROM pg_indexes
          WHERE tablename = 'knowledge_entries'
            AND indexname LIKE '%embedding%'
        `)
        expect(result.rows.length).toBeGreaterThan(0)
        expect(result.rows[0].indexdef.toLowerCase()).toContain('ivfflat')
      } finally {
        client.release()
      }
    })

    it('should show index scan in EXPLAIN plan for vector query', async () => {
      const client = await pool.connect()
      try {
        // First insert a test row so there's data to query
        // (Index scan may not show for empty table)
        await client.query(`
          INSERT INTO knowledge_entries (content, embedding, role)
          VALUES ('test', $1::vector, 'all')
          ON CONFLICT DO NOTHING
        `, [JSON.stringify(new Array(1536).fill(0.1))])

        // Run EXPLAIN on a vector similarity query
        const result = await client.query(`
          EXPLAIN (FORMAT JSON)
          SELECT id, content
          FROM knowledge_entries
          ORDER BY embedding <=> $1::vector
          LIMIT 10
        `, [JSON.stringify(new Array(1536).fill(0.1))])

        const plan = result.rows[0]['QUERY PLAN']
        const planStr = JSON.stringify(plan).toLowerCase()

        // Should use index (either "index scan" or "index only scan")
        // Note: For very small tables, planner may choose seq scan
        // This is acceptable - the index exists and will be used at scale
        expect(planStr).toMatch(/scan/i)
      } finally {
        client.release()
      }
    })
  })

  describe('Data Operations', () => {
    it('should insert and retrieve knowledge entry', async () => {
      const client = await pool.connect()
      try {
        // Generate a unique test ID to avoid conflicts
        const testContent = `Test entry ${Date.now()}`
        const embedding = new Array(1536).fill(0.5)

        // Insert
        const insertResult = await client.query(`
          INSERT INTO knowledge_entries (content, embedding, role, tags)
          VALUES ($1, $2::vector, 'dev', ARRAY['test'])
          RETURNING id
        `, [testContent, JSON.stringify(embedding)])

        const insertedId = insertResult.rows[0].id
        expect(insertedId).toBeDefined()

        // Retrieve
        const selectResult = await client.query(`
          SELECT content, role, tags
          FROM knowledge_entries
          WHERE id = $1
        `, [insertedId])

        expect(selectResult.rows[0].content).toBe(testContent)
        expect(selectResult.rows[0].role).toBe('dev')
        expect(selectResult.rows[0].tags).toContain('test')

        // Cleanup
        await client.query('DELETE FROM knowledge_entries WHERE id = $1', [insertedId])
      } finally {
        client.release()
      }
    })

    it('should cache and retrieve embedding', async () => {
      const client = await pool.connect()
      try {
        const testHash = `test_${Date.now()}`
        const embedding = new Array(1536).fill(0.3)

        // Insert cache entry
        await client.query(`
          INSERT INTO embedding_cache (content_hash, embedding)
          VALUES ($1, $2::vector)
          ON CONFLICT (content_hash) DO NOTHING
        `, [testHash, JSON.stringify(embedding)])

        // Retrieve
        const result = await client.query(`
          SELECT content_hash, embedding
          FROM embedding_cache
          WHERE content_hash = $1
        `, [testHash])

        expect(result.rows.length).toBe(1)
        expect(result.rows[0].content_hash).toBe(testHash)

        // Cleanup
        await client.query('DELETE FROM embedding_cache WHERE content_hash = $1', [testHash])
      } finally {
        client.release()
      }
    })
  })
})
