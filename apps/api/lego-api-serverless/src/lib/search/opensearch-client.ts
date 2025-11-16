/**
 * OpenSearch Client for Full-Text Search
 *
 * Provides configured OpenSearch client for indexing and searching.
 */

import { Client } from '@opensearch-project/opensearch'
import { getEnv } from '@/lib/utils/env'

let _openSearchClient: Client | null = null

/**
 * Get or create OpenSearch client instance
 * - Client is reused across Lambda invocations
 */
export async function getOpenSearchClient(): Promise<Client> {
  if (!_openSearchClient) {
    const env = getEnv()

    _openSearchClient = new Client({
      node: `https://${env.OPENSEARCH_ENDPOINT}`,
      // Add authentication if needed
      // auth: {
      //   username: env.OPENSEARCH_USERNAME,
      //   password: env.OPENSEARCH_PASSWORD,
      // },
    })
  }

  return _openSearchClient
}

/**
 * Index document in OpenSearch
 */
export async function indexDocument(params: {
  index: string
  id: string
  body: Record<string, unknown>
}): Promise<void> {
  const client = await getOpenSearchClient()

  await client.index({
    index: params.index,
    id: params.id,
    body: params.body,
    refresh: true, // Make immediately searchable
  })
}

/**
 * Delete document from OpenSearch
 */
export async function deleteDocument(params: { index: string; id: string }): Promise<void> {
  const client = await getOpenSearchClient()

  try {
    await client.delete({
      index: params.index,
      id: params.id,
    })
  } catch (error) {
    // Ignore 404 errors (document doesn't exist)
    if (error && typeof error === 'object' && 'meta' in error) {
      const errorWithMeta = error as { meta?: { statusCode?: number } }
      if (errorWithMeta.meta?.statusCode !== 404) {
        throw error
      }
    } else {
      throw error
    }
  }
}

/**
 * Search documents in OpenSearch
 */
export async function searchDocuments(params: {
  index: string
  query: Record<string, unknown>
  from?: number
  size?: number
}): Promise<{ hits: { hits: Array<{ _source: Record<string, unknown> }> } }> {
  const client = await getOpenSearchClient()

  const result = await client.search({
    index: params.index,
    body: {
      query: params.query,
      from: params.from || 0,
      size: params.size || 20,
    },
  })

  return result.body as { hits: { hits: Array<{ _source: Record<string, unknown> }> } }
}
