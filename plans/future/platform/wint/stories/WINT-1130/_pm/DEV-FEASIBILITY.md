# Dev Feasibility Review: WINT-1130

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Well-established patterns (WINT-0090/WINT-0110 MCP tools), proven database stack (Drizzle + Zod), no new dependencies required. Scope is tightly bounded: 1 table + 4 tools + tests.

## Likely Change Surface (Core Only)

### Packages

1. **packages/backend/database-schema** (schema definition + migration)
   - `src/schema/unified-wint.ts` - add `worktrees` table and `worktreeStatusEnum`
   - `src/migrations/app/` - new migration script (0024_worktree_tracking.sql)
   - `src/migrations/app/meta/` - migration metadata

2. **packages/backend/mcp-tools** (new MCP tools)
   - `src/worktree-management/` - new directory
   - `src/worktree-management/__types__/index.ts` - Zod input/output schemas
   - `src/worktree-management/worktree-register.ts` - tool implementation
   - `src/worktree-management/worktree-get-by-story.ts` - tool implementation
   - `src/worktree-management/worktree-list-active.ts` - tool implementation
   - `src/worktree-management/worktree-mark-complete.ts` - tool implementation
   - `src/worktree-management/__tests__/` - test suite (unit + integration)

3. **packages/backend/db** (indirect - DB client already exists, just import)
   - No changes, just import existing `db` client

### Database

1. **wint.worktrees table** - new table in existing wint schema
2. **Migration script** - backward-compatible (does not modify existing tables)

### Endpoints

None - MCP tools only, no HTTP endpoints.

### Critical Deploy Touchpoints

- Database migration must run before MCP tools deployed
- Migration rollback script required (AC-4 mentions rollback)
- No breaking changes to existing MCP tools or schemas

## MVP-Critical Risks

### Risk 1: FK Constraint Cascade Behavior

**Why it blocks MVP**: If story deletion breaks orphaned worktrees without cascade, database referential integrity fails.

**Required mitigation**: Use `onDelete: 'cascade'` in FK definition. This is standard Drizzle pattern.

**Implementation**:
```typescript
storyId: uuid('story_id')
  .references(() => stories.id, { onDelete: 'cascade' })
  .notNull()
```

**Verification**: Integration test deletes story, confirms worktrees also deleted.

### Risk 2: Concurrent Registration Without Unique Constraint

**Why it blocks MVP**: Two sessions could register worktree for same story simultaneously, violating business rule "one active worktree per story".

**Required mitigation**: Add partial unique index on `(storyId, status)` where `status='active'`.

**Implementation**:
```typescript
export const worktreesTable = pgTable('worktrees', {
  // ... fields
}, (table) => ({
  uniqueActiveWorktree: uniqueIndex('unique_active_worktree')
    .on(table.storyId, table.status)
    .where(sql`${table.status} = 'active'`)
}))
```

**Verification**: Integration test with Promise.all concurrent registration, expect second call to fail.

### Risk 3: Zod Validation Must Fail Fast

**Why it blocks MVP**: Invalid inputs (empty path, negative offset, limit >1000) must not reach database, or DB errors leak to MCP consumers.

**Required mitigation**: Apply Zod `.parse()` at entry of every tool, before any DB operations.

**Implementation**: Follow WINT-0090 pattern:
```typescript
const input = WorktreeRegisterInputSchema.parse(rawInput) // throws if invalid
```

**Verification**: Unit tests for each tool with invalid inputs, expect Zod errors.

---

## Missing Requirements for MVP

None. Story seed already includes:

- 12 acceptance criteria covering all core flows
- Explicit non-goals (no integration with worktree skills yet)
- Reuse plan with specific patterns to follow
- Test coverage requirement (≥80%)

**PM decision needed**: None - scope is complete.

---

## MVP Evidence Expectations

### Proof of Core Journey

1. **Happy path**:
   - Register worktree for story → succeeds, returns UUID
   - Query worktree by story ID → returns active worktree
   - Mark worktree merged → status updated, mergedAt set
   - List active worktrees → returns all active, pagination works

2. **Error handling**:
   - Register for non-existent story → FK constraint error returned (not thrown)
   - Invalid input → Zod error returned with clear message
   - No active worktree for story → returns null (not error)

3. **Edge cases**:
   - Concurrent registration → second call fails with unique constraint violation
   - Orphaned worktree → status remains active, can be queried
   - Pagination boundary (50 results, limit=50) → all returned

### Critical CI/Deploy Checkpoints

1. **Migration test**:
   - Migration runs successfully in CI test database
   - Rollback script runs successfully, leaves no orphaned columns/indexes
   - No conflicts with existing migrations (journal updated correctly)

2. **Unit test coverage**:
   - ≥80% line coverage for all 4 tool files
   - All error paths tested (Zod validation, FK errors, null returns)

3. **Integration test suite**:
   - All tests pass against real test database (not mocked)
   - FK constraint enforcement verified
   - Concurrent registration tested (race condition scenario)

4. **Type checking**:
   - `pnpm check-types` passes in packages/backend/database-schema
   - `pnpm check-types` passes in packages/backend/mcp-tools
   - Drizzle Zod types auto-generate correctly via createInsertSchema/createSelectSchema

5. **Linting**:
   - `pnpm lint` passes with no errors
   - All files follow naming conventions (no barrel files, Zod-first types)

---

## Implementation Order

**Phase 1: Schema Definition** (10K tokens)
1. Add `worktreeStatusEnum` to unified-wint.ts
2. Add `worktrees` table with fields per AC-1
3. Add partial unique index for concurrent registration mitigation
4. Export Zod types via createInsertSchema/createSelectSchema

**Phase 2: Migration Script** (5K tokens)
1. Run `drizzle-kit generate:pg` to generate migration
2. Review migration SQL for correctness
3. Create rollback script (DROP TABLE worktrees, DROP TYPE if exists)
4. Test migration locally (apply + rollback)

**Phase 3: Zod Input/Output Schemas** (10K tokens)
1. Create `__types__/index.ts` in worktree-management/
2. Define WorktreeRegisterInputSchema, WorktreeRegisterOutputSchema
3. Define WorktreeGetByStoryInputSchema, WorktreeGetByStoryOutputSchema
4. Define WorktreeListActiveInputSchema, WorktreeListActiveOutputSchema
5. Define WorktreeMarkCompleteInputSchema, WorktreeMarkCompleteOutputSchema

**Phase 4: MCP Tool Implementations** (80K tokens - 20K per tool)
1. `worktree-register.ts` - insert new record, return UUID
2. `worktree-get-by-story.ts` - query by storyId + status='active', return first or null
3. `worktree-list-active.ts` - query with limit/offset, return array
4. `worktree-mark-complete.ts` - update status + timestamps

**Phase 5: Test Suite** (60K tokens)
1. Unit tests for each tool (4 files)
2. Integration test with all tools (1 file)
3. Test fixtures (story seed data, worktree seed data)
4. Concurrent registration test (Promise.all scenario)

**Phase 6: JSDoc + Documentation** (10K tokens)
1. Add JSDoc to each tool with usage examples
2. Update mcp-tools README with worktree-management section
3. Add inline code comments for non-obvious logic

**Total Estimate: 175K tokens** (within seed estimate of 150K-200K)

---

## Reuse Opportunities

**From WINT-0090 (Story Management MCP Tools)**:
- MCP tool file structure (tool file + __types__ + __tests__)
- Zod validation pattern (parse at entry, fail fast)
- Resilient error handling (return null on not found, log warnings on DB errors)
- JSDoc format with usage examples
- Test structure (describe blocks, setup/teardown, fixtures)

**From WINT-0110 (Session Management MCP Tools)**:
- UUID auto-generation pattern (`randomUUID()` from crypto)
- JSONB metadata field pattern (flexible schema evolution)
- Timestamp handling (createdAt, updatedAt with defaultNow())
- Integration test approach (real DB, seed data, cleanup)

**From unified-wint.ts schema**:
- Enum definition pattern (`pgEnum('worktree_status', ...)`)
- Table definition with FK references
- Zod type export via createInsertSchema/createSelectSchema
- Schema namespace (all tables in `wint` schema)

**From @repo/db**:
- Database client import
- Transaction pattern (if needed for concurrent registration mitigation)

**From @repo/logger**:
- Logging pattern for errors and warnings
- No console.log usage

---

## Complexity Estimate

**Overall: Medium**

**Breakdown by component**:

| Component | Complexity | Reasoning |
|-----------|-----------|-----------|
| Schema definition | Low | Straightforward table with 9 fields, proven enum pattern |
| Migration script | Low | Auto-generated by drizzle-kit, just review |
| Zod schemas | Low | Mirror existing patterns from WINT-0090 |
| worktree_register | Medium | Concurrent registration mitigation requires unique index + error handling |
| worktree_get_by_story | Low | Simple query with WHERE + LIMIT 1 |
| worktree_list_active | Low | Pagination is proven pattern from storyGetByStatus |
| worktree_mark_complete | Low | Simple UPDATE with timestamp logic |
| Unit tests | Medium | Need to test all error paths + Zod validation |
| Integration tests | Medium | Concurrent registration test requires Promise.all + transaction handling |

**Risk factors**:
- **New table creation**: Low risk (no existing data to migrate)
- **FK constraint**: Medium risk (must test cascade behavior)
- **Concurrent registration**: Medium risk (race condition testing is tricky)
- **Test coverage**: Low risk (proven testing patterns exist)

---

## Dependencies

**Hard dependencies** (must be complete before WINT-1130):
- WINT-0020: Story Management Tables (provides `stories` table for FK reference)

**Soft dependencies** (patterns to follow, but not blocking):
- WINT-0090: Story Management MCP Tools (provides MCP tool structure pattern)
- WINT-0110: Session Management MCP Tools (provides UUID + JSONB patterns)

**No blocking dependencies** - WINT-0020 is already complete per index (status: pending, but stories table exists in unified-wint.ts).

---

## Technology Stack

**No new dependencies required**.

Existing stack:
- Drizzle ORM (database operations)
- drizzle-zod (Zod schema generation)
- Zod (validation)
- Vitest (testing)
- @repo/db (database client)
- @repo/logger (logging)

---

## Timeline Estimate

**Story Points**: 5 (per seed metadata)

**Phase breakdown**:
- Schema definition + migration: 1 day
- Zod schemas + tool implementations: 2 days
- Test suite: 1.5 days
- Documentation + review: 0.5 day

**Total: 5 days** (1 story point = 1 day, so 5 points aligns)

---

## Future Risks (Non-MVP)

See `FUTURE-RISKS.md` for full list. Summary:

1. **Auto-cleanup of orphaned worktrees** - Requires session timeout detection (future story)
2. **Integration with worktree skills** - Deferred to WINT-1140/WINT-1150
3. **Worktree analytics dashboard** - Requires telemetry integration (future)
4. **Batch worktree operations** - Deferred to WINT-1170

All non-MVP concerns tracked separately, none block core functionality.
