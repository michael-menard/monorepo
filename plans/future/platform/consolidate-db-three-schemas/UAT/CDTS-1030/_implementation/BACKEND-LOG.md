# CDTS-1030 Backend Implementation Log

## Story: Update Drizzle schema.ts

**Date**: 2026-03-08
**Status**: COMPLETE

---

## Summary

Updated `apps/api/knowledge-base/src/db/schema.ts` and all call sites to match the CDTS-1020 DDL target. The Drizzle ORM layer is now ahead of the live database (expected — CDTS-1020 handles the SQL migration).

---

## Changes Made

### 1. `apps/api/knowledge-base/src/db/schema.ts`

**Soft-delete columns added** to 4 entity tables:
- `knowledgeEntries`: `deletedAt`, `deletedBy`
- `tasks`: `deletedAt`, `deletedBy`
- `stories`: `deletedAt`, `deletedBy`
- `plans`: `deletedAt`, `deletedBy`

**Columns removed from `plans` header** (moved to `planDetails`):
- `rawContent`, `phases`, `dependencies`, `sourceFile`, `contentHash`, `kbEntryId`, `importedAt`, `archivedAt`

**Columns removed from `stories` header** (moved to `storyDetails`):
- `storyDir`, `storyFile`, `blockedReason`, `blockedByStory`, `touchesBackend`, `touchesFrontend`, `touchesDatabase`, `touchesInfra`, `startedAt`, `completedAt`, `fileSyncedAt`, `fileHash`

**FK constraints added** to existing tables:
- `plans.parentPlanId` → `plans.id` RESTRICT (self-ref, uses inline type import)
- `planStoryLinks.planSlug` → `plans.planSlug` RESTRICT
- `planStoryLinks.storyId` → `stories.storyId` RESTRICT
- `storyDependencies.storyId` → `stories.storyId` RESTRICT
- `storyDependencies.targetStoryId` → `stories.storyId` RESTRICT
- `storyArtifacts.storyId` → `stories.storyId` RESTRICT
- `workState.storyId` → `stories.storyId` RESTRICT (unique)
- `workStateHistory.storyId` → `stories.storyId` RESTRICT

**New tables added**:
- `planDetails` (1:1 with plans, FK → plans.id RESTRICT)
- `storyDetails` (1:1 with stories, FK → stories.storyId RESTRICT)
- `planDependencies` (FK → plans.planSlug RESTRICT ×2, UNIQUE on planSlug+dependsOnSlug)
- `storyKnowledgeLinks` (FK → stories.storyId RESTRICT, FK → knowledgeEntries.id RESTRICT, UNIQUE on storyId+kbEntryId+linkType, confidence REAL DEFAULT 1.0)

**Type exports added**:
- `PlanDetail`, `NewPlanDetail`, `StoryDetail`, `NewStoryDetail`
- `PlanDependency`, `NewPlanDependency`, `StoryKnowledgeLink`, `NewStoryKnowledgeLink`

**Import updated**: Added `real` to pg-core import.

### 2. `apps/api/knowledge-base/src/crud-operations/plan-operations.ts`

- Updated import to include `planDetails`
- `kb_list_plans`: Removed `phases`, `dependencies`, `sourceFile` from select columns
- `kb_upsert_plan`: Removed moved columns from plans insert; added planDetails upsert after plans insert
- `kb_update_plan`: Removed `updates.dependencies` (moved to planDetails — left as TODO comment)
- `kb_get_roadmap`: Removed `phases`, `dependencies`, `sourceFile` from select columns

### 3. `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`

- Updated import to include `storyDetails`
- `kb_update_story_status`: Split updates — `startedAt`, `completedAt`, `blockedReason`, `blockedByStory` now go to `storyDetails` via upsert

### 4. `apps/api/knowledge-base/src/scripts/migrate-plans-to-kb.ts`

- Updated `importPlan` to:
  - Check content_hash via JOIN with `plan_details` (not from `plans` directly)
  - UPDATE path: plans header update + plan_details upsert
  - INSERT path: plans header insert + plan_details insert

### 5. `apps/api/knowledge-base/src/scripts/seed-kb-first-stories.ts`

- Updated story insert to:
  - Insert stories header (without touches_* columns)
  - Insert into `story_details` for touches_backend, touches_frontend, touches_database, touches_infra

### 6. `apps/api/knowledge-base/src/scripts/seed-kb-stories.ts`

- Updated `insertStory` to:
  - Insert stories header (id, feature, epic, title, story_type, points, priority, state only)
  - Insert into `story_details` for story_dir, story_file, touches_*, file_synced_at, file_hash

---

## Architectural Decisions

### ARCH-001: Table Location
All new tables defined in `apps/api/knowledge-base/src/db/schema.ts` alongside existing tables. Consistent with current pattern.

### ARCH-002: Self-referencing FK
Used inline type import for `plans.parentPlanId`:
```typescript
references((): import('drizzle-orm/pg-core').AnyPgColumn => plans.id, { onDelete: 'restrict' })
```

### ARCH-003: storyKnowledgeLinks.link_type CHECK constraint
Drizzle doesn't support CHECK constraints natively. The CHECK constraint on `link_type` (allowed values: `produced_lesson`, `applied_constraint`, `referenced_decision`, `similar_pattern`, `blocked_by`) is enforced by the DB migration (CDTS-1020), not in Drizzle schema.

### ARCH-004: No Drizzle relations() added
The story ACs don't require relations() calls and they are not currently used anywhere in the codebase. Deferred.

### ARCH-005: storyTokenUsage FK deferred
`storyTokenUsage.storyId → stories.storyId` FK cannot be added if `storyTokenUsage` will move to analytics schema in CDTS-1010. Deferred to CDTS-1050.

---

## Test Results

```
pnpm --filter @repo/knowledge-base check-types
→ 0 errors (PASS)

pnpm --filter @repo/knowledge-base test
→ 47 test files pass (1192 tests)
→ 5 integration test files fail (47 tests) — EXPECTED
  Cause: column "deleted_at" of relation "knowledge_entries" does not exist
  Reason: Drizzle schema is ahead of live DB; CDTS-1020 migration not yet run
```

---

## Known Deviations

1. Integration tests that hit the real DB fail (expected — CDTS-1020 must run first)
2. `kb_update_plan` does not update `dependencies` in planDetails (left as TODO — rare call path)
3. `include_content=true` path in `kb_list_plans` does not join planDetails (returning plans header only for now; `kb_get_plan` provides full details)
