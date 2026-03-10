---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4100

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4060 (graph-checker agent), WINT-4070 (cohesion-prosecutor), and all Phase 4 feature-cohesion infrastructure; actual deferred item sources now exist in agent files and KB entries tagged "deferred"

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| KB deferred lesson pattern | `.claude/agents/_shared/decision-handling.md` | Documents how agents log deferred/moonshot items to KB with tags ["deferred", "moonshot", "{domain}"] — primary data source for backlog-curator |
| scope-defender agent | `.claude/agents/scope-defender.agent.md` | Produces `scope-challenges.json` with `recommendation: defer-to-backlog` entries — direct deferral source for curator to process |
| DEFERRED-KB-WRITES.yaml pattern | `plans/future/platform/wint/UAT/WINT-2020/DEFERRED-KB-WRITES.yaml` | Pattern for capturing deferred KB writes when MCP tools not callable — curator may need to process these too |
| graph-checker agent (WINT-4060) | `.claude/agents/graph-checker.agent.md` (to be created) | Identifies violations but explicitly does NOT create backlog entries — that is the curator's responsibility per WINT-4060 non-goals |
| cohesion-prosecutor agent (WINT-4070) | `.claude/agents/cohesion-prosecutor.agent.md` (to be created) | Produces INCOMPLETE-BLOCKED verdicts — curator should surface these for PM review |
| kb_search / kb_add | Knowledge Base MCP tools | Primary persistence layer for deferred items and lessons; curator reads/writes via these tools |
| stories index | `plans/future/platform/wint/stories.index.md` | Secondary reference; KB is source of truth per MEMORY.md |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-4060 | elaborating | Creates graph-checker agent — its deferral outputs are what the curator processes; file authoring is in progress |
| WINT-4070 | backlog | Creates cohesion-prosecutor — another deferral source; blocked on WINT-4060 |
| WINT-4040 | in multiple states (failed-code-review iteration) | Capability inference provides graph data; curator operates on agent output, not raw capability data |
| WINT-4030 | failed-qa | Graph feature registry; not a direct input to curator — risk is low |

### Constraints to Respect

- This is a docs-only / agent-prompt-only story: new agent `.md` file only, no TypeScript code
- KB is the source of truth for story state (MEMORY.md): curator must read from and write to KB, not just filesystem
- Protected: all production DB schemas in `packages/backend/database-schema/`, `@repo/db` client, orchestrator artifact schemas
- scope-defender hard cap of 5 is a peer pattern — curator should have bounded PM review batches to avoid overwhelming reviewers
- Deferred items tagged with `["deferred", "moonshot", "{domain}"]` per `decision-handling.md` — curator must query these tags

---

## Retrieved Context

### Related Endpoints

None — this story creates an agent file, not an API endpoint.

### Related Components

None — no UI components involved.

### Reuse Candidates

| Candidate | Location | How |
|-----------|----------|-----|
| scope-defender agent structure | `.claude/agents/scope-defender.agent.md` | Template for Phase 4 haiku worker agent: frontmatter, role/mission/inputs, phased execution, output schema, completion signals, non-negotiables, LangGraph porting notes |
| decision-handling.md deferred pattern | `.claude/agents/_shared/decision-handling.md` | Shows the exact KB search query to find deferred items: `kb_search({ query: "deferred moonshot", tags: ["deferred"], limit: 10 })` — curator uses this pattern |
| kb_search + kb_add tools | Knowledge Base MCP tools | Primary read (find deferred items) and write (create curated backlog entries or PM review tasks) operations |
| gap-hygiene-agent output format | `.claude/agents/gap-hygiene-agent.agent.md` | `future` gap category contains deferred items; hygiene agent's `defer_to_future` recommendations are a curator input source |
| DEFERRED-KB-WRITES.yaml pattern | Multiple story directories | Captures items deferred due to MCP tool unavailability — curator should detect and process these pending writes |

---

## Canonical References

canonical_references: []
canonical_refs_note: 'Non-code story (agent-prompt-only) — no implementation pattern refs applicable. The agent .md file itself is the deliverable. The scope-defender agent (`.claude/agents/scope-defender.agent.md`) is the structural reference for agent file format. The decision-handling.md deferred query pattern is the runtime behavioral reference.'

---

## Knowledge Context

### Lessons Learned

KB query unavailable. Lessons inferred from sibling Phase 4 stories (WINT-4060, WINT-4070) and existing agent patterns:

- **[WINT-4060 non-goals]** graph-checker explicitly does NOT create stories or backlog entries — that responsibility belongs to backlog-curator and cohesion-prosecutor; the curator must not assume any upstream agent has pre-created backlog entries (pattern: role separation)
  - *Applies because*: Curator must be the sole authoritative writer of backlog entries from deferred items, not duplicate what other agents might have done
- **[scope-defender]** DA deferral notes are machine-readable (`deferral_note` field) but are not surfaced to PMs automatically — a curation step is needed to batch-present them for human decision (pattern: PM review gate)
  - *Applies because*: Curator's PM surfacing goal requires translating machine-readable deferral notes into reviewable PM batches
- **[decision-handling.md]** Deferred/moonshot items are already written to KB with tags ["deferred", "moonshot"] during normal workflow — curator does not need to re-read raw scope-challenges.json files; KB search is the canonical lookup (pattern: KB-first)
  - *Applies because*: Reduces I/O scope — curator queries KB, not raw filesystem artifacts
- **[WINT-2020 DEFERRED-KB-WRITES.yaml]** KB MCP tools are sometimes unavailable during pipeline execution, resulting in pending write files — curator must handle both KB entries and pending DEFERRED-KB-WRITES.yaml files as input sources (pattern: resilience)
  - *Applies because*: Curator may encounter unprocessed deferred writes that never reached KB

### Blockers to Avoid (from past stories)

- Producing a PM review report against empty data (KB deferred item query may return zero results if upstream agents haven't run)
- Treating all deferred items as equal priority — curator must rank or categorize before surfacing to PM
- Writing duplicate backlog entries (scope-defender may have logged an item; graph-checker may flag the same feature — deduplication required)
- Unclear completion signals — must emit exactly one of COMPLETE / COMPLETE WITH WARNINGS / BLOCKED

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services — not directly applicable (agent-only story) |
| ADR-006 | E2E Tests in Dev Phase | Not applicable: frontend_impacted=false, agent-only story |

Only ADR-005 and ADR-006 are potentially relevant; both are inapplicable since this story creates no API, DB, or frontend code.

### Patterns to Follow

- Agent `.md` file structure from scope-defender: YAML frontmatter, role, mission, inputs (required/optional), execution phases, output schema, completion signals, non-negotiables, LangGraph porting notes
- KB-first reads: query KB via `kb_search` before falling back to filesystem artifact scanning
- Bounded PM review batches: hard cap on items surfaced per run to avoid review fatigue (parallel to scope-defender's 5-challenge cap)
- Graceful degradation: if no deferred items found, emit COMPLETE with zero-item summary rather than blocking
- Machine-readable output + human-readable PM summary (scope-defender precedent)
- Deduplicate across sources before surfacing (gap-hygiene-agent precedent)
- DEFERRED-KB-WRITES.yaml resilience: detect and process pending writes alongside KB entries

### Patterns to Avoid

- Reading raw `scope-challenges.json` files directly from story directories — KB is the canonical source for deferred items
- Uncapped output lists (PM review overwhelm)
- Auto-creating backlog stories without PM confirmation — curator surfaces for review, does not auto-commit
- Assuming KB is always available — must degrade gracefully if MCP tools are down
- Blocking on missing upstream agents (WINT-4060/WINT-4070 may not have run yet)

---

## Conflict Analysis

### Conflict: Dependency on WINT-4060 (graph-checker agent not yet implemented)
- **Severity**: warning
- **Description**: WINT-4100 depends on WINT-4060, which is currently in elaboration and not yet implemented. The graph-checker is one deferral source for the curator. However, the curator's primary input source is KB entries tagged "deferred" — which exist independently of WINT-4060. The agent file can be authored now; its runtime behavior degrades gracefully when WINT-4060 has not run.
- **Resolution Hint**: Include graceful degradation in Phase 1: if `scope-challenges.json` files are absent (WINT-4060 not run), rely solely on KB search for deferred items. Document WINT-4060 as an execution prerequisite, not a file-creation prerequisite.

### Conflict: Ambiguity in "deferred items" scope
- **Severity**: warning
- **Description**: "Deferred items" exist in multiple places: KB entries tagged ["deferred"], scope-challenges.json `defer-to-backlog` recommendations, gap-hygiene `future` category items, DEFERRED-KB-WRITES.yaml pending writes, and cohesion-prosecutor INCOMPLETE-BLOCKED verdicts. Without a bounded definition, the curator could become overwhelmingly broad in scope.
- **Resolution Hint**: Scope the curator to two primary sources for v1: (1) KB entries tagged ["deferred"] or ["moonshot"], (2) scope-challenges.json files with `recommendation: defer-to-backlog`. Gap-hygiene `future` items and prosecution verdicts can be deferred to a later backlog-curator iteration. Define this in the agent's non-goals.

---

## Story Seed

### Title
Create backlog-curator Agent — Deferred Item Collector and PM Review Surfacer

### Description

**Context**: The WINT Phase 4 elaboration pipeline generates deferred items through multiple pathways: scope-defender agent logs `defer-to-backlog` recommendations in `scope-challenges.json`, agents following the decision-handling protocol write deferred/moonshot items to KB with tags `["deferred", "moonshot"]`, and graph-checker (WINT-4060) detects violations it explicitly does not act on. These items accumulate but have no automated collection or PM review step. PMs must manually scan agent outputs to find work that was intentionally deferred — an error-prone and time-consuming process.

**Problem**: Deferred work is silently lost between pipeline runs. No agent is responsible for: collecting deferred items across sources, deduplicating them, ranking them by recency or impact, and presenting them to the PM in a structured format for backlog grooming decisions.

**Proposed solution**: Create a haiku-powered `backlog-curator` worker agent (new file: `.claude/agents/backlog-curator.agent.md`) that:
1. Queries KB for entries tagged `["deferred"]` or `["moonshot"]`
2. Scans for `scope-challenges.json` files with `recommendation: defer-to-backlog` (optional, degrades gracefully)
3. Detects unprocessed `DEFERRED-KB-WRITES.yaml` files (optional input)
4. Deduplicates items across sources
5. Ranks by recency and risk signal (from deferral metadata)
6. Emits a bounded PM review batch (`pm-review-batch.json`) capped at a configurable limit (default 10 items)
7. Writes a human-readable `PM-REVIEW-REPORT.md` summarizing items awaiting backlog decisions

The agent acts as a periodic maintenance worker — it can be run by a PM or scrum master on demand to surface deferred work that has piled up. It does NOT auto-create stories; it surfaces candidates for PM decision.

### Initial Acceptance Criteria

- [ ] AC-1: Agent file exists at `.claude/agents/backlog-curator.agent.md` with valid YAML frontmatter (`created`, `updated`, `version`, `type: worker`, `model: haiku`, `name: backlog-curator`, `spawned_by`)
- [ ] AC-2: Agent defines required inputs: `scope` (optional — story ID, epic, or "all"), `output_dir`, with optional `scope_challenges_dir` (path to scan for `scope-challenges.json` files) and `deferred_writes_dir` (path to scan for DEFERRED-KB-WRITES.yaml files)
- [ ] AC-3: Agent defines a 4-phase execution workflow: (1) Load Deferred Items (KB search + optional filesystem scan), (2) Deduplicate and Rank, (3) Generate PM Review Batch, (4) Produce Output
- [ ] AC-4: Agent queries KB via `kb_search({ query: "deferred moonshot", tags: ["deferred"], limit: 50 })` in Phase 1 as the primary data source
- [ ] AC-5: Agent handles graceful degradation for: KB unavailable (fallback to filesystem scan), no deferred items found (emit zero-item summary), scope-challenges files absent (skip filesystem scan, continue with KB results only)
- [ ] AC-6: Agent deduplicates items across sources — if the same deferral note appears in KB and in a `scope-challenges.json`, keep only one entry in the PM review batch
- [ ] AC-7: Agent caps PM review batch at a configurable limit (default 10 items) with `truncated: true` if more qualify, sorted by recency descending
- [ ] AC-8: Agent writes `pm-review-batch.json` to `{output_dir}/pm-review-batch.json` with machine-readable schema: `{ generated_at, total_items_found, items_in_batch, truncated, items: [{ id, source, story_id, description, deferral_reason, deferred_at, risk_signal, recommended_action }] }`
- [ ] AC-9: Agent writes `PM-REVIEW-REPORT.md` to `{output_dir}/PM-REVIEW-REPORT.md` with human-readable summary: section per item with description, deferral reason, recommended action (promote-to-story / close / defer-again)
- [ ] AC-10: Agent includes a non-goals section explicitly stating: does not auto-create stories, does not modify KB entries, does not write to the stories index, does not run scope-defender or graph-checker
- [ ] AC-11: Agent includes LangGraph porting notes documenting the input contract, 4-phase execution contract, and output contract (`pm-review-batch.json`) for future node implementation at `nodes/backlog/backlog-curate.ts`
- [ ] AC-12: Agent emits exactly one completion signal: `BACKLOG-CURATOR COMPLETE`, `BACKLOG-CURATOR COMPLETE WITH WARNINGS: {N} warnings`, or `BACKLOG-CURATOR BLOCKED: {reason}`

### Non-Goals

- Do NOT write TypeScript code — this is an agent `.md` file only
- Do NOT auto-create backlog stories or KB entries without PM confirmation
- Do NOT process gap-hygiene `future` items (v1 scope: KB deferred tags + scope-challenges only)
- Do NOT process cohesion-prosecutor INCOMPLETE-BLOCKED verdicts (deferred to a later iteration)
- Do NOT modify the stories index or any KB entry status
- Do NOT port the agent to a LangGraph node in this story (documented in porting notes, implemented in a future phase)
- Do NOT create a frontend component, API endpoint, or DB migration
- Do NOT block on missing WINT-4060 or WINT-4070 data — graceful degradation required

### Reuse Plan

- **Agent structure**: `.claude/agents/scope-defender.agent.md` — frontmatter template, 4-phase workflow, required/optional inputs table, completion signals, non-negotiables, LangGraph porting notes
- **KB query pattern**: `.claude/agents/_shared/decision-handling.md` — `kb_search({ query: "deferred moonshot", tags: ["deferred"], limit: 10 })` as runtime behavioral reference
- **Deduplication pattern**: `.claude/agents/gap-hygiene-agent.agent.md` — merge strategy: keep highest-priority canonical, mark others as merged
- **Output schema shape**: scope-defender's `scope-challenges.json` — similar bounded array with metadata, source attribution, and recommended_action
- **Packages**: None (agent file only, no npm packages)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is an agent-prompt-only story — no unit tests, no Vitest coverage, no Playwright E2E required
- Test plan should define manual verification checklist: load agent file, verify YAML frontmatter keys (AC-1), verify inputs section present (AC-2), verify 4-phase workflow (AC-3), verify KB query documented (AC-4), verify graceful degradation section (AC-5), verify deduplication documented (AC-6), verify cap/truncation (AC-7), verify pm-review-batch.json schema (AC-8), verify PM-REVIEW-REPORT.md spec (AC-9), verify non-goals (AC-10), verify LangGraph notes (AC-11), count completion signals = 3 (AC-12)
- Key test scenarios (structural only): (1) agent file exists and YAML parses cleanly; (2) grep for `BACKLOG-CURATOR` yields exactly 3 signal strings; (3) grep for `pm-review-batch.json` confirms output schema definition is present
- ADR-005 and ADR-006 are not applicable (no backend, no frontend)

### For UI/UX Advisor

- Not applicable — agent files have no UI surface
- The `PM-REVIEW-REPORT.md` output is the closest thing to a UX surface: it should be structured for a PM reading raw markdown, with clear item headers, deferral context, and unambiguous `recommended_action` values (promote-to-story / close / defer-again)
- Items in the report should be scannable — each item should fit in ~5 lines so a PM can review 10 items in under 2 minutes

### For Dev Feasibility

- This is a docs-only story — implementation effort is agent `.md` authoring, not code
- Canonical structural reference: `.claude/agents/scope-defender.agent.md` (most relevant Phase 4 haiku worker template)
- Runtime behavioral reference: `.claude/agents/_shared/decision-handling.md` (KB deferred query pattern)
- Key design decisions to document in agent:
  1. KB-first vs filesystem-first: KB is primary (MEMORY.md constraint); filesystem scan is optional fallback
  2. Cap strategy: default 10 items, configurable via input parameter; truncated flag in output
  3. Deduplication key: use (story_id + deferral description hash) as identity — if same story logged same deferral in both KB and scope-challenges.json, merge to single item
  4. `DEFERRED-KB-WRITES.yaml` processing: scan for files with `pending_writes` entries — these represent items that never reached KB and may be unknown to the curator's primary KB search
- Output file locations: `pm-review-batch.json` and `PM-REVIEW-REPORT.md` written to `{output_dir}` (caller-specified, defaults to story directory or cwd)
- Estimated tokens: 3,500–4,500 (single agent .md file, medium complexity — comparable to scope-defender at ~4,000)
