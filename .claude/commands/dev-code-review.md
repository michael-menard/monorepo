---
created: 2026-01-24
updated: 2026-02-01
version: 5.0.0
type: orchestrator
agents: ["code-review-lint.agent.md", "code-review-style-compliance.agent.md", "code-review-syntax.agent.md", "code-review-security.agent.md", "code-review-typecheck.agent.md", "code-review-build.agent.md", "review-aggregate-leader.agent.md"]
schema: packages/backend/orchestrator/src/artifacts/review.ts
---

Usage: /dev-code-review {FEATURE_DIR} {STORY_ID}

Code review orchestrator. Spawn workers - do NOT review code yourself.

**Evidence-First**: Reads touched_files from EVIDENCE.yaml. Outputs REVIEW.yaml.

**Selective Re-Review**: On iteration 2+, only re-runs failed workers + typecheck + build. Passed workers are carried forward.

## Usage

```
/dev-code-review plans/future/wishlist WISH-001
```

## Phases

| # | Phase | Model | Workers | Signal |
|---|-------|-------|---------|--------|
| 0 | Setup | haiku | (self) | SETUP COMPLETE |
| 1 | Review | haiku | failed + typecheck + build (or all 6 on first run) | REVIEW COMPLETE |
| 2 | Aggregate | haiku | review-aggregate-leader | AGGREGATE COMPLETE |
| 3 | Finalize | haiku | (self) | CODE-REVIEW COMPLETE |

## Phase 0 — Setup

Validate (HARD STOP if fail):
- Story has `status: ready-for-code-review`
- `EVIDENCE.yaml` exists in `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/`

Extract touched files from EVIDENCE.yaml:
```yaml
# Read {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/EVIDENCE.yaml
touched_files = evidence.touched_files.map(f => f.path)
```

## Phase 1 — Parallel Reviews

**SELECTIVE RE-REVIEW OPTIMIZATION**

Check if `REVIEW.yaml` exists from a previous review cycle:
- If NO previous review: Run all 6 workers
- If previous review exists with FAIL verdict: Only re-run failed workers + typecheck + build

### Determine Workers to Run

```python
workers_to_run = []
carried_forward = {}

review_path = f"{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/REVIEW.yaml"

if file_exists(review_path):
    prev = read_yaml(review_path)

    # Always re-run these (fixes could break compilation)
    always_run = ["typecheck", "build"]

    for worker in ["lint", "style", "syntax", "security", "typecheck", "build"]:
        prev_result = prev.findings.get(worker)

        if worker in always_run:
            workers_to_run.append(worker)
        elif prev_result and prev_result.verdict == "FAIL":
            workers_to_run.append(worker)
        elif prev_result and prev_result.verdict == "PASS":
            # Carry forward PASS result
            carried_forward[worker] = prev_result
else:
    # First review - run all
    workers_to_run = ["lint", "style", "syntax", "security", "typecheck", "build"]
```

### Spawn Workers

Spawn workers_to_run in SINGLE message (parallel):

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  run_in_background: true
  description: "{worker} review {STORY_ID}"
  prompt: |
    Read: .claude/agents/code-review-{worker}.agent.md
    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    touched_files: <list from EVIDENCE.yaml>
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

Spawn review-aggregate-leader:

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Aggregate review {STORY_ID}"
  prompt: |
    Read: .claude/agents/review-aggregate-leader.agent.md
    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    iteration: <current iteration>
    worker_outputs: <collected YAML from workers>
    carried_forward: <map of skipped workers>

    Write REVIEW.yaml to {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/REVIEW.yaml
```

The aggregate leader will:
- Merge all worker results
- Generate ranked_patches for fix priority
- Write REVIEW.yaml

## Phase 3 — Finalize

| Verdict | Status | Next |
|---------|--------|------|
| PASS | `ready-for-qa` | `/qa-verify-story {FEATURE_DIR} {STORY_ID}` |
| FAIL | `code-review-failed` | `/dev-fix-story {FEATURE_DIR} {STORY_ID}` |

Token log: `/token-log {STORY_ID} code-review <in> <out>`

## Done

Report: `CODE-REVIEW COMPLETE: <verdict>`
State next command.

## Schema Reference

Output schema: `packages/backend/orchestrator/src/artifacts/review.ts`

```typescript
ReviewSchema = {
  schema: 1,
  story_id: string,
  timestamp: datetime,
  iteration: number,
  verdict: 'PASS' | 'FAIL',
  workers_run: string[],
  workers_skipped: string[],
  ranked_patches: RankedPatch[],
  findings: { lint, style, syntax, security, typecheck, build },
  total_errors: number,
  total_warnings: number,
  auto_fixable_count: number,
  tokens: { in, out }
}
```

## Ref

`docs/dev-code-review-reference.md`
