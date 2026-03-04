---
generated: "2026-03-03"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-2070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-2030/2040/2050/2060 implementation; all four populate scripts exist or were in-flight at seed time. The `cache-warm` skill itself has since been implemented and reached `needs-code-review`.

### Relevant Existing Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| `wint.context_packs` table | Active (WINT-0010, protected) | `packages/backend/database-schema/src/schema/wint.ts` | Write target for all populate scripts |
| `contextCachePut()` | UAT-complete (WINT-0100) | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Only valid write path — upsert on `(packType, packKey)` |
| `populate-project-context.ts` | completed | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | 5 packs: architecture/project-conventions, tech-stack-{backend,frontend,monorepo}, test_patterns/testing-strategy |
| `populate-domain-kb.ts` | completed | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | 6+ packs: active-adrs, lessons-{backend,frontend,testing,workflow}, blockers-known |
| `populate-library-cache.ts` | completed | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | 4 packs: codebase/lib-{react19,tailwind,zod,vitest} |
| `agent-mission-cache-populator.ts` | completed | `packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts` | 1+ packs: agent_missions type — placement differs from other scripts |
| `cache-warm` skill | needs-code-review (WINT-2070) | `.claude/skills/cache-warm/SKILL.md` | The primary deliverable: invokes all four populate scripts with resilient non-fatal failure handling |
| Existing skills directory | Active | `.claude/skills/` | 25 skills present, including the newly created cache-warm skill |
| Skill SKILL.md format | Active | `.claude/skills/*/SKILL.md` | All skills follow frontmatter + markdown instruction format |

### Active In-Progress Work

| Story | Title | Status | Overlap Risk |
|-------|-------|--------|--------------|
| WINT-2080 | Create context-warmer Agent | pending | Depends on this skill — will wrap cache-warm execution in a Haiku agent |
| WINT-2110 | Cache retrieval agent integration | needs-code-review | References WINT-2070 as an upstream that populates packs that agents will consume |

### Constraints to Respect

- `wint.context_packs` table schema is **protected** — no modifications allowed
- `contextPackTypeEnum` is **protected** — no new enum values; use only `architecture`, `lessons_learned`, `codebase`, `agent_missions`
- All existing populate scripts follow the same architecture (resilient loop, `PopulateResultSchema`, `contextCachePut()` with TTL 30d)
- The `agent-mission-cache-populator.ts` (WINT-2040) is placed at `packages/backend/database-schema/src/seed/` instead of `mcp-tools/src/scripts/` — the skill accounts for this placement difference
- Skills live at `.claude/skills/{name}/SKILL.md` with frontmatter (`name`, `description`) + instruction body

---

## Retrieved Context

### Related Endpoints

None. This story is agent/skill tooling only — no HTTP endpoints.

### Related Components

None. No UI surface.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `populate-project-context.ts` | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Invoked by skill as first populate script |
| `populate-domain-kb.ts` | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | Invoked by skill as second populate script |
| `populate-library-cache.ts` | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | Invoked by skill as third populate script |
| `agent-mission-cache-populator.ts` | `packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts` | Invoked by skill as fourth populate script (different location from others) |
| `PopulateResultSchema` | Any populate script | Shared shape for aggregated result reporting |
| Skill SKILL.md format | `.claude/skills/lint-fix/SKILL.md`, `.claude/skills/next-actions/SKILL.md` | Frontmatter + phased instructions format to replicate |
| `session-create` skill | `.claude/skills/session-create/SKILL.md` | Analogous "pre-workflow setup" skill structure to model |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Skill definition (gold standard) | `.claude/skills/lint-fix/SKILL.md` | Most complete skill with phased execution, gate behavior, parameters, and usage section |
| Pre-workflow skill (structural analog) | `.claude/skills/session-create/SKILL.md` | Analogous "setup before workflow starts" skill type showing pre-flight orchestration |
| Populate script (primary invocation model) | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Canonical populate script: readDoc, extractSections, resilient loop, PopulateResultSchema |
| Most recent populate implementation | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | Injectable contextCachePutFn for testability; most current implementation pattern |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2030]** Populate scripts run sequentially via `pnpm tsx` — each script is a standalone Node.js invocation (pattern)
  - *Applies because*: The skill invokes each script via `pnpm tsx` in sequence; an orchestrator TypeScript script is not needed and would duplicate logic
- **[WINT-2030]** Parallel cache writes with `Promise.allSettled()` identified as a future optimization; sequential is MVP (performance)
  - *Applies because*: Sequential invocations are the safe MVP; parallelization at the skill level is out of scope
- **[WINT-2050]** Port confusion (5432 vs 5433) is the #1 failure mode — `DATABASE_URL` must be port 5432, `KB_DATABASE_URL` must be port 5433 (blocker)
  - *Applies because*: The skill must document required env vars clearly; `populate-domain-kb.ts` is the only script needing both ports
- **[WINT-2050]** Cache invalidation hints via source doc paths deferred to WINT-2070/WINT-2080 scope — automatic doc-change triggers are out of scope for MVP (architecture)
  - *Applies because*: The skill runs on demand; automatic invalidation is not part of the `cache-warm` skill's responsibilities
- **[WINT-2050]** Structured telemetry for cache population monitoring deferred to when telemetry infrastructure (WINT Phase 3) is ready (tooling)
  - *Applies because*: The skill should document expected logging output from scripts but not emit structured telemetry
- **[WINT-2060]** Extract shared `populate-utils` module after 3+ populate scripts exist — with 4 scripts now present, this is a candidate post-WINT-2070 follow-on (technical debt)
  - *Applies because*: The skill invokes all 4 scripts; the populate-utils extraction should be logged as a non-goal but flagged as a follow-on
- **[WINT-2040]** MCP tools `packTypeValues` array does not include `agent_missions` — WINT-2110 should sync this (integration risk)
  - *Applies because*: The skill triggers population of `agent_missions` packs; downstream cache retrieval via MCP tools may reject `agent_missions` queries until WINT-2110 syncs the type

### Blockers to Avoid (from past stories)

- Wrong database port: ensure skill documentation lists `DATABASE_URL=...@localhost:5432` (lego_dev writes) and `KB_DATABASE_URL=...@localhost:5433` (KB reads for populate-domain-kb.ts)
- Assuming all dependency scripts are code-review-passing before authoring the skill: WINT-2040 was `failed-code-review` at earlier stages — the skill must treat individual script failures as non-fatal (graceful degradation per script)
- Missing shared utility extraction flag: 4 populate scripts now exist — explicitly note populate-utils extraction as a non-goal but a follow-on opportunity

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | No IaC changes needed — skill is local tooling only, not a deployed resource |
| ADR-005 | Testing Strategy | UAT must use real services — skill verification (if done at UAT level) should use real DBs, not mocked `contextCachePut`; individual script tests cover unit/integration |
| ADR-006 | E2E Tests Required in Dev Phase | No UI surface — E2E not applicable; `frontend_impacted: false` |

### Patterns to Follow

- Skill SKILL.md file at `.claude/skills/cache-warm/SKILL.md` with frontmatter `name`, `description`
- Document required environment variables (`DATABASE_URL`, `KB_DATABASE_URL`) explicitly in the skill
- Phased execution instructions: Phase 1 checks preconditions, Phase 2 invokes populate-project-context, Phase 3 invokes populate-domain-kb, Phase 4 invokes populate-library-cache, Phase 5 invokes agent-mission-cache-populator, Phase 6 reports summary
- Resilient: individual script failure does not abort the run; aggregate result reported at end
- Logging via `@repo/logger` is handled by the individual scripts; the skill documents expected output, not new logging code

### Patterns to Avoid

- Do not implement a new combined "super-script" that duplicates populate logic — invoke the four existing scripts
- Do not add new `contextPackTypeEnum` values
- Do not hardcode script invocation paths that break if the monorepo root changes (use paths relative to root via `pnpm tsx`)
- Do not require all four dependency scripts to be in a "passing" state before the skill can be used

---

## Conflict Analysis

### Conflict: Warning — WINT-2040 placement and code-review history
- **Severity**: warning (non-blocking)
- **Description**: `agent-mission-cache-populator.ts` lives at `packages/backend/database-schema/src/seed/` rather than `packages/backend/mcp-tools/src/scripts/` — a placement inconsistency that the skill must account for with explicit path documentation.
- **Resolution Hint**: Skill must explicitly document the correct path for each script. The `--skip=agent-missions` option allows bypassing this script if it encounters issues during review cycles.

### Conflict: Warning — Shared populate-utils extraction is due but out of scope
- **Severity**: warning (informational)
- **Description**: With 4 populate scripts now existing, the WINT-2060 lesson flagged that a shared `populate-utils.ts` module extraction is due. This refactor adds scope and should be deferred.
- **Resolution Hint**: Explicitly exclude populate-utils extraction from acceptance criteria. Log as a follow-on story (WINT-2080 or standalone refactor).

---

## Story Seed

### Title
Implement Cache Warming Strategy — Create `cache-warm` Skill that Invokes All Four Populate Scripts

### Description

**Context**: The WINT platform Phase 2 goal is 80% token reduction. Four populate scripts exist to warm `wint.context_packs` with project conventions, domain knowledge, library patterns, and agent missions. These scripts were previously invoked manually and independently. Before a high-volume agent workflow session starts, all four caches must be fresh, but there was no single entry point to trigger all warm-ups.

**Problem**: Without a unified `cache-warm` skill, agents and workflow scripts have no standard way to ensure all context packs are populated before starting. High-volume operations begin with stale or empty caches, negating Phase 2 token reduction. The upcoming `context-warmer` agent (WINT-2080) needs a skill to invoke.

**Proposed Solution**: Create a `.claude/skills/cache-warm/SKILL.md` that:
1. Documents pre-conditions (env vars, DB availability)
2. Invokes each of the four populate scripts sequentially via `pnpm tsx`
3. Aggregates success/failure counts per script
4. Reports a final summary block (warm result: N/4 scripts succeeded)
5. Treats individual script failures as non-fatal — partial warming is better than no warming
6. Provides a `--skip={script}` option for selective execution

The skill is a markdown instruction file (not a TypeScript script itself) in the established `.claude/skills/` format.

### Initial Acceptance Criteria

- [ ] **AC-1**: A skill file exists at `.claude/skills/cache-warm/SKILL.md` with valid frontmatter (`name: cache-warm`, `description: ...`) following the established skill file format
- [ ] **AC-2**: The skill documents all required environment variables: `DATABASE_URL` (port 5432, lego_dev) and `KB_DATABASE_URL` (port 5433, KB pgvector store, required only for populate-domain-kb.ts)
- [ ] **AC-3**: The skill invokes `populate-project-context.ts` via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-project-context.ts` and captures its exit code and log output
- [ ] **AC-4**: The skill invokes `populate-domain-kb.ts` via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` and captures its exit code and log output
- [ ] **AC-5**: The skill invokes `populate-library-cache.ts` via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` and captures its exit code and log output
- [ ] **AC-6**: The skill invokes `agent-mission-cache-populator.ts` at its actual path (`packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts`) and captures its exit code and log output
- [ ] **AC-7**: Individual script failures are non-fatal — the skill continues invoking remaining scripts and reports which scripts succeeded and which failed in the summary
- [ ] **AC-8**: The skill produces a final summary block showing which scripts ran (pass/fail/skip) and the total packs written (e.g. `Cache warm complete: 3/4 scripts succeeded. Packs written: ~15`)
- [ ] **AC-9**: The skill documents a `--skip={script}` option allowing callers to skip individual scripts (e.g., skip agent-missions if that script is temporarily unavailable)
- [ ] **AC-10**: The skill is runnable by both humans (`/cache-warm`) and agents — instructions are LLM-executable, not just shell commands
- [ ] **AC-11**: The skill includes a precondition check: verify `DATABASE_URL` is set and points to port 5432; warn (do not abort) if `KB_DATABASE_URL` is absent (domain-kb populate will be skipped with a warning)

### Non-Goals

- Do not implement a TypeScript orchestrator script — the skill invokes existing scripts via `pnpm tsx`
- Do not implement automatic cache invalidation or doc-change triggers (deferred)
- Do not extract `populate-utils.ts` shared module (separate follow-on story)
- Do not modify any populate scripts — they are read-only from this story's perspective
- Do not modify `wint.context_packs` table schema
- Do not add new `contextPackTypeEnum` values
- Do not implement cache scheduling or cron jobs (WINT phase 3 scope)
- Do not implement cache retrieval for agents (WINT-2110 scope)
- Do not build a UI or HTTP endpoint

### Reuse Plan

- **Components**: N/A (skill is a markdown file, not a React component)
- **Patterns**: Skill SKILL.md format from `.claude/skills/lint-fix/SKILL.md`; session-create skill for pre-workflow pattern; all four populate scripts for the invocations themselves
- **Packages**: None (skill invokes scripts via `pnpm tsx`; no new packages needed)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story delivers a `.claude/skills/*.md` instruction file — not TypeScript code. The testing strategy is fundamentally different from prior WINT populate stories:

- **No unit tests** in the traditional sense (no TypeScript to test)
- **Verification approach**: The skill can be verified by invoking it via `/cache-warm` with a real dev environment and confirming all four populate scripts run and `wint.context_packs` reflects the expected entry counts
- **Smoke test**: Define an AC-level smoke test — run `/cache-warm` from a clean `context_packs` state; assert that at least 15 rows exist afterwards (5 from project-context + 6+ from domain-kb + 4 from library-cache; agent-missions count depends on number of agent files)
- **Partial failure test**: Verify the skill reports a failure but continues when one script fails (e.g., by omitting `KB_DATABASE_URL` to trigger domain-kb skip)
- **No integration test file needed** — the four scripts have their own test suites; this story's quality gate is the skill's correctness as an instruction document

### For UI/UX Advisor

No UI surface. This is purely backend/tooling. Minimal notes:
- The skill's summary block output format (AC-8) is the "UX" for agents consuming the skill output — keep it compact and machine-readable
- Consider whether the summary should include a structured YAML or JSON block so consuming agents (e.g., context-warmer in WINT-2080) can parse success/failure programmatically alongside the human-readable output

### For Dev Feasibility

Key feasibility considerations:

1. **Simplicity**: The primary deliverable is a single `.claude/skills/cache-warm/SKILL.md` markdown file following the established skill format. No TypeScript, no migrations, no new packages.

2. **WINT-2040 path discrepancy**: `agent-mission-cache-populator.ts` lives at `packages/backend/database-schema/src/seed/` instead of `packages/backend/mcp-tools/src/scripts/` — the skill must use the exact correct path. The dev agent should verify the file location before writing the invocation.

3. **Sequential vs parallel invocation**: Skills are LLM-executable instructions. Specifying sequential `pnpm tsx` calls is simpler and matches all prior populate script patterns. Do not attempt async parallelization in the skill instruction.

4. **Partial dependency completion risk**: Dependency scripts may have transient code review failures. The skill's `--skip` option (AC-9) addresses this — the skill can be used without all four scripts being in passing state.

5. **Populate-utils extraction opportunity**: After this story delivers, a separate refactor story should extract `readDoc()`, `extractSections()`, and `PopulateResultSchema` from the 4 scripts into a shared `populate-utils.ts`. This is not in scope but should be flagged for the implementor to log as a follow-on.

**Canonical references for implementation**:
- `.claude/skills/lint-fix/SKILL.md` — gold standard for skill format, phased instructions, parameters section
- `.claude/skills/session-create/SKILL.md` — analog for pre-workflow setup skill
- `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` — confirms the exact `pnpm tsx` invocation path for project-context
- `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` — most recently implemented populate script; confirms invocation pattern
