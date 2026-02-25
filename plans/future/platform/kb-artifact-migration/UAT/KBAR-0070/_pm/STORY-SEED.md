---
generated: "2026-02-23"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: KBAR-0070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB search was unavailable during generation (connection error). Lessons were not loaded from the knowledge base. ADRs were loaded from `plans/stories/ADR-LOG.md`. Codebase was scanned directly.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `kb_get_story` (basic) | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Active | Existing `kb_get_story` retrieves story by ID — returns `story | null`. Does NOT include artifacts or dependencies. KBAR-0070 extends this with optional eager loading. |
| `kb_list_stories` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Active | List with filters — reference for query pattern style |
| `stories` table | `apps/api/knowledge-base/src/db/schema.ts` | Active | Primary table for story metadata |
| `storyDependencies` table | `apps/api/knowledge-base/src/db/schema.ts` | Active | Dependency edges for eager loading |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/schema.ts` (line 753) | Active | Artifact records for eager loading |
| `handleKbGetStory` MCP handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line 3558) | Active | Existing thin wrapper handler — to be extended or replaced |
| `KbGetStoryInputSchema` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (line 24) | Active | Currently only has `story_id: string`. Needs `include_artifacts?: boolean` and `include_dependencies?: boolean` fields added. |
| `StoryStateSchema`, `ArtifactTypeSchema`, `DependencyTypeSchema` | `apps/api/knowledge-base/src/__types__/index.ts` | Active | Zod enum schemas for response typing |
| Tool registry (`toolHandlers` map) | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (line 4195) | Active | `kb_get_story: handleKbGetStory` already registered — handler update is in-place |
| `getToolDefinitions` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Active | Tool schema exposed to MCP clients — needs `include_artifacts` and `include_dependencies` parameters added |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0060 | Sync Integration Tests | ready-to-work (current branch: `story/KBAR-0060`) | Direct predecessor — KBAR-0070 is blocked until KBAR-0060 is merged. No file overlap: KBAR-0060 is in `packages/backend/kbar-sync/`, KBAR-0070 is in `apps/api/knowledge-base/`. |

### Constraints to Respect

1. **KBAR-0060 must be merged first** — KBAR-0070 has a hard dependency on KBAR-006 (KBAR-0060) per the stories index. Implementation must not begin until KBAR-0060 passes UAT.
2. **Do not break existing `kb_get_story` callers** — The current `KbGetStoryInputSchema` has only `story_id`. Extending it with optional fields (`include_artifacts`, `include_dependencies`) is backward-compatible, but the return type shape must be carefully designed so callers not passing those flags still receive the same `{ story, message }` shape.
3. **Protected: stories table and storyDependencies table** — Modifying the DB schema (adding columns, altering types) is out of scope for KBAR-0070. This story is read-only query enhancement.
4. **Zod-first types** — Any new input or output types must use Zod schemas with `z.infer<>`. No TypeScript interfaces.
5. **No barrel files** — Import directly from source files, not re-export indexes.
6. **ADR-005 compliance** — Integration/UAT tests must use real PostgreSQL, never mocks.
7. **Existing tool handler pattern must be followed** — `handleKbGetStory` uses the pattern: parse input → call service function → log result → return `{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }`. New handler must follow this pattern.

---

## Retrieved Context

### Related Endpoints

None — this is a pure MCP tool with no HTTP endpoint. The tool is consumed directly by agents via the MCP protocol over stdio.

### Related Components

None — backend-only MCP tool with no UI components.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| Existing `kb_get_story` implementation | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts:164` | Extend in-place: add optional `include_artifacts` and `include_dependencies` to `KbGetStoryInputSchema`, then add conditional JOIN/select queries for relations |
| Existing `handleKbGetStory` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts:3558` | Update in-place — same handler pattern, just passes through new optional params |
| `storyArtifacts` Drizzle table reference | `apps/api/knowledge-base/src/db/schema.ts:753` | Used in secondary SELECT query for artifact eager loading |
| `storyDependencies` Drizzle table reference | `apps/api/knowledge-base/src/db/schema.ts` (lines near `storyDependencies`) | Used in secondary SELECT query for dependency eager loading |
| `handleKbListArtifacts` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Reference for artifact-related query patterns |
| `KbListArtifactsInputSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Reference for how artifacts are queried by `story_id` |
| Existing tool-handlers unit test pattern | `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts` | Mock pattern (`vi.hoisted`, `vi.mock`) to follow for unit tests of `handleKbGetStory` |
| `enforceAuthorization` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Access control pattern already present in `handleKbGetStory` — preserve |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool handler with logging, correlation ID, error handling | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (lines 3558–3592, `handleKbGetStory`) | The exact handler being extended — shows the complete pattern: input cast, logger.info invoked, enforceAuthorization, schema parse, service call, timing log, JSON.stringify return |
| Service function with Drizzle ORM queries | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (lines 164–185, `kb_get_story`) | Canonical pattern for the service layer: `Schema.parse(input)`, `deps.db.select().from(table).where(...)`, typed return |
| Input schema with optional fields and defaults | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (lines 34–61, `KbListStoriesInputSchema`) | Shows how optional filter fields and defaults are structured in Zod schemas used by this MCP server |
| Unit test with mocked service layer | `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts` (lines 1–60) | vi.hoisted + vi.mock pattern, mock deps object creation, handler invocation — canonical structure for handler unit tests |

---

## Knowledge Context

### Lessons Learned

KB search was unavailable during generation (connection error). The following lessons are inferred from KBAR story history visible in the codebase and story artifacts:

- **[KBAR-0030]** Security vulnerabilities (path traversal, symlink following) found as HIGH findings in code review.
  - *Applies because*: The `include_artifacts` flag triggers a secondary DB query filtering by `storyId`. No file paths are passed in this tool, so path traversal is not a concern here. However, the `story_id` input must still be validated (non-empty string) to prevent empty-string DB queries.

- **[KBAR-0040]** N+1 queries in batch operations were HIGH performance findings.
  - *Applies because*: The eager loading design for KBAR-0070 must use separate targeted queries (not N+1 iteration). The implementation must issue at most 3 queries total: (1) fetch story, (2) fetch artifacts if requested, (3) fetch dependencies if requested. Each secondary query uses `WHERE story_id = $1` — never a loop over individual records.

- **[KBAR-0040]** `as any` casts caused HIGH type-safety findings in code review.
  - *Applies because*: The extended return type of `kb_get_story` (which now conditionally includes `artifacts` and `dependencies` arrays) must be typed with Zod-inferred types, not `as any` casts. The response envelope must be a proper discriminated or union type.

- **[KBAR-0060 predecessor pattern]** The existing `kb_get_story` function returns `{ story: typeof stories.$inferSelect | null, message: string }`. Extensions must preserve this shape to avoid breaking callers.
  - *Applies because*: The new optional fields (`artifacts`, `dependencies`) should be additive — only present when the corresponding flag is `true`. Callers that do not pass `include_artifacts` should receive the same response they receive today.

### Blockers to Avoid (from past stories)

- **Starting implementation before KBAR-0060 is merged** — hard dependency per index entry. The stories index records `Depends On: KBAR-006`. KBAR-0060 is on the current branch and not yet merged.
- **Breaking the existing `kb_get_story` contract** — any change to `KbGetStoryInputSchema` or the function's return type must be backward compatible. Adding optional fields with `z.boolean().optional().default(false)` is the safe approach.
- **N+1 query pattern** — fetching artifacts or dependencies via a loop over story IDs (even though `story_id` is a single value here, the pattern must be set correctly for future reuse with `kb_list_stories` enhancement).
- **Missing test for `story not found` case** — the current implementation returns `{ story: null, message: "Story X not found" }` for missing stories. The extended handler must also return `{ artifacts: null, dependencies: null }` (or empty arrays) when `story` is null, without throwing.
- **Registering new schema parameters but forgetting to update `getToolDefinitions`** — the MCP client discovers tools via `tool-schemas.ts`. If `include_artifacts` is added to `KbGetStoryInputSchema` but not reflected in the JSON Schema returned by `getToolDefinitions`, agents won't know the parameter exists.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | Integration/UAT tests MUST use real PostgreSQL (testcontainers), never mocks. Handler unit tests may mock service layer. |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` — no Playwright E2E required. Testcontainers integration tests fulfill the UAT requirement. |

ADR-001 (API paths), ADR-002 (infrastructure), ADR-003 (CDN), ADR-004 (auth) are not applicable — this is a pure MCP tool with no HTTP endpoint, no infrastructure changes, no image storage, no authentication layer change.

### Patterns to Follow

- **Optional boolean flags with `default(false)`**: Add `include_artifacts: z.boolean().optional().default(false)` and `include_dependencies: z.boolean().optional().default(false)` to `KbGetStoryInputSchema`.
- **Conditional secondary queries**: After fetching the story, issue `deps.db.select().from(storyArtifacts).where(eq(storyArtifacts.storyId, validated.story_id))` only when `validated.include_artifacts === true`.
- **Null-safe secondary queries**: When `story` is null, skip secondary queries and return `artifacts: []` / `dependencies: []` (or `null`) immediately.
- **Return type as Zod schema**: Define the return shape as a Zod schema and infer the TypeScript type from it — do not use `interface` or manual `type` aliases.
- **Handler pattern**: Preserve the exact `handleKbGetStory` pattern structure — input cast log, `enforceAuthorization`, `KbGetStoryInputSchema.parse(input)`, service call, timing log, `JSON.stringify(result, null, 2)`.
- **Tool schema update**: Update `getToolDefinitions` in `tool-schemas.ts` to include `include_artifacts` and `include_dependencies` as optional boolean parameters in the `kb_get_story` tool definition.

### Patterns to Avoid

- **TypeScript `interface` for return types** — use `z.infer<>` from a Zod schema.
- **`as any` casts** — all Drizzle query results are typed via `$inferSelect`; use those types.
- **Modifying the DB schema** — no new columns, no new tables. All data needed for this story already exists in `stories`, `storyArtifacts`, `storyDependencies`.
- **Returning HTTP error codes** — MCP tool errors must use `errorToToolResult(error)` and the `McpToolResult` envelope format, not HTTP status codes.
- **Eager loading by default** — artifacts and dependencies must only be fetched when explicitly requested. Default behavior (`include_artifacts: false`) must remain a single-query operation.

---

## Conflict Analysis

### Conflict: KBAR-0060 not yet merged (blocking)

- **Severity**: blocking
- **Description**: The stories index records `KBAR-007 Depends On: KBAR-006`. KBAR-0060 is currently in `ready-to-work` status and its branch (`story/KBAR-0060`) shows active unstaged changes in this repository. The git status at session start confirms KBAR-0060 work is in-progress on the current branch. KBAR-0070 implementation must not start until KBAR-0060 is merged to main.
- **Resolution Hint**: PM elaboration and story generation for KBAR-0070 can proceed now. A `BLOCKED` flag must be set on the story record. Implementation begins only after KBAR-0060 UAT passes and merges to main.

---

## Story Seed

### Title

story_get Tool — MCP Story Retrieval with Optional Artifacts and Dependencies

### Description

**Context:**

The KB knowledge base MCP server already provides a basic `kb_get_story` tool (delivered as part of the KBAR story infrastructure) that retrieves a story record by ID from the `stories` database table. The current implementation returns only the story row — it does not include the story's associated artifacts (from `story_artifacts`) or dependency edges (from `story_dependencies`).

Agents that need to understand the full context of a story — such as checking what artifacts have been written, or which stories a given story depends on — currently must issue multiple separate MCP tool calls: one `kb_get_story` call plus one `kb_list_artifacts` call plus an ad-hoc dependency query. This is inefficient and error-prone.

**Problem:**

Without a single `story_get`-style tool that supports optional eager loading:
- Agents must chain multiple tool calls to build story context, increasing token cost and latency.
- Dependency relationship data (from `story_dependencies`) has no direct query path via the MCP server for a single story.
- Missing stories (story_id not in DB) are not cleanly differentiated from missing artifacts (story exists but has no artifacts yet).

**Solution Direction:**

Extend the existing `kb_get_story` MCP tool to support two optional boolean parameters:
- `include_artifacts` (default: `false`): When `true`, fetches all artifact records for the story from `story_artifacts` and includes them in the response.
- `include_dependencies` (default: `false`): When `true`, fetches all outbound and inbound dependency edges for the story from `story_dependencies` and includes them in the response.

The response when both flags are false remains identical to the current implementation (`{ story, message }`) to preserve backward compatibility. When flags are true, the response extends to `{ story, artifacts, dependencies, message }`.

The implementation is purely additive:
1. Add optional fields to `KbGetStoryInputSchema` in `story-crud-operations.ts`
2. Add conditional secondary queries in `kb_get_story` service function
3. Update `handleKbGetStory` tool handler if needed (likely no change needed — it passes through to service)
4. Update `getToolDefinitions` in `tool-schemas.ts` to expose the new parameters to MCP clients
5. Write unit tests for the new paths and a Vitest integration test against real PostgreSQL

### Initial Acceptance Criteria

- [ ] **AC-1**: `KbGetStoryInputSchema` extended with optional flags
  - `include_artifacts: z.boolean().optional().default(false)` added to schema
  - `include_dependencies: z.boolean().optional().default(false)` added to schema
  - Existing callers passing only `{ story_id }` continue to receive `{ story, message }` shape (backward-compatible)
  - Schema is Zod-first — no TypeScript `interface` types for input or output

- [ ] **AC-2**: `kb_get_story` service function returns artifacts when `include_artifacts: true`
  - Fetches all rows from `story_artifacts` where `storyId = validated.story_id`
  - Returns `artifacts: StoryArtifact[]` in response (empty array when no artifacts exist)
  - When `story` is `null` (story not found), returns `artifacts: []` without executing secondary query
  - Secondary query is a single `SELECT * FROM story_artifacts WHERE story_id = $1` — not N+1

- [ ] **AC-3**: `kb_get_story` service function returns dependencies when `include_dependencies: true`
  - Fetches all rows from `story_dependencies` where `storyId = validated.story_id` (outbound) OR `targetStoryId = validated.story_id` (inbound)
  - Returns `dependencies: StoryDependency[]` in response (empty array when no dependencies exist)
  - When `story` is `null` (story not found), returns `dependencies: []` without executing secondary query
  - Query is targeted (max 2 queries total for combined inbound/outbound, or 1 query with OR condition) — not N+1

- [ ] **AC-4**: Missing story handled gracefully
  - When `story_id` does not exist in DB, returns `{ story: null, artifacts: [], dependencies: [], message: "Story X not found" }` (arrays present and empty regardless of flags, when story is null)
  - Does not throw or return MCP error — returns a valid result envelope with `story: null`

- [ ] **AC-5**: MCP tool schema updated
  - `getToolDefinitions` in `tool-schemas.ts` reflects `include_artifacts` and `include_dependencies` as optional boolean parameters for the `kb_get_story` tool
  - Description strings for each parameter clearly explain the eager loading behavior
  - Existing `story_id` parameter description is preserved

- [ ] **AC-6**: Handler produces correctly structured JSON output
  - `handleKbGetStory` returns `{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }` with the extended result shape
  - Correlation ID and timing logs include `include_artifacts` and `include_dependencies` flag values for observability
  - `enforceAuthorization` call is preserved

- [ ] **AC-7**: Unit tests cover new code paths
  - Unit test for `include_artifacts: true` with artifact records present
  - Unit test for `include_artifacts: true` with no artifact records (empty array)
  - Unit test for `include_dependencies: true` with dependency records present
  - Unit test for `include_dependencies: true` with no dependency records (empty array)
  - Unit test for `story_id` not found with `include_artifacts: true` and `include_dependencies: true` (both return empty arrays, no DB error)
  - Unit tests follow existing vi.hoisted + vi.mock pattern in `tool-handlers.test.ts`

- [ ] **AC-8**: Integration test validates eager loading against real PostgreSQL
  - Uses Vitest integration test pattern (or testcontainers) against real KB PostgreSQL instance
  - Seeds story + artifact + dependency records, then calls `kb_get_story` with `include_artifacts: true` and `include_dependencies: true`
  - Validates that returned `artifacts` and `dependencies` arrays match seeded data
  - Validates that `include_artifacts: false` returns no `artifacts` key (or empty) without hitting `story_artifacts` table

### Non-Goals

- **Adding new DB tables or columns** — all data is in existing `stories`, `story_artifacts`, `story_dependencies` tables. No schema migrations in this story.
- **Implementing `kb_list_stories` eager loading** — only `kb_get_story` (single story by ID) is in scope. Bulk eager loading is deferred.
- **Artifact content fetching** — `include_artifacts` returns artifact metadata rows (type, name, filePath, summary) not the full `content` JSONB field by default. Full content is available via `kb_read_artifact`. (Consider whether to include `content` field or exclude it for token efficiency — decision for dev feasibility.)
- **Dependency graph traversal** — `include_dependencies` returns direct (1-hop) dependency edges only. Transitive closure / graph traversal is out of scope (KBAR-0009 `story_ready_to_start` handles that).
- **New MCP tool name** — this is an extension of the existing `kb_get_story` tool, not a new tool named `story_get`.
- **UI or HTTP API** — no frontend components, no REST endpoints.
- **KBAR-0008 (`story_list & story_update`)** — separate story, delivered next.

### Reuse Plan

- **Service function**: Extend `kb_get_story` in `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` in-place. Add secondary queries within the same function body after the primary story query.
- **Input schema**: Extend `KbGetStoryInputSchema` in the same file by adding optional boolean fields.
- **Handler**: `handleKbGetStory` in `tool-handlers.ts` likely needs no change — it passes all validated input through to the service function. Review after service changes.
- **Tool definitions**: `getToolDefinitions` in `tool-schemas.ts` — add parameter descriptions for `include_artifacts` and `include_dependencies` to the `kb_get_story` tool entry.
- **Drizzle tables**: `storyArtifacts` and `storyDependencies` from `../db/schema.js` — already imported in other CRUD operations in the same package; import as needed.
- **Test helpers**: Reuse `createMockEmbeddingClient`, `generateTestUuid` from `apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts`.
- **Packages**: `drizzle-orm` (`eq`, `or`, `and`) already used in `story-crud-operations.ts` — import additional operators as needed.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Critical test**: AC-4 (missing story with both flags true) must explicitly verify that secondary queries are NOT executed when story is null — assert via spy on `deps.db.select` or verify no secondary calls occur.
- **AC-8 integration test** is the UAT-level test per ADR-005. It must seed real rows in `stories`, `story_artifacts`, and `story_dependencies`, call `kb_get_story` with flags, and verify the returned arrays contain the seeded data.
- **Backward compatibility test**: Call `kb_get_story` with only `{ story_id }` (no flags) and assert the response shape is exactly `{ story: {...}, message: "..." }` — no `artifacts` or `dependencies` keys, or they are absent/null/empty depending on implementation decision.
- **Token efficiency test**: Call with `include_artifacts: false` on a story that has artifact records and verify the artifacts table is not queried (spy on DB or verify absence of `artifacts` key in response).
- Per ADR-005: no mocks in integration test. Testcontainers or real dev PostgreSQL instance.
- Per ADR-006: `frontend_impacted: false` — no Playwright tests required.

### For UI/UX Advisor

Not applicable — this is a backend-only MCP tool with no user-facing UI.

### For Dev Feasibility

- **Implementation risk: LOW** — all data already exists in the database. This is a read-only query extension with no schema changes.
- **Design decision to resolve**: Should the extended return type always include `artifacts` and `dependencies` keys (with empty arrays when flags are false), or only include them when the corresponding flag is true? Recommendation: always include the keys when the story is found, using empty arrays as default — this makes the response shape predictable for callers. Document this as the implementation decision.
- **Return type Zod schema**: Define `KbGetStoryResultSchema = z.object({ story: StorySchema.nullable(), artifacts: z.array(StoryArtifactSchema).optional(), dependencies: z.array(StoryDependencySchema).optional(), message: z.string() })` and export `type KbGetStoryResult = z.infer<typeof KbGetStoryResultSchema>`.
- **Secondary query for dependencies**: Use a single `OR` query: `deps.db.select().from(storyDependencies).where(or(eq(storyDependencies.storyId, story_id), eq(storyDependencies.targetStoryId, story_id)))` — this handles both inbound and outbound edges in one DB round-trip.
- **Import of `storyArtifacts` and `storyDependencies`**: These are already exported from `../db/schema.js`. Add to the existing import in `story-crud-operations.ts`.
- **Subtask decomposition**:
  - ST-1: Extend `KbGetStoryInputSchema` with optional boolean flags + update result Zod schema
  - ST-2: Add conditional artifact query in `kb_get_story` service function
  - ST-3: Add conditional dependency query in `kb_get_story` service function (with OR condition for both directions)
  - ST-4: Update `getToolDefinitions` in `tool-schemas.ts` to expose new parameters
  - ST-5: Write unit tests (AC-7) in `tool-handlers.test.ts` pattern
  - ST-6: Write integration test (AC-8) — seed data, call tool, assert response
- **Canonical references for subtask decomposition**:
  - ST-1 input schema: `KbListStoriesInputSchema` (lines 34–61, `story-crud-operations.ts`) — shows optional fields with defaults
  - ST-2/ST-3 query pattern: `kb_list_stories` (lines 194–258, `story-crud-operations.ts`) — shows conditional WHERE building and secondary count query
  - ST-4 tool schema: existing `kb_get_story` tool definition in `tool-schemas.ts` — extend in-place
  - ST-5 unit tests: `apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts` — vi.hoisted + vi.mock pattern
