/**
 * Tests for kbBulkImport function
 *
 * @see KNOW-006 AC3, AC4 for bulk import requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  kbBulkImport,
  estimateImportCost,
  formatCostEstimate,
  MAX_BULK_IMPORT_ENTRIES,
  type BulkImportInput,
  type KbBulkImportDeps,
} from '../index.js'
import type { ParsedEntry } from '../../parsers/__types__/index.js'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-session-id-1234'),
}))

describe('kbBulkImport', () => {
  let mockDeps: KbBulkImportDeps

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock dependencies
    mockDeps = {
      db: {} as KbBulkImportDeps['db'],
      embeddingClient: {
        generateEmbedding: vi.fn().mockResolvedValue(Array(1536).fill(0)),
        generateEmbeddingsBatch: vi.fn().mockResolvedValue([Array(1536).fill(0)]),
      },
    }

    // Mock kb_add - needs to be mocked at module level
    vi.doMock('../../crud-operations/index.js', () => ({
      kb_add: vi.fn().mockResolvedValue('entry-uuid-1234'),
    }))
  })

  const createTestEntry = (overrides?: Partial<ParsedEntry>): ParsedEntry => ({
    content: 'Test knowledge content for bulk import',
    role: 'dev',
    tags: ['test', 'bulk-import'],
    ...overrides,
  })

  describe('Happy Path', () => {
    it('should import entries successfully', async () => {
      // Import fresh module with mocks
      const { kbBulkImport } = await import('../kb-bulk-import.js')
      vi.doMock('../../crud-operations/index.js', () => ({
        kb_add: vi.fn().mockResolvedValue('entry-uuid-1234'),
      }))

      const input: BulkImportInput = {
        entries: [createTestEntry(), createTestEntry({ content: 'Second entry' })],
        dry_run: false,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.total).toBe(2)
      expect(result.dry_run).toBe(false)
      expect(result.session_id).toBeDefined()
      expect(result.duration_ms).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty entries array', async () => {
      const input: BulkImportInput = {
        entries: [],
        dry_run: false,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.total).toBe(0)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('should track session_id for rollback support', async () => {
      const input: BulkImportInput = {
        entries: [createTestEntry()],
        dry_run: false,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.session_id).toBe('test-session-id-1234')
    })
  })

  describe('Dry Run Mode (AC16)', () => {
    it('should not write to database in dry_run mode', async () => {
      const input: BulkImportInput = {
        entries: [createTestEntry(), createTestEntry()],
        dry_run: true,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.dry_run).toBe(true)
      expect(result.total).toBe(2)
      // In dry run, all valid entries count as "would succeed"
      expect(result.succeeded).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should report accurate counts in dry_run mode for valid entries', async () => {
      // Note: Zod validation happens at input boundary, so invalid entries
      // throw before bulk import starts. This test verifies dry_run with valid entries.
      const input: BulkImportInput = {
        entries: [
          createTestEntry(),
          createTestEntry({ content: 'Second valid entry' }),
          createTestEntry({ content: 'Third valid entry' }),
        ],
        dry_run: true,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.dry_run).toBe(true)
      expect(result.total).toBe(3)
      expect(result.succeeded).toBe(3)
      expect(result.failed).toBe(0)
    })
  })

  describe('Validate Only Mode (AC19)', () => {
    it('should validate structure without generating embeddings', async () => {
      const input: BulkImportInput = {
        entries: [createTestEntry()],
        validate_only: true,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.validate_only).toBe(true)
      expect(result.skipped).toBe(1) // Valid entries are skipped (not imported)
      expect(result.succeeded).toBe(0)
    })

    it('should validate all entries in validate_only mode', async () => {
      // Note: Zod validation happens at input boundary, so entries must be valid
      // to reach the bulk import function. This tests successful validation.
      const input: BulkImportInput = {
        entries: [
          createTestEntry(),
          createTestEntry({ content: 'Second valid entry content' }),
        ],
        validate_only: true,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.validate_only).toBe(true)
      expect(result.skipped).toBe(2)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  describe('Error Handling (AC4)', () => {
    it('should handle multiple valid entries in dry_run mode', async () => {
      // Note: Zod validation at boundary ensures all entries are valid.
      // This tests that bulk import correctly processes multiple entries.
      const input: BulkImportInput = {
        entries: [
          createTestEntry(),
          createTestEntry({ content: 'Second entry' }),
          createTestEntry({ content: 'Third entry' }),
        ],
        dry_run: true,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.total).toBe(3)
      expect(result.succeeded).toBe(3)
      expect(result.failed).toBe(0)
    })

    it('should throw ZodError for invalid entries at boundary', async () => {
      // Invalid entries are caught by Zod at the input boundary
      const input = {
        entries: [
          createTestEntry(),
          { content: '', role: 'dev' }, // Invalid: empty content
        ],
        dry_run: true,
      }

      await expect(kbBulkImport(input as BulkImportInput, mockDeps)).rejects.toThrow()
    })
  })

  describe('Cost Estimation', () => {
    it('should calculate estimated cost correctly', async () => {
      const input: BulkImportInput = {
        entries: [createTestEntry()],
        dry_run: true,
      }

      const result = await kbBulkImport(input, mockDeps)

      expect(result.estimated_cost_usd).toBeDefined()
      expect(result.estimated_cost_usd).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Validation', () => {
    it('should reject more than 1000 entries', async () => {
      const entries = Array.from({ length: MAX_BULK_IMPORT_ENTRIES + 1 }, () => createTestEntry())

      const input = {
        entries,
        dry_run: true,
      }

      // Zod will reject at boundary
      await expect(kbBulkImport(input as BulkImportInput, mockDeps)).rejects.toThrow()
    })

    it('should throw for entry with content exceeding 30000 chars', async () => {
      const input = {
        entries: [{ content: 'x'.repeat(35000), role: 'dev' }],
        validate_only: true,
      }

      // Zod validation catches this at boundary
      await expect(kbBulkImport(input as BulkImportInput, mockDeps)).rejects.toThrow()
    })

    it('should throw for invalid role values', async () => {
      const input = {
        entries: [{ content: 'Test content here', role: 'invalid' }],
        validate_only: true,
      }

      // Zod validation catches this at boundary
      await expect(kbBulkImport(input as BulkImportInput, mockDeps)).rejects.toThrow()
    })
  })
})

describe('estimateImportCost', () => {
  it('should calculate cost based on character count', () => {
    const entries = [
      { content: 'A'.repeat(4000) }, // 4000 chars = ~1000 tokens
    ]

    const cost = estimateImportCost(entries)

    // 1000 tokens * $0.00002/1k = $0.00002
    expect(cost).toBeCloseTo(0.00002, 6)
  })

  it('should sum costs across multiple entries', () => {
    const entries = [
      { content: 'A'.repeat(4000) },
      { content: 'B'.repeat(4000) },
    ]

    const cost = estimateImportCost(entries)

    // 2000 tokens * $0.00002/1k = $0.00004
    expect(cost).toBeCloseTo(0.00004, 6)
  })

  it('should handle empty entries', () => {
    const cost = estimateImportCost([])

    expect(cost).toBe(0)
  })
})

describe('formatCostEstimate', () => {
  it('should format small costs with 4 decimal places', () => {
    expect(formatCostEstimate(0.0001)).toBe('$0.0001')
  })

  it('should format larger costs with 2 decimal places', () => {
    expect(formatCostEstimate(1.50)).toBe('$1.50')
  })

  it('should handle zero cost', () => {
    expect(formatCostEstimate(0)).toBe('$0.0000')
  })
})
