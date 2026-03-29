import { describe, expect, it } from 'vitest'

import {
  addCommandRun,
  addTouchedFile,
  allAcsPassing,
  createEvidence,
  EvidenceSchema,
  getMissingAcs,
  updateAcEvidence,
} from '../evidence'

describe('EvidenceSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal valid evidence bundle', () => {
      const evidence = {
        schema: 2,
        story_id: 'WISH-001',
        version: 1,
        timestamp: '2026-02-01T12:00:00.000Z',
        acceptance_criteria: [],
        touched_files: [],
        commands_run: [],
        endpoints_exercised: [],
        notable_decisions: [],
        known_deviations: [],
      }

      const result = EvidenceSchema.parse(evidence)
      expect(result).toMatchObject(evidence)
    })

    it('validates a complete evidence bundle', () => {
      const evidence = {
        schema: 2,
        story_id: 'WISH-001',
        version: 3,
        timestamp: '2026-02-01T12:00:00.000Z',
        acceptance_criteria: [
          {
            ac_id: 'AC1',
            ac_text: 'User can upload images',
            status: 'PASS',
            evidence_items: [
              {
                type: 'test',
                path: 'src/__tests__/upload.test.ts',
                description: 'Unit tests pass',
              },
            ],
            reason: 'All tests pass',
          },
        ],
        touched_files: [
          {
            path: 'src/handlers/upload.ts',
            action: 'created',
            lines: 150,
            description: 'Upload handler',
          },
        ],
        commands_run: [
          {
            command: 'pnpm test',
            result: 'SUCCESS',
            output: 'All tests passed',
            timestamp: '2026-02-01T11:30:00.000Z',
            duration_ms: 5000,
          },
        ],
        endpoints_exercised: [
          {
            method: 'POST',
            path: '/api/upload',
            status: 200,
            description: 'Upload endpoint',
          },
        ],
        notable_decisions: ['Used presigned URLs for S3 uploads'],
        known_deviations: [],
        token_summary: {
          setup: { in: 1000, out: 200 },
          plan: { in: 2000, out: 500 },
          execute: { in: 5000, out: 1500 },
        },
        test_summary: {
          unit: { pass: 10, fail: 0 },
          integration: { pass: 3, fail: 0 },
        },
        coverage: {
          lines: 85,
          branches: 75,
          functions: 90,
          statements: 85,
        },
      }

      const result = EvidenceSchema.parse(evidence)
      expect(result.acceptance_criteria).toHaveLength(1)
      expect(result.touched_files).toHaveLength(1)
      expect(result.commands_run).toHaveLength(1)
    })

    it('rejects invalid AC status', () => {
      const evidence = {
        schema: 2,
        story_id: 'WISH-001',
        version: 1,
        timestamp: '2026-02-01T12:00:00.000Z',
        acceptance_criteria: [
          {
            ac_id: 'AC1',
            status: 'INVALID',
            evidence_items: [],
          },
        ],
        touched_files: [],
        commands_run: [],
      }

      expect(() => EvidenceSchema.parse(evidence)).toThrow()
    })

    it('rejects invalid file action', () => {
      const evidence = {
        schema: 2,
        story_id: 'WISH-001',
        version: 1,
        timestamp: '2026-02-01T12:00:00.000Z',
        acceptance_criteria: [],
        touched_files: [
          {
            path: 'src/file.ts',
            action: 'renamed',
          },
        ],
        commands_run: [],
      }

      expect(() => EvidenceSchema.parse(evidence)).toThrow()
    })
  })

  describe('createEvidence', () => {
    it('creates an empty evidence bundle', () => {
      const evidence = createEvidence('WISH-001')

      expect(evidence.schema).toBe(2)
      expect(evidence.story_id).toBe('WISH-001')
      expect(evidence.version).toBe(1)
      expect(evidence.acceptance_criteria).toEqual([])
      expect(evidence.touched_files).toEqual([])
      expect(evidence.commands_run).toEqual([])
    })

    it('creates a valid evidence that passes schema validation', () => {
      const evidence = createEvidence('WISH-001')

      expect(() => EvidenceSchema.parse(evidence)).not.toThrow()
    })
  })

  describe('updateAcEvidence', () => {
    it('adds a new AC evidence entry', () => {
      const evidence = createEvidence('WISH-001')
      const updated = updateAcEvidence(evidence, 'AC1', {
        status: 'PASS',
        evidence_items: [{ type: 'test', description: 'Tests pass' }],
      })

      expect(updated.acceptance_criteria).toHaveLength(1)
      expect(updated.acceptance_criteria[0].ac_id).toBe('AC1')
      expect(updated.acceptance_criteria[0].status).toBe('PASS')
    })

    it('updates an existing AC evidence entry', () => {
      let evidence = createEvidence('WISH-001')
      evidence = updateAcEvidence(evidence, 'AC1', {
        status: 'MISSING',
        evidence_items: [],
      })
      const updated = updateAcEvidence(evidence, 'AC1', {
        status: 'PASS',
        evidence_items: [{ type: 'test', description: 'Tests now pass' }],
      })

      expect(updated.acceptance_criteria).toHaveLength(1)
      expect(updated.acceptance_criteria[0].status).toBe('PASS')
    })

    it('increments version on update', () => {
      const evidence = createEvidence('WISH-001')
      const updated = updateAcEvidence(evidence, 'AC1', { status: 'PASS', evidence_items: [] })

      expect(updated.version).toBe(evidence.version + 1)
    })
  })

  describe('addTouchedFile', () => {
    it('adds a touched file to evidence', () => {
      const evidence = createEvidence('WISH-001')
      const updated = addTouchedFile(evidence, {
        path: 'src/handlers/upload.ts',
        action: 'created',
        lines: 100,
      })

      expect(updated.touched_files).toHaveLength(1)
      expect(updated.touched_files[0].path).toBe('src/handlers/upload.ts')
    })

    it('increments version on add', () => {
      const evidence = createEvidence('WISH-001')
      const updated = addTouchedFile(evidence, {
        path: 'src/file.ts',
        action: 'modified',
      })

      expect(updated.version).toBe(evidence.version + 1)
    })
  })

  describe('addCommandRun', () => {
    it('adds a command run to evidence', () => {
      const evidence = createEvidence('WISH-001')
      const updated = addCommandRun(evidence, {
        command: 'pnpm test',
        result: 'SUCCESS',
        timestamp: new Date().toISOString(),
      })

      expect(updated.commands_run).toHaveLength(1)
      expect(updated.commands_run[0].command).toBe('pnpm test')
      expect(updated.commands_run[0].result).toBe('SUCCESS')
    })
  })

  describe('allAcsPassing', () => {
    it('returns true when all ACs pass', () => {
      let evidence = createEvidence('WISH-001')
      evidence = updateAcEvidence(evidence, 'AC1', { status: 'PASS', evidence_items: [] })
      evidence = updateAcEvidence(evidence, 'AC2', { status: 'PASS', evidence_items: [] })

      expect(allAcsPassing(evidence)).toBe(true)
    })

    it('returns false when any AC is not passing', () => {
      let evidence = createEvidence('WISH-001')
      evidence = updateAcEvidence(evidence, 'AC1', { status: 'PASS', evidence_items: [] })
      evidence = updateAcEvidence(evidence, 'AC2', { status: 'MISSING', evidence_items: [] })

      expect(allAcsPassing(evidence)).toBe(false)
    })

    it('returns true for empty ACs', () => {
      const evidence = createEvidence('WISH-001')

      expect(allAcsPassing(evidence)).toBe(true)
    })
  })

  describe('getMissingAcs', () => {
    it('returns list of non-passing ACs', () => {
      let evidence = createEvidence('WISH-001')
      evidence = updateAcEvidence(evidence, 'AC1', { status: 'PASS', evidence_items: [] })
      evidence = updateAcEvidence(evidence, 'AC2', { status: 'MISSING', evidence_items: [] })
      evidence = updateAcEvidence(evidence, 'AC3', { status: 'PARTIAL', evidence_items: [] })

      const missing = getMissingAcs(evidence)

      expect(missing).toEqual(['AC2', 'AC3'])
    })

    it('returns empty array when all pass', () => {
      let evidence = createEvidence('WISH-001')
      evidence = updateAcEvidence(evidence, 'AC1', { status: 'PASS', evidence_items: [] })

      expect(getMissingAcs(evidence)).toEqual([])
    })
  })
})
