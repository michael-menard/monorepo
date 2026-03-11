---
story_id: KNOW-034
title: QA Test Quality Gate and E2E Enforcement
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-033  # test quality metrics must be captured before QA can gate on them
---

# KNOW-034: QA Test Quality Gate and E2E Enforcement

## Context

The QA verification step currently validates that:
- Acceptance criteria are met
- The proof-of-completion artifact is present
- Code review has passed

It does NOT validate:
1. That tests are actually testing real behavior (mock density gate)
2. That all code paths are covered (branch coverage gate)
3. That test names accurately describe what they assert (intent alignment gate)
4. That user-facing stories have Playwright E2E tests that run against the actual stack

This means a story can reach `done` with a test suite that is entirely mocked, covers only the happy path, and has tests whose names don't match their assertions. The implementation could be fundamentally broken and the workflow would never know.

## Goal

Extend the QA verification agent to enforce test quality as a hard gate, and require Playwright E2E tests for user-facing stories. Stories with critical test quality failures or missing E2E coverage must not reach `done`.

## Non-goals

- Auto-fixing low-quality tests (QA gates and reports, dev agent fixes)
- Enforcing coverage percentages via Vitest coverage tooling (analysis is agent-driven, not tool-driven, in v1)
- Running E2E tests against a deployed staging environment (local stack is acceptable in v1)

## Scope

### QA Verification Changes

Extend `qa-verify-completion-leader.agent.md` with two new mandatory steps before the final verdict:

---

**Step A: Test Quality Gate** (uses KNOW-033 artifact)

Read the `test_quality` artifact for the story. Apply the following rules:

| Condition | QA Action |
|---|---|
| `overall_verdict: fail` | Hard FAIL — blocking issue, must be fixed |
| `mock_density_verdict: critical` | Hard FAIL — "Tests are mocked above acceptable threshold (>{70}%). Real behavior is unverified." |
| `branch_coverage_verdict: critical` | Hard FAIL — "Critical code paths are untested." |
| `intent_mismatches` with any `severity: major` | Hard FAIL — "Test names do not match assertions. Tests are misleading." |
| `overall_verdict: concerns` | Soft FAIL — added to `blocking_issues` with severity `medium`; requires explicit waiver |
| `overall_verdict: acceptable` | PASS — no action |

---

**Step B: E2E Coverage Gate** (for user-facing stories)

A story is **user-facing** if any of the following are true:
- `epic` contains a UI/UX feature
- Story has ACs referencing user interactions, pages, forms, or flows
- Story type is `feature` and touches `apps/web/`

For user-facing stories:
1. Check that at least one Playwright test file exists referencing this story's feature area
2. Run `pnpm --filter @repo/playwright test -- --grep "{story_id}"` or equivalent scoped run
3. If no Playwright tests exist → Hard FAIL: "No E2E tests found for user-facing story"
4. If Playwright tests fail → Hard FAIL: "E2E tests failed. Functionality is not verified against real stack."
5. If Playwright tests pass → record `e2e_verdict: PASS` in the verification artifact

---

### Verification Artifact Extension

Extend `QaVerifySchema` with:
```typescript
test_quality_verdict: z.enum(['pass', 'concerns', 'fail', 'skipped']),
e2e_verdict: z.enum(['pass', 'fail', 'not-applicable', 'skipped']),
e2e_tests_run: z.array(z.string()).optional(),  // test file paths executed
```

### Churn Reason Integration (requires KNOW-024)

When a story fails QA specifically for test quality or E2E reasons, set:
```
reason_category: 'qa-failure'
reason_notes: 'test-quality-critical | e2e-missing | e2e-failed'
```

This makes test-quality-driven churn queryable separately from other QA failures in the metrics.

### Packages Affected

- `.claude/agents/qa-verify-completion-leader.agent.md` — add Steps A and B
- `packages/backend/orchestrator/src/artifacts/qa-verify.ts` — extend schema
- `apps/web/playwright/` — E2E test patterns should reference story IDs in test names for scoped runs

## Acceptance Criteria

- [ ] QA verification reads the `test_quality` artifact and applies the gating rules
- [ ] A story with `mock_density_verdict: critical` fails QA with a descriptive blocking issue
- [ ] A story with `branch_coverage_verdict: critical` fails QA with a descriptive blocking issue
- [ ] A story with major `intent_mismatches` fails QA with a descriptive blocking issue
- [ ] A user-facing story with no Playwright tests fails QA
- [ ] A user-facing story where Playwright tests fail fails QA
- [ ] A user-facing story where Playwright tests pass records `e2e_verdict: PASS` in the verification artifact
- [ ] Non-user-facing stories record `e2e_verdict: not-applicable`
- [ ] QA pass rate and E2E coverage are tracked in `workflow_metrics` (via KNOW-027)
- [ ] Test quality failures write `reason_notes` to the state transition (via KNOW-024)
