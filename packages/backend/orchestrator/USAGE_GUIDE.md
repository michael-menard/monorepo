# Usage Guide - Running LangGraph Workflows

The orchestrator package includes **3 complete, production-ready workflows**:

1. **Story Creation** - Generate and refine user stories
2. **Elaboration** - Analyze and expand story details
3. **Metrics Collection** - Gather and analyze workflow metrics

## Quick Start

### 1. Story Creation Workflow

Generates a complete user story with PM, UX, and QA analysis.

```typescript
import { runStoryCreation } from '@repo/orchestrator'

// Define your story request
const request = {
  domain: 'feat/user-authentication',
  description: 'Add Google OAuth login for users',
  stakeholder: 'Product Team',
  priority: 'high' as const,
}

// Run the workflow
const result = await runStoryCreation(request)

console.log('Story ID:', result.storyId)
console.log('Success:', result.success)
console.log('Story:', result.synthesizedStory)
console.log('Readiness Score:', result.readinessScore)
```

### 2. Elaboration Workflow

Analyzes changes in a story and provides targeted review.

```typescript
import { runElaboration } from '@repo/orchestrator'

// Run elaboration
const result = await runElaboration({
  storyId: 'FEAT-001',
  previousVersion: previousStoryYaml, // Optional
  currentVersion: currentStoryYaml,
})

console.log('Deltas detected:', result.deltaCount)
console.log('Significant changes:', result.significantChanges)
console.log('Review findings:', result.aggregatedFindings)
```

### 3. Metrics Collection Workflow

Collects and analyzes workflow performance metrics.

```typescript
import { runMetricsCollection } from '@repo/orchestrator'

const result = await runMetricsCollection({
  storyId: 'FEAT-001',
  metricsType: 'gap-analytics',
})

console.log('Metrics collected:', result.metrics)
console.log('Report:', result.report)
```

## Full Examples

### Complete Story Creation Example

```typescript
import {
  runStoryCreation,
  type StoryRequest,
  type BaselineReality,
} from '@repo/orchestrator'

async function createUserStory() {
  // 1. Define the story request
  const request: StoryRequest = {
    domain: 'feat/user-management',
    description: `
      As a user, I want to reset my password via email
      so that I can regain access if I forget my password.
    `,
    stakeholder: 'Product Team',
    priority: 'medium',
  }

  // 2. Optional: Load baseline constraints
  const baseline: BaselineReality | null = null // Or load from file

  // 3. Configure the workflow
  const config = {
    autoApprovalThreshold: 90, // Auto-approve if score >= 90
    minReadinessScore: 70, // Minimum score to proceed
    requireHiTL: false, // Skip human-in-the-loop for this example
    parallelFanout: true, // Run PM/UX/QA analyses in parallel
  }

  // 4. Run the workflow
  try {
    const result = await runStoryCreation(request, baseline, config)

    // 5. Handle results
    if (result.success) {
      console.log('\n=== Story Created Successfully ===')
      console.log('Story ID:', result.storyId)
      console.log('Readiness Score:', result.readinessScore)

      if (result.synthesizedStory) {
        console.log('\n--- Story Details ---')
        console.log('Title:', result.synthesizedStory.title)
        console.log('Priority:', result.synthesizedStory.priority)
        console.log('Acceptance Criteria:', result.synthesizedStory.acceptanceCriteria)

        if (result.synthesizedStory.pmGaps) {
          console.log('\n--- PM Analysis ---')
          console.log('Gaps:', result.synthesizedStory.pmGaps.gaps)
        }

        if (result.synthesizedStory.uxGaps) {
          console.log('\n--- UX Analysis ---')
          console.log('Recommendations:', result.synthesizedStory.uxGaps.recommendations)
        }

        if (result.synthesizedStory.qaGaps) {
          console.log('\n--- QA Analysis ---')
          console.log('Test Scenarios:', result.synthesizedStory.qaGaps.testScenarios)
        }
      }
    } else {
      console.error('Story creation failed:', result.phase)
      console.error('Errors:', result.errors)
    }

    return result
  } catch (error) {
    console.error('Workflow error:', error)
    throw error
  }
}

// Run it
createUserStory()
```

### With Database Persistence

```typescript
import {
  runStoryCreation,
  createStoryRepository,
  createWorkflowRepository,
} from '@repo/orchestrator'
import { Pool } from 'pg'

async function createStoryWithPersistence() {
  // Setup database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  // Create repositories
  const storyRepo = createStoryRepository(pool)
  const workflowRepo = createWorkflowRepository(pool)

  // Run with persistence
  const result = await runStoryCreation(
    {
      domain: 'feat/notifications',
      description: 'Add email notifications for account activity',
      stakeholder: 'Security Team',
      priority: 'high',
    },
    null,
    {
      persistToDb: true,
      storyRepo,
      workflowRepo,
    },
  )

  console.log('Story saved to database:', result.storyId)

  await pool.end()
  return result
}
```

### With Ollama LLM Integration

The workflows automatically use the hybrid Ollama/Claude system based on `model-assignments.yaml`:

```typescript
// Configure models (in .claude/config/model-assignments.yaml)
// pm-story-seed-agent: ollama:qwen2.5-coder:7b  # Fast local model
// pm-story-generation-leader: sonnet            # Complex reasoning

import { runStoryCreation, isOllamaAvailable } from '@repo/orchestrator'

async function createStoryWithOllama() {
  // Check Ollama availability
  const ollamaReady = await isOllamaAvailable()
  console.log('Ollama available:', ollamaReady)

  if (!ollamaReady) {
    console.log('Will fall back to Claude models')
  }

  // Run workflow - LLM selection is automatic
  const result = await runStoryCreation({
    domain: 'feat/search',
    description: 'Improve search functionality with filters',
    stakeholder: 'Product Team',
    priority: 'medium',
  })

  return result
}
```

## Workflow Configuration Options

### Story Creation Config

```typescript
type StoryCreationConfig = {
  autoApprovalThreshold?: number // 0-100, default: 95
  minReadinessScore?: number // 0-100, default: 70
  maxAttackIterations?: number // default: 3
  requireHiTL?: boolean // default: true
  nodeTimeoutMs?: number // default: 30000
  generateCommitmentBaseline?: boolean // default: true
  parallelFanout?: boolean // default: true
  persistToDb?: boolean // default: false
  storyRepo?: StoryRepository // for DB persistence
  workflowRepo?: WorkflowRepository // for DB persistence
}
```

### Elaboration Config

```typescript
type ElaborationConfig = {
  significanceThreshold?: number // default: 0.3
  enableEscapeHatch?: boolean // default: true
  escapeHatchThreshold?: number // default: 0.1
  nodeTimeoutMs?: number // default: 30000
  persistToDb?: boolean // default: false
}
```

### Metrics Config

```typescript
type MetricsGraphConfig = {
  metricsType: 'gap-analytics' | 'workflow-health' | 'performance'
  aggregationLevel?: 'story' | 'epic' | 'portfolio'
  includeTrends?: boolean // default: true
  nodeTimeoutMs?: number // default: 30000
}
```

## Workflow Results

### Story Creation Result

```typescript
type StoryCreationResult = {
  storyId: string
  phase: WorkflowPhase
  success: boolean
  synthesizedStory?: SynthesizedStory
  readinessScore?: number
  hitlDecision?: HiTLDecision
  errors?: Array<{ message: string; code: string }>
  durationMs: number
}
```

### Elaboration Result

```typescript
type ElaborationResult = {
  storyId: string
  phase: ElaborationPhase
  success: boolean
  deltaCount: number
  significantChanges: number
  aggregatedFindings?: AggregatedFindings
  errors?: Array<{ message: string; code: string }>
  durationMs: number
}
```

## Testing Workflows

Check the test files for complete examples:

```typescript
// See working examples in:
import { describe, it, expect } from 'vitest'
import { runStoryCreation } from '@repo/orchestrator'

describe('Story Creation', () => {
  it('creates a story successfully', async () => {
    const result = await runStoryCreation({
      domain: 'test/example',
      description: 'Test story',
      stakeholder: 'Test',
      priority: 'low',
    })

    expect(result.success).toBe(true)
    expect(result.storyId).toMatch(/^TEST-\d{4}$/)
  })
})
```

See comprehensive tests:
- `src/graphs/__tests__/story-creation.test.ts`
- `src/graphs/__tests__/elaboration.test.ts`
- `src/graphs/__tests__/metrics.test.ts`

## Environment Setup

### Required Environment Variables

```bash
# Ollama (optional - for hybrid LLM)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_ENABLE_FALLBACK=true
OLLAMA_FALLBACK_MODEL=haiku

# Database (optional - for persistence)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

### Model Assignments

Edit `.claude/config/model-assignments.yaml`:

```yaml
# Story creation agents
pm-story-seed-agent: sonnet
pm-story-adhoc-leader: sonnet
pm-story-generation-leader: sonnet

# Fast workers
code-review-lint: ollama:qwen2.5-coder:7b
code-review-syntax: ollama:qwen2.5-coder:7b
```

## Common Patterns

### Error Handling

```typescript
try {
  const result = await runStoryCreation(request)

  if (!result.success) {
    console.error('Workflow failed at phase:', result.phase)
    result.errors?.forEach((err) => {
      console.error(`[${err.code}] ${err.message}`)
    })
  }
} catch (error) {
  console.error('Unexpected error:', error)
}
```

### Monitoring Progress

```typescript
// Workflows emit state at each phase
// You can hook into this for progress tracking
const graph = createStoryCreationGraph(config)

const result = await graph.invoke(initialState, {
  // Add callbacks here if needed
})
```

### Custom Configuration

```typescript
const customConfig = {
  // Faster iterations for development
  nodeTimeoutMs: 10000,
  maxAttackIterations: 1,
  requireHiTL: false,

  // Skip expensive operations
  parallelFanout: false,
  generateCommitmentBaseline: false,
}

const result = await runStoryCreation(request, null, customConfig)
```

## Next Steps

1. **Try the examples** above
2. **Read the test files** for more patterns
3. **Check workflow source** in `src/graphs/` for internals
4. **Review node implementations** in `src/nodes/` for customization

## Documentation

- [README.md](./README.md) - Architecture and concepts
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Basic tutorial
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Syntax cheat sheet
- [Test Files](./src/graphs/__tests__/) - Working examples
