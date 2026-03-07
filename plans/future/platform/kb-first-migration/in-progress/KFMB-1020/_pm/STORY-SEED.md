---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KFMB-1020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB search unavailable (MCP error) — lessons_loaded is false; context derived from codebase scan instead

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base MCP Server | `apps/api/knowledge-base/src/mcp-server/` | Target server where `kb_create_story` must be registered |
| Story CRUD Operations | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Existing `kb_get_story`, `kb_update_story`, and `kb_update_story_status` to be extended |
| Stories DB Table | `apps/api/knowledge-base/src/db/schema.ts` (line 603) | Current schema — lacks `description`, `acceptance_criteria`, `non_goals`, `packages` columns (KFMB-1010 adds them) |
| MCP Tool Access Control | `apps/api/knowledge-base/src/mcp-server/access-control.ts` | `ToolNameSchema` enum and `ACCESS_MATRIX` must be updated for new tool |
| MCP Tool Schemas | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Tool definitions exported from here via `zodToMcpSchema` |
| MCP Tool Handlers | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Handler functions and `toolHandlers` dispatch map — must be extended |
| `kb_upsert_plan` (pattern reference) | `apps/api/knowledge-base/src/crud-operations/plan-operations.ts` | Direct upsert-by-slug pattern to follow for upsert-by-story_id |

### Active In-Progress Work

| Story ID | Title | Potential Overlap |
|----------|-------|-------------------|
| KFMB-1010 | Stories Table Content Columns Migration | **Direct dependency** — must land first. Adds `description`, `acceptance_criteria`, `non_goals`, `packages` columns to the `stories` table. KFMB-1020 reads/writes those columns. |

### Constraints to Respect

- `stories` table in `apps/api/knowledge-base/src/db/schema.ts` is a protected schema — do NOT modify it in this story; KFMB-1010 owns that migration
- All new MCP tools must be registered in three places simultaneously: `ToolNameSchema` (access-control.ts), `ACCESS_MATRIX` (access-control.ts), and the `toolHandlers` dispatch object (tool-handlers.ts)
- Zod-first types: no TypeScript interfaces — all input/output schemas via Zod with `z.infer<>`
- Upsert semantics: `kb_create_story` must use `ON CONFLICT (story_id) DO UPDATE` (not blind insert) to remain idempotent under re-bootstrap scenarios
- Existing content fields must not be clobbered on re-upsert unless caller explicitly provides a non-undefined value (partial merge semantics)

---

## Retrieved Context

### Related Endpoints

N/A — this story is backend-only (MCP server tools, no HTTP endpoints). The knowledge base MCP server communicates over stdio, not HTTP.

### Related Components

N/A — no frontend components involved.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `kb_upsert_plan` operation | `apps/api/knowledge-base/src/crud-operations/plan-operations.ts` | Direct pattern for upsert-by-unique-key with `ON CONFLICT` Drizzle syntax |
| `KbUpdateStoryInputSchema` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Extend (or parallel) to include new content fields; follow its partial-update pattern |
| `handleKbUpsertPlan` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line 4398) | Copy structure verbatim for `handleKbCreateStory`; consistent logging + timing + error handling |
| `handleKbGetStory` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line 3739) | Confirm `include_artifacts` / `include_dependencies` flags still work after content columns added |
| `handleKbUpdateStory` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line 3879) | Must be extended to handle new content fields (`description`, `acceptance_criteria`, etc.) |
| CRUD test helpers | `apps/api/knowledge-base/src/crud-operations/__tests__/test-helpers.ts` | Reuse test DB setup / teardown |

### Similar Stories

- `kb_upsert_plan` (SKCR epic) — established the same upsert-by-unique-key pattern now needed for stories
- KBAR-001 (story dependencies table) — established the `storyDependencies` join pattern used in `kb_get_story`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Upsert-by-unique-key (CRUD operation) | `apps/api/knowledge-base/src/crud-operations/plan-operations.ts` | `kb_upsert_plan` uses Drizzle `onConflictDoUpdate` with partial field merging — exact pattern for `kb_create_story` |
| MCP handler structure | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (lines 4398–4432) | `handleKbUpsertPlan`: correlation ID, timing, `enforceAuthorization`, Zod parse, delegate to CRUD op, structured logging |
| Story CRUD input schemas | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | `KbUpdateStoryInputSchema` and `KbGetStoryInputSchema`: Zod-first, nullable optional fields, `z.infer<>` type alias |
| Tool definition (MCP schema) | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (lines 2544–2582) | `kbGetStoryToolDefinition`: shows `zodToMcpSchema`, docstring format, and placement in Story Status Tools section |

---

## Knowledge Context

### Lessons Learned

KB search was unavailable during seed generation (MCP internal error). No lesson entries could be retrieved. Gaps noted:

- Patterns observed from codebase scan are used as a proxy for lessons
- Downstream agents should re-attempt KB search for lessons related to: "MCP tool registration", "upsert semantics", "schema migration clobber risk"

### Blockers to Avoid (from past stories)

- **Registering a tool in only one of three places**: Every tool requires updates to `ToolNameSchema`, `ACCESS_MATRIX`, and `toolHandlers` — missing any one causes a runtime error or silent mismatch
- **Clobbering existing story data on re-upsert**: Bootstrap scripts run multiple times; `kb_create_story` must treat missing/undefined fields as "leave existing value alone", not "write null"
- **Writing to content columns before KFMB-1010 lands**: The new columns (`description`, `acceptance_criteria`, `non_goals`, `packages`) do not exist until KFMB-1010's migration runs — testing before that migration is applied will fail with a column-not-found error

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy - UAT Must Use Real Services | UAT tests must use real KB DB (port 5433), not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path test must run in dev phase — but this story has no frontend ACs, so E2E tests are not applicable (mark `e2e: not_applicable` in SCOPE.yaml) |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not relevant to this story.

### Patterns to Follow

- Zod-first: Every input schema is a `z.object({...})` with `export type Foo = z.infer<typeof FooSchema>`
- Upsert via `db.insert(stories).values({...}).onConflictDoUpdate({ target: stories.storyId, set: {...} })`
- Partial merge: build `set` object dynamically — only include fields where caller-supplied value is `!== undefined`
- Handler structure: `startTime`, `correlationId`, `logger.info`, `enforceAuthorization`, `Zod.parse`, delegate, `logger.info success`, return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`, catch → `errorToToolResult`
- Dependency chain registration: tool name added to `ToolNameSchema` enum, `ACCESS_MATRIX` record, and `toolHandlers` dispatch object, and `getToolDefinitions()` array in `tool-schemas.ts`

### Patterns to Avoid

- **Direct `db.insert` without conflict handling** — a duplicate `story_id` will throw a unique constraint violation
- **TypeScript interfaces** — use Zod schemas exclusively
- **Barrel files** — do not create `index.ts` re-exports for the new operation; import directly from `story-crud-operations.ts`
- **Reading full `serverless.yml`** — not applicable here but a known time-sink in other stories; not relevant
- **Overwriting null into DB for omitted fields** — undefined input fields must map to SQL `excluded.column` to preserve existing values, or be omitted from the `set` clause entirely

---

## Conflict Analysis

### Conflict: Dependency on KFMB-1010 (warning)
- **Severity**: warning
- **Description**: `kb_create_story` and the content-field extensions to `kb_update_story` / `kb_get_story` write/read `description`, `acceptance_criteria`, `non_goals`, and `packages` columns that do not yet exist in the `stories` table. KFMB-1010 owns that migration. If KFMB-1020 is implemented and tested before KFMB-1010's migration is applied, all tests will fail with a DB column error.
- **Resolution Hint**: Gate KFMB-1020 development behind KFMB-1010 completion. The stories index already marks this dependency (`depends_on: ["KFMB-1010"]`). Dev feasibility should confirm the migration sequence and recommend that KFMB-1020 integration tests verify column existence before running.

---

## Story Seed

### Title
kb_create_story MCP Tool and CRUD Update

### Description

**Context**: The Knowledge Base MCP server (`apps/api/knowledge-base/`) has story read/update tools (`kb_get_story`, `kb_update_story`, `kb_update_story_status`) but no tool for creating stories. Story creation today happens through filesystem YAML files synced by a separate process. As part of the KB-First Migration, bootstrap agents need to write new stories directly into the DB without touching the filesystem.

**Problem**: There is no `kb_create_story` MCP tool. Bootstrap and generation agents cannot create story records in the DB idempotently. Additionally, after KFMB-1010 adds content columns (`description`, `acceptance_criteria`, `non_goals`, `packages`) to the `stories` table, neither `kb_get_story` nor `kb_update_story` expose those new fields — callers cannot read or write story body content through MCP.

**Proposed Solution**:
1. Implement `kb_create_story` as an upsert-by-`story_id` operation (insert or update on conflict). The upsert must apply partial merge semantics: omitted fields leave existing DB values untouched. This prevents re-running bootstrap from clobbering body content written by subsequent agents.
2. Extend `kb_update_story` to accept and write the four new content fields (`description`, `acceptance_criteria`, `non_goals`, `packages`).
3. Extend `kb_get_story` to return the four new content fields in its response (they will be included automatically once present in the schema row type — verify no explicit field selection is omitting them).
4. Register `kb_create_story` end-to-end: Zod input schema, CRUD operation function, MCP handler, tool definition, access control.

### Initial Acceptance Criteria

- [ ] AC-1: `kb_create_story` MCP tool is registered and callable — returns created/updated story record with `created: true | false` flag indicating insert vs update
- [ ] AC-2: Calling `kb_create_story` twice with the same `story_id` is idempotent — second call updates only provided fields, does not reset omitted fields to null
- [ ] AC-3: `kb_create_story` accepts all current story metadata fields: `story_id` (required), `title` (required), `feature`, `epic`, `priority`, `state`, `phase`, `points`, `story_type`, `story_dir`, `depends_on` (for inserting dependency edges), and the four new content fields (`description`, `acceptance_criteria`, `non_goals`, `packages`) — all optional except `story_id` and `title`
- [ ] AC-4: `kb_update_story` accepts and writes the four new content fields (`description`, `acceptance_criteria`, `non_goals`, `packages`) — existing metadata fields are unaffected
- [ ] AC-5: `kb_get_story` response includes the four new content fields (`description`, `acceptance_criteria`, `non_goals`, `packages`) — null when not set
- [ ] AC-6: `kb_create_story` is registered in `ToolNameSchema`, `ACCESS_MATRIX` (all roles), and the `toolHandlers` dispatch map
- [ ] AC-7: Unit tests cover: insert new story, upsert existing story (partial merge), upsert with content fields, update story with content fields, get story returns content fields
- [ ] AC-8: No existing `kb_get_story` / `kb_update_story_status` / `kb_list_stories` tests regress

### Non-Goals

- Do NOT modify the stories table schema — KFMB-1010 owns that migration; this story consumes the new columns
- Do NOT implement story dependency insertion as part of `kb_create_story` in the initial cut — `depends_on` wiring can be deferred to a follow-up if complexity is too high (risk note from story.yaml: "upsert semantics must be carefully designed"); dependency insertion can be a separate AC or a stretch goal
- Do NOT touch filesystem YAML files or sync scripts — this is a pure DB/MCP layer story
- Do NOT implement `kb_delete_story` — that is out of scope (and intentionally absent from this plan)
- Do NOT modify the `storyArtifacts` or `storyDependencies` tables — only the `stories` table row is touched

### Reuse Plan

- **Components**: None (backend-only, no UI)
- **Patterns**: `kb_upsert_plan` operation pattern (Drizzle `onConflictDoUpdate`); `handleKbUpsertPlan` handler pattern; `KbUpdateStoryInputSchema` as base for extending `kb_update_story` schema
- **Packages**: `drizzle-orm` (already used), `zod` (already used), `@repo/logger` (already used via `createMcpLogger`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has no UI and no HTTP endpoints — UAT scope is limited to MCP tool invocations against a live KB database (port 5433)
- ADR-006 E2E requirement does not apply (no frontend ACs); mark `e2e: not_applicable` in SCOPE.yaml
- Key test scenarios: (1) fresh insert, (2) idempotent re-upsert with partial fields, (3) content field round-trip (write via `kb_create_story`, read via `kb_get_story`), (4) content field update via `kb_update_story`, (5) access control — all roles should be allowed
- Tests MUST run against a real KB database with KFMB-1010's migration already applied; mock-only tests are insufficient for the upsert conflict path
- Watch for the upsert clobber risk: a test should explicitly verify that re-upserting with `description: undefined` does NOT overwrite an existing `description` value

### For UI/UX Advisor

Not applicable — this story is entirely backend (MCP server tools). No UI surfaces or user-facing changes.

### For Dev Feasibility

- **Primary implementation file**: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — add `KbCreateStoryInputSchema`, `kb_create_story` function; extend `KbUpdateStoryInputSchema` and `kb_update_story` function
- **Registration files** (must be updated atomically): `apps/api/knowledge-base/src/mcp-server/access-control.ts`, `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`, `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`
- **Drizzle upsert pattern**: `db.insert(stories).values({...}).onConflictDoUpdate({ target: stories.storyId, set: { title: sql\`EXCLUDED.title\`, ...conditionalFields } })` — only include fields in `set` where the caller supplied a non-undefined value
- **Dependency risk**: KFMB-1010 must be merged first; feasibility assessment should confirm whether a feature branch can be structured to depend on KFMB-1010's migration without blocking parallelism
- **Content fields schema**: After KFMB-1010, the `stories` table will have `description text`, `acceptance_criteria text` (or jsonb?), `non_goals text`, `packages text[]` (or jsonb?) — feasibility should confirm the exact column types from KFMB-1010's migration before writing the Zod schema for those fields
- **Canonical references**: `apps/api/knowledge-base/src/crud-operations/plan-operations.ts` (upsert pattern) and `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` lines 4398–4432 (handler pattern) are the two files to open first
