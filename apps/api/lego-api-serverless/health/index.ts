/**
 * Health Check Lambda Function
 *
 * Validates connectivity to all infrastructure dependencies:
 * - PostgreSQL (RDS with Proxy)
 * - OpenSearch
 *
 * Returns:
 * - 200: All services healthy
 * - 200: Some services degraded (OpenSearch optional)
 * - 503: Critical services unavailable (PostgreSQL required)
 *
 * API Gateway Endpoint: GET /health
 */

import {
  healthCheckResponse,
  type APIGatewayProxyResult,
  HealthCheckData,
} from '@monorepo/lambda-responses'
import { testConnection } from '@/lib/db/client'
import { testOpenSearchConnection } from '@/lib/search/opensearch-client'
import { ServiceUnavailableError } from '@monorepo/lambda-responses'
import { withErrorHandling } from '@/lib/utils/lambda-wrapper'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('health-check')

/**
 * Health Check Handler
 * - Checks all service dependencies in parallel
 * - Returns overall health status
 * - Wrapped with withErrorHandling for consistent error handling and metrics
 */
export const handler = withErrorHandling(
  async (event: any): Promise<APIGatewayProxyResult> => {
    logger.info('Health check initiated', {
      requestId: event.requestContext.requestId,
      stage: process.env.STAGE,
    })

    // Test all services in parallel for faster response
    const [postgresHealthy, openSearchHealthy] = await Promise.all([
      testConnection(),
      testOpenSearchConnection(),
    ])

    // Determine overall health status
    const status = determineHealthStatus(postgresHealthy, openSearchHealthy)

    const healthData: HealthCheckData = {
      status,
      services: {
        postgres: postgresHealthy ? 'connected' : 'disconnected',
        opensearch: openSearchHealthy ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    }

    logger.info('Health check completed', healthData)

    // If PostgreSQL is down, return 503 (critical service)
    if (!postgresHealthy) {
      throw new ServiceUnavailableError('Database connection failed', {
        services: healthData.services,
        timestamp: healthData.timestamp,
      })
    }

    return healthCheckResponse(healthData)
  },
  {
    functionName: 'HealthCheck',
    logRequest: true,
    logResponse: true,
  },
)

/**
 * Determine overall health status based on service availability
 * - healthy: All services connected
 * - degraded: Optional services (OpenSearch) down
 * - unhealthy: Critical service (PostgreSQL) down
 */
function determineHealthStatus(
  postgres: boolean,
  opensearch: boolean,
): 'healthy' | 'degraded' | 'unhealthy' {
  // PostgreSQL is critical - if down, system is unhealthy
  if (!postgres) {
    return 'unhealthy'
  }

  // If all services up, system is healthy
  if (opensearch) {
    return 'healthy'
  }

  // If PostgreSQL up but OpenSearch down, system is degraded
  return 'degraded'
}
