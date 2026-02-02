#!/usr/bin/env npx tsx
/**
 * generate-workflow-docs.ts
 *
 * Generates markdown documentation from TypeScript schemas to ensure
 * Claude workflow documentation stays synchronized with LangGraph orchestrator.
 *
 * Usage:
 *   npx tsx scripts/generate-workflow-docs.ts
 *   npx tsx scripts/generate-workflow-docs.ts --dry-run  # Show what would be generated
 *
 * Generated files:
 *   - docs/generated/STATUS-ENUM.md
 *   - docs/generated/ERROR-TYPES.md
 *   - docs/generated/TOKEN-LIMITS.md
 *   - docs/generated/MODEL-ASSIGNMENTS.md
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const GENERATED_DIR = resolve(ROOT, 'docs/generated')

// ============================================================================
// Generation Functions
// ============================================================================

function generateStatusEnumDoc(): string | null {
  const stateMachinePath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/state/story-state-machine.ts',
  )

  if (!existsSync(stateMachinePath)) {
    console.log('⏭️  Skipping STATUS-ENUM.md: story-state-machine.ts not found')
    return null
  }

  const content = readFileSync(stateMachinePath, 'utf-8')

  // Extract enum values
  const enumMatch = content.match(/StoryStatusSchema\s*=\s*z\.enum\(\[([^\]]+)\]\)/s)
  if (!enumMatch) {
    console.log('⏭️  Skipping STATUS-ENUM.md: StoryStatusSchema not found')
    return null
  }

  const values = enumMatch[1]
    .split(',')
    .map(v => v.trim().replace(/['"]/g, ''))
    .filter(v => v.length > 0)

  // Extract transitions
  const transitionsMatch = content.match(
    /validTransitions\s*[=:]\s*\{([\s\S]*?)\}(?:\s*as\s*const)?/,
  )

  let transitionsTable = ''
  if (transitionsMatch) {
    const transitionsStr = transitionsMatch[1]
    const transitionLines = transitionsStr
      .split('\n')
      .filter(line => line.includes(':'))
      .map(line => {
        const match = line.match(/['"]?([^'":\s]+)['"]?\s*:\s*\[([^\]]*)\]/)
        if (match) {
          const from = match[1]
          const to = match[2]
            .split(',')
            .map(v => v.trim().replace(/['"]/g, ''))
            .filter(v => v.length > 0)
            .join(', ') || '(terminal)'
          return `| \`${from}\` | ${to} |`
        }
        return null
      })
      .filter(Boolean)

    if (transitionLines.length > 0) {
      transitionsTable = `
## Valid Transitions

| From Status | Valid Transitions |
|-------------|-------------------|
${transitionLines.join('\n')}
`
    }
  }

  return `# Story Status Enum

> **Auto-generated from TypeScript schema**
> Source: \`packages/backend/orchestrator/src/state/story-state-machine.ts\`
> Generated: ${new Date().toISOString()}

## Status Values

| Status | Description |
|--------|-------------|
${values.map(v => `| \`${v}\` | — |`).join('\n')}

${transitionsTable}

## Usage

\`\`\`typescript
import { StoryStatusSchema, canTransition } from '@repo/orchestrator'

// Validate a status
const status = StoryStatusSchema.parse('pending')

// Check if transition is valid
const canMove = canTransition('pending', 'generated') // true
const invalid = canTransition('pending', 'completed') // false
\`\`\`
`
}

function generateErrorTypesDoc(): string | null {
  const errorsPath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/errors/workflow-errors.ts',
  )

  if (!existsSync(errorsPath)) {
    console.log('⏭️  Skipping ERROR-TYPES.md: workflow-errors.ts not found')
    return null
  }

  const content = readFileSync(errorsPath, 'utf-8')

  // Extract error types from schema
  const enumMatch = content.match(
    /WorkflowErrorTypeSchema\s*=\s*z\.enum\(\[([^\]]+)\]\)/s,
  )
  if (!enumMatch) {
    console.log('⏭️  Skipping ERROR-TYPES.md: WorkflowErrorTypeSchema not found')
    return null
  }

  const errorTypes = enumMatch[1]
    .split(',')
    .map(v => v.trim().replace(/['"]/g, ''))
    .filter(v => v.length > 0)

  // Try to extract descriptions from schema or constants
  const descriptions: Record<string, string> = {
    AGENT_SPAWN_FAILED: 'Task tool failed to spawn agent',
    AGENT_TIMEOUT: 'Agent exceeded time limit',
    MALFORMED_OUTPUT: "Agent output doesn't match schema",
    PRECONDITION_FAILED: 'Required input missing',
    EXTERNAL_SERVICE_DOWN: 'KB, git, or other service unavailable',
  }

  return `# Workflow Error Types

> **Auto-generated from TypeScript schema**
> Source: \`packages/backend/orchestrator/src/errors/workflow-errors.ts\`
> Generated: ${new Date().toISOString()}

## Error Types

| Error Type | Description | Retryable |
|------------|-------------|-----------|
${errorTypes.map(e => `| \`${e}\` | ${descriptions[e] || '—'} | — |`).join('\n')}

## Error Contract

Each error includes:
- \`type\`: One of the error types above
- \`phase\`: The phase where the error occurred
- \`node\`: The node/agent that failed
- \`message\`: Human-readable error description
- \`retryable\`: Whether the operation can be retried
- \`retryCount\`: Current retry attempt (0-indexed)
- \`maxRetries\`: Maximum retry attempts allowed
- \`timestamp\`: ISO-8601 timestamp

## Usage

\`\`\`typescript
import { WorkflowErrorSchema } from '@repo/orchestrator'

const error = WorkflowErrorSchema.parse({
  type: 'AGENT_TIMEOUT',
  phase: 'dev-implementation',
  node: 'dev-implement-backend-coder',
  message: 'Agent exceeded 5 minute timeout',
  retryable: true,
  retryCount: 0,
  maxRetries: 3,
  timestamp: new Date().toISOString(),
})
\`\`\`
`
}

function generateTokenLimitsDoc(): string | null {
  const tokenBudgetPath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/utils/token-budget.ts',
  )

  if (!existsSync(tokenBudgetPath)) {
    console.log('⏭️  Skipping TOKEN-LIMITS.md: token-budget.ts not found')
    return null
  }

  const content = readFileSync(tokenBudgetPath, 'utf-8')

  // Extract DEFAULT_LIMITS object
  const limitsMatch = content.match(
    /DEFAULT_LIMITS\s*[=:]\s*\{([\s\S]*?)\}(?:\s*as\s*const)?/,
  )

  if (!limitsMatch) {
    console.log('⏭️  Skipping TOKEN-LIMITS.md: DEFAULT_LIMITS not found')
    return null
  }

  // Parse the limits
  const limitsStr = limitsMatch[1]
  const phaseMatches = limitsStr.matchAll(
    /(\w+)\s*:\s*\{\s*warning\s*:\s*(\d+)\s*,\s*hard\s*:\s*(\d+)\s*\}/g,
  )

  const phases: Array<{ name: string; warning: number; hard: number }> = []
  for (const match of phaseMatches) {
    phases.push({
      name: match[1],
      warning: parseInt(match[2], 10),
      hard: parseInt(match[3], 10),
    })
  }

  if (phases.length === 0) {
    console.log('⏭️  Skipping TOKEN-LIMITS.md: No phases found in DEFAULT_LIMITS')
    return null
  }

  const formatNumber = (n: number) => n.toLocaleString()

  return `# Token Budget Limits

> **Auto-generated from TypeScript schema**
> Source: \`packages/backend/orchestrator/src/utils/token-budget.ts\`
> Generated: ${new Date().toISOString()}

## Phase Limits

| Phase | Warning Threshold | Hard Limit |
|-------|-------------------|------------|
${phases.map(p => `| ${p.name.replace(/_/g, ' ')} | ${formatNumber(p.warning)} tokens | ${formatNumber(p.hard)} tokens |`).join('\n')}

## Enforcement Levels

| Level | Behavior |
|-------|----------|
| \`advisory\` | Log to TOKEN-LOG.md, continue |
| \`warning\` | Log + display warning to user, continue |
| \`soft_gate\` | Log + require user confirmation to continue |
| \`hard_gate\` | Log + FAIL phase, require budget increase |

## Configuration

Set in story frontmatter:

\`\`\`yaml
token_budget:
  enforcement: warning  # advisory | warning | soft_gate | hard_gate
  multiplier: 1.5       # Allow 1.5x default thresholds
\`\`\`

## Usage

\`\`\`typescript
import { DEFAULT_LIMITS, checkTokenBudget } from '@repo/orchestrator'

const result = checkTokenBudget({
  phase: 'dev_implementation',
  tokensUsed: 250000,
  enforcement: 'warning',
  multiplier: 1.0,
})

if (result.exceeded) {
  console.warn(\`Token budget exceeded: \${result.message}\`)
}
\`\`\`
`
}

function generateModelAssignmentsDoc(): string | null {
  const yamlPath = resolve(ROOT, '.claude/config/model-assignments.yaml')
  const tsPath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/config/model-assignments.ts',
  )

  if (!existsSync(yamlPath) && !existsSync(tsPath)) {
    console.log('⏭️  Skipping MODEL-ASSIGNMENTS.md: Neither source file found')
    return null
  }

  // Prefer YAML as source of truth
  if (existsSync(yamlPath)) {
    const yamlContent = readFileSync(yamlPath, 'utf-8')
    // Simple YAML parsing for key: value pairs
    const assignments: Array<{ agent: string; model: string }> = []

    const lines = yamlContent.split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*['"]?([^#:'"]+)['"]?\s*:\s*['"]?(haiku|sonnet|opus)['"]?\s*$/)
      if (match) {
        assignments.push({ agent: match[1].trim(), model: match[2] })
      }
    }

    if (assignments.length === 0) {
      console.log('⏭️  Skipping MODEL-ASSIGNMENTS.md: No assignments found in YAML')
      return null
    }

    // Group by model
    const byModel: Record<string, string[]> = { haiku: [], sonnet: [], opus: [] }
    for (const { agent, model } of assignments) {
      byModel[model]?.push(agent)
    }

    return `# Model Assignments

> **Auto-generated from YAML config**
> Source: \`.claude/config/model-assignments.yaml\`
> Generated: ${new Date().toISOString()}

## Agent → Model Matrix

| Agent | Model |
|-------|-------|
${assignments.map(a => `| \`${a.agent}\` | ${a.model} |`).join('\n')}

## By Model

### Haiku (Fast, Simple Tasks)
${byModel.haiku.length > 0 ? byModel.haiku.map(a => `- \`${a}\``).join('\n') : '_No assignments_'}

### Sonnet (Analysis, Code Generation)
${byModel.sonnet.length > 0 ? byModel.sonnet.map(a => `- \`${a}\``).join('\n') : '_No assignments_'}

### Opus (Complex Judgment)
${byModel.opus.length > 0 ? byModel.opus.map(a => `- \`${a}\``).join('\n') : '_No assignments_'}

## Model Selection Criteria

| Complexity | Model | Use Case |
|------------|-------|----------|
| Simple validation | haiku | Setup leaders, completion leaders, simple checks |
| Analysis/reasoning | sonnet | Workers that analyze code, make decisions |
| Complex judgment | opus | Reserved for critical decisions (rarely needed) |
`
  }

  // Fallback to TypeScript
  const tsContent = readFileSync(tsPath, 'utf-8')
  const assignmentsMatch = tsContent.match(
    /modelAssignments\s*[=:]\s*\{([\s\S]*?)\}/,
  )

  if (!assignmentsMatch) {
    console.log('⏭️  Skipping MODEL-ASSIGNMENTS.md: modelAssignments not found in TS')
    return null
  }

  return `# Model Assignments

> **Auto-generated from TypeScript**
> Source: \`packages/backend/orchestrator/src/config/model-assignments.ts\`
> Generated: ${new Date().toISOString()}

See source file for current assignments.
`
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('📝 Generating workflow documentation from TypeScript schemas...\n')

  if (!dryRun) {
    mkdirSync(GENERATED_DIR, { recursive: true })
  }

  const generators: Array<{
    name: string
    fn: () => string | null
    filename: string
  }> = [
    { name: 'Status Enum', fn: generateStatusEnumDoc, filename: 'STATUS-ENUM.md' },
    { name: 'Error Types', fn: generateErrorTypesDoc, filename: 'ERROR-TYPES.md' },
    { name: 'Token Limits', fn: generateTokenLimitsDoc, filename: 'TOKEN-LIMITS.md' },
    { name: 'Model Assignments', fn: generateModelAssignmentsDoc, filename: 'MODEL-ASSIGNMENTS.md' },
  ]

  let generated = 0
  let skipped = 0

  for (const { name, fn, filename } of generators) {
    const content = fn()

    if (content) {
      const filepath = resolve(GENERATED_DIR, filename)
      if (dryRun) {
        console.log(`✅ Would generate ${filename} (${content.length} bytes)`)
      } else {
        writeFileSync(filepath, content)
        console.log(`✅ Generated ${filename}`)
      }
      generated++
    } else {
      skipped++
    }
  }

  console.log('')
  console.log(`📊 Generated: ${generated}, Skipped: ${skipped}`)

  if (dryRun) {
    console.log('\n(Dry run - no files written)')
  } else if (generated > 0) {
    console.log(`\n📁 Files written to: ${GENERATED_DIR}`)
  }
}

main().catch(err => {
  console.error('Error generating docs:', err)
  process.exit(1)
})
