import { describe, expect, it } from 'vitest'

import {
  addWorkerResult,
  carryForwardWorker,
  createReview,
  generateRankedPatches,
  ReviewSchema,
  type WorkerResult,
} from '../review'

describe('ReviewSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal valid review', () => {
      const review = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        iteration: 1,
        verdict: 'PASS',
        workers_run: ['lint', 'typecheck', 'build'],
        workers_skipped: [],
        ranked_patches: [],
        findings: {},
        total_errors: 0,
        total_warnings: 0,
        auto_fixable_count: 0,
      }

      const result = ReviewSchema.parse(review)
      expect(result).toMatchObject(review)
    })

    it('validates a review with findings', () => {
      const review = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        iteration: 2,
        verdict: 'FAIL',
        workers_run: ['lint', 'typecheck'],
        workers_skipped: ['style', 'syntax'],
        ranked_patches: [
          {
            priority: 1,
            file: 'src/handlers/list.ts',
            issue: "Type 'string' is not assignable to type 'number'",
            severity: 'high',
            auto_fixable: false,
            worker: 'typecheck',
          },
        ],
        findings: {
          lint: {
            verdict: 'PASS',
            skipped: false,
            errors: 0,
            warnings: 2,
            findings: [
              {
                file: 'src/handlers/list.ts',
                line: 10,
                message: 'prefer-const',
                severity: 'warning',
                auto_fixable: true,
              },
            ],
          },
          typecheck: {
            verdict: 'FAIL',
            skipped: false,
            errors: 1,
            warnings: 0,
            findings: [
              {
                file: 'src/handlers/list.ts',
                line: 45,
                message: "Type 'string' is not assignable to type 'number'",
                severity: 'error',
                auto_fixable: false,
              },
            ],
          },
        },
        total_errors: 1,
        total_warnings: 2,
        auto_fixable_count: 1,
        tokens: { in: 5000, out: 800 },
      }

      const result = ReviewSchema.parse(review)
      expect(result.ranked_patches).toHaveLength(1)
      expect(result.findings.lint?.verdict).toBe('PASS')
      expect(result.findings.typecheck?.verdict).toBe('FAIL')
    })

    it('rejects invalid verdict', () => {
      const review = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        iteration: 1,
        verdict: 'MAYBE',
        workers_run: [],
        ranked_patches: [],
        findings: {},
        total_errors: 0,
        total_warnings: 0,
        auto_fixable_count: 0,
      }

      expect(() => ReviewSchema.parse(review)).toThrow()
    })

    it('rejects invalid severity in findings', () => {
      const review = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        iteration: 1,
        verdict: 'FAIL',
        workers_run: ['lint'],
        ranked_patches: [],
        findings: {
          lint: {
            verdict: 'FAIL',
            errors: 1,
            findings: [
              {
                file: 'test.ts',
                message: 'error',
                severity: 'critical',
              },
            ],
          },
        },
        total_errors: 1,
        total_warnings: 0,
        auto_fixable_count: 0,
      }

      expect(() => ReviewSchema.parse(review)).toThrow()
    })
  })

  describe('createReview', () => {
    it('creates an empty review', () => {
      const review = createReview('WISH-001')

      expect(review.schema).toBe(1)
      expect(review.story_id).toBe('WISH-001')
      expect(review.iteration).toBe(1)
      expect(review.verdict).toBe('PASS')
      expect(review.workers_run).toEqual([])
      expect(review.workers_skipped).toEqual([])
      expect(review.ranked_patches).toEqual([])
      expect(review.findings).toEqual({})
    })

    it('accepts custom iteration number', () => {
      const review = createReview('WISH-001', 3)

      expect(review.iteration).toBe(3)
    })

    it('creates a valid review that passes schema validation', () => {
      const review = createReview('WISH-001')

      expect(() => ReviewSchema.parse(review)).not.toThrow()
    })
  })

  describe('addWorkerResult', () => {
    it('adds a worker result to the review', () => {
      const review = createReview('WISH-001')
      const workerResult: WorkerResult = {
        verdict: 'PASS',
        skipped: false,
        errors: 0,
        warnings: 1,
        findings: [
          {
            file: 'src/test.ts',
            line: 10,
            message: 'prefer-const',
            severity: 'warning',
            auto_fixable: true,
          },
        ],
      }

      const updated = addWorkerResult(review, 'lint', workerResult)

      expect(updated.findings.lint).toBeDefined()
      expect(updated.workers_run).toContain('lint')
      expect(updated.total_warnings).toBe(1)
    })

    it('updates verdict to FAIL when worker fails', () => {
      const review = createReview('WISH-001')
      const workerResult: WorkerResult = {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [
          {
            file: 'src/test.ts',
            message: 'type error',
            severity: 'error',
          },
        ],
      }

      const updated = addWorkerResult(review, 'typecheck', workerResult)

      expect(updated.verdict).toBe('FAIL')
      expect(updated.total_errors).toBe(1)
    })

    it('calculates auto_fixable_count correctly', () => {
      const review = createReview('WISH-001')
      const workerResult: WorkerResult = {
        verdict: 'PASS',
        skipped: false,
        errors: 0,
        warnings: 2,
        findings: [
          { file: 'a.ts', message: 'fix1', severity: 'warning', auto_fixable: true },
          { file: 'b.ts', message: 'fix2', severity: 'warning', auto_fixable: true },
          { file: 'c.ts', message: 'nofix', severity: 'warning', auto_fixable: false },
        ],
      }

      const updated = addWorkerResult(review, 'lint', workerResult)

      expect(updated.auto_fixable_count).toBe(2)
    })
  })

  describe('carryForwardWorker', () => {
    it('carries forward a worker result with skipped flag', () => {
      const review = createReview('WISH-001')
      const previousResult: WorkerResult = {
        verdict: 'PASS',
        skipped: false,
        errors: 0,
        warnings: 0,
        findings: [],
      }

      const updated = carryForwardWorker(review, 'style', previousResult)

      expect(updated.findings.style).toBeDefined()
      expect(updated.findings.style?.skipped).toBe(true)
      expect(updated.workers_skipped).toContain('style')
    })
  })

  describe('generateRankedPatches', () => {
    it('generates ranked patches from failed worker findings', () => {
      let review = createReview('WISH-001')
      review = addWorkerResult(review, 'typecheck', {
        verdict: 'FAIL',
        skipped: false,
        errors: 2,
        warnings: 0,
        findings: [
          { file: 'a.ts', line: 10, message: 'error 1', severity: 'error', auto_fixable: false },
          { file: 'b.ts', line: 20, message: 'error 2', severity: 'error', auto_fixable: true },
        ],
      })

      const patches = generateRankedPatches(review)

      expect(patches).toHaveLength(2)
      expect(patches[0].file).toBe('a.ts')
      expect(patches[0].worker).toBe('typecheck')
    })

    it('ignores passing workers', () => {
      let review = createReview('WISH-001')
      review = addWorkerResult(review, 'lint', {
        verdict: 'PASS',
        skipped: false,
        errors: 0,
        warnings: 2,
        findings: [
          { file: 'a.ts', message: 'warning 1', severity: 'warning', auto_fixable: true },
        ],
      })

      const patches = generateRankedPatches(review)

      expect(patches).toHaveLength(0)
    })

    it('returns empty array for clean review', () => {
      const review = createReview('WISH-001')
      const patches = generateRankedPatches(review)

      expect(patches).toEqual([])
    })
  })
})
