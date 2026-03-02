import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ZodError } from 'zod'
import {
  assertEvidenceArtifact,
  assertReviewArtifact,
  assertQaVerifyArtifact,
  assertMergeArtifact,
  MergeArtifactSchema,
} from '../artifact-assertions.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock yaml and fs/promises at module level — must be top-level for ESM
vi.mock('yaml', async () => {
  const actual = await vi.importActual<typeof import('yaml')>('yaml')
  return {
    ...actual,
    parse: vi.fn(actual.parse),
  }
})

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const validEvidence = {
  schema: 2,
  story_id: 'TEST-001',
  version: 1,
  timestamp: '2026-02-28T00:00:00.000Z',
  acceptance_criteria: [
    {
      ac_id: 'AC-1',
      status: 'PASS',
      evidence_items: [],
    },
  ],
  touched_files: [],
  commands_run: [],
  endpoints_exercised: [],
  notable_decisions: [],
  known_deviations: [],
}

const validReview = {
  schema: 1,
  story_id: 'TEST-001',
  timestamp: '2026-02-28T00:00:00.000Z',
  iteration: 1,
  verdict: 'PASS',
  workers_run: ['lint', 'typecheck'],
  workers_skipped: [],
  ranked_patches: [],
  findings: {},
  total_errors: 0,
  total_warnings: 0,
  auto_fixable_count: 0,
}

const validQaVerify = {
  schema: 1,
  story_id: 'TEST-001',
  timestamp: '2026-02-28T00:00:00.000Z',
  verdict: 'PASS',
  tests_executed: true,
  acs_verified: [
    { ac_id: 'AC-1', status: 'PASS' },
  ],
  architecture_compliant: true,
  issues: [],
  lessons_to_record: [],
}

const validMerge = {
  verdict: 'MERGE_COMPLETE',
  story_id: 'TEST-001',
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

async function getFsMock() {
  const fs = await import('fs/promises')
  return fs
}

async function getYamlMock() {
  const yaml = await import('yaml')
  return yaml
}

beforeEach(async () => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// assertEvidenceArtifact
// ─────────────────────────────────────────────────────────────────────────────

describe('assertEvidenceArtifact', () => {
  it('returns parsed Evidence on valid YAML', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify(validEvidence) as any)

    const result = await assertEvidenceArtifact('/some/story/dir')
    expect(result.story_id).toBe('TEST-001')
    expect(result.schema).toBe(2)
    expect(result.acceptance_criteria[0].status).toBe('PASS')
  })

  it('throws ZodError on schema-invalid YAML', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    const invalid = { schema: 2, story_id: 'X', acceptance_criteria: null }
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify(invalid) as any)

    await expect(assertEvidenceArtifact('/some/story/dir')).rejects.toThrow(ZodError)
  })

  it('throws error when file does not exist', async () => {
    const fs = await import('fs/promises')
    const enoent = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
    vi.mocked(fs.readFile).mockRejectedValue(enoent)

    await expect(assertEvidenceArtifact('/missing/dir')).rejects.toThrow(/ENOENT/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// assertReviewArtifact
// ─────────────────────────────────────────────────────────────────────────────

describe('assertReviewArtifact', () => {
  it('returns parsed Review on valid YAML', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify(validReview) as any)

    const result = await assertReviewArtifact('/some/story/dir')
    expect(result.story_id).toBe('TEST-001')
    expect(result.verdict).toBe('PASS')
    expect(result.schema).toBe(1)
  })

  it('throws ZodError on schema-invalid YAML', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    const invalid = { schema: 1, story_id: 'X', verdict: 'INVALID_VERDICT', timestamp: '2026-01-01T00:00:00.000Z', iteration: 1, workers_run: [], findings: {} }
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify(invalid) as any)

    await expect(assertReviewArtifact('/some/story/dir')).rejects.toThrow(ZodError)
  })

  it('throws error when file does not exist', async () => {
    const fs = await import('fs/promises')
    const enoent = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
    vi.mocked(fs.readFile).mockRejectedValue(enoent)

    await expect(assertReviewArtifact('/missing/dir')).rejects.toThrow(/ENOENT/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// assertQaVerifyArtifact
// ─────────────────────────────────────────────────────────────────────────────

describe('assertQaVerifyArtifact', () => {
  it('returns parsed QaVerify on valid YAML', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify(validQaVerify) as any)

    const result = await assertQaVerifyArtifact('/some/story/dir')
    expect(result.story_id).toBe('TEST-001')
    expect(result.verdict).toBe('PASS')
    expect(result.schema).toBe(1)
  })

  it('throws ZodError on schema-invalid YAML', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    const invalid = { schema: 1, story_id: 'X', verdict: 'UNKNOWN_VERDICT', timestamp: '2026-01-01T00:00:00.000Z', tests_executed: true, acs_verified: [], architecture_compliant: true }
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify(invalid) as any)

    await expect(assertQaVerifyArtifact('/some/story/dir')).rejects.toThrow(ZodError)
  })

  it('throws error when file does not exist', async () => {
    const fs = await import('fs/promises')
    const enoent = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
    vi.mocked(fs.readFile).mockRejectedValue(enoent)

    await expect(assertQaVerifyArtifact('/missing/dir')).rejects.toThrow(/ENOENT/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// assertMergeArtifact
// ─────────────────────────────────────────────────────────────────────────────

describe('assertMergeArtifact', () => {
  it('returns parsed MergeArtifact on valid YAML', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify(validMerge) as any)

    const result = await assertMergeArtifact('/some/story/dir')
    expect(result.verdict).toBe('MERGE_COMPLETE')
    expect(result.story_id).toBe('TEST-001')
  })

  it('throws ZodError on schema-invalid YAML (missing required fields)', async () => {
    const yaml = await import('yaml')
    const fs = await import('fs/promises')
    vi.mocked(fs.readFile).mockResolvedValue(yaml.stringify({ verdict: 'MERGE_COMPLETE' }) as any)

    await expect(assertMergeArtifact('/some/story/dir')).rejects.toThrow(ZodError)
  })

  it('throws error when file does not exist', async () => {
    const fs = await import('fs/promises')
    const enoent = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
    vi.mocked(fs.readFile).mockRejectedValue(enoent)

    await expect(assertMergeArtifact('/missing/dir')).rejects.toThrow(/ENOENT/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MergeArtifactSchema stub validation
// ─────────────────────────────────────────────────────────────────────────────

describe('MergeArtifactSchema stub', () => {
  it('accepts valid merge artifact', () => {
    const result = MergeArtifactSchema.safeParse({ verdict: 'MERGE_COMPLETE', story_id: 'X-001' })
    expect(result.success).toBe(true)
  })

  it('rejects missing story_id', () => {
    const result = MergeArtifactSchema.safeParse({ verdict: 'MERGE_COMPLETE' })
    expect(result.success).toBe(false)
  })

  it('rejects missing verdict', () => {
    const result = MergeArtifactSchema.safeParse({ story_id: 'X-001' })
    expect(result.success).toBe(false)
  })
})
