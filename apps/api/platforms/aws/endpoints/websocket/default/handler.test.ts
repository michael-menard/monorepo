/**
 * Unit tests for WebSocket $default handler
 * Story 4.5.5.1: Add automated tests for WebSocket server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda'

// Mock logger to prevent console output during tests
vi.mock('@/core/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('WebSocket $default Handler', () => {
  const mockConnectionId = 'test-connection-123'
  let handler: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Dynamically import handler to ensure mocks are applied
    const module = await import('./handler')
    handler = module.handler
  })

  const createMockEvent = (body?: string): APIGatewayProxyWebsocketEventV2 => ({
    requestContext: {
      connectionId: mockConnectionId,
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      stage: 'test',
      routeKey: '$default',
      apiId: 'test-api-id',
      requestId: 'test-request-id',
      requestTime: '01/Jan/2025:00:00:00 +0000',
      requestTimeEpoch: 1704067200000,
      eventType: 'MESSAGE',
      extendedRequestId: 'test-extended-request-id',
      messageDirection: 'IN',
    },
    body,
    headers: {},
    isBase64Encoded: false,
  } as APIGatewayProxyWebsocketEventV2)

  it('should acknowledge receipt of message', async () => {
    const event = createMockEvent(JSON.stringify({ type: 'ping' }))
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Message received' })
  })

  it('should handle messages without body', async () => {
    const event = createMockEvent()
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Message received' })
  })

  it('should handle malformed JSON gracefully', async () => {
    const event = createMockEvent('invalid-json')
    const result = await handler(event)

    // Should still acknowledge receipt despite parse error
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body!)).toEqual({ message: 'Message received' })
  })
})
