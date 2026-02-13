---
story_id: LNGG-002
title: Index Management Adapter - stories.index.md Updates
status: backlog
created: 2026-02-13
updated: 2026-02-13
epic: LangGraph Integration Adapters
phase: 0-Infrastructure
size: medium
effort_hours: 6
complexity: medium
risk_level: medium
blocked_by: [LNGG-001]
blocks: [LNGG-007]
---

# LNGG-002: Index Management Adapter - stories.index.md Updates

## Context

Each feature directory has a `stories.index.md` file that tracks all stories, their metadata, dependencies, and progress metrics. Example:

```markdown
# Instructions Feature - Story Index

## Metadata
- **Feature ID:** INST
- **Total Stories:** 42
- **Status:** In Progress

## Progress Summary
| Status | Count |
|--------|-------|
| Backlog | 12 |
| Ready to Work | 8 |
| In Progress | 5 |
| UAT | 3 |
| Done | 14 |

## Stories

### INST-001: [Title]
- **Status:** done
- **Created:** 2026-01-15
- **Blocks:** INST-002, INST-003
- **Tags:** foundation, api

### INST-002: [Title]
...
```

**Problem:** When LangGraph workflows create/update stories, the index must be updated atomically. Currently no programmatic way to:
- Add new stories to index
- Update story status in index
- Update progress metrics
- Maintain formatting and structure
- Handle concurrent updates

**Impact:** Without index updates, story status is invisible to team, metrics drift, and dependencies break.

---

## Goal

Create a type-safe adapter that manages `stories.index.md` files with:
1. Add new story entries
2. Update existing story metadata
3. Recalculate progress metrics
4. Preserve formatting and manual edits
5. Validate index structure
6. Support atomic updates (transaction-like behavior)

---

## Acceptance Criteria

### AC1: Add Story to Index
```typescript
Given a feature index file
When IndexAdapter.addStory(entry, featureDir) is called
Then it:
  - Appends story entry to stories section
  - Updates progress metrics
  - Preserves existing formatting
  - Validates entry before add
  - Writes atomically
```

**Test:**
```typescript
const adapter = new IndexAdapter('/monorepo/root')
await adapter.addStory({
  story_id: 'INST-100',
  title: 'New Story',
  status: 'backlog',
  created: '2026-02-13',
  blocks: [],
  tags: ['new']
}, 'plans/future/instructions')

const index = await adapter.readIndex('plans/future/instructions')
expect(index.stories.find(s => s.story_id === 'INST-100')).toBeDefined()
expect(index.metrics.backlog).toBe(13) // Was 12, now 13
```

---

### AC2: Update Story in Index
```typescript
Given an existing story in index
When IndexAdapter.updateStory(storyId, updates, featureDir) is called
Then it:
  - Updates specified fields only
  - Recalculates metrics if status changed
  - Preserves other fields
  - Validates updates
```

**Test:**
```typescript
await adapter.updateStory('INST-1008', {
  status: 'in-progress',
  updated: '2026-02-13'
}, 'plans/future/instructions')

const index = await adapter.readIndex('plans/future/instructions')
const story = index.stories.find(s => s.story_id === 'INST-1008')

expect(story.status).toBe('in-progress')
expect(story.updated).toBe('2026-02-13')
expect(index.metrics['in-progress']).toBe(6) // Incremented
expect(index.metrics.backlog).toBe(11) // Decremented
```

---

### AC3: Recalculate Metrics
```typescript
Given an index with stories
When IndexAdapter.recalculateMetrics(featureDir) is called
Then it:
  - Counts stories by status
  - Counts stories by phase
  - Calculates completion %
  - Updates metadata section
```

**Test:**
```typescript
await adapter.recalculateMetrics('plans/future/instructions')

const index = await adapter.readIndex('plans/future/instructions')

expect(index.metrics.total).toBe(42)
expect(index.metrics.done).toBe(14)
expect(index.metrics.completion_percent).toBe(33) // 14/42
```

---

### AC4: Validate Index Structure
```typescript
Given an index file or object
When IndexAdapter.validate(index) is called
Then it:
  - Validates required sections exist
  - Validates story ID uniqueness
  - Validates dependency references (blocks/blocked_by)
  - Detects circular dependencies
  - Returns ValidationResult
```

**Test:**
```typescript
const invalid = {
  metadata: { feature_id: 'INST' },
  stories: [
    { story_id: 'INST-001', blocks: ['INST-002'] },
    { story_id: 'INST-002', blocks: ['INST-001'] } // Circular!
  ]
}

const result = adapter.validate(invalid)

expect(result.valid).toBe(false)
expect(result.errors).toContain('Circular dependency: INST-001 <-> INST-002')
```

---

### AC5: Transaction Support
```typescript
Given multiple index operations
When wrapped in a transaction
Then they:
  - All succeed or all fail
  - Rollback on any error
  - Lock index during transaction
```

**Test:**
```typescript
const tx = await adapter.beginTransaction('plans/future/instructions')

try {
  await tx.addStory(entry1)
  await tx.updateStory('INST-001', { status: 'done' })
  await tx.recalculateMetrics()
  await tx.commit()
} catch (error) {
  await tx.rollback()
  throw error
}

// Verify all changes applied
const index = await adapter.readIndex('plans/future/instructions')
expect(index.stories.find(s => s.story_id === entry1.story_id)).toBeDefined()
expect(index.stories.find(s => s.story_id === 'INST-001').status).toBe('done')
```

---

## Technical Design

### Class Structure

```typescript
export class IndexAdapter {
  constructor(private rootDir: string) {}

  // Core operations
  async readIndex(featureDir: string): Promise<StoryIndex>
  async writeIndex(index: StoryIndex, featureDir: string): Promise<void>
  async addStory(entry: IndexEntry, featureDir: string): Promise<void>
  async updateStory(storyId: string, updates: Partial<IndexEntry>, featureDir: string): Promise<void>
  async removeStory(storyId: string, featureDir: string): Promise<void>

  // Metrics
  async recalculateMetrics(featureDir: string): Promise<IndexMetrics>

  // Validation
  validate(index: StoryIndex): ValidationResult
  detectCircularDependencies(stories: IndexEntry[]): string[]

  // Transactions
  async beginTransaction(featureDir: string): Promise<IndexTransaction>

  // Utilities
  resolveIndexPath(featureDir: string): string
  parseIndexFile(content: string): StoryIndex
  serializeIndex(index: StoryIndex): string
}
```

### Zod Schemas

```typescript
export const IndexEntrySchema = z.object({
  story_id: z.string().regex(/^[A-Z]{4}-\d{4}$/),
  title: z.string(),
  status: StoryStatusSchema,
  created: z.string().datetime(),
  updated: z.string().datetime().optional(),
  blocks: z.array(z.string()).default([]),
  blocked_by: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  phase: z.string().optional(),
  size: z.string().optional(),
  assignee: z.string().optional(),
})

export type IndexEntry = z.infer<typeof IndexEntrySchema>

export const IndexMetricsSchema = z.object({
  total: z.number().int().min(0),
  backlog: z.number().int().min(0),
  'ready-to-work': z.number().int().min(0),
  'in-progress': z.number().int().min(0),
  UAT: z.number().int().min(0),
  done: z.number().int().min(0),
  completion_percent: z.number().int().min(0).max(100),
})

export type IndexMetrics = z.infer<typeof IndexMetricsSchema>

export const StoryIndexSchema = z.object({
  metadata: z.object({
    feature_id: z.string(),
    feature_name: z.string().optional(),
    total_stories: z.number().int().min(0),
    status: z.string().optional(),
  }),
  metrics: IndexMetricsSchema,
  stories: z.array(IndexEntrySchema),
  rawContent: z.string().optional(), // Original for preservation
})

export type StoryIndex = z.infer<typeof StoryIndexSchema>
```

### Transaction Implementation

```typescript
export class IndexTransaction {
  private originalIndex: StoryIndex
  private workingIndex: StoryIndex
  private locked = false

  constructor(
    private featureDir: string,
    private adapter: IndexAdapter
  ) {}

  async begin() {
    this.originalIndex = await this.adapter.readIndex(this.featureDir)
    this.workingIndex = deepClone(this.originalIndex)
    this.locked = true
  }

  async addStory(entry: IndexEntry) {
    if (!this.locked) throw new Error('Transaction not started')
    this.workingIndex.stories.push(entry)
  }

  async updateStory(storyId: string, updates: Partial<IndexEntry>) {
    if (!this.locked) throw new Error('Transaction not started')
    const story = this.workingIndex.stories.find(s => s.story_id === storyId)
    if (!story) throw new Error(`Story not found: ${storyId}`)
    Object.assign(story, updates)
  }

  async recalculateMetrics() {
    if (!this.locked) throw new Error('Transaction not started')
    this.workingIndex.metrics = this.calculateMetrics(this.workingIndex.stories)
  }

  async commit() {
    if (!this.locked) throw new Error('Transaction not started')

    // Validate before commit
    const validation = this.adapter.validate(this.workingIndex)
    if (!validation.valid) {
      throw new ValidationError(validation.errors)
    }

    await this.adapter.writeIndex(this.workingIndex, this.featureDir)
    this.locked = false
  }

  async rollback() {
    this.workingIndex = deepClone(this.originalIndex)
    this.locked = false
  }
}
```

---

## Test Plan

### Unit Tests

```typescript
describe('IndexAdapter', () => {
  describe('addStory', () => {
    it('adds story to index')
    it('updates metrics')
    it('preserves formatting')
    it('validates before add')
    it('rejects duplicate story IDs')
  })

  describe('updateStory', () => {
    it('updates story fields')
    it('recalculates metrics if status changed')
    it('preserves other fields')
    it('throws if story not found')
  })

  describe('recalculateMetrics', () => {
    it('counts by status correctly')
    it('calculates completion %')
    it('updates metadata')
  })

  describe('validate', () => {
    it('accepts valid index')
    it('rejects duplicate story IDs')
    it('detects circular dependencies')
    it('validates story ID references')
  })

  describe('transactions', () => {
    it('commits all changes atomically')
    it('rolls back on error')
    it('locks index during transaction')
  })
})
```

---

## Dependencies

- LNGG-001 (Story File Adapter) - for story metadata validation

---

## Estimated Effort

**6 hours** (parsing complexity, transaction support)
