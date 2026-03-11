---
generated: "2026-02-15"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0200

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No active baseline reality file found at expected location. Story seed generated from codebase analysis only.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| WINT Database Schemas | `packages/backend/database-schema/src/schema/wint.ts` | Active | Established pattern for pgEnum definitions and schema structure |
| Examples Framework (WINT-0180) | `in-progress/WINT-0180/` | In Progress | Blocking dependency - defines example/schema framework this story must follow |
| Patch Queue Pattern (WINT-0190) | Blocked by WINT-0180 | Not Started | Peer dependency - both depend on WINT-0180 framework |
| Role Pack Templates (WINT-0210) | Blocked by WINT-0180/0200 | Not Started | Downstream consumer of this schema |
| Session Management MCP (WINT-0110) | `in-progress/WINT-0110/` | Code Review Failed | Uses similar __types__ pattern for Zod schemas |

### Active In-Progress Work

| Story | Status | Area | Potential Overlap |
|-------|--------|------|-------------------|
| WINT-0110 | Code Review Failed | Session Management MCP Tools | Uses `packages/backend/mcp-tools/src/session-management/__types__/` - same pattern we'll follow |
| WINT-0180 | In Progress (Elaboration Complete) | Examples Framework | **BLOCKING** - defines storage and schema patterns for WINT-0200 |

### Constraints to Respect

**From CLAUDE.md:**
1. **Zod-first types** - ALWAYS use Zod schemas for types, never TypeScript interfaces
2. **No barrel files** - Direct imports only, no index.ts re-exports
3. **Component directory structure** - Use `__types__/index.ts` for schemas
4. **Strict mode enabled** - All Zod schemas must pass strict validation

**From WINT Schema Patterns:**
1. **pgEnum for database enums** - If schema is for database, use Drizzle pgEnum
2. **JSON Schema for file validation** - If schema is for filesystem artifacts, use JSON Schema format
3. **Zod for runtime validation** - All runtime validation uses Zod, regardless of storage

**From WINT-0180 (Framework Story):**
1. **Storage strategy not yet decided** - WINT-0180 AC-2 must complete before we know database vs filesystem vs hybrid
2. **Max constraints pattern** - Example framework uses max constraints (max 2 positive examples, max 1 negative)
3. **Schema versioning** - Must include `schema_version` field for evolution

---

## Retrieved Context

### Related Endpoints

No API endpoints identified. This is a schema definition story for validation purposes.

### Related Components

**Existing Schema Patterns:**

1. **WINT Database Enums** (`packages/backend/database-schema/src/schema/wint.ts`):
   ```typescript
   export const storyStateEnum = pgEnum('story_state', [
     'backlog', 'ready_to_work', 'in_progress', ...
   ])
   ```

2. **Session Management Types** (`packages/backend/mcp-tools/src/session-management/__types__/index.ts`):
   - Uses Zod schemas for input validation
   - Follows `__types__/index.ts` pattern
   - Includes runtime validation with `.parse()`

3. **Artifact Schemas** (`packages/backend/database-schema/src/schema/artifacts.ts`):
   - Modified in current working set (WINT-0110 work)
   - Uses JSONB for flexible schema storage

### Reuse Candidates

**Schemas to Reference:**
- `packages/backend/database-schema/src/schema/wint.ts` - pgEnum pattern
- `packages/backend/mcp-tools/src/session-management/__types__/index.ts` - Zod validation pattern
- WINT-0180 example-entry.ts - Schema versioning pattern (when complete)

**Validation Patterns:**
- Zod `.min()` / `.max()` for array length constraints (max 5 flows, max 7 steps)
- Zod `.enum()` for state/capability enums
- Zod `.refine()` for cross-field validation if needed

**Documentation Patterns:**
- TSDoc comments for each enum value
- Schema version field for evolution
- Validation error messages via `.describe()`

---

## Knowledge Context

### Lessons Learned

**Note:** No KB access available for this session. No lessons learned retrieved from past stories.

### Blockers to Avoid (from past stories)

- Unknown (no KB access)

### Architecture Decisions (ADRs)

**Note:** No ADR-LOG.md found at expected location `plans/stories/ADR-LOG.md`. No ADR constraints identified.

### Patterns to Follow

**From WINT-0180 Story (Blocking Dependency):**
1. **Storage Strategy Decision** - Must wait for AC-2 completion to know storage approach
2. **Max Constraints** - Use explicit max values in schema (max 5 flows, max 7 steps per flow)
3. **Required Enums** - States enum and capabilities enum are required fields
4. **Schema Versioning** - Include `schema_version` field

**From WINT Database Schema:**
1. **pgEnum for database types** - If stored in database
2. **Zod for runtime validation** - All input validation
3. **TSDoc comments** - Document enum values and schema fields

**From CLAUDE.md:**
1. **Zod-first** - Never use interfaces
2. **Component structure** - `__types__/index.ts` for schemas
3. **No barrel files** - Direct imports only

### Patterns to Avoid

**From CLAUDE.md:**
1. **No TypeScript interfaces** - Use Zod schemas with `z.infer<>`
2. **No barrel files** - Don't create index.ts re-exports
3. **No console.log** - Use @repo/logger

---

## Conflict Analysis

### Conflict: Dependency Blocking
- **Severity**: Warning (non-blocking but affects scope)
- **Description**: WINT-0180 (Examples Framework) is in-progress and defines the storage strategy pattern this story should follow. AC-2 of WINT-0180 determines database vs filesystem vs hybrid approach. Current story assumes JSON Schema file creation, but if WINT-0180 chooses database storage, this story may need database enum definitions instead.
- **Resolution Hint**:
  1. Proceed with JSON Schema file creation as specified in story index
  2. Include Zod schema for runtime validation in parallel
  3. If WINT-0180 completes with database recommendation, add migration to convert JSON Schema to pgEnum
  4. Story scope includes both approaches to remain unblocked

---

## Story Seed

### Title
Create User Flows Schema with State/Capability Enums

### Description

**Context:**
The WINT autonomous development workflow needs standardized user flow definitions to enable PO (Product Owner) cohesion checks. Currently, there is no formal schema for defining user flows with required states and capabilities, leading to inconsistent flow definitions and inability to validate completeness.

WINT-0180 (Examples Framework - in progress) is establishing storage and schema patterns for workflow artifacts. This story creates a user flows schema following those emerging patterns.

**Problem:**
Without a user flows schema:
1. Agents cannot validate user flow definitions programmatically
2. PO cohesion checks cannot verify state coverage (loading, errors, permissions)
3. Capability completeness checks are manual and error-prone
4. Flow complexity is unbounded (risk of mega-flows)

**Proposed Solution:**
Create `user-flows.schema.json` with:
- **Required states enum**: `loading`, `empty`, `validation_error`, `server_error`, `permission_denied`
- **Required capabilities enum**: `create`, `view`, `edit`, `delete`, `upload`, `replace`, `download`
- **Hard constraints**: max 5 flows per feature, max 7 steps per flow
- **Zod schema for runtime validation**: Parallel TypeScript/Zod schema for agent validation

This schema will be consumed by:
- WINT-0210 (Role Pack Templates) - PO role pack for cohesion checks
- WINT-4010 (Cohesion Sidecar) - Automated feature completeness validation
- WINT-4070 (cohesion-prosecutor Agent) - PO role enforcement

### Initial Acceptance Criteria

- [ ] **AC-1: Create JSON Schema Definition**
  - File: `schemas/user-flows.schema.json` (location TBD based on WINT-0180 AC-2)
  - Required enum: `states` with values `["loading", "empty", "validation_error", "server_error", "permission_denied"]`
  - Required enum: `capabilities` with values `["create", "view", "edit", "delete", "upload", "replace", "download"]`
  - Hard constraint: `maxFlows: 5` (max 5 flows per feature)
  - Hard constraint: `maxStepsPerFlow: 7` (max 7 steps per flow)
  - Schema validates: flow structure, enum values, max constraints
  - Includes `$schema` version field for evolution

- [ ] **AC-2: Create Zod Schema for Runtime Validation**
  - File: `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` (or similar based on WINT-0180)
  - Zod schema mirrors JSON Schema structure
  - Includes `.max(5)` for flows array
  - Includes `.max(7)` for steps array per flow
  - Enum validation via `z.enum()` for states and capabilities
  - Type inferred via `z.infer<typeof UserFlowsSchema>`

- [ ] **AC-3: Document States Enum**
  - Each state documented with purpose and usage:
    - `loading`: Initial data fetch in progress
    - `empty`: No data exists yet (e.g., empty list)
    - `validation_error`: User input failed validation
    - `server_error`: Backend returned 5xx error
    - `permission_denied`: User lacks required permissions
  - Extensibility notes: How to add new states in future versions

- [ ] **AC-4: Document Capabilities Enum**
  - Each capability documented with CRUD mapping:
    - `create`: Create new entity (C in CRUD)
    - `view`: Read/view entity (R in CRUD)
    - `edit`: Update existing entity (U in CRUD)
    - `delete`: Remove entity (D in CRUD)
    - `upload`: Upload file/media
    - `replace`: Replace file/media (upload variant)
    - `download`: Download file/media
  - Extensibility notes: How to add new capabilities in future versions

- [ ] **AC-5: Create Validation Tests**
  - Test file: `packages/backend/orchestrator/src/artifacts/__tests__/user-flows.test.ts`
  - Happy path: Valid flow with all states and capabilities
  - Error case: Flow with too many steps (> 7)
  - Error case: Feature with too many flows (> 5)
  - Error case: Invalid state enum value
  - Error case: Invalid capability enum value
  - Round-trip validation: JSON → Zod → JSON matches

- [ ] **AC-6: Create Example User Flow**
  - Example file: `schemas/examples/basic-user-flow.json` (or in tests)
  - Demonstrates all required states
  - Demonstrates common capabilities (create, view, edit, delete)
  - Stays within max constraints (≤ 5 flows, ≤ 7 steps each)
  - Validates successfully against schema

- [ ] **AC-7: Document Schema Integration**
  - Document where schema file lives (depends on WINT-0180 AC-2 decision)
  - Document how agents validate user flows (Zod schema import)
  - Document how PO cohesion checks use this schema (WINT-0210 integration)
  - Link to WINT-0180 examples framework for storage patterns

### Non-Goals

**Explicitly out of scope:**
- Implementation of PO cohesion checker (WINT-4070)
- Implementation of cohesion sidecar (WINT-4010)
- Database table for user flows (unless WINT-0180 recommends hybrid storage)
- UI for editing user flows (future story)
- Validation of actual user flows in codebase (future story)
- Integration with existing features (happens in WINT-4xxx stories)
- Automated migration of existing flow definitions (no legacy flows exist)

**Protected features not to touch:**
- Existing WINT database schemas (wint.ts) - extend only if needed
- Session management types (WINT-0110) - different concern
- Artifact schemas (artifacts.ts) - different concern

**Deferred from similar stories:**
- Natural language flow generation (future ML story)
- Flow visualization/diagram generation (future UX story)
- Flow complexity metrics beyond step count (future analytics story)

### Reuse Plan

**Schemas:**
- **WINT database enum pattern** (`wint.ts`) - Reference for pgEnum structure if database storage chosen
- **Session management Zod pattern** (`session-management/__types__/`) - Reference for Zod validation structure
- **WINT-0180 example-entry.ts** - Reference for schema versioning pattern (when available)

**Validation:**
- **Zod array length validation** - Use `.min()` / `.max()` for constraints
- **Zod enum validation** - Use `z.enum()` for states/capabilities
- **Zod custom error messages** - Use `.describe()` for clear validation errors

**Testing:**
- **WINT-0110 test patterns** - Reference for Zod schema testing approach
- **Round-trip validation** - JSON → Zod → JSON ensures lossless validation

**Documentation:**
- **TSDoc comments** - Follow WINT schema documentation style
- **Schema evolution notes** - Follow WINT-0180 versioning strategy

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Context:**
- This is a schema definition story - testing is validation-focused, not behavioral
- No database setup required unless WINT-0180 recommends database storage
- Test framework: Vitest (already used in packages/backend/orchestrator)
- Test location: `packages/backend/orchestrator/src/artifacts/__tests__/user-flows.test.ts`

**Key Test Scenarios:**
1. **Schema validation tests** (AC-5)
   - Valid flows pass validation
   - Invalid flows fail with clear errors
   - Max constraints enforced (5 flows, 7 steps)
   - Enum values enforced (states, capabilities)

2. **Round-trip validation** (AC-5)
   - JSON Schema validates example flow
   - Zod schema parses example flow
   - Output matches input (no data loss)

3. **Edge cases**
   - Empty flow array (should be valid or invalid? Clarify in AC-1)
   - Single flow with single step (minimum valid flow)
   - Flow with all 7 capabilities used
   - Flow with all 5 states covered

**Testing Dependencies:**
- Wait for WINT-0180 AC-1 (example-entry.ts) to use as reference
- No database required (unless storage decision changes)
- No API mocking required (pure validation)

### For UI/UX Advisor

**UX Context:**
This is a backend schema story with no user-facing UI. However, the schema defines structure for future UX work.

**Future UX Considerations:**
1. **Flow editor UI** (future story) will need to enforce max constraints visually
2. **State selection** should present all 5 required states as options
3. **Capability selection** should present all 7 capabilities with CRUD mapping
4. **Error messages** from Zod validation should be user-friendly if exposed in UI

**Not in scope for this story:**
- No UI components to create
- No user workflows to design
- No accessibility requirements (schema only)

### For Dev Feasibility

**Implementation Context:**
- **Effort estimate**: 2-3 points (schema definition + validation tests)
- **Risk level**: Low (no API, no database migration, no deployment)
- **Blocking dependencies**: WINT-0180 AC-2 (storage strategy) - partial blocker

**Technical Approach:**

1. **Create JSON Schema** (AC-1)
   - Location depends on WINT-0180 decision (likely `schemas/` or `packages/backend/orchestrator/src/schemas/`)
   - Use JSON Schema Draft 2020-12
   - Define `$schema`, `$id`, `title`, `description`
   - Define `states` enum with 5 values
   - Define `capabilities` enum with 7 values
   - Add `maxItems: 5` for flows array
   - Add `maxItems: 7` for steps array per flow

2. **Create Zod Schema** (AC-2)
   - Location: `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts`
   - Mirror JSON Schema structure in Zod
   - Use `z.enum(['loading', 'empty', ...])` for states
   - Use `z.enum(['create', 'view', ...])` for capabilities
   - Use `.max(5)` for flows array validation
   - Use `.max(7)` for steps array validation
   - Export type: `export type UserFlows = z.infer<typeof UserFlowsSchema>`

3. **Documentation** (AC-3, AC-4, AC-7)
   - TSDoc comments for each enum value
   - README or markdown doc for schema usage
   - Link to WINT-0180 framework docs

4. **Tests** (AC-5)
   - Unit tests in Vitest
   - Test valid/invalid flows
   - Test max constraints
   - Test enum validation
   - Test round-trip validation

5. **Example** (AC-6)
   - Create example flow JSON
   - Validate with both JSON Schema and Zod
   - Use in tests and documentation

**Change Surface:**
- New files only (no modifications to existing code)
- No database migrations
- No API changes
- No deployment infrastructure

**Risks:**
1. **WINT-0180 storage decision** - May need to add database enum if hybrid approach chosen
   - Mitigation: Create both JSON Schema and Zod schema, add database enum if needed
2. **State/capability enum expansion** - Story index notes "may need expansion for edge cases"
   - Mitigation: Include extensibility notes in documentation, use schema versioning
3. **Downstream integration unknown** - WINT-0210 and WINT-4xxx integration details unclear
   - Mitigation: Focus on schema correctness, integration is downstream concern

**Reuse Opportunities:**
- Copy enum pattern from `wint.ts` (storyStateEnum, etc.)
- Copy Zod pattern from `session-management/__types__/index.ts`
- Copy test pattern from WINT-0110 tests (when available)

**Not in scope:**
- Database migration (unless WINT-0180 requires it)
- API endpoint creation (validation only)
- Frontend integration (schema only)
- Automated flow generation (future ML story)
