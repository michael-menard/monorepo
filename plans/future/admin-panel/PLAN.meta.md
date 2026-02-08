---
doc_type: plan_meta
title: "ADMI — Meta Plan"
status: active
story_prefix: "ADMI"
created_at: "2026-02-04T00:00:00Z"
updated_at: "2026-02-04T00:00:00Z"
tags:
  - admin-panel
  - user-management
  - security
---

# ADMI — Meta Plan

## Story Prefix

All stories in this project use the **ADMI** prefix.
- Story IDs: `ADMI-001`, `ADMI-002`, etc.
- Story folders: `plans/future/admin-panel/backlog/ADMI-XXX/`, `plans/future/admin-panel/elaboration/ADMI-XXX/`, etc.
- Artifact files: `ELAB-ADMI-XXX.md`, `PROOF-ADMI-XXX.md`, etc.

## Documentation Structure

- `plans/future/admin-panel/` contains cross-cutting strategy and execution docs
- `plans/future/admin-panel/backlog/ADMI-XXX/` contains story artifacts during backlog stage
- `plans/future/admin-panel/elaboration/ADMI-XXX/` contains story artifacts during elaboration stage
- `plans/future/admin-panel/ready-to-work/ADMI-XXX/` contains story artifacts ready for implementation
- `plans/future/admin-panel/in-progress/ADMI-XXX/` contains story artifacts being implemented
- `plans/future/admin-panel/UAT/ADMI-XXX/` contains story artifacts in QA/verification

## Naming Rule

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

Example: `ELAB-ADMI-001.20260204-0000.md`

## Principles

- Story folders are atomic and self-contained
- Documentation structure must be automation-friendly
- Stories represent units of intent, validation, and evidence

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package
- All stories MUST include a `## Reuse Plan` section in PM docs and `## Reuse Verification` in dev proofs

### Package Boundary Rules

- Core logic in `packages/core/*`
- Backend utilities in `packages/backend/*`
- Frontend components in `packages/core/app-component-library`
- Admin UI components should extend or create shared app components

### Import Policy

- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries
- Example: `import { Button } from '@repo/ui'` not `import { Button } from '../../../ui/button'`

## Project Goals

**Overall Goal:** Enable authorized administrators to manage users, revoke sessions, block/unblock accounts, and maintain comprehensive audit logs through a secure admin panel integrated into the main application.

**MVP Scope:** Admin route protection, user list view with search, user detail view, revoke refresh tokens, block/unblock user with reason capture, confirmation dialogs, restore access, and audit logging.

**Key Dependencies:** `cognito-scopes` epic must complete first to establish `admin` Cognito group and `user_quotas` table with `is_suspended` flag.

## Technical Architecture

**Frontend:** `apps/web/main-app/src/routes/admin/*` with React 19, TypeScript, Tailwind CSS + shadcn/ui

**Backend:** `apps/api/lego-api/domains/admin/*` with AWS Lambda

**Database:** New `admin_audit_log` table in PostgreSQL via Drizzle ORM, uses existing `user_quotas` table

**Deployment:** AWS serverless infrastructure (Lambda, API Gateway, Aurora PostgreSQL)

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-04 00:00 | pm-bootstrap-generation-leader | Initial bootstrap workflow | ADMI.stories.index.md, PLAN.meta.md, PLAN.exec.md, roadmap.md |
