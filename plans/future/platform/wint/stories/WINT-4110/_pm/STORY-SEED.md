---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4110

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4010, WINT-4030, WINT-4040, WINT-4050, WINT-4060, WINT-4080, WINT-4090 deliveries. The graph-checker agent (WINT-4060) has been authored and is in-use. Supplemented by direct codebase scan.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| graph-checker agent | `.claude/agents/graph-checker.agent.md` | The agent this command will spawn; already implemented (WINT-4060) |
| Existing slash commands | `.claude/commands/*.md` | Established pattern for command files: YAML frontmatter, usage syntax, phase table, execution section |
| `/qa-verify-story` command | `.claude/commands/qa-verify-story.md` | Most structurally similar: spawns a single-purpose agent, takes FEATURE_DIR + STORY_ID, emits a pass/fail, writes KB artifact |
| `/code-audit` command | `.claude/commands/code-audit.md` | Demonstrates subcommand pattern and parallel agent spawning — relevant if cohesion-check gains scoping flags |
| cohesion-prosecutor agent | WINT-4070 (in-progress) | Downstream consumer of graph-check-results.json — cohesion-check command may optionally chain it |
| backlog-curator agent | WINT-4100 (created) | Second downstream consumer of graph-check-results.json |
| `graph_get_franken_features` | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Primary data source invoked by graph-checker agent |
| Rules registry | `packages/backend/sidecars/rules-registry/`, `packages/backend/mcp-tools/src/rules-registry/` | Active rules loaded by graph-checker during its Phase 2 |

### Active In-Progress Work

| Story | Title | State | Overlap Risk |
|-------|-------|-------|--------------|
| WINT-4040 | Infer Existing Capabilities | failed-code-review | Medium: graph-checker agent requires capabilities data; if WINT-4040 is not merged, graph-checker will return empty results (degrades gracefully) |
| WINT-4070 | Create cohesion-prosecutor Agent | in-progress | Low: WINT-4110 may optionally chain cohesion-prosecutor; the command file itself is independent |

### Constraints to Respect

- Command files live at `.claude/commands/{name}.md` and use a standard YAML frontmatter + markdown body pattern
- Spawning is done via the Task tool with `subagent_type: "general-purpose"` and the agent's `.agent.md` path
- The graph-checker agent already has `spawned_by: cohesion-check-command` in its frontmatter — the command must use the exact invocation protocol the agent expects (story directory path, optional package name filter)
- The graph-checker agent produces `{story_dir}/_implementation/graph-check-results.json` — command must relay where to find output
- Risk Notes in index state "Should auto-run at story completion" — this is a non-goal for WINT-4110 (deferred to WINT-4120); the command enables manual invocation only
- No TypeScript code, no Lambda handlers, no DB migrations — command file is a markdown document only

---

## Retrieved Context

### Related Endpoints

None. This command invokes an agent that uses direct-call MCP tool functions internally. No HTTP endpoints involved.

### Related Components

Not applicable — this is a command file (markdown document), not a UI component.

### Reuse Candidates

| Asset | Location | How Used |
|-------|----------|----------|
| `/qa-verify-story` command structure | `.claude/commands/qa-verify-story.md` | Closest structural analog: single agent spawn, clear usage line, phase table, done/fail sections |
| graph-checker agent | `.claude/agents/graph-checker.agent.md` | The agent spawned by this command; read its Inputs section for exact parameter protocol |
| `/code-audit` flags pattern | `.claude/commands/code-audit.md` | Reference for optional scoping flag (`--package` filter) if included in command signature |

---

## Canonical References

This is an agent-prompt-only / command-file-only story. The deliverable is a single `.md` command file. No TypeScript implementation pattern references are applicable.

| Pattern | File | Why |
|---------|------|-----|
| Command file structure | `.claude/commands/qa-verify-story.md` | Best analog: single-agent spawn, minimal frontmatter, clear usage/execution/done sections |
| Agent with spawned_by field | `.claude/agents/graph-checker.agent.md` | The agent this command will spawn; read Inputs section for required and optional parameters |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2080, WKFL-010]** Command-file and agent-file-only stories: QA verification is purely structural/content — file inspection via grep and read; tests exempt, coverage not applicable.
  - *Applies because*: WINT-4110 delivers only `.claude/commands/cohesion-check.md`. No TypeScript code. Same exemption applies.

- **[WKFL-010]** E2E tests are legitimately exempt for command-file-only stories — document the exemption explicitly in EVIDENCE.yaml known_deviations.
  - *Applies because*: cohesion-check command has no UI surface, no HTTP endpoints, no TypeScript — no Playwright-testable surface.

- **[WKFL-001, WKFL-006]** Review phase waived for documentation-only stories; substitute documentation quality check.
  - *Applies because*: cohesion-check is a docs-only story (command markdown file). Standard TypeScript code review provides no value.

- **[WINT-4060 seed]** The graph-checker agent declares `spawned_by: cohesion-check-command` — the command must align its spawn invocation exactly with the agent's Inputs section expectations.
  - *Applies because*: Mismatched spawn parameters cause agent confusion (story directory path is required; package name filter is optional).

- **[WINT-4060 seed]** Graceful degradation contract: graph-checker handles empty graph and empty rules gracefully by emitting warnings and returning an empty violations list rather than erroring.
  - *Applies because*: The command should surface the agent's `warning_count` in its output so the user understands reduced results.

### Blockers to Avoid (from past stories)

- Do not wait for WINT-4040 to reach `completed` state before authoring the command — the command can be written independently; the dependency only matters at graph-checker runtime
- Do not attempt to implement graph querying logic in the command file — delegation to graph-checker agent is the correct pattern; the command is a thin orchestration wrapper
- Do not add this command to an index or registry unless a registry for commands already exists — check before creating new infrastructure

### Architecture Decisions (ADRs)

ADR-LOG.md was not located at `plans/stories/ADR-LOG.md`. ADR context sourced from codebase evidence and KB lessons.

| Decision | Constraint |
|----------|------------|
| Command files are markdown documents | `.claude/commands/*.md` — no TypeScript, no build step |
| Agent spawning protocol | Task tool with `subagent_type: "general-purpose"`, model declared per agent file |
| graph-checker model | haiku (declared in `.claude/agents/graph-checker.agent.md` frontmatter) |
| Direct-call pattern (ARCH-001) | Graph tools are called inside the agent via direct TypeScript imports — command does not call them directly |

### Patterns to Follow

- YAML frontmatter with `created`, `updated`, `version`, `type: orchestrator`, `agents` list
- Single usage line: `/cohesion-check {FEATURE_DIR} {STORY_ID} [flags]`
- Optional `--package` flag forwarded to graph-checker as its optional `packageName` parameter
- Phase table (even if just one phase)
- Execution section showing exact Task tool invocation pattern (model: haiku, read agent file, pass story dir path)
- Done/output section describing where results are written (`{STORY_DIR}/_implementation/graph-check-results.json`) and how to interpret them
- Completion signal relay: surface `GRAPH-CHECKER COMPLETE`, `GRAPH-CHECKER COMPLETE WITH WARNINGS: {N}`, or `GRAPH-CHECKER BLOCKED: {reason}` to the user

### Patterns to Avoid

- Do not embed graph query logic in the command file — delegate entirely to the agent
- Do not create a new output artifact schema — graph-checker's `graph-check-results.json` is the output; the command merely points to it
- Do not auto-chain cohesion-prosecutor in this story — that integration is deferred to WINT-4120

---

## Conflict Analysis

### Conflict: Dependency chain not yet stable (WINT-4040 in failed-code-review)

- **Severity**: warning
- **Description**: WINT-4040 (Infer Existing Capabilities) is in `failed-code-review`. Without capability data, graph-checker's Phase 2 will find franken-features but may produce limited or empty violations. The command file can be authored independently — this is a runtime concern only.
- **Resolution Hint**: Author the command now. Note in the command's output section that graph-checker degrades gracefully (empty violations + warnings) when capability data is absent. No change to the command file is needed when WINT-4040 eventually stabilizes.

### Conflict: Auto-run integration deferred (Risk Note in index)

- **Severity**: warning
- **Description**: The index Risk Notes state "Should auto-run at story completion." WINT-4110 explicitly delivers manual invocation only. Automated integration is WINT-4120's scope.
- **Resolution Hint**: Add a Non-Goals section to the command file explicitly stating: "Auto-run at story completion is deferred to WINT-4120 (Integrate Cohesion Checks into Workflow)." This prevents scope creep during implementation.

---

## Story Seed

### Title

Create /cohesion-check Command

### Description

**Context**: The WINT Phase 4 cohesion subsystem has delivered its graph-checker agent (WINT-4060), which queries the feature cohesion graph, applies active rules, and produces a machine-readable `graph-check-results.json` report. The agent declares `spawned_by: cohesion-check-command` but no such command file exists yet.

**Problem**: Developers and agents cannot manually trigger a cohesion check for a given feature area. The graph-checker agent can only be spawned programmatically if someone constructs the Task invocation by hand. There is no simple, discoverable entry point for cohesion verification.

**Proposed Solution**: Create a `.claude/commands/cohesion-check.md` command file that:
1. Accepts `FEATURE_DIR`, `STORY_ID`, and optional `--package` flag as parameters
2. Spawns the graph-checker agent (haiku) with the story directory path and optional package name filter
3. Waits for the agent's completion signal
4. Reports results location (`{STORY_DIR}/_implementation/graph-check-results.json`) and surfaces the violation summary to the user
5. Follows established command file conventions (YAML frontmatter, usage line, phase table, execution section, done section)

This command is the manual entry point for cohesion verification. Automated integration at story completion is deferred to WINT-4120.

### Initial Acceptance Criteria

- [ ] **AC-1**: A file `.claude/commands/cohesion-check.md` exists with valid YAML frontmatter containing `created`, `updated`, `version`, `type: orchestrator`, and `agents: ["graph-checker.agent.md"]`
- [ ] **AC-2**: The command file defines a usage line: `/cohesion-check {FEATURE_DIR} {STORY_ID} [--package <name>]` with parameter descriptions
- [ ] **AC-3**: The command file defines a phase table with at minimum: Phase 0 — `graph-checker.agent.md` (haiku), expected signal `GRAPH-CHECKER COMPLETE`
- [ ] **AC-4**: The execution section shows the exact Task tool invocation: `subagent_type: "general-purpose"`, `model: "haiku"`, `prompt` includes `Read instructions: .claude/agents/graph-checker.agent.md` and passes story directory path and optional package name filter
- [ ] **AC-5**: The command file documents the output location: `{STORY_DIR}/_implementation/graph-check-results.json` and describes the key fields (`franken_features_found`, `violations`, `warning_count`)
- [ ] **AC-6**: The command file relays all three graph-checker completion signals to the user: `GRAPH-CHECKER COMPLETE`, `GRAPH-CHECKER COMPLETE WITH WARNINGS: {N}`, and `GRAPH-CHECKER BLOCKED: {reason}`, with guidance for each outcome
- [ ] **AC-7**: The command file includes a Non-Goals section explicitly stating that auto-run at story completion is deferred to WINT-4120
- [ ] **AC-8**: The `--package` flag is documented as optional; when provided, it is forwarded to graph-checker as the `packageName` filter parameter (per graph-checker agent Inputs section)

### Non-Goals

- Do NOT implement any TypeScript code, MCP tools, or Lambda handlers
- Do NOT auto-chain cohesion-prosecutor or backlog-curator agents — manual invocation only (integration deferred to WINT-4120)
- Do NOT create a new output schema — `graph-check-results.json` is defined by the graph-checker agent (WINT-4060)
- Do NOT add auto-run hooks to `dev-implement-story` or `qa-verify-story` in this story — that is WINT-4120's scope
- Do NOT modify the graph-checker agent file — it is already complete (WINT-4060)
- Do NOT add the command to any registry or index unless such a registry already exists

### Reuse Plan

- **Components**: Not applicable (no TypeScript code)
- **Patterns**: `.claude/commands/qa-verify-story.md` frontmatter and section structure; Task tool spawn pattern from existing commands
- **Packages**: References to `graph-checker.agent.md` and its output schema; no package imports needed in the command file itself

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a command-file-only story. The deliverable is a single `.md` file. QA verification strategy:
- Tests are exempt — no TypeScript code to test
- Coverage is not applicable — no TypeScript source files
- E2E is exempt — no UI surface, no HTTP endpoints
- QA verification is structural/content: verify file exists, frontmatter is valid YAML, all required sections present, usage line correct, execution section matches graph-checker's required inputs, output location documented, completion signals documented
- Document all exemptions explicitly in `EVIDENCE.yaml` `known_deviations`
- Recommend documentation quality check (YAML frontmatter validity, cross-reference to graph-checker agent Inputs section) as the substitute quality gate

### For UI/UX Advisor

Not applicable. This story produces a slash command markdown file with no user-facing UI. The "UX" concern is discoverability and clarity of the command's output section — a developer running `/cohesion-check` should immediately understand where results are and what violations mean.

### For Dev Feasibility

- **Complexity**: Very low. The deliverable is a single markdown file following established command conventions.
- **Key files to read before authoring**:
  - `.claude/commands/qa-verify-story.md` — closest structural analog; use as skeleton
  - `.claude/agents/graph-checker.agent.md` — read Inputs section (required: story directory path; optional: packageName) and Completion Signals section carefully
- **Subtask suggestion**: Single subtask — author `.claude/commands/cohesion-check.md` using `qa-verify-story.md` as skeleton, adapting execution section for graph-checker parameters and output section for `graph-check-results.json`. Estimated 1,500–2,500 tokens.
- **No risks**: WINT-4040's failed-code-review state does not affect authoring this command file. The command delegates entirely to graph-checker, which handles empty data gracefully.
- **Canonical references for subtask decomposition**:
  - Structural template: `.claude/commands/qa-verify-story.md`
  - Agent input protocol: `.claude/agents/graph-checker.agent.md` (Inputs section, Completion Signals section)
