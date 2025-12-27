/**
 * Tests for Edit Orphans Cleanup Lambda
 *
 * Story 3.1.38: S3 Cleanup for Failed Edit Uploads
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-correlation-id'),
}))

// Mock S3 client - use hoisted mock
const mockSend = vi.hoisted(() => vi.fn())
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: mockSend,
  })),
  ListObjectsV2Command: vi.fn().mockImplementation(input => ({ input, type: 'ListObjectsV2' })),
  DeleteObjectsCommand: vi.fn().mockImplementation(input => ({ input, type: 'DeleteObjects' })),
}))

// Import handler after mocks are set up
import { handler } from '../handler'

describe('edit-orphans cleanup handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.STAGE = 'dev'
  })

  it('returns early when bucket not configured', async () => {
    delete process.env.LEGO_API_BUCKET_NAME

    const result = await handler()

    expect(result.scanned).toBe(0)
    expect(result.deleted).toBe(0)
    expect(result.errors).toBe(1)
    expect(result.correlationId).toBe('test-correlation-id')
  })

  it('returns 0 deleted when no orphans found', async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        {
          Key: 'dev/moc-instructions/user-1/moc-1/instruction/file.pdf',
          LastModified: new Date(),
        },
      ],
    })

    const result = await handler()

    expect(result.scanned).toBe(1)
    expect(result.deleted).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('identifies orphans in edit/ path older than 24 hours', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago

    mockSend
      .mockResolvedValueOnce({
        Contents: [
          {
            Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/orphan.pdf',
            LastModified: oldDate,
          },
          {
            Key: 'dev/moc-instructions/user-1/moc-1/instruction/permanent.pdf',
            LastModified: oldDate,
          },
        ],
      })
      .mockResolvedValueOnce({
        Deleted: [{ Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/orphan.pdf' }],
      })

    const result = await handler()

    expect(result.scanned).toBe(2)
    expect(result.deleted).toBe(1)
    expect(result.errors).toBe(0)
  })

  it('does not delete recent edit files (less than 24 hours old)', async () => {
    const recentDate = new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago

    mockSend.mockResolvedValueOnce({
      Contents: [
        {
          Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/recent.pdf',
          LastModified: recentDate,
        },
      ],
    })

    const result = await handler()

    expect(result.scanned).toBe(1)
    expect(result.deleted).toBe(0)
    expect(result.errors).toBe(0)
    // Should not have called DeleteObjects
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('handles pagination for large buckets', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000)

    mockSend
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/file1.pdf', LastModified: oldDate },
        ],
        NextContinuationToken: 'token-1',
      })
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/file2.pdf', LastModified: oldDate },
        ],
      })
      .mockResolvedValueOnce({
        Deleted: [
          { Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/file1.pdf' },
          { Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/file2.pdf' },
        ],
      })

    const result = await handler()

    expect(result.scanned).toBe(2)
    expect(result.deleted).toBe(2)
    expect(result.errors).toBe(0)
  })

  it('handles S3 delete errors gracefully', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000)

    mockSend
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/file.pdf', LastModified: oldDate },
        ],
      })
      .mockResolvedValueOnce({
        Deleted: [],
        Errors: [
          { Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/file.pdf', Code: 'AccessDenied', Message: 'Access denied' },
        ],
      })

    const result = await handler()

    expect(result.deleted).toBe(0)
    expect(result.errors).toBe(1)
  })

  it('handles batch delete failure', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000)

    mockSend
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'dev/moc-instructions/user-1/moc-1/edit/instruction/file.pdf', LastModified: oldDate },
        ],
      })
      .mockRejectedValueOnce(new Error('Network error'))

    const result = await handler()

    expect(result.deleted).toBe(0)
    expect(result.errors).toBe(1)
  })

  it('includes correlationId in result', async () => {
    mockSend.mockResolvedValueOnce({ Contents: [] })

    const result = await handler()

    expect(result.correlationId).toBe('test-correlation-id')
  })

  it('includes duration in result', async () => {
    mockSend.mockResolvedValueOnce({ Contents: [] })

    const result = await handler()

    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})

describe('edit-orphans cleanup - batch size', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.STAGE = 'dev'
  })

  it('batches deletes when more than 1000 orphans', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000)

    // Create 1500 orphan files
    const orphans = Array.from({ length: 1500 }, (_, i) => ({
      Key: `dev/moc-instructions/user-1/moc-1/edit/instruction/file${i}.pdf`,
      LastModified: oldDate,
    }))

    mockSend
      .mockResolvedValueOnce({ Contents: orphans })
      // First batch (1000 files)
      .mockResolvedValueOnce({
        Deleted: orphans.slice(0, 1000).map(o => ({ Key: o.Key })),
      })
      // Second batch (500 files)
      .mockResolvedValueOnce({
        Deleted: orphans.slice(1000).map(o => ({ Key: o.Key })),
      })

    const result = await handler()

    expect(result.scanned).toBe(1500)
    expect(result.deleted).toBe(1500)
    expect(result.errors).toBe(0)
    // Should have called: 1 list + 2 delete batches
    expect(mockSend).toHaveBeenCalledTimes(3)
  })
})
