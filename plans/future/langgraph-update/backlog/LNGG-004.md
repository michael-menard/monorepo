---
story_id: LNGG-004
title: Stage Movement Adapter - Directory-Based Stage Transitions
status: backlog
created: 2026-02-13
updated: 2026-02-13
epic: LangGraph Integration Adapters
phase: 0-Infrastructure
size: small
effort_hours: 4
complexity: low
risk_level: medium
blocked_by: [LNGG-001]
blocks: [LNGG-007]
---

# LNGG-004: Stage Movement Adapter - Directory-Based Stage Transitions

## Context

Stories move through stages via directory structure:
```
backlog/ → elaboration/ → ready-to-work/ → in-progress/ → UAT/ → done/
```

Example move:
```bash
# Manual (current)
mv plans/future/instructions/backlog/INST-1008 \
   plans/future/instructions/ready-to-work/INST-1008

# Programmatic (needed)
await stageAdapter.moveStory('INST-1008', 'backlog', 'ready-to-work', 'plans/future/instructions')
```

**Problem:** LangGraph workflows cannot move stories between stages. Elaboration workflow needs to move stories from `elaboration/` to `ready-to-work/` or back to `backlog/`.

---

## Goal

Create adapter that safely moves story directories between stages with atomic operations and rollback support.

---

## Acceptance Criteria

### AC1: Move Story Between Stages
```typescript
Given a story in current stage
When StageAdapter.moveStory(storyId, fromStage, toStage, featureDir) is called
Then it:
  - Moves directory atomically
  - Updates story frontmatter status
  - Updates index (via IndexAdapter)
  - Validates transition is allowed
  - Rolls back on failure
```

### AC2: Validate Stage Transitions
```typescript
Given stage transition rules
When invalid transition attempted
Then it throws InvalidTransitionError
```

**Rules:**
- `backlog` → `elaboration`, `ready-to-work`, `done` ✅
- `elaboration` → `backlog`, `ready-to-work` ✅
- `ready-to-work` → `in-progress`, `backlog` ✅
- `in-progress` → `UAT`, `ready-to-work` ✅
- `UAT` → `done`, `in-progress` ✅
- `done` → (no transitions) ❌

### AC3: Atomic Operations
```typescript
Given a stage move operation
When any step fails
Then all changes are rolled back
```

---

## Technical Design

```typescript
export class StageAdapter {
  constructor(
    private rootDir: string,
    private storyFileAdapter: StoryFileAdapter,
    private indexAdapter: IndexAdapter
  ) {}

  async moveStory(
    storyId: string,
    fromStage: StoryStage,
    toStage: StoryStage,
    featureDir: string
  ): Promise<void> {
    // 1. Validate transition
    this.validateTransition(fromStage, toStage)

    // 2. Resolve paths
    const fromPath = this.resolveStoryDir(storyId, fromStage, featureDir)
    const toPath = this.resolveStoryDir(storyId, toStage, featureDir)

    // 3. Check source exists
    if (!await fs.exists(fromPath)) {
      throw new StoryNotFoundError(storyId, featureDir, fromStage)
    }

    // 4. Atomic move
    const tempPath = `${toPath}.tmp`
    try {
      // Copy to temp
      await fs.cp(fromPath, tempPath, { recursive: true })

      // Update frontmatter in temp
      const story = await this.storyFileAdapter.readStory(storyId, featureDir, toStage)
      story.frontmatter.status = this.stageToStatus(toStage)
      story.frontmatter.updated = new Date().toISOString()
      await this.storyFileAdapter.writeStory(story, featureDir, toStage)

      // Rename temp to final
      await fs.rename(tempPath, toPath)

      // Remove source
      await fs.rm(fromPath, { recursive: true })

      // Update index
      await this.indexAdapter.updateStory(storyId, {
        status: this.stageToStatus(toStage),
        updated: new Date().toISOString()
      }, featureDir)
    } catch (error) {
      // Rollback
      await fs.rm(tempPath, { recursive: true, force: true })
      throw new StageMoveError(`Failed to move ${storyId}`, { cause: error })
    }
  }

  validateTransition(from: StoryStage, to: StoryStage): void {
    const allowed = STAGE_TRANSITIONS[from]
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidTransitionError(from, to)
    }
  }
}

const STAGE_TRANSITIONS: Record<StoryStage, StoryStage[]> = {
  backlog: ['elaboration', 'ready-to-work', 'done'],
  elaboration: ['backlog', 'ready-to-work'],
  'ready-to-work': ['in-progress', 'backlog'],
  'in-progress': ['UAT', 'ready-to-work'],
  UAT: ['done', 'in-progress'],
  done: [], // Terminal state
}
```

---

## Test Plan

```typescript
describe('StageAdapter', () => {
  it('moves story to valid next stage')
  it('updates frontmatter status')
  it('updates index')
  it('rejects invalid transitions')
  it('rolls back on failure')
  it('preserves story content')
  it('cleans up temp directory')
})
```

---

## Dependencies

- LNGG-001 (Story File Adapter)
- LNGG-002 (Index Adapter) - for updating index

---

## Estimated Effort

**4 hours** (simple directory operations with validation)
