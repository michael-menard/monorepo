---
generated: "2026-03-03"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-2080

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 2 cache populate stories (WINT-2030/2040/2050/2060); those are active/near-complete and not yet reflected in baseline

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| `wint.context_packs` table | Active (WINT-0010, protected) | Cache write target for warming |
| `contextCachePut()` MCP tool | UAT-complete (WINT-0100) | Primary write mechanism used by populate scripts |
| `contextCacheGet()` MCP tool | UAT-complete (WINT-0100) | Available for verification inside agent |
| `populate-project-context.ts` | needs-code-review (WINT-2030) | Sibling populate script — pattern template |
| `populate-domain-kb.ts` | needs-code-review (WINT-2050) | Sibling populate script |
| KB pgvector store | Active (port 5433) | Queried by populate-domain-kb |
| Agent .md file pattern | Active (115+ agents in .claude/agents/) | Pattern for new agent file |
| Orchestrator YAML artifacts | Active | Zod-validated schemas for workflow |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| WINT-2030 | needs-code-review | Provides project context packs — must exist before warmer runs |
| WINT-2040 | failed-code-review | Provides agent mission packs — must exist before warmer runs |
| WINT-2050 | needs-code-review | Provides domain knowledge packs — must exist before warmer runs |
| WINT-2060 | ready-to-work | Provides library cache packs — must exist before warmer runs |
| WINT-2070 | created | DIRECT DEPENDENCY — provides the cache-warm skill this agent implements |
| WINT-2090 | uat | Session management — context of how agents acquire context at runtime |

### Constraints to Respect

- `wint.context_packs` table schema is protected (WINT-0010) — no schema changes
- All existing `contextPackTypeEnum` values must be used as-is; no new enum values
- Agent file must follow `.claude/agents/*.agent.md` naming convention
- Agent must not implement any populate scripts itself — it delegates to the cache-warm skill (WINT-2070)
- Partial cache warm failures must NOT fail the agent — must continue and report summary

---

## Retrieved Context

### Related Endpoints

- No HTTP endpoints involved — this is a pure agent/skill invocation story
- `contextCachePut()` and `contextCacheGet()` are the only tool calls the agent coordinates

### Related Components

- `.claude/agents/*.agent.md` — all existing agents as structural references
- `.claude/skills/doc-sync/SKILL.md` — example of a skill that agents invoke
- `packages/backend/mcp-tools/src/scripts/populate-*.ts` — the underlying populate scripts that the cache-warm skill (WINT-2070) will wrap
- `packages/backend/mcp-tools/src/context-cache/` — contextCachePut/Get implementation

### Reuse Candidates

- `.claude/agents/scope-defender.agent.md` — exemplary haiku worker agent with clean phases, graceful degradation, completion signals
- `.claude/agents/kb-writer.agent.md` — exemplary lightweight worker with fallback behavior and structured result contract
- `scope-defender` partial-failure and warning pattern: count missing inputs as warnings, produce output anyway
- `kb-writer` fallback behavior: if dependency unavailable, log warning and return structured `skipped` result

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Haiku worker agent structure | `.claude/agents/scope-defender.agent.md` | Complete haiku worker with phases, graceful degradation, embedded constraints, completion signals, LangGraph porting notes — the gold-standard template for this story |
| Lightweight worker with fallback | `.claude/agents/kb-writer.agent.md` | Shows structured result contract, KB unavailable fallback pattern, and clean completion signals for a worker that can fail gracefully |
| Skill invocation pattern | `.claude/skills/doc-sync/SKILL.md` | How skills are documented and invoked by agents; the cache-warm skill (WINT-2070) will follow this pattern |
| Agent .md frontmatter standard | `.claude/agents/scope-defender.agent.md` | Frontmatter with `type: worker`, `model: haiku`, `tools` list — required fields for WINT compliance |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1150]** Testing agent instruction logic as pure functions provides effective behavioral coverage (category: testing)
  - *Applies because*: The context-warmer agent's execution phases (load, invoke skill, handle failure, report) can be expressed as a TypeScript function and tested without LLM execution in CI

- **[WINT-9090]** Cache invalidation implementation approach left undocumented caused integration friction (category: edge-case)
  - *Applies because*: This agent is later ported to a LangGraph node in WINT-9090 — documenting the LangGraph porting contract in the agent file now prevents friction at that point

- **[WINT-2040/WINT-2050]** Populate scripts should count partial failures without aborting the run (category: architecture)
  - *Applies because*: If one populate script fails during cache warming, the agent must continue warming other caches and report a partial-success result

- **[WINT-2030]** Parallel cache writes with Promise.allSettled could provide 5x speedup (category: performance, future work)
  - *Applies because*: If the cache-warm skill exposes parallel invocation, the agent should prefer it; this is a future optimization, not MVP

### Blockers to Avoid (from past stories)

- Agent file that invokes populate scripts directly — the agent must invoke the cache-warm SKILL (WINT-2070), not scripts
- Missing completion signal — every agent invocation path must end with one of the defined completion signals
- Undocumented partial failure semantics — explicitly document what happens when 1 of N caches fails to warm
- Missing LangGraph porting notes section — WINT-9090 ports this agent; the porting contract must be in the agent file (learned from scope-defender pattern)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — any integration test of the agent must invoke real contextCachePut |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable (no UI) but behavioral testing of the agent phases should use real skill invocation where possible |

### Patterns to Follow

- Haiku-model worker pattern: minimal instructions, tight phase definition, hard cap on outputs, embedded fallback constraints
- Graceful degradation: count missing inputs and unavailable skills as warnings, not failures; proceed with available inputs
- Structured completion signals: `CACHE-WARM COMPLETE`, `CACHE-WARM COMPLETE WITH WARNINGS: {N}`, `CACHE-WARM BLOCKED: {reason}`
- LangGraph porting notes section (required): input/output contract for WINT-9090 consumption
- Single output file: write a warm-result YAML or log to stdout — no multi-file outputs for a haiku worker

### Patterns to Avoid

- Agent that directly reads or writes to `wint.context_packs` — it must delegate all cache writes to the cache-warm skill
- Agent that calls populate-*.ts scripts directly — those are script internals, not agent APIs
- Missing fallback: if cache-warm skill is not available, agent must still complete (with BLOCKED or WARNING, not silent hang)
- Barrel file imports — import skill helpers directly from source, not via index re-exports

---

## Conflict Analysis

### Conflict: dependency not yet complete
- **Severity**: warning (non-blocking for seed generation)
- **Description**: WINT-2070 (the cache-warm skill this agent implements) has status `created` — not yet in elaboration or ready-to-work. The agent file cannot be fully validated until the skill's API surface is defined.
- **Resolution Hint**: Design the agent with an explicit skill invocation contract section that can be updated once WINT-2070 is elaborated. Use a placeholder API shape in the agent file and mark it `# TODO: Update when WINT-2070 skill API is finalized`. Alternatively, elaborate WINT-2070 first and WINT-2080 second.

---

## Story Seed

### Title

Create context-warmer Agent (Haiku-powered cache-warm skill executor)

### Description

**Context**: Phase 2 of the WINT platform targets 80% token reduction by pre-populating four cache layers before agent workflows start: project context (WINT-2030), agent missions (WINT-2040), domain knowledge (WINT-2050), and library patterns (WINT-2060). WINT-2070 creates the `cache-warm` skill that orchestrates invocation of all populate scripts. Without an agent to trigger this skill, cache warming remains a manual CLI operation.

**Problem**: There is no automated agent that can be triggered (by a leader agent, a CLI command, or a workflow hook) to execute the full cache warming sequence. Caches may be stale or empty when high-volume workflow operations begin, negating the token reduction benefits.

**Proposed Solution**: Create a new `.claude/agents/context-warmer.agent.md` — a lightweight, haiku-powered worker agent whose sole responsibility is to invoke the `cache-warm` skill (WINT-2070), handle partial failures gracefully, and return a structured warm-result summary to its caller. The agent is designed to be: (a) invokable by any leader agent or CLI trigger, (b) resilient to individual cache failures, (c) portable to a LangGraph node in WINT-9090.

### Initial Acceptance Criteria

- [ ] **AC-1**: A new agent file `.claude/agents/context-warmer.agent.md` exists with valid WINT frontmatter: `type: worker`, `model: haiku`, explicit `tools` list, `version`, `created`, `updated`.

- [ ] **AC-2**: The agent defines a clear mission: invoke the `cache-warm` skill and return a structured warm-result to the caller. Mission fits in ≤ 5 sentences.

- [ ] **AC-3**: The agent defines a phased execution model with at least: (1) validate inputs / check skill availability, (2) invoke cache-warm skill with configured options, (3) handle per-cache failures, (4) emit structured warm-result summary.

- [ ] **AC-4**: The agent handles partial failures gracefully — if 1 of N caches fails to warm, the agent logs the failure, increments a `failed` counter, and continues with remaining caches. A partial success is `CACHE-WARM COMPLETE WITH WARNINGS`, not a BLOCKED result.

- [ ] **AC-5**: The agent defines explicit graceful degradation: if the cache-warm skill (WINT-2070) is not available, the agent emits `CACHE-WARM BLOCKED: cache-warm skill unavailable` and does NOT attempt direct script invocation.

- [ ] **AC-6**: The agent emits exactly one of three completion signals as its final output line:
  - `CACHE-WARM COMPLETE` — all caches warmed successfully
  - `CACHE-WARM COMPLETE WITH WARNINGS: {N} warnings` — partial success
  - `CACHE-WARM BLOCKED: {reason}` — unrecoverable failure

- [ ] **AC-7**: The agent includes a `## LangGraph Porting Notes` section documenting the input/output contract for WINT-9090 (port to `nodes/context/context-warmer.ts`). Minimum: input state fields table, output contract table, tool requirements.

- [ ] **AC-8**: The agent defines an embedded fallback constraint: if any single cache fails, the warm-result must still include `{ attempted: N, succeeded: M, failed: K }` counts conforming to the same `PopulateResultSchema` shape used by populate scripts.

- [ ] **AC-9**: The agent file includes a `## Non-Goals` section explicitly excluding: (a) directly invoking populate-*.ts scripts, (b) writing to `wint.context_packs` directly, (c) cache invalidation (deferred to WINT-2070 or later), (d) scheduling or recurring warm jobs.

### Non-Goals

- Do not implement the cache-warm skill itself — that is WINT-2070
- Do not invoke `populate-project-context.ts`, `populate-domain-kb.ts`, or other populate scripts directly — delegate only through the skill
- Do not add cache scheduling or cron-based invocation — manual/triggered-on-demand is MVP
- Do not implement cache invalidation logic — out of scope for this agent
- Do not create any TypeScript source files — this story delivers only an `.agent.md` file
- Do not create tests for the agent file itself — behavioral testing of agent logic is deferred (future opportunity per WINT-1150 pattern)
- Do not modify existing populate scripts or context cache MCP tools

### Reuse Plan

- **Components**: Frontmatter structure from `scope-defender.agent.md`; fallback behavior pattern from `kb-writer.agent.md`; LangGraph porting notes section from `scope-defender.agent.md`
- **Patterns**: Phase-based execution model (scope-defender); structured result contract with `{ attempted, succeeded, failed }` (populate-project-context); completion signals pattern (kb-writer)
- **Packages**: No package-level code — agent file only. Downstream: `@repo/mcp-tools` (contextCachePut), `@repo/logger` are used by the skill, not the agent directly.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story delivers only an `.agent.md` file — no TypeScript source code to unit test
- Testing strategy: behavioral verification via the agent instruction spec itself (checklist of phase transitions and completion signals)
- If a TypeScript helper is extracted (per WINT-1150 lesson), it should be tested as a pure function with mocked skill calls
- Integration test (if any): trigger the agent with a real cache-warm skill invocation against a dev DB and verify `{ attempted, succeeded, failed }` warm-result is returned
- AC-6 (completion signals) is the primary QA verification point — confirm all three signal variants are reachable

### For UI/UX Advisor

- No UI component — N/A
- The agent's output (warm-result summary) is machine-readable; ensure the result schema is human-legible if printed to a terminal

### For Dev Feasibility

- This story is purely a documentation/spec artifact (one `.agent.md` file) — implementation complexity is low
- Key risk: WINT-2070 (cache-warm skill) API is not yet defined; the agent must use a placeholder skill invocation contract and document it clearly for update post-WINT-2070 elaboration
- Canonical reference for implementation: `.claude/agents/scope-defender.agent.md` — copy its frontmatter, phase structure, embedded constraints block, and LangGraph porting notes section; adapt content to cache-warm domain
- Recommended subtask decomposition:
  - ST-1: Write frontmatter + mission section + non-goals (read scope-defender and kb-writer first)
  - ST-2: Write execution phases with placeholder skill API contract
  - ST-3: Write graceful degradation, embedded constraints, completion signals
  - ST-4: Write LangGraph porting notes section
- Verification command: `cat .claude/agents/context-warmer.agent.md` — confirm all 9 ACs are met by reading the file
- Estimated size: 1 file, ~150-200 lines
