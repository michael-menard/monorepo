/**
 * Story 3.1.10: Uploader Upload Types Tests
 *
 * Tests for error mapping, batch state calculation, and helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  mapHttpErrorToUploadError,
  getErrorMessage,
  calculateBatchState,
  createFileItem,
  createFileId,
  type UploaderFileItem,
} from '@repo/upload-types'

describe('mapHttpErrorToUploadError', () => {
  it('maps 401 to UNAUTHORIZED', () => {
    expect(mapHttpErrorToUploadError(401)).toBe('UNAUTHORIZED')
  })

  it('maps 403 to FORBIDDEN', () => {
    expect(mapHttpErrorToUploadError(403)).toBe('FORBIDDEN')
  })

  it('maps 413 to PAYLOAD_TOO_LARGE', () => {
    expect(mapHttpErrorToUploadError(413)).toBe('PAYLOAD_TOO_LARGE')
  })

  it('maps 415 to UNSUPPORTED_TYPE', () => {
    expect(mapHttpErrorToUploadError(415)).toBe('UNSUPPORTED_TYPE')
  })

  it('maps 429 to TOO_MANY_REQUESTS', () => {
    expect(mapHttpErrorToUploadError(429)).toBe('TOO_MANY_REQUESTS')
  })

  it('maps 5xx to SERVER_ERROR', () => {
    expect(mapHttpErrorToUploadError(500)).toBe('SERVER_ERROR')
    expect(mapHttpErrorToUploadError(502)).toBe('SERVER_ERROR')
    expect(mapHttpErrorToUploadError(503)).toBe('SERVER_ERROR')
  })

  it('maps 0 (network error) to NETWORK_ERROR', () => {
    expect(mapHttpErrorToUploadError(0)).toBe('NETWORK_ERROR')
  })

  it('uses EXPIRED_SESSION API error code when provided', () => {
    expect(mapHttpErrorToUploadError(400, 'EXPIRED_SESSION')).toBe('EXPIRED_SESSION')
    expect(mapHttpErrorToUploadError(401, 'EXPIRED_SESSION')).toBe('EXPIRED_SESSION')
  })

  it('maps unknown status to UNKNOWN', () => {
    expect(mapHttpErrorToUploadError(418)).toBe('UNKNOWN')
  })
})

describe('getErrorMessage', () => {
  it('returns user-friendly message for EXPIRED_SESSION', () => {
    expect(getErrorMessage('EXPIRED_SESSION')).toBe('Session expired. Please sign in and retry.')
  })

  it('returns user-friendly message for PAYLOAD_TOO_LARGE', () => {
    expect(getErrorMessage('PAYLOAD_TOO_LARGE')).toContain('too large')
  })

  it('returns user-friendly message for PAYLOAD_TOO_LARGE with options', () => {
    expect(getErrorMessage('PAYLOAD_TOO_LARGE', { maxSizeMb: 50, fileType: 'PDF' })).toBe(
      'Too large. Max 50MB for PDF.',
    )
  })

  it('returns user-friendly message for UNSUPPORTED_TYPE', () => {
    expect(getErrorMessage('UNSUPPORTED_TYPE')).toContain('Unsupported')
  })

  it('returns user-friendly message for UNSUPPORTED_TYPE with options', () => {
    expect(getErrorMessage('UNSUPPORTED_TYPE', { allowedTypes: ['PDF', 'PNG'] })).toBe(
      'Unsupported type. Allowed: PDF, PNG.',
    )
  })

  it('returns user-friendly message for TOO_MANY_REQUESTS', () => {
    expect(getErrorMessage('TOO_MANY_REQUESTS')).toContain('Too many')
  })

  it('returns user-friendly message for NETWORK_ERROR', () => {
    expect(getErrorMessage('NETWORK_ERROR')).toContain('Network')
  })

  it('returns user-friendly message for SERVER_ERROR', () => {
    expect(getErrorMessage('SERVER_ERROR')).toContain('Temporary')
  })

  it('returns generic message for UNKNOWN', () => {
    expect(getErrorMessage('UNKNOWN')).toContain('unexpected')
  })
})

describe('calculateBatchState', () => {
  const createFile = (
    id: string,
    status: UploaderFileItem['status'],
    progress = 0,
    category: UploaderFileItem['category'] = 'instruction',
  ): UploaderFileItem => ({
    id,
    category,
    name: `file-${id}.pdf`,
    size: 1000,
    type: 'application/pdf',
    lastModified: Date.now(),
    status,
    progress,
    expired: false,
  })

  it('calculates empty batch state', () => {
    const state = calculateBatchState([])
    expect(state.files).toHaveLength(0)
    expect(state.overallProgress).toBe(0)
    // Empty batch is not complete (no instruction file)
    expect(state.isComplete).toBe(false)
    expect(state.failedCount).toBe(0)
  })

  it('calculates progress for uploading files', () => {
    const files = [createFile('1', 'uploading', 50), createFile('2', 'uploading', 100)]
    const state = calculateBatchState(files)
    expect(state.overallProgress).toBe(75)
    expect(state.uploadingCount).toBe(2)
    expect(state.isComplete).toBe(false)
  })

  it('calculates success count', () => {
    const files = [
      createFile('1', 'success', 100),
      createFile('2', 'success', 100),
      createFile('3', 'queued', 0),
    ]
    const state = calculateBatchState(files)
    expect(state.successCount).toBe(2)
    expect(state.queuedCount).toBe(1)
    expect(state.isComplete).toBe(false)
  })

  it('detects failed files', () => {
    const files = [createFile('1', 'success', 100), createFile('2', 'failed', 0)]
    const state = calculateBatchState(files)
    expect(state.failedCount).toBe(1)
    expect(state.isComplete).toBe(false)
  })

  it('detects expired sessions', () => {
    const files = [createFile('1', 'success', 100), createFile('2', 'expired', 0)]
    const state = calculateBatchState(files)
    expect(state.expiredCount).toBe(1)
  })

  it('marks complete when instruction is success and all files done', () => {
    const files = [
      createFile('1', 'success', 100, 'instruction'),
      createFile('2', 'success', 100, 'image'),
    ]
    const state = calculateBatchState(files)
    expect(state.isComplete).toBe(true)
  })
})

describe('createFileItem', () => {
  it('creates file item with correct properties', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const item = createFileItem(file, 'instruction')

    expect(item.id).toMatch(/^file-\d+-[a-z0-9]+$/)
    expect(item.category).toBe('instruction')
    expect(item.name).toBe('test.pdf')
    expect(item.type).toBe('application/pdf')
    expect(item.status).toBe('queued')
    expect(item.progress).toBe(0)
  })
})

describe('createFileId', () => {
  it('creates unique file IDs', () => {
    const id1 = createFileId()
    const id2 = createFileId()
    expect(id1).not.toBe(id2)
  })
})
