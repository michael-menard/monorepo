---
created: 2026-03-08
updated: 2026-03-08
version: 1.0.0
type: orchestrator
agents: ["graph-checker.agent.md"]
---

/cohesion-check {FEATURE_DIR} {STORY_ID} [--package <name>]

Triggers the graph-checker agent to detect franken-features and cohesion rule violations for a given story context.

## Usage

```
/cohesion-check plans/future/platform/wint WINT-4110
/cohesion-check plans/future/platform/wint WINT-4110 --package @repo/ui
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `{FEATURE_DIR}` | yes | Path to the feature directory (e.g., `plans/future/platform/wint`) |
| `{STORY_ID}` | yes | Story identifier (e.g., `WINT-4110`) |
| `--package <name>` | no | Optional package name filter (e.g., `@repo/ui`). When provided, scopes `graph_get_franken_features` to a single package via the `packageName` parameter. When omitted, all packages are queried. |

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `graph-checker.agent.md` | haiku | GRAPH-CHECKER COMPLETE |

## Execution

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Cohesion check {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/graph-checker.agent.md

    Story directory path: {FEATURE_DIR}/*/{STORY_ID}
    Story ID: {STORY_ID}
    Package name filter: {package_name or "none"}

    Run all 4 phases (Load Inputs, Query Graph, Apply Rules, Produce Output).
    Write graph-check-results.json to the story _implementation/ directory.
    Emit exactly one completion signal when done.
```

- Wait for signal
- BLOCKED → stop, report reason
- COMPLETE / COMPLETE WITH WARNINGS → report results

## Output

The graph-checker agent writes its results to:

```
{STORY_DIR}/_implementation/graph-check-results.json
```

### Key fields

| Field | Type | Description |
|-------|------|-------------|
| `franken_features_found` | integer | Count of incomplete features detected by `graph_get_franken_features` |
| `violations` | array | Violation objects with `rule_id`, `feature_id`, `feature_name`, `description`, `severity`, `actionable_hint` |
| `warning_count` | integer | Count of degradation warnings (e.g., empty graph, empty rules registry) |

See `.claude/agents/graph-checker.agent.md` Output section for the full schema.

## Completion Signals

The graph-checker agent emits exactly one of:

| Signal | Meaning | Guidance |
|--------|---------|----------|
| `GRAPH-CHECKER COMPLETE` | Check finished successfully, no degradation warnings | Review `graph-check-results.json` for violations. Zero violations means the feature is cohesion-clean. |
| `GRAPH-CHECKER COMPLETE WITH WARNINGS: {N}` | Check finished but with {N} degradation warnings | Warnings indicate missing runtime data (e.g., empty graph from WINT-4030, empty rules from WINT-4050). Check `warnings` array in `graph-check-results.json` for details. Results may be incomplete. |
| `GRAPH-CHECKER BLOCKED: {reason}` | Unrecoverable failure, check could not run | The reason describes the blocker (e.g., output directory unknown). Resolve the issue and re-run. |

**Note:** When WINT-4040 (Infer Existing Capabilities) is not yet stable, graph-checker degrades gracefully — capability data may be absent, resulting in `GRAPH-CHECKER COMPLETE WITH WARNINGS` with the specific degradation condition noted in the warnings array.

## Non-Goals

- Do NOT auto-chain cohesion-prosecutor (WINT-4070) or backlog-curator (WINT-4100) from this command — manual invocation only
- Auto-run at story completion (integration into `dev-implement-story` and `qa-verify-story`) is deferred to WINT-4120
- This command does not modify graph data, rules, or create stories — it is read-only detection

## Error

Report: "{STORY_ID} cohesion check blocked: {reason}"

## Done

Report results to user:
- Signal received (COMPLETE, WITH WARNINGS, or BLOCKED)
- Number of franken-features found
- Number of violations detected
- Warning count (if any)
- Path to `graph-check-results.json` for full details
