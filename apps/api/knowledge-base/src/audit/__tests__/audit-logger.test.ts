/**
 * Audit Logger Tests
 *
 * Unit tests for the AuditLogger class and related functions.
 *
 * @see KNOW-018 AC1-AC5 for audit logging requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuditLogger, createEntrySnapshot, createAuditLogger } from '../audit-logger.js'
import type { KnowledgeEntry } from '../../db/schema.js'

// Mock the database and logger
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('createEntrySnapshot', () => {
  it('should create snapshot without embedding', () => {
    const entry: KnowledgeEntry = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test content',
      embedding: [0.1, 0.2, 0.3], // This should be excluded
      role: 'dev',
      tags: ['test', 'unit'],
      createdAt: new Date('2026-01-25T10:00:00Z'),
      updatedAt: new Date('2026-01-25T10:00:00Z'),
    }

    const snapshot = createEntrySnapshot(entry)

    expect(snapshot).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test content',
      role: 'dev',
      tags: ['test', 'unit'],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })

    // Ensure embedding is NOT in the snapshot
    expect('embedding' in snapshot).toBe(false)
  })

  it('should handle null tags', () => {
    const entry: KnowledgeEntry = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test content',
      embedding: [0.1, 0.2, 0.3],
      role: 'all',
      tags: null,
      createdAt: new Date('2026-01-25T10:00:00Z'),
      updatedAt: new Date('2026-01-25T10:00:00Z'),
    }

    const snapshot = createEntrySnapshot(entry)

    expect(snapshot.tags).toBeNull()
  })
})

describe('AuditLogger', () => {
  let mockDb: { insert: ReturnType<typeof vi.fn> }
  let insertMock: ReturnType<typeof vi.fn>
  let valuesMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks()

    // Setup mock chain: db.insert(table).values(data)
    valuesMock = vi.fn().mockResolvedValue(undefined)
    insertMock = vi.fn().mockReturnValue({ values: valuesMock })
    mockDb = { insert: insertMock }

    // Reset environment
    delete process.env.AUDIT_ENABLED
    delete process.env.AUDIT_SOFT_FAIL
    delete process.env.AUDIT_RETENTION_DAYS
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('isEnabled', () => {
    it('should return true by default', () => {
      const auditLogger = new AuditLogger({ db: mockDb as any })
      expect(auditLogger.isEnabled()).toBe(true)
    })

    it('should return false when AUDIT_ENABLED=false', () => {
      process.env.AUDIT_ENABLED = 'false'
      const auditLogger = new AuditLogger({ db: mockDb as any })
      expect(auditLogger.isEnabled()).toBe(false)
    })

    it('should return true when AUDIT_ENABLED=true', () => {
      process.env.AUDIT_ENABLED = 'true'
      const auditLogger = new AuditLogger({ db: mockDb as any })
      expect(auditLogger.isEnabled()).toBe(true)
    })
  })

  describe('logAdd', () => {
    it('should create audit log entry for add operation', async () => {
      const auditLogger = new AuditLogger({ db: mockDb as any })

      const newEntry: KnowledgeEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
        role: 'dev',
        tags: ['test'],
        createdAt: new Date('2026-01-25T10:00:00Z'),
        updatedAt: new Date('2026-01-25T10:00:00Z'),
      }

      await auditLogger.logAdd(newEntry.id, newEntry, { correlation_id: 'test-123' })

      expect(insertMock).toHaveBeenCalled()
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: newEntry.id,
          operation: 'add',
          previousValue: null,
          newValue: expect.objectContaining({
            id: newEntry.id,
            content: 'Test content',
            role: 'dev',
          }),
          userContext: expect.objectContaining({
            correlation_id: 'test-123',
          }),
        }),
      )
    })

    it('should skip logging when audit is disabled', async () => {
      process.env.AUDIT_ENABLED = 'false'
      const auditLogger = new AuditLogger({ db: mockDb as any })

      const newEntry: KnowledgeEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
        role: 'dev',
        tags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await auditLogger.logAdd(newEntry.id, newEntry)

      expect(insertMock).not.toHaveBeenCalled()
    })
  })

  describe('logUpdate', () => {
    it('should create audit log entry with before/after snapshots', async () => {
      const auditLogger = new AuditLogger({ db: mockDb as any })

      const previousEntry: KnowledgeEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Old content',
        embedding: [0.1, 0.2, 0.3],
        role: 'dev',
        tags: ['old'],
        createdAt: new Date('2026-01-24T10:00:00Z'),
        updatedAt: new Date('2026-01-24T10:00:00Z'),
      }

      const newEntry: KnowledgeEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'New content',
        embedding: [0.4, 0.5, 0.6],
        role: 'dev',
        tags: ['new'],
        createdAt: new Date('2026-01-24T10:00:00Z'),
        updatedAt: new Date('2026-01-25T10:00:00Z'),
      }

      await auditLogger.logUpdate(previousEntry.id, previousEntry, newEntry)

      expect(insertMock).toHaveBeenCalled()
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: previousEntry.id,
          operation: 'update',
          previousValue: expect.objectContaining({
            content: 'Old content',
          }),
          newValue: expect.objectContaining({
            content: 'New content',
          }),
        }),
      )
    })
  })

  describe('logDelete', () => {
    it('should create audit log entry with deleted entry snapshot', async () => {
      const auditLogger = new AuditLogger({ db: mockDb as any })

      const deletedEntry: KnowledgeEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Content to delete',
        embedding: [0.1, 0.2, 0.3],
        role: 'qa',
        tags: ['deleted'],
        createdAt: new Date('2026-01-20T10:00:00Z'),
        updatedAt: new Date('2026-01-20T10:00:00Z'),
      }

      await auditLogger.logDelete(deletedEntry.id, deletedEntry)

      expect(insertMock).toHaveBeenCalled()
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: deletedEntry.id,
          operation: 'delete',
          previousValue: expect.objectContaining({
            content: 'Content to delete',
            role: 'qa',
          }),
          newValue: null,
        }),
      )
    })
  })

  describe('soft fail behavior', () => {
    it('should not throw when soft fail is enabled and write fails', async () => {
      valuesMock.mockRejectedValue(new Error('Database error'))
      const auditLogger = new AuditLogger({ db: mockDb as any })

      const newEntry: KnowledgeEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
        role: 'dev',
        tags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Should not throw with soft fail enabled (default)
      await expect(auditLogger.logAdd(newEntry.id, newEntry)).resolves.not.toThrow()
    })

    it('should throw when soft fail is disabled and write fails', async () => {
      process.env.AUDIT_SOFT_FAIL = 'false'
      valuesMock.mockRejectedValue(new Error('Database error'))
      const auditLogger = new AuditLogger({ db: mockDb as any })

      const newEntry: KnowledgeEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
        role: 'dev',
        tags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await expect(auditLogger.logAdd(newEntry.id, newEntry)).rejects.toThrow('Database error')
    })
  })
})

describe('createAuditLogger', () => {
  it('should create AuditLogger instance', () => {
    const mockDb = {} as any
    const auditLogger = createAuditLogger({ db: mockDb })
    expect(auditLogger).toBeInstanceOf(AuditLogger)
  })
})
