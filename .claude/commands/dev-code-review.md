---
created: 2026-01-24
updated: 2026-01-25
version: 4.0.0
type: orchestrator
agents: ["code-review-lint.agent.md", "code-review-style-compliance.agent.md", "code-review-syntax.agent.md", "code-review-security.agent.md", "code-review-typecheck.agent.md", "code-review-build.agent.md"]
---

Usage: /dev-code-review {FEATURE_DIR} {STORY_ID}

Code review orchestrator. Spawn workers - do NOT review code yourself.

**Selective Re-Review**: On iteration 2+, only re-runs failed workers + typecheck + build. Passed workers are carried forward.

## Usage

```
/dev-code-review plans/future/wishlist WISH-001
```

## Phases

| # | Phase | Model | Workers | Signal |
|---|-------|-------|---------|--------|
| 0 | Setup | haiku | (self) | SETUP COMPLETE |
| 1 | Review | sonnet | failed + typecheck + build (or all 6 on first run) | REVIEW COMPLETE |
| 2 | Aggregate | haiku | (self) | AGGREGATE COMPLETE |
| 3 | Finalize | haiku | (self) | CODE-REVIEW COMPLETE |

## Phase 0 — Setup

Validate (HARD STOP if fail):
- Story has `status: ready-for-code-review`
- `PROOF-{STORY_ID}.md` exists in `{FEATURE_DIR}/in-progress/{STORY_ID}/`

Extract touched files from:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/BACKEND-LOG.md`
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/FRONTEND-LOG.md`
- `{FEATURE_DIR}/in-progress/{STORY_ID}/PROOF-{STORY_ID}.md`

## Phase 1 — Parallel Reviews

**SELECTIVE RE-REVIEW OPTIMIZATION**

Check if `VERIFICATION.yaml` exists from a previous review cycle:
- If NO previous review: Run all 6 workers
- If previous review exists with FAIL verdict: Only re-run failed workers + typecheck + build

### Determine Workers to Run

```python
workers_to_run = []
carried_forward = {}

verification_path = f"{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/VERIFICATION.yaml"

if file_exists(verification_path):
    prev = read_yaml(verification_path)

    # Always re-run these (fixes could break compilation)
    always_run = ["typecheck", "build"]

    for worker in ["lint", "style", "syntax", "security", "typecheck", "build"]:
        prev_verdict = prev.code_review[worker].verdict

        if worker in always_run:
            workers_to_run.append(worker)
        elif prev_verdict == "FAIL":
            workers_to_run.append(worker)
        else:
            # Carry forward PASS result
            carried_forward[worker] = prev.code_review[worker]
            carried_forward[worker]["skipped"] = True
else:
    # First review - run all
    workers_to_run = ["lint", "style", "syntax", "security", "typecheck", "build"]
```

### Spawn Workers

Spawn workers_to_run in SINGLE message (parallel):

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  run_in_background: true
  description: "{worker} review {STORY_ID}"
  prompt: |
    Read: .claude/agents/code-review-{worker}.agent.md
    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    touched_files: <list>
    Return YAML only.
```

Wait for all spawned workers to complete.

### Report Skipped Workers

If any workers were skipped, report:
```
Skipped (carried forward from previous PASS):
- lint: PASS (skipped)
- style: PASS (skipped)
```

## Phase 2 — Aggregate

Create/update `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/VERIFICATION.yaml`:

```yaml
schema: 4
feature_dir: "{FEATURE_DIR}"
story: {STORY_ID}
updated: <timestamp>

code_review:
  verdict: PASS | FAIL
  workers_run: [<workers that ran this iteration>]
  workers_skipped: [<workers carried forward>]

  lint:
    verdict: PASS | FAIL
    skipped: false | true  # true if carried forward
    errors: <count>
    findings: [...]
  style:
    verdict: PASS | FAIL
    skipped: false | true
    violations: <count>
    findings: [...]
  syntax:
    verdict: PASS | FAIL
    skipped: false | true
    blocking: <count>
    findings: [...]
  security:
    verdict: PASS | FAIL
    skipped: false | true
    critical: <count>
    high: <count>
    medium: <count>
    findings: [...]
  typecheck:
    verdict: PASS | FAIL
    skipped: false  # Always runs
    errors: <count>
    findings: [...]
  build:
    verdict: PASS | FAIL
    skipped: false  # Always runs
    errors: <count>
    findings: [...]
```

**Aggregation Rules:**
- Include results from workers that ran this iteration
- Merge in carried_forward results (with `skipped: true`)
- Verdict: ANY worker FAIL → FAIL | All 6 PASS → PASS

## Phase 3 — Finalize

| Verdict | Status | Next |
|---------|--------|------|
| PASS | `ready-for-qa` | `/qa-verify-story {FEATURE_DIR} {STORY_ID}` |
| FAIL | `code-review-failed` | `/dev-fix-story {FEATURE_DIR} {STORY_ID}` |

Token log: `/token-log {STORY_ID} code-review <in> <out>`

## Done

Report: `CODE-REVIEW COMPLETE: <verdict>`
State next command.

## Ref

`docs/dev-code-review-reference.md`
