---
doc_type: story_index
title: "INST - MOC Instructions Story Index"
status: active
story_prefix: "inst"
created_at: "2026-01-24T15:00:00-07:00"
updated_at: "2026-01-30T00:00:00-07:00"
total_stories: 18
---

# INST - MOC Instructions Story Index

## Summary

| Metric | Count |
|--------|-------|
| Total Stories | 18 |
| Ready for Review | 4 |
| In Progress | 1 |
| Approved | 1 |
| Draft | 12 |

## Stories by Phase

### Phase 0: Foundation (6 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1000 | Expiry & Interrupted Uploads | Ready for Review | INST-1002 | 3.1.24 |
| INST-1001 | E2E A11y Perf Testing | Draft | INST-1002 | 3.1.25 |
| INST-1002 | Deploy Presigned URL Endpoints for Instructions | In Progress | INST-1004 | 3.1.27 |
| INST-1003 | Extract Upload Types Package | Ready for Review | None | 3.1.29 |
| INST-1004 | Extract Upload Config Package | Draft | INST-1003 | 3.1.30 |
| INST-1008 | Wire RTK Query Mutations | Draft | None | NEW |

### Phase 1: Edit Backend (3 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1005 | Validate Edit Endpoint (PATCH /mocs/:id) | Ready for Review | INST-1003, INST-1004 | 3.1.36 |
| INST-1006 | Edit Rate Limiting Observability | Draft | INST-1005 | 3.1.37 |
| INST-1007 | S3 Cleanup Failed Edit Uploads | Draft | INST-1005 | 3.1.38 |

### Phase 2: Edit Frontend (7 stories)

| ID | Title | Status | Blocked By | Original Story |
|----|-------|--------|------------|----------------|
| INST-1009 | Edit Page and Data Fetching | Draft | INST-1005, INST-1008 | 3.1.40 |
| INST-1010 | Edit Form and Validation | Ready for Review | INST-1009 | 3.1.41 |
| INST-1011 | File Management UI (Add/Remove) | Draft | INST-1010 | 3.1.42 |
| INST-1012 | Save Flow Presigned URL Upload | Draft | INST-1011, INST-1002 | 3.1.43 |
| INST-1013 | Cancel Unsaved Changes Guard | Draft | INST-1012 | 3.1.44 |
| INST-1014 | Session Persistence Error Recovery | Draft | INST-1013 | 3.1.45 |
| INST-1015 | Accessibility and Polish | Draft | INST-1014 | 3.1.46 |

### Phase 3: Testing & Validation (2 stories)

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

**INST-1002: Deploy Presigned URL Endpoints for Instructions**
- Hybrid upload approach:
  - Direct upload (existing): Thumbnail ≤10MB, Parts List ≤10MB
  - Presigned URL (new): Instructions ≤100MB
- Backend endpoints:
  - `POST /mocs/:id/upload-sessions/create` → returns presignedUrl, sessionId, expiresAt
  - `POST /mocs/:id/upload-sessions/:sessionId/complete` → verifies upload, creates mocFiles record
- S3 presigned URL IAM permissions
- 50MB instruction upload integration test
- Note: Multipart for >100MB files deferred to post-MVP

**INST-1003: Extract Upload Types Package**
- Create `@repo/upload-types`
- Move types from main-app and API
- Includes slug utilities

**INST-1004: Extract Upload Config Package**
- Create `@repo/upload-config`
- Part size, TTL, rate limits
- Environment variable mapping

**INST-1008: Wire RTK Query Mutations**
- Add to `@repo/api-client/rtk/instructions-api.ts`:
  - `useCreateInstructionMutation` → POST /mocs
  - `useUpdateInstructionMutation` → PATCH /mocs/:id
  - `useDeleteInstructionMutation` → DELETE /mocs/:id
  - `useUploadFileMutation` → POST /mocs/:id/files/* (direct upload for small files)
- Cache invalidation on mutations
- Optimistic updates where appropriate
- Error handling with rollback

### Edit Backend Stories

**INST-1005: Validate Edit Endpoint (PATCH /mocs/:id)**
- Verify existing PATCH endpoint meets edit requirements:
  - Metadata-only edit: PATCH updates title, description, theme, tags, etc.
  - Add files during edit: Use existing POST /mocs/:id/files/* endpoints
  - Remove files during edit: Use existing DELETE /mocs/:id/files/:fileId
  - Replace files: Upload new → delete old (non-atomic, acceptable for MVP)
- Validate request/response schema matches frontend expectations
- Confirm optimistic locking (version field or updatedAt check)
- Verify OpenSearch re-indexing triggers on relevant field changes
- Document any gaps requiring new endpoints

**INST-1006: Edit Rate Limiting Observability**
- Rate limit middleware
- CloudWatch metrics

**INST-1007: S3 Cleanup Failed Edit Uploads**
- Background cleanup job
- Orphaned S3 object removal

### Edit Frontend Stories

**INST-1009: Edit Page and Data Fetching**
- Edit page layout
- GET MOC data fetching

**INST-1010: Edit Form and Validation**
- react-hook-form + Zod
- Real-time validation
- Submit disabled logic

**INST-1011: File Management UI (Add/Remove)**
- Display existing files with metadata (name, size, type, uploadedAt)
- Add new files (instructions, parts list) via file picker
- Remove files with confirmation
- Visual feedback for pending changes (added/removed indicators)
- Note: File reordering deferred to post-MVP (requires backend displayOrder field)

**INST-1012: Save Flow Presigned URL Upload**
- Hybrid upload based on file type/size:
  - Thumbnail/Parts List (≤10MB): Direct upload via RTK mutation
  - Instructions (>10MB): Presigned URL flow from INST-1002
- Save flow sequence:
  1. Validate form
  2. Upload new files (parallel where possible)
  3. Delete removed files
  4. PATCH metadata
  5. Navigate to detail page on success
- Progress indication during upload
- Error handling: partial failure recovery, retry logic

**INST-1013: Cancel Unsaved Changes Guard**
- Navigation guard
- Confirmation modal

**INST-1014: Session Persistence Error Recovery**
- Local storage backup of form state and pending file list
- Error scenarios to handle:
  - Browser crash/tab close during upload → restore form state, re-select files
  - Network interruption → retry with exponential backoff
  - Presigned URL expiry → request new URL, resume upload
  - Partial upload failure → show which files failed, allow selective retry
  - 409 conflict (title exists) → show conflict modal (already exists)
  - 429 rate limit → show countdown banner (already exists)
- Clear persisted state on successful save or explicit cancel

**INST-1015: Accessibility and Polish**
- Keyboard nav
- Screen reader support

### Testing Stories

**INST-1028: Upload Session Test Coverage**
- Integration tests
- Edge cases

**INST-1029: Create MOC Flow Validation**
- Audit create flow end-to-end (upload page → API → database → S3)
- Verify endpoint alignment:
  - Frontend expects: `/api/v2/mocs/search` vs Backend has: `GET /mocs`
  - Confirm query param compatibility (q, tags, theme, sort, order, page, limit)
- Fix any request/response schema mismatches
- Cleanup deprecated code and unused endpoints
- Document any API versioning issues (v2 prefix usage)

---

## Deferred to Post-MVP

The following features were considered but deferred to reduce MVP scope:

| Feature | Reason | Future Story |
|---------|--------|--------------|
| Soft delete with restore | Hard delete sufficient for MVP; adds complexity | INST-2000+ |
| Multipart upload (>100MB files) | Presigned URL handles up to 100MB; multipart needed for very large files | INST-2010 |
| File reordering | Requires backend `displayOrder` field and PATCH endpoint | INST-2020 |
| Gallery image uploads | Backend endpoint missing; thumbnail sufficient for MVP | INST-2030 |
| Rate limiting observability | Nice-to-have; can add post-launch based on usage patterns | INST-1006 (keep as optional) |
| S3 cleanup job for failed uploads | Manual cleanup acceptable for MVP; automate later | INST-1007 (keep as optional) |

---

## Source Files

Original story files are located at:
`docs/stories.bak/epic-4-instructions/inst-1XXX-*.md`

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action |
|---|---|---|
| 2026-01-24 15:00 | Claude Opus 4.5 | Initial index creation |
| 2026-01-30 | Claude Opus 4.5 | Removed 13 stories: INST-1008 (route exists), INST-1016-1027 (soft delete deferred from MVP). Updated INST-1005 to validation story (PATCH endpoint exists). |
| 2026-01-30 | Claude Opus 4.5 | Gap analysis and story updates: (1) INST-1002 updated to hybrid presigned URL approach (direct for ≤10MB, presigned for >10MB); (2) Added INST-1008 for RTK Query mutations; (3) Clarified edit flow in INST-1005; (4) Removed file reordering from INST-1011; (5) Added error scenarios to INST-1014; (6) Added search validation to INST-1029; (7) Created "Deferred to Post-MVP" section. |
