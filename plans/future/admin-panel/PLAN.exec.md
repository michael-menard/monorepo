---
doc_type: plan_exec
title: "ADMI — Execution Plan"
status: active
story_prefix: "ADMI"
created_at: "2026-02-04T00:00:00Z"
updated_at: "2026-02-04T00:00:00Z"
tags:
  - admin-panel
  - execution
  - workflow
---

# ADMI — Execution Plan

## Story Prefix

All stories use the **ADMI** prefix. Commands use the full prefixed ID:
- `/elab-story plans/future/admin-panel ADMI-001`
- `/dev-implement-story plans/future/admin-panel ADMI-002`
- `/qa-verify-story plans/future/admin-panel ADMI-003`

## Artifact Rules

- Each story outputs artifacts under its stage directory: `plans/future/admin-panel/{stage}/ADMI-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section with phase tracking
  - An append-only Agent Log section
  - A Reuse Plan section (PM) or Reuse Verification section (Dev)

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `ADMI-XXX.md` |
| Elaboration | `ELAB-ADMI-XXX.md` |
| Proof | `PROOF-ADMI-XXX.md` |
| Code Review | `CODE-REVIEW-ADMI-XXX.md` |
| QA Verify | `QA-VERIFY-ADMI-XXX.md` |
| QA Gate | `QA-GATE-ADMI-XXX.yaml` |

Add timestamp to filename: `YYYYMMDD-HHMM` format (America/Denver)

Example: `ELAB-ADMI-001.20260204-1430.md`

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta from start
- Phases: Story Gen, Elaboration, Implementation, Code Review, QA Verify, Deployment

## Workflow Stages

Stories progress through workflow stages:

1. **Backlog** - New stories, waiting for elaboration
2. **Elaboration** - Being refined by PM and team
3. **Ready-to-Work** - Elaborated and ready for development
4. **In-Progress** - Being implemented by developers
5. **UAT** - In QA verification and testing

Use `/story-move {FEATURE_DIR} {STORY_ID} {TO_STAGE}` to move stories between stages.

## Phase Workflow

### Phase 1: Story Generation (PM + Team)
- PM generates story YAML with acceptance criteria
- Team clarifies requirements and constraints
- Output: `{STAGE}/ADMI-XXX/ADMI-XXX.md`

### Phase 2: Elaboration (PM + Design + Dev)
- PM refines story details
- Design reviews UI/UX requirements
- Dev estimates complexity and identifies blockers
- Output: `{STAGE}/ADMI-XXX/ELAB-ADMI-XXX.md`

### Phase 3: Implementation (Dev)
- Developer implements feature following architecture
- Dev creates unit tests with >45% coverage
- Output: Feature code + test coverage

### Phase 4: Code Review (Tech Lead + Team)
- Code review for quality, security, accessibility, performance
- Verify reuse of shared packages
- Output: `{STAGE}/ADMI-XXX/CODE-REVIEW-ADMI-XXX.md`

### Phase 5: QA Verification (QA + Dev)
- QA tests against acceptance criteria
- Integration testing and security validation
- Output: `{STAGE}/ADMI-XXX/QA-VERIFY-ADMI-XXX.md` and `{STAGE}/ADMI-XXX/QA-GATE-ADMI-XXX.yaml`

### Phase 6: Deployment
- Staging deployment and manual testing
- Production deployment with monitoring
- Output: Deployment success confirmation

## Critical Path Stories

These stories must complete sequentially and block overall progress:

```
ADMI-001 → ADMI-002 → ADMI-003 → ADMI-004 → ADMI-012 →
ADMI-013 → ADMI-019 → ADMI-020 → ADMI-021 → ADMI-022 →
ADMI-023 → ADMI-024 → ADMI-025
```

Length: 13 stories

## Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan` section identifying what existing packages should be used
- Dev proof MUST include: `## Reuse Verification` section confirming reuse or documenting why new code was needed
- If creating new shared code: must be in `packages/core/*` or `packages/backend/*`, not story-local

Example Reuse Plan section:
```markdown
## Reuse Plan

- Admin components will extend `@repo/ui` for buttons, modals, tables
- Audit logging will use `@repo/logger` for structured logging
- Auth checking will use existing auth context from main-app
- Cognito SDK will be in backend service layer
```

Example Reuse Verification section:
```markdown
## Reuse Verification

- ✓ Used `@repo/ui/Button` for all action buttons
- ✓ Used `@repo/ui/DataTable` for paginated user list
- ✓ Used `@repo/logger` for audit trail logging
- ✓ Created new `AdminGuard` component in main-app (app-specific, not shared)
- ✓ No redundant utilities created
```

## Story Acceptance Criteria (Template)

Each story MUST include clear acceptance criteria:

```
AC-1: [When X happens, then Y result]
AC-2: [Given X state, when Y action, then Z state]
AC-3: [System shall handle error case X with response Y]
```

Acceptance criteria should be testable and observable.

## API Endpoint Specification

All backend endpoints MUST include:
- HTTP method (GET, POST, PUT, DELETE)
- Path with parameter syntax (`:userId`, `{userId}`)
- Request schema (Zod)
- Response schema (Zod)
- Auth requirements (admin group, etc.)
- Error cases with status codes

Example:
```
POST /admin/users/:userId/block
Request: { reason: string, notes?: string }
Response: { success: boolean, user: UserResponse }
Auth: Requires admin group
Errors:
  - 401: Unauthorized (not admin)
  - 404: User not found
  - 409: User already blocked
```

## Database Schema Updates

All database changes MUST be Drizzle ORM migrations:
- File: `apps/api/knowledge-base/src/db/migrations/YYYYMMDD_migration_name.ts`
- Include: table definitions, indexes, constraints
- Include: rollback logic
- Update: `apps/api/knowledge-base/src/db/schema/index.ts` with exports

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-04 00:00 | pm-bootstrap-generation-leader | Initial execution plan | PLAN.exec.md |
