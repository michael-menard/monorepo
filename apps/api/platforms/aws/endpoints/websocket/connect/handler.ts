/**
 * WebSocket $connect Handler
 *
 * Handles new WebSocket connections:
 * - Extracts JWT token from query parameters
 * - Verifies JWT with AWS Cognito
 * - Stores connection in DynamoDB with userId mapping
 * - Rejects invalid/expired tokens
 *
 * Story 4.5.5: WebSocket Server for Real-Time Updates
 */

import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { logger } from '@/core/observability/logger'

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({})
const dynamodb = DynamoDBDocumentClient.from(dynamoClient)

// Initialize Cognito JWT Verifier
const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: null, // We don't require client ID for access tokens
})

/**
 * Main handler for $connect route
 */
export async function handler(
  event: APIGatewayProxyWebsocketEventV2,
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId
  const queryParams = (event as any).queryStringParameters || {}

  logger.info('WebSocket connection attempt', {
    connectionId,
    domain: event.requestContext.domainName,
    stage: event.requestContext.stage,
  })

  try {
    // Extract JWT token from query parameters
    const token = queryParams.token

    if (!token) {
      logger.warn('WebSocket connection rejected: Missing token', { connectionId })
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized: Missing token' }),
      }
    }

    // Verify JWT token with Cognito
    let payload
    try {
      payload = await jwtVerifier.verify(token)
    } catch (error) {
      logger.warn('WebSocket connection rejected: Invalid token', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized: Invalid token' }),
      }
    }

    const userId = payload.sub

    // Calculate TTL (2 hours from now)
    const expiresAt = Math.floor(Date.now() / 1000) + 7200

    // Store connection in DynamoDB
    await dynamodb.send(
      new PutCommand({
        TableName: process.env.CONNECTIONS_TABLE_NAME!,
        Item: {
          connectionId,
          userId,
          connectedAt: new Date().toISOString(),
          expiresAt, // TTL for auto-cleanup
        },
      }),
    )

    logger.info('WebSocket connection established', {
      connectionId,
      userId,
      expiresAt,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected' }),
    }
  } catch (error) {
    logger.error('Failed to establish WebSocket connection', {
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
