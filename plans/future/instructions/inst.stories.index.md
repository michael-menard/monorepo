---
doc_type: story_index
title: "INST - MOC Instructions Story Index"
status: active
story_prefix: "inst"
created_at: "2026-01-24T15:00:00-07:00"
updated_at: "2026-01-24T15:00:00-07:00"
total_stories: 30
---

# INST - MOC Instructions Story Index

## Summary

| Metric | Count |
|--------|-------|
| Total Stories | 30 |
| Ready for Review | 5 |
| In Progress | 1 |
| Approved | 1 |
| Draft | 23 |

## Stories by Phase

### Phase 0: Foundation (5 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1000 | Expiry & Interrupted Uploads | Ready for Review | INST-1002 | 3.1.24 |
| INST-1001 | E2E A11y Perf Testing | Draft | INST-1002 | 3.1.25 |
| INST-1002 | Deploy Multipart Upload Sessions | In Progress | INST-1004 | 3.1.27 |
| INST-1003 | Extract Upload Types Package | Ready for Review | None | 3.1.29 |
| INST-1004 | Extract Upload Config Package | Draft | INST-1003 | 3.1.30 |

### Phase 1: Edit Backend (3 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1005 | Edit Finalize Endpoint | Ready for Review | INST-1003, INST-1004 | 3.1.36 |
| INST-1006 | Edit Rate Limiting Observability | Draft | INST-1005 | 3.1.37 |
| INST-1007 | S3 Cleanup Failed Edit Uploads | Draft | INST-1005 | 3.1.38 |

### Phase 2: Edit Frontend (8 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1008 | Edit Routes and Entry Points | Draft | INST-1005 | 3.1.39 |
| INST-1009 | Edit Page and Data Fetching | Draft | INST-1008 | 3.1.40 |
| INST-1010 | Edit Form and Validation | Ready for Review | INST-1009 | 3.1.41 |
| INST-1011 | File Management UI | Draft | INST-1010 | 3.1.42 |
| INST-1012 | Save Flow Presign Upload Handling | Draft | INST-1011 | 3.1.43 |
| INST-1013 | Cancel Unsaved Changes Guard | Draft | INST-1012 | 3.1.44 |
| INST-1014 | Session Persistence Error Recovery | Draft | INST-1013 | 3.1.45 |
| INST-1015 | Accessibility and Polish | Draft | INST-1014 | 3.1.46 |

### Phase 3: Delete Backend (7 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1016 | Delete Database Schema Updates | Draft | INST-1003 | 3.1.47 |
| INST-1017 | Delete Endpoint | Draft | INST-1016 | 3.1.48 |
| INST-1018 | Restore Endpoint | Draft | INST-1017 | 3.1.49 |
| INST-1019 | List Deleted Endpoint | Draft | INST-1017 | 3.1.50 |
| INST-1020 | Cleanup Job | Draft | INST-1017 | 3.1.51 |
| INST-1021 | Delete Rate Limiting Observability | Draft | INST-1017 | 3.1.52 |
| INST-1022 | Delete Entry Points | Draft | INST-1017 | 3.1.53 |

### Phase 4: Delete Frontend (5 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1023 | Delete Confirmation Modal | Draft | INST-1022 | 3.1.54 |
| INST-1024 | Recently Deleted Section | Draft | INST-1023, INST-1019 | 3.1.55 |
| INST-1025 | Restore Flow | Draft | INST-1024, INST-1018 | 3.1.56 |
| INST-1026 | Deleted MOC Detail View | Draft | INST-1025 | 3.1.57 |
| INST-1027 | Delete Accessibility Polish | Draft | INST-1026 | 3.1.58 |

### Phase 5: Testing & Validation (2 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1028 | Upload Session Test Coverage | Draft | INST-1015 | 3.1.59 |
| INST-1029 | Create MOC Flow Validation | Approved | INST-1003 | 3.1.60 |

## Story Details Quick Reference

### Foundation Stories

**INST-1000: Expiry & Interrupted Uploads**
- Detect expired upload sessions
- Auto-refresh flow
- Resume interrupted uploads
- Files: `useUploadManager.ts`

**INST-1001: E2E A11y Perf Testing**
- Playwright E2E tests for upload flow
- Accessibility audit
- Performance benchmarks

**INST-1002: Deploy Multipart Upload Sessions**
- 5 session endpoints in serverless.yml
- S3 multipart IAM permissions
- 50MB upload integration test

**INST-1003: Extract Upload Types Package**
- Create `@repo/upload-types`
- Move types from main-app and API
- Includes slug utilities

**INST-1004: Extract Upload Config Package**
- Create `@repo/upload-config`
- Part size, TTL, rate limits
- Environment variable mapping

### Edit Backend Stories

**INST-1005: Edit Finalize Endpoint**
- POST `/mocs/:mocId/edit/finalize`
- S3 verification, magic bytes
- Atomic transaction, optimistic lock
- OpenSearch re-indexing

**INST-1006: Edit Rate Limiting Observability**
- Rate limit middleware
- CloudWatch metrics

**INST-1007: S3 Cleanup Failed Edit Uploads**
- Background cleanup job
- Orphaned S3 object removal

### Edit Frontend Stories

**INST-1008: Edit Routes and Entry Points**
- Route: `/instructions/:slug/edit`
- Entry buttons on detail page

**INST-1009: Edit Page and Data Fetching**
- Edit page layout
- GET MOC data fetching

**INST-1010: Edit Form and Validation**
- react-hook-form + Zod
- Real-time validation
- Submit disabled logic

**INST-1011: File Management UI**
- Existing file display
- Add/remove files
- Reordering

**INST-1012: Save Flow Presign Upload Handling**
- Presign new files
- S3 upload
- Finalize call

**INST-1013: Cancel Unsaved Changes Guard**
- Navigation guard
- Confirmation modal

**INST-1014: Session Persistence Error Recovery**
- Local storage backup
- Crash recovery

**INST-1015: Accessibility and Polish**
- Keyboard nav
- Screen reader support

### Delete Backend Stories

**INST-1016: Delete Database Schema Updates**
- Make `partsListId` nullable
- Drizzle migration

**INST-1017: Delete Endpoint**
- POST `/mocs/:mocId/delete`
- Set `deleted_at`

**INST-1018: Restore Endpoint**
- POST `/mocs/:mocId/restore`
- Clear `deleted_at`

**INST-1019: List Deleted Endpoint**
- GET `/mocs/deleted`
- Return deleted MOCs with deadlines

**INST-1020: Cleanup Job**
- Daily scheduled job
- 30-day retention hard delete
- Brick inventory return

**INST-1021: Delete Rate Limiting Observability**
- Rate limits on delete/restore

**INST-1022: Delete Entry Points**
- Delete buttons/menus

### Delete Frontend Stories

**INST-1023: Delete Confirmation Modal**
- Generic `DeleteConfirmationModal`
- In `@repo/app-component-library`
- Checkbox confirmation

**INST-1024: Recently Deleted Section**
- Deleted MOCs list
- Restore deadlines

**INST-1025: Restore Flow**
- Restore action
- Success/error handling

**INST-1026: Deleted MOC Detail View**
- Read-only view
- Restore CTA

**INST-1027: Delete Accessibility Polish**
- A11y for delete flow

### Testing Stories

**INST-1028: Upload Session Test Coverage**
- Integration tests
- Edge cases

**INST-1029: Create MOC Flow Validation**
- Audit create flow
- Fix endpoint mismatches
- Cleanup deprecated code

---

## Source Files

Original story files are located at:
`docs/stories.bak/epic-4-instructions/inst-1XXX-*.md`

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action |
|---|---|---|
| 2026-01-24 15:00 | Claude Opus 4.5 | Initial index creation |
