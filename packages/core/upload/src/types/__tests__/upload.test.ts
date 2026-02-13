import { describe, it, expect } from 'vitest'
import {
  FileCategorySchema,
  UploadStatusSchema,
  UploadErrorCodeSchema,
  UploaderFileItemSchema,
  UploadBatchStateSchema,
  createEmptyBatchState,
  calculateBatchState,
  mapHttpErrorToUploadError,
  getErrorMessage,
  createFileId,
  createFileItem,
  ERROR_MESSAGE_MAP,
  type UploaderFileItem,
} from '../upload'

describe('FileCategorySchema', () => {
  it('should validate instruction', () => {
    expect(FileCategorySchema.safeParse('instruction').success).toBe(true)
  })

  it('should validate parts-list', () => {
    expect(FileCategorySchema.safeParse('parts-list').success).toBe(true)
  })

  it('should validate image', () => {
    expect(FileCategorySchema.safeParse('image').success).toBe(true)
  })

  it('should validate thumbnail', () => {
    expect(FileCategorySchema.safeParse('thumbnail').success).toBe(true)
  })

  it('should reject invalid category', () => {
    expect(FileCategorySchema.safeParse('invalid').success).toBe(false)
  })
})

describe('UploadStatusSchema', () => {
  const validStatuses = ['queued', 'uploading', 'success', 'failed', 'canceled', 'expired']

  validStatuses.forEach(status => {
    it(`should validate ${status}`, () => {
      expect(UploadStatusSchema.safeParse(status).success).toBe(true)
    })
  })

  it('should reject invalid status', () => {
    expect(UploadStatusSchema.safeParse('pending').success).toBe(false)
  })
})

describe('UploadErrorCodeSchema', () => {
  it('should validate all error codes', () => {
    const codes = Object.keys(ERROR_MESSAGE_MAP)
    codes.forEach(code => {
      expect(UploadErrorCodeSchema.safeParse(code).success).toBe(true)
    })
  })
})

describe('UploaderFileItemSchema', () => {
  it('should validate a complete file item', () => {
    const fileItem = {
      id: 'file-123',
      category: 'instruction',
      name: 'instructions.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: Date.now(),
      status: 'queued',
      progress: 0,
      expired: false,
    }
    expect(UploaderFileItemSchema.safeParse(fileItem).success).toBe(true)
  })

  it('should validate progress between 0 and 100', () => {
    const fileItem = {
      id: 'file-123',
      category: 'instruction',
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: Date.now(),
      status: 'uploading',
      progress: 50,
      expired: false,
    }
    expect(UploaderFileItemSchema.safeParse(fileItem).success).toBe(true)
  })

  it('should reject progress over 100', () => {
    const fileItem = {
      id: 'file-123',
      category: 'instruction',
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: Date.now(),
      status: 'uploading',
      progress: 150,
      expired: false,
    }
    expect(UploaderFileItemSchema.safeParse(fileItem).success).toBe(false)
  })
})

describe('createEmptyBatchState', () => {
  it('should create empty state with all zeros', () => {
    const state = createEmptyBatchState()
    expect(state.files).toEqual([])
    expect(state.overallProgress).toBe(0)
    expect(state.queuedCount).toBe(0)
    expect(state.uploadingCount).toBe(0)
    expect(state.successCount).toBe(0)
    expect(state.failedCount).toBe(0)
    expect(state.isUploading).toBe(false)
    expect(state.isComplete).toBe(false)
  })
})

describe('calculateBatchState', () => {
  const createMockFile = (overrides: Partial<UploaderFileItem> = {}): UploaderFileItem => ({
    id: `file-${Math.random()}`,
    category: 'instruction',
    name: 'test.pdf',
    size: 1024,
    type: 'application/pdf',
    lastModified: Date.now(),
    status: 'queued',
    progress: 0,
    expired: false,
    ...overrides,
  })

  it('should calculate counts correctly', () => {
    const files = [
      createMockFile({ status: 'queued' }),
      createMockFile({ status: 'uploading' }),
      createMockFile({ status: 'success' }),
      createMockFile({ status: 'failed' }),
    ]
    const state = calculateBatchState(files)
    expect(state.queuedCount).toBe(1)
    expect(state.uploadingCount).toBe(1)
    expect(state.successCount).toBe(1)
    expect(state.failedCount).toBe(1)
  })

  it('should calculate overall progress', () => {
    const files = [
      createMockFile({ progress: 100 }),
      createMockFile({ progress: 50 }),
      createMockFile({ progress: 0 }),
    ]
    const state = calculateBatchState(files)
    expect(state.overallProgress).toBe(50)
  })

  it('should detect uploading state', () => {
    const files = [createMockFile({ status: 'uploading' })]
    const state = calculateBatchState(files)
    expect(state.isUploading).toBe(true)
  })

  it('should detect completion when instruction is uploaded', () => {
    const files = [createMockFile({ category: 'instruction', status: 'success' })]
    const state = calculateBatchState(files)
    expect(state.isComplete).toBe(true)
  })

  it('should not be complete without instruction', () => {
    const files = [createMockFile({ category: 'image', status: 'success' })]
    const state = calculateBatchState(files)
    expect(state.isComplete).toBe(false)
  })
})

describe('mapHttpErrorToUploadError', () => {
  it('should map 401 to UNAUTHORIZED', () => {
    expect(mapHttpErrorToUploadError(401)).toBe('UNAUTHORIZED')
  })

  it('should map 403 to FORBIDDEN', () => {
    expect(mapHttpErrorToUploadError(403)).toBe('FORBIDDEN')
  })

  it('should map 413 to PAYLOAD_TOO_LARGE', () => {
    expect(mapHttpErrorToUploadError(413)).toBe('PAYLOAD_TOO_LARGE')
  })

  it('should map 429 to TOO_MANY_REQUESTS', () => {
    expect(mapHttpErrorToUploadError(429)).toBe('TOO_MANY_REQUESTS')
  })

  it('should map 500+ to SERVER_ERROR', () => {
    expect(mapHttpErrorToUploadError(500)).toBe('SERVER_ERROR')
    expect(mapHttpErrorToUploadError(503)).toBe('SERVER_ERROR')
  })

  it('should map 0 to NETWORK_ERROR', () => {
    expect(mapHttpErrorToUploadError(0)).toBe('NETWORK_ERROR')
  })

  it('should respect EXPIRED_SESSION from API', () => {
    expect(mapHttpErrorToUploadError(401, 'EXPIRED_SESSION')).toBe('EXPIRED_SESSION')
  })
})

describe('getErrorMessage', () => {
  it('should return default message for error code', () => {
    expect(getErrorMessage('UNAUTHORIZED')).toBe(ERROR_MESSAGE_MAP.UNAUTHORIZED)
  })

  it('should include max size for PAYLOAD_TOO_LARGE', () => {
    const message = getErrorMessage('PAYLOAD_TOO_LARGE', { maxSizeMb: 10, fileType: 'images' })
    expect(message).toBe('Too large. Max 10MB for images.')
  })

  it('should include allowed types for UNSUPPORTED_TYPE', () => {
    const message = getErrorMessage('UNSUPPORTED_TYPE', { allowedTypes: ['pdf', 'png'] })
    expect(message).toBe('Unsupported type. Allowed: pdf, png.')
  })
})

describe('createFileId', () => {
  it('should generate unique IDs', () => {
    const id1 = createFileId()
    const id2 = createFileId()
    expect(id1).not.toBe(id2)
  })

  it('should start with file-', () => {
    expect(createFileId().startsWith('file-')).toBe(true)
  })
})

describe('createFileItem', () => {
  it('should create file item from File object', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const item = createFileItem(file, 'instruction')
    expect(item.name).toBe('test.pdf')
    expect(item.category).toBe('instruction')
    expect(item.status).toBe('queued')
    expect(item.progress).toBe(0)
  })
})
