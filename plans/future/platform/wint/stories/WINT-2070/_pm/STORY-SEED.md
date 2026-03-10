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
- Gaps: Baseline predates WINT-2030/2040/2050/2060 implementation; all four populate scripts exist in the codebase now or are in-flight

### Relevant Existing Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| `wint.context_packs` table | Active (WINT-0010, protected) | `packages/backend/database-schema/src/schema/wint.ts` | Write target for all populate scripts |
| `contextCachePut()` | UAT-complete (WINT-0100) | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Only valid write path — upsert on `(packType, packKey)` |
| `populate-project-context.ts` | ready-to-work (WINT-2030) | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | 5 packs: architecture/project-conventions, tech-stack-{backend,frontend,monorepo}, test_patterns/testing-strategy |
| `populate-domain-kb.ts` | needs-code-review (WINT-2050) | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | 6+ packs: active-adrs, lessons-{backend,frontend,testing,workflow}, blockers-known |
| `populate-library-cache.ts` | ready-to-work (WINT-2060) | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | 4 packs: codebase/lib-{react19,tailwind,zod,vitest} |
| `agent-mission-cache-populator.ts` | failed-code-review (WINT-2040) | `packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts` | 1+ packs: agent_missions type — placement differs from other scripts |
| Existing skills directory | Active | `.claude/skills/` | 24 skills present: lint-fix, plan, next-actions, session-create, session-inherit, etc. |
| Skill SKILL.md format | Active | `.claude/skills/*/SKILL.md` | All skills follow frontmatter + markdown instruction format |
| WINT-2090 session skills | uat | `.claude/skills/session-create/`, `.claude/skills/session-inherit/` | Closest structural analog for a new skill |

### Active In-Progress Work

| Story | Title | Status | Overlap Risk |
|-------|-------|--------|--------------|
| WINT-2030 | Populate Project Context Cache | ready-to-work | Dependency — script this skill will invoke |
| WINT-2040 | Populate Agent Mission Cache | failed-code-review | Dependency — blocked; cache-warm skill must tolerate partial dep completion |
| WINT-2050 | Populate Domain Knowledge Cache | needs-code-review | Dependency — script this skill will invoke |
| WINT-2060 | Populate Library Cache | ready-to-work | Dependency — script this skill will invoke |
| WINT-2080 | Create context-warmer Agent | pending | Consumer of this skill — will wrap cache-warm execution in a Haiku agent |

### Constraints to Respect

- `wint.context_packs` table schema is **protected** — no modifications allowed
- `contextPackTypeEnum` is **protected** — no new enum values; use only `architecture`, `lessons_learned`, `codebase`, `agent_missions`
- All existing populate scripts follow the same architecture (resilient loop, `PopulateResultSchema`, `contextCachePut()` with TTL 30d)
- The `agent-mission-cache-populator.ts` (WINT-2040) is placed at `packages/backend/database-schema/src/seed/` instead of `mcp-tools/src/scripts/` — the skill must handle this placement difference
- Skills live at `.claude/skills/{name}/SKILL.md` with frontmatter (`name`, `description`) + instruction body

---

## Retrieved Context

### Related Endpoints

None. This story is agent/script tooling only — no HTTP endpoints.

### Related Components

None. No UI surface.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `populate-project-context.ts` | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Invoke from skill as first populate script |
| `populate-domain-kb.ts` | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | Invoke from skill as second populate script |
| `populate-library-cache.ts` | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | Invoke from skill as third populate script |
| `agent-mission-cache-populator.ts` | `packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts` | Invoke from skill as fourth populate script |
| `PopulateResultSchema` | Any populate script | Shared shape for aggregated result reporting |
| Skill SKILL.md format | `.claude/skills/lint-fix/SKILL.md`, `.claude/skills/next-actions/SKILL.md` | Frontmatter + phased instructions format to replicate |
| `session-create` skill | `.claude/skills/session-create/SKILL.md` | Analogous "pre-workflow setup" skill structure to model |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Skill definition | `.claude/skills/lint-fix/SKILL.md` | Most complete skill with phased execution, gate behavior, parameters, and usage section — gold standard for format |
| Pre-workflow skill | `.claude/skills/session-create/SKILL.md` | Analogous "setup before workflow starts" skill type; shows how to model a skill whose purpose is orchestration of pre-flight tasks |
| Populate script (primary model) | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Canonical populate script: readDoc, extractSections, resilient loop, PopulateResultSchema — what the skill invokes |
| Library cache populate script | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | Most recent implement of the pattern — injectable contextCachePutFn for testability |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2030]** Populate scripts run sequentially via `pnpm tsx` — each script is a standalone Node.js invocation (blocker: none, pattern)
  - *Applies because*: The skill must invoke each script via `pnpm tsx` in sequence, or via a single orchestrator script
- **[WINT-2030]** Parallel cache writes with `Promise.allSettled()` identified as future optimization but sequential is MVP (performance)
  - *Applies because*: When designing the skill's execution model, sequential invocations of scripts is the safe starting point; parallelization is out of scope
- **[WINT-2050]** Port confusion (5432 vs 5433) is the #1 failure mode — `DATABASE_URL` must be port 5432, `KB_DATABASE_URL` must be port 5433 (blocker)
  - *Applies because*: The skill must document required env vars clearly; `populate-domain-kb.ts` is the only script needing both ports
- **[WINT-2050]** Cache invalidation hints via source doc paths deferred to WINT-2070/WINT-2080 scope (architecture)
  - *Applies because*: The original lesson explicitly notes this story as scope — however, automatic doc-change triggers are out of scope for MVP; the skill runs on demand
- **[WINT-2050]** Parallel cache writes are a future optimization; sequential writes are acceptable for MVP since the number of packs is small (performance)
  - *Applies because*: The skill can invoke scripts sequentially without performance risk
- **[WINT-2050]** Structured telemetry for cache population monitoring deferred to when telemetry infrastructure (WINT Phase 3) is ready (tooling)
  - *Applies because*: The skill should log progress via `@repo/logger` patterns but structured telemetry is out of scope
- **[WINT-2060]** Extract shared `populate-utils` module after 3+ populate scripts exist (technical debt)
  - *Applies because*: With 4 populate scripts existing at delivery time, a shared utils extraction is now a candidate. However, this refactor is explicitly out of scope for WINT-2070; note it as a post-WINT-2070 opportunity

### Blockers to Avoid (from past stories)

- Wrong database port: ensure skill documentation lists `DATABASE_URL=...@localhost:5432` (lego_dev writes) and `KB_DATABASE_URL=...@localhost:5433` (KB reads for populate-domain-kb.ts)
- Assuming all dependency scripts are code-review-passing: WINT-2040 is `failed-code-review` — the skill must be authored to invoke it but remain runnable even if the script is temporarily unavailable (graceful degradation)
- Missing shared utility extraction trigger: 4 populate scripts now exist — flag the populate-utils extraction as a follow-on

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | No IaC changes needed — skill is local tooling only, not a deployed resource |
| ADR-005 | Testing Strategy | UAT must use real services — skill tests (if any) should use real DBs, not mocked `contextCachePut` at skill level; individual script tests already cover unit/integration |
| ADR-006 | E2E Tests Required in Dev Phase | No UI surface — E2E not applicable; `frontend_impacted: false` |

### Patterns to Follow

- Skill SKILL.md file at `.claude/skills/cache-warm/SKILL.md` with frontmatter `name`, `description`
- Document required environment variables (`DATABASE_URL`, `KB_DATABASE_URL`) explicitly in the skill
- Phased execution instructions: Phase 1 checks preconditions, Phase 2 invokes populate-project-context, Phase 3 invokes populate-domain-kb, Phase 4 invokes populate-library-cache, Phase 5 invokes agent-mission-cache-populator, Phase 6 reports summary
- Resilient: individual script failure does not abort the run; aggregate result reported
- All logging via `@repo/logger` patterns (the scripts handle their own logging; the skill documents what to expect)

### Patterns to Avoid

- Do not implement a new combined "super-script" that duplicates populate logic — invoke the four existing scripts
- Do not add new `contextPackTypeEnum` values
- Do not hardcode script invocation paths that break if the monorepo root changes
- Do not require all four dependency scripts to be in a "passing" state before the skill can be used — the skill must be authored now and remain usable as deps complete code review

---

## Conflict Analysis

### Conflict: Warning — WINT-2040 dependency is failed-code-review
- **Severity**: warning (non-blocking for seed; worth flagging for dev feasibility)
- **Description**: WINT-2040 (Populate Agent Mission Cache) has `failed-code-review` status. The skill is expected to invoke `agent-mission-cache-populator.ts`, but that script has code review issues. Additionally, the script lives at `packages/backend/database-schema/src/seed/` rather than `packages/backend/mcp-tools/src/scripts/` — a placement inconsistency the skill must account for.
- **Resolution Hint**: Skill should invoke all four scripts but treat individual script failures as non-fatal. Document the WINT-2040 placement separately. Dev feasibility should note the path difference. The skill can be implemented and tested end-to-end once WINT-2040 resolves its code review failures.

### Conflict: Warning — Shared populate-utils extraction due but out of scope
- **Severity**: warning (informational)
- **Description**: WINT-2060 KB lesson identified that after 3+ populate scripts exist, a shared `populate-utils.ts` module should be extracted. At WINT-2070 delivery time, 4 populate scripts will exist. The refactor is technically due but would add scope.
- **Resolution Hint**: Explicitly exclude populate-utils extraction from this story's acceptance criteria. Log it as a non-goal and flag it as a follow-on story (could be addressed by WINT-2080 or a standalone refactor story).

---

## Story Seed

### Title
Implement Cache Warming Strategy — Create `cache-warm` Skill that Invokes All Populate Scripts

### Description

**Context**: The WINT platform Phase 2 goal is 80% token reduction. Four populate scripts now exist (or are in-flight) to warm `wint.context_packs` with project conventions, domain knowledge, library patterns, and agent missions. These scripts are currently invoked manually and independently. Before a high-volume agent workflow session starts, all four caches must be fresh, but there is no single entry point to trigger all warm-ups.

**Problem**: There is no unified `cache-warm` skill for agents or workflow scripts to call. Without it, high-volume operations begin with stale or empty caches, negating Phase 2 token reduction. The upcoming `context-warmer` agent (WINT-2080) needs a skill to invoke.

**Proposed Solution**: Create a `.claude/skills/cache-warm/SKILL.md` that:
1. Documents pre-conditions (env vars, DB availability)
2. Invokes each of the four populate scripts sequentially via `pnpm tsx`
3. Aggregates success/failure counts per script
4. Reports a final summary (warm result: N/4 scripts succeeded)
5. Treats individual script failures as non-fatal — partial warming is better than no warming

The skill is a markdown instruction file (not a TypeScript script itself) in the established `.claude/skills/` format. It calls existing `pnpm tsx` scripts, not new code.

### Initial Acceptance Criteria

- [ ] **AC-1**: A skill file exists at `.claude/skills/cache-warm/SKILL.md` with valid frontmatter (`name: cache-warm`, `description: ...`) following the established skill file format
- [ ] **AC-2**: The skill documents all required environment variables: `DATABASE_URL` (port 5432, lego_dev) and `KB_DATABASE_URL` (port 5433, KB pgvector store, required only for populate-domain-kb.ts)
- [ ] **AC-3**: The skill invokes `populate-project-context.ts` via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-project-context.ts` and captures its exit code and log output
- [ ] **AC-4**: The skill invokes `populate-domain-kb.ts` via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` and captures its exit code and log output
- [ ] **AC-5**: The skill invokes `populate-library-cache.ts` via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` and captures its exit code and log output
- [ ] **AC-6**: The skill invokes `agent-mission-cache-populator.ts` (at `packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts`) and captures its exit code and log output
- [ ] **AC-7**: Individual script failures are non-fatal — the skill continues invoking remaining scripts and reports which scripts succeeded and which failed in the summary
- [ ] **AC-8**: The skill produces a final summary block showing which scripts ran (pass/fail/skip) and the total packs written, e.g. `Cache warm complete: 3/4 scripts succeeded. Packs written: ~15`
- [ ] **AC-9**: The skill documents a `--skip={script}` option (or equivalent) allowing callers to skip individual scripts (e.g., skip agent-missions if WINT-2040 is still failing code review)
- [ ] **AC-10**: The skill is runnable by both humans (`/cache-warm`) and agents (context-warmer agent in WINT-2080) — instructions are LLM-executable, not just shell commands
- [ ] **AC-11**: The skill includes a precondition check: verify `DATABASE_URL` is set and points to port 5432; warn (do not abort) if `KB_DATABASE_URL` is absent (domain-kb populate will be skipped with a warning)

### Non-Goals

- Do not implement a TypeScript orchestrator script — the skill invokes existing scripts via `pnpm tsx`
- Do not implement automatic cache invalidation or doc-change triggers (deferred)
- Do not extract `populate-utils.ts` shared module (separate story)
- Do not modify any populate scripts — they are read-only from this story's perspective
- Do not modify `wint.context_packs` table schema
- Do not add new `contextPackTypeEnum` values
- Do not implement caching scheduling or cron jobs (WINT phase 3 scope)
- Do not implement cache retrieval for agents (WINT-2110 scope)
- Do not build a UI or HTTP endpoint
- Do not require WINT-2040 to pass code review before this story can be completed

### Reuse Plan

- **Components**: N/A (skill is a markdown file, not a React component)
- **Patterns**: Skill SKILL.md format from `.claude/skills/lint-fix/SKILL.md`; session-create skill for pre-workflow pattern; populate scripts for the invocations themselves
- **Packages**: None (skill invokes scripts via `pnpm tsx`; no new packages)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story delivers a `.claude/skills/*.md` instruction file — not TypeScript code. The testing strategy is fundamentally different from prior WINT populate stories:

- **No unit tests** in the traditional sense (no TypeScript to test)
- **Verification approach**: The skill can be verified by invoking it via `/cache-warm` with a real dev environment and confirming all four populate scripts run and `wint.context_packs` reflects the expected entry counts
- **Smoke test**: Define an AC-level smoke test: run `/cache-warm` from a clean `context_packs` state; assert that at least 13 rows exist afterwards (5 from project-context + 6+ from domain-kb + 4 from library-cache; agent-missions count depends on WINT-2040 state)
- **Partial failure test**: Mock one script failing (e.g., by temporarily breaking the DB URL for one invocation) and verify the skill reports the failure but continues
- **No integration test file needed** — the four scripts have their own test suites; this story's quality gate is the skill's correctness as an instruction document

### For UI/UX Advisor

No UI surface. This is purely backend/tooling. Skip this phase or provide minimal notes:
- The skill's output format (summary block in AC-8) is the "UX" for agents consuming the skill output — keep it compact and machine-readable
- Consider whether the summary should output a YAML or JSON block so consuming agents can parse success/failure programmatically

### For Dev Feasibility

Key feasibility considerations:

1. **Simplicity**: The primary deliverable is a single `.claude/skills/cache-warm/SKILL.md` markdown file following the established skill format. No TypeScript, no migrations, no new packages.

2. **WINT-2040 path discrepancy**: `agent-mission-cache-populator.ts` lives at `packages/backend/database-schema/src/seed/` instead of `packages/backend/mcp-tools/src/scripts/` — the skill must use the correct path. The dev agent should read the actual file location before writing the skill invocation.

3. **Sequential vs parallel invocation**: Skills are LLM-executable instructions. Specifying sequential `pnpm tsx` calls is simpler and matches all prior populate script patterns. Do not attempt async parallelization in the skill instruction.

4. **Partial dependency completion**: WINT-2040 is `failed-code-review` at seed time. The skill's `--skip` option (AC-9) addresses this. The skill can be fully authored and verified without WINT-2040 being code-review-complete, by simply skipping it during verification.

5. **Populate-utils extraction opportunity**: Flag for the implementor — after this story delivers, a separate refactor story should extract `readDoc()`, `extractSections()`, and `PopulateResultSchema` from the 4 scripts into a shared `populate-utils.ts`. This is not in scope for WINT-2070 but should be logged as a follow-on.

**Canonical references for implementation**:
- `.claude/skills/lint-fix/SKILL.md` — gold standard for skill format, phased instructions, parameters section
- `.claude/skills/session-create/SKILL.md` — analog for pre-workflow setup skill
- `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` — confirms the exact `pnpm tsx` invocation path
- `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` — most recently implemented populate script
