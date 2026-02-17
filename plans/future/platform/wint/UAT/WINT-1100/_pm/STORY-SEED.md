---
generated: "2026-02-15"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-1100

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None - baseline is current and comprehensive

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| WINT Schema (Drizzle ORM) | `packages/backend/database-schema/src/schema/wint.ts` | Active | Source of database tables with auto-generated Zod schemas |
| MCP Session Management Types | `packages/backend/mcp-tools/src/session-management/__types__/index.ts` | Active | Example of Zod-first shared types pattern |
| LangGraph Story Repository | `packages/backend/orchestrator/src/db/story-repository.ts` | Active | Consumer of shared types (currently uses local schemas) |
| LangGraph Workflow Repository | `packages/backend/orchestrator/src/db/workflow-repository.ts` | Active | Consumer of shared types (currently uses local schemas) |
| drizzle-zod Integration | `packages/backend/database-schema/src/schema/wint.ts` | Active | Auto-generates Zod schemas from Drizzle tables |
| @repo/db Client Package | `packages/backend/db/src/index.ts` | Active | Database connection pooling and exports |

### Active In-Progress Work

| Story | Status | Overlap/Impact |
|-------|--------|----------------|
| WINT-1080 | ready-for-qa | **Direct Dependency** - Schema reconciliation that creates unified schema foundation |
| WINT-1090 | elaboration | **Blocked by This** - LangGraph repositories will consume the shared types created here |

### Constraints to Respect

From baseline reality:
- **Zod-First Types (REQUIRED)**: All types must be Zod schemas with inferred TypeScript types. No TypeScript interfaces allowed per CLAUDE.md.
- **Drizzle ORM v0.44.3**: Database schema must use Drizzle ORM with auto-generated Zod schemas via `drizzle-zod`.
- **No Barrel Files**: Import types directly from source files, not from index.ts re-exports.
- **Package Structure**: Use `__types__/index.ts` directories for shared type modules.

---

## Retrieved Context

### Related Database Schema
- `packages/backend/database-schema/src/schema/wint.ts` - 1792 lines of Drizzle schema with 30+ tables across 6 schema groups
- Auto-generated Zod schemas using `createInsertSchema()` and `createSelectSchema()` from `drizzle-zod`
- Exports both insert and select schemas with inferred TypeScript types

### Related MCP Tools
- `packages/backend/mcp-tools/src/session-management/__types__/index.ts` - Example of Zod-first shared types with:
  - Input schemas: `SessionCreateInputSchema`, `SessionUpdateInputSchema`, etc.
  - Inferred types: `SessionCreateInput`, `SessionUpdateInput`, etc.
  - No barrel files - direct exports

### Related LangGraph Repositories
- `packages/backend/orchestrator/src/db/story-repository.ts`:
  - Currently defines local `StoryRowSchema`, `StateTransitionSchema` inline
  - Uses `DbClient` interface for dependency injection
  - Needs to import shared schemas from WINT-1100 package

- `packages/backend/orchestrator/src/db/workflow-repository.ts`:
  - Currently defines local `ElaborationRecordSchema`, `PlanRecordSchema`, etc. inline
  - Uses same `DbClient` interface pattern
  - Needs to import shared schemas from WINT-1100 package

### Reuse Candidates
- **Pattern from WINT-0110 (Session Management)**: Package structure with `__types__/index.ts` that exports Zod schemas + inferred types
- **Pattern from drizzle-zod**: Auto-generate schemas from database tables using `createInsertSchema()` and `createSelectSchema()`
- **Pattern from @repo/db**: Export generated schemas alongside database client for easy co-location
- **Naming Convention**: Use `Schema` suffix for Zod schemas, plain names for inferred types (e.g., `StorySchema` → `type Story = z.infer<typeof StorySchema>`)

---

## Knowledge Context

### Lessons Learned
No relevant lessons loaded from knowledge base (KB query not available in this context).

### Blockers to Avoid (from past stories)
None identified in current baseline.

### Architecture Decisions (ADRs)
ADR-LOG.md not located in baseline - no active ADRs to apply.

### Patterns to Follow
From CLAUDE.md:
- **Zod-First Types**: Always use Zod schemas with `z.infer<>` for types
- **No Barrel Files**: Import directly from source files
- **Component/Module Directory Structure**:
  ```
  MyModule/
    index.ts           # Main module file
    __types__/
      index.ts         # Zod schemas for this module (unless shared)
    __tests__/
      MyModule.test.ts # Module tests
    utils/
      index.ts         # Module-specific utilities
  ```

From codebase patterns:
- **drizzle-zod Integration**: Use `createInsertSchema()` and `createSelectSchema()` to auto-generate Zod schemas from Drizzle tables
- **Separate Insert/Select Schemas**: Provide both insert schemas (for creating records) and select schemas (for reading records)
- **Type Inference**: Export both the schema and the inferred type: `export const XSchema = z.object(...)` and `export type X = z.infer<typeof XSchema>`

### Patterns to Avoid
From CLAUDE.md:
- **TypeScript Interfaces**: Never create interfaces or type aliases without Zod schemas
- **Barrel Files**: Never create index.ts files that re-export from multiple sources
- **Manual Type Definitions**: Never manually define types that should be generated from schemas

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create Shared TypeScript Types for Unified WINT Schema

### Description

**Context**:
WINT-1080 (Schema Reconciliation) has created a unified database schema in `packages/backend/database-schema/src/schema/wint.ts` with 30+ tables across 6 schema groups. Currently, LangGraph repositories (`story-repository.ts`, `workflow-repository.ts`) and MCP tools define their own local Zod schemas inline, creating duplication and potential drift.

**Problem**:
- LangGraph nodes and MCP tools define duplicate schemas (e.g., `StoryRowSchema` in story-repository, `SessionCreateInputSchema` in MCP tools)
- No shared TypeScript types means schema changes require updates in multiple places
- Type safety breaks down at system boundaries where LangGraph and MCP tools interact
- drizzle-zod auto-generates Zod schemas from Drizzle tables, but these aren't exported in a shared package

**Solution**:
Create a shared types package in `packages/backend/orchestrator/src/__types__/` that:
1. Re-exports auto-generated Zod schemas from `packages/backend/database-schema` (drizzle-zod generated)
2. Adds custom Zod schemas for MCP tool inputs/outputs that aren't direct database mappings
3. Provides a single source of truth for all WINT-related types
4. Enables both LangGraph nodes and MCP tools to import from the same location

This establishes type-safe communication between LangGraph workflows and MCP tools using the unified schema from WINT-1080.

### Initial Acceptance Criteria

- [ ] AC-1: Create `packages/backend/orchestrator/src/__types__/index.ts` that re-exports all WINT Zod schemas from `packages/backend/database-schema`
- [ ] AC-2: Export both insert and select schemas for all WINT tables (e.g., `insertStorySchema`, `selectStorySchema`)
- [ ] AC-3: Export inferred TypeScript types for all schemas (e.g., `InsertStory`, `SelectStory`)
- [ ] AC-4: Add JSDoc comments to all exported schemas documenting their purpose and usage
- [ ] AC-5: Update `packages/backend/orchestrator/src/db/story-repository.ts` to import `StoryRowSchema` from shared types (remove local definition)
- [ ] AC-6: Update `packages/backend/orchestrator/src/db/workflow-repository.ts` to import `ElaborationRecordSchema`, `PlanRecordSchema`, etc. from shared types (remove local definitions)
- [ ] AC-7: Create comprehensive unit tests for shared type schemas in `packages/backend/orchestrator/src/__types__/__tests__/index.test.ts`
- [ ] AC-8: Validate that all existing LangGraph repository tests pass after migration to shared types
- [ ] AC-9: Update package.json exports for `@repo/orchestrator` to expose shared types for MCP tools consumption
- [ ] AC-10: Document shared types usage in a README.md with import examples

### Non-Goals

- **Creating New Database Tables**: This story only creates TypeScript/Zod type wrappers for existing tables from WINT-1080
- **Migrating MCP Tools**: MCP tools will migrate to shared types in separate stories (e.g., WINT-0090+)
- **Creating New Schemas**: Only re-export existing auto-generated schemas from drizzle-zod
- **Database Migrations**: No database schema changes - only TypeScript type definitions
- **LangGraph Graph Updates**: Do not modify LangGraph graphs/nodes (deferred to WINT-9000+ series)

### Reuse Plan

- **Components**:
  - Re-use auto-generated Zod schemas from `drizzle-zod` in `packages/backend/database-schema/src/schema/wint.ts`
  - Re-use `__types__/index.ts` directory structure pattern from MCP session management

- **Patterns**:
  - Follow Zod-first types pattern from CLAUDE.md
  - Use `createInsertSchema()` and `createSelectSchema()` pattern from drizzle-zod
  - Apply component directory structure pattern with `__types__/` directories

- **Packages**:
  - `drizzle-zod` (already used in database-schema package)
  - `zod` (already installed)
  - `@repo/db` (exports generated schemas alongside client)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on schema validation tests: ensure all Zod schemas correctly validate valid inputs and reject invalid inputs
- Test that LangGraph repositories can successfully query database using shared types
- Test backward compatibility: existing repository functions should work identically after migration
- Consider integration tests that span LangGraph repositories and shared types
- Add negative tests for invalid schema inputs (boundary conditions, type mismatches)

### For UI/UX Advisor
- No UI/UX concerns - this is a backend TypeScript types story
- Skip UI/UX review phase

### For Dev Feasibility
- **Key Technical Considerations**:
  - Ensure TypeScript circular dependency prevention (drizzle schema → shared types → repositories)
  - Validate that drizzle-zod auto-generation works correctly with re-exports
  - Test that package.json exports configuration allows MCP tools to import from `@repo/orchestrator/__types__`
  - Consider performance impact of large schema re-exports (tree-shaking should handle this)

- **Migration Risk**:
  - LangGraph repositories are actively used - ensure zero breaking changes during type migration
  - Test with existing LangGraph unit tests to validate type compatibility
  - Consider phased rollout: migrate story-repository first, validate, then migrate workflow-repository

- **Implementation Order**:
  1. Create shared types package with re-exports
  2. Add comprehensive unit tests for shared schemas
  3. Migrate story-repository.ts (lower risk)
  4. Validate all story-repository tests pass
  5. Migrate workflow-repository.ts
  6. Validate all workflow-repository tests pass
  7. Update package.json exports
  8. Document usage

- **Constraints**:
  - Must use Drizzle ORM v0.44.3 (no upgrades mid-story)
  - Must maintain Zod-first types (no TypeScript interfaces)
  - Must avoid barrel files (direct imports only)
  - Must preserve all existing drizzle-zod auto-generated schemas
