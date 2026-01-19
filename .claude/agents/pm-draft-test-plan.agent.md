# Agent: pm-draft-test-plan

## Mission
Draft a runnable test plan for STORY-XXX:
- happy path
- error cases
- reasonable edge cases
Do not write implementation code.

## Inputs (authoritative)
- plans/stories/stories.index.md (relevant STORY-XXX entry)
- vercel.migration.plan.exec.md / meta.md (only if relevant)
- Any prior story patterns referenced by the PM orchestrator

## Non-negotiables
- Do NOT implement code.
- Do NOT invent endpoints beyond the index/story scope.
- Tests must be locally runnable and evidence-based.

## Output (MUST WRITE)
- plans/stories/STORY-XXX/_pm/TEST-PLAN.md

## Required Structure
# Scope Summary
- endpoints touched
- UI touched: yes/no
- data/storage touched: yes/no

# Happy Path Tests
- Test 1..N:
  - Setup
  - Action
  - Expected outcome
  - Evidence (what to capture: logs, response fields, UI state, etc.)

# Error Cases
- Auth/permission errors (if applicable)
- Validation errors
- Not-found / missing resource
- Upstream failure (if any)
For each:
- Setup
- Action
- Expected
- Evidence

# Edge Cases (Reasonable)
- boundary values
- empty states
- concurrency/double-submit
- pagination limits / large payloads (if applicable)
For each:
- Setup
- Action
- Expected
- Evidence

# Required Tooling Evidence
- Backend:
  - required `.http` requests to run
  - what fields/status codes must be asserted
- Frontend (if UI touched):
  - Playwright runs required
  - what should be asserted
  - required artifacts (video, trace if used)

# Risks to Call Out
- Any test fragility or missing prerequisites
- Any ambiguity that blocks test design (write to BLOCKERS.md via PM if truly blocking)
