/**
 * Health Check Lambda Function
 *
 * Validates connectivity to all infrastructure dependencies:
 * - PostgreSQL (RDS with Proxy)
 * - Redis (ElastiCache)
 * - OpenSearch
 *
 * Returns:
 * - 200: All services healthy
 * - 200: Some services degraded (Redis/OpenSearch optional)
 * - 503: Critical services unavailable (PostgreSQL required)
 *
 * API Gateway Endpoint: GET /health
 */

import {
  healthCheckResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
  HealthCheckData,
} from '@monorepo/lambda-responses'
import { testConnection } from '@/lib/db/client'
import { testRedisConnection } from '@/lib/cache/redis-client'
import { testOpenSearchConnection } from '@/lib/search/opensearch-client'
import { ServiceUnavailableError } from '@monorepo/lambda-responses'
import { logger } from '../lib/utils/logger'

/**
 * Health Check Handler
 * - Checks all service dependencies in parallel
 * - Returns overall health status
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Health check initiated', {
      requestId: event.requestContext.requestId,
      stage: process.env.STAGE,
    })

    // Test all services in parallel for faster response
    const [postgresHealthy, redisHealthy, openSearchHealthy] = await Promise.all([
      testConnection(),
      testRedisConnection(),
      testOpenSearchConnection(),
    ])

    // Determine overall health status
    const status = determineHealthStatus(postgresHealthy, redisHealthy, openSearchHealthy)

    const healthData: HealthCheckData = {
      status,
      services: {
        postgres: postgresHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
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
  } catch (error) {
    logger.error('Health check failed:', error)
    return errorResponseFromError(error)
  }
}

/**
 * Determine overall health status based on service availability
 * - healthy: All services connected
 * - degraded: Optional services (Redis/OpenSearch) down
 * - unhealthy: Critical service (PostgreSQL) down
 */
function determineHealthStatus(
  postgres: boolean,
  redis: boolean,
  opensearch: boolean,
): 'healthy' | 'degraded' | 'unhealthy' {
  // PostgreSQL is critical - if down, system is unhealthy
  if (!postgres) {
    return 'unhealthy'
  }

  // If all services up, system is healthy
  if (redis && opensearch) {
    return 'healthy'
  }

  // If PostgreSQL up but Redis/OpenSearch down, system is degraded
  return 'degraded'
}
