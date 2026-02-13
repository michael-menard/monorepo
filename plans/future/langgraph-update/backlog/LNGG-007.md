---
story_id: LNGG-007
title: Integration Test Suite - End-to-End Validation
status: backlog
created: 2026-02-13
updated: 2026-02-13
epic: LangGraph Integration Adapters
phase: 2-Validation
size: large
effort_hours: 8
complexity: high
risk_level: medium
blocked_by: [LNGG-001, LNGG-002, LNGG-003, LNGG-004]
blocks: []
priority: P0
---

# LNGG-007: Integration Test Suite - End-to-End Validation

## Context

All 6 adapters (LNGG-001 through LNGG-006) need comprehensive integration testing to ensure:
1. **Adapters work together** - StoryFileAdapter + IndexAdapter + StageAdapter workflow
2. **LangGraph integration** - Adapters integrate correctly with workflows
3. **Real-world scenarios** - Test with actual story files (INST-1008)
4. **Performance meets SLAs** - File operations <100ms p95
5. **Quality parity** - Results match Claude Code baseline

**Problem:** Unit tests validate individual adapters, but don't prove they work together in real workflows. Need confidence before migrating production commands.

**Impact:** Without E2E validation, migration risks data corruption, index drift, and quality regressions.

---

## Goal

Create comprehensive integration test suite covering:
1. Adapter combination scenarios
2. Full workflow E2E tests
3. Real story file testing
4. Performance benchmarks
5. Quality comparison vs Claude Code

---

## Acceptance Criteria

### AC1: Adapter Integration Tests
```typescript
Given multiple adapters working together
When integration test suite runs
Then it validates:
  - StoryFileAdapter + IndexAdapter (create story → update index)
  - StoryFileAdapter + StageAdapter (move story → update frontmatter)
  - IndexAdapter + StageAdapter (move story → update index)
  - CheckpointAdapter + StoryFileAdapter (checkpoint in story dir)
  - All 6 adapters in complete workflow
```

**Test Scenarios:**
```typescript
describe('Adapter Integration', () => {
  describe('Story Creation Flow', () => {
    it('creates story file and updates index atomically', async () => {
      const storyAdapter = new StoryFileAdapter(rootDir)
      const indexAdapter = new IndexAdapter(rootDir)

      // Create story
      const story = {
        frontmatter: {
          story_id: 'TEST-001',
          title: 'Test Story',
          status: 'backlog',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        content: '## Goal\n\nTest story content',
      }

      await storyAdapter.writeStory(story, 'plans/test-feature', 'backlog')

      // Update index
      await indexAdapter.addStory({
        story_id: 'TEST-001',
        title: 'Test Story',
        status: 'backlog',
        created: story.frontmatter.created,
        blocks: [],
        tags: ['test'],
      }, 'plans/test-feature')

      // Verify both succeeded
      const readStory = await storyAdapter.readStory('TEST-001', 'plans/test-feature', 'backlog')
      const index = await indexAdapter.readIndex('plans/test-feature')

      expect(readStory.frontmatter.story_id).toBe('TEST-001')
      expect(index.stories.find(s => s.story_id === 'TEST-001')).toBeDefined()
      expect(index.metrics.backlog).toBe(1)
    })

    it('rolls back on failure', async () => {
      // Simulate index update failure
      // Verify story file is also rolled back
    })
  })

  describe('Story Movement Flow', () => {
    it('moves story and updates both frontmatter and index', async () => {
      const storyAdapter = new StoryFileAdapter(rootDir)
      const stageAdapter = new StageAdapter(rootDir, storyAdapter, indexAdapter)

      // Setup: story in backlog
      await setupStory('TEST-002', 'backlog')

      // Move to ready-to-work
      await stageAdapter.moveStory('TEST-002', 'backlog', 'ready-to-work', 'plans/test-feature')

      // Verify directory moved
      const movedStory = await storyAdapter.readStory('TEST-002', 'plans/test-feature', 'ready-to-work')
      expect(movedStory.frontmatter.status).toBe('ready-to-work')

      // Verify index updated
      const index = await indexAdapter.readIndex('plans/test-feature')
      const story = index.stories.find(s => s.story_id === 'TEST-002')
      expect(story.status).toBe('ready-to-work')
      expect(index.metrics['ready-to-work']).toBe(1)
      expect(index.metrics.backlog).toBe(0)
    })
  })

  describe('Decision-Driven Workflow', () => {
    it('integrates decision callbacks with story updates', async () => {
      const decisionCallback = new AutoDecisionCallback({
        rules: [
          {
            condition: (ctx) => ctx.severity === 'high',
            decision: 'add-ac',
          },
        ],
      })

      // Simulate elaboration workflow
      const finding = {
        id: 'gap-001',
        type: 'pm-gap',
        severity: 'high',
        description: 'Missing acceptance criteria',
        mvpBlocking: true,
      }

      const response = await decisionCallback({
        id: 'decision-001',
        type: 'single-choice',
        question: 'How to handle gap?',
        options: [
          { value: 'add-ac', label: 'Add as AC' },
          { value: 'skip', label: 'Skip' },
        ],
        context: finding,
      })

      expect(response.answer).toBe('add-ac')

      // Apply decision to story
      const story = await storyAdapter.readStory('TEST-003', 'plans/test-feature', 'elaboration')
      story.content += `\n\n### AC3: ${finding.description}`
      await storyAdapter.writeStory(story, 'plans/test-feature', 'elaboration')

      // Verify update
      const updated = await storyAdapter.readStory('TEST-003', 'plans/test-feature', 'elaboration')
      expect(updated.content).toContain('Missing acceptance criteria')
    })
  })

  describe('Checkpoint Integration', () => {
    it('tracks workflow progress with checkpoints', async () => {
      const checkpointAdapter = new CheckpointAdapter(rootDir, storyAdapter)

      // Create checkpoint
      await checkpointAdapter.writeCheckpoint({
        storyId: 'TEST-004',
        workflowName: 'elaboration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phases: [
          { id: 0, name: 'Setup', status: 'completed', tokensUsed: 1000, notes: [] },
          { id: 1, name: 'Analysis', status: 'in-progress', tokensUsed: 500, notes: [] },
        ],
        resumeInfo: { lastPhase: 0, nextPhase: 1, canAutoResume: true },
        totalTokens: 1500,
      }, 'plans/test-feature', 'TEST-004')

      // Verify checkpoint file exists in story directory
      const checkpoint = await checkpointAdapter.readCheckpoint('plans/test-feature', 'TEST-004')
      expect(checkpoint).toBeDefined()
      expect(checkpoint.totalTokens).toBe(1500)

      // Test resume
      const resumePoint = await checkpointAdapter.getResumePoint('plans/test-feature', 'TEST-004')
      expect(resumePoint.canResume).toBe(true)
      expect(resumePoint.nextPhase).toBe(1)
    })
  })

  describe('KB Integration', () => {
    it('writes non-blocking findings to KB', async () => {
      const kbAdapter = new KBAdapter({ backend: 'file' })

      await kbAdapter.writeEntry({
        category: 'future-opportunity',
        storyId: 'TEST-005',
        title: 'Consider caching',
        content: 'API responses could be cached for better performance',
        tags: ['performance', 'api'],
        severity: 'low',
      })

      // Verify entry written
      const similar = await kbAdapter.findSimilar({
        category: 'future-opportunity',
        storyId: 'TEST-005',
        title: 'Consider caching',
        content: 'API responses could be cached',
        tags: ['performance'],
      })

      expect(similar.length).toBe(1)
      expect(similar[0].title).toBe('Consider caching')
    })
  })
})
```

---

### AC2: LangGraph E2E Tests
```typescript
Given real LangGraph workflows
When E2E test suite runs
Then it validates:
  - Story creation workflow (start to finish)
  - Elaboration workflow (with real PM/UX agents)
  - Decision callbacks integrated correctly
  - File I/O via adapters works
  - Checkpoints persist across runs
```

**Test Scenarios:**
```typescript
describe('LangGraph Workflows E2E', () => {
  describe('Story Creation Workflow', () => {
    it('creates complete story from prompt', async () => {
      const input = {
        userPrompt: 'Add email validation to login form',
        featureDir: 'plans/test-feature',
        targetStage: 'backlog',
      }

      const result = await runStoryCreationWorkflow(input, {
        storyFileAdapter,
        indexAdapter,
        checkpointAdapter,
      })

      expect(result.storyId).toMatch(/^[A-Z]{4}-\d{4}$/)
      expect(result.status).toBe('completed')

      // Verify story file created
      const story = await storyAdapter.readStory(result.storyId, 'plans/test-feature', 'backlog')
      expect(story.frontmatter.title).toContain('email validation')
      expect(story.content).toContain('## Goal')
      expect(story.content).toContain('## Acceptance Criteria')

      // Verify index updated
      const index = await indexAdapter.readIndex('plans/test-feature')
      expect(index.stories.find(s => s.story_id === result.storyId)).toBeDefined()
    })

    it('creates checkpoint during workflow', async () => {
      const input = {
        userPrompt: 'Add password reset feature',
        featureDir: 'plans/test-feature',
        targetStage: 'backlog',
      }

      const result = await runStoryCreationWorkflow(input, {
        storyFileAdapter,
        indexAdapter,
        checkpointAdapter,
      })

      // Verify checkpoint exists
      const checkpoint = await checkpointAdapter.readCheckpoint('plans/test-feature', result.storyId)
      expect(checkpoint).toBeDefined()
      expect(checkpoint.phases.filter(p => p.status === 'completed').length).toBeGreaterThan(0)
    })
  })

  describe('Elaboration Workflow', () => {
    it('analyzes story and detects PM gaps', async () => {
      // Setup: create a minimal story
      const storyId = 'TEST-ELAB-001'
      await setupMinimalStory(storyId, 'elaboration')

      const input = {
        storyId,
        featureDir: 'plans/test-feature',
        mode: 'auto', // Auto-decision mode
      }

      const result = await runElaborationWorkflow(input, {
        storyFileAdapter,
        indexAdapter,
        decisionCallback: new AutoDecisionCallback({ rules: elaborationAutoRules }),
        kbAdapter,
      })

      expect(result.status).toBe('completed')
      expect(result.pmGaps).toBeDefined()
      expect(result.uxGaps).toBeDefined()

      // Verify story updated with gaps
      const story = await storyAdapter.readStory(storyId, 'plans/test-feature', 'elaboration')
      expect(story.content.length).toBeGreaterThan(100) // Should have content added
    })

    it('handles user decisions in interactive mode', async () => {
      const storyId = 'TEST-ELAB-002'
      await setupMinimalStory(storyId, 'elaboration')

      // Mock CLI decision callback
      const mockDecisions = [
        { requestId: 'gap-001', answer: 'add-ac', cancelled: false, timedOut: false },
        { requestId: 'gap-002', answer: 'follow-up', cancelled: false, timedOut: false },
      ]

      const mockCallback = jest.fn().mockImplementation(async (request) => {
        return mockDecisions.find(d => d.requestId === request.id)
      })

      const result = await runElaborationWorkflow({
        storyId,
        featureDir: 'plans/test-feature',
        mode: 'interactive',
      }, {
        storyFileAdapter,
        indexAdapter,
        decisionCallback: mockCallback,
        kbAdapter,
      })

      expect(mockCallback).toHaveBeenCalled()
      expect(result.decisionsApplied).toBe(2)
    })

    it('writes non-blocking findings to KB', async () => {
      const storyId = 'TEST-ELAB-003'
      await setupMinimalStory(storyId, 'elaboration')

      const kbAdapter = new KBAdapter({ backend: 'file' })

      await runElaborationWorkflow({
        storyId,
        featureDir: 'plans/test-feature',
        mode: 'auto',
      }, {
        storyFileAdapter,
        indexAdapter,
        decisionCallback: new AutoDecisionCallback({ rules: elaborationAutoRules }),
        kbAdapter,
      })

      // Verify KB entries created for non-blocking findings
      // (This depends on workflow implementation)
    })
  })

  describe('Stage Movement Integration', () => {
    it('moves story through workflow stages', async () => {
      const storyId = 'TEST-STAGE-001'
      await setupStory(storyId, 'backlog')

      const stageAdapter = new StageAdapter(rootDir, storyAdapter, indexAdapter)

      // backlog → elaboration
      await stageAdapter.moveStory(storyId, 'backlog', 'elaboration', 'plans/test-feature')
      let story = await storyAdapter.readStory(storyId, 'plans/test-feature', 'elaboration')
      expect(story.frontmatter.status).toBe('elaboration')

      // elaboration → ready-to-work
      await stageAdapter.moveStory(storyId, 'elaboration', 'ready-to-work', 'plans/test-feature')
      story = await storyAdapter.readStory(storyId, 'plans/test-feature', 'ready-to-work')
      expect(story.frontmatter.status).toBe('ready-to-work')

      // Verify index updated at each step
      const index = await indexAdapter.readIndex('plans/test-feature')
      const indexStory = index.stories.find(s => s.story_id === storyId)
      expect(indexStory.status).toBe('ready-to-work')
    })
  })
})
```

---

### AC3: Real Story File Testing
```typescript
Given existing real story (INST-1008)
When test suite runs against it
Then it:
  - Reads story without corruption
  - Validates frontmatter schema
  - Preserves all content
  - Updates index correctly
  - Handles edge cases (long content, special chars)
```

**Test Scenarios:**
```typescript
describe('Real Story File Tests', () => {
  const INST_1008_PATH = '/Users/michaelmenard/Development/Monorepo/plans/future/instructions/INST-1008'

  it('reads INST-1008 without errors', async () => {
    const story = await storyAdapter.readStory('INST-1008', 'plans/future/instructions', 'INST-1008')

    expect(story).toBeDefined()
    expect(story.frontmatter.story_id).toBe('INST-1008')
    expect(story.frontmatter.title).toBeTruthy()
    expect(story.content).toBeTruthy()
  })

  it('validates INST-1008 frontmatter', async () => {
    const story = await storyAdapter.readStory('INST-1008', 'plans/future/instructions', 'INST-1008')
    const validation = storyAdapter.validate(story)

    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('updates INST-1008 without corruption', async () => {
    // Read original
    const original = await storyAdapter.readStory('INST-1008', 'plans/future/instructions', 'INST-1008')
    const originalContent = original.content

    // Update
    await storyAdapter.updateStory('INST-1008', {
      updated: new Date().toISOString(),
    }, 'plans/future/instructions', 'INST-1008')

    // Read updated
    const updated = await storyAdapter.readStory('INST-1008', 'plans/future/instructions', 'INST-1008')

    // Verify content preserved
    expect(updated.content).toBe(originalContent)
    expect(updated.frontmatter.updated).not.toBe(original.frontmatter.updated)
  })

  it('handles stories with special characters', async () => {
    // Test with story containing code blocks, emojis, etc.
  })

  it('handles large story files (>100KB)', async () => {
    // Test performance with large content
  })
})
```

---

### AC4: Performance Benchmarks
```typescript
Given SLA targets
When benchmark suite runs
Then it validates:
  - File read: <50ms p95
  - File write: <100ms p95
  - Index update: <100ms p95
  - Stage move: <200ms p95
  - Full workflow: <30s for story creation
```

**Benchmark Suite:**
```typescript
describe('Performance Benchmarks', () => {
  it('measures file read performance', async () => {
    const iterations = 100
    const timings: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await storyAdapter.readStory('INST-1008', 'plans/future/instructions', 'INST-1008')
      const duration = performance.now() - start
      timings.push(duration)
    }

    const p95 = calculatePercentile(timings, 95)
    console.log(`File read p95: ${p95.toFixed(2)}ms`)

    expect(p95).toBeLessThan(50) // SLA: <50ms p95
  })

  it('measures file write performance', async () => {
    const iterations = 100
    const timings: number[] = []

    const story = {
      frontmatter: {
        story_id: 'PERF-001',
        title: 'Performance Test',
        status: 'backlog',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      content: '## Test\n\nPerformance test content',
    }

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await storyAdapter.writeStory(story, 'plans/test-feature', 'backlog')
      const duration = performance.now() - start
      timings.push(duration)
    }

    const p95 = calculatePercentile(timings, 95)
    console.log(`File write p95: ${p95.toFixed(2)}ms`)

    expect(p95).toBeLessThan(100) // SLA: <100ms p95
  })

  it('measures index update performance', async () => {
    const iterations = 100
    const timings: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await indexAdapter.updateStory('TEST-001', {
        updated: new Date().toISOString(),
      }, 'plans/test-feature')
      const duration = performance.now() - start
      timings.push(duration)
    }

    const p95 = calculatePercentile(timings, 95)
    console.log(`Index update p95: ${p95.toFixed(2)}ms`)

    expect(p95).toBeLessThan(100) // SLA: <100ms p95
  })

  it('measures stage move performance', async () => {
    const iterations = 50
    const timings: number[] = []

    for (let i = 0; i < iterations; i++) {
      // Setup story
      await setupStory(`PERF-${i}`, 'backlog')

      const start = performance.now()
      await stageAdapter.moveStory(`PERF-${i}`, 'backlog', 'ready-to-work', 'plans/test-feature')
      const duration = performance.now() - start
      timings.push(duration)
    }

    const p95 = calculatePercentile(timings, 95)
    console.log(`Stage move p95: ${p95.toFixed(2)}ms`)

    expect(p95).toBeLessThan(200) // SLA: <200ms p95
  })

  it('measures full workflow performance', async () => {
    const iterations = 10
    const timings: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()

      await runStoryCreationWorkflow({
        userPrompt: `Performance test story ${i}`,
        featureDir: 'plans/test-feature',
        targetStage: 'backlog',
      }, {
        storyFileAdapter,
        indexAdapter,
        checkpointAdapter,
      })

      const duration = performance.now() - start
      timings.push(duration)
    }

    const p95 = calculatePercentile(timings, 95)
    console.log(`Story creation p95: ${(p95 / 1000).toFixed(2)}s`)

    expect(p95).toBeLessThan(30000) // SLA: <30s p95
  })
})

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.slice().sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[index]
}
```

---

### AC5: Quality Comparison vs Claude Code
```typescript
Given same input story
When run through both Claude Code and LangGraph
Then LangGraph output:
  - Matches Claude Code quality (manual review)
  - Contains all required sections
  - Has similar acceptance criteria coverage
  - Detects similar PM/UX gaps
```

**Comparison Tests:**
```typescript
describe('Quality Comparison', () => {
  it('generates similar story structure to Claude Code', async () => {
    const prompt = 'Add user profile editing feature'

    // Run LangGraph workflow
    const langgraphResult = await runStoryCreationWorkflow({
      userPrompt: prompt,
      featureDir: 'plans/test-feature',
      targetStage: 'backlog',
    }, {
      storyFileAdapter,
      indexAdapter,
      checkpointAdapter,
    })

    const story = await storyAdapter.readStory(
      langgraphResult.storyId,
      'plans/test-feature',
      'backlog'
    )

    // Validate structure
    expect(story.content).toContain('## Goal')
    expect(story.content).toContain('## Acceptance Criteria')
    expect(story.content).toContain('## Technical Design')
    expect(story.content).toContain('## Test Plan')

    // Validate AC coverage (should have at least 3 ACs)
    const acMatches = story.content.match(/### AC\d+:/g)
    expect(acMatches.length).toBeGreaterThanOrEqual(3)
  })

  it('detects PM gaps comparable to Claude Code', async () => {
    // Use a known story that Claude Code elaborated
    const referenceStory = 'INST-1008'

    // Create test story with same minimal input
    const testStoryId = 'TEST-QA-001'
    await setupMinimalStory(testStoryId, 'elaboration')

    // Run elaboration
    const result = await runElaborationWorkflow({
      storyId: testStoryId,
      featureDir: 'plans/test-feature',
      mode: 'auto',
    }, {
      storyFileAdapter,
      indexAdapter,
      decisionCallback: new AutoDecisionCallback({ rules: elaborationAutoRules }),
      kbAdapter,
    })

    // Compare gap detection (manual review required)
    console.log('PM Gaps detected:', result.pmGaps)
    console.log('UX Gaps detected:', result.uxGaps)

    // At minimum, should detect some gaps
    expect(result.pmGaps.length + result.uxGaps.length).toBeGreaterThan(0)
  })

  it('generates test plans comparable to Claude Code', async () => {
    const story = await storyAdapter.readStory('TEST-QA-002', 'plans/test-feature', 'backlog')

    // Validate test plan section exists
    expect(story.content).toContain('## Test Plan')

    // Should have test scenarios
    const testMatches = story.content.match(/it\('|test\('|describe\('/g)
    expect(testMatches.length).toBeGreaterThan(0)
  })
})
```

---

## Technical Design

### Test Directory Structure

```
packages/backend/orchestrator/
  src/
    adapters/
      __tests__/
        integration/
          adapter-combinations.test.ts
          story-creation-flow.test.ts
          stage-movement-flow.test.ts
          decision-integration.test.ts
        e2e/
          langgraph-story-creation.test.ts
          langgraph-elaboration.test.ts
        real-files/
          inst-1008.test.ts
          edge-cases.test.ts
        performance/
          benchmarks.test.ts
          load-tests.test.ts
        quality/
          comparison.test.ts
        fixtures/
          test-stories/
            minimal-story.md
            complete-story.md
          test-index.md
        helpers/
          setup-test-story.ts
          mock-callbacks.ts
          performance-utils.ts
```

### Test Utilities

```typescript
// Test setup helpers
export async function setupTestFeature(featureId: string): Promise<string> {
  const featureDir = `plans/test-${featureId}`
  await fs.mkdir(path.join(rootDir, featureDir), { recursive: true })
  await fs.mkdir(path.join(rootDir, featureDir, 'backlog'), { recursive: true })

  // Create index
  const index = {
    metadata: { feature_id: featureId, total_stories: 0 },
    metrics: { total: 0, backlog: 0, 'ready-to-work': 0, 'in-progress': 0, UAT: 0, done: 0, completion_percent: 0 },
    stories: [],
  }

  await fs.writeFile(
    path.join(rootDir, featureDir, 'stories.index.md'),
    serializeIndex(index)
  )

  return featureDir
}

export async function setupStory(storyId: string, stage: StoryStage, featureDir?: string): Promise<Story> {
  const dir = featureDir || 'plans/test-feature'

  const story = {
    frontmatter: {
      story_id: storyId,
      title: `Test Story ${storyId}`,
      status: stage,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      blocked_by: [],
      blocks: [],
    },
    content: '## Goal\n\nTest story\n\n## Acceptance Criteria\n\n### AC1: Works\n',
  }

  await storyAdapter.writeStory(story, dir, stage)
  return story
}

export async function cleanupTestFeature(featureDir: string): Promise<void> {
  await fs.rm(path.join(rootDir, featureDir), { recursive: true, force: true })
}
```

### CI/CD Integration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:
    paths:
      - 'packages/backend/orchestrator/src/adapters/**'
  push:
    branches:
      - main

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run integration tests
        run: pnpm test:integration
        working-directory: packages/backend/orchestrator

      - name: Run performance benchmarks
        run: pnpm test:performance
        working-directory: packages/backend/orchestrator

      - name: Upload benchmark results
        uses: actions/upload-artifact@v3
        with:
          name: performance-benchmarks
          path: packages/backend/orchestrator/benchmarks/results.json
```

---

## Test Plan

### Integration Tests (80% coverage target)
```typescript
describe('Adapter Integration Tests', () => {
  // 15 test scenarios
  it('story creation + index update')
  it('story movement + index update')
  it('decision callback + story update')
  it('checkpoint + workflow progress')
  it('KB writer + non-blocking findings')
  // ... 10 more scenarios
})
```

### E2E Tests (Real workflows)
```typescript
describe('LangGraph E2E Tests', () => {
  // 10 test scenarios
  it('story creation workflow')
  it('elaboration workflow (auto mode)')
  it('elaboration workflow (interactive mode)')
  it('stage movement workflow')
  // ... 6 more scenarios
})
```

### Real File Tests (Production data)
```typescript
describe('Real Story File Tests', () => {
  // 8 test scenarios
  it('reads INST-1008')
  it('validates INST-1008')
  it('updates INST-1008 without corruption')
  // ... 5 more scenarios
})
```

### Performance Tests (SLA validation)
```typescript
describe('Performance Benchmarks', () => {
  // 5 benchmark suites
  it('file read performance')
  it('file write performance')
  it('index update performance')
  it('stage move performance')
  it('full workflow performance')
})
```

### Quality Tests (Manual validation required)
```typescript
describe('Quality Comparison', () => {
  // 5 comparison tests
  it('story structure matches Claude Code')
  it('PM gap detection comparable')
  it('test plan quality comparable')
  it('AC coverage comparable')
  it('overall quality >= baseline')
})
```

---

## Success Criteria

### Technical Metrics
- ✅ All integration tests passing
- ✅ E2E tests passing with real workflows
- ✅ Performance benchmarks meet SLAs (<50ms read, <100ms write)
- ✅ No file corruption in 1000+ operations
- ✅ 80%+ test coverage on all adapters

### Quality Metrics
- ✅ Manual review: LangGraph output quality ≥ Claude Code baseline
- ✅ Real story files (INST-1008) handled correctly
- ✅ No regressions in story structure or content

### Production Readiness
- ✅ CI/CD integration complete
- ✅ All tests automated
- ✅ Performance monitoring in place
- ✅ Documentation complete

---

## Dependencies

**Blocks:** None - this is the final validation step

**Blocked By:**
- LNGG-001 (Story File Adapter)
- LNGG-002 (Index Management Adapter)
- LNGG-003 (Decision Callback System)
- LNGG-004 (Stage Movement Adapter)
- LNGG-005 (KB Writing Adapter) - optional
- LNGG-006 (Checkpoint Adapter) - optional

**NPM Packages:**
- `vitest` (already installed)
- `@testing-library/react` (for component tests if needed)

---

## Non-Goals

❌ **Load testing** - 1000s of concurrent operations (future)
❌ **Stress testing** - Extreme edge cases (future)
❌ **Chaos engineering** - Random failure injection (future)
❌ **Multi-region testing** - Distributed systems (future)

---

## Estimated Effort

**8 hours** (comprehensive test suite, performance benchmarks, quality validation)

---

## Deliverables

1. ✅ Integration test suite (15+ tests)
2. ✅ E2E test suite (10+ tests)
3. ✅ Real file tests (8+ tests)
4. ✅ Performance benchmarks (5 suites)
5. ✅ Quality comparison tests (5 tests)
6. ✅ CI/CD integration
7. ✅ Test documentation
8. ✅ Benchmark results dashboard

