---
schema: baseline-reality/v1
created: "{DATE}"
workflow_shift: "{SHIFT_ID}"
status: draft | active | superseded
previous_baseline: null | "{PATH_TO_PREVIOUS}"
---

# Baseline Reality Snapshot

> This document captures the current state of the codebase at the start of a workflow shift.
> All new stories must reconcile against this baseline to prevent assumption drift and rework.

---

## What Exists

<!--
  Document completed features, deployed functionality, and established patterns.
  Include:
  - Key features and their current state
  - Established architectural patterns in use
  - Active integrations and dependencies
  - Reference existing documentation where applicable
-->

### Deployed Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| _example_ | `apps/web/main-app/` | production | _description_ |

### Established Patterns

| Pattern | Usage | Documentation |
|---------|-------|---------------|
| _example_ | `packages/core/*` | `docs/patterns/*.md` |

---

## What Is In-Progress

<!--
  Document active work that has not yet been merged or deployed.
  Include:
  - Stories currently in development
  - Branches with uncommitted work
  - Pending PRs and their status
  - Any blocked work and blockers
-->

### Active Stories

| Story ID | Status | Branch | Owner | Blockers |
|----------|--------|--------|-------|----------|
| _example_ | in-progress | `feature/example` | _agent_ | none |

### Pending Pull Requests

| PR | Story | Status | Waiting On |
|----|-------|--------|------------|
| _example_ | STORY-XXX | review | _reviewer_ |

---

## Invalid Assumptions

<!--
  Document assumptions that are no longer valid based on recent changes.
  Include:
  - Deprecated patterns or approaches
  - Changed APIs or interfaces
  - Updated constraints or requirements
  - Any learnings from failed implementations
-->

### Deprecated Patterns

| Pattern | Replaced By | Reason | Since |
|---------|-------------|--------|-------|
| _example_ | _new_pattern_ | _reason_ | _date_ |

### Changed Constraints

| Constraint | Previous | Current | Impact |
|------------|----------|---------|--------|
| _example_ | _old_value_ | _new_value_ | _impact_ |

---

## Do Not Rework

<!--
  Document completed work that should NOT be revisited without explicit approval.
  This prevents unnecessary churn on stable functionality.
  Include:
  - Recently completed and tested features
  - Optimized or refactored code
  - Intentional technical debt decisions
-->

### Protected Features

| Feature | Completed | Reason | Approval Required |
|---------|-----------|--------|-------------------|
| _example_ | _date_ | _reason_ | HiTL |

### Intentional Technical Debt

| Location | Decision | Rationale | Review Date |
|----------|----------|-----------|-------------|
| _example_ | _decision_ | _rationale_ | _date_ |

---

## Reconciliation Checklist

Before creating or modifying stories, verify:

- [ ] Story does not conflict with in-progress work
- [ ] Story respects established patterns unless explicitly changing them
- [ ] Story does not assume deprecated patterns are still valid
- [ ] Story does not duplicate protected features
- [ ] Any assumption conflicts are documented and resolved

---

## Metadata

| Field | Value |
|-------|-------|
| Generated | {DATE} |
| Shift ID | {SHIFT_ID} |
| Valid Until | next workflow shift |
| Supersedes | {PREVIOUS_BASELINE} |
