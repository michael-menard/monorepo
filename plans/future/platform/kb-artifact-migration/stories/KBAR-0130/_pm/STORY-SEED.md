---
generated: "2026-02-24"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KBAR-0130

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None. Baseline is active and current.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `kb_search` function | `apps/api/knowledge-base/src/search/kb-search.ts` | Active | Hybrid semantic + keyword search using pgvector + RRF — the core search engine `artifact_search` will delegate to |
| `SearchInputSchema` | `apps/api/knowledge-base/src/search/schemas.ts` | Active | Zod schema: `{ query, role, tags, entry_type, limit, min_confidence, explain }` — reuse as the basis for `artifact_search` input schema |
| `SearchResultSchema` | `apps/api/knowledge-base/src/search/schemas.ts` | Active | Zod schema for search results with metadata — reuse or wrap for `artifact_search` output |
| `kb_write_artifact` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Active | Writes artifacts to `storyArtifacts` table + optionally indexes in KB — `artifact_search` queries what `artifact_write` (KBAR-0110) writes |
| `KbWriteArtifactInputSchema` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` (line ~69) | Active | Defines `artifact_type`, `story_id`, `phase`, `iteration`, `summary` fields — same fields that should filter `artifact_search` results |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/schema.ts` (line 753) | Active | DB table for artifacts — has `artifact_type`, `story_id`, `phase`, `kb_entry_id` (links to `knowledge_entries`) — search can filter on these columns |
| `ARTIFACT_TYPES` constant | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` (line ~30) | Active | Canonical 13-type enum — artifact_search filter must accept a subset of these |
| `handleKbSearch` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Active | MCP handler pattern for delegating to `kb_search` — direct template for `handleArtifactSearch` |
| `getToolDefinitions` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Active | New tool schema must be appended — tool count in `mcp-integration.test.ts` must be incremented |
| `mcp-integration.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Active | Tool count is currently 53; each story in Phase 4 adds one tool. KBAR-0110 adds `artifact_write` (→54), KBAR-0120 adds `artifact_read` (→55), KBAR-0130 adds `artifact_search` (→56). Actual count must be verified at implementation time. |
| `search-tools.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/search-tools.test.ts` | Active | Unit test pattern for KB search MCP handlers — identical structure to follow for `artifact_search` tests |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0090 | kb_get_next_story Unit Tests | uat | Modifies `mcp-integration.test.ts` and `tool-schemas.ts` — must land before KBAR-0130 starts to avoid merge conflicts on the tool count assertion |
| KBAR-011 (KBAR-0110) | artifact_write Tool | pending (depends on KBAR-010) | KBAR-0130 depends on KBAR-0110 per index; `artifact_write` is what writes KB-indexed artifacts that `artifact_search` will query |

### Constraints to Respect

1. **Depends on KBAR-0110** — story index declares `Depends On: KBAR-011 (artifact_write Tool)`. KBAR-0130 must not begin until KBAR-0110 is complete and merged.
2. **KBAR-0090 must land before KBAR-0130** — KBAR-0090 modifies `mcp-integration.test.ts` (tool count 52→53) and `tool-schemas.ts`. Merge conflicts guaranteed if KBAR-0130 begins before KBAR-0090 lands.
3. **Search quality depends on KB tagging** — index risk note: "Search quality depends on KB tagging consistency." The `artifact_write` tool (KBAR-0110) must tag artifacts appropriately for `artifact_search` to return useful results. KBAR-0130 should document the expected tag convention and handle the no-results case explicitly.
4. **Must handle no-results gracefully** — index risk note: "must handle no-results gracefully." An empty result set must return a structured success response, not an error.
5. **Zod-first types (REQUIRED)** — All input/output schemas must use `z.object(...)` with `z.infer<>`. No TypeScript interfaces for public API shapes.
6. **No barrel files** — Import directly from source paths (e.g., `../../search/kb-search.js` not `../../search/index.js` unless the search index already exports it).
7. **`@repo/logger` only** — No `console.log`.
8. **Protected: existing `kb_search` and `kb_write_artifact` handlers** — Do not modify existing handlers; `artifact_search` is a new, additive tool.
9. **ADR-005** — Integration/UAT tests must use real services. Unit tests may mock `kb_search`.

---

## Retrieved Context

### Related Endpoints

This is a backend MCP tool story — no HTTP endpoints involved. The `artifact_search` tool is exposed via the MCP stdio transport (not HTTP).

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `kb_search` function | `apps/api/knowledge-base/src/search/kb-search.ts` | The search engine to delegate to — accepts `{ query, role, tags, entry_type, limit, min_confidence, explain }` and returns `{ results, metadata }` |
| `SearchInputSchema` | `apps/api/knowledge-base/src/search/schemas.ts` | Compose with `artifact_search`-specific filters (`story_id`, `artifact_type`) — extend or wrap this schema |
| `handleKbSearch` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Direct structural template: parse → validate → call `kb_search` → log timing → return result as `{ content: [{ type: 'text', text: JSON.stringify(result) }] }` |
| `search-tools.test.ts` | `apps/api/knowledge-base/src/mcp-server/__tests__/search-tools.test.ts` | Test pattern: `vi.mock('../../search/index.js')` + `vi.mocked(kb_search).mockResolvedValue(...)` — exact structure to replicate |
| `artifact-operations.ts` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | `ARTIFACT_TYPES` constant for filter validation; `ArtifactTypeSchema` for Zod enum in input |
| `storyArtifacts` schema | `apps/api/knowledge-base/src/db/schema.ts` (line 753) | Understand `kb_entry_id` column — when an artifact has `kb_entry_id != null`, it is indexed in KB and searchable |

### Reuse Candidates

- **`kb_search`**: The core search engine — `artifact_search` is a thin wrapper that pre-filters results to the artifact domain by injecting artifact-specific tags and an `entry_type` filter
- **`SearchInputSchema`**: Compose as the base for `ArtifactSearchInputSchema` — add `story_id?: string` and `artifact_type?: ArtifactTypeEnum` fields as additional filters that get translated to KB tag filters before calling `kb_search`
- **`handleKbSearch` handler structure**: Copy verbatim as the structural template for `handleArtifactSearch`
- **`search-tools.test.ts` vi.mock pattern**: Identical `vi.mock('../../search/index.js')` pattern applies for unit testing `handleArtifactSearch`
- **`ArtifactTypeSchema`** from `artifact-operations.ts`: Use as the Zod enum type for the `artifact_type` filter parameter

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP search tool handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | `handleKbSearch` function: canonical parse → validate → delegate to search fn → log timing → return structured JSON text — exact template for `handleArtifactSearch` |
| Search function with Zod validation | `apps/api/knowledge-base/src/search/kb-search.ts` | `kb_search` function: `SearchInputSchema.parse(input)` → embedding → keyword → RRF merge → return. Shows the service layer pattern to delegate to. |
| MCP search tool unit tests | `apps/api/knowledge-base/src/mcp-server/__tests__/search-tools.test.ts` | `vi.mock('../../search/index.js')` + `vi.mocked(kb_search).mockResolvedValue(...)` + context + correlation ID pattern — replicate exactly |
| MCP tool schema definition | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Shows how to add a new tool via `zodToMcpSchema(ArtifactSearchInputSchema)` with name + description + inputSchema |

---

## Knowledge Context

### Lessons Learned

- **[WKFL retro]** Code stories delivering TypeScript + tests exceed token estimates by 4-8x. *(Applies because: KBAR-0130 creates a new Zod schema, MCP handler, and unit tests — a full code story pattern. Token estimates must apply a 4-6x multiplier.)*
- **[KBAR-0080/KBAR-0110]** Tool count in `mcp-integration.test.ts` must be re-verified at implementation time. *(Applies because: KBAR-0130 adds `artifact_search` to the tool list; the count assertion must be updated. Count is 53 now but KBAR-0110 and KBAR-0120 precede KBAR-0130, each adding a tool. Run `getToolDefinitions().length` at the start of implementation before writing the assertion.)*
- **[KBAR-0080]** `story-crud-operations` mock gap in `mcp-integration.test.ts`. *(Applies because: similarly, `artifact-operations.ts` and `search/index.js` mocks may be absent in `mcp-integration.test.ts`. Check whether these modules are already mocked before adding the new tool's integration smoke test.)*
- **[WKFL retro]** KB and search tools frequently unavailable — fallback handling required. *(Applies because: `artifact_search` delegates to `kb_search`, which can enter fallback (keyword-only) mode if OpenAI is unavailable. The handler must surface `metadata.fallback_mode` in the response so callers know they got degraded results.)*

### Blockers to Avoid (from past stories)

- Setting the wrong tool count in `mcp-integration.test.ts` without re-verifying at implementation time (causes CI failure)
- Missing a `vi.mock` block for `../../search/index.js` in unit tests (causes real OpenAI/DB calls in test suite)
- Returning an error response when query returns zero results (must return empty `results: []` with `total: 0` in metadata)
- Not surfacing `fallback_mode: true` in the response when `kb_search` falls back to keyword-only (callers need to know)
- Writing TypeScript interfaces instead of Zod schemas with `z.infer<>` for the input/output shapes

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests that exercise `kb_search` against real KB must use real PostgreSQL KB instance; unit tests may mock `kb_search` |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable (no UI surface) — story should mark `e2e: not_applicable` in SCOPE.yaml |

### Patterns to Follow

- Delegate to `kb_search` rather than re-implementing search: `artifact_search` is a semantic filter/lens over the existing hybrid search engine
- Translate `story_id` and `artifact_type` filter inputs into KB tag filters before calling `kb_search` (e.g., `tags: ['artifact', story_id, artifact_type]`)
- Return `metadata.fallback_mode` in the response to signal keyword-only fallback to callers
- Handler structure: `ArtifactSearchInputSchema.parse(input)` → build `SearchInput` (translate artifact filters to tags) → `kb_search(searchInput, { db, embeddingClient })` → log timing → return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
- `@repo/logger` for all logging (not `console.log`)
- `vi.hoisted` / `vi.mock` pattern for unit tests of the new handler

### Patterns to Avoid

- Re-implementing hybrid search logic from scratch — always delegate to the existing `kb_search` function
- Propagating `kb_search` errors as unhandled exceptions — the handler must catch and return a structured error response
- Using `console.log` instead of `@repo/logger`
- Barrel file imports
- TypeScript interfaces instead of Zod schemas
- Returning an error when results are empty — empty result set is a valid, successful response

---

## Conflict Analysis

### Conflict: Dependency Ordering / Tool Count Drift
- **Severity**: warning (non-blocking for seed generation, blocking for implementation start)
- **Description**: KBAR-0130 depends on KBAR-0110 (artifact_write). KBAR-0110 in turn depends on KBAR-010 (Story Tools Integration Tests). Both predecessors (KBAR-0110 and KBAR-0120) add tools to `getToolDefinitions()`, incrementing the count. KBAR-0130 must not begin until all three predecessors are merged to main. The tool count in `mcp-integration.test.ts` at the time KBAR-0130 begins will be 53 + (number of Phase 4 tools added by merged predecessors). This must be re-verified programmatically at implementation time.
- **Resolution Hint**: At the start of implementation, run the test suite to see the current count assertion, then run `getToolDefinitions().length` in a scratch script or REPL to get the ground truth before writing the new assertion.

---

## Story Seed

### Title

`artifact_search` Tool — Semantic Search Across KB-Indexed Artifacts Using Natural Language

### Description

**Context**: The KB artifact migration epic (KBAR) is building an MCP tool layer over the knowledge-base DB so agents can read and write workflow artifacts (CHECKPOINT.yaml, EVIDENCE.yaml, REVIEW.yaml, etc.) through a stable API. KBAR-0110 (`artifact_write`) establishes dual-write, indexing artifacts into the KB `knowledgeEntries` table alongside the `storyArtifacts` table. KBAR-0120 (`artifact_read`) enables reading by story + type. KBAR-0130 closes the loop: it enables agents to find artifacts they didn't already know about via natural language.

**Problem**: Once hundreds of artifacts are stored in the KB across dozens of stories, agents have no way to query across them semantically. An agent running a new story cannot ask "what evidence artifacts mentioned OpenAI API timeout handling?" or "find all REVIEW artifacts that flagged Zod schema violations" without scanning the file system manually. The existing `kb_search` tool can answer these questions if called correctly, but it requires callers to know the right tag structure and `entry_type` filters — knowledge that is not codified in any tool API.

**Proposed Solution**: Implement a new `artifact_search` MCP tool that:
1. Accepts a natural language `query` plus optional artifact-domain filters (`story_id`, `artifact_type`, `phase`)
2. Translates these artifact-specific filters into the correct KB tag filters and `entry_type` before delegating to the existing `kb_search` function
3. Returns ranked results with relevance scores and `fallback_mode` metadata
4. Returns an empty result set (not an error) when no artifacts match

The tool is intentionally thin: it adds artifact-domain filter semantics on top of the existing hybrid search engine rather than re-implementing any search logic.

### Initial Acceptance Criteria

- [ ] AC-1: `artifact_search` MCP tool is registered in `toolHandlers` and `getToolDefinitions()` in `tool-schemas.ts`
- [ ] AC-2: Tool accepts `{ query: string, story_id?: string, artifact_type?: ArtifactTypeEnum, phase?: StoryPhaseEnum, limit?: number, min_confidence?: number, explain?: boolean }` — Zod schema, no TypeScript interfaces
- [ ] AC-3: `query` is required and non-empty; all other parameters are optional
- [ ] AC-4: `story_id`, `artifact_type`, and `phase` filters are translated into KB tag filter expressions before calling `kb_search`
- [ ] AC-5: Delegates to the existing `kb_search` function with the composed `SearchInput` — does not re-implement search logic
- [ ] AC-6: Returns a structured result: `{ results: SearchResultEntry[], metadata: { total, fallback_mode, query_time_ms, search_modes_used } }` — reuses or wraps `SearchResultSchema` from `search/schemas.ts`
- [ ] AC-7: Empty result set (`results: []`, `total: 0`) is returned as a success response, not an error
- [ ] AC-8: `metadata.fallback_mode: true` is propagated in the response when `kb_search` falls back to keyword-only mode (OpenAI unavailable)
- [ ] AC-9: Unit tests cover: happy path (results returned), empty results (success with empty array), fallback_mode propagation, invalid query (Zod error), all optional filters applied correctly
- [ ] AC-10: `mcp-integration.test.ts` tool count assertion is updated to reflect the addition of `artifact_search`
- [ ] AC-11: `artifact_search` appears in the tool name list in `mcp-integration.test.ts`

### Non-Goals

- Do not modify or extend `kb_search` — `artifact_search` is a wrapper, not a modification
- Do not implement `artifact_read` (KBAR-012) or `artifact_write` (KBAR-011) — those are separate stories
- Do not implement `artifact_summary_extraction` (KBAR-014) — that is the next phase story
- Do not add full-text search across artifact JSONB content directly in SQL — all search goes through KB embeddings via `kb_search`
- Do not add E2E/Playwright tests — no UI surface (`e2e: not_applicable` in SCOPE.yaml)
- Do not modify the `storyArtifacts` DB schema
- Do not modify the `knowledge_entries` schema or the `kb_search` function

### Reuse Plan

- **Components**: `handleKbSearch` (in `tool-handlers.ts`) as the structural template for `handleArtifactSearch`; `SearchInputSchema` as the base to compose `ArtifactSearchInputSchema`
- **Patterns**: `vi.mock('../../search/index.js')` pattern from `search-tools.test.ts` for unit testing the new handler; KB tag convention for artifact identity (e.g., `['artifact', story_id, artifact_type]`)
- **Packages**: `kb_search` from `search/kb-search.ts` (the search engine); `SearchInputSchema` + `SearchResultSchema` from `search/schemas.ts`; `ArtifactTypeSchema` + `StoryPhaseSchema` from `__types__/index.ts`; `@repo/logger` for logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Primary test concern: filter translation correctness — verify that `story_id`, `artifact_type`, and `phase` inputs are translated into the correct KB `tags` before `kb_search` is called (use `vi.mocked(kb_search)` call argument inspection).
- Test the no-results case explicitly — `kb_search` returning `{ results: [], metadata: { total: 0, ... } }` must produce a success response, not an error.
- Test `fallback_mode: true` propagation — when `kb_search` returns `metadata.fallback_mode: true`, the `artifact_search` response must also carry this flag.
- Test Zod validation rejection of empty `query` — `query: ''` must return a validation error.
- Tool count in `mcp-integration.test.ts`: the integration test verifies tool presence by name and count. The test plan must include updating this assertion. Actual count must be re-verified at implementation time after all predecessor KBAR Phase 4 tools are merged.
- ADR-005 applies: any integration tests that exercise the real `kb_search` against the KB DB must use a real PostgreSQL KB instance.

### For UI/UX Advisor

Not applicable. `artifact_search` is a backend MCP tool with no UI surface. No UX review required. Mark as `not_applicable`.

### For Dev Feasibility

- **Sizing**: This story is intentionally thin — `artifact_search` delegates all logic to `kb_search`. The primary work is: (1) define `ArtifactSearchInputSchema` (extends `SearchInputSchema` with artifact filters), (2) implement the filter-to-tags translation function, (3) implement `handleArtifactSearch` following the `handleKbSearch` template, (4) register the tool, (5) write unit tests. Estimated effort: 1 focused work session (2-4 hours actual coding time) — lighter than KBAR-0110.
- **Tag convention**: The critical design decision is how `story_id` and `artifact_type` are encoded as KB tags. Check what tags `artifact_write` (KBAR-0110) writes to `knowledge_entries` when indexing an artifact — `artifact_search` must use matching tag values. If KBAR-0110 is not yet merged when KBAR-0130 is being planned, coordinate with the KBAR-0110 implementer on the tag convention.
- **Filter composition**: `story_id` filter → prepend `story_id` to `tags` array. `artifact_type` filter → prepend `artifact_type` value to `tags` array. `phase` filter → prepend `phase` value to `tags` array. The KB tag filter uses OR logic — if cross-filter AND semantics are needed, this requires additional thought (or a compound-tag approach like `artifact:evidence`).
- **Dependency gate**: Confirm KBAR-0110 and KBAR-0120 are both merged to main before beginning. At implementation start, run `getToolDefinitions().length` to get the ground-truth tool count before writing the `mcp-integration.test.ts` assertion.
- **Canonical references**: Read `handleKbSearch` in `tool-handlers.ts` and `search-tools.test.ts` first — these are the two files to use as structural templates.
