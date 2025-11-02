/**
 * OpenSearch Client for Lambda Functions
 *
 * Provides a configured OpenSearch client for full-text search.
 * Connection reused across Lambda invocations for performance.
 */

import { getEnv } from '@/lib/utils/env';

// Type placeholder for OpenSearch client (will be replaced when package is installed)
type OpenSearchClient = any;

let _openSearchClient: OpenSearchClient | null = null;

/**
 * Get or create OpenSearch client
 * - Client is created once per Lambda container lifecycle
 * - Connection reused across invocations
 */
export function getOpenSearchClient(): OpenSearchClient {
  if (!_openSearchClient) {
    getEnv(); // Validate environment variables

    // Placeholder - will be replaced with actual Client import when @opensearch-project/client is installed
    _openSearchClient = {
      cluster: {
        health: async () => ({
          body: { status: 'green' },
        }),
      },
    };
  }

  return _openSearchClient;
}

/**
 * Test OpenSearch connectivity
 * - Used by health check Lambda
 * - Returns true if cluster is reachable and healthy
 */
export async function testOpenSearchConnection(): Promise<boolean> {
  try {
    const client = getOpenSearchClient();
    const health = await client.cluster.health();
    return health.body.status === 'green' || health.body.status === 'yellow';
  } catch (error) {
    console.error('OpenSearch connection test failed:', error);
    return false;
  }
}

/**
 * Get OpenSearch cluster health status
 */
export async function getOpenSearchHealth(): Promise<'green' | 'yellow' | 'red' | 'unknown'> {
  try {
    const client = getOpenSearchClient();
    const health = await client.cluster.health();
    return health.body.status as 'green' | 'yellow' | 'red';
  } catch (error) {
    console.error('Failed to get OpenSearch health:', error);
    return 'unknown';
  }
}
