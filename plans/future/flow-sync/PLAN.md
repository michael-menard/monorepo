# LangGraph Workflow Alignment Plan

## Overview

Align the LangGraph orchestrator with recent Claude workflow changes:
1. Simplified story state model (single `state` enum)
2. Knowledge Base integration for read/write
3. YAML artifact schemas (matching Claude workflow)
4. PostgreSQL persistence with pgvector

---

## Phase 1: State Model Simplification

### Current State
- `GraphState` uses `routingFlags` for control flow
- Story state managed externally via markdown files
- No direct integration with database state

### Changes Required

**File: `src/state/enums/story-state.ts` (NEW)**
```typescript
export const StoryState = z.enum([
  'draft',           // In index only
  'backlog',         // Directory generated
  'ready-to-work',   // Passed elaboration
  'in-progress',     // In development
  'ready-for-qa',    // Dev complete, needs QA
  'uat',             // Passed QA, needs UAT
  'done'             // All steps complete
])
```

**File: `src/state/graph-state.ts`**
- Add `storyState: StoryState` to GraphState
- Add `blockedBy: string | null` (replaces boolean blocked flag)
- Remove redundant phase/stage fields if present

**File: `src/artifacts/story.ts` (UPDATE)**
- Align with Claude's `story.yaml` schema
- Single `state` field instead of stage/phase/status

---

## Phase 2: KB Read Integration

### Current State
- `load-knowledge-context.ts` has KB support with fallback
- KB dependencies optionally injected
- Falls back to hardcoded defaults

### Changes Required

**File: `src/nodes/reality/load-knowledge-context.ts`**
- Already integrated - verify alignment with Claude's approach
- Ensure `getLessonsFromKB()` queries match:
  - Domain-specific lessons: `kb_search({ query: "{domain} implementation", tags: ["lesson-learned"] })`
  - Blockers: `kb_search({ query: "{domain} blocker failure", tags: ["lesson-learned"] })`

**File: `src/nodes/reality/index.ts`**
- Export KB loader with proper typing
- Document fallback behavior

---

## Phase 3: KB Write Integration

### Current State
- No KB write capability in LangGraph nodes
- Learnings not persisted to KB after workflow completion

### Changes Required

**File: `src/nodes/completion/persist-learnings.ts` (NEW)**
```typescript
/**
 * Persists learnings to KB after story completion.
 * Mirrors Claude's kb-writer.agent.md behavior.
 */
export const persistLearningsNode = createNode({
  name: 'persist_learnings',
  async execute(state, deps) {
    const { kbAddFn, kbSearchFn, kbDeps } = deps

    // Extract learnings from state
    const learnings = extractLearnings(state)

    for (const learning of learnings) {
      // Check for duplicates (>0.85 similarity)
      const existing = await kbSearchFn({
        query: learning.content,
        tags: ['lesson-learned'],
        limit: 1
      }, kbDeps)

      if (existing.results[0]?.relevance_score > 0.85) {
        continue // Skip duplicate
      }

      // Write to KB
      await kbAddFn({
        content: learning.content,
        role: 'lesson',
        tags: [
          'lesson-learned',
          `story:${state.storyId}`,
          `category:${learning.category}`,
          `date:${new Date().toISOString().slice(0, 7)}`
        ]
      }, kbDeps)
    }
  }
})
```

**File: `src/graphs/story-creation.ts`**
- Add `persist_learnings` node after `complete`
- Make it optional (configurable)

---

## Phase 4: Database Integration

### Current State
- Artifacts stored as YAML files
- No direct PostgreSQL integration
- State not persisted to database

### Changes Required

**File: `src/db/story-repository.ts` (NEW)**
```typescript
/**
 * Repository for story persistence to PostgreSQL.
 * Uses schema from 002_workflow_tables.sql
 */
export class StoryRepository {
  constructor(private pool: Pool) {}

  async getStory(storyId: string): Promise<Story | null>
  async updateStoryState(storyId: string, state: StoryState, actor: string): Promise<void>
  async getWorkableStories(): Promise<Story[]>
  async getNextAction(storyId: string): Promise<string>
}
```

**File: `src/db/workflow-repository.ts` (NEW)**
```typescript
/**
 * Repository for workflow artifacts persistence.
 */
export class WorkflowRepository {
  async saveElaboration(storyId: string, elab: Elaboration): Promise<void>
  async savePlan(storyId: string, plan: Plan): Promise<void>
  async saveVerification(storyId: string, verify: Verification): Promise<void>
  async saveProof(storyId: string, proof: Proof): Promise<void>
  async logTokenUsage(storyId: string, phase: string, tokens: TokenUsage): Promise<void>
}
```

**File: `src/nodes/persistence/save-to-db.ts` (NEW)**
```typescript
/**
 * Node that persists current state to database.
 * Called at phase boundaries.
 */
export const saveToDbNode = createNode({
  name: 'save_to_db',
  async execute(state, deps) {
    const { storyRepo, workflowRepo } = deps

    // Update story state
    await storyRepo.updateStoryState(
      state.storyId,
      state.storyState,
      'langgraph-orchestrator'
    )

    // Persist artifacts based on current phase
    if (state.elaboration) {
      await workflowRepo.saveElaboration(state.storyId, state.elaboration)
    }
    // ... etc
  }
})
```

---

## Phase 5: Artifact Schema Alignment

### Current State
- Schemas in `src/artifacts/*.ts`
- Some overlap with Claude YAML schemas
- Not all fields match

### Changes Required

**Align these artifact schemas with Claude's YAML schemas:**

| LangGraph File | Claude YAML | Changes Needed |
|----------------|-------------|----------------|
| `story.ts` | `story.yaml` | Add `state` enum, remove stage/phase/status |
| `checkpoint.ts` | `context.yaml` | Rename, align fields |
| `evidence.ts` | `proof.yaml` | Align deliverables structure |
| `plan.ts` | `plan.yaml` | Align chunks structure |
| `review.ts` | `verification.yaml` | Combine with qa-verify |
| `qa-verify.ts` | `verification.yaml` | Merge into single schema |
| `knowledge-context.ts` | - | Already aligned |

**File: `src/artifacts/story.ts` (UPDATE)**
```typescript
export const StoryArtifactSchema = z.object({
  schema: z.literal(1),
  id: z.string(),
  feature: z.string(),
  type: StoryType,
  state: StoryState,  // Single state field
  title: z.string(),
  points: z.number().nullable(),
  priority: PriorityLevel.nullable(),
  blocked_by: z.string().nullable(),
  depends_on: z.array(z.string()).default([]),
  follow_up_from: z.string().nullable(),
  scope: z.object({
    packages: z.array(z.string()),
    surfaces: z.array(SurfaceType)
  }),
  goal: z.string(),
  non_goals: z.array(z.string()),
  acs: z.array(AcceptanceCriterionSchema),
  risks: z.array(RiskSchema),
  created_at: z.string(),
  updated_at: z.string()
})
```

---

## Phase 6: Graph Updates

### Story Creation Graph
**File: `src/graphs/story-creation.ts`**

Add nodes:
1. `load_from_db` - Load initial state from PostgreSQL
2. `save_to_db` - Persist state at phase boundaries
3. `persist_learnings` - Write learnings to KB on completion

Update transitions:
1. After `complete` → `persist_learnings` → `save_to_db` → END
2. Add DB persistence at phase boundaries

### Elaboration Graph
**File: `src/graphs/elaboration.ts`**

Add nodes:
1. `load_from_db` - Load story and previous elaboration
2. `save_to_db` - Persist elaboration result

Update state transition:
1. On PASS: Update story state to `ready-to-work`
2. On FAIL: Keep in `backlog`, record gaps

---

## Phase 7: Testing

### Unit Tests
- `src/db/__tests__/story-repository.test.ts`
- `src/db/__tests__/workflow-repository.test.ts`
- `src/nodes/completion/__tests__/persist-learnings.test.ts`

### Integration Tests
- `src/graphs/__tests__/story-creation-db.test.ts`
- End-to-end workflow with database persistence

---

## Implementation Order

1. **Phase 1: State Model** (Foundation)
   - Create `story-state.ts` enum
   - Update `graph-state.ts`

2. **Phase 5: Artifact Schemas** (Dependencies)
   - Align all artifact schemas with Claude YAML

3. **Phase 4: Database Integration** (Core)
   - Create repositories
   - Create persistence nodes

4. **Phase 2-3: KB Integration** (Enhancement)
   - Verify read integration
   - Add write capability

5. **Phase 6: Graph Updates** (Wiring)
   - Add new nodes to graphs
   - Update transitions

6. **Phase 7: Testing** (Validation)
   - Unit and integration tests

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/state/enums/story-state.ts` | Story state enum |
| `src/db/story-repository.ts` | Story CRUD |
| `src/db/workflow-repository.ts` | Artifact CRUD |
| `src/nodes/persistence/save-to-db.ts` | DB persistence node |
| `src/nodes/persistence/load-from-db.ts` | DB load node |
| `src/nodes/completion/persist-learnings.ts` | KB write node |

## Files to Update

| File | Changes |
|------|---------|
| `src/state/graph-state.ts` | Add storyState, blockedBy |
| `src/artifacts/story.ts` | Single state enum |
| `src/artifacts/*.ts` | Align with Claude YAML |
| `src/graphs/story-creation.ts` | Add persistence nodes |
| `src/graphs/elaboration.ts` | Add persistence nodes |
| `src/nodes/reality/load-knowledge-context.ts` | Verify alignment |
| `src/index.ts` | Export new modules |

---

## Estimated Effort

| Phase | Complexity | Effort |
|-------|------------|--------|
| 1. State Model | Low | 2-3 hours |
| 2. KB Read | Low | 1-2 hours (verification) |
| 3. KB Write | Medium | 3-4 hours |
| 4. Database | High | 6-8 hours |
| 5. Artifact Schemas | Medium | 3-4 hours |
| 6. Graph Updates | Medium | 4-5 hours |
| 7. Testing | Medium | 4-6 hours |

**Total: ~25-32 hours**

---

## Success Criteria

1. Story state transitions match Claude workflow
2. Lessons retrieved from KB during context load
3. Learnings persisted to KB after completion
4. Workflow state persisted to PostgreSQL
5. `workable_stories` view returns correct results
6. `get_story_next_action()` works for LangGraph stories
7. All existing tests pass
8. New integration tests pass
