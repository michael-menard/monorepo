# Dev Feasibility Review: WINT-1030

## Executive Summary

**Verdict:** ✅ FEASIBLE

**Estimated Effort:** 7.5 hours
- Development: 4 hours
- Testing: 2 hours
- Documentation: 1 hour
- Execution: 30 minutes

**Risk Level:** LOW

**Blocking Dependencies:** None (all dependencies already complete or in-progress)

---

## Dependencies Analysis

### Hard Dependencies

| Dependency | Status | Mitigation |
|------------|--------|------------|
| WINT-1020 (Directory Flattening) | Ready-to-work | ✅ Must complete before WINT-1030 execution |
| WINT-0020 (Story Management Tables) | Pending | ⚠️ wint.stories table exists from WINT-0010, proceed |
| StoryFileAdapter | Deployed | ✅ Available in packages/backend/orchestrator/src/adapters/ |
| StoryRepository | Deployed | ✅ Available in packages/backend/orchestrator/src/db/ |

### Soft Dependencies

| Component | Availability | Impact |
|-----------|--------------|--------|
| @repo/logger | Available | Required for structured logging |
| @repo/db | Available | Required for database client |
| Node.js fs/promises | Built-in | No external dependency |
| Zod | Available | Required for schema validation |

**Dependency Risk:** LOW - All critical components already exist and are production-ready.

---

## Reuse Analysis

### Components to Reuse

#### 1. StoryFileAdapter
**Location:** `packages/backend/orchestrator/src/adapters/story-file-adapter.ts`

**Usage:** Read and parse story YAML frontmatter

**API:**
```typescript
const adapter = new StoryFileAdapter()
const frontmatter = await adapter.readFrontmatter(storyFilePath)
```

**Validation:** Adapter returns Zod-validated `StoryArtifact` type

**Risk:** None - Already used successfully in WINT-1020

---

#### 2. StoryRepository
**Location:** `packages/backend/orchestrator/src/db/story-repository.ts`

**Usage:** Insert story rows into wint.stories table

**API:**
```typescript
const repo = new StoryRepository(db)
await repo.createStory({
  story_id: 'WINT-1030',
  title: 'Populate Story Status',
  state: 'in_progress',
  // ... other fields
})
```

**Validation:** Repository enforces schema constraints (unique story_id, required fields, enum types)

**Risk:** None - Production-ready component

---

#### 3. Directory Scanning Pattern (from WINT-1020)
**Location:** `packages/backend/orchestrator/src/scripts/migrate-flatten-stories.ts`

**Reuse Pattern:**
1. `scanAllEpics()` - Traverse plans/future/platform/ to find epic directories
2. `findStoryDirectories()` - Find all story directories within epic
3. `readStoryFile()` - Read and validate story markdown files

**Adaptation:** Same pattern works for WINT-1030, just different output (database instead of filesystem)

**Risk:** None - Proven pattern from WINT-1020 implementation

---

#### 4. Story State Enum Mapping
**Location:** `packages/backend/database-schema/src/schema/wint.ts`

**Enum Definition:**
```typescript
export const storyStateEnum = pgEnum('story_state', [
  'backlog',
  'elaboration',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled'
])
```

**Mapping Logic:**
```typescript
const statusToStateMap: Record<string, StoryState> = {
  'backlog': 'backlog',
  'elaboration': 'elaboration',
  'ready-to-work': 'ready_to_work', // note: hyphen → underscore
  'in-progress': 'in_progress',
  'ready-for-qa': 'ready_for_qa',
  'in-qa': 'in_qa',
  'blocked': 'blocked',
  'done': 'done',
  'cancelled': 'cancelled'
}
```

**Risk:** LOW - Clear mapping rules, well-defined enum

---

## Technical Constraints

### 1. Database Enum Mapping

**Constraint:** Frontmatter uses hyphens (`ready-to-work`), database uses underscores (`ready_to_work`)

**Solution:** Create explicit mapping function:
```typescript
function mapStatusToState(status: string): StoryState {
  return status.replace(/-/g, '_') as StoryState
}
```

**Validation:** Unit tests for all status values

---

### 2. Story ID Uniqueness

**Constraint:** Database has UNIQUE constraint on story_id column

**Behavior:** Second insert with same story_id will fail

**Solution:** Catch unique constraint violation, log error, continue processing

```typescript
try {
  await repo.createStory(story)
} catch (error) {
  if (error.code === '23505') { // Postgres unique violation
    logger.warn(`Duplicate story_id ${story.story_id}, skipping`)
  } else {
    throw error
  }
}
```

**Risk:** LOW - Well-understood error handling pattern

---

### 3. Required Fields

**Constraint:** Database schema requires story_id, title, state (others optional)

**Validation:** Check frontmatter before insert

```typescript
if (!frontmatter.id || !frontmatter.title) {
  logger.warn(`Skipping story: missing required fields`)
  return
}
```

**Risk:** LOW - StoryFileAdapter already validates frontmatter structure

---

### 4. Transaction Isolation

**Constraint:** No cross-epic transactions to avoid long-running locks

**Solution:** Process each epic independently, commit after each epic completes

```typescript
for (const epic of epics) {
  await processEpic(epic) // implicit transaction per epic
}
```

**Risk:** LOW - Epic-level transactions are fast (<5s for typical epic)

---

## Implementation Design

### Script Structure

```
packages/backend/orchestrator/src/scripts/
  populate-story-status.ts        # Main CLI script
  __types__/
    population.ts                 # Zod schemas for migration artifacts
  __tests__/
    populate-story-status.test.ts # Unit tests
    populate-story-status.integration.test.ts # Integration tests
```

---

### Core Algorithms

#### 1. Status Inference

```typescript
function inferStatus(story: StoryMetadata, directoryPath: string): StoryState {
  // Priority 1: Frontmatter status field
  if (story.frontmatter.status) {
    return mapStatusToState(story.frontmatter.status)
  }

  // Priority 2: Lifecycle directory
  const lifecycleDir = extractLifecycleDir(directoryPath)
  return lifecycleToStateMap[lifecycleDir] || 'backlog'
}

const lifecycleToStateMap: Record<string, StoryState> = {
  'UAT': 'done',
  'ready-for-qa': 'ready_for_qa',
  'in-progress': 'in_progress',
  'ready-to-work': 'ready_to_work',
  'elaboration': 'elaboration',
  'backlog': 'backlog'
}
```

**Edge Case:** Story in directory but with conflicting frontmatter → frontmatter wins

---

#### 2. Duplicate Handling

```typescript
interface StoryLocation {
  story_id: string
  lifecycle: string
  rank: number // UAT=6, ready-for-qa=5, ..., backlog=1
}

function resolveD duplicates(locations: StoryLocation[]): StoryLocation {
  // Sort by rank descending, take first (most advanced lifecycle)
  return locations.sort((a, b) => b.rank - a.rank)[0]
}
```

**Rationale:** If story exists in multiple directories (pre-flattening), use most advanced lifecycle

---

#### 3. Error Handling Strategy

```typescript
const results = {
  discovered: 0,
  inserted: 0,
  skipped: 0,
  errors: [] as ErrorEntry[]
}

for (const storyPath of storyPaths) {
  results.discovered++

  try {
    const frontmatter = await adapter.readFrontmatter(storyPath)
    const state = inferStatus(frontmatter, storyPath)

    await repo.createStory({ ...frontmatter, state })
    results.inserted++

  } catch (error) {
    results.skipped++
    results.errors.push({
      story_id: extractStoryId(storyPath),
      reason: error.message,
      action: 'skipped'
    })
    // Continue processing
  }
}
```

**Philosophy:** Fail-soft - log errors, skip problematic stories, complete the run

---

### Logging Strategy

**Dual Logging:**
1. Console: Progress updates, summary stats
2. migration-log.json: Full audit trail

**Console Output:**
```
Scanning epics...
Found 15 epics, 142 stories

Processing epic: wint
  ✓ WINT-1010 → in_progress
  ✓ WINT-1020 → ready_to_work
  ⚠ WINT-1030 → skipped (malformed YAML)

Completed: 142 stories, 140 inserted, 2 skipped
Duration: 18.2s
```

**migration-log.json:**
```json
{
  "timestamp": "2026-02-16T10:30:00Z",
  "mode": "execute",
  "stories_discovered": 142,
  "stories_inserted": 140,
  "stories_skipped": 2,
  "errors": [
    {
      "story_id": "WINT-1030",
      "reason": "malformed YAML frontmatter",
      "action": "skipped"
    }
  ],
  "duration_ms": 18234
}
```

---

### Dry-Run Mode

**Flag:** `--dry-run`

**Behavior:**
- Scan directories ✅
- Read frontmatter ✅
- Infer status ✅
- Generate population plan ✅
- Skip database INSERT ❌

**Output:** `dry-run-plan.json`
```json
{
  "plan": [
    {
      "story_id": "WINT-1010",
      "inferred_state": "in_progress",
      "directory_path": "plans/future/platform/wint/in-progress/WINT-1010",
      "action": "INSERT"
    }
  ]
}
```

**Use Case:** Preview migration before execution, validate inference logic

---

### Verification Mode

**Flag:** `--verify`

**Behavior:**
- Query database: `SELECT story_id, state FROM wint.stories`
- Compare against expected fixtures
- Report discrepancies

**Output:**
```
Verification Results:
  Total stories: 140
  State distribution:
    in_progress: 12
    ready_for_qa: 8
    done: 45
    backlog: 75

  ✓ All stories have valid state
  ✓ No duplicate story_ids
  ✓ All required fields populated

Verification PASSED
```

---

## Performance Considerations

### Expected Throughput

**Estimate:** ~200ms per story
- Read YAML: 50ms
- Parse/validate: 50ms
- Database INSERT: 100ms

**100 stories:** ~20 seconds
**200 stories:** ~40 seconds

**Target:** <60 seconds for 100+ story epic

---

### Optimization Strategies

#### 1. Batch Database Inserts

```typescript
const BATCH_SIZE = 50

for (let i = 0; i < stories.length; i += BATCH_SIZE) {
  const batch = stories.slice(i, i + BATCH_SIZE)
  await db.transaction(async (tx) => {
    for (const story of batch) {
      await repo.createStory(story, tx)
    }
  })
}
```

**Benefit:** Reduce transaction overhead, faster commits

---

#### 2. Connection Pooling

```typescript
import { db } from '@repo/db' // Uses PgPool internally

// Pool configuration (already in @repo/db):
// - max: 20 connections
// - idleTimeoutMillis: 30000
// - connectionTimeoutMillis: 2000
```

**Benefit:** Reuse connections, avoid connection setup overhead

---

#### 3. Parallel Epic Processing

```typescript
const epicBatches = chunk(epics, 5) // Process 5 epics at a time

for (const batch of epicBatches) {
  await Promise.all(batch.map(processEpic))
}
```

**Risk:** Connection pool saturation, require careful tuning

**Recommendation:** Start with sequential processing, optimize if needed

---

## Risk Mitigations

### Risk 1: Duplicate Story IDs Across Epics

**Scenario:** Two epics have stories with same ID (e.g., TEST-0010 in epic-a and epic-b)

**Mitigation:**
```typescript
catch (error) {
  if (error.code === '23505') { // Unique constraint violation
    logger.warn(`Duplicate story_id ${story.story_id}, skipping second occurrence`)
    // First insert wins, second is skipped
  }
}
```

**Outcome:** No script failure, warning logged, second occurrence skipped

---

### Risk 2: Database Connection Failures

**Scenario:** Network interruption, database restart, connection pool exhaustion

**Mitigation:**
```typescript
import { retry } from '@repo/db/utils'

await retry(
  async () => repo.createStory(story),
  { maxAttempts: 3, backoffMs: 1000 }
)
```

**Outcome:** Transient failures auto-recovered, script continues

---

### Risk 3: Partial Population

**Scenario:** Script fails midway (e.g., out of memory, user interrupt)

**Mitigation:**
- Epic-level transactions (not cross-epic)
- Re-run is safe: unique constraint prevents duplicates
- Idempotent operation: second run inserts only missing stories

**Outcome:** No rollback needed, safe to re-run

---

### Risk 4: Status Inference Ambiguity

**Scenario:** Story in in-progress/ directory but frontmatter says `status: backlog`

**Mitigation:**
- Clear priority: frontmatter status > directory inference
- Document decision in migration-log.json
- Dry-run mode reveals ambiguities before execution

**Outcome:** Consistent, predictable behavior

---

### Risk 5: Schema Version Mismatch

**Scenario:** StoryFileAdapter outputs fields not in database schema

**Mitigation:**
```typescript
const StoryInsertSchema = z.object({
  story_id: z.string(),
  title: z.string(),
  state: StoryStateSchema,
  // ... only fields that exist in wint.stories table
})

const insertData = StoryInsertSchema.parse(frontmatter)
```

**Outcome:** Type-safe insert, schema mismatch caught at validation

---

## Execution Plan

### 1. Development Phase (4 hours)

- [ ] Create populate-story-status.ts script
- [ ] Implement status inference logic
- [ ] Implement enum mapping
- [ ] Implement directory scanning (reuse WINT-1020 pattern)
- [ ] Implement dry-run mode
- [ ] Implement verification mode
- [ ] Create Zod schemas in __types__/population.ts
- [ ] Add structured logging

---

### 2. Testing Phase (2 hours)

- [ ] Create test fixtures (150 stories across 6 directories)
- [ ] Write unit tests (status inference, enum mapping, error handling)
- [ ] Write integration tests (full script with test database)
- [ ] Write performance test (100+ stories)
- [ ] Run dry-run on production data
- [ ] Review dry-run-plan.json for anomalies

---

### 3. Documentation Phase (1 hour)

- [ ] Document script usage (CLI flags, examples)
- [ ] Document status inference rules
- [ ] Document error handling behavior
- [ ] Document performance characteristics
- [ ] Create troubleshooting guide

---

### 4. Execution Phase (30 minutes)

- [ ] Backup database (pg_dump wint.stories)
- [ ] Run dry-run mode, review plan
- [ ] Execute script on production data
- [ ] Run verification queries
- [ ] Validate state distribution
- [ ] Archive migration-log.json

---

## Success Criteria

- [ ] All stories discovered and processed
- [ ] Status inferred correctly (frontmatter > directory)
- [ ] Enum mapping works for all status values
- [ ] Malformed YAML stories skipped gracefully
- [ ] Duplicate story IDs handled without failure
- [ ] Database populated with correct data
- [ ] Verification queries confirm data integrity
- [ ] Performance < 60s for 100+ stories
- [ ] Migration log captures all operations
- [ ] Documentation complete

---

## Open Questions

**Q1:** Should cancelled stories be excluded from population?
**A:** No - include all stories, respect frontmatter status or infer from directory

**Q2:** What if epic directory has no stories?
**A:** Skip epic, log info message, continue

**Q3:** Should script handle nested epic structures (epic/sub-epic)?
**A:** Yes - infer epic from immediate parent directory of story

**Q4:** Should script validate story content beyond frontmatter?
**A:** No - only validate frontmatter, skip content validation (not migration's responsibility)

---

## Recommended Implementation Order

1. ✅ **Reuse StoryFileAdapter** - Already exists, proven
2. ✅ **Reuse StoryRepository** - Already exists, proven
3. 🔨 **Implement status inference** - Core logic, 1 hour
4. 🔨 **Implement directory scanning** - Reuse WINT-1020 pattern, 1 hour
5. 🔨 **Implement error handling** - Fail-soft pattern, 30 min
6. 🔨 **Implement dry-run mode** - Skip inserts, output plan, 30 min
7. 🔨 **Implement verification mode** - Query validation, 30 min
8. 🔨 **Add logging** - Console + JSON, 30 min
9. 🧪 **Create fixtures and tests** - 2 hours
10. 📄 **Documentation** - 1 hour

**Total:** 7.5 hours

---

DEV FEASIBILITY REVIEW COMPLETE
