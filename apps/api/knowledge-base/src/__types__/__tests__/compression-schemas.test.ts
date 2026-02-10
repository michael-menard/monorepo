/**
 * Unit tests for KB Compression Schemas (WKFL-009)
 *
 * Tests validation logic for:
 * - CanonicalEntrySchema (merged entries)
 * - ArchiveMetadataSchema (archived entry metadata)
 * - CompressionReportSchema (report output)
 *
 * @see WKFL-009 AC-1 through AC-5
 */

import { describe, it, expect } from 'vitest'
import {
  CanonicalEntrySchema,
  ArchiveMetadataSchema,
  CompressionReportSchema,
} from '../index.js'

describe('CanonicalEntrySchema', () => {
  const validCanonical = {
    title: 'Zod validation required at API boundaries',
    recommendation: 'Always add Zod schema validation in route handlers for POST/PUT endpoints',
    merged_from: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
    ],
    examples: [
      { story: 'WISH-031', context: 'Missing validation on POST /wishlist' },
      { story: 'AUTH-015', context: 'Missing validation on POST /login' },
      { story: 'SET-042', context: 'Missing validation on PUT /sets/:id' },
    ],
    tags: ['canonical', 'validation', 'api', 'zod'],
  }

  describe('valid entries', () => {
    it('should validate a complete canonical entry', () => {
      const result = CanonicalEntrySchema.safeParse(validCanonical)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.merged_from).toHaveLength(3)
        expect(result.data.examples).toHaveLength(3)
        expect(result.data.tags).toContain('canonical')
      }
    })

    it('should validate with minimum 2 merged_from entries', () => {
      const data = {
        ...validCanonical,
        merged_from: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      }

      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate with empty examples array', () => {
      const data = { ...validCanonical, examples: [] }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate with empty tags array', () => {
      const data = { ...validCanonical, tags: [] }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('required field validation', () => {
    it('should fail when title is missing', () => {
      const { title: _, ...data } = validCanonical
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when title is empty', () => {
      const data = { ...validCanonical, title: '' }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when recommendation is missing', () => {
      const { recommendation: _, ...data } = validCanonical
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when recommendation is empty', () => {
      const data = { ...validCanonical, recommendation: '' }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when merged_from has fewer than 2 entries', () => {
      const data = {
        ...validCanonical,
        merged_from: ['550e8400-e29b-41d4-a716-446655440001'],
      }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when merged_from is empty', () => {
      const data = { ...validCanonical, merged_from: [] }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when merged_from contains invalid UUIDs', () => {
      const data = { ...validCanonical, merged_from: ['not-a-uuid', 'also-not-uuid'] }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('examples validation', () => {
    it('should validate examples with story and context', () => {
      const data = {
        ...validCanonical,
        examples: [{ story: 'WISH-031', context: 'Missing validation' }],
      }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should fail when example is missing story', () => {
      const data = {
        ...validCanonical,
        examples: [{ context: 'Missing validation' }],
      }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when example is missing context', () => {
      const data = {
        ...validCanonical,
        examples: [{ story: 'WISH-031' }],
      }
      const result = CanonicalEntrySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('ArchiveMetadataSchema', () => {
  describe('valid metadata', () => {
    it('should validate complete archive metadata', () => {
      const data = {
        archived: true,
        archived_at: new Date('2026-02-28T10:00:00Z'),
        canonical_id: '550e8400-e29b-41d4-a716-446655440042',
      }

      const result = ArchiveMetadataSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.archived).toBe(true)
        expect(result.data.canonical_id).toBe('550e8400-e29b-41d4-a716-446655440042')
      }
    })
  })

  describe('required field validation', () => {
    it('should fail when archived is missing', () => {
      const data = {
        archived_at: new Date(),
        canonical_id: '550e8400-e29b-41d4-a716-446655440042',
      }
      const result = ArchiveMetadataSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when archived_at is missing', () => {
      const data = {
        archived: true,
        canonical_id: '550e8400-e29b-41d4-a716-446655440042',
      }
      const result = ArchiveMetadataSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when canonical_id is missing', () => {
      const data = {
        archived: true,
        archived_at: new Date(),
      }
      const result = ArchiveMetadataSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when canonical_id is not a valid UUID', () => {
      const data = {
        archived: true,
        archived_at: new Date(),
        canonical_id: 'not-a-uuid',
      }
      const result = ArchiveMetadataSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('CompressionReportSchema', () => {
  const validReport = {
    run_date: '2026-02-28T10:00:00Z',
    threshold: 0.9,
    before: {
      total_entries: 100,
      lessons: 60,
      decisions: 25,
      feedback: 10,
      other: 5,
    },
    after: {
      total_entries: 80,
      canonical_entries: 10,
      archived_entries: 30,
    },
    compression: {
      ratio: 0.8,
      estimated_token_savings: 15000,
    },
    clusters_created: [
      {
        id: '550e8400-e29b-41d4-a716-446655440042',
        size: 3,
        topic: 'Zod validation at API boundaries',
        members: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
        ],
      },
    ],
    no_cluster: {
      count: 70,
      reason: 'Unique entries, no similar content above threshold',
    },
    dry_run: false,
  }

  describe('valid reports', () => {
    it('should validate a complete compression report', () => {
      const result = CompressionReportSchema.safeParse(validReport)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.before.total_entries).toBe(100)
        expect(result.data.after.archived_entries).toBe(30)
        expect(result.data.compression.ratio).toBe(0.8)
        expect(result.data.clusters_created).toHaveLength(1)
      }
    })

    it('should validate a dry run report', () => {
      const data = { ...validReport, dry_run: true }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dry_run).toBe(true)
      }
    })

    it('should validate with no clusters created', () => {
      const data = {
        ...validReport,
        clusters_created: [],
        after: { total_entries: 100, canonical_entries: 0, archived_entries: 0 },
        compression: { ratio: 1.0, estimated_token_savings: 0 },
        no_cluster: { count: 100, reason: 'No similar entries found' },
      }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate with multiple clusters', () => {
      const data = {
        ...validReport,
        clusters_created: [
          {
            id: '550e8400-e29b-41d4-a716-446655440042',
            size: 3,
            topic: 'Zod validation',
            members: [
              '550e8400-e29b-41d4-a716-446655440001',
              '550e8400-e29b-41d4-a716-446655440002',
              '550e8400-e29b-41d4-a716-446655440003',
            ],
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440043',
            size: 2,
            topic: 'Route handler length',
            members: [
              '550e8400-e29b-41d4-a716-446655440004',
              '550e8400-e29b-41d4-a716-446655440005',
            ],
          },
        ],
      }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.clusters_created).toHaveLength(2)
      }
    })
  })

  describe('threshold validation', () => {
    it('should accept threshold at 0.0', () => {
      const data = { ...validReport, threshold: 0.0 }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept threshold at 1.0', () => {
      const data = { ...validReport, threshold: 1.0 }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject threshold below 0', () => {
      const data = { ...validReport, threshold: -0.1 }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject threshold above 1', () => {
      const data = { ...validReport, threshold: 1.1 }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('cluster validation', () => {
    it('should require minimum cluster size of 2', () => {
      const data = {
        ...validReport,
        clusters_created: [
          {
            id: '550e8400-e29b-41d4-a716-446655440042',
            size: 1,
            topic: 'Too small',
            members: ['550e8400-e29b-41d4-a716-446655440001'],
          },
        ],
      }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should require valid UUIDs for cluster id', () => {
      const data = {
        ...validReport,
        clusters_created: [
          {
            id: 'not-a-uuid',
            size: 2,
            topic: 'Test',
            members: [
              '550e8400-e29b-41d4-a716-446655440001',
              '550e8400-e29b-41d4-a716-446655440002',
            ],
          },
        ],
      }
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('required sections', () => {
    it('should fail when before section is missing', () => {
      const { before: _, ...data } = validReport
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when after section is missing', () => {
      const { after: _, ...data } = validReport
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when compression section is missing', () => {
      const { compression: _, ...data } = validReport
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when no_cluster section is missing', () => {
      const { no_cluster: _, ...data } = validReport
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should fail when dry_run flag is missing', () => {
      const { dry_run: _, ...data } = validReport
      const result = CompressionReportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})
