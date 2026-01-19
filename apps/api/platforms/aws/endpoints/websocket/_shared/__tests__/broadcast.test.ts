/**
 * Unit tests for WebSocket broadcast utilities
 * Story 4.5.5.1: Add automated tests for WebSocket server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { broadcastToUser, broadcastToConnection, broadcastToConnections } from '../broadcast'

// Mock logger to prevent console output during tests
vi.mock('@/core/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const dynamoMock = mockClient(DynamoDBDocumentClient)
const apiGatewayMock = mockClient(ApiGatewayManagementApiClient)

describe('WebSocket Broadcast Utilities', () => {
  const mockUserId = 'user-123'
  const mockConnectionId1 = 'conn-1'
  const mockConnectionId2 = 'conn-2'
  const mockWebsocketEndpoint = 'https://test-api.execute-api.us-east-1.amazonaws.com/test'

  beforeEach(() => {
    dynamoMock.reset()
    apiGatewayMock.reset()
    vi.clearAllMocks()

    // Set environment variables
    process.env.CONNECTIONS_TABLE_NAME = 'test-connections-table'
    process.env.WEBSOCKET_API_ENDPOINT = mockWebsocketEndpoint
  })

  describe('broadcastToUser', () => {
    it('should send message to all user connections', async () => {
      // Mock DynamoDB query returning multiple connections
      dynamoMock.on(QueryCommand).resolves({
        Items: [
          { connectionId: mockConnectionId1, userId: mockUserId },
          { connectionId: mockConnectionId2, userId: mockUserId },
        ],
      })

      // Mock successful message sending
      apiGatewayMock.on(PostToConnectionCommand).resolves({})

      const message = {
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test message',
          severity: 'info' as const,
        },
      }

      await broadcastToUser(mockUserId, message)

      // Verify query was made
      const queryCalls = dynamoMock.commandCalls(QueryCommand)
      expect(queryCalls).toHaveLength(1)
      expect(queryCalls[0].args[0].input.IndexName).toBe('userIdIndex')
      expect(queryCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
        ':userId': mockUserId,
      })

      // Verify messages were sent to both connections
      const postCalls = apiGatewayMock.commandCalls(PostToConnectionCommand)
      expect(postCalls).toHaveLength(2)

      // Check first connection
      expect(postCalls[0].args[0].input.ConnectionId).toBe(mockConnectionId1)
      const message1 = JSON.parse(postCalls[0].args[0].input.Data?.toString() || '{}')
      expect(message1.type).toBe('notification')
      expect(message1.timestamp).toBeDefined()

      // Check second connection
      expect(postCalls[1].args[0].input.ConnectionId).toBe(mockConnectionId2)
      const message2 = JSON.parse(postCalls[1].args[0].input.Data?.toString() || '{}')
      expect(message2.type).toBe('notification')
      expect(message2.timestamp).toBeDefined()
    })

    it('should handle no active connections gracefully', async () => {
      // Mock DynamoDB query returning no connections
      dynamoMock.on(QueryCommand).resolves({ Items: [] })

      const message = {
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test message',
          severity: 'info' as const,
        },
      }

      await broadcastToUser(mockUserId, message)

      // Verify no messages were sent
      expect(apiGatewayMock.commandCalls(PostToConnectionCommand)).toHaveLength(0)
    })
  })

  describe('broadcastToConnection', () => {
    it('should send message to specific connection', async () => {
      apiGatewayMock.on(PostToConnectionCommand).resolves({})

      const message = {
        type: 'upload_progress' as const,
        data: {
          uploadId: 'upload-123',
          fileName: 'test.jpg',
          progress: 50,
          message: 'Uploading...',
        },
      }

      await broadcastToConnection(mockConnectionId1, message)

      const postCalls = apiGatewayMock.commandCalls(PostToConnectionCommand)
      expect(postCalls).toHaveLength(1)

      expect(postCalls[0].args[0].input.ConnectionId).toBe(mockConnectionId1)

      const sentMessage = JSON.parse(postCalls[0].args[0].input.Data?.toString() || '{}')
      expect(sentMessage.type).toBe('upload_progress')
      expect(sentMessage.data.uploadId).toBe('upload-123')
      expect(sentMessage.data.progress).toBe(50)
      expect(sentMessage.timestamp).toBeDefined()
      expect(sentMessage.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should clean up stale connection on 410 GoneException', async () => {
      // Mock 410 GoneException when trying to send message
      apiGatewayMock.on(PostToConnectionCommand).rejects(
        new GoneException({
          $metadata: {},
          message: 'Connection is gone',
        })
      )

      dynamoMock.on(DeleteCommand).resolves({})

      const message = {
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test message',
          severity: 'info' as const,
        },
      }

      // Should not throw error
      await expect(broadcastToConnection(mockConnectionId1, message)).resolves.toBeUndefined()

      // Verify connection was deleted from DynamoDB
      const deleteCalls = dynamoMock.commandCalls(DeleteCommand)
      expect(deleteCalls).toHaveLength(1)
      expect(deleteCalls[0].args[0].input.Key).toEqual({ connectionId: mockConnectionId1 })
    })

    it('should throw error on non-410 failures', async () => {
      // Mock non-410 error
      apiGatewayMock.on(PostToConnectionCommand).rejects(new Error('Network error'))

      const message = {
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test message',
          severity: 'info' as const,
        },
      }

      await expect(broadcastToConnection(mockConnectionId1, message)).rejects.toThrow(
        'Network error'
      )

      // Verify no delete was attempted
      expect(dynamoMock.commandCalls(DeleteCommand)).toHaveLength(0)
    })
  })

  describe('broadcastToConnections', () => {
    it('should broadcast to multiple specific connections', async () => {
      apiGatewayMock.on(PostToConnectionCommand).resolves({})

      const message = {
        type: 'error' as const,
        data: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
      }

      const connectionIds = [mockConnectionId1, mockConnectionId2]
      await broadcastToConnections(connectionIds, message)

      const postCalls = apiGatewayMock.commandCalls(PostToConnectionCommand)
      expect(postCalls).toHaveLength(2)

      expect(postCalls[0].args[0].input.ConnectionId).toBe(mockConnectionId1)
      expect(postCalls[1].args[0].input.ConnectionId).toBe(mockConnectionId2)

      // Verify both messages have the correct type
      const message1 = JSON.parse(postCalls[0].args[0].input.Data?.toString() || '{}')
      const message2 = JSON.parse(postCalls[1].args[0].input.Data?.toString() || '{}')

      expect(message1.type).toBe('error')
      expect(message2.type).toBe('error')
    })
  })

  describe('Message Formatting', () => {
    it('should add timestamp to all messages', async () => {
      apiGatewayMock.on(PostToConnectionCommand).resolves({})

      const beforeSend = new Date().toISOString()

      const message = {
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test message',
          severity: 'info' as const,
        },
      }

      await broadcastToConnection(mockConnectionId1, message)

      const afterSend = new Date().toISOString()

      const postCalls = apiGatewayMock.commandCalls(PostToConnectionCommand)
      const sentMessage = JSON.parse(postCalls[0].args[0].input.Data?.toString() || '{}')

      expect(sentMessage.timestamp).toBeDefined()
      expect(sentMessage.timestamp >= beforeSend).toBe(true)
      expect(sentMessage.timestamp <= afterSend).toBe(true)
    })
  })
})
