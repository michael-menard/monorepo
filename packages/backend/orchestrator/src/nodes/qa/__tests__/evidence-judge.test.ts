/**
 * Tests for evidence-judge node and pure classifier functions
 *
 * AC-9: Integration tests for node scenarios
 * AC-10: Unit tests for pure classifier functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Evidence, EvidenceItem } from '../../../artifacts/evidence.js'
import type { QAGraphState } from '../../../graphs/qa.js'

// Mock @repo/logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
  logger: mockLogger,
}))

// Mock node:fs/promises
const mockWriteFile = vi.fn().mockResolvedValue(undefined)
const mockMkdir = vi.fn().mockResolvedValue(undefined)

vi.mock('node:fs/promises', () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}))

// ============================================================================
// Helpers
// ============================================================================

function makeEvidenceItem(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    type: 'test',
    path: '/tests/foo.test.ts',
    description: 'All 5 tests pass',
    result: 'SUCCESS',
    ...overrides,
  }
}

function makeEvidence(acCount = 2, itemsPerAc: EvidenceItem[] = []): Evidence {
  return {
    schema: 2,
    story_id: 'WINT-9050',
    version: 1,
    timestamp: new Date().toISOString(),
    acceptance_criteria: Array.from({ length: acCount }, (_, i) => ({
      ac_id: `AC-${i + 1}`,
      ac_text: `Acceptance criterion ${i + 1}`,
      status: 'PASS' as const,
      evidence_items: itemsPerAc,
    })),
    touched_files: [],
    commands_run: [],
    endpoints_exercised: [],
    notable_decisions: [],
    known_deviations: [],
  }
}

function makeState(overrides: Partial<QAGraphState> = {}): QAGraphState {
  return {
    storyId: 'WINT-9050',
    evidence: makeEvidence(2, [makeEvidenceItem()]),
    review: null,
    config: {
      worktreeDir: '/tmp/worktree/WINT-9050',
      storyId: 'WINT-9050',
      enableE2e: true,
      testFilter: '@repo/orchestrator',
      playwrightConfig: 'playwright.legacy.config.ts',
      playwrightProject: 'chromium-live',
      testTimeoutMs: 300000,
      testTimeoutRetries: 1,
      playwrightMaxRetries: 2,
      kbWriteBackEnabled: false,
      artifactBaseDir: 'plans/future/platform/autonomous-pipeline/in-progress',
      gateModel: 'claude-sonnet-4-5',
      nodeTimeoutMs: 60000,
    },
    preconditionsPassed: true,
    unitTestResult: null,
    unitTestVerdict: null,
    playwrightAttempts: [],
    e2eVerdict: null,
    acVerifications: [],
    qaVerdict: null,
    gateDecision: null,
    qaArtifact: null,
    qaComplete: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

// ============================================================================
// Node integration tests (AC-9)
// ============================================================================

describe('evidence-judge node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('(a) all-ACCEPT → PASS overall verdict', async () => {
    const { createEvidenceJudgeNode } = await import('../evidence-judge.js')
    const node = createEvidenceJudgeNode()

    const strongItem = makeEvidenceItem({ type: 'test', path: '/tests/foo.test.ts', description: '5 tests pass' })
    const state = makeState({
      evidence: makeEvidence(2, [strongItem]),
    })

    const result = await node(state as any)

    expect(result.acVerdictResult.overall_verdict).toBe('PASS')
    expect(result.acVerdictResult.accepted).toBe(2)
    expect(result.acVerdictResult.challenged).toBe(0)
    expect(result.acVerdictResult.rejected).toBe(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('(b) mixed evidence → CHALLENGE overall verdict', async () => {
    const { createEvidenceJudgeNode } = await import('../evidence-judge.js')
    const node = createEvidenceJudgeNode()

    // AC-1 has a strong item, AC-2 has only weak items
    const strongItem = makeEvidenceItem({ type: 'test', path: '/tests/foo.test.ts', description: '5 pass' })
    const weakItem = makeEvidenceItem({ type: 'manual', path: undefined, description: 'Looks good to me', result: undefined })

    const evidence: Evidence = {
      schema: 2,
      story_id: 'WINT-9050',
      version: 1,
      timestamp: new Date().toISOString(),
      acceptance_criteria: [
        {
          ac_id: 'AC-1',
          ac_text: 'Test passes',
          status: 'PASS',
          evidence_items: [strongItem],
        },
        {
          ac_id: 'AC-2',
          ac_text: 'UI looks correct',
          status: 'PARTIAL',
          evidence_items: [weakItem],
        },
      ],
      touched_files: [],
      commands_run: [],
      endpoints_exercised: [],
      notable_decisions: [],
      known_deviations: [],
    }

    const state = makeState({ evidence })
    const result = await node(state as any)

    expect(result.acVerdictResult.overall_verdict).toBe('CHALLENGE')
    expect(result.acVerdictResult.accepted).toBe(1)
    expect(result.acVerdictResult.challenged).toBe(1)
    expect(result.acVerdictResult.rejected).toBe(0)
  })

  it('(c) zero evidence items → FAIL overall verdict (all ACs REJECT)', async () => {
    const { createEvidenceJudgeNode } = await import('../evidence-judge.js')
    const node = createEvidenceJudgeNode()

    const state = makeState({
      evidence: makeEvidence(2, []), // no evidence items
    })

    const result = await node(state as any)

    expect(result.acVerdictResult.overall_verdict).toBe('FAIL')
    expect(result.acVerdictResult.rejected).toBe(2)
    expect(result.acVerdictResult.accepted).toBe(0)
  })

  it('(d) subjective language downgrades evidence → CHALLENGE', async () => {
    const { createEvidenceJudgeNode } = await import('../evidence-judge.js')
    const node = createEvidenceJudgeNode()

    // test type with path but subjective description — should be WEAK due to blocklist
    const subjectiveItem = makeEvidenceItem({
      type: 'test',
      path: '/tests/foo.test.ts',
      description: 'Looks like all tests pass',
    })

    const state = makeState({
      evidence: makeEvidence(1, [subjectiveItem]),
    })

    const result = await node(state as any)

    // Despite 'test' type, 'looks' in description → WEAK → CHALLENGE
    expect(result.acVerdictResult.ac_verdicts[0].verdict).toBe('CHALLENGE')
    expect(result.acVerdictResult.overall_verdict).toBe('CHALLENGE')
  })

  it('(e) null evidence → returns FAIL without throwing', async () => {
    const { createEvidenceJudgeNode } = await import('../evidence-judge.js')
    const node = createEvidenceJudgeNode()

    const state = makeState({ evidence: null })

    // Must not throw
    const result = await node(state as any)

    expect(result.acVerdictResult.overall_verdict).toBe('FAIL')
    expect(result.acVerdictResult.total_acs).toBe(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('evidence is null')
  })

  it('writes ac-verdict.json via fs/promises.writeFile', async () => {
    const { createEvidenceJudgeNode } = await import('../evidence-judge.js')
    const node = createEvidenceJudgeNode()

    const state = makeState()
    await node(state as any)

    expect(mockMkdir).toHaveBeenCalledWith(
      '/tmp/worktree/WINT-9050/_implementation',
      { recursive: true },
    )
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/tmp/worktree/WINT-9050/_implementation/ac-verdict.json',
      expect.any(String),
      'utf-8',
    )
  })

  it('logs qa_evidence_judge_started and qa_evidence_judge_complete events', async () => {
    const { createEvidenceJudgeNode } = await import('../evidence-judge.js')
    const node = createEvidenceJudgeNode()
    const { logger } = await import('@repo/logger')

    const state = makeState()
    await node(state as any)

    expect(logger.info).toHaveBeenCalledWith(
      'qa_evidence_judge_started',
      expect.objectContaining({ storyId: 'WINT-9050', stage: 'qa' }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'qa_evidence_judge_complete',
      expect.objectContaining({ storyId: 'WINT-9050', stage: 'qa' }),
    )
  })
})

// ============================================================================
// Pure function unit tests (AC-10)
// ============================================================================

describe('classifyEvidenceStrength', () => {
  it('test type with path → STRONG', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'test', path: '/tests/foo.test.ts', description: '5 pass' }),
    ).toBe('STRONG')
  })

  it('test type without path → WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'test', path: undefined, description: 'tests pass' }),
    ).toBe('WEAK')
  })

  it('command type with deterministic result → STRONG', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'command', command: 'pnpm test', result: 'SUCCESS', description: 'ran tests' }),
    ).toBe('STRONG')
  })

  it('command type without result → WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'command', command: 'pnpm test', result: undefined, description: 'ran tests' }),
    ).toBe('WEAK')
  })

  it('e2e type with path → STRONG', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'e2e', path: '/tests/e2e/foo.test.ts', description: '3 passed 0 failed' }),
    ).toBe('STRONG')
  })

  it('http type with path and status code in description → STRONG', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'http', path: '/api/items', description: 'GET /api/items returned 200' }),
    ).toBe('STRONG')
  })

  it('http type with path but no status code → WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'http', path: '/api/items', description: 'endpoint works' }),
    ).toBe('WEAK')
  })

  it('file type → always WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'file', path: '/src/foo.ts', description: 'file created' }),
    ).toBe('WEAK')
  })

  it('screenshot type → always WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'screenshot', path: '/screenshots/foo.png', description: 'screenshot taken' }),
    ).toBe('WEAK')
  })

  it('manual type → always WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'manual', description: 'manually verified' }),
    ).toBe('WEAK')
  })

  it('subjective "appears" in description → overrides STRONG to WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'test', path: '/tests/foo.test.ts', description: 'appears to pass all tests' }),
    ).toBe('WEAK')
  })

  it('subjective "seems" in description → overrides to WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'command', command: 'pnpm lint', result: 'SUCCESS', description: 'seems to work fine' }),
    ).toBe('WEAK')
  })

  it('subjective "should" → overrides to WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'test', path: '/tests/foo.test.ts', description: 'should pass all tests' }),
    ).toBe('WEAK')
  })

  it('subjective "looks" → overrides to WEAK', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'test', path: '/tests/foo.test.ts', description: 'looks good' }),
    ).toBe('WEAK')
  })

  it('subjective language is case-insensitive', async () => {
    const { classifyEvidenceStrength } = await import('@repo/workflow-logic')
    expect(
      classifyEvidenceStrength({ type: 'test', path: '/tests/foo.test.ts', description: 'APPEARS to pass' }),
    ).toBe('WEAK')
  })
})

describe('deriveAcVerdict', () => {
  it('0 total items → REJECT', async () => {
    const { deriveAcVerdict } = await import('@repo/workflow-logic')
    expect(deriveAcVerdict(0, 0, 0)).toBe('REJECT')
  })

  it('0 strong, 1 weak → CHALLENGE', async () => {
    const { deriveAcVerdict } = await import('@repo/workflow-logic')
    expect(deriveAcVerdict(0, 1, 1)).toBe('CHALLENGE')
  })

  it('0 strong, multiple weak → CHALLENGE', async () => {
    const { deriveAcVerdict } = await import('@repo/workflow-logic')
    expect(deriveAcVerdict(0, 3, 3)).toBe('CHALLENGE')
  })

  it('1 strong, 0 weak → ACCEPT', async () => {
    const { deriveAcVerdict } = await import('@repo/workflow-logic')
    expect(deriveAcVerdict(1, 0, 1)).toBe('ACCEPT')
  })

  it('1 strong, 2 weak → ACCEPT', async () => {
    const { deriveAcVerdict } = await import('@repo/workflow-logic')
    expect(deriveAcVerdict(1, 2, 3)).toBe('ACCEPT')
  })

  it('multiple strong → ACCEPT', async () => {
    const { deriveAcVerdict } = await import('@repo/workflow-logic')
    expect(deriveAcVerdict(3, 1, 4)).toBe('ACCEPT')
  })
})

describe('deriveOverallVerdict', () => {
  it('all ACCEPT → PASS', async () => {
    const { deriveOverallVerdict } = await import('@repo/workflow-logic')
    expect(deriveOverallVerdict(['ACCEPT', 'ACCEPT', 'ACCEPT'])).toBe('PASS')
  })

  it('any REJECT → FAIL (even if others ACCEPT)', async () => {
    const { deriveOverallVerdict } = await import('@repo/workflow-logic')
    expect(deriveOverallVerdict(['ACCEPT', 'REJECT', 'ACCEPT'])).toBe('FAIL')
  })

  it('REJECT takes priority over CHALLENGE → FAIL', async () => {
    const { deriveOverallVerdict } = await import('@repo/workflow-logic')
    expect(deriveOverallVerdict(['CHALLENGE', 'REJECT'])).toBe('FAIL')
  })

  it('some CHALLENGE, no REJECT → CHALLENGE', async () => {
    const { deriveOverallVerdict } = await import('@repo/workflow-logic')
    expect(deriveOverallVerdict(['ACCEPT', 'CHALLENGE'])).toBe('CHALLENGE')
  })

  it('all CHALLENGE → CHALLENGE', async () => {
    const { deriveOverallVerdict } = await import('@repo/workflow-logic')
    expect(deriveOverallVerdict(['CHALLENGE', 'CHALLENGE'])).toBe('CHALLENGE')
  })

  it('empty array → PASS (vacuously)', async () => {
    const { deriveOverallVerdict } = await import('@repo/workflow-logic')
    expect(deriveOverallVerdict([])).toBe('PASS')
  })
})
