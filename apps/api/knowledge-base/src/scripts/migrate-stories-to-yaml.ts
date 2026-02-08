/**
 * Story Migration Script - Markdown to YAML
 *
 * Converts existing story directories from markdown format to structured YAML schemas.
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-stories-to-yaml.ts --dry-run
 *   pnpm tsx src/scripts/migrate-stories-to-yaml.ts
 *
 * Input: plans/future/{feature}/{stage}/{STORY-ID}/
 * Output: Replaces markdown files with YAML schemas
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'

// ============================================================================
// Types
// ============================================================================

interface StoryYaml {
  schema: number
  id: string
  feature: string
  type: 'feature' | 'bug' | 'tech-debt' | 'spike' | 'chore'
  state: 'draft' | 'backlog' | 'ready-to-work' | 'in-progress' | 'ready-for-qa' | 'uat' | 'done'
  title: string
  points: number | null
  priority: 'p0' | 'p1' | 'p2' | 'p3' | null
  blocked_by: string | null
  depends_on: string[]
  follow_up_from: string | null
  scope: {
    packages: string[]
    surfaces: ('backend' | 'frontend' | 'infra')[]
  }
  goal: string
  non_goals: string[]
  acs: Array<{
    id: string
    text: string
    type: string
  }>
  risks: Array<{
    risk: string
    mitigation: string
  }>
  created_at: string
  updated_at: string
}

interface ElaborationYaml {
  schema: number
  story_id: string
  date: string
  verdict: 'pass' | 'fail' | 'skip'
  audit: Record<string, { status: string; note: string }>
  gaps: Array<{
    id: string
    category: string
    severity: string
    finding: string
    recommendation: string
  }>
  split_required: boolean
  follow_ups: Array<{
    finding: string
    story_id: string | null
  }>
  tokens: { input: number; output: number }
}

interface PlanYaml {
  schema: number
  story_id: string
  version: number
  approved: boolean
  estimates: { files: number; tokens: number }
  chunks: Array<{
    id: number
    name: string
    acs: string[]
    files: Array<{ path: string; action: 'create' | 'modify' | 'delete' }>
    depends_on?: number[]
  }>
  reuse: string[]
}

interface VerificationYaml {
  schema: number
  story_id: string
  updated: string
  code_review: {
    verdict: 'pass' | 'fail'
    iterations: number
    final_issues: { errors: number; warnings: number; note: string }
  }
  tests: {
    unit: { passed: number; failed: number }
    integration: { passed: number; failed: number }
    e2e: { passed: number; failed: number }
  }
  acs: Array<{
    id: string
    verdict: 'pass' | 'fail' | 'skip'
    evidence: string
  }>
  qa: {
    verdict: 'pass' | 'fail'
    verified_by: string
    verified_at: string
    blocking_issues: string[]
  }
}

interface ProofYaml {
  schema: number
  story_id: string
  completed_at: string
  summary: string[]
  deliverables: Array<{
    path: string
    type: string
    count?: number
  }>
  verification: {
    tests_passed: number
    all_acs_verified: boolean
  }
  limitations: string[]
}

interface TokensYaml {
  schema: number
  story_id: string
  total: { input: number; output: number }
  phases: Array<{
    phase: string
    input: number
    output: number
  }>
  high_cost: Array<{
    operation: string
    tokens: number
    avoidable: boolean
  }>
}

interface ContextYaml {
  schema: number
  story_id: string
  feature: string
  state: string
  paths: { story: string; artifacts: string }
  files: Record<string, string>
  implementation: string[]
  notes: string[]
}

interface MigrationResult {
  storyId: string
  storyDir: string
  filesConverted: string[]
  errors: string[]
}

// ============================================================================
// Parsers
// ============================================================================

function parseStoryMarkdown(
  content: string,
  storyId: string,
  feature: string,
  stage: string,
): StoryYaml {
  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const frontmatter = frontmatterMatch ? yaml.parse(frontmatterMatch[1]) : {}

  // Parse title
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].replace(/^[A-Z]+-\d+:\s*/, '') : storyId

  // Map stage to state
  const stateMap: Record<string, StoryYaml['state']> = {
    backlog: 'backlog',
    'ready-to-work': 'ready-to-work',
    'in-progress': 'in-progress',
    'ready-for-qa': 'ready-for-qa',
    uat: 'uat',
    UAT: 'uat',
    completed: 'done',
    done: 'done',
  }
  const state = stateMap[stage] || stateMap[frontmatter.status] || 'backlog'

  // Parse goal
  const goalMatch = content.match(/## Goal\n\n([^\n]+)/)
  const goal = goalMatch ? goalMatch[1].trim() : ''

  // Parse non-goals
  const nonGoalsMatch = content.match(/## Non-goals\n\n([\s\S]*?)(?=\n##|\n---|\Z)/)
  const nonGoals: string[] = []
  if (nonGoalsMatch) {
    const lines = nonGoalsMatch[1].split('\n')
    for (const line of lines) {
      const item = line.replace(/^[-*]\s*/, '').trim()
      if (item) nonGoals.push(item)
    }
  }

  // Parse acceptance criteria
  const acsMatch = content.match(/## Acceptance Criteria\n\n([\s\S]*?)(?=\n##|\n---|\Z)/)
  const acs: StoryYaml['acs'] = []
  if (acsMatch) {
    const acRegex = /- \[[ x]\] (AC\s*\d+):\s*(.+)/gi
    let match
    while ((match = acRegex.exec(acsMatch[1])) !== null) {
      acs.push({
        id: match[1].replace(/\s+/g, ''),
        text: match[2].trim(),
        type: 'functional',
      })
    }
  }

  // Parse risks
  const risksMatch = content.match(/## Risk Notes\n\n([\s\S]*?)(?=\n##|\n---|\Z)/)
  const risks: StoryYaml['risks'] = []
  if (risksMatch) {
    const riskRegex = /\*\*Risk \d+:\s*([^*]+)\*\*\n[^*]*\*\*Mitigation\*\*:\s*([^\n]+)/gi
    let match
    while ((match = riskRegex.exec(risksMatch[1])) !== null) {
      risks.push({
        risk: match[1].trim(),
        mitigation: match[2].trim(),
      })
    }
  }

  // Parse scope - look for packages
  const packagesMatch = content.match(/### Packages Affected\n\n([\s\S]*?)(?=\n##|\n###|\n---|\Z)/)
  const packages: string[] = []
  if (packagesMatch) {
    const lines = packagesMatch[1].split('\n')
    for (const line of lines) {
      const pkg = line
        .replace(/^[-*]\s*`?/, '')
        .replace(/`?\s*[-–].*$/, '')
        .trim()
      if (
        (pkg && pkg.startsWith('packages/')) ||
        pkg.startsWith('.github/') ||
        pkg.startsWith('apps/')
      ) {
        packages.push(pkg)
      }
    }
  }

  // Determine surfaces
  const surfaces: StoryYaml['scope']['surfaces'] = []
  const contentLower = content.toLowerCase()
  if (
    contentLower.includes('api') ||
    contentLower.includes('lambda') ||
    contentLower.includes('backend')
  ) {
    surfaces.push('backend')
  }
  if (
    contentLower.includes('react') ||
    contentLower.includes('frontend') ||
    contentLower.includes('component')
  ) {
    surfaces.push('frontend')
  }
  if (
    contentLower.includes('github actions') ||
    contentLower.includes('ci') ||
    contentLower.includes('infrastructure')
  ) {
    surfaces.push('infra')
  }
  if (surfaces.length === 0) surfaces.push('backend')

  return {
    schema: 1,
    id: storyId,
    feature,
    type: (frontmatter.doc_type === 'bug' ? 'bug' : 'feature') as StoryYaml['type'],
    state,
    title,
    points: frontmatter.estimated_points || null,
    priority: null,
    blocked_by: null,
    depends_on: frontmatter.depends_on || [],
    follow_up_from: frontmatter.follow_up_from || null,
    scope: { packages, surfaces },
    goal,
    non_goals: nonGoals,
    acs,
    risks,
    created_at: frontmatter.created_at || new Date().toISOString(),
    updated_at: frontmatter.updated_at || new Date().toISOString(),
  }
}

function parseElaborationMarkdown(content: string, storyId: string): ElaborationYaml {
  // Parse verdict
  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(\w+)/i)
  const verdict = verdictMatch ? (verdictMatch[1].toLowerCase() as 'pass' | 'fail') : 'pass'

  // Parse date
  const dateMatch = content.match(/\*\*Date\*\*:\s*([\d-]+)/)
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]

  // Parse audit results table
  const audit: ElaborationYaml['audit'] = {}
  const auditMatch = content.match(/## Audit Results\n\n\|[\s\S]*?\n\n/)
  if (auditMatch) {
    const rows = auditMatch[0].split('\n').filter(r => r.startsWith('|') && !r.includes('---'))
    for (const row of rows.slice(1)) {
      // Skip header
      const cols = row
        .split('|')
        .map(c => c.trim())
        .filter(Boolean)
      if (cols.length >= 4) {
        const check = cols[1].toLowerCase().replace(/\s+/g, '_')
        audit[check] = { status: cols[2].toLowerCase(), note: cols[4] || '' }
      }
    }
  }

  // Parse gaps
  const gaps: ElaborationYaml['gaps'] = []
  const gapsMatch = content.match(/### Gaps Identified\n\n\|[\s\S]*?\n\n/)
  if (gapsMatch) {
    const rows = gapsMatch[0].split('\n').filter(r => r.startsWith('|') && !r.includes('---'))
    for (const row of rows.slice(1)) {
      const cols = row
        .split('|')
        .map(c => c.trim())
        .filter(Boolean)
      if (cols.length >= 3 && cols[1] !== 'No MVP-critical gaps identified') {
        gaps.push({
          id: `GAP-${cols[0]}`,
          category: 'requirements',
          severity: 'important',
          finding: cols[1],
          recommendation: '',
        })
      }
    }
  }

  // Parse follow-ups
  const followUps: ElaborationYaml['follow_ups'] = []
  const followUpMatch = content.match(
    /### Follow-up Stories Suggested\n\n([\s\S]*?)(?=\n##|\n###|\Z)/,
  )
  if (followUpMatch) {
    const lines = followUpMatch[1].split('\n')
    for (const line of lines) {
      const match = line.match(/- \[[ x]\] (.+?)(?:\s*→\s*([A-Z]+-\d+))?$/)
      if (match) {
        followUps.push({
          finding: match[1].trim(),
          story_id: match[2] || null,
        })
      }
    }
  }

  // Parse split recommendation
  const splitMatch = content.match(/## Split Recommendation\n\n\*\*(\w+)[^*]*\*\*/)
  const splitRequired = splitMatch ? splitMatch[1].toLowerCase() !== 'no' : false

  return {
    schema: 1,
    story_id: storyId,
    date,
    verdict,
    audit,
    gaps,
    split_required: splitRequired,
    follow_ups: followUps,
    tokens: { input: 0, output: 0 },
  }
}

function parsePlanMarkdown(content: string, storyId: string): PlanYaml {
  // Parse chunks
  const chunks: PlanYaml['chunks'] = []
  const chunkRegex = /### Chunk (\d+):\s*([^\n]+)\n\n([\s\S]*?)(?=\n### Chunk|\n## |\Z)/gi
  let match
  while ((match = chunkRegex.exec(content)) !== null) {
    const chunkId = parseInt(match[1])
    const name = match[2].trim()
    const chunkContent = match[3]

    // Parse files
    const files: PlanYaml['chunks'][0]['files'] = []
    const fileMatch = chunkContent.match(/\*\*File:\*\*\s*`([^`]+)`/)
    if (fileMatch) {
      files.push({ path: fileMatch[1], action: 'create' })
    }

    // Parse ACs
    const acsMatch = chunkContent.match(/\(AC[^)]+\)/)
    const acs = acsMatch ? [acsMatch[0].replace(/[()]/g, '')] : []

    chunks.push({
      id: chunkId,
      name,
      acs,
      files,
    })
  }

  // Parse reuse
  const reuse: string[] = []
  const reuseMatch = content.match(/### Existing Tools\n\n([\s\S]*?)(?=\n##|\n###|\Z)/)
  if (reuseMatch) {
    const lines = reuseMatch[1].split('\n')
    for (const line of lines) {
      const item = line.replace(/^[-*]\s*\*\*[^*]+\*\*:\s*/, '').trim()
      if (item) reuse.push(item)
    }
  }

  return {
    schema: 1,
    story_id: storyId,
    version: 1,
    approved: true,
    estimates: { files: chunks.reduce((sum, c) => sum + c.files.length, 0), tokens: 25000 },
    chunks,
    reuse,
  }
}

function parseVerificationYaml(content: string, storyId: string): VerificationYaml {
  const data = yaml.parse(content)

  return {
    schema: 1,
    story_id: storyId,
    updated: data.updated || new Date().toISOString(),
    code_review: {
      verdict: data.code_review?.verdict?.toLowerCase() || 'pass',
      iterations: data.iteration || 1,
      final_issues: {
        errors: data.code_review?.lint?.errors || 0,
        warnings: data.code_review?.lint?.warnings || 0,
        note: '',
      },
    },
    tests: {
      unit: data.qa_verify?.test_results?.unit || { passed: 0, failed: 0 },
      integration: data.qa_verify?.test_results?.integration || { passed: 0, failed: 0 },
      e2e: data.qa_verify?.test_results?.e2e || { passed: 0, failed: 0 },
    },
    acs: (data.qa_verify?.acs_verified || []).map((ac: any) => ({
      id: ac.ac?.match(/AC\s*\d+/)?.[0]?.replace(/\s+/g, '') || 'AC?',
      verdict: ac.status?.toLowerCase() || 'pass',
      evidence: ac.evidence || '',
    })),
    qa: {
      verdict: data.qa_verify?.verdict?.toLowerCase() || 'pass',
      verified_by: data.verified_by || 'unknown',
      verified_at: data.verified_at || new Date().toISOString(),
      blocking_issues: data.gate?.blocking_issues || [],
    },
  }
}

function parseProofMarkdown(content: string, storyId: string): ProofYaml {
  // Parse summary
  const summaryMatch = content.match(/## Implementation Summary\n\n([\s\S]*?)(?=\n##|\Z)/)
  const summary: string[] = []
  if (summaryMatch) {
    const lines = summaryMatch[1].split('\n')
    for (const line of lines) {
      const item = line.replace(/^[-*\d.]\s*/, '').trim()
      if (item && !item.startsWith('|') && !item.startsWith('#')) {
        summary.push(item)
      }
    }
  }

  // Parse deliverables
  const deliverables: ProofYaml['deliverables'] = []
  const filesMatch = content.match(/## Files Changed\n\n([\s\S]*?)(?=\n##|\Z)/)
  if (filesMatch) {
    const pathRegex = /`([^`]+\.(ts|tsx|js|jsx|yml|yaml|md|json))`/g
    let match
    while ((match = pathRegex.exec(filesMatch[1])) !== null) {
      const filePath = match[1]
      let type = 'code'
      if (filePath.includes('test')) type = 'tests'
      else if (filePath.endsWith('.md')) type = 'docs'
      else if (filePath.includes('workflow')) type = 'workflow'
      deliverables.push({ path: filePath, type })
    }
  }

  // Parse test count
  const testMatch = content.match(/(\d+)\/(\d+)/)
  const testsPassed = testMatch ? parseInt(testMatch[1]) : 0

  // Parse limitations
  const limitations: string[] = []
  const limitMatch = content.match(/## Known Limitations\n\n([\s\S]*?)(?=\n##|\Z)/)
  if (limitMatch) {
    const lines = limitMatch[1].split('\n')
    for (const line of lines) {
      const item = line.replace(/^\d+\.\s*\*\*[^*]+\*\*:\s*/, '').trim()
      if (item && !item.startsWith('-')) {
        limitations.push(item)
      }
    }
  }

  return {
    schema: 1,
    story_id: storyId,
    completed_at: new Date().toISOString(),
    summary: summary.slice(0, 5),
    deliverables,
    verification: {
      tests_passed: testsPassed,
      all_acs_verified: true,
    },
    limitations,
  }
}

function parseTokenLog(content: string, storyId: string): TokensYaml {
  const phases: TokensYaml['phases'] = []
  let totalInput = 0
  let totalOutput = 0

  // Parse table rows
  const rows = content
    .split('\n')
    .filter(r => r.startsWith('|') && !r.includes('---') && !r.includes('Timestamp'))
  for (const row of rows) {
    const cols = row
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
    if (cols.length >= 5) {
      const phase = cols[1]
      const input = parseInt(cols[2].replace(/,/g, '')) || 0
      const output = parseInt(cols[3].replace(/,/g, '')) || 0
      phases.push({ phase, input, output })
      totalInput += input
      totalOutput += output
    }
  }

  return {
    schema: 1,
    story_id: storyId,
    total: { input: totalInput, output: totalOutput },
    phases,
    high_cost: [],
  }
}

function parseAgentContext(
  content: string,
  storyId: string,
  feature: string,
  state: string,
): ContextYaml {
  // Parse paths from yaml block
  const yamlMatch = content.match(/```yaml\n([\s\S]*?)\n```/)
  const contextData = yamlMatch ? yaml.parse(yamlMatch[1]) : {}

  // Parse implementation files
  const implementation: string[] = []
  const implMatch = content.match(/### Primary Deliverables\n\n([\s\S]*?)(?=\n##|\n###|\Z)/)
  if (implMatch) {
    const pathRegex = /`([^`]+)`/g
    let match
    while ((match = pathRegex.exec(implMatch[1])) !== null) {
      if (match[1].includes('/') && !match[1].startsWith('_')) {
        implementation.push(match[1])
      }
    }
  }

  // Parse notes
  const notes: string[] = []
  const notesMatch = content.match(/## Notes\n\n([\s\S]*?)(?=\n##|\Z)/)
  if (notesMatch) {
    const lines = notesMatch[1].split('\n')
    for (const line of lines) {
      const item = line.replace(/^[-*]\s*/, '').trim()
      if (item) notes.push(item)
    }
  }

  return {
    schema: 1,
    story_id: storyId,
    feature,
    state,
    paths: {
      story: contextData.base_path || `plans/future/${feature}/${state}/${storyId}/`,
      artifacts:
        contextData.artifacts_path ||
        `plans/future/${feature}/${state}/${storyId}/_implementation/`,
    },
    files: {
      story: 'story.yaml',
      plan: 'plan.yaml',
      verification: 'verification.yaml',
    },
    implementation,
    notes,
  }
}

// ============================================================================
// Migration Logic
// ============================================================================

async function findStoryDirectories(basePath: string): Promise<string[]> {
  const storyDirs: string[] = []
  const features = await fs.readdir(basePath)

  for (const feature of features) {
    const featurePath = path.join(basePath, feature)
    const stat = await fs.stat(featurePath)
    if (!stat.isDirectory()) continue

    // Check each stage directory
    const stages = [
      'backlog',
      'ready-to-work',
      'in-progress',
      'ready-for-qa',
      'uat',
      'UAT',
      'completed',
    ]
    for (const stage of stages) {
      const stagePath = path.join(featurePath, stage)
      try {
        const stories = await fs.readdir(stagePath)
        for (const story of stories) {
          if (story.match(/^[A-Z]+-\d+$/)) {
            storyDirs.push(path.join(stagePath, story))
          }
        }
      } catch {
        // Stage directory doesn't exist
      }
    }
  }

  return storyDirs
}

async function migrateStoryDirectory(storyDir: string, dryRun: boolean): Promise<MigrationResult> {
  const result: MigrationResult = {
    storyId: path.basename(storyDir),
    storyDir,
    filesConverted: [],
    errors: [],
  }

  const storyId = result.storyId
  const pathParts = storyDir.split(path.sep)
  const stageIndex = pathParts.findIndex(p =>
    ['backlog', 'ready-to-work', 'in-progress', 'ready-for-qa', 'uat', 'UAT', 'completed'].includes(
      p,
    ),
  )
  const stage = pathParts[stageIndex] || 'backlog'
  const feature = pathParts[stageIndex - 1] || 'unknown'

  const implDir = path.join(storyDir, '_implementation')

  try {
    // 1. Convert story markdown
    const storyMdPath = path.join(storyDir, `${storyId}.md`)
    try {
      const storyMd = await fs.readFile(storyMdPath, 'utf-8')
      const storyYaml = parseStoryMarkdown(storyMd, storyId, feature, stage)
      const storyYamlPath = path.join(storyDir, 'story.yaml')

      if (!dryRun) {
        await fs.writeFile(storyYamlPath, yaml.stringify(storyYaml, { lineWidth: 120 }))
      }
      result.filesConverted.push('story.yaml')
    } catch (e) {
      result.errors.push(`story.yaml: ${e}`)
    }

    // 2. Convert elaboration
    const elabMdPath = path.join(storyDir, `ELAB-${storyId}.md`)
    try {
      const elabMd = await fs.readFile(elabMdPath, 'utf-8')
      const elabYaml = parseElaborationMarkdown(elabMd, storyId)
      const elabYamlPath = path.join(storyDir, 'elaboration.yaml')

      if (!dryRun) {
        await fs.writeFile(elabYamlPath, yaml.stringify(elabYaml, { lineWidth: 120 }))
      }
      result.filesConverted.push('elaboration.yaml')
    } catch {
      // Elaboration may not exist for all stories
    }

    // 3. Convert implementation plan
    const planMdPath = path.join(implDir, 'IMPLEMENTATION-PLAN.md')
    try {
      const planMd = await fs.readFile(planMdPath, 'utf-8')
      const planYaml = parsePlanMarkdown(planMd, storyId)
      const planYamlPath = path.join(storyDir, 'plan.yaml')

      if (!dryRun) {
        await fs.writeFile(planYamlPath, yaml.stringify(planYaml, { lineWidth: 120 }))
      }
      result.filesConverted.push('plan.yaml')
    } catch {
      // Plan may not exist
    }

    // 4. Convert verification
    const verifyYamlPath = path.join(implDir, 'VERIFICATION.yaml')
    try {
      const verifyYamlContent = await fs.readFile(verifyYamlPath, 'utf-8')
      const verificationYaml = parseVerificationYaml(verifyYamlContent, storyId)
      const newVerifyPath = path.join(storyDir, 'verification.yaml')

      if (!dryRun) {
        await fs.writeFile(newVerifyPath, yaml.stringify(verificationYaml, { lineWidth: 120 }))
      }
      result.filesConverted.push('verification.yaml')
    } catch {
      // Verification may not exist
    }

    // 5. Convert proof
    const proofMdPath = path.join(storyDir, `PROOF-${storyId}.md`)
    try {
      const proofMd = await fs.readFile(proofMdPath, 'utf-8')
      const proofYaml = parseProofMarkdown(proofMd, storyId)
      const proofYamlPath = path.join(storyDir, 'proof.yaml')

      if (!dryRun) {
        await fs.writeFile(proofYamlPath, yaml.stringify(proofYaml, { lineWidth: 120 }))
      }
      result.filesConverted.push('proof.yaml')
    } catch {
      // Proof may not exist
    }

    // 6. Convert token log
    const tokenLogPath = path.join(implDir, 'TOKEN-LOG.md')
    try {
      const tokenLog = await fs.readFile(tokenLogPath, 'utf-8')
      const tokensYaml = parseTokenLog(tokenLog, storyId)
      const tokensYamlPath = path.join(storyDir, 'tokens.yaml')

      if (!dryRun) {
        await fs.writeFile(tokensYamlPath, yaml.stringify(tokensYaml, { lineWidth: 120 }))
      }
      result.filesConverted.push('tokens.yaml')
    } catch {
      // Token log may not exist
    }

    // 7. Convert agent context
    const contextMdPath = path.join(implDir, 'AGENT-CONTEXT.md')
    try {
      const contextMd = await fs.readFile(contextMdPath, 'utf-8')
      const contextYaml = parseAgentContext(contextMd, storyId, feature, stage)
      const contextYamlPath = path.join(storyDir, 'context.yaml')

      if (!dryRun) {
        await fs.writeFile(contextYamlPath, yaml.stringify(contextYaml, { lineWidth: 120 }))
      }
      result.filesConverted.push('context.yaml')
    } catch {
      // Context may not exist
    }
  } catch (e) {
    result.errors.push(`General error: ${e}`)
  }

  return result
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('\n' + '='.repeat(60))
  console.log('  Story Migration: Markdown → YAML')
  console.log('='.repeat(60) + '\n')

  if (dryRun) {
    console.log('[DRY RUN] No files will be written\n')
  }

  const basePath = path.resolve(process.cwd(), '../../../plans/future')
  console.log(`Scanning: ${basePath}\n`)

  const storyDirs = await findStoryDirectories(basePath)
  console.log(`Found ${storyDirs.length} story directories\n`)

  let totalConverted = 0
  let totalErrors = 0

  for (const storyDir of storyDirs) {
    const result = await migrateStoryDirectory(storyDir, dryRun)

    if (verbose || result.errors.length > 0) {
      console.log(`\n${result.storyId}:`)
      if (result.filesConverted.length > 0) {
        console.log(`  Converted: ${result.filesConverted.join(', ')}`)
      }
      if (result.errors.length > 0) {
        for (const err of result.errors) {
          console.log(`  Error: ${err}`)
        }
      }
    } else {
      process.stdout.write('.')
    }

    totalConverted += result.filesConverted.length
    totalErrors += result.errors.length
  }

  console.log('\n\n' + '='.repeat(60))
  console.log('  Migration Summary')
  console.log('='.repeat(60) + '\n')
  console.log(`Stories processed: ${storyDirs.length}`)
  console.log(`Files converted:   ${totalConverted}`)
  console.log(`Errors:            ${totalErrors}`)

  if (dryRun) {
    console.log('\n[DRY RUN] No files were written')
  }
}

main().catch(console.error)
