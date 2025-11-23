/**
 * Unit tests for parse-parts-list handler
 * Story 4.6: CSV Parts List Parser Lambda
 *
 * Tests cover:
 * - CSV parsing with valid data
 * - Validation errors (missing columns, invalid quantities, row limits)
 * - Authorization (user must own MOC)
 * - S3 download errors
 * - Database transaction errors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { Readable } from 'stream'

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock database client
const mockDbTransaction = vi.fn()
vi.mock('@monorepo/db/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    transaction: mockDbTransaction,
  },
}))

// Mock database schema
vi.mock('@/db/schema', () => ({
  mocInstructions: {},
  mocPartsLists: {},
  mocParts: {},
}))

// Mock getUserIdFromEvent
vi.mock('@monorepo/lambda-auth', () => ({
  getUserIdFromEvent: vi.fn(),
}))

const s3Mock = mockClient(S3Client)

describe('Parse Parts List Handler', () => {
  const mockUserId = 'user-123'
  const mockMocId = '550e8400-e29b-41d4-a716-446655440000' // Valid UUID
  const mockS3Key = `parts-lists/${mockMocId}/file.csv`

  let handler: any
  let getUserIdFromEvent: any
  let db: any

  beforeEach(async () => {
    // Reset mocks
    s3Mock.reset()
    vi.clearAllMocks()
    mockDbTransaction.mockReset()

    // Set environment
    process.env.BUCKET_NAME = 'test-bucket'

    // Import mocked modules
    const authModule = await import('@monorepo/lambda-auth')
    getUserIdFromEvent = authModule.getUserIdFromEvent

    const dbModule = await import('@monorepo/db/client')
    db = dbModule.db

    // Import handler
    const module = await import('../index')
    handler = module.handler
  })

  const createMockEvent = (body: any): APIGatewayProxyEventV2 => ({
    body: JSON.stringify(body),
    headers: {},
    isBase64Encoded: false,
    rawPath: `/api/mocs/${mockMocId}/upload-parts-list`,
    rawQueryString: '',
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'POST',
        path: `/api/mocs/${mockMocId}/upload-parts-list`,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'POST /api/mocs/{id}/upload-parts-list',
      stage: 'test',
      time: '01/Jan/2025:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    routeKey: 'POST /api/mocs/{id}/upload-parts-list',
    version: '2.0',
  })

  const createCSVBuffer = (rows: string[]): Buffer => {
    const csv = ['Part ID,Part Name,Quantity,Color', ...rows].join('\n')
    return Buffer.from(csv, 'utf-8')
  }

  const mockS3Stream = (buffer: Buffer) => {
    const stream = Readable.from(buffer)
    s3Mock.on(GetObjectCommand).resolves({
      Body: stream as any,
    })
  }

  it('should successfully parse valid CSV and create parts list', async () => {
    // Setup
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    const csvBuffer = createCSVBuffer([
      '3001,Brick 2 x 4,10,Red',
      '3002,Brick 2 x 3,5,Blue',
    ])
    mockS3Stream(csvBuffer)

    mockDbTransaction.mockImplementation(async (callback: any) => {
      await callback({
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'parts-list-id' }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      })
    })

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    // Execute
    const response = await handler(event)

    // Assert
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.data.totalParts).toBe(15)
    expect(body.data.rowsProcessed).toBe(2)
  })

  it('should return 401 if user is not authenticated', async () => {
    getUserIdFromEvent.mockReturnValue(null)

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(401)
  })

  it('should return 400 if request body is missing', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)

    const event = createMockEvent(null)
    event.body = null

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
  })

  it('should return 400 for invalid request body', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)

    const event = createMockEvent({
      s3Key: mockS3Key,
      // Missing mocId
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain('Invalid request')
  })

  it('should return 404 if MOC not found or user does not own it', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([]) // No MOC found

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(404)
  })

  it('should return 500 if BUCKET_NAME environment variable is missing', async () => {
    delete process.env.BUCKET_NAME
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(500)
    expect(response.body).toContain('Server configuration error')
  })

  it('should return 500 if S3 download fails', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    s3Mock.on(GetObjectCommand).rejects(new Error('S3 error'))

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(500)
    expect(response.body).toContain('Failed to download CSV')
  })

  it('should return 400 for CSV with missing required columns', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    const csvBuffer = Buffer.from('Part ID,Quantity\n3001,10\n', 'utf-8')
    mockS3Stream(csvBuffer)

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain('Invalid CSV')
  })

  it('should return 400 for CSV with invalid quantity (non-numeric)', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    const csvBuffer = createCSVBuffer(['3001,Brick 2 x 4,abc,Red'])
    mockS3Stream(csvBuffer)

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain('positive integer')
  })

  it('should return 400 for CSV with zero quantity', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    const csvBuffer = createCSVBuffer(['3001,Brick 2 x 4,0,Red'])
    mockS3Stream(csvBuffer)

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain('greater than 0')
  })

  it('should return 400 for CSV exceeding 10,000 rows', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    // Create CSV with 10,001 rows
    const rows = Array(10001).fill('3001,Brick 2 x 4,1,Red')
    const csvBuffer = createCSVBuffer(rows)
    mockS3Stream(csvBuffer)

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain('10,000')
  })

  it('should return 500 if database transaction fails', async () => {
    getUserIdFromEvent.mockReturnValue(mockUserId)
    db.limit.mockResolvedValue([{ id: mockMocId, userId: mockUserId }])

    const csvBuffer = createCSVBuffer(['3001,Brick 2 x 4,10,Red'])
    mockS3Stream(csvBuffer)

    mockDbTransaction.mockRejectedValue(new Error('Database error'))

    const event = createMockEvent({
      s3Key: mockS3Key,
      mocId: mockMocId,
    })

    const response = await handler(event)

    expect(response.statusCode).toBe(500)
    expect(response.body).toContain('Failed to save parts list')
  })
})
