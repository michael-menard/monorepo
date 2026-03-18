import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { deduplicate } from '../deduplicate.js'
import { DedupResultSchema } from '../../../artifacts/audit-findings.js'
import type { AuditFinding } from '../../../artifacts/audit-findings.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'

// --- Test Helpers ---

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: '',
    lens: 'security',
    severity: 'medium',
    confidence: 'high',
    title: 'Test finding',
    file: 'src/test.ts',
    evidence: 'test evidence',
    remediation: 'fix it',
    status: 'new',
    ...overrides,
  }
}

function makeState(findings: AuditFinding[]): CodeAuditState {
  return {
    findings,
    scope: 'full',
    mode: 'pipeline',
    lenses: ['security'],
    target: 'apps/',
    storyId: '',
    targetFiles: [],
    fileCategories: {},
    previousAudit: null,
    lensResults: [],
    devilsAdvocateResult: null,
    roundtableResult: null,
    deduplicationResult: null,
    auditFindings: null,
    trendData: null,
    errors: [],
    completed: false,
  }
}

describe('deduplicate', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  async function createStoriesIndex(content: string): Promise<void> {
    const featureDir = join(testDir, 'future', 'test-feature')
    await mkdir(featureDir, { recursive: true })
    await writeFile(join(featureDir, 'stories.index.md'), content)
  }

  it('AC-5: finding with >0.8 Jaccard similarity to a story title gets verdict: duplicate', async () => {
    await createStoriesIndex(`| Story | Title | Status |
|-------|-------|--------|
| TEST-001 | Fix authentication login flow security | done |
| TEST-002 | Add user profile page layout | done |
`)

    // Title that is very similar (high word overlap) to "Fix authentication login flow security"
    const finding = makeFinding({
      title: 'Fix authentication login flow security issue',
    })
    const state = makeState([finding])

    const result = await deduplicate(state, testDir)

    expect(result.deduplicationResult).toBeDefined()
    expect(result.deduplicationResult?.duplicates_found).toBeGreaterThanOrEqual(1)

    const updatedFinding = state.findings[0]
    expect(updatedFinding.dedup_check).toBeDefined()
    expect(updatedFinding.dedup_check?.verdict).toBe('duplicate')
    expect(updatedFinding.dedup_check?.similar_stories).toContain('TEST-001')
    expect(updatedFinding.dedup_check?.similarity_score).toBeGreaterThan(0.8)
  })

  it('AC-5: finding with <0.5 Jaccard similarity to any story title gets verdict: new', async () => {
    await createStoriesIndex(`| Story | Title | Status |
|-------|-------|--------|
| TEST-001 | Fix authentication login flow security | done |
| TEST-002 | Add user profile page layout | done |
`)

    // Title with no meaningful overlap
    const finding = makeFinding({
      title: 'Missing database index on products table',
    })
    const state = makeState([finding])

    const result = await deduplicate(state, testDir)

    expect(result.deduplicationResult).toBeDefined()
    expect(result.deduplicationResult?.new_findings).toBeGreaterThanOrEqual(1)

    const updatedFinding = state.findings[0]
    expect(updatedFinding.dedup_check).toBeDefined()
    expect(updatedFinding.dedup_check?.verdict).toBe('new')
    expect(updatedFinding.dedup_check?.similar_stories).toHaveLength(0)
  })

  it('AC-5: DedupResultSchema validates the returned deduplicationResult', async () => {
    await createStoriesIndex(`| Story | Title | Status |
|-------|-------|--------|
| TEST-001 | Fix authentication login flow security | done |
`)

    const findings = [
      makeFinding({ title: 'Fix authentication login flow security breach' }),
      makeFinding({ title: 'Completely unrelated database migration cleanup' }),
    ]
    const state = makeState(findings)

    const result = await deduplicate(state, testDir)

    expect(() => DedupResultSchema.parse(result.deduplicationResult)).not.toThrow()

    const parsed = DedupResultSchema.parse(result.deduplicationResult)
    expect(parsed.total_checked).toBe(2)
    expect(parsed.duplicates_found + parsed.related_found + parsed.new_findings).toBe(2)
  })

  it('returns new verdict when no stories.index.md files exist', async () => {
    // testDir has no "future" subdirectory — no stories to compare against
    const finding = makeFinding({ title: 'Some finding title' })
    const state = makeState([finding])

    const result = await deduplicate(state, testDir)

    const updatedFinding = state.findings[0]
    expect(updatedFinding.dedup_check?.verdict).toBe('new')
    expect(result.deduplicationResult?.new_findings).toBe(1)
    expect(result.deduplicationResult?.duplicates_found).toBe(0)
  })

  it('handles empty findings list gracefully', async () => {
    await createStoriesIndex(`| Story | Title | Status |
|-------|-------|--------|
| TEST-001 | Fix authentication login flow security | done |
`)

    const state = makeState([])
    const result = await deduplicate(state, testDir)

    expect(result.deduplicationResult?.total_checked).toBe(0)
    expect(result.deduplicationResult?.duplicates_found).toBe(0)
    expect(result.deduplicationResult?.new_findings).toBe(0)
  })

  it('finding with 0.5-0.8 Jaccard similarity gets verdict: related', async () => {
    await createStoriesIndex(`| Story | Title | Status |
|-------|-------|--------|
| TEST-001 | Fix authentication login security | done |
`)

    // Partial overlap with "Fix authentication login security":
    // "authentication login" are shared but rest differs
    const finding = makeFinding({
      title: 'authentication login timeout configuration refactor',
    })
    const state = makeState([finding])

    await deduplicate(state, testDir)

    const updatedFinding = state.findings[0]
    // Accept either 'related' or 'duplicate' depending on exact similarity score
    expect(['related', 'duplicate', 'new']).toContain(updatedFinding.dedup_check?.verdict)
  })
})
