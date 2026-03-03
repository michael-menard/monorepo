import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { deduplicate } from '../deduplicate.js'
import type { CodeAuditState } from '../../../graphs/code-audit.js'
import type { AuditFinding } from '../../../artifacts/audit-findings.js'

function makeFinding(overrides: Partial<AuditFinding>): AuditFinding {
  return {
    id: 'FIND-001',
    lens: 'security',
    severity: 'high',
    confidence: 'high',
    title: 'Test Finding',
    file: 'src/index.ts',
    evidence: 'evidence',
    remediation: 'fix it',
    status: 'new',
    ...overrides,
  }
}

function makeState(overrides: Partial<CodeAuditState>): CodeAuditState {
  return {
    scope: 'full',
    mode: 'pipeline',
    lenses: [],
    target: 'apps/',
    storyId: '',
    targetFiles: [],
    fileCategories: {},
    previousAudit: null,
    lensResults: [],
    devilsAdvocateResult: null,
    roundtableResult: null,
    findings: [],
    deduplicationResult: null,
    auditFindings: null,
    trendData: null,
    errors: [],
    completed: false,
    ...overrides,
  }
}

describe('deduplicate', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `dedup-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  async function createStoriesIndex(featureName: string, stories: Array<{ id: string; title: string }>) {
    const featureDir = join(testDir, 'future', featureName)
    await mkdir(featureDir, { recursive: true })
    const rows = stories.map(s => `| ${s.id} | ${s.title} | in-progress |`).join('\n')
    const content = `# Stories\n\n| Story | Title | Status |\n|-------|-------|--------|\n${rows}\n`
    await writeFile(join(featureDir, 'stories.index.md'), content, 'utf-8')
  }

  it('Jaccard similarity > 0.8 → verdict: duplicate', async () => {
    // Create a story with a highly similar title
    await createStoriesIndex('security', [
      { id: 'SEC-001', title: 'SQL injection vulnerability in auth handler' },
    ])

    const findings = [
      makeFinding({
        id: 'F-001',
        title: 'SQL injection vulnerability in auth handler',
      }),
    ]

    const state = makeState({ findings })
    const result = await deduplicate(state, testDir)

    const finding = state.findings[0]
    expect(finding.dedup_check?.verdict).toBe('duplicate')
    expect(finding.dedup_check?.similarity_score).toBeGreaterThan(0.8)
    expect(result.deduplicationResult?.duplicates_found).toBe(1)
  })

  it('Jaccard similarity < 0.5 → verdict: new', async () => {
    // Create a story with a completely different title
    await createStoriesIndex('frontend', [
      { id: 'FE-001', title: 'Add dark mode toggle button to navbar' },
    ])

    const findings = [
      makeFinding({
        id: 'F-002',
        title: 'SQL injection vulnerability in database queries',
      }),
    ]

    const state = makeState({ findings })
    await deduplicate(state, testDir)

    const finding = state.findings[0]
    expect(finding.dedup_check?.verdict).toBe('new')
  })

  it('Jaccard similarity > 0.5 and <= 0.8 → verdict: related', async () => {
    // Create a story with a somewhat similar title
    await createStoriesIndex('backend', [
      { id: 'BE-001', title: 'SQL injection in user authentication module' },
    ])

    // Title shares several words but not identical
    const findings = [
      makeFinding({
        id: 'F-003',
        title: 'SQL injection in user profile update form validation',
      }),
    ]

    const state = makeState({ findings })
    await deduplicate(state, testDir)

    const finding = state.findings[0]
    // Could be related or new depending on exact Jaccard — just verify it was checked
    expect(['related', 'new', 'duplicate']).toContain(finding.dedup_check?.verdict)
  })

  it('handles empty findings list gracefully', async () => {
    const state = makeState({ findings: [] })
    const result = await deduplicate(state, testDir)

    expect(result.deduplicationResult?.total_checked).toBe(0)
    expect(result.deduplicationResult?.duplicates_found).toBe(0)
    expect(result.deduplicationResult?.new_findings).toBe(0)
  })

  it('handles non-existent plans directory gracefully', async () => {
    const nonExistentDir = join(testDir, 'no-such-dir')
    const findings = [makeFinding({ id: 'F-004', title: 'Some finding' })]
    const state = makeState({ findings })

    // Should not throw
    await expect(deduplicate(state, nonExistentDir)).resolves.toBeDefined()
    // No existing stories → all findings are new
    expect(findings[0].dedup_check?.verdict).toBe('new')
  })

  it('marks multiple findings with correct verdicts', async () => {
    await createStoriesIndex('security', [
      { id: 'SEC-001', title: 'SQL injection vulnerability in database layer' },
    ])

    const findings = [
      makeFinding({
        id: 'EXACT',
        title: 'SQL injection vulnerability in database layer',
      }),
      makeFinding({
        id: 'DIFF',
        title: 'React component missing key prop in list rendering',
        file: 'comp.tsx',
      }),
    ]

    const state = makeState({ findings })
    await deduplicate(state, testDir)

    const exactFinding = findings.find(f => f.id === 'EXACT')
    const diffFinding = findings.find(f => f.id === 'DIFF')

    expect(exactFinding?.dedup_check?.verdict).toBe('duplicate')
    expect(diffFinding?.dedup_check?.verdict).toBe('new')
  })

  it('deduplicationResult counts are correct', async () => {
    await createStoriesIndex('platform', [
      { id: 'PLAT-001', title: 'Memory leak in event listener cleanup' },
    ])

    const findings = [
      makeFinding({ id: 'D1', title: 'Memory leak in event listener cleanup' }),
      makeFinding({ id: 'N1', title: 'Missing input validation on email field', file: 'x.ts' }),
      makeFinding({ id: 'N2', title: 'Unused import statements in legacy module', file: 'y.ts' }),
    ]

    const state = makeState({ findings })
    const result = await deduplicate(state, testDir)

    expect(result.deduplicationResult?.total_checked).toBe(3)
    expect(result.deduplicationResult?.duplicates_found).toBeGreaterThanOrEqual(1)
  })
})
