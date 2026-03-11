---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-3060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 3 telemetry infrastructure. WINT-0040 (telemetry tables) is in ready-for-qa, WINT-0120 (telemetry MCP tools) is ready-to-work — neither is confirmed live/deployed at baseline date.

### Relevant Existing Features

| Feature | Status | Location | Relevance |
|---------|--------|----------|-----------|
| Knowledge Base (pgvector) | deployed | `apps/api/knowledge-base/` | MCP server that WINT-0120 extends; command will call workflow_get_story_telemetry |
| WINT-0040: Telemetry Tables | ready-for-qa | `plans/future/platform/wint/ready-for-qa/WINT-0040/` | Creates `wint.agent_invocations`, `wint.hitl_decisions`, `wint.story_outcomes` — the tables this command queries |
| WINT-0120: Telemetry MCP Tools | in-progress | `plans/future/platform/wint/in-progress/WINT-0120/` | Delivers `workflow_get_story_telemetry` MCP tool this command depends on |
| WINT-3010: Gatekeeper Sidecar | ready-for-code-review | `plans/future/platform/wint/failed-code-review/WINT-3010/` | Dependency (per index); currently in failed-code-review state |
| WINT-3030: telemetry-logger Agent | needs-code-review | `plans/future/platform/wint/needs-code-review/WINT-3030/` | Dependency; agent that logs invocations — data source for this command |
| WINT-3040: Decision Logging Skill | ready-to-work | `plans/future/platform/wint/ready-to-work/WINT-3040/` | Dependency; logs decisions into `wint.hitl_decisions` — data source for this command |
| story-status command | deployed | `.claude/commands/story-status.md` (v5.0.0) | Reference command; DB-first routing pattern to follow |
| model-leaderboard command | deployed | `.claude/commands/model-leaderboard.md` (v1.0.0) | Reference command; read-only utility with optional filters |
| calibration-report command | deployed | `.claude/commands/calibration-report.md` (v1.0.0) | Reference command; structured analysis report from DB data |
| cohesion-check command | deployed | `.claude/commands/cohesion-check.md` (v1.0.0) | Reference command; spawns agent via Task tool, returns structured results |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-3010 | failed-code-review (fix cycle, ready-for-code-review per index) | Hard dependency — this command depends on gatekeeper sidecar being live |
| WINT-3020 | needs-code-review | Depends on WINT-0120; invocation logging skill writes data this command will read |
| WINT-3030 | needs-code-review | Depends on WINT-3010, WINT-3020; agent that drives telemetry writes |
| WINT-3040 | ready-to-work | Decision logging with embeddings — data source for decisions view |
| WINT-0120 | in-progress | Core MCP tools dependency (`workflow_get_story_telemetry`) |

### Constraints to Respect

- `wint.*` tables (agent_invocations, hitl_decisions, story_outcomes) are the telemetry data store — do NOT read from `telemetry.*` schema unless redirected; index entries reference `wint.` tables in WINT-0040 and WINT-0120 stories
- `workflow_get_story_telemetry` MCP tool is the canonical read interface — do NOT issue raw SQL from command files
- Command files are docs-only (`.claude/commands/`); no TypeScript or DB schema changes in this story
- Query performance risk is noted in the index — the command should page/limit results, not dump entire tables
- ADR-005: UAT must use real postgres-knowledgebase port 5433, no mocks

---

## Retrieved Context

### Related Endpoints

| Endpoint / Tool | Where | Notes |
|-----------------|-------|-------|
| `workflow_get_story_telemetry` | MCP tool via postgres-knowledgebase port 5433 | Primary read interface; returns `{ invocations, decisions, outcome }` per storyId |
| `workflow_log_invocation` | MCP tool | Write path (not called by this command, but defines the invocations schema) |
| `workflow_log_decision` | MCP tool | Write path (not called by this command, but defines decisions schema) |
| `workflow_log_outcome` | MCP tool | Write path (not called by this command, but defines outcome schema) |
| `story_get_status` | MCP tool | Pattern reference for DB-first story queries in story-status.md |

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `story-status.md` | `.claude/commands/story-status.md` | DB-first routing pattern, fallback strategy |
| `model-leaderboard.md` | `.claude/commands/model-leaderboard.md` | Optional filter flags pattern (`--task`, `--model`) |
| `calibration-report.md` | `.claude/commands/calibration-report.md` | Structured report pattern, agent spawn pattern |
| `cohesion-check.md` | `.claude/commands/cohesion-check.md` | Task tool spawn pattern, BLOCKED/COMPLETE signals |

### Reuse Candidates

- **Command frontmatter pattern**: Copy from `calibration-report.md` — `type: utility`, `permission_level: docs-only`
- **Optional filter pattern**: `--since=YYYY-MM-DD` and `--story=STORY_ID` from `calibration-report.md` and `model-leaderboard.md`
- **DB-first routing with fallback**: Mirror `story-status.md` approach — call MCP tool, degrade gracefully if unavailable
- **Task tool spawn pattern** (if agent needed): Mirror `cohesion-check.md` — spawn haiku agent, wait for signal
- **Error table pattern**: Follow `model-leaderboard.md` Error Handling section

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Utility command with optional filters | `.claude/commands/model-leaderboard.md` | Clean `--flag VALUE` pattern, graceful empty-state handling, LEADERBOARD RENDERED signal |
| Agent spawn command with structured output | `.claude/commands/cohesion-check.md` | Task tool invocation, COMPLETE/BLOCKED signal handling, results written to known path |
| DB-first routing command | `.claude/commands/story-status.md` | story_get_status MCP call → DB hit/miss → directory fallback — exact pattern needed here |
| Structured analysis report command | `.claude/commands/calibration-report.md` | Date range filters, KB/DB query, output format documentation |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1060]** For docs-only command stories, EVIDENCE.yaml `commands_run[]` entries are sufficient QA evidence — no pnpm test required.
  - *Applies because*: WINT-3060 is a `.claude/commands/` markdown file only. No TypeScript deliverable. QA should mark `tests_exempt: true` and rely on manual read-verification of command file against each AC.

- **[WINT-1060]** Telemetry hook pre-wire: story-move and other commands should include comment hooks for WINT-3070 instrumentation. The telemetry command itself should not need instrumentation hooks (it is the read interface), but this sets the pattern context.
  - *Applies because*: When implementing, note that WINT-3070 will add telemetry-log calls to this command's upstream commands; this command surfaces that data.

- **[WINT-4010]** MCP wrappers should call compute functions directly, not via HTTP. The telemetry command calls `workflow_get_story_telemetry` which is an MCP tool — verify it calls DB directly, not via HTTP intermediary.
  - *Applies because*: If the command eventually spawns an agent that wraps the MCP call, prefer direct function calls over HTTP intermediaries.

### Blockers to Avoid (from past stories)

- Do NOT start UAT/QA before WINT-0120 MCP tools are live on postgres-knowledgebase — the command cannot be validated without `workflow_get_story_telemetry` existing
- Do NOT assume `wint.agent_invocations` table exists without WINT-0040 migration being applied
- Do NOT hardcode query limits without parameterization — query performance is flagged as a risk
- Do NOT add mocks in UAT (ADR-005)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not directly applicable (no HTTP endpoint exposed by this command); telemetry data comes from MCP tools on postgres-knowledgebase port 5433 |
| ADR-005 | Testing Strategy | UAT must use real postgres-knowledgebase (port 5433), real telemetry tables — no mocks |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` for this story; E2E tests may be skipped per skip conditions |

### Patterns to Follow

- **DB-first MCP call with graceful degradation**: Call `workflow_get_story_telemetry`, handle null/empty result with informative empty-state message
- **Optional flags with defaults**: `--story STORY_ID` (filter to one story), `--since DATE` (date range), `--limit N` (row cap for performance)
- **Docs-only command**: Single `.claude/commands/telemetry.md` file; no TypeScript, no schema changes
- **Completion signal**: Emit `TELEMETRY RENDERED` or `TELEMETRY ERROR: {reason}` (pattern from model-leaderboard)

### Patterns to Avoid

- Do NOT spawn an agent (WINT-3030 is the agent for writing telemetry; this command is for reading — keep it simple, direct MCP call)
- Do NOT add a new MCP tool for querying — `workflow_get_story_telemetry` already exists (WINT-0120); reuse it
- Do NOT display raw DB rows — format into human-readable tables
- Do NOT accept storyId as positional arg without validation — use `--story STORY_ID` flag style consistent with other commands

---

## Conflict Analysis

### Conflict: Dependency Not Yet Live (blocking)
- **Severity**: blocking
- **Description**: WINT-3060 depends on WINT-3010, WINT-3030, and WINT-3040 per the stories index. WINT-3010 is currently in `failed-code-review` state (fix cycle complete, back to ready-for-code-review). WINT-3030 is in `needs-code-review`. WINT-3040 is `ready-to-work`. None have reached UAT/completed. Additionally, WINT-0120 (the `workflow_get_story_telemetry` MCP tool) is `in-progress`. The story cannot be validated (UAT) until these dependencies are live.
- **Resolution Hint**: Story seed and elaboration can proceed now. Implementation should be gated until WINT-0120 reaches UAT. UAT for WINT-3060 must wait until all three Phase 3 dependencies (WINT-3010, WINT-3030, WINT-3040) are at UAT or completed. Mark story as `pending` with dependency notes; do not move to `ready-to-work` until WINT-0120 is UAT.

### Conflict: Dependency Mismatch — Index vs Story Files (warning)
- **Severity**: warning
- **Description**: The stories index lists WINT-3010, WINT-3030, WINT-3040 as dependencies. However, WINT-3010's story file lists it as blocking WINT-3020, WINT-3030, and WINT-3060 — consistent. But WINT-3040 (Decision Logging) only depends on WINT-0120 directly; the connection to WINT-3060 is that WINT-3060 surfaces decision data logged by WINT-3040's skill. This is a functional dependency (data dependency) not a code dependency. The /telemetry command can technically run before WINT-3040 is live — it will just return empty decisions. The hard dependency is WINT-0120 and WINT-3010/3030 for meaningful data.
- **Resolution Hint**: Clarify in ACs whether WINT-3040 is a hard gate or soft dependency. Recommended: gate UAT on WINT-0120 and WINT-3010 only; WINT-3040 is a "data enrichment" dependency. Update AC to specify "decisions section returns empty array if no decisions have been logged yet — this is valid behavior."

---

## Story Seed

### Title
Create Telemetry Query Command (`/telemetry`)

### Description

**Context**: Phase 3 of the WINT platform epic introduces full observability over agent invocations and human decisions. WINT-0040 creates `wint.agent_invocations`, `wint.hitl_decisions`, and `wint.story_outcomes` tables. WINT-0120 delivers `workflow_get_story_telemetry` as the canonical MCP read interface. WINT-3020/3030/3040 populate those tables during workflow execution.

**Problem**: There is currently no human-facing interface to review what telemetry has been captured for a given story. Platform operators and developers cannot easily inspect: how many agent invocations occurred, what human decisions were made, or what the final outcome verdict was for a story. This makes it impossible to validate that telemetry collection (WINT-3080 validation story) is working correctly.

**Proposed Solution**: Create a read-only `/telemetry` command that accepts an optional `--story STORY_ID` filter and displays a formatted summary of: (1) agent invocations count and breakdown by status/agent, (2) HITL decisions count and listing, (3) story outcome verdict. The command calls `workflow_get_story_telemetry` MCP tool on postgres-knowledgebase (port 5433) and formats the response for human review. When no storyId is provided, it should show a summary across recent stories or provide guidance. Query performance is mitigated by default limits on returned rows.

### Initial Acceptance Criteria

- [ ] AC-1: `/telemetry` command file exists at `.claude/commands/telemetry.md` with valid frontmatter (`type: utility`, `permission_level: docs-only`, `created`, `updated`, `version`)
- [ ] AC-2: `/telemetry --story STORY_ID` calls `workflow_get_story_telemetry({ storyId: STORY_ID })` MCP tool and displays formatted output showing: invocation count, decision count, and outcome verdict (or "no outcome recorded")
- [ ] AC-3: When MCP tool returns empty result (no data for storyId), the command displays "No telemetry data found for STORY_ID" — does not throw or display raw null
- [ ] AC-4: When MCP tool is unavailable (connection error), the command displays "Telemetry service unavailable. Ensure postgres-knowledgebase is running on port 5433." and exits gracefully
- [ ] AC-5: Command accepts `--story STORY_ID` as the primary filter (required for meaningful output); when invoked without `--story`, it displays a usage hint and example rather than attempting an unfiltered query
- [ ] AC-6: Invocations section displays agent_name, status (success/failure), duration_ms (if available), and model_name (if available) in a formatted table — capped at 20 rows by default
- [ ] AC-7: Decisions section displays decision_type, decision_text (truncated to 80 chars), and operator_id in a formatted table
- [ ] AC-8: Command documents a `--limit N` optional flag that overrides the default 20-row cap (for power users inspecting high-volume stories)
- [ ] AC-9: Command emits exactly one of: `TELEMETRY RENDERED`, `TELEMETRY EMPTY: {storyId}`, or `TELEMETRY ERROR: {reason}` as its completion signal

### Non-Goals

- Do NOT create a new MCP tool — `workflow_get_story_telemetry` (WINT-0120) is the data source
- Do NOT add aggregate analytics or trend charts — that scope belongs to WINT-3090 (scoreboard metrics)
- Do NOT query `telemetry.state_transitions` — that table is created by WINT-3100 and is out of scope
- Do NOT display model cost calculations — that belongs to WINT-0260 (model cost tracking)
- Do NOT spawn a subagent for this command — it is a simple read/format operation that runs inline
- Do NOT add write capability (update/delete telemetry) — read-only only
- Protected: `apps/api/knowledge-base/` source files must not be modified; DB schema must not be modified

### Reuse Plan

- **Components**: `workflow_get_story_telemetry` MCP tool from WINT-0120; existing command frontmatter pattern
- **Patterns**: Optional filter flags from `model-leaderboard.md`; graceful empty-state from `story-status.md`; error table from `model-leaderboard.md`; RENDERED/EMPTY/ERROR signal pattern
- **Packages**: None — docs-only story

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Story is docs-only (single `.claude/commands/telemetry.md` markdown file). No TypeScript code. No database schema changes.
- Test strategy should be: UAT-only, manual read-verification against ACs, using real postgres-knowledgebase on port 5433 (ADR-005 — no mocks in UAT).
- Mark `tests_exempt: true` in QA-VERIFY.yaml; use `commands_run[]` entries in EVIDENCE.yaml as primary evidence (established pattern from WINT-1060 docs-only command stories).
- UAT prerequisite: WINT-0120 must be at UAT (so `workflow_get_story_telemetry` is live). Without this, UAT-2 (call real MCP tool, verify real DB return) cannot pass.
- Happy path test: invoke `/telemetry --story WINT-TEST-01` with pre-seeded rows in `wint.agent_invocations`, verify formatted table output.
- Error case test: invoke with MCP tool unavailable, verify graceful error message (not raw exception).
- Edge case: invoke without `--story` flag, verify usage hint is shown rather than unfiltered dump.
- Performance: verify default 20-row cap applies to invocations — test with a story that has 25 invocations and confirm only 20 are shown.

### For UI/UX Advisor

- This is a Claude command (`.claude/commands/`), not a web UI component. No React, no Tailwind.
- Output is rendered as Markdown in the Claude conversation context.
- Key UX concern: the command should be usable by both developers checking a specific story and by operators doing a quick sanity check. The `--story STORY_ID` flag is the primary mode.
- When no `--story` is provided, show a concise usage guide (1-3 lines max) rather than an error — lower friction for new users.
- Invocation table: show the most useful columns only (agent_name, status, durationMs, model). Don't show invocationId unless user asks for verbose mode.
- Truncate decision_text to 80 chars with `...` to keep the table scannable.
- Consider `--verbose` flag as a non-goal for Phase 3 but note it as a future UX enhancement.

### For Dev Feasibility

- **Confidence**: High. This is a docs-only markdown command file. No TypeScript implementation. Estimated 0.5 story points.
- **Critical path**: The only hard prerequisite is WINT-0120 reaching UAT (so `workflow_get_story_telemetry` parameter schema is finalized). Implementation should read WINT-0120 story file to confirm final tool interface before writing the command.
- **Canonical references for subtask decomposition**:
  - Read `.claude/commands/model-leaderboard.md` for flag parsing and signal pattern
  - Read `.claude/commands/story-status.md` for MCP call with fallback pattern
  - Read WINT-0120 story file (`plans/future/platform/wint/in-progress/WINT-0120/WINT-0120.md`) to confirm `workflow_get_story_telemetry` input/output schema before drafting command
- **Subtask suggestion**:
  - ST-1: Draft frontmatter + Usage section + Arguments table
  - ST-2: Draft Implementation section (MCP call, format invocations table, format decisions table, format outcome section)
  - ST-3: Draft Error Handling table + Completion Signals section
  - ST-4: Self-review against all 9 ACs
- **Risk**: WINT-3010 is in `failed-code-review` fix cycle. If WINT-3010's code review reveals breaking changes to the gatekeeper interface, it could affect what "gate stage" context appears in invocation logs. However, since this command reads via `workflow_get_story_telemetry` (not gatekeeper directly), the command itself is insulated from gatekeeper API changes. Low risk.
- **Query performance mitigation**: Document `--limit N` flag clearly; default to 20 rows per section; add a note that high-volume stories (100+ invocations per run) should use `--limit` explicitly.
