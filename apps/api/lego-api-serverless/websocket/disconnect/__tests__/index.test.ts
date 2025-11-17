/**
 * Unit tests for WebSocket $disconnect handler
 * Story 4.5.5.1: Add automated tests for WebSocket server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda'
import { handler } from '../index'

// Mock logger to prevent console output during tests
vi.mock('../../../src/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const dynamoMock = mockClient(DynamoDBDocumentClient)

describe('WebSocket $disconnect Handler', () => {
  const mockConnectionId = 'test-connection-123'

  beforeEach(() => {
    dynamoMock.reset()
    vi.clearAllMocks()

    // Set environment variables
    process.env.CONNECTIONS_TABLE_NAME = 'test-connections-table'
  })

  const createMockEvent = (): APIGatewayProxyWebsocketEventV2 => ({
    requestContext: {
      connectionId: mockConnectionId,
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      stage: 'test',
      routeKey: '$disconnect',
      apiId: 'test-api-id',
      requestId: 'test-request-id',
      requestTime: '01/Jan/2025:00:00:00 +0000',
      requestTimeEpoch: 1704067200000,
      eventType: 'DISCONNECT',
      extendedRequestId: 'test-extended-request-id',
      messageDirection: 'IN',
    },
    headers: {},
    isBase64Encoded: false,
  } as APIGatewayProxyWebsocketEventV2)

  it('should remove connection from DynamoDB on disconnect', async () => {
    dynamoMock.on(DeleteCommand).resolves({})

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Disconnected' })

    // Verify connection was deleted from DynamoDB
    const deleteCalls = dynamoMock.commandCalls(DeleteCommand)
    expect(deleteCalls).toHaveLength(1)

    const deleteCall = deleteCalls[0]
    expect(deleteCall.args[0].input.TableName).toBe('test-connections-table')
    expect(deleteCall.args[0].input.Key).toEqual({ connectionId: mockConnectionId })
  })

  it('should return 200 even if DynamoDB delete fails', async () => {
    // Mock DynamoDB failure
    dynamoMock.on(DeleteCommand).rejects(new Error('DynamoDB error'))

    const event = createMockEvent()
    const result = await handler(event)

    // Should still return 200 because the connection is already closed
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Disconnected' })

    // Verify delete was attempted
    expect(dynamoMock.commandCalls(DeleteCommand)).toHaveLength(1)
  })
})
