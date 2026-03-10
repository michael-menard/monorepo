---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-3050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-0040 (Telemetry Tables) and WINT-0120 (Telemetry MCP Tools) entering implementation. The `wint.story_outcomes` table schema is confirmed present in the codebase (at `packages/backend/database-schema/src/schema/wint.ts:997`) but is not reflected in the baseline document, which only references phase 0 bootstrap activity.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `storyOutcomes` Drizzle table | `packages/backend/database-schema/src/schema/wint.ts:997` | Target table for outcome writes: `finalVerdict`, `qualityScore`, `totalInputTokens`, `totalOutputTokens`, `totalCachedTokens`, `estimatedTotalCost`, `reviewIterations`, `qaIterations`, `durationMs`, `primaryBlocker`, `completedAt` |
| `insertStoryOutcomeSchema` | `packages/backend/database-schema/src/schema/wint.ts:1904` | Zod insert schema with `qualityScore` range refine (0-100); already exported |
| `workflow_log_outcome` MCP tool | `apps/api/knowledge-base/src/mcp-server/` (to be added by WINT-0120) | The MCP write interface this story will call at story completion points |
| `qa-verify-completion-leader` agent | `.claude/agents/qa-verify-completion-leader.agent.md` | Primary story completion orchestration point — QA PASS flow finalizes story verdict |
| `dev-implement-implementation-leader` agent | `.claude/agents/dev-implement-implementation-leader.agent.md` | Dev phase completion — a secondary injection point when story reaches code review |
| Token-log skill | `.claude/skills/token-log/SKILL.md` | Structural analog: a skill that calls an MCP tool to persist per-story data at completion |
| WINT-3020 (telemetry-log skill) | `plans/future/platform/wint/needs-code-review/WINT-3020/` | Sibling story: invocation logging skill pattern — WINT-3050 follows the same call-site injection approach |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-0120 | Ready to Work (in-progress) | Hard dependency: provides the `workflow_log_outcome` MCP tool; WINT-3050 cannot be implemented until WINT-0120 is at minimum code-review-complete so the tool exists and its parameter contract is stable |
| WINT-3020 | needs-code-review | Sibling: invocation logging at agent-level. WINT-3050 is story-level outcome logging. The two are complementary and do not touch the same files, but WINT-3020's `telemetry-log` skill pattern should be studied before implementing |
| WINT-3030 | needs-code-review | Sibling: `telemetry-logger` worker agent doc. WINT-3050 may reference or spawn this agent at completion — confirm coupling before implementation |
| WINT-0040 | uat | Provides the `wint.story_outcomes` table via migration `0032_wint_0040_hitl_decisions_story_outcomes.sql` — must be applied in dev DB before integration testing |

### Constraints to Respect

- `storyOutcomes` uses an **upsert** (ON CONFLICT DO UPDATE) pattern — one row per `storyId`. The outcome call may fire more than once (e.g., partial completion, then final) and must not create duplicates.
- `qualityScore` must be an integer in `[0, 100]` — enforced by `insertStoryOutcomeSchema.refine()`.
- `finalVerdict` is a required text field: `'pass'`, `'fail'`, `'blocked'`, or `'cancelled'` are the expected values (derive from QA/dev workflow verdict).
- The outcome logging call must be **non-blocking** — if `workflow_log_outcome` fails (MCP error, DB down), the story completion flow must not be interrupted.
- Drizzle ORM is the required query layer; raw SQL is not acceptable.
- `@repo/logger` required; no `console.log`.
- Zod-first types required; no TypeScript interfaces.
- Do NOT modify the `storyOutcomes` table schema (DDL is frozen post-WINT-0040).

---

## Retrieved Context

### Related Endpoints

None — this story inserts calls to an MCP tool (`workflow_log_outcome`) into existing agent or skill completion flows. There are no HTTP endpoints involved.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `qa-verify-completion-leader` | `.claude/agents/qa-verify-completion-leader.agent.md` | Primary injection point: step before/after `story_update` on PASS/FAIL verdict |
| `dev-implement-implementation-leader` | `.claude/agents/dev-implement-implementation-leader.agent.md` | Secondary injection point: story completion for dev phase (code review gate) |
| `token-log` skill | `.claude/skills/token-log/SKILL.md` | Structural reference: a skill invoked at completion that calls an MCP tool for data persistence |
| `telemetry-log` skill | `.claude/skills/telemetry-log/SKILL.md` (to be created by WINT-3020) | Sibling skill pattern: same invocation model but for agent-level telemetry; may already exist if WINT-3020 is merged |
| `workflow_log_outcome` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (added by WINT-0120) | The target write tool; parameter contract: `{ storyId, finalVerdict, qualityScore?, totalInputTokens?, totalOutputTokens?, totalCachedTokens?, estimatedTotalCost?, reviewIterations?, qaIterations?, durationMs?, primaryBlocker?, completedAt?, metadata? }` |

### Reuse Candidates

| Candidate | Source | Usage |
|-----------|--------|-------|
| `insertStoryOutcomeSchema` | `packages/backend/database-schema/src/schema/wint.ts:1904` | Validates outcome payload before MCP call (or as reference for what fields to populate) |
| Token-log skill pattern | `.claude/skills/token-log/SKILL.md` | Template for how a completion skill invokes an MCP tool with graceful failure |
| WINT-3020 `telemetry-log` skill | `.claude/skills/telemetry-log/SKILL.md` | Reference for fire-and-forget skill pattern with null-return handling |
| `errorToToolResult` pattern | `apps/api/knowledge-base/src/mcp-server/error-handling.ts` | Error handling pattern for MCP tool invocations |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Skill calling MCP tool at completion | `.claude/skills/token-log/SKILL.md` | Shows the exact pattern: read token data, call KB MCP tool, handle failure silently — same model for outcome logging |
| Agent completion flow with KB write | `.claude/agents/qa-verify-completion-leader.agent.md` | Shows where to inject `workflow_log_outcome` call within the PASS/FAIL verdict flow; demonstrates graceful-failure pattern for KB writes |
| Drizzle upsert with ON CONFLICT | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Reference for `.onConflictDoUpdate()` usage — same pattern the MCP tool handler will use internally |
| MCP tool handler (Zod + Drizzle + error handling) | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Clean pattern: `Schema.parse(input)`, Drizzle ORM only, try/catch with logger.warn |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2050]** Structured telemetry should use Phase 3 infrastructure when ready; `@repo/logger` is a temporary bridge but not the long-term store. (*Applies because*: WINT-3050 is the Phase 3 story that materializes this deferred telemetry — outcome data must be written to `wint.story_outcomes` via MCP tool, not just logged.)
- **[APIP-3040]** Backend-only story QA verification needs only unit tests and architecture compliance; E2E and `.http` files are not applicable. (*Applies because*: WINT-3050 is backend/agent-doc only — no UI, no HTTP endpoints. QA will verify via integration tests against the outcome MCP tool and agent file inspection.)
- **[MODL-0040]** Heuristic rule-based scoring is the correct MVP approach for quality evaluation — deterministic, explainable, zero training data required. (*Applies because*: `qualityScore` needs a concrete definition. A heuristic formula (e.g., based on `reviewIterations`, `qaIterations`, and `finalVerdict`) is more appropriate at MVP than ML-based scoring.)
- **[WINT-1060]** Pre-wire telemetry comment hooks during implementation to reduce later story effort. (*Applies because*: WINT-3070 plans to add invocation telemetry to agents; WINT-3050 adds outcome telemetry. Any agent modified for WINT-3050 should include a `# TELEMETRY HOOK: log outcome here (WINT-3050)` comment before the actual call to document the injection point pattern for WINT-3090.)

### Blockers to Avoid (from past stories)

- **Calling `workflow_log_outcome` before WINT-0120 is merged**: The MCP tool does not exist yet. Gate implementation on WINT-0120 reaching at minimum `needs-code-review` status and its parameter contract being stable.
- **Hardcoding a `qualityScore` formula without documenting it**: The Risk Notes flag "Quality scoring needs clear definition." Document the formula in the story ACs before implementation — do not leave it as an implementation-time decision.
- **Making outcome logging blocking**: If `workflow_log_outcome` fails (MCP error, DB unavailable), the story completion flow MUST continue. Non-blocking is a hard requirement, not optional.
- **Touching `wint.story_outcomes` DDL**: Schema is frozen post-WINT-0040. Only insert/upsert via the MCP tool.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real postgres-knowledgebase port 5433 — no mocks. Integration tests for `workflow_log_outcome` must write to real DB. |
| ADR-006 | E2E Tests Required in Dev Phase | E2E is exempt for this story: `touches_frontend: false`, no UI-facing ACs. Confirmed by APIP-3040 lesson. |

### Patterns to Follow

- Fire-and-forget MCP tool invocation: call → catch exception → log warning → return gracefully (never propagate to calling completion flow)
- Zod-first types for any new Zod schemas; use `insertStoryOutcomeSchema` from `@repo/database-schema` as the input contract reference
- Upsert semantics for outcome writes (`ON CONFLICT (story_id) DO UPDATE`) — already handled inside `workflow_log_outcome` tool
- Document quality score formula explicitly in ACs before implementation
- No barrel file imports — import directly from source paths

### Patterns to Avoid

- Do not use `console.log` — use `@repo/logger` with `logger.warn` for graceful failures
- Do not throw or re-throw exceptions in the outcome logging call path
- Do not add HTML/API endpoints — this story is agent-instruction and skill modifications only
- Do not define TypeScript interfaces — use Zod schemas with `z.infer<>`
- Do not gate story completion on outcome log success — outcome logging is observability, not a gate

---

## Conflict Analysis

### Conflict: Dependency Not Yet Complete (WINT-0120)
- **Severity**: warning (user has explicitly requested generation anyway)
- **Description**: WINT-0120 (Create Telemetry MCP Tools, including `workflow_log_outcome`) has status "Ready to Work" and is in-progress but not yet code-review-complete. WINT-3050 cannot be implemented until the `workflow_log_outcome` MCP tool exists and its parameter contract is stable.
- **Resolution Hint**: Gate WINT-3050 implementation on WINT-0120 reaching `needs-code-review` or later. The story seed and PM artifacts can be generated now, but the implementation subtasks must reference the final `workflow_log_outcome` parameter spec from WINT-0120's merged story file.

### Conflict: Quality Score Definition Gap
- **Severity**: warning
- **Description**: The index entry flags "Quality scoring needs clear definition" as a risk. The `storyOutcomes.qualityScore` column accepts an integer 0-100, but no formula is specified anywhere in the codebase or prior stories. Implementing without a documented formula creates ambiguity and will likely be raised as a blocking issue in elaboration.
- **Resolution Hint**: Propose a concrete MVP formula in the story ACs. Suggested starting point: `100 - (reviewIterations * 10) - (qaIterations * 15)`, clamped to `[0, 100]`. This is deterministic, explainable, and consistent with the MODL-0040 heuristic lesson. Document this formula as an AC before implementation begins.

---

## Story Seed

### Title
Implement Outcome Logging: Add `workflow_log_outcome` Calls at Story Completion Points

### Description

**Context**: The wint platform's Phase 3 telemetry infrastructure includes a `wint.story_outcomes` table (added by WINT-0040) and a `workflow_log_outcome` MCP tool (added by WINT-0120). These provide the persistence layer for story-level outcome data: final verdict, quality score, token counts, cost, iteration counts (review/QA churn), duration, and primary blocker.

Currently, no workflow agent or skill calls `workflow_log_outcome` at story completion. As a result, `wint.story_outcomes` remains empty even as stories are completed, blocking downstream capabilities: WINT-3090 (Scoreboard Metrics) depends on outcome data, and Phase 5 ML prediction (quality prediction) requires a training dataset populated by this table.

**Problem**: Story completion events in the wint workflow (QA PASS, QA FAIL, cancellation) are not persisted as structured outcome records. The telemetry infrastructure exists but has no call-site integrations.

**Proposed Solution**: Add `workflow_log_outcome` MCP tool calls at the primary story completion points in the existing workflow. The primary injection point is `qa-verify-completion-leader` (QA verdict finalization). Secondary injection points include the dev implementation completion flow and explicit cancellation/block transitions. Each call fires and forgets — outcome logging must never block the completion flow. The story must also define the `qualityScore` formula used to compute the 0-100 score from observable completion signals.

### Initial Acceptance Criteria

- [ ] **AC-1**: A concrete `qualityScore` formula is documented in this story (suggested: `max(0, 100 - (reviewIterations * 10) - (qaIterations * 15))`), and the formula is captured in an AC before implementation begins.
- [ ] **AC-2**: `qa-verify-completion-leader.agent.md` is updated to call `workflow_log_outcome` as a non-blocking step in both the PASS and FAIL completion flows, after the verdict is determined and before `story-update` is called. The call must use the correct `finalVerdict` value (`'pass'` or `'fail'`).
- [ ] **AC-3**: The outcome call in `qa-verify-completion-leader` populates all available metrics from the completion context: `storyId`, `finalVerdict`, `qualityScore`, `reviewIterations`, `qaIterations`, `completedAt` (current timestamp), and `primaryBlocker` (populated on FAIL from the blocking finding).
- [ ] **AC-4**: If the `workflow_log_outcome` MCP call fails (null return or error), the agent emits a `logger.warn` and continues — the QA verdict flow is never interrupted or rolled back due to outcome logging failure.
- [ ] **AC-5**: A second injection point is identified and documented (either `dev-implement-implementation-leader` for cancellations/blocks, or a new `outcome-log` skill document), with implementation coverage for at least one secondary completion path.
- [ ] **AC-6**: No new MCP tool registrations, database schema changes, or Lambda deployments are required — this story only adds call-site integrations to existing agents/skills.
- [ ] **AC-7**: Integration test confirms that running `qa-verify-completion-leader` on a PASS story results in a row present in `wint.story_outcomes` with the correct `story_id` and `final_verdict = 'pass'` — verified against real postgres-knowledgebase (ADR-005: no mocks in UAT).
- [ ] **AC-8**: Integration test confirms that running on a FAIL story results in a row present with `final_verdict = 'fail'` and `primary_blocker` populated from the QA finding.

### Non-Goals

- Modifying `wint.story_outcomes` DDL — schema is frozen post-WINT-0040.
- Implementing `workflow_log_outcome` MCP tool itself — that is WINT-0120's scope.
- Adding batch or async outcome logging — synchronous fire-and-forget is sufficient for Phase 3.
- Adding UI or HTTP endpoints for outcome data — deferred to WINT-3060 (Telemetry Query Command).
- Updating all workflow agents (WINT-3070 covers the broader 10-agent instrumentation pass) — WINT-3050 covers the minimum viable completion points.
- Defining ML training schema or prediction models — deferred to Phase 5.

### Reuse Plan

- **Components**: `qa-verify-completion-leader.agent.md` (primary modification target); `dev-implement-implementation-leader.agent.md` (secondary modification target)
- **Patterns**: Fire-and-forget MCP call pattern from `token-log` skill; graceful-failure pattern from `qa-verify-completion-leader` KB write steps (Steps 2 and 5 already demonstrate this pattern)
- **Packages**: `workflow_log_outcome` MCP tool (from WINT-0120); `insertStoryOutcomeSchema` from `@repo/database-schema` (for payload reference); `@repo/logger` for warn logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Strategy: **integration** — no HTTP endpoints, no UI. Tests invoke the completion agents in a controlled scenario and verify `wint.story_outcomes` row presence.
- UAT must use real postgres-knowledgebase (ADR-005). WINT-0040 migration (`0032_wint_0040_hitl_decisions_story_outcomes.sql`) must be applied in test DB before tests run.
- Key happy-path tests: (1) QA PASS flow → outcome row with `final_verdict = 'pass'`; (2) QA FAIL flow → outcome row with `final_verdict = 'fail'` + `primary_blocker` populated.
- Key error-case test: `workflow_log_outcome` returns null/error → agent emits `logger.warn`, no exception propagates, story completion still succeeds.
- WINT-0120 must be code-review-complete before integration tests can execute (the MCP tool must exist).

### For UI/UX Advisor

- No frontend changes. This is a backend/agent-instrumentation story only. `touches_frontend: false`.
- Outcome data surfaces to users only via future WINT-3060 (Telemetry Query Command) and WINT-3090 (Scoreboard Metrics Dashboard).

### For Dev Feasibility

- **Primary scope**: Modify `qa-verify-completion-leader.agent.md` to add a `workflow_log_outcome` MCP call in the PASS and FAIL completion paths (Steps 1-4 of the existing agent). This is a docs-only modification — no TypeScript changes required.
- **Secondary scope**: Identify one additional completion point (recommendation: dev-implement-implementation-leader for cancellation/block scenarios, or a new `outcome-log` SKILL.md document as a reusable wrapper).
- **Critical dependency**: WINT-0120 must be merged and `workflow_log_outcome` tool confirmed registered with its final parameter contract before implementing call-sites. Implementer must read the final WINT-0120 story file as the first step.
- **Canonical references for subtask decomposition**:
  - Read `.claude/skills/token-log/SKILL.md` for the fire-and-forget skill invocation pattern.
  - Read `.claude/agents/qa-verify-completion-leader.agent.md` Steps 0-6 to identify the exact insertion point for the outcome call.
  - Read `packages/backend/database-schema/src/schema/wint.ts:997-1050` for `storyOutcomes` field list to ensure all available fields are populated in the call.
  - If adding a new `outcome-log` skill: read `.claude/skills/token-log/SKILL.md` as the template.
- **Complexity**: Low-medium (docs modification + one integration test). Primary risk is WINT-0120 dependency timing and ensuring the quality score formula is agreed before implementation starts.
