---
doc_type: plan_exec
title: "INST - MOC Instructions Epic Execution Plan"
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

# INST - MOC Instructions Epic Execution Plan

## Story Prefix

All stories use the **INST** prefix. Commands use the full prefixed ID:
- `/pm-generate-story INST-1000`
- `/elab-story INST-1000`
- `/dev-implement-story INST-1000`

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/INST/INST-1XXX/`
- Story docs MUST include:
  - YAML front matter with status
  - Blocked By section (dependencies)
  - Acceptance Criteria (numbered)
  - Testing section with location and requirements

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `inst-1XXX.md` |
| Elaboration | `elab-inst-1XXX.md` |
| Proof | `proof-inst-1XXX.md` |
| Code Review | `code-review-inst-1XXX.md` |
| QA Verify | `qa-verify-inst-1XXX.md` |
| QA Gate | `qa-gate-inst-1XXX.yaml` |

## Execution Phases

### Phase 0: Foundation (INST-1000 to INST-1004)

Sequential foundation work - package extraction and core upload infrastructure.

1. **INST-1003: Extract Upload Types Package** (Ready for Review)
   - Create `@repo/upload-types` package
   - Move session, file, upload types from apps
   - Move slug utilities
   - Unblocks: INST-1004, all edit/delete stories

2. **INST-1004: Extract Upload Config Package** (Draft)
   - Create `@repo/upload-config` package
   - Extract configuration constants
   - Unblocks: INST-1002, INST-1005

3. **INST-1002: Deploy Multipart Upload Sessions** (In Progress)
   - Wire up 5 session endpoints to serverless.yml
   - Add S3 multipart IAM permissions
   - Integration test with 50MB upload
   - Unblocks: INST-1000, INST-1028

4. **INST-1000: Expiry & Interrupted Uploads** (Ready for Review)
   - Session expiry detection
   - Auto-refresh flow
   - Resume interrupted uploads
   - Unblocks: Frontend upload stories

5. **INST-1001: E2E A11y Perf Testing** (Draft)
   - Playwright E2E tests
   - Accessibility audit
   - Performance benchmarks

### Phase 1: Edit Flow Backend (INST-1005 to INST-1007)

API endpoints for edit functionality. Can start after Phase 0.

6. **INST-1005: Edit Finalize Endpoint** (Ready for Review)
   - POST `/mocs/:mocId/edit/finalize`
   - S3 verification with magic bytes
   - Atomic transaction with optimistic locking
   - OpenSearch re-indexing
   - Unblocks: INST-1012

7. **INST-1006: Edit Rate Limiting Observability** (Draft)
   - Rate limit middleware for edit endpoints
   - Observability metrics
   - Unblocks: None (parallel with INST-1007)

8. **INST-1007: S3 Cleanup Failed Edit Uploads** (Draft)
   - Background job for orphaned S3 objects
   - Cleanup policy based on session expiry
   - Unblocks: None (parallel with INST-1006)

### Phase 2: Edit Flow Frontend (INST-1008 to INST-1015)

UI implementation for edit experience. Depends on Phase 1.

9. **INST-1008: Edit Routes and Entry Points** (Draft)
   - Route: `/instructions/:slug/edit`
   - Entry point buttons on MOC detail page
   - Authorization check
   - Unblocks: INST-1009

10. **INST-1009: Edit Page and Data Fetching** (Draft)
    - Edit page layout
    - GET MOC for edit data fetching
    - Loading/error states
    - Unblocks: INST-1010

11. **INST-1010: Edit Form and Validation** (Ready for Review)
    - Form with react-hook-form + Zod
    - Title, description, tags, theme, slug fields
    - Real-time validation
    - Submit disabled when invalid/unchanged
    - Unblocks: INST-1011

12. **INST-1011: File Management UI** (Draft)
    - Display existing files
    - Add/remove file capability
    - File reordering
    - Unblocks: INST-1012

13. **INST-1012: Save Flow Presign Upload Handling** (Draft)
    - Presign new files via API
    - Upload to S3
    - Call finalize endpoint
    - Unblocks: INST-1013

14. **INST-1013: Cancel Unsaved Changes Guard** (Draft)
    - Navigation guard for unsaved changes
    - Confirmation modal
    - Unblocks: INST-1014

15. **INST-1014: Session Persistence Error Recovery** (Draft)
    - Local storage session backup
    - Recovery from crashes/refreshes
    - Unblocks: INST-1015

16. **INST-1015: Accessibility and Polish** (Draft)
    - Keyboard navigation
    - Screen reader support
    - Focus management
    - Completes Edit Flow

### Phase 3: Delete Flow Backend (INST-1016 to INST-1022)

API endpoints and jobs for soft-delete. Can run parallel with Phase 2.

17. **INST-1016: Delete Database Schema Updates** (Draft)
    - Make `mocParts.partsListId` nullable
    - Verify `deleted_at` column exists
    - Drizzle migration
    - Unblocks: INST-1017

18. **INST-1017: Delete Endpoint** (Draft)
    - POST `/mocs/:mocId/delete`
    - Set `deleted_at` timestamp
    - Authorization check (owner only)
    - Unblocks: INST-1018, INST-1022

19. **INST-1018: Restore Endpoint** (Draft)
    - POST `/mocs/:mocId/restore`
    - Clear `deleted_at` timestamp
    - Within retention period check
    - Unblocks: INST-1025

20. **INST-1019: List Deleted Endpoint** (Draft)
    - GET `/mocs/deleted`
    - Return user's deleted MOCs
    - Include deletion date and restore deadline
    - Unblocks: INST-1024

21. **INST-1020: Cleanup Job** (Draft)
    - Scheduled job (daily)
    - Hard-delete after 30-day retention
    - Return bricks to inventory first
    - Unblocks: None (independent)

22. **INST-1021: Delete Rate Limiting Observability** (Draft)
    - Rate limit on delete/restore endpoints
    - Observability metrics
    - Unblocks: None (parallel)

23. **INST-1022: Delete Entry Points** (Draft)
    - Delete button on MOC detail page
    - Delete option in dropdown menus
    - Unblocks: INST-1023

### Phase 4: Delete Flow Frontend (INST-1023 to INST-1027)

UI implementation for delete/restore. Depends on Phase 3.

24. **INST-1023: Delete Confirmation Modal** (Draft)
    - MUST create in `@repo/app-component-library`
    - Generic `DeleteConfirmationModal` component
    - Checkbox confirmation required
    - Loading/error states
    - Unblocks: INST-1024

25. **INST-1024: Recently Deleted Section** (Draft)
    - "Recently Deleted" section on My Instructions
    - List deleted MOCs with restore deadline
    - Unblocks: INST-1025

26. **INST-1025: Restore Flow** (Draft)
    - Restore button/action
    - Success/error toast
    - Redirect after restore
    - Unblocks: INST-1026

27. **INST-1026: Deleted MOC Detail View** (Draft)
    - Read-only view of deleted MOC
    - Prominent restore CTA
    - Countdown to permanent deletion
    - Unblocks: INST-1027

28. **INST-1027: Delete Accessibility Polish** (Draft)
    - Keyboard navigation
    - Screen reader announcements
    - Focus management
    - Completes Delete Flow

### Phase 5: Testing & Validation (INST-1028 to INST-1029)

Final validation and test coverage. Depends on Phases 2 and 4.

29. **INST-1028: Upload Session Test Coverage** (Draft)
    - Integration tests for session flow
    - Edge case coverage
    - Error handling tests

30. **INST-1029: Create MOC Flow Validation** (Approved)
    - Audit existing create flow
    - Fix endpoint path mismatches
    - Cleanup deprecated code
    - Add missing integration tests

## Dependency Graph (Visual)

```
                            INST-1003 (upload-types)
                                    |
                    ┌───────────────┼───────────────┐
                    |               |               |
                    v               v               v
            INST-1004       INST-1002           (all edit/delete)
          (upload-config)  (deploy sessions)
                    |               |
                    v               v
                    └───────┬───────┘
                            |
        ┌───────────────────┼───────────────────┐
        |                   |                   |
        v                   v                   v
    INST-1000           INST-1001           INST-1005
   (expiry/resume)     (e2e testing)      (edit finalize)
        |                                       |
        v                   ┌───────────────────┘
        └───────────────────┘
                            |
    ┌───────────────────────┼───────────────────────┐
    |                       |                       |
    v                       v                       v
INST-1006               INST-1007               INST-1008
(rate limit)           (s3 cleanup)           (edit routes)
                                                    |
                                                    v
                                                INST-1009
                                              (edit page)
                                                    |
                                                    v
                                                INST-1010
                                              (edit form)
                                                    |
                            ┌───────────────────────┼───────────────────────┐
                            |                       |                       |
                            v                       v                       v
                        INST-1011               INST-1016
                       (file mgmt)            (delete schema)
                            |                       |
                            v                       v
                        INST-1012               INST-1017
                       (save flow)            (delete endpoint)
                            |                       |
                            v               ┌───────┼───────┐
                        INST-1013           |       |       |
                      (cancel guard)        v       v       v
                            |           INST-1018  INST-1019  INST-1022
                            v          (restore)  (list)    (entry pts)
                        INST-1014           |       |           |
                      (persistence)         └───────┼───────────┘
                            |                       |
                            v                       v
                        INST-1015               INST-1023
                       (edit a11y)           (delete modal)
                            |                       |
                            v                       v
                        INST-1028               INST-1024
                       (test coverage)        (deleted list)
                            |                       |
                            v                       v
                        INST-1029               INST-1025
                       (validation)           (restore flow)
                                                    |
                                                    v
                                                INST-1026
                                              (deleted view)
                                                    |
                                                    v
                                                INST-1027
                                              (delete a11y)
```

## Recommended Execution Order

For maximum parallelism:

| Wave | Stories | Can Start After |
|------|---------|-----------------|
| 1 | INST-1003 | - |
| 2 | INST-1004, INST-1002 | Wave 1 |
| 3 | INST-1000, INST-1005, INST-1016 | Wave 2 |
| 4 | INST-1001, INST-1006, INST-1007, INST-1008, INST-1017 | Wave 3 |
| 5 | INST-1009, INST-1018, INST-1019, INST-1022 | Wave 4 |
| 6 | INST-1010, INST-1020, INST-1021, INST-1023 | Wave 5 |
| 7 | INST-1011, INST-1024 | Wave 6 |
| 8 | INST-1012, INST-1025 | Wave 7 |
| 9 | INST-1013, INST-1026 | Wave 8 |
| 10 | INST-1014, INST-1027 | Wave 9 |
| 11 | INST-1015 | Wave 10 |
| 12 | INST-1028, INST-1029 | Wave 11 |

## Critical Path

The critical path through this epic is:

```
INST-1003 -> INST-1004 -> INST-1005 -> INST-1008 -> INST-1009 -> INST-1010
  -> INST-1011 -> INST-1012 -> INST-1013 -> INST-1014 -> INST-1015
  -> INST-1028 -> INST-1029
```

Total: 13 stories on critical path. Edit flow frontend is the bottleneck.

## Parallel Work Streams

Two independent streams can run after Wave 3:

**Stream A: Edit Flow**
- INST-1008 through INST-1015
- Ends with INST-1028, INST-1029

**Stream B: Delete Flow**
- INST-1016 through INST-1027
- Can complete independently

## Key Risks

1. **Multipart Upload Deployment** (INST-1002) - Requires AWS deployment and E2E testing
2. **Endpoint Path Mismatches** (INST-1029) - Frontend may reference deprecated endpoints
3. **Package Extraction** (INST-1003, INST-1004) - Consumer updates may break existing tests
4. **DeleteConfirmationModal Reuse** (INST-1023) - Must be generic for app-wide reuse

## Quality Gates

All stories must pass:
1. TypeScript compilation (strict mode)
2. ESLint (no errors)
3. Unit/integration tests (45% minimum coverage)
4. Prettier formatting
5. Manual testing of happy path

Delete stories additionally require:
- Restore flow tested
- Retention period enforcement verified
- Brick inventory return confirmed (for cleanup job)

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 15:00 | Claude Opus 4.5 | Initial execution plan | inst.plan.exec.md |
