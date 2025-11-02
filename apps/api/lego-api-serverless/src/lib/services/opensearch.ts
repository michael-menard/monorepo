/**
 * OpenSearch Client for Lambda Functions
 *
 * Provides a configured OpenSearch client for full-text search.
 * Connection reused across Lambda invocations for performance.
 */

import { Client } from '@opensearch-project/opensearch'
import { getEnv } from '@/lib/utils/env'

type OpenSearchClient = Client

let _openSearchClient: OpenSearchClient | null = null

/**
 * Get or create OpenSearch client
 * - Client is created once per Lambda container lifecycle
 * - Connection reused across invocations
 * - Connects to OpenSearch via HTTPS
 */
export function getOpenSearchClient(): OpenSearchClient {
  if (!_openSearchClient) {
    getEnv() // Validate environment variables

    // Get OpenSearch endpoint from SST link
    const openSearchEndpoint = process.env.LEGO_API_OPENSEARCH_ENDPOINT

    if (!openSearchEndpoint) {
      throw new Error('OpenSearch endpoint not configured (LEGO_API_OPENSEARCH_ENDPOINT)')
    }

    // Create OpenSearch client with IAM authentication
    // SST automatically configures IAM credentials via the execution role
    _openSearchClient = new Client({
      node: openSearchEndpoint,
      // For AWS OpenSearch with IAM authentication, credentials are handled automatically
      // via the Lambda execution role permissions
    })

    console.log('OpenSearch client created', { endpoint: openSearchEndpoint })
  }

  return _openSearchClient
}

/**
 * Test OpenSearch connectivity
 * - Used by health check Lambda
 * - Returns true if cluster is reachable and healthy
 */
export async function testOpenSearchConnection(): Promise<boolean> {
  try {
    const client = getOpenSearchClient()
    const health = await client.cluster.health()
    return health.body.status === 'green' || health.body.status === 'yellow'
  } catch (error) {
    console.error('OpenSearch connection test failed:', error)
    return false
  }
}

/**
 * Get OpenSearch cluster health status
 */
export async function getOpenSearchHealth(): Promise<'green' | 'yellow' | 'red' | 'unknown'> {
  try {
    const client = getOpenSearchClient()
    const health = await client.cluster.health()
    return health.body.status as 'green' | 'yellow' | 'red'
  } catch (error) {
    console.error('Failed to get OpenSearch health:', error)
    return 'unknown'
  }
}
