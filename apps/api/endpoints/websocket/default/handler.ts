/**
 * WebSocket $default Handler
 *
 * Handles messages sent from WebSocket clients:
 * - Receives any client-initiated messages
 * - For now, just acknowledges receipt
 * - Can be extended for client-initiated actions (e.g., ping/pong, subscriptions)
 *
 * Story 4.5.5: WebSocket Server for Real-Time Updates
 */

import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { logger } from '@/core/observability/logger'

/**
 * Main handler for $default route
 */
export async function handler(
  event: APIGatewayProxyWebsocketEventV2,
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId
  const body = event.body

  logger.info('WebSocket message received', {
    connectionId,
    routeKey: event.requestContext.routeKey,
    bodyLength: body?.length || 0,
  })

  try {
    // Parse message if present
    if (body) {
      try {
        const message = JSON.parse(body)
        logger.debug('WebSocket message parsed', {
          connectionId,
          messageType: message.type,
        })

        // Future: Handle specific message types
        // e.g., ping/pong, subscribe to channels, etc.
      } catch (parseError) {
        logger.warn('Failed to parse WebSocket message', {
          connectionId,
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
        })
      }
    }

    // Acknowledge receipt
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message received' }),
    }
  } catch (error) {
    logger.error('Failed to process WebSocket message', {
      connectionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }
}
