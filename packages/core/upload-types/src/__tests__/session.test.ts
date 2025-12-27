import { describe, it, expect } from 'vitest'
import {
  FileMetadataSchema,
  UploaderStepSchema,
  UploaderSessionSchema,
  getStorageKey,
  generateAnonSessionId,
  parseSession,
  serializeSession,
  createEmptySession,
  migrateSession,
  UPLOADER_SESSION_VERSION,
} from '../session'

describe('FileMetadataSchema', () => {
  it('should validate valid file metadata', () => {
    const validMetadata = {
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: Date.now(),
    }
    expect(FileMetadataSchema.safeParse(validMetadata).success).toBe(true)
  })

  it('should validate metadata with optional fields', () => {
    const metadata = {
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: Date.now(),
      fileType: 'instruction',
      uploadStatus: 'pending',
    }
    const result = FileMetadataSchema.safeParse(metadata)
    expect(result.success).toBe(true)
  })

  it('should reject invalid fileType', () => {
    const metadata = {
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: Date.now(),
      fileType: 'invalid-type',
    }
    expect(FileMetadataSchema.safeParse(metadata).success).toBe(false)
  })
})

describe('UploaderStepSchema', () => {
  it('should validate metadata step', () => {
    expect(UploaderStepSchema.safeParse('metadata').success).toBe(true)
  })

  it('should validate files step', () => {
    expect(UploaderStepSchema.safeParse('files').success).toBe(true)
  })

  it('should validate review step', () => {
    expect(UploaderStepSchema.safeParse('review').success).toBe(true)
  })

  it('should reject invalid step', () => {
    expect(UploaderStepSchema.safeParse('invalid').success).toBe(false)
  })
})

describe('UploaderSessionSchema', () => {
  it('should create session with defaults', () => {
    const result = UploaderSessionSchema.parse({})
    expect(result.version).toBe(UPLOADER_SESSION_VERSION)
    expect(result.title).toBe('')
    expect(result.description).toBe('')
    expect(result.tags).toEqual([])
    expect(result.step).toBe('metadata')
    expect(result.files).toEqual([])
  })

  it('should validate full session', () => {
    const session = {
      version: 1,
      title: 'My MOC',
      description: 'A cool MOC',
      tags: ['castle', 'medieval'],
      theme: 'Castle',
      step: 'files',
      files: [],
      mocId: 'moc-123',
    }
    const result = UploaderSessionSchema.safeParse(session)
    expect(result.success).toBe(true)
  })
})

describe('getStorageKey', () => {
  it('should create key with user ID', () => {
    expect(getStorageKey('upload', 'user-123')).toBe('uploader:upload:user-123')
  })

  it('should create key with anon session ID', () => {
    expect(getStorageKey('upload', undefined, 'anon-456')).toBe('uploader:upload:anon-456')
  })

  it('should fallback to anon', () => {
    expect(getStorageKey('upload')).toBe('uploader:upload:anon')
  })
})

describe('generateAnonSessionId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateAnonSessionId()
    const id2 = generateAnonSessionId()
    expect(id1).not.toBe(id2)
  })

  it('should start with anon-', () => {
    const id = generateAnonSessionId()
    expect(id.startsWith('anon-')).toBe(true)
  })
})

describe('parseSession', () => {
  it('should parse valid JSON session', () => {
    const session = { title: 'Test', version: 1 }
    const result = parseSession(JSON.stringify(session))
    expect(result).not.toBeNull()
    expect(result?.title).toBe('Test')
  })

  it('should return null for null input', () => {
    expect(parseSession(null)).toBeNull()
  })

  it('should return null for invalid JSON', () => {
    expect(parseSession('invalid json')).toBeNull()
  })
})

describe('serializeSession', () => {
  it('should serialize session to JSON', () => {
    const session = createEmptySession()
    const json = serializeSession(session)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('should update timestamp', () => {
    const session = createEmptySession()
    const originalTime = session.updatedAt
    const json = serializeSession(session)
    const parsed = JSON.parse(json)
    expect(parsed.updatedAt).toBeGreaterThanOrEqual(originalTime)
  })
})

describe('createEmptySession', () => {
  it('should create session with defaults', () => {
    const session = createEmptySession()
    expect(session.version).toBe(UPLOADER_SESSION_VERSION)
    expect(session.title).toBe('')
    expect(session.step).toBe('metadata')
  })
})

describe('migrateSession', () => {
  it('should return same session if version matches', () => {
    const session = createEmptySession()
    const migrated = migrateSession(session)
    expect(migrated).toEqual(session)
  })

  it('should update version on old sessions', () => {
    const oldSession = { ...createEmptySession(), version: 0 }
    const migrated = migrateSession(oldSession)
    expect(migrated.version).toBe(UPLOADER_SESSION_VERSION)
  })
})
