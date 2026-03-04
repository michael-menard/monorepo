---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: KBAR-0140

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates KBAR-0110 through KBAR-0130 landing; active stories list is not current (all three dependencies are in UAT or completed)

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Orchestrator artifact schemas (Zod-validated) | `packages/backend/orchestrator/src/artifacts/` | Defines canonical schema for checkpoint, scope, plan, evidence, review, qa_gate, completion_report, etc. |
| `storyArtifacts` jump table with `summary` JSONB column | `apps/api/knowledge-base/src/db/schema.ts` | `summary` column exists but is caller-supplied; no auto-extraction today |
| `kb_write_artifact` MCP tool | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Accepts optional `summary` param; does not compute it automatically |
| `artifact_write` dual-write tool | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | No summary extraction — passes `summary: undefined` to `kb_write_artifact` |
| Prototype `extractSummary()` function | `apps/api/knowledge-base/src/scripts/migrate-artifacts-simple.ts` | Already covers 9 artifact types; script-only, not importable as a shared utility |
| `mapContentToTypedColumns()` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | Maps content → typed columns per artifact type; analogous pattern to what summary extraction needs |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| KBAR-0120 (artifact_read Tool — unit tests) | uat | Dependency; establishes artifact tool handler test patterns |
| KBAR-0130 (artifact_search Tool) | completed | Dependency; artifact_search returns `summary` field from jump table — quality of search results depends on summaries being populated |
| KBAR-0150 (Artifact Tools Integration Tests) | uat | Downstream; depends on KBAR-0140 for tool count accuracy (mcp-integration.test.ts) |

### Constraints to Respect

- Protected: `storyArtifacts` table schema (column names and types are fixed by migration 009/015)
- Protected: `artifact-operations.ts` public API surface (`kb_write_artifact`, `kb_read_artifact`, etc.)
- `ArtifactTypeSchema` in `src/__types__/index.ts` enumerates all 13 valid artifact types; extraction logic must handle all 13
- Zod-first types (no TypeScript interfaces)
- No barrel files — import directly from source
- `@repo/logger` for all logging

---

## Retrieved Context

### Related Endpoints
N/A — this story is a TypeScript utility library within `apps/api/knowledge-base/`. No HTTP endpoints involved.

### Related Components
N/A — no UI components.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| Prototype `extractSummary()` | `apps/api/knowledge-base/src/scripts/migrate-artifacts-simple.ts` lines 100–203 | Lift-and-refine into a proper shared module; add missing types (qa_gate, completion_report, fix_summary, analysis, verification, proof) |
| `mapContentToTypedColumns()` type-dispatch switch | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` lines 240–395 | Follow identical switch-on-artifactType pattern |
| `ARTIFACT_TYPES` constant | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` line 44 | Import for exhaustiveness validation |
| `ArtifactTypeSchema` | `apps/api/knowledge-base/src/mcp-server/__types__/index.ts` | Use for Zod schema typing of input parameter |
| `artifact-tools.test.ts` test structure | `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` | Follow mock pattern for unit tests of new utility |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Switch-on-artifact-type content mapping | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` | `mapContentToTypedColumns()` shows exact dispatch pattern: one case per type, safe field access with nullish coalescing |
| Prototype summary extraction logic | `apps/api/knowledge-base/src/scripts/migrate-artifacts-simple.ts` | `extractSummary()` function (lines 100–203) is the seed implementation; covers elaboration, plan, verification, proof, tokens, checkpoint, scope, evidence, review, context |
| Shared utility module with `__tests__` | `apps/api/knowledge-base/src/chunking/index.ts` | Example of a well-structured standalone utility module with co-located tests and `__types__/` |
| Artifact operations integration with `kb_write_artifact` | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` lines 630–742 | Shows where to inject auto-extracted summary before calling `kb_write_artifact` |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0130]** OR semantics in artifact_search tag filtering: searching by `story_id` + `artifact_type` returns results matching ANY filter, not the intersection. (category: edge-case)
  - *Applies because*: Summary quality directly affects artifact_search result utility. If summaries are missing or wrong, search callers cannot easily distinguish results.

- **[KBAR-0200]** Agent+TypeScript node pairs must always be updated together. (category: architecture)
  - *Applies because*: If summary extraction is invoked from agent markdown (e.g., knowledge-context-loader) AND from a TypeScript LangGraph node, both must be updated. Scope for KBAR-0140 is utility-only, but consumers must be aware.

- **[KFMB-5010]** `kb_write_artifact` `artifact_name` parameter is optional; auto-generation is correct default. (category: tooling)
  - *Applies because*: Summary extraction should follow the same pattern — auto-extract unless the caller explicitly overrides via the `summary` param.

### Blockers to Avoid (from past stories)

- Do not modify the `storyArtifacts` DB schema — `summary` column already exists as `jsonb`; no migration needed
- Do not put summary extraction logic only in the migration script — it must be a shared, importable utility so `kb_write_artifact` and `artifact_write` can call it at write time
- Do not introduce TypeScript interfaces — all types via Zod schemas with `z.infer<>`

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT tests must not use MSW or in-memory DB; unit tests for extractSummary may use inline fixtures |
| ADR-006 | E2E Tests Required in Dev Phase | N/A — no UI-facing AC; skip condition applies (`frontend_impacted: false`) |

### Patterns to Follow

- Switch-on-artifact-type dispatch (mirroring `mapContentToTypedColumns`)
- Zod schema for input validation of `artifactType` parameter
- Graceful fallback: if unknown artifact type, return top-level scalar fields (matching existing `default:` branch in prototype)
- Module in `src/crud-operations/` (where artifact logic lives) or a new `src/artifact-summary/` directory following the chunking module pattern

### Patterns to Avoid

- Do not put the utility in `src/scripts/` — it must be importable from production code
- Do not inline the switch logic inside `kb_write_artifact` — keep it in a separate, testable module
- Do not return the full `content` object as the summary — summaries must be concise (5–10 key fields max)

---

## Conflict Analysis

No conflicts detected. KBAR-0120 (dependency) is in UAT. KBAR-0130 (secondary dependency) is completed. No active story touches `artifact-operations.ts` or the `summary` column.

---

## Story Seed

### Title
KBAR-0140: Artifact Summary Extraction — Shared Utility for Auto-Populating `summary` on Write

### Description
**Context**: The `storyArtifacts` jump table has a `summary` JSONB column that is populated by callers of `kb_write_artifact`. Today, no summary auto-extraction exists in production code — callers must either pass a `summary` object or leave it null. The migration script (`migrate-artifacts-simple.ts`) contains a prototype `extractSummary()` function covering 9 of 13 artifact types, but it is not importable from the production codebase.

**Problem**: When agents call `artifact_write` or `kb_write_artifact`, the `summary` field in the database remains `null` unless the agent manually computes it. This degrades the quality of `artifact_search` results (which surface summary fields) and makes the `kb_get_story` artifact list less informative. The situation is preventable: the summary fields are deterministic given the artifact type and content.

**Proposed Solution**: Extract `extractSummary()` into a shared, importable TypeScript module within `apps/api/knowledge-base/src/`. Expand coverage to all 13 artifact types. Integrate it into `artifact_write` (and optionally into `handleKbWriteArtifact`) so that summary auto-extraction happens automatically at write time unless the caller explicitly provides a `summary` override. Write Vitest unit tests covering all 13 artifact types and the fallback/default case.

### Initial Acceptance Criteria

- [ ] AC-1: A shared `extractArtifactSummary(artifactType: string, content: Record<string, unknown>): Record<string, unknown>` function exists in a production-importable module (not in `src/scripts/`)
- [ ] AC-2: `extractArtifactSummary` handles all 13 artifact types: `checkpoint`, `scope`, `plan`, `evidence`, `verification`, `analysis`, `context`, `fix_summary`, `proof`, `elaboration`, `review`, `qa_gate`, `completion_report`
- [ ] AC-3: For each artifact type, the extracted summary is a concise subset (5–10 fields maximum) covering the highest-signal fields (e.g., verdict, count fields, status flags)
- [ ] AC-4: Unknown artifact types return a graceful fallback: top-level scalar fields (strings, numbers, booleans), max 5 keys
- [ ] AC-5: `artifact_write` automatically calls `extractArtifactSummary` and passes the result as `summary` to `kb_write_artifact` when the caller does not provide an explicit `summary` override
- [ ] AC-6: Caller-provided `summary` in `artifact_write` input takes precedence over auto-extracted summary (opt-out mechanism preserved)
- [ ] AC-7: Vitest unit tests cover all 13 artifact type extractors and the fallback case with representative fixture content
- [ ] AC-8: All existing tests in `artifact-tools.test.ts` and `artifact-tools-integration.test.ts` continue to pass (no regression)
- [ ] AC-9: TypeScript compiles without errors; ESLint produces no errors on new/changed files

### Non-Goals

- Do NOT add a new MCP tool — this is a utility module consumed internally by existing tools
- Do NOT modify the `storyArtifacts` DB schema — `summary jsonb` column already exists
- Do NOT backfill existing null summaries in the database — that is a separate migration concern (potentially a follow-on script)
- Do NOT change the `kb_write_artifact` MCP tool's public input schema — `summary` remains optional for callers who want to override
- Do NOT touch `migrate-artifacts-simple.ts` (the script prototype) — it is separate from the production utility
- Do NOT update the mcp-integration.test.ts tool count — no new MCP tool is being registered
- Do NOT implement lesson extraction or architectural decision extraction (those are KBAR-0250/0260)

### Reuse Plan
- **Components**: Lift-and-refine `extractSummary()` prototype from `migrate-artifacts-simple.ts` lines 100–203
- **Patterns**: Switch-on-artifact-type dispatch (identical to `mapContentToTypedColumns`); Zod schema for input param typing
- **Packages**: `zod` (already in deps), `@repo/logger` for any logging in the integration path

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Unit tests should use inline fixture objects (representative YAML content per artifact type) — no DB required for the pure extraction function
- Integration tests (if added) should verify that calling `artifact_write` with no explicit `summary` results in a non-null `summary` column in `storyArtifacts`
- Edge cases to cover: empty content object (`{}`), missing expected fields (e.g., `evidence` with no `ac_total`), all-null fields, unexpected field types
- The fallback case (unknown artifact type) is important to test explicitly
- AC-8 regression: run `artifact-tools.test.ts` and `artifact-tools-integration.test.ts` without change to confirm no breakage before touching `artifact_write`
- No E2E tests needed — ADR-006 skip condition applies (`frontend_impacted: false`)

### For UI/UX Advisor
- No UI surface — this is a backend utility. No UX considerations apply.

### For Dev Feasibility
- **Primary implementation file**: New module at `apps/api/knowledge-base/src/crud-operations/artifact-summary.ts` (co-located with `artifact-operations.ts` for cohesion) OR `apps/api/knowledge-base/src/artifact-summary/index.ts` (following the chunking module pattern)
- **Integration point**: `artifact_write` in `artifact-operations.ts` (lines 1037–1116) — add one line before the `kb_write_artifact` call: `const summary = input.summary ?? extractArtifactSummary(input.artifact_type, input.content)`
- **Token budget estimate**: ST-1 (port prototype + expand to 13 types): ~3,000 tokens; ST-2 (unit tests): ~4,000 tokens; ST-3 (integrate into artifact_write + regression): ~2,000 tokens
- **Canonical references for subtask decomposition**:
  - `apps/api/knowledge-base/src/scripts/migrate-artifacts-simple.ts` lines 100–203 — prototype to port
  - `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts` lines 240–395 — switch pattern to mirror
  - `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools.test.ts` — test structure to follow
- **Risk**: The 4 artifact types not covered by the prototype (`fix_summary`, `qa_gate`, `completion_report`, `analysis`) must be reverse-engineered from `mapContentToTypedColumns` — this is low effort since the typed columns are already documented there
- **No DB migration needed** — `summary jsonb` column exists; story is purely TypeScript utility + integration wiring
