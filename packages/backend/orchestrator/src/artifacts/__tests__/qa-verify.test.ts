import { describe, expect, it } from 'vitest'

import {
  addAcVerification,
  calculateVerdict,
  createQaVerify,
  generateQaSummary,
  qaPassedSuccessfully,
  QaVerifySchema,
} from '../qa-verify'

describe('QaVerifySchema', () => {
  describe('schema validation', () => {
    it('validates a minimal valid QA verify result', () => {
      const qaVerify = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        verdict: 'PASS',
        tests_executed: true,
        acs_verified: [],
        architecture_compliant: true,
        issues: [],
        lessons_to_record: [],
      }

      const result = QaVerifySchema.parse(qaVerify)
      expect(result).toMatchObject(qaVerify)
    })

    it('validates a complete QA verify result', () => {
      const qaVerify = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        verdict: 'PASS',
        tests_executed: true,
        test_results: {
          unit: { pass: 10, fail: 0 },
          integration: { pass: 3, fail: 0 },
          e2e: { pass: 2, fail: 0 },
        },
        coverage: 85,
        coverage_meets_threshold: true,
        test_quality: {
          verdict: 'PASS',
          anti_patterns: [],
        },
        acs_verified: [
          {
            ac_id: 'AC1',
            ac_text: 'User can upload images',
            status: 'PASS',
            evidence_ref: 'EVIDENCE.yaml#AC1',
            notes: 'Verified via unit tests',
          },
        ],
        architecture_compliant: true,
        issues: [],
        lessons_to_record: [
          {
            lesson: 'Presigned URLs work better for large files',
            category: 'pattern',
            tags: ['s3', 'upload'],
          },
        ],
        tokens: { in: 3000, out: 500 },
      }

      const result = QaVerifySchema.parse(qaVerify)
      expect(result.acs_verified).toHaveLength(1)
      expect(result.lessons_to_record).toHaveLength(1)
    })

    it('validates with FAIL verdict and issues', () => {
      const qaVerify = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        verdict: 'FAIL',
        tests_executed: true,
        acs_verified: [
          { ac_id: 'AC1', status: 'PASS' },
          { ac_id: 'AC2', status: 'FAIL', notes: 'Test failed' },
        ],
        architecture_compliant: true,
        issues: [
          {
            id: 'ISSUE-1',
            severity: 'high',
            description: 'AC2 test is failing',
            ac_id: 'AC2',
            suggested_fix: 'Fix the handler logic',
          },
        ],
      }

      const result = QaVerifySchema.parse(qaVerify)
      expect(result.verdict).toBe('FAIL')
      expect(result.issues).toHaveLength(1)
    })

    it('rejects invalid AC status', () => {
      const qaVerify = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        verdict: 'PASS',
        tests_executed: true,
        acs_verified: [{ ac_id: 'AC1', status: 'MAYBE' }],
        architecture_compliant: true,
      }

      expect(() => QaVerifySchema.parse(qaVerify)).toThrow()
    })

    it('rejects invalid lesson category', () => {
      const qaVerify = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        verdict: 'PASS',
        tests_executed: true,
        acs_verified: [],
        architecture_compliant: true,
        lessons_to_record: [
          {
            lesson: 'Something',
            category: 'invalid_category',
            tags: [],
          },
        ],
      }

      expect(() => QaVerifySchema.parse(qaVerify)).toThrow()
    })
  })

  describe('createQaVerify', () => {
    it('creates an initial QA verify result', () => {
      const qa = createQaVerify('WISH-001')

      expect(qa.schema).toBe(1)
      expect(qa.story_id).toBe('WISH-001')
      expect(qa.verdict).toBe('BLOCKED')
      expect(qa.tests_executed).toBe(false)
      expect(qa.acs_verified).toEqual([])
      expect(qa.architecture_compliant).toBe(true)
      expect(qa.issues).toEqual([])
      expect(qa.lessons_to_record).toEqual([])
    })

    it('creates a valid QA verify that passes schema validation', () => {
      const qa = createQaVerify('WISH-001')

      expect(() => QaVerifySchema.parse(qa)).not.toThrow()
    })
  })

  describe('addAcVerification', () => {
    it('adds a new AC verification', () => {
      const qa = createQaVerify('WISH-001')
      const updated = addAcVerification(qa, {
        ac_id: 'AC1',
        status: 'PASS',
        notes: 'Verified',
      })

      expect(updated.acs_verified).toHaveLength(1)
      expect(updated.acs_verified[0].ac_id).toBe('AC1')
      expect(updated.acs_verified[0].status).toBe('PASS')
    })

    it('updates an existing AC verification', () => {
      let qa = createQaVerify('WISH-001')
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'BLOCKED' })
      const updated = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS', notes: 'Now verified' })

      expect(updated.acs_verified).toHaveLength(1)
      expect(updated.acs_verified[0].status).toBe('PASS')
      expect(updated.acs_verified[0].notes).toBe('Now verified')
    })
  })

  describe('calculateVerdict', () => {
    it('returns PASS when all ACs pass', () => {
      let qa = createQaVerify('WISH-001')
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })
      qa = addAcVerification(qa, { ac_id: 'AC2', status: 'PASS' })

      expect(calculateVerdict(qa)).toBe('PASS')
    })

    it('returns FAIL when any AC fails', () => {
      let qa = createQaVerify('WISH-001')
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })
      qa = addAcVerification(qa, { ac_id: 'AC2', status: 'FAIL' })

      expect(calculateVerdict(qa)).toBe('FAIL')
    })

    it('returns BLOCKED when any AC is blocked', () => {
      let qa = createQaVerify('WISH-001')
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })
      qa = addAcVerification(qa, { ac_id: 'AC2', status: 'BLOCKED' })

      expect(calculateVerdict(qa)).toBe('BLOCKED')
    })

    it('returns PASS for empty ACs (vacuously true)', () => {
      const qa = createQaVerify('WISH-001')

      // Note: every() on empty array returns true, so no ACs = PASS
      expect(calculateVerdict(qa)).toBe('PASS')
    })
  })

  describe('qaPassedSuccessfully', () => {
    it('returns true when all conditions met', () => {
      let qa = createQaVerify('WISH-001')
      qa.verdict = 'PASS'
      qa.architecture_compliant = true
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })

      expect(qaPassedSuccessfully(qa)).toBe(true)
    })

    it('returns false when verdict is not PASS', () => {
      let qa = createQaVerify('WISH-001')
      qa.verdict = 'FAIL'
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })

      expect(qaPassedSuccessfully(qa)).toBe(false)
    })

    it('returns false when architecture not compliant', () => {
      let qa = createQaVerify('WISH-001')
      qa.verdict = 'PASS'
      qa.architecture_compliant = false
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })

      expect(qaPassedSuccessfully(qa)).toBe(false)
    })

    it('returns false when there are critical issues', () => {
      let qa = createQaVerify('WISH-001')
      qa.verdict = 'PASS'
      qa.issues = [{ id: 'I1', severity: 'critical', description: 'Critical issue' }]
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })

      expect(qaPassedSuccessfully(qa)).toBe(false)
    })

    it('returns false when there are high severity issues', () => {
      let qa = createQaVerify('WISH-001')
      qa.verdict = 'PASS'
      qa.issues = [{ id: 'I1', severity: 'high', description: 'High issue' }]
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })

      expect(qaPassedSuccessfully(qa)).toBe(false)
    })
  })

  describe('generateQaSummary', () => {
    it('generates a summary string', () => {
      let qa = createQaVerify('WISH-001')
      qa.verdict = 'PASS'
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'PASS' })
      qa = addAcVerification(qa, { ac_id: 'AC2', status: 'PASS' })

      const summary = generateQaSummary(qa)

      expect(summary).toContain('QA PASS')
      expect(summary).toContain('2/2 ACs passed')
    })

    it('includes issue counts', () => {
      let qa = createQaVerify('WISH-001')
      qa.verdict = 'FAIL'
      qa.issues = [
        { id: 'I1', severity: 'critical', description: 'Critical' },
        { id: 'I2', severity: 'high', description: 'High' },
        { id: 'I3', severity: 'high', description: 'High 2' },
        { id: 'I4', severity: 'medium', description: 'Medium' },
      ]
      qa = addAcVerification(qa, { ac_id: 'AC1', status: 'FAIL' })

      const summary = generateQaSummary(qa)

      expect(summary).toContain('QA FAIL')
      expect(summary).toContain('1 critical')
      expect(summary).toContain('2 high')
    })
  })
})
