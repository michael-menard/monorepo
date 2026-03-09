---
created: 2026-01-24
updated: 2026-03-09
version: 6.1.0
type: orchestrator
agents: ["code-review-lint.agent.md", "code-review-style-compliance.agent.md", "code-review-syntax.agent.md", "code-review-security.agent.md", "code-review-typecheck.agent.md", "code-review-build.agent.md", "code-review-reusability.agent.md", "code-review-react.agent.md", "code-review-typescript.agent.md", "code-review-accessibility.agent.md", "review-aggregate-leader.agent.md"]
schema: packages/backend/orchestrator/src/artifacts/review.ts
---

Usage: /dev-code-review {FEATURE_DIR} {STORY_ID}

Code review orchestrator. Spawn workers - do NOT review code yourself.

**Evidence-First**: Reads touched_files from `evidence` KB artifact. Outputs `review` KB artifact.

**Selective Re-Review**: On iteration 2+, only re-runs failed workers + typecheck + build. Passed workers are carried forward.

## Usage

```
/dev-code-review plans/future/wishlist WISH-001
```

## Phases

| # | Phase | Model | Workers | Signal |
|---|-------|-------|---------|--------|
| 0 | Setup | haiku | (self) | SETUP COMPLETE |
| 1 | Review | haiku | failed + typecheck + build (or all 10 on first run) | REVIEW COMPLETE |
| 2 | Aggregate | haiku | review-aggregate-leader | AGGREGATE COMPLETE |
| 3 | Finalize | haiku | (self) | CODE-REVIEW COMPLETE |

## Step 0.6: Claim Story in KB

1. Call `kb_update_story_status({ story_id: "{STORY_ID}", state: "in_review", phase: "code_review" })`
2. **Guard:** If already `in_review`, STOP: "Story {STORY_ID} is already being reviewed by another agent."

## Phase 0 — Setup

Validate (HARD STOP if fail):
- KB story state is `ready_for_review`: `kb_get_story({ story_id: "{STORY_ID}" })` → `state == "ready_for_review"`
- `evidence` artifact exists in KB: `kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "evidence" })`

Extract touched files from evidence artifact:
```javascript
const evidence = await kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "evidence" })
const touched_files = evidence.content.touched_files.map(f => f.path)
```

## Phase 1 — Parallel Reviews

**SELECTIVE RE-REVIEW OPTIMIZATION**

Check if `review` artifact exists in KB from a previous review cycle:
- If NO previous review: Run all 10 workers
- If previous review exists with FAIL verdict: Only re-run failed workers + typecheck + build

### Determine Workers to Run

```javascript
const workers_to_run = []
const carried_forward = {}

const prevReview = await kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "review" })

if (prevReview !== null) {
    const prev = prevReview.content

    # Always re-run these (fixes could break compilation)
    always_run = ["typecheck", "build"]

    for worker in ["lint", "style", "syntax", "security", "typecheck", "build", "reusability", "react", "typescript", "accessibility"]:
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
    workers_to_run = ["lint", "style", "syntax", "security", "typecheck", "build", "reusability", "react", "typescript", "accessibility"]
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
    touched_files: <list from evidence KB artifact>
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

    Write review artifact to KB via kb_write_artifact
```

The aggregate leader will:
- Merge all worker results
- Generate ranked_patches for fix priority
- Write `review` artifact to KB

## Phase 3 — Finalize

| Verdict | Status | Next |
|---------|--------|------|
| PASS | 🔍 `ready-for-qa` | `/qa-verify-story {FEATURE_DIR} {STORY_ID}` |
| FAIL | 🔴 `failed-code-review` | `/dev-fix-story {FEATURE_DIR} {STORY_ID}` |

On PASS:
```javascript
kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_qa", phase: "code_review" })
```

On FAIL:
```javascript
kb_update_story_status({ story_id: "{STORY_ID}", state: "failed_code_review", phase: "code_review" })
```

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
  findings: { lint, style, syntax, security, typecheck, build, reusability, react, typescript, accessibility },
  total_errors: number,
  total_warnings: number,
  auto_fixable_count: number,
  tokens: { in, out }
}
```

## Ref

`docs/dev-code-review-reference.md`

## Abort / Error Recovery

If interrupted after Step 0.6, release manually:
`kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_review" })`
