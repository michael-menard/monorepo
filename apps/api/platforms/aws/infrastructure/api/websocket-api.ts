/**
 * WebSocket API Gateway Configuration
 *
 * Creates WebSocket API Gateway with:
 * - Real-time bidirectional communication
 * - Used for upload progress, notifications, and real-time updates
 * - JWT authentication on connection
 * - DynamoDB table for connection tracking
 */

export function createWebSocketApi(stage: string) {
  /**
   * DynamoDB Table for WebSocket Connection Tracking
   * - Stores active WebSocket connections with user mapping
   * - TTL for automatic cleanup of stale connections (2 hours)
   * - Global secondary index on userId for efficient user lookups
   */
  const websocketConnectionsTable = new sst.aws.Dynamo('WebSocketConnections', {
    fields: {
      connectionId: 'string',
      userId: 'string',
    },
    primaryIndex: { hashKey: 'connectionId' },
    globalIndexes: {
      UserIdIndex: { hashKey: 'userId' },
    },
    ttl: 'ttl', // TTL field for automatic cleanup
    transform: {
      table: args => {
        args.tags = {
          Environment: stage,
          Project: 'lego-api-serverless',
          Service: 'WebSocket',
        }
      },
    },
  })

  /**
   * WebSocket API Gateway
   * - Provides real-time bidirectional communication
   * - Used for upload progress, notifications, and real-time updates
   * - JWT authentication on connection
   */
  const websocketApi = new sst.aws.ApiGatewayWebSocket('WebSocketApi')

  return {
    websocketApi,
    websocketConnectionsTable,
  }
}
