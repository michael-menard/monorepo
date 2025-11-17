/**
 * WebSocket $disconnect Handler
 *
 * Handles WebSocket disconnections:
 * - Removes connection from DynamoDB
 * - Ensures cleanup of stale connections
 *
 * Story 4.5.5: WebSocket Server for Real-Time Updates
 */

import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { logger } from '../../src/lib/utils/logger'

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({})
const dynamodb = DynamoDBDocumentClient.from(dynamoClient)

/**
 * Main handler for $disconnect route
 */
export async function handler(
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId

  logger.info('WebSocket disconnection', { connectionId })

  try {
    // Remove connection from DynamoDB
    await dynamodb.send(
      new DeleteCommand({
        TableName: process.env.CONNECTIONS_TABLE_NAME!,
        Key: { connectionId },
      })
    )

    logger.info('WebSocket connection removed from database', { connectionId })

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' }),
    }
  } catch (error) {
    logger.error('Failed to remove WebSocket connection', {
      connectionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Still return 200 - disconnection should always succeed
    // Even if DynamoDB cleanup fails, the connection is already closed
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' }),
    }
  }
}
