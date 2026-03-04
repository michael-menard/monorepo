---
generated: "2026-03-03"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-2110

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates cache population stories (WINT-2030, 2040, 2050, 2060). Pack type enumeration in mcp-tools Zod schema may not include all pack types added by WINT-2040 (agent_missions). Cache infrastructure was in place by baseline but populated data is in-progress.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| contextPacks table | packages/backend/database-schema (wint schema) | Deployed (WINT-0010) |
| context_cache_get / context_cache_put / context_cache_invalidate / context_cache_stats MCP tools | packages/backend/mcp-tools/src/context-cache/ | UAT-verified (WINT-0100) |
| pm-bootstrap-workflow agents (setup/analysis/generation leaders) | .claude/agents/pm-bootstrap-*.agent.md | Active |
| dev-implement agents (backend-coder, frontend-coder, implementation-leader, planner, etc.) | .claude/agents/dev-implement-*.agent.md | Active |
| elab-setup-leader + elab-analyst agents | .claude/agents/elab-*.agent.md | Active |
| qa-verify agents (setup/verification/completion leaders) | .claude/agents/qa-verify-*.agent.md | Active |
| dev-fix-fix-leader agent | .claude/agents/dev-fix-fix-leader.agent.md | Active |
| KB search + lesson patterns in all 5 workflows | Per-agent kb_search() calls | Active but not cache-integrated |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-2030 (Populate Project Context Cache) | needs-code-review | Produces codebase/project-conventions pack that WINT-2110 agents will query |
| WINT-2040 (Populate Agent Mission Cache) | failed-code-review | Produces agent_missions pack type; adds packTypeValues enum gap in mcp-tools |
| WINT-2050 (Populate Domain Knowledge Cache) | needs-code-review | Produces architecture, lessons_learned, blockers-known packs |
| WINT-2060 (Populate Library Cache) | needs-code-review | Produces lib-react19, lib-tailwind, lib-zod, lib-vitest packs |

### Constraints to Respect

- DO NOT MODIFY wint.contextPacks table schema (protected, WINT-0010)
- MUST use Zod-first types (no TypeScript interfaces per CLAUDE.md)
- MUST use @repo/logger (never console.log per CLAUDE.md)
- NO barrel files (import directly from source per CLAUDE.md)
- DO NOT modify the context_cache MCP tool implementations — use them as consumers only
- Agent .agent.md files are the implementation surface; they are markdown docs, not TypeScript
- Must measure baseline token usage BEFORE modifying agents so WINT-2120 can benchmark

---

## Retrieved Context

### Related Endpoints

None — this story operates on agent instruction files and integrates MCP tool calls. No HTTP endpoints are added or modified.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| pm-bootstrap-setup-leader | .claude/agents/pm-bootstrap-setup-leader.agent.md | Haiku leader, validates plan and produces setup context |
| pm-bootstrap-analysis-leader | .claude/agents/pm-bootstrap-analysis-leader.agent.md | Sonnet leader, extracts structured story data |
| pm-bootstrap-generation-leader | .claude/agents/pm-bootstrap-generation-leader.agent.md | Sonnet leader, generates story files |
| dev-implement-backend-coder | .claude/agents/dev-implement-backend-coder.agent.md | Sonnet worker, writes backend code |
| dev-implement-frontend-coder | .claude/agents/dev-implement-frontend-coder.agent.md | Sonnet worker, writes frontend code |
| dev-implement-implementation-leader | .claude/agents/dev-implement-implementation-leader.agent.md | Orchestrates backend + frontend coders |
| dev-implement-planner | .claude/agents/dev-implement-planner.agent.md | Plans implementation steps |
| dev-implement-planning-leader | .claude/agents/dev-implement-planning-leader.agent.md | Leads planning phase |
| elab-setup-leader | .claude/agents/elab-setup-leader.agent.md | Haiku leader, moves story to elaboration |
| elab-analyst | .claude/agents/elab-analyst.agent.md | Sonnet worker, audits and discovers gaps |
| qa-verify-setup-leader | .claude/agents/qa-verify-setup-leader.agent.md | Haiku leader, validates QA preconditions |
| qa-verify-verification-leader | .claude/agents/qa-verify-verification-leader.agent.md | Leads QA verification |
| qa-verify-completion-leader | .claude/agents/qa-verify-completion-leader.agent.md | Completes QA phase |
| dev-fix-fix-leader | .claude/agents/dev-fix-fix-leader.agent.md | Sonnet leader, applies fixes using backend/frontend coders |
| context_cache_get | packages/backend/mcp-tools/src/context-cache/context-cache-get.ts | MCP tool, retrieves cached context pack |
| contextPacks | packages/backend/database-schema (wint schema) | Database table backing the cache |

### Reuse Candidates

- `context_cache_get()` from WINT-0100 — the primary integration point; agents call this to retrieve pre-populated context
- Context7 MCP tool integration pattern (already present in dev-implement agents) — analogous integration pattern for adding context cache calls
- KB search integration patterns from existing agent files — shows the before/after pattern structure to replicate for cache
- `.claude/agents/_shared/kb-integration.md` — shared documentation for KB query patterns; analogous document may be needed for cache integration

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool integration in agent | .claude/agents/dev-implement-backend-coder.agent.md | Shows how to document Context7 and KB tool calls with trigger tables and query patterns |
| Agent kb_search integration pattern | .claude/agents/qa-verify-setup-leader.agent.md | Shows the full When-to-Query / Example-Queries / Applying-Results / Fallback structure |
| Context cache tool usage | packages/backend/mcp-tools/src/context-cache/context-cache-get.ts | The actual tool being integrated; shows input schema and return type |
| Cache pack structure | plans/future/platform/wint/needs-code-review/WINT-2060/WINT-2060.md | Shows pack keys (lib-react19, lib-tailwind, lib-zod, lib-vitest) and content structure |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0200]** Agent+TypeScript node pairs must always be updated together (category: architecture)
  - *Applies because*: Some of the 5 target agents may have corresponding LangGraph TypeScript nodes. If they do, both the .agent.md and the .ts node must be updated. Implementer must audit for paired nodes before marking any agent "done".

- **[WINT-1150]** QA should spot-check actual agent files, not just trust PROOF/EVIDENCE (category: testing)
  - *Applies because*: Agent files can evolve post-implementation. QA for WINT-2110 must read the actual .agent.md files to verify cache calls are present, not just trust EVIDENCE.yaml.

- **[WINT-2040 opp-1]** MCP tools packTypeValues array does not include 'agent_missions'. WINT-2110 should sync this array (category: integration)
  - *Applies because*: When dev-implement-backend-coder or other agents query agent_missions pack type after WINT-2040 merges, the Zod validation in context-cache tools will reject the query if packTypeValues is not updated. This must be addressed as part of WINT-2110 or confirmed already resolved.

### Blockers to Avoid (from past stories)

- Do not assume all cache pack types are registered in the mcp-tools Zod validation — verify packTypeValues enum includes all pack types that WINT-2030/2040/2050/2060 produce before agents start querying
- Do not implement cache integration in agents without a graceful fallback — cache miss or tool unavailability must not break agent execution
- Do not modify agent files without reading existing KB integration sections — each agent already has a kb_search pattern; the cache integration should be additive, not a replacement
- Do not update only the .agent.md file if a corresponding LangGraph TypeScript node exists — both must be updated together

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: /api/v2/{domain}, Backend: /{domain} — does not directly apply (no new endpoints), but the 5 agents must not introduce new HTTP patterns |
| ADR-005 | Testing Strategy | UAT must use real services — integration tests for cache retrieval in agents must use real PostgreSQL at port 5432, not mocks |

### Patterns to Follow

- Graceful degradation: cache unavailable → log warning → continue without cache context (same as existing KB search fallback pattern)
- Trigger tables: document "When to Query" with pack type and key as a lookup table inside each agent's Cache Integration section
- Additive integration: add a "Context Cache Integration" section to each agent file without removing the existing KB search section
- Size guard: cached context injected into prompts must respect token budgets — agents should not inject unbounded cache content; specify max size or fields to inject

### Patterns to Avoid

- Do not replace kb_search() calls with cache queries — cache supplements KB, it does not replace it
- Do not hardcode cache content inline in agent prompts — always retrieve at runtime via context_cache_get()
- Do not break agent execution if cache returns null — null is a valid cache miss, not an error

---

## Conflict Analysis

### Conflict: Dependency not yet merged (WINT-2040)

- **Severity**: warning
- **Description**: WINT-2040 (Populate Agent Mission Cache) is in failed-code-review status. The agent_missions pack type it produces is specifically relevant for pm-bootstrap-workflow and dev-implement agents. Additionally, a known KB entry (opp-1 from WINT-2040) flags that the mcp-tools packTypeValues Zod array does not include 'agent_missions', meaning context_cache_get() would reject queries for that pack type until the array is updated.
- **Resolution Hint**: WINT-2110 should list the mcp-tools packTypeValues sync as an explicit AC. If WINT-2040 remains failed at implementation time, implement cache integration for agent_missions conditionally (comment noting the dependency) and ensure the packTypeValues sync is included in WINT-2110 scope regardless.

### Conflict: Token measurement prerequisite

- **Severity**: warning
- **Description**: WINT-2120 (Measure Token Reduction) depends on WINT-2110. To produce meaningful before/after metrics, baseline token usage for the 5 agents should be measured or estimated before WINT-2110 modifies them. There is no explicit story for capturing pre-change baselines.
- **Resolution Hint**: Include a pre-implementation step in WINT-2110 that documents approximate baseline token consumption for each of the 5 agents (even rough estimates). This preserves the ability for WINT-2120 to calculate reduction percentages.

---

## Story Seed

### Title

Update 5 High-Volume Agents to Query Context Cache

### Description

The WINT token-reduction initiative has produced four cache population stories (WINT-2030, 2040, 2050, 2060) that write structured context — project conventions, agent missions, domain knowledge, library patterns — into the `wint.context_packs` table. The `context_cache_get` MCP tool (WINT-0100) provides a validated retrieval interface.

The five highest-invocation agents in the workflow — `pm-bootstrap-workflow` (3 leader agents), `dev-implement-story` (5 worker/leader agents), `elab-story` (setup-leader + analyst), `qa-verify-story` (3 leader agents), and `dev-fix-story` (1 leader) — currently populate their context windows exclusively through filesystem reads and `kb_search()` calls at invocation time. Each invocation re-reads the same source documents and re-queries the same KB patterns.

This story integrates `context_cache_get()` calls into each of the 5 agent workflows so they retrieve pre-distilled context from the cache at startup rather than re-reading source files. The integration is additive: existing `kb_search()` patterns remain; cache provides a fast-path for stable context (project conventions, library patterns, known blockers) with graceful fallback to direct reads when cache misses occur.

The expected result is an initial measurable token reduction per invocation, establishing the foundation for the 80% reduction target measured in WINT-2120.

### Initial Acceptance Criteria

- [ ] AC-1: Identify which context cache pack types are relevant for each of the 5 agents (document a mapping: agent → pack types consumed) and verify all required pack types are registered in the mcp-tools Zod `packTypeValues` array
- [ ] AC-2: Add a "Context Cache Integration" section to each of the 5 target agent .agent.md files documenting: which pack types to query, the context_cache_get() call pattern, how retrieved content maps to prompt injection, and the graceful fallback behavior
- [ ] AC-3: Each agent's cache integration section specifies a per-invocation trigger (e.g., "Query at start of implementation") and limits injected content to a defined subset of fields (to respect token budgets)
- [ ] AC-4: The fallback behavior for all 5 agents is explicit: cache miss (null return) → log warning via @repo/logger → continue without cache context (no agent execution blocked)
- [ ] AC-5: Audit whether any of the 5 target agents have a paired LangGraph TypeScript node in the orchestrator; if yes, update both the .agent.md and the TypeScript node together
- [ ] AC-6: Document pre-implementation baseline token estimates for each of the 5 agents (rough estimates acceptable) to enable WINT-2120 before/after comparison
- [ ] AC-7: Sync mcp-tools `packTypeValues` Zod array to include all pack types produced by WINT-2030, WINT-2040, WINT-2050, WINT-2060 (if not already included)
- [ ] AC-8: Integration test or manual verification shows context_cache_get() is called during a simulated agent invocation and returns cache content when packs are populated

### Non-Goals

- Do not replace or remove existing `kb_search()` calls from any agent — cache supplements, not replaces, KB queries
- Do not implement cache warming or population logic — that is WINT-2070/2080
- Do not measure final token reduction — that is WINT-2120
- Do not modify the `wint.context_packs` table schema — protected (WINT-0010)
- Do not modify the context_cache MCP tool implementations — use them as consumers only
- Do not add cache integration to agents outside the 5 listed (defer to a future story)
- Do not create new cache pack types — consume what WINT-2030/2040/2050/2060 produce

### Reuse Plan

- **Components**: context_cache_get() from packages/backend/mcp-tools/src/context-cache/, existing KB integration section structure in each agent as the template
- **Patterns**: When-to-Query / Example-Queries / Applying-Results / Fallback four-section pattern (copy from qa-verify-setup-leader.agent.md)
- **Packages**: @repo/logger for fallback warning logging, packages/backend/mcp-tools/src/context-cache/context-cache-get.ts as the tool to integrate

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The primary verification challenge is that agent .agent.md files are documentation, not executable code. Testing must verify: (1) cache calls are present and syntactically correct in each agent file, (2) packTypeValues Zod array is updated, and (3) any LangGraph TypeScript node updates are functionally tested. For the TypeScript node updates (AC-5), standard Vitest unit tests apply. For agent .md file changes, manual verification against a checklist per agent is the appropriate approach. Consider an integration smoke test that calls context_cache_get() against a live DB with a pre-populated pack to confirm the tool works end-to-end.

### For UI/UX Advisor

No UI changes. N/A.

### For Dev Feasibility

The implementation surface is primarily documentation (5 .agent.md file edits) plus one TypeScript change (mcp-tools packTypeValues array sync, AC-7) and potential TypeScript node updates (AC-5). The scope risk is around AC-5 — the audit of LangGraph TypeScript nodes may discover more paired files than expected. Recommend implementer run `grep -r "pm-bootstrap\|dev-implement\|elab-story\|qa-verify\|dev-fix" packages/backend/orchestrator/src/` before starting to get an accurate count of TypeScript nodes. The mcp-tools packTypeValues sync is low-risk: it is a one-line array update with a corresponding Zod schema change.

Canonical references for subtask decomposition:
- .claude/agents/qa-verify-setup-leader.agent.md — the most complete example of KB integration section structure to replicate for cache
- packages/backend/mcp-tools/src/context-cache/context-cache-get.ts — the tool signature to document in each agent
- packages/backend/mcp-tools/src/context-cache/__types__/index.ts — the packTypeValues array to update in AC-7
