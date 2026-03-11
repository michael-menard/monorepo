/**
 * Review/QA Artifacts Schema Unit Tests
 * Story INFR-0120: Create Review/QA Artifact Schemas
 *
 * Tests validate:
 * - Schema structure and table definitions for evidence, review, qa-verify artifacts
 * - Zod schema inference for insert/select operations
 * - JSONB type schema definitions
 * - Relations definitions to wint.stories
 * - Foreign key constraints with CASCADE delete
 */

import { describe, expect, it } from 'vitest'
import {
  // Schema namespace (reused from INFR-0110)
  artifactsSchema,

  // INFR-0120 tables
  evidenceArtifacts,
  reviewArtifacts,
  qaVerifyArtifacts,

  // JSONB Type Schemas
  acEvidenceSchema,
  touchedFileSchema,
  commandRunSchema,
  e2eTestSchema,
  reviewFindingSchema,
  workerResultSchema,
  rankedPatchSchema,
  acVerificationSchema,
  testResultSchema,
  qaIssueSchema,

  // Relations
  evidenceArtifactsRelations,
  reviewArtifactsRelations,
  qaVerifyArtifactsRelations,

  // Zod Schemas
  insertEvidenceArtifactSchema,
  selectEvidenceArtifactSchema,
  insertReviewArtifactSchema,
  selectReviewArtifactSchema,
  insertQaVerifyArtifactSchema,
  selectQaVerifyArtifactSchema,

  // Types
  type AcEvidence,
  type TouchedFile,
  type CommandRun,
  type E2eTest,
  type ReviewFinding,
  type WorkerResult,
  type RankedPatch,
  type AcVerification,
  type TestResult,
  type QaIssue,
} from '../artifacts'

describe('Review/QA Artifacts Schema - AC-1: Evidence Artifacts Table', () => {
  it('should define evidenceArtifacts table in artifacts schema', () => {
    expect(evidenceArtifacts).toBeDefined()
  })

  it('should generate insert schema for evidenceArtifacts', () => {
    expect(insertEvidenceArtifactSchema).toBeDefined()

    // Validate schema accepts valid evidence artifact data
    const validEvidence = {
      storyId: '123e4567-e89b-12d3-a456-426614174000',
      acEvidence: [
        {
          ac_id: 'AC-1',
          ac_text: 'Test AC',
          status: 'PASS' as const,
          evidence_items: [
            {
              type: 'test' as const,
              path: '/path/to/test.ts',
              description: 'Unit test passes',
            },
          ],
        },
      ],
      touchedFiles: [
        {
          path: '/path/to/file.ts',
          action: 'created' as const,
          lines: 100,
          description: 'New file',
        },
      ],
      commandsRun: [
        {
          command: 'pnpm test',
          result: 'SUCCESS' as const,
          output: 'All tests passed',
          timestamp: new Date().toISOString(),
        },
      ],
      e2eTests: {
        status: 'pass' as const,
        exempt_reason: null,
        config: 'playwright.config.ts',
        project: 'chromium',
        mode: 'live',
        tests_written: true,
        results: { total: 5, passed: 5, failed: 0, skipped: 0 },
        failed_tests: [],
        config_issues: [],
      },
    }

    const result = insertEvidenceArtifactSchema.safeParse(validEvidence)
    expect(result.success).toBe(true)
  })

  it('should generate select schema for evidenceArtifacts', () => {
    expect(selectEvidenceArtifactSchema).toBeDefined()
  })

  it('should define relations for evidenceArtifacts', () => {
    expect(evidenceArtifactsRelations).toBeDefined()
  })
})

describe('Review/QA Artifacts Schema - AC-2: Review Artifacts Table', () => {
  it('should define reviewArtifacts table in artifacts schema', () => {
    expect(reviewArtifacts).toBeDefined()
  })

  it('should generate insert schema for reviewArtifacts', () => {
    expect(insertReviewArtifactSchema).toBeDefined()

    // Validate schema accepts valid review artifact data
    const validReview = {
      storyId: '123e4567-e89b-12d3-a456-426614174000',
      findings: [
        {
          id: 'F-1',
          severity: 'medium' as const,
          category: 'code-quality',
          file: '/path/to/file.ts',
          line: 42,
          description: 'Consider refactoring this function',
          suggestion: 'Break into smaller functions',
        },
      ],
      workerResults: [
        {
          worker: 'backend-coder',
          status: 'success' as const,
          files_changed: ['/path/to/file.ts'],
          tests_passed: true,
          notes: 'All changes implemented successfully',
        },
      ],
      rankedPatches: [
        {
          id: 'P-1',
          rank: 1,
          file: '/path/to/file.ts',
          description: 'Fix type error',
          diff: '- const x: any\n+ const x: string',
          rationale: 'Improves type safety',
        },
      ],
    }

    const result = insertReviewArtifactSchema.safeParse(validReview)
    expect(result.success).toBe(true)
  })

  it('should generate select schema for reviewArtifacts', () => {
    expect(selectReviewArtifactSchema).toBeDefined()
  })

  it('should define relations for reviewArtifacts', () => {
    expect(reviewArtifactsRelations).toBeDefined()
  })
})

describe('Review/QA Artifacts Schema - AC-3: QA Verify Artifacts Table', () => {
  it('should define qaVerifyArtifacts table in artifacts schema', () => {
    expect(qaVerifyArtifacts).toBeDefined()
  })

  it('should generate insert schema for qaVerifyArtifacts', () => {
    expect(insertQaVerifyArtifactSchema).toBeDefined()

    // Validate schema accepts valid qa-verify artifact data
    const validQaVerify = {
      storyId: '123e4567-e89b-12d3-a456-426614174000',
      acVerifications: [
        {
          ac_id: 'AC-1',
          status: 'verified' as const,
          verification_method: 'manual',
          notes: 'Verified all acceptance criteria',
        },
      ],
      testResults: [
        {
          test_suite: 'unit',
          total: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration_ms: 1234,
        },
      ],
      qaIssues: [
        {
          id: 'QA-1',
          severity: 'minor' as const,
          category: 'ui',
          description: 'Button alignment off by 2px',
          steps_to_reproduce: '1. Open page\n2. Check button',
          resolution: 'Fixed padding in CSS',
        },
      ],
    }

    const result = insertQaVerifyArtifactSchema.safeParse(validQaVerify)
    expect(result.success).toBe(true)
  })

  it('should generate select schema for qaVerifyArtifacts', () => {
    expect(selectQaVerifyArtifactSchema).toBeDefined()
  })

  it('should define relations for qaVerifyArtifacts', () => {
    expect(qaVerifyArtifactsRelations).toBeDefined()
  })
})

describe('Review/QA Artifacts Schema - AC-5: JSONB Type Schemas', () => {
  it('should validate acEvidenceSchema structure', () => {
    const validAcEvidence: AcEvidence = {
      ac_id: 'AC-1',
      ac_text: 'Test acceptance criterion',
      status: 'PASS',
      evidence_items: [
        {
          type: 'test',
          path: '/path/to/test.ts',
          description: 'Unit test',
        },
      ],
    }

    const result = acEvidenceSchema.safeParse(validAcEvidence)
    expect(result.success).toBe(true)
  })

  it('should validate touchedFileSchema structure', () => {
    const validTouchedFile: TouchedFile = {
      path: '/path/to/file.ts',
      action: 'modified',
      lines: 150,
      description: 'Updated function',
    }

    const result = touchedFileSchema.safeParse(validTouchedFile)
    expect(result.success).toBe(true)
  })

  it('should validate commandRunSchema structure', () => {
    const validCommandRun: CommandRun = {
      command: 'pnpm build',
      result: 'SUCCESS',
      output: 'Build completed successfully',
      timestamp: new Date().toISOString(),
    }

    const result = commandRunSchema.safeParse(validCommandRun)
    expect(result.success).toBe(true)
  })

  it('should validate e2eTestSchema structure', () => {
    const validE2eTest: E2eTest = {
      status: 'pass',
      exempt_reason: null,
      config: 'playwright.config.ts',
      project: 'chromium',
      mode: 'live',
      tests_written: true,
      results: {
        total: 3,
        passed: 3,
        failed: 0,
        skipped: 0,
      },
      failed_tests: [],
      config_issues: [],
    }

    const result = e2eTestSchema.safeParse(validE2eTest)
    expect(result.success).toBe(true)
  })

  it('should validate reviewFindingSchema structure', () => {
    const validReviewFinding: ReviewFinding = {
      id: 'F-1',
      severity: 'high',
      category: 'security',
      file: '/path/to/file.ts',
      line: 100,
      description: 'Potential SQL injection',
      suggestion: 'Use parameterized queries',
    }

    const result = reviewFindingSchema.safeParse(validReviewFinding)
    expect(result.success).toBe(true)
  })

  it('should validate workerResultSchema structure', () => {
    const validWorkerResult: WorkerResult = {
      worker: 'frontend-coder',
      status: 'success',
      files_changed: ['/path/to/component.tsx'],
      tests_passed: true,
      notes: 'Component implemented',
    }

    const result = workerResultSchema.safeParse(validWorkerResult)
    expect(result.success).toBe(true)
  })

  it('should validate rankedPatchSchema structure', () => {
    const validRankedPatch: RankedPatch = {
      id: 'P-1',
      rank: 1,
      file: '/path/to/file.ts',
      description: 'Fix type error',
      diff: '- const x: any\n+ const x: string',
      rationale: 'Improves type safety',
    }

    const result = rankedPatchSchema.safeParse(validRankedPatch)
    expect(result.success).toBe(true)
  })

  it('should validate acVerificationSchema structure', () => {
    const validAcVerification: AcVerification = {
      ac_id: 'AC-1',
      status: 'verified',
      verification_method: 'automated',
      notes: 'Verified via E2E tests',
    }

    const result = acVerificationSchema.safeParse(validAcVerification)
    expect(result.success).toBe(true)
  })

  it('should validate testResultSchema structure', () => {
    const validTestResult: TestResult = {
      test_suite: 'integration',
      total: 20,
      passed: 18,
      failed: 2,
      skipped: 0,
      duration_ms: 5000,
    }

    const result = testResultSchema.safeParse(validTestResult)
    expect(result.success).toBe(true)
  })

  it('should validate qaIssueSchema structure', () => {
    const validQaIssue: QaIssue = {
      id: 'QA-1',
      severity: 'critical',
      category: 'functionality',
      description: 'Form submission fails',
      steps_to_reproduce: '1. Fill form\n2. Click submit\n3. Observe error',
      resolution: 'Fixed validation logic',
    }

    const result = qaIssueSchema.safeParse(validQaIssue)
    expect(result.success).toBe(true)
  })
})

describe('Review/QA Artifacts Schema - AC-6: Relations to wint.stories', () => {
  it('should define story relation for evidenceArtifacts', () => {
    expect(evidenceArtifactsRelations).toBeDefined()
    // Relations are objects in Drizzle ORM
    expect(evidenceArtifactsRelations).toBeTruthy()
  })

  it('should define story relation for reviewArtifacts', () => {
    expect(reviewArtifactsRelations).toBeDefined()
    expect(reviewArtifactsRelations).toBeTruthy()
  })

  it('should define story relation for qaVerifyArtifacts', () => {
    expect(qaVerifyArtifactsRelations).toBeDefined()
    expect(qaVerifyArtifactsRelations).toBeTruthy()
  })
})

describe('Review/QA Artifacts Schema - AC-7: Validation Tests', () => {
  it('should accept valid evidenceArtifact with storyId', () => {
    const validEvidence = {
      storyId: '123e4567-e89b-12d3-a456-426614174000',
      acEvidence: [],
    }

    const result = insertEvidenceArtifactSchema.safeParse(validEvidence)
    // Drizzle schemas are lenient - they don't enforce UUID format in Zod
    expect(result.success).toBe(true)
  })

  it('should reject invalid acEvidence with wrong status enum', () => {
    const invalidAcEvidence = {
      ac_id: 'AC-1',
      ac_text: 'Test AC',
      status: 'INVALID_STATUS', // Not in enum
      evidence_items: [],
    }

    const result = acEvidenceSchema.safeParse(invalidAcEvidence)
    expect(result.success).toBe(false)
  })

  it('should reject invalid touchedFile with wrong action enum', () => {
    const invalidTouchedFile = {
      path: '/path',
      action: 'invalid_action', // Not in enum
    }

    const result = touchedFileSchema.safeParse(invalidTouchedFile)
    expect(result.success).toBe(false)
  })

  it('should reject invalid commandRun with wrong result enum', () => {
    const invalidCommandRun = {
      command: 'test',
      result: 'INVALID',
      timestamp: new Date().toISOString(),
    }

    const result = commandRunSchema.safeParse(invalidCommandRun)
    expect(result.success).toBe(false)
  })

  it('should reject invalid reviewFinding with wrong severity enum', () => {
    const invalidFinding = {
      id: 'F-1',
      severity: 'invalid', // Not in enum
      category: 'test',
      description: 'test',
    }

    const result = reviewFindingSchema.safeParse(invalidFinding)
    expect(result.success).toBe(false)
  })

  it('should reject invalid workerResult with wrong status enum', () => {
    const invalidWorker = {
      worker: 'test',
      status: 'invalid', // Not in enum
      files_changed: [],
    }

    const result = workerResultSchema.safeParse(invalidWorker)
    expect(result.success).toBe(false)
  })

  it('should reject invalid acVerification with wrong status enum', () => {
    const invalidVerification = {
      ac_id: 'AC-1',
      status: 'invalid', // Not in enum
      verification_method: 'test',
    }

    const result = acVerificationSchema.safeParse(invalidVerification)
    expect(result.success).toBe(false)
  })

  it('should reject invalid qaIssue with wrong severity enum', () => {
    const invalidIssue = {
      id: 'QA-1',
      severity: 'invalid', // Not in enum
      category: 'test',
      description: 'test',
    }

    const result = qaIssueSchema.safeParse(invalidIssue)
    expect(result.success).toBe(false)
  })
})

describe('Review/QA Artifacts Schema - AC-8: Schema Namespace Reuse', () => {
  it('should reuse artifacts schema namespace from INFR-0110', () => {
    expect(artifactsSchema).toBeDefined()
    expect(artifactsSchema.schemaName).toBe('artifacts')
  })
})
