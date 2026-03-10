---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0200

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates all Phase 4 and Phase 5 agent migration stories (KBAR-0110 through KBAR-0190 were added post-baseline). The baseline's "Active Stories" section says "None currently in-progress" but the index shows KBAR-0110 is in UAT and several Phase 5 stories are pending. The baseline does correctly document the `knowledge-context-loader.agent.md` and the KB's `kb_search` tool that the loader currently uses for lessons-learned queries. The baseline documents the `knowledgeEntries` table with vector embeddings — this is the same table that `artifact_search` indexes artifacts into for semantic search, making it the correct search target for pattern discovery.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `knowledge-context-loader` agent (v2.1.0) | `.claude/agents/knowledge-context-loader.agent.md` | **Primary target**: Currently uses `kb_search` with `tags: ["lesson-learned"]` for lessons queries and reads `ADR-LOG.md` via filesystem for ADRs. This story adds a third query path: `artifact_search` for pattern discovery across past story artifacts. |
| `loadKnowledgeContext()` TypeScript function | `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` | The programmatic implementation of the knowledge context loader. Uses `getLessonsFromKB()` which calls `kbSearchFn` (a passed-in `kb_search` function). The TypeScript implementation may also need updating to support `artifact_search` queries alongside lesson searches. |
| `artifact_search` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (KBAR-0130, failed-qa) | **Key dependency**: Semantic search over artifacts indexed in `knowledgeEntries`. Input: `{ query, story_id?, artifact_type?, phase?, limit?, min_confidence?, explain? }`. Tags: `['artifact', story_id, artifact_type, phase].filter(Boolean)`. Note: currently failed-qa — must be in stable state before KBAR-0200 can be implemented. |
| `ArtifactSearchInputSchema` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 213) | Defines the exact `artifact_search` input contract. Natural language `query` is required. All filters (`story_id`, `artifact_type`, `phase`, `min_confidence`, `explain`) are optional. Limit defaults to 10. |
| `knowledgeEntries` table (pgvector) | Separate PostgreSQL (port 5433), via `apps/api/knowledge-base/` | Stores KB entries with vector embeddings (OpenAI text-embedding-3-small, 1536 dim). Both lesson entries (via `kb_add`) and artifact entries (via `artifact_write` KB write path) live here. `artifact_search` queries this table. |
| KB integration shared doc | `.claude/agents/_shared/kb-integration.md` | Documents the artifact type reference table and canonical `artifact_search` purpose: semantic search across artifacts indexed in `knowledgeEntries` via `kb_add`. Distinct from `kb_read_artifact` which is direct lookup. |
| `KnowledgeContextSchema` + `getLessonsFromKB()` | `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` (lines 378–492) | Current KB query logic uses `kbSearchFn` with `tags: ["lesson-learned"]`. The TypeScript node will need an optional second search function (or enhancement) to also invoke `artifact_search` for pattern discovery. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0130 (`artifact_search` tool) | failed-qa | **Hard dependency**: KBAR-0200 relies on `artifact_search` being stable and functional. KBAR-0130 is currently in failed-qa state — it must pass QA and reach UAT/completed before KBAR-0200 can be implemented. |
| KBAR-0190 (QA & fix agents) | elaboration | **Direct dependency**: KBAR-0200 depends on KBAR-0019 (KBAR-0190 in index format). Must wait for KBAR-0190 to complete. No direct file overlap with `knowledge-context-loader.agent.md`. |
| KBAR-0170 (execute/worker agents) | Created | No overlap with knowledge-context-loader. No conflict. |
| KBAR-0180 (code review agents) | Ready to Work | No overlap with knowledge-context-loader. No conflict. |

### Constraints to Respect

- `knowledgeEntries` table schema is protected — do not alter columns or indexes
- `artifact_search` tool contract must not change (owned by KBAR-0130, protected)
- `kb_search` usage for lesson-learned queries must be preserved — `artifact_search` is additive, not a replacement for the existing lesson query path
- `knowledge-context-loader.agent.md` is documentation-only change in the agent file itself; the TypeScript implementation (`load-knowledge-context.ts`) may require code changes if the programmatic KB node is updated — Dev Feasibility must determine scope
- The TypeScript `getLessonsFromKB()` function currently takes a `kbSearchFn` parameter (dependency injection). Adding `artifact_search` support may require adding an `artifactSearchFn` parameter or updating the `KnowledgeContextConfigSchema` — no TypeScript interfaces allowed (Zod schemas only per CLAUDE.md)
- The knowledge-context-loader is called by high-frequency agents: `pm-story-seed-agent`, `dev-setup-leader`, `dev-plan-leader`. Regressions have broad workflow impact.
- Search query construction is flagged as "critical for relevance" in the story index — the `query` strings passed to `artifact_search` must be domain-scoped and meaningful, not generic

---

## Retrieved Context

### Related Endpoints

This story touches no HTTP endpoints. It modifies the agent markdown file (`.claude/agents/knowledge-context-loader.agent.md`) and potentially the TypeScript orchestrator node (`packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts`). No new endpoints are introduced.

### Related Components

| File | Role |
|------|------|
| `.claude/agents/knowledge-context-loader.agent.md` | **Primary target** — add `artifact_search` query phase for pattern discovery alongside existing `kb_search` lesson queries |
| `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` | Programmatic implementation — may need `artifact_search` integration for the TypeScript LangGraph node execution path |
| `packages/backend/orchestrator/src/artifacts/knowledge-context.ts` | Zod schema defining `KnowledgeContext` output structure — may need extension if pattern-discovery results are added to the output shape |
| `packages/backend/orchestrator/src/artifacts/__tests__/knowledge-context.test.ts` | Existing unit tests — must be updated if TypeScript implementation changes |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Reference: `handleArtifactSearch` handler — the tool being called |
| `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Reference: `ArtifactSearchInputSchema` (line 213) — exact input contract |

### Reuse Candidates

- Existing `kb_search` call blocks in `knowledge-context-loader.agent.md` — use as structural template for the new `artifact_search` phase call blocks
- `getLessonsFromKB()` function signature — mirror the dependency-injection pattern for any `artifact_search` integration in the TypeScript node
- `ArtifactSearchInputSchema` from KBAR-0130: `{ query: string, story_id?, artifact_type?, phase?, limit?, min_confidence?, explain? }` — use directly as the call shape in agent documentation
- KBAR-0160 and KBAR-0190 seeds — use as the migration documentation template (frontmatter update, dual-capability description, graceful failure pattern)
- `KnowledgeContextConfigSchema` in `load-knowledge-context.ts` (line 122) — if TypeScript node is updated, extend this Zod schema (not an interface) with optional `artifactSearchFn` parameter

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Current kb_search usage in knowledge-context-loader | `.claude/agents/knowledge-context-loader.agent.md` | Shows the exact Phase 1 query pattern (lesson-learned searches) that `artifact_search` queries will be added to in Phase 3.5 (new pattern discovery phase). The three existing `kb_search` call blocks are the structural model. |
| artifact_search input contract and behavior | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 213) | Defines the ArtifactSearchInputSchema: required `query`, optional `story_id`, `artifact_type`, `phase`, `limit`, `min_confidence`, `explain`. The tag composition rule (`['artifact', story_id, artifact_type, phase].filter(Boolean)`) constrains how filters must be combined. |
| Dependency injection pattern for KB search | `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` (line 378) | The `getLessonsFromKB()` function signature shows the established DI pattern for KB functions: `kbSearchFn` is passed in, not imported directly. Any `artifactSearchFn` addition should follow the same pattern. |
| Agent migration frontmatter update pattern | `.claude/agents/dev-setup-leader.agent.md` | Post-KBAR-0160 state shows how `kb_tools` frontmatter is updated when new KB tools are added to an agent's repertoire. Pattern: add the new tool to `kb_tools` list with appropriate description. |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0160 seed]** Inspecting the actual agent files before writing ACs reveals critical drift between the index description and the current agent state. (category: edge-cases)
  - *Applies because*: The KBAR-0200 index entry says "Update knowledge-context-loader to use artifact_search for pattern discovery." Inspecting `knowledge-context-loader.agent.md` reveals it currently uses `kb_search` (not `artifact_search`) for lessons, and reads `ADR-LOG.md` from the filesystem for ADRs. The migration is additive: `artifact_search` is a new query phase for pattern discovery, not a replacement for the existing `kb_search` lesson queries. Dev Feasibility must confirm the exact delta before writing ACs.

- **[KBAR-0190 seed]** The TypeScript implementation and the agent markdown may both need updating when an agent's KB tool usage changes. (category: constraint)
  - *Applies because*: The `knowledge-context-loader` has a dual nature: the agent markdown file (`.claude/agents/knowledge-context-loader.agent.md`) and the programmatic TypeScript implementation (`load-knowledge-context.ts`) that powers it in LangGraph workflows. If `artifact_search` is added to the agent markdown but not to the TypeScript node, the programmatic path will not perform pattern discovery. Dev Feasibility must determine whether the TypeScript node is in scope.

- **[KBAR-0080]** Story index entries can use shorthand that implies more than the minimal required change. (category: edge-cases)
  - *Applies because*: The index says "Enable semantic search for relevant past solutions and patterns." This could mean (A) add `artifact_search` queries to the agent markdown only, (B) add `artifact_search` to both the agent markdown and the TypeScript node, or (C) restructure the `KnowledgeContext` output schema to include a new `patternDiscovery` section. The scope boundaries must be established in Dev Feasibility before ACs are finalized.

- **[WKFL retro]** KB and Task tools frequently unavailable — graceful fallback is essential. (category: workflow)
  - *Applies because*: The existing `load-knowledge-context.ts` already implements graceful fallback: if `kbDeps` are not provided, it uses `getDefaultLessonsLearned()` silently; if KB returns no results, it falls back to defaults with a warning. Any `artifact_search` integration must follow the same pattern: if `artifact_search` fails or returns no results, the knowledge context is still returned (with a warning), not blocked.

- **[KBAR-0130 risk]** Search query construction is critical for relevance — poor query strings produce irrelevant results. (category: pattern)
  - *Applies because*: The story index risk note explicitly flags "Search query construction critical for relevance." The `artifact_search` queries must be domain-scoped: using `{ query: "{story_domain} implementation patterns solutions", artifact_type: "evidence" }` is far more useful than a generic `{ query: "patterns" }`. The agent instructions must specify the exact query construction strategy with examples.

### Blockers to Avoid (from past stories)

- Do not start KBAR-0200 implementation until KBAR-0130 (`artifact_search` tool) has passed QA — the tool being called must be stable and in UAT or completed state
- Do not start KBAR-0200 implementation until KBAR-0190 (QA & fix agents) is complete — that is the declared dependency in the index
- Do not replace the existing `kb_search` lesson-learned queries with `artifact_search` — they query different data (`knowledgeEntries` lesson entries vs. indexed artifact content). Both query paths must coexist.
- Do not assume `artifact_search` and `kb_search` return the same result shape — `artifact_search` returns artifact content indexed via `kb_add` (entries tagged with `'artifact'`), while `kb_search` with `tags: ["lesson-learned"]` returns lesson entries
- Do not forget the TypeScript implementation — if only the agent markdown is updated, LangGraph orchestrator workflows will not benefit from `artifact_search`
- Do not use TypeScript interfaces for any schema extension — Zod schemas required per CLAUDE.md

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration or UAT validation of the updated knowledge-context-loader TypeScript node must use real KB services. Unit tests must mock `artifactSearchFn` via dependency injection (consistent with existing `kbSearchFn` pattern). |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI impact. `frontend_impacted: false`. If TypeScript node is updated, unit tests covering the `artifact_search` path must be added to `knowledge-context.test.ts`. |

### Patterns to Follow

- `artifact_search` queries should be domain-scoped: `{ query: "{story_domain} {story_scope} implementation patterns", artifact_type: "evidence" }` and `{ query: "{story_domain} past solutions checkpoint", artifact_type: "checkpoint" }` — not generic queries
- The `artifact_search` query phase is additive: it runs after or alongside the existing lesson queries (Phase 1 and Phase 2 in the current agent). It should be documented as a new Phase 1.5 or Phase 3.5 "Pattern Discovery" step.
- Graceful fallback is non-negotiable: if `artifact_search` fails or returns empty results, the knowledge-context-loader must continue and return the context without the pattern results (with a warning in the `warnings` array)
- If the TypeScript node is updated, follow the existing DI pattern: add an optional `artifactSearchFn` parameter to `KnowledgeContextConfigSchema` (using Zod, not a TypeScript interface), defaulting to `undefined` so existing callers without `artifact_search` support continue to work unchanged
- Agent frontmatter `kb_tools` must be updated to list `artifact_search` alongside the existing `kb_search` and `kb_write_artifact`

### Patterns to Avoid

- Do not restructure the existing `kb_search` lesson-learned query phases — only add the new `artifact_search` phase
- Do not make `artifact_search` blocking — the tool may be unavailable or return no results; the knowledge-context-loader must degrade gracefully
- Do not introduce TypeScript interfaces in any code changes — use Zod schemas with `z.infer<>` per CLAUDE.md
- Do not perform domain-agnostic `artifact_search` queries (e.g., `{ query: "patterns" }`) — queries must incorporate `story_domain` and `story_scope` to retrieve relevant patterns

---

## Conflict Analysis

### Conflict: KBAR-0130 (artifact_search) Is Currently in failed-qa State (warning)

- **Severity**: warning (non-blocking for seed generation, but blocking for implementation)
- **Description**: KBAR-0200 requires a stable, tested `artifact_search` tool. KBAR-0130 is currently `failed-qa`. The tool handler exists in the codebase (`handleArtifactSearch` is registered in `tool-handlers.ts`) and the schema is defined (`ArtifactSearchInputSchema`), but the QA failure means the tool may have known defects. KBAR-0200 must wait until KBAR-0130 is at minimum in UAT (preferably completed) before implementation begins.
- **Resolution Hint**: Treat KBAR-0130 re-QA as an unblocking gate. At elaboration time, confirm KBAR-0130 is in UAT or completed status. If KBAR-0130 is still in failed-qa, escalate to block KBAR-0200 elaboration.

### Conflict: TypeScript Node Scope Is Undefined — Agent Markdown vs. Full Implementation (warning)

- **Severity**: warning (non-blocking)
- **Description**: The story index entry says "Update knowledge-context-loader to use artifact_search for pattern discovery." The knowledge-context-loader has two representations: (1) the agent markdown file at `.claude/agents/knowledge-context-loader.agent.md`, and (2) the TypeScript LangGraph node at `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts`. If only the markdown is updated, programmatic orchestrator workflows (which invoke the TypeScript node directly) do not benefit from `artifact_search`. If the TypeScript node is also updated, this becomes a code change requiring Zod schema extension, tests, and type-checking — significantly larger scope than a markdown-only change.
- **Resolution Hint**: Dev Feasibility must define the boundary: (A) markdown-only update (documents the new `artifact_search` phase, for agent-mode invocations of the loader), (B) both markdown and TypeScript (fully integrated), or (C) TypeScript-only update (programmatic path only, agent markdown documents the new capability). **Option B (both) is recommended** for full consistency, but Dev Feasibility must confirm the TypeScript node is actively used in production orchestrator workflows before committing to the full scope.

---

## Story Seed

### Title

Update `knowledge-context-loader` to Use `artifact_search` for Semantic Pattern Discovery

### Description

**Context**: The KBAR epic's Phase 4 delivered the `artifact_search` MCP tool (KBAR-0130) — semantic search over artifacts indexed in the Knowledge Base. Phase 5 migrates all workflow agents to use the new artifact tools. This story (KBAR-0200) is the final Phase 5 migration: updating the `knowledge-context-loader` to leverage `artifact_search` for discovering relevant past solutions and patterns before story creation, elaboration, or implementation begins.

The `knowledge-context-loader` (v2.1.0) currently loads context through two mechanisms:
1. `kb_search` with `tags: ["lesson-learned"]` — retrieves lesson entries about past failures, blockers, and patterns
2. Filesystem read of `ADR-LOG.md` — retrieves active Architecture Decision Records

These mechanisms are effective for lesson-level and policy-level knowledge, but do not surface the actual implementation artifacts from past stories (CHECKPOINT, PLAN, EVIDENCE, REVIEW, etc.). An agent working on a new story about MCP tool handlers would benefit from finding the EVIDENCE and PLAN artifacts from KBAR-0110 or KBAR-0130 — concrete implementations that demonstrate the patterns to follow.

**Problem**: The knowledge-context-loader cannot currently surface past implementation artifacts by semantic similarity. It relies solely on lessons (KB `lesson-learned` entries written by authors who explicitly chose to capture them) and hardcoded ADRs. If no lesson was written for a particular pattern, it goes undiscovered.

**Proposed solution**: Add a new "Pattern Discovery" query phase to the knowledge-context-loader that uses `artifact_search` with domain-scoped natural language queries to find relevant artifacts from past stories. The queries should target `evidence` and `plan` artifact types (which contain the richest implementation context) with `story_domain` and `story_scope` in the query string. Results are surfaced alongside lessons in the knowledge context output. Fallback behavior is preserved: if `artifact_search` is unavailable or returns no results, the loader continues with lessons-only context and a warning.

The change spans two files: (1) the agent markdown file (documenting the new query phase for agent-mode invocations), and (2) potentially the TypeScript LangGraph node (extending `KnowledgeContextConfigSchema` with an optional `artifactSearchFn` parameter so programmatic orchestrator workflows also benefit).

### Initial Acceptance Criteria

- [ ] AC-1: `knowledge-context-loader.agent.md` documents a new "Pattern Discovery" query phase that uses `artifact_search` with domain-scoped queries. At minimum two query examples are specified: one targeting `artifact_type: "evidence"` (past implementations) and one targeting `artifact_type: "plan"` (past planning artifacts).
- [ ] AC-2: The `artifact_search` queries in the agent use `story_domain` and `story_scope` as query terms: e.g., `{ query: "{story_domain} {story_scope} implementation", artifact_type: "evidence", limit: 5 }`. Generic queries without domain context are explicitly prohibited in the agent instructions.
- [ ] AC-3: The agent documents graceful fallback: if `artifact_search` returns no results or the tool is unavailable, the knowledge-context-loader continues with lessons-only context. The pattern discovery section of the output is populated with `[]` and a warning is added to `warnings`.
- [ ] AC-4: `knowledge-context-loader.agent.md` frontmatter `kb_tools` section is updated to include `artifact_search` alongside the existing `kb_search` and `kb_write_artifact`.
- [ ] AC-5: The existing `kb_search` lesson-learned query phases (Phase 1 in the current agent) are unchanged — they remain as-is. The `artifact_search` phase is additive (new Phase 1.5 or Phase 3.5), not a replacement.
- [ ] AC-6 (scope-dependent): If the TypeScript node is in scope — `KnowledgeContextConfigSchema` in `load-knowledge-context.ts` is extended (as a Zod schema addition, not a TypeScript interface) with an optional `artifactSearchFn` field. Existing callers that do not pass `artifactSearchFn` continue to work unchanged (field is optional with `z.undefined()` default).
- [ ] AC-7 (scope-dependent): If the TypeScript node is in scope — `loadKnowledgeContext()` calls `artifactSearchFn` when provided, using the same graceful fallback pattern as `getLessonsFromKB()`. If `artifactSearchFn` is not provided or throws, the function logs a warning and continues.
- [ ] AC-8 (scope-dependent): If the TypeScript node is in scope — unit tests in `knowledge-context.test.ts` cover the `artifact_search` integration path: (a) `artifactSearchFn` provided and returns results → results included in output, (b) `artifactSearchFn` provided but returns empty → warning added, results `[]`, (c) `artifactSearchFn` not provided → no-op, existing behavior unchanged.
- [ ] AC-9: The knowledge context output (both agent YAML and TypeScript schema) documents what `artifact_search` results represent and how they differ from `lessons_learned` entries (lessons are authored summaries; artifact results are actual implementation content).

### Non-Goals

- Replacing the existing `kb_search` lesson-learned queries — they remain and continue to run as-is
- Updating the `ADR-LOG.md` filesystem read logic — ADR loading is unchanged
- Migrating other agents in the KBAR epic — KBAR-0190 covers QA/fix agents, KBAR-0170 covers execute/worker agents, KBAR-0180 covers code review agents
- Implementing the `artifact_search` tool — that is KBAR-0130 (Phase 4)
- Implementing `artifact_write` — that is KBAR-0110 (Phase 4)
- Changing the content structure of the `KnowledgeContext` output schema in ways that break existing consumers (dev-execute-leader, dev-proof-leader, qa-verify-verification-leader)
- Updating orchestrator commands — that is KBAR-0210 (next story in Phase 5)
- Adding E2E test coverage for the knowledge-context-loader — behavior validated via full workflow runs, not isolated E2E tests

### Reuse Plan

- **Pattern**: Mirror the existing `getLessonsFromKB()` DI pattern for any TypeScript integration — pass `artifactSearchFn` as an optional parameter to `loadKnowledgeContext()`, not imported directly
- **Schema extension**: Use `KnowledgeContextConfigSchema.extend({ artifactSearchFn: z.function()... .optional() })` pattern (Zod, not TypeScript interface)
- **Query construction**: Use `"{story_domain} {story_scope} implementation"` as the query template, targeting `artifact_type: "evidence"` — mirrors how `getLessonsFromKB()` uses domain in its query strings
- **Fallback**: Use the same try/catch + warning pattern from `getLessonsFromKB()` (lines 483–491 in `load-knowledge-context.ts`) — on failure, return empty results and push to `warnings` array
- **Frontmatter template**: Use KBAR-0160's and KBAR-0190's seed `kb_tools` frontmatter update pattern

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story modifies the agent markdown file (documentation) and potentially the TypeScript orchestrator node (code). Validation strategy differs by scope:

**Agent markdown (always in scope)**:
- Manual review: compare the new "Pattern Discovery" phase against ACs — verify query construction uses domain variables, fallback is documented, `kb_tools` frontmatter is updated
- Functional validation: run a test story through `pm-story-seed-agent` (which spawns `knowledge-context-loader`) after changes land — verify `artifact_search` queries appear in agent logs, and that results (if any) appear in the knowledge context output YAML

**TypeScript node (if in scope)**:
- Unit tests in `knowledge-context.test.ts` must cover the three paths for `artifactSearchFn`: (a) provided + results, (b) provided + empty, (c) not provided
- Type-check via `pnpm check-types` on `packages/backend/orchestrator`
- Coverage gate: existing 45% global coverage must not regress

### For UI/UX Advisor

Not applicable — this story is agent markdown and TypeScript orchestrator changes with no UI impact. `frontend_impacted: false`.

### For Dev Feasibility

- **Dependency gate is real**: KBAR-0130 must be in UAT or completed before KBAR-0200 can be implemented. KBAR-0190 must also be complete. Verify both statuses at elaboration time.
- **Scope decision (critical)**: Determine whether the TypeScript LangGraph node (`load-knowledge-context.ts`) is actively used in production orchestrator workflows. If the orchestrator's LangGraph pipeline is used in production runs (not just as a code skeleton), the TypeScript node must be updated alongside the agent markdown (Option B). If the agent runs in pure agent-mode (Claude reads the markdown and executes the steps itself), then the markdown-only update (Option A) is sufficient. Read `packages/backend/orchestrator/src/` to determine production usage.
- **Query construction verification**: At implementation time, test `artifact_search` queries with the real KB to confirm results are relevant. If the KB has not yet indexed many artifacts (because `artifact_write` is new), document this in the implementation and suggest a future re-evaluation once KB population grows.
- **Zod schema extension**: If TypeScript node is in scope, extend `KnowledgeContextConfigSchema` with `artifactSearchFn: z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.unknown())).optional()` — following the exact same pattern as `kbSearchFn` on line 133 of `load-knowledge-context.ts`.
- **Output schema**: Determine whether the `KnowledgeContext` Zod schema (at `packages/backend/orchestrator/src/artifacts/knowledge-context.ts`) needs a new `patternDiscovery` field to surface `artifact_search` results, or whether results are folded into `lessonsLearned`. Folding is simpler; a new field is more structured. Document the decision in the implementation notes.
- **Subtask decomposition**:
  - ST-1: Read KBAR-0130 final implementation (confirm `artifact_search` input schema and response shape), KBAR-0190 final implementation (confirm migration template), and current `load-knowledge-context.ts` (understand full TypeScript node structure)
  - ST-2: Determine Option A vs. B scope: read orchestrator graph wiring in `packages/backend/orchestrator/src/` to confirm whether the TypeScript LangGraph node runs in production
  - ST-3: Update `knowledge-context-loader.agent.md` — add Pattern Discovery phase, update `kb_tools` frontmatter, document query construction, document graceful fallback (AC-1 through AC-5, AC-9)
  - ST-4 (if TypeScript in scope): Update `load-knowledge-context.ts` — extend `KnowledgeContextConfigSchema`, add `artifactSearchFn` call logic with fallback, extend output schema if needed (AC-6, AC-7)
  - ST-5 (if TypeScript in scope): Update `knowledge-context.test.ts` — add unit tests for the three `artifactSearchFn` paths (AC-8)
  - ST-6: Human review of all diffs against ACs; functional test via a canary story run with knowledge-context-loader
  - Canonical references for subtask decomposition:
    - `.claude/agents/knowledge-context-loader.agent.md` (current agent markdown — Phase 1 lesson query structure to replicate in Pattern Discovery phase)
    - `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` (lines 378–492: `getLessonsFromKB()` DI pattern and fallback; lines 122–136: `KnowledgeContextConfigSchema`)
    - `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (lines 213–234: `ArtifactSearchInputSchema`)
    - `plans/future/platform/kb-artifact-migration/elaboration/KBAR-0190/_pm/STORY-SEED.md` (migration template pattern)
