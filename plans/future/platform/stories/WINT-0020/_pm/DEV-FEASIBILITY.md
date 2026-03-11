# Dev Feasibility: WINT-0020 - Create Story Management Tables

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Story extends well-established WINT-0010 foundation with clear patterns. All 5 new tables follow existing schema conventions (UUID PKs, timestamps, FK constraints, Drizzle relations, Zod schemas). KBAR-0010 provides reference implementation for artifact tracking. No external dependencies or novel infrastructure required.

## Likely Change Surface (Core Only)

### Packages Modified
- `packages/backend/database-schema/` - Add 5 new tables to wint.ts
  - `src/schema/wint.ts` - Table definitions, indexes, relations
  - `src/schema/index.ts` - Export new tables and Zod schemas
  - `src/schema/__tests__/wint-schema.test.ts` - Unit tests for new tables

### Database Changes
- **Schema**: `wint` (existing namespace, no new schema creation)
- **New Tables** (5):
  1. `storyArtifacts` - Links stories to filesystem artifacts
  2. `storyPhaseHistory` - Tracks phase execution timeline
  3. `storyMetadataVersions` - Audit trail for story metadata changes
  4. `storyAssignments` - Tracks agent/user assignments
  5. `storyBlockers` - Detailed blocker tracking

- **New Enums** (4 in public schema):
  1. `artifactTypeEnum` - PLAN.yaml, SCOPE.yaml, EVIDENCE.yaml, etc.
  2. `phaseEnum` - setup, plan, execute, review, qa
  3. `assigneeTypeEnum` - agent, user
  4. `blockerTypeEnum` - dependency, technical, resource, decision

### Migration Changes
- New migration file via `pnpm drizzle-kit generate`
- Migration adds 5 tables + 4 enums + indexes + FK constraints
- No modifications to existing WINT-0010 tables

## MVP-Critical Risks

### Risk 1: Foreign key constraint to existing stories table

**Why it blocks MVP**: All 5 new tables depend on `stories.id` FK constraint. If existing stories table PK structure is incompatible, new tables cannot be created.

**Required mitigation**:
- **Before implementation**: Verify existing `stories` table has `id UUID PRIMARY KEY` column (WINT-0010 standard)
- **Validation**: Read wint.ts lines 72-113 to confirm PK structure
- **Test**: Attempt FK insert in test suite before production migration

**Confidence**: High (WINT-0010 completed and tested, PK structure known)

### Risk 2: Enum namespace conflicts

**Why it blocks MVP**: New enums (artifactTypeEnum, phaseEnum, etc.) must be in public schema for cross-namespace reusability. If enum names conflict with existing public enums, migration will fail.

**Required mitigation**:
- **Before implementation**: Search existing schemas for enum name conflicts
- **Naming convention**: Prefix enums with domain (e.g., `wint_artifact_type_enum` instead of `artifact_type_enum`)
- **Test**: Generate migration and review SQL before production deploy

**Confidence**: Medium (public schema shared across features, collision risk exists)

### Risk 3: Drizzle ORM version compatibility

**Why it blocks MVP**: Story requires Drizzle ORM v0.44.3 features (relations API, drizzle-zod integration). If version mismatch or breaking changes exist, schema generation fails.

**Required mitigation**:
- **Dependency verification**: Confirm `packages/backend/database-schema/package.json` has drizzle-orm@0.44.3
- **Lock file check**: Verify pnpm-lock.yaml pins exact version
- **Test early**: Run schema tests immediately after table definitions to catch API issues

**Confidence**: High (WINT-0010 already uses Drizzle v0.44.3, no version change)

## Missing Requirements for MVP

### Requirement 1: Artifact type enum values

**Gap**: Story seed lists example artifact types (PLAN.yaml, SCOPE.yaml, EVIDENCE.yaml) but does not provide exhaustive list of all artifact types that must be supported.

**Decision text PM must include**:
```markdown
## Artifact Type Enum Values (AC-1)

The `artifactTypeEnum` MUST support the following values:
- PLAN
- SCOPE
- EVIDENCE
- CHECKPOINT
- DECISIONS
- REVIEW
- PROOF
- ELAB (elaboration)
- OUTCOME
- TEST_PLAN
- UIUX_NOTES
- DEV_FEASIBILITY

Additional artifact types may be added via future migrations.
```

### Requirement 2: Phase execution ordering

**Gap**: Story defines phase enum (setup, plan, execute, review, qa) but does not specify:
- Whether phases must be executed in order
- Whether phases can be skipped
- Whether phases can be repeated (iteration support)

**Decision text PM must include**:
```markdown
## Phase Execution Model (AC-2)

- **Ordering**: Phases do NOT enforce sequential execution at database level. Application logic (LangGraph) manages phase ordering.
- **Skipping**: Phases can be marked as `skipped` via status enum.
- **Iteration**: The `iteration` field (integer) tracks phase repetitions (e.g., review cycle 1, 2, 3).
- **Concurrency**: Database allows concurrent phase entries for different iterations.
```

### Requirement 3: Checksum algorithm for artifacts

**Gap**: Story specifies SHA-256 checksum for artifact change detection but does not specify:
- Checksum format (hex string, base64, binary)
- Checksum source (file content only, or content + metadata)

**Decision text PM must include**:
```markdown
## Artifact Checksum Format (AC-1)

- **Algorithm**: SHA-256
- **Format**: 64-character hexadecimal string (lowercase)
- **Source**: File content bytes only (exclude filesystem metadata)
- **Column Type**: `varchar(64)` (fixed length for performance)
```

## MVP Evidence Expectations

### Proof of Core Journey

The "core journey" for this backend-only story is:
1. Define 5 new tables in wint.ts following WINT-0010 patterns
2. Generate migration via Drizzle Kit
3. Run migration on dev database successfully
4. Execute test suite with 80%+ coverage
5. Export new tables and Zod schemas from index.ts

**Required Evidence**:

1. **Schema File Changes**:
   - Git diff showing new table definitions in wint.ts
   - Git diff showing new exports in index.ts
   - Line count: ~500-700 lines of new schema code

2. **Migration SQL**:
   - Generated migration file in `src/migrations/app/00XX_*.sql`
   - SQL creates 5 tables in `wint` schema
   - SQL creates 4 enums in `public` schema
   - SQL includes all indexes and FK constraints

3. **Test Coverage**:
   - Test file: `__tests__/wint-schema.test.ts`
   - Coverage report showing 80%+ for new table definitions
   - All tests passing (green CI)

4. **Type Safety**:
   - TypeScript compilation succeeds with no errors
   - Zod schemas generate without runtime errors
   - Type inference works: `z.infer<typeof Schema>` produces correct types

### Critical CI/Deploy Checkpoints

**Pre-commit**:
- [x] TypeScript compilation succeeds
- [x] ESLint passes with no errors
- [x] Prettier formatting applied
- [x] Vitest unit tests pass (80%+ coverage)

**Pre-merge**:
- [x] All CI checks green
- [x] Code review approved (1+ reviewer)
- [x] Migration SQL reviewed manually
- [x] No breaking changes to existing WINT-0010 exports

**Pre-deploy**:
- [x] Migration tested on dev database
- [x] Rollback SQL documented (manual)
- [x] Database backup verified
- [x] Migration runs in <10 seconds (5 tables + indexes)

## Implementation Approach

### Phase 1: Schema Design (Incremental)

Implement one table at a time to reduce risk and enable incremental testing:

1. **storyArtifacts** (simplest, reference KBAR pattern)
   - Define table with FK to stories
   - Add unique constraint on (story_id, artifact_type)
   - Define artifactTypeEnum
   - Test structure and constraints

2. **storyPhaseHistory** (phase tracking)
   - Define table with phase and status enums
   - Add composite index on (story_id, phase)
   - Test enum values and indexing

3. **storyMetadataVersions** (JSONB complexity)
   - Define table with JSONB metadata_snapshot field
   - Test JSONB storage and retrieval
   - Test version sequencing

4. **storyAssignments** (assignment tracking)
   - Define table with assignee_type enum
   - Test assignment lifecycle (active → completed)

5. **storyBlockers** (blocker tracking)
   - Define table with blocker_type and severity enums
   - Test blocker resolution workflow

### Phase 2: Relations and Indexes

After all tables defined:
1. Extend `storiesRelations` object with 5 new one-to-many relations
2. Define relations for each new table back to stories (many-to-one)
3. Add composite indexes for common query patterns
4. Test relation traversal with Drizzle query builder

### Phase 3: Zod Schema Generation

1. Generate insert/select schemas for all 5 tables using `createInsertSchema()`/`createSelectSchema()`
2. Export Zod schemas from index.ts
3. Test type inference with `z.infer<typeof Schema>`
4. Verify runtime validation with sample data

### Phase 4: Testing

1. Create test suite structure (extend WINT-0010 tests)
2. Write structure validation tests (columns, types, constraints)
3. Write FK and unique constraint enforcement tests
4. Write cascade delete tests
5. Write Zod schema generation tests
6. Achieve 80%+ coverage
7. All tests green

### Phase 5: Migration and Documentation

1. Run `pnpm drizzle-kit generate`
2. Review generated migration SQL
3. Add JSDoc comments to all table definitions
4. Update index.ts exports
5. Verify no breaking changes to existing exports
6. Commit changes

## Estimated Effort

- **Story Points**: 8 (medium-high complexity)
- **Time Estimate**: 1-2 days for experienced developer
- **Reasoning**:
  - 5 new tables (less than WINT-0010's 25+ tables)
  - Building on established foundation (wintSchema exists)
  - Similar patterns to WINT-0010 and KBAR-0010 (less discovery)
  - 80%+ test coverage requirement adds time
  - Zod schema generation and testing adds time
  - Incremental approach reduces risk but adds process overhead

## Dependencies

- **Blocked by**: WINT-0010 (Create Core Database Schemas) - **COMPLETED**
- **Blocks**:
  - WINT-0090 (Create Story Management MCP Tools)
  - WINT-1030 (Populate Story Status from Directories)
  - Downstream story management features

## Success Criteria

Story is MVP-complete when:
1. All 5 tables created in `wint` schema
2. All FK constraints, unique constraints, indexes present
3. Drizzle relations defined and working
4. Zod schemas generated and exported
5. Migration generated and tested on dev database
6. Test suite achieves 80%+ coverage
7. All tests passing
8. TypeScript compilation succeeds with no errors
9. Code reviewed and approved
10. Documentation (JSDoc) complete
