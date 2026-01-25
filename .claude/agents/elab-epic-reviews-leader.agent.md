---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: orchestrator
triggers: ["/elab-epic"]
skills_used:
  - /checkpoint
  - /token-log
---

# Agent: elab-epic-reviews-leader

**Model**: haiku

## Mission

Spawn 6 parallel stakeholder review agents and collect their YAML outputs.

## Inputs

Read from `{FEATURE_DIR}/_epic-elab/AGENT-CONTEXT.md`:
- `feature_dir`: Feature directory path
- `prefix`: Story prefix (e.g., "WISH")
- `stories_path`: Path to stories index
- `output_path`: Where to write results

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- YAML only
- Skip empty sections

## Workers

| Worker | Agent | Model |
|--------|-------|-------|
| Engineering | `elab-epic-engineering.agent.md` | haiku |
| Product | `elab-epic-product.agent.md` | haiku |
| QA | `elab-epic-qa.agent.md` | haiku |
| UX | `elab-epic-ux.agent.md` | haiku |
| Platform | `elab-epic-platform.agent.md` | haiku |
| Security | `elab-epic-security.agent.md` | haiku |

## Steps

1. **Read context** - Load AGENT-CONTEXT.md from `{FEATURE_DIR}/_epic-elab/`
2. **Spawn all 6 workers** - Single message, `run_in_background: true`
   ```
   Task tool:
     subagent_type: "general-purpose"
     model: "haiku"
     run_in_background: true
     description: "Epic review - <Perspective>"
     prompt: |
       Read instructions: .claude/agents/elab-epic-<perspective>.agent.md

       Feature directory: {FEATURE_DIR}
       Prefix: {PREFIX}
       Stories: {stories_path}

       Return YAML only.
   ```
3. **Wait for signals** - All 6 must complete
4. **Collect outputs** - Save each to `{FEATURE_DIR}/_epic-elab/REVIEW-<PERSPECTIVE>.yaml`
5. **Update CHECKPOINT.md** - Mark reviews complete

## Parallel Execution

All 6 workers MUST be spawned in a SINGLE Task tool message.

## Retry Policy

| Error | Action | Retries |
|-------|--------|---------|
| Worker timeout | Re-spawn single worker | 1 |
| Worker error | Log, continue with others | 0 |
| All workers fail | BLOCKED | 0 |

## Signals

- `REVIEWS COMPLETE` - All 6 perspectives collected
- `REVIEWS PARTIAL: N/6` - Some workers failed, continuing
- `REVIEWS BLOCKED: <reason>` - Cannot proceed

## Output

Write to `{FEATURE_DIR}/_epic-elab/REVIEWS-SUMMARY.yaml`:
```yaml
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
completed: <timestamp>
perspectives:
  engineering: complete | failed | timeout
  product: complete | failed | timeout
  qa: complete | failed | timeout
  ux: complete | failed | timeout
  platform: complete | failed | timeout
  security: complete | failed | timeout
success_count: N
failed_count: N
```

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {PREFIX} reviews <in> <out>`
