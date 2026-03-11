---
story_id: KNOW-033
title: Test Quality Metrics Tracking
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
---

# KNOW-033: Test Quality Metrics Tracking

## Context

Dev agents produce tests as proof of completion, but there is currently no signal on *test quality* — only test existence and whether they pass. A test suite can be entirely mocked and still pass CI, giving a false signal that a story is complete.

The three failure modes of verification theater are:
1. **Mock density** — tests assert against mocks rather than real behavior; the implementation could be wrong and tests would still pass
2. **Path coverage gaps** — happy path is tested but error paths, edge cases, and conditional branches are not
3. **Intent drift** — the test name says "should return 404 when user not found" but the assertion only checks `expect(fn).toHaveBeenCalled()` — the test name is lying

Tracking these per story creates a baseline for measuring whether test quality is improving over time, and gives the QA agent objective data to act on (KNOW-034).

## Goal

Capture a structured `test_quality` record per story at QA time, stored in `story_artifacts`, that quantifies mock density, branch coverage, and intent alignment. Surface this data via `workflow_metrics`.

## Non-goals

- Automatically fixing low-quality tests (the QA gate in KNOW-034 blocks, but doesn't auto-fix)
- Static analysis tooling (analysis is performed by the QA agent reading test files, not a separate lint tool)
- 100% coverage requirements (coverage targets are set per story type, not globally)

## Scope

### New Artifact Type: `test_quality`

```typescript
const TestQualitySchema = z.object({
  story_id: z.string(),
  analyzed_at: z.string().datetime(),

  // Mock density
  total_assertions: z.number(),
  mocked_assertions: z.number(),
  mock_density: z.number(),           // 0.0-1.0 (mocked/total)
  mock_density_verdict: z.enum(['acceptable', 'high', 'critical']),
  // acceptable: < 0.4, high: 0.4-0.7, critical: > 0.7

  // Branch coverage
  branches_identified: z.number(),    // conditional branches in implementation
  branches_covered: z.number(),
  branch_coverage: z.number(),        // 0.0-1.0
  branch_coverage_verdict: z.enum(['acceptable', 'low', 'critical']),
  // acceptable: > 0.7, low: 0.4-0.7, critical: < 0.4

  // Intent alignment
  tests_analyzed: z.number(),
  intent_mismatches: z.array(z.object({
    test_name: z.string(),
    claimed_behavior: z.string(),
    actual_assertion: z.string(),
    severity: z.enum(['minor', 'major']),
  })),
  intent_alignment_verdict: z.enum(['acceptable', 'poor', 'critical']),

  // Overall
  overall_verdict: z.enum(['acceptable', 'concerns', 'fail']),
  summary: z.string(),
  test_files_analyzed: z.array(z.string()),
})
```

### QA Agent Integration

The `qa-verify-completion-leader` (or a spawned `test-quality-analyzer` sub-agent) reads test files for the story and populates this artifact before writing the final verification verdict. The test quality artifact informs but does not solely determine the QA verdict — that logic lives in KNOW-034.

### `workflow_metrics` Extension (extends KNOW-027)

Add to the `workflow_metrics` view:
```sql
avg_mock_density          -- average across stories
avg_branch_coverage
intent_mismatch_rate      -- stories with any major intent mismatches / total
test_quality_fail_rate    -- stories that failed QA specifically for test quality
```

### Packages Affected

- `packages/backend/orchestrator/src/artifacts/test-quality.ts` — new Zod schema
- `apps/api/knowledge-base/src/db/migrations/` — register artifact type if needed
- `.claude/agents/qa-verify-completion-leader.agent.md` — add test quality analysis step
- `apps/api/knowledge-base/src/db/views/workflow_metrics.sql` — extend with test quality fields

## Acceptance Criteria

- [ ] `TestQualitySchema` Zod schema exists with all specified fields
- [ ] `test_quality` artifact is written to `story_artifacts` at QA time for every story
- [ ] `mock_density_verdict` is computed correctly from `mocked_assertions / total_assertions`
- [ ] `branch_coverage_verdict` is computed correctly from `branches_covered / branches_identified`
- [ ] `intent_mismatches` captures tests where name and assertion don't align
- [ ] `overall_verdict` of `fail` is set when any dimension is `critical`
- [ ] `overall_verdict` of `concerns` is set when any dimension is `high` or `poor` but none are `critical`
- [ ] `workflow_metrics` view includes test quality aggregate fields
- [ ] Test quality artifact is queryable by story ID via `kb_get_artifact`
