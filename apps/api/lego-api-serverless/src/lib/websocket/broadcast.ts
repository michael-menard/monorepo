/**
 * WebSocket Broadcast Utilities
 *
 * Provides helper functions for broadcasting messages to WebSocket connections.
 * Used by other Lambda functions to send real-time updates (upload progress,
 * notifications, etc.) to connected clients.
 *
 * Story 4.5.5: WebSocket Server for Real-Time Updates
 */

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { logger } from '../utils/logger'
import type { WebSocketMessage } from './message-types'

// Initialize clients
const dynamoClient = new DynamoDBClient({})
const dynamodb = DynamoDBDocumentClient.from(dynamoClient)

/**
 * Get API Gateway Management API client for WebSocket messaging
 * Endpoint must be constructed from WebSocket API URL
 */
function getWebSocketClient(): ApiGatewayManagementApiClient {
  // WebSocket endpoint format: wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}
  // Management API endpoint: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
  const websocketUrl = process.env.WEBSOCKET_API_ENDPOINT

  if (!websocketUrl) {
    throw new Error('WEBSOCKET_API_ENDPOINT environment variable not set')
  }

  return new ApiGatewayManagementApiClient({
    endpoint: websocketUrl,
  })
}

/**
 * Broadcast message to all connections for a specific user
 *
 * @param userId - The user ID to broadcast to
 * @param message - The message to send (without timestamp)
 * @returns Promise that resolves when all messages are sent
 *
 * @example
 * await broadcastToUser(userId, {
 *   type: 'upload_progress',
 *   data: {
 *     uploadId: 'abc123',
 *     fileName: 'image.jpg',
 *     progress: 45,
 *     message: 'Processing...'
 *   }
 * })
 */
export async function broadcastToUser(
  userId: string,
  message: Omit<WebSocketMessage, 'timestamp'>
): Promise<void> {
  logger.info('Broadcasting message to user', {
    userId,
    messageType: message.type,
  })

  try {
    // Query all connections for this user via GSI
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: process.env.CONNECTIONS_TABLE_NAME!,
        IndexName: 'userIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    )

    const connections = result.Items || []

    if (connections.length === 0) {
      logger.info('No active connections for user', { userId })
      return
    }

    logger.info(`Broadcasting to ${connections.length} connection(s)`, {
      userId,
      connectionCount: connections.length,
    })

    // Broadcast to all user connections
    const promises = connections.map((conn) =>
      broadcastToConnection(conn.connectionId as string, message)
    )

    await Promise.allSettled(promises)
  } catch (error) {
    logger.error('Failed to broadcast to user', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}

/**
 * Broadcast message to a specific connection
 *
 * @param connectionId - The connection ID to send to
 * @param message - The message to send (without timestamp)
 * @returns Promise that resolves when message is sent
 *
 * @example
 * await broadcastToConnection(connectionId, {
 *   type: 'notification',
 *   data: {
 *     title: 'Upload Complete',
 *     message: 'Your file has been uploaded successfully',
 *     severity: 'success'
 *   }
 * })
 */
export async function broadcastToConnection(
  connectionId: string,
  message: Omit<WebSocketMessage, 'timestamp'>
): Promise<void> {
  const client = getWebSocketClient()

  // Add timestamp to message
  const fullMessage: WebSocketMessage = {
    ...message,
    timestamp: new Date().toISOString(),
  }

  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(fullMessage)),
      })
    )

    logger.debug('Message sent to connection', {
      connectionId,
      messageType: message.type,
    })
  } catch (error) {
    // Connection is stale (410 GoneException)
    if (error instanceof GoneException) {
      logger.info('Stale connection detected, removing from database', {
        connectionId,
      })

      // Clean up stale connection
      await dynamodb.send(
        new DeleteCommand({
          TableName: process.env.CONNECTIONS_TABLE_NAME!,
          Key: { connectionId },
        })
      )
    } else {
      logger.error('Failed to send message to connection', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }
}

/**
 * Broadcast message to multiple connections
 *
 * @param connectionIds - Array of connection IDs to send to
 * @param message - The message to send (without timestamp)
 * @returns Promise that resolves when all messages are sent
 */
export async function broadcastToConnections(
  connectionIds: string[],
  message: Omit<WebSocketMessage, 'timestamp'>
): Promise<void> {
  logger.info('Broadcasting to multiple connections', {
    connectionCount: connectionIds.length,
    messageType: message.type,
  })

  const promises = connectionIds.map((connectionId) =>
    broadcastToConnection(connectionId, message)
  )

  await Promise.allSettled(promises)
}
