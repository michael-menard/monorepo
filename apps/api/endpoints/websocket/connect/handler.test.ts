/**
 * Unit tests for WebSocket $connect handler
 * Story 4.5.5.1: Add automated tests for WebSocket server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda'

// Mock logger to prevent console output during tests
vi.mock('../../../src/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock CognitoJwtVerifier with a mutable verify function
const mockVerify = vi.fn()
vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: vi.fn(() => ({
      verify: mockVerify,
    })),
  },
}))

const dynamoMock = mockClient(DynamoDBDocumentClient)

describe('WebSocket $connect Handler', () => {
  const mockConnectionId = 'test-connection-123'
  const mockUserId = 'user-456'
  const mockToken = 'valid-jwt-token'

  // Import handler after mocks are set up
  let handler: any

  beforeEach(async () => {
    // Reset mocks
    dynamoMock.reset()
    vi.clearAllMocks()
    mockVerify.mockReset()

    // Set environment variables
    process.env.CONNECTIONS_TABLE_NAME = 'test-connections-table'
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_TEST123'

    // Dynamically import handler to ensure mocks are applied
    const module = await import('../index')
    handler = module.handler
  })

  const createMockEvent = (token?: string): APIGatewayProxyWebsocketEventV2 => ({
    requestContext: {
      connectionId: mockConnectionId,
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      stage: 'test',
      routeKey: '$connect',
      apiId: 'test-api-id',
      requestId: 'test-request-id',
      requestTime: '01/Jan/2025:00:00:00 +0000',
      requestTimeEpoch: 1704067200000,
      eventType: 'CONNECT',
      extendedRequestId: 'test-extended-request-id',
      messageDirection: 'IN',
    },
    queryStringParameters: token ? { token } : undefined,
    headers: {},
    isBase64Encoded: false,
  } as APIGatewayProxyWebsocketEventV2)

  it('should store connection with valid JWT', async () => {
    // Mock successful JWT verification
    mockVerify.mockResolvedValue({ sub: mockUserId })
    dynamoMock.on(PutCommand).resolves({})

    const event = createMockEvent(mockToken)
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Connected' })

    // Verify JWT was verified
    expect(mockVerify).toHaveBeenCalledWith(mockToken)

    // Verify connection was stored in DynamoDB
    const putCalls = dynamoMock.commandCalls(PutCommand)
    expect(putCalls).toHaveLength(1)

    const putCall = putCalls[0]
    expect(putCall.args[0].input.TableName).toBe('test-connections-table')
    expect(putCall.args[0].input.Item?.connectionId).toBe(mockConnectionId)
    expect(putCall.args[0].input.Item?.userId).toBe(mockUserId)
    expect(putCall.args[0].input.Item?.connectedAt).toBeDefined()
    expect(putCall.args[0].input.Item?.expiresAt).toBeDefined()

    // Verify TTL is set for 2 hours (7200 seconds)
    const expiresAt = putCall.args[0].input.Item?.expiresAt as number
    const now = Math.floor(Date.now() / 1000)
    expect(expiresAt).toBeGreaterThanOrEqual(now + 7199) // Allow 1 second tolerance
    expect(expiresAt).toBeLessThanOrEqual(now + 7201)
  })

  it('should reject connection with invalid JWT', async () => {
    // Mock JWT verification failure
    mockVerify.mockRejectedValue(new Error('Token verification failed'))

    const event = createMockEvent(mockToken)
    const result = await handler(event)

    expect(result.statusCode).toBe(401)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Unauthorized: Invalid token' })

    // Verify no DynamoDB operations were performed
    expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('should reject connection without JWT token', async () => {
    const event = createMockEvent() // No token
    const result = await handler(event)

    expect(result.statusCode).toBe(401)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Unauthorized: Missing token' })

    // Verify no DynamoDB operations were performed
    expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('should return 500 on DynamoDB failure', async () => {
    // Mock successful JWT verification
    mockVerify.mockResolvedValue({ sub: mockUserId })

    // Mock DynamoDB failure
    dynamoMock.on(PutCommand).rejects(new Error('DynamoDB error'))

    const event = createMockEvent(mockToken)
    const result = await handler(event)

    expect(result.statusCode).toBe(500)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Internal server error' })
  })

  it('should include userId and timestamp in connection record', async () => {
    // Mock successful JWT verification
    mockVerify.mockResolvedValue({ sub: mockUserId })
    dynamoMock.on(PutCommand).resolves({})

    const beforeConnect = new Date().toISOString()
    const event = createMockEvent(mockToken)
    await handler(event)
    const afterConnect = new Date().toISOString()

    const putCalls = dynamoMock.commandCalls(PutCommand)
    const item = putCalls[0].args[0].input.Item

    expect(item?.userId).toBe(mockUserId)
    expect(item?.connectionId).toBe(mockConnectionId)
    expect(item?.connectedAt).toBeDefined()

    // Verify timestamp is recent
    const connectedAt = item?.connectedAt as string
    expect(connectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(connectedAt >= beforeConnect).toBe(true)
    expect(connectedAt <= afterConnect).toBe(true)
  })
})
