---
doc_type: plan_meta
title: "INST - MOC Instructions Epic Meta Plan"
status: active
story_prefix: "inst"
created_at: "2026-01-24T15:00:00-07:00"
updated_at: "2026-01-24T15:00:00-07:00"
tags:
  - moc-instructions
  - upload
  - edit-flow
  - delete-flow
  - multipart-upload
---

# INST - MOC Instructions Epic Meta Plan

## Story Prefix

All stories in this epic use the **INST** prefix (uppercase for story IDs, lowercase for files).
- Story IDs: `INST-1000`, `INST-1001`, etc.
- Story folders: `plans/stories/INST/INST-1XXX/`
- Artifact files: `elab-inst-1XXX.md`, `proof-inst-1XXX.md`, etc.

## Epic Goal

Complete the MOC Instructions feature set by implementing:
1. **Multipart Upload Session** - Reliable large file uploads (up to 50MB)
2. **Edit Flow** - Full edit capability for existing MOC instructions
3. **Delete Flow** - Soft-delete with restore capability and retention policy
4. **Test Coverage** - Comprehensive E2E, integration, and unit tests

## Background

This epic consolidates work from several PRDs:
- Upload Session PRD (Stories 3.1.24-3.1.27)
- Edit MOC PRD (Stories 3.1.28-3.1.46)
- Delete MOC PRD (Stories 3.1.47-3.1.59)
- Validation Story (3.1.60)

## Documentation Structure

- `plans/epic-4-instructions/` - Epic-level planning docs
- `plans/stories/INST/INST-1XXX/` - Per-story artifacts
- `docs/stories.bak/epic-4-instructions/` - Original story drafts (source of truth for requirements)

## Story Categories

### Category 0: Foundation & Package Extraction
Shared infrastructure and package creation for reuse across features.

| Story ID | Title | Status |
|----------|-------|--------|
| INST-1000 | Expiry & Interrupted Uploads | Ready for Review |
| INST-1001 | E2E A11y Perf Testing | Draft |
| INST-1002 | Deploy Multipart Upload Sessions | In Progress |
| INST-1003 | Extract Upload Types Package | Ready for Review |
| INST-1004 | Extract Upload Config Package | Draft |

### Category 1: Edit Flow - Backend
API endpoints and backend infrastructure for editing MOC instructions.

| Story ID | Title | Status |
|----------|-------|--------|
| INST-1005 | Edit Finalize Endpoint | Ready for Review |
| INST-1006 | Edit Rate Limiting Observability | Draft |
| INST-1007 | S3 Cleanup Failed Edit Uploads | Draft |

### Category 2: Edit Flow - Frontend
UI components and pages for the edit experience.

| Story ID | Title | Status |
|----------|-------|--------|
| INST-1008 | Edit Routes and Entry Points | Draft |
| INST-1009 | Edit Page and Data Fetching | Draft |
| INST-1010 | Edit Form and Validation | Ready for Review |
| INST-1011 | File Management UI | Draft |
| INST-1012 | Save Flow Presign Upload Handling | Draft |
| INST-1013 | Cancel Unsaved Changes Guard | Draft |
| INST-1014 | Session Persistence Error Recovery | Draft |
| INST-1015 | Accessibility and Polish | Draft |

### Category 3: Delete Flow - Backend
API endpoints and background jobs for soft-delete with restore.

| Story ID | Title | Status |
|----------|-------|--------|
| INST-1016 | Delete Database Schema Updates | Draft |
| INST-1017 | Delete Endpoint | Draft |
| INST-1018 | Restore Endpoint | Draft |
| INST-1019 | List Deleted Endpoint | Draft |
| INST-1020 | Cleanup Job | Draft |
| INST-1021 | Delete Rate Limiting Observability | Draft |
| INST-1022 | Delete Entry Points | Draft |

### Category 4: Delete Flow - Frontend
UI components for delete confirmation, trash view, and restore.

| Story ID | Title | Status |
|----------|-------|--------|
| INST-1023 | Delete Confirmation Modal | Draft |
| INST-1024 | Recently Deleted Section | Draft |
| INST-1025 | Restore Flow | Draft |
| INST-1026 | Deleted MOC Detail View | Draft |
| INST-1027 | Delete Accessibility Polish | Draft |

### Category 5: Testing & Validation
Test coverage and integration validation stories.

| Story ID | Title | Status |
|----------|-------|--------|
| INST-1028 | Upload Session Test Coverage | Draft |
| INST-1029 | Create MOC Flow Validation | Approved |

## Principles

### Package Reuse (Required)

Several stories create or extract shared packages:
- `@repo/upload-types` - Session, file, and upload types (INST-1003)
- `@repo/upload-config` - Configuration constants (INST-1004)
- `DeleteConfirmationModal` - Reusable delete modal in `@repo/app-component-library` (INST-1023)

All subsequent stories MUST use these packages rather than duplicating code.

### Package Boundary Rules

| Package | Purpose | Stories |
|---------|---------|---------|
| `packages/core/upload-types` | Upload session and file types | INST-1003 creates, many consume |
| `packages/core/upload-config` | Upload configuration constants | INST-1004 creates, many consume |
| `packages/core/app-component-library` | DeleteConfirmationModal | INST-1023 creates, INST-1024+ consume |
| `apps/api/endpoints/moc-instructions` | MOC CRUD endpoints | INST-1005, INST-1017-1019 |
| `apps/api/endpoints/moc-uploads` | Upload session endpoints | INST-1002 |
| `apps/web/main-app/src/components/MocEdit` | Edit flow components | INST-1010-1015 |

### Soft-Delete Pattern (Required for Delete Stories)

All delete operations use soft-delete with 30-day retention:
1. Set `deleted_at` timestamp on MOC record
2. MOC hidden from public views immediately
3. Owner can restore within 30 days
4. Cleanup job hard-deletes after retention period
5. Bricks return to inventory before hard-delete

### Cookie-Based Auth (Required for All Endpoints)

All API endpoints use cookie-based session auth:
- `credentials: 'include'` on fetch requests
- No `Authorization` headers
- `HttpOnly`, `Secure`, `SameSite=Lax` cookies
- CSRF protection on unsafe methods (POST/PUT/DELETE)

### Zod-First Types (Required)

All types MUST be defined as Zod schemas:

```typescript
import { z } from 'zod'

const EditMocSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  // ...
})

type EditMocInput = z.infer<typeof EditMocSchema>
```

### Import Policy

- Use `@repo/upload-types` for upload/session types
- Use `@repo/ui` for all UI primitives
- Use `@repo/logger` for logging (never console.log)
- Use `@repo/app-component-library` for app-level components

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 15:00 | Claude Opus 4.5 | Initial plan creation | inst.plan.meta.md, inst.plan.exec.md |
