/**
 * Test Setup for Embedding Client Tests
 *
 * Provides:
 * - MSW mocks for OpenAI API
 * - Test fixtures (mock embeddings)
 * - Helper functions for database setup/teardown
 */

import { Pool } from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../../.env') })

/**
 * Generate a mock 1536-dimensional embedding vector
 */
export function generateMockEmbedding(seed = 0.5): number[] {
  return new Array(1536).fill(seed)
}

/**
 * Generate multiple mock embeddings with different seeds
 */
export function generateMockEmbeddings(count: number): number[][] {
  return Array.from({ length: count }, (_, i) => generateMockEmbedding(0.1 + i * 0.1))
}

/**
 * Mock OpenAI API response structure
 */
export function createMockOpenAIResponse(
  embeddings: number[][],
  model = 'text-embedding-3-small',
  tokens = 10,
) {
  return {
    object: 'list' as const,
    data: embeddings.map((embedding, index) => ({
      object: 'embedding' as const,
      embedding,
      index,
    })),
    model,
    usage: {
      prompt_tokens: tokens,
      total_tokens: tokens,
    },
  }
}

/**
 * Database pool for test cleanup
 */
let testPool: Pool | null = null

/**
 * Get or create database pool for tests
 */
export function getTestPool(): Pool {
  if (!testPool) {
    const password = process.env.KB_DB_PASSWORD
    if (!password) {
      throw new Error('KB_DB_PASSWORD environment variable is required for tests')
    }

    testPool = new Pool({
      host: process.env.KB_DB_HOST || 'localhost',
      port: parseInt(process.env.KB_DB_PORT || '5433', 10),
      database: process.env.KB_DB_NAME || 'knowledgebase',
      user: process.env.KB_DB_USER || 'kbuser',
      password,
      connectionTimeoutMillis: 5000,
    })
  }

  return testPool
}

/**
 * Clear embedding cache table before each test
 */
export async function clearEmbeddingCache(): Promise<void> {
  const pool = getTestPool()
  const client = await pool.connect()
  try {
    await client.query('DELETE FROM embedding_cache')
  } finally {
    client.release()
  }
}

/**
 * Insert test cache entry
 */
export async function insertTestCacheEntry(
  contentHash: string,
  embedding: number[],
  model = 'text-embedding-3-small',
): Promise<void> {
  const pool = getTestPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
      INSERT INTO embedding_cache (content_hash, model, embedding)
      VALUES ($1, $2, $3::vector)
      ON CONFLICT (content_hash, model) DO NOTHING
    `,
      [contentHash, model, JSON.stringify(embedding)],
    )
  } finally {
    client.release()
  }
}

/**
 * Get cache entry count
 */
export async function getCacheEntryCount(): Promise<number> {
  const pool = getTestPool()
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT COUNT(*) FROM embedding_cache')
    return parseInt(result.rows[0].count, 10)
  } finally {
    client.release()
  }
}

/**
 * Check if cache entry exists
 */
export async function cacheEntryExists(
  contentHash: string,
  model = 'text-embedding-3-small',
): Promise<boolean> {
  const pool = getTestPool()
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT 1 FROM embedding_cache WHERE content_hash = $1 AND model = $2',
      [contentHash, model],
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

/**
 * Cleanup: close pool after all tests
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end()
    testPool = null
  }
}
