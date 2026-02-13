---
generated: "2026-02-07"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INST-1107

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file exists. Proceeded with codebase scanning for existing patterns.

### Relevant Existing Features
| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| S3 Presigned URL Generation | `apps/api/lego-api/domains/inspiration/adapters/storage.ts` | Active | Pattern for generating presigned URLs using `@aws-sdk/s3-request-presigner` |
| MOC Detail Endpoint | `apps/api/lego-api/domains/mocs/routes.ts:211-270` | Active | Returns file metadata including downloadUrl (currently using fileUrl) |
| Detail Page with Download | `apps/web/app-instructions-gallery/src/pages/detail-page.tsx:318-325` | Active | PDF download button exists (simple `<a href>` pattern) |
| RTK Query File Mutations | `packages/core/api-client/src/rtk/instructions-api.ts` | Active | Upload/delete file mutations exist, no download query yet |

### Active In-Progress Work
| Story | Area | Potential Overlap |
|-------|------|-------------------|
| INST-1101 | View MOC Details | **BLOCKING** - Detail page must exist before download can be tested E2E |
| INST-1102 | Create Basic MOC | In QA - Provides test data setup |
| INST-1104 | Upload Instructions | Completed - Provides files to download |

### Constraints to Respect
| Constraint | Source | Details |
|------------|--------|---------|
| Presigned URLs expire | AWS S3 | Generated URLs should have appropriate expiry (900-3600s) |
| Content-Disposition header | HTTP Standard | Must be set for correct filename on download |
| Authentication required | ADR-004 | Only file owner can download (verify in service layer) |
| API path schema | ADR-001 | Frontend uses `/api/v2/mocs`, backend uses `/mocs` |

---

## Retrieved Context

### Related Endpoints
| Endpoint | File | Status | Notes |
|----------|------|--------|-------|
| `GET /mocs/:id` | `apps/api/lego-api/domains/mocs/routes.ts:211` | ✅ Exists | Returns files with downloadUrl field |
| `GET /mocs/:id/files/:fileId/download` | N/A | ❌ Missing | **Needs implementation** |

### Related Components
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| DetailPage | `apps/web/app-instructions-gallery/src/pages/detail-page.tsx` | ✅ Exists | Has PDF download button (lines 318-325) |
| FileDownloadButton | `apps/web/app-instructions-gallery/src/components/FileDownloadButton.tsx` | ❌ Missing | **Needs creation** |

### Reuse Candidates
| Item | Location | Reuse For |
|------|----------|-----------|
| `getSignedUrl` from `@aws-sdk/s3-request-presigner` | `apps/api/lego-api/domains/inspiration/adapters/storage.ts:7,90` | Generate presigned download URLs |
| `GetObjectCommand` from `@aws-sdk/client-s3` | Import needed | Create S3 get object command for presigned URL |
| Button component | `@repo/app-component-library` | Download button UI |
| Download icon | `lucide-react` | Already imported in detail-page.tsx |
| MocService pattern | `apps/api/lego-api/domains/mocs/application/` | Add getDownloadUrl method |
| RTK Query mutation pattern | `packages/core/api-client/src/rtk/instructions-api.ts` | Add download URL query |

---

## Knowledge Context

### Lessons Learned
KB query not performed (no baseline to query against).

### Blockers to Avoid (from past stories)
- **Path mismatches**: Ensure frontend RTK Query path matches backend route (ADR-001)
- **Missing authentication**: Verify user owns MOC before generating download URL
- **Large serverless.yml reads**: Don't scan entire serverless config files

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/mocs/:id/files/:fileId/download`, Backend: `/mocs/:id/files/:fileId/download` |
| ADR-004 | Authentication | Must verify userId owns MOC before generating download URL |
| ADR-005 | Testing Strategy | UAT must use real S3, not mocks |
| ADR-006 | E2E in Dev Phase | At least one E2E test required during implementation |

### Patterns to Follow
- Use `getSignedUrl(s3Client, GetObjectCommand, { expiresIn: 900 })` for download URLs
- Set `ResponseContentDisposition` in GetObjectCommand for correct filename
- Return presigned URL from API, let browser handle download
- Use RTK Query for API call with loading state
- Invalidate MOC cache tags on file operations

### Patterns to Avoid
- Don't use direct S3 URLs (must be presigned for security)
- Don't download file through backend (too large for Lambda response limits)
- Don't cache presigned URLs (they expire)

---

## Conflict Analysis

No blocking conflicts detected.

**Non-blocking dependency:**
- INST-1101 (View MOC Details) - Listed as blocking in index but marked "Ready to Work" status. Detail page exists and is functional. Download feature can be added independently.

---

## Story Seed

### Title
Download Files

### Description

**Context:**
MOC detail page (INST-1101) displays a list of uploaded files (instructions PDFs, parts lists) but users cannot download them. The backend already stores file metadata in `moc_files` table including S3 keys, but no download endpoint exists to generate secure presigned URLs.

**Problem:**
Users need a way to download instruction PDFs and parts list files they've uploaded. Direct S3 URLs would expose the bucket structure and bypass authentication. Files must be served securely with correct filenames.

**Solution:**
Implement a download flow that:
1. **Frontend**: Add download button component with loading state
2. **Backend**: Create `/mocs/:id/files/:fileId/download` endpoint that generates presigned S3 URL
3. **Security**: Verify user owns the MOC before generating URL
4. **UX**: Set Content-Disposition header so file downloads with original filename

### Initial Acceptance Criteria

#### Backend (API)
- [ ] AC-1: `GET /mocs/:id/files/:fileId/download` endpoint exists
- [ ] AC-2: Endpoint queries `moc_files` table for s3Key and originalFilename
- [ ] AC-3: Endpoint verifies file belongs to user's MOC (returns 404 if not)
- [ ] AC-4: Endpoint generates presigned S3 URL using `getSignedUrl` + `GetObjectCommand`
- [ ] AC-5: Presigned URL includes `ResponseContentDisposition` header with filename
- [ ] AC-6: Presigned URL expires in 900 seconds (15 minutes)
- [ ] AC-7: Endpoint returns JSON: `{ downloadUrl: string, expiresAt: ISO8601 }`
- [ ] AC-8: Returns 401 if user not authenticated
- [ ] AC-9: Returns 404 if file not found or user doesn't own MOC
- [ ] AC-10: Returns 500 with error code if S3 presigning fails

#### Frontend (UI)
- [ ] AC-11: `FileDownloadButton` component created in `components/` directory
- [ ] AC-12: Button accepts props: `mocId`, `fileId`, `fileName`
- [ ] AC-13: Button renders with Download icon and "Download" text
- [ ] AC-14: Button shows loading spinner during URL generation
- [ ] AC-15: Button disabled during loading state
- [ ] AC-16: On click, calls RTK Query to fetch download URL
- [ ] AC-17: On success, triggers browser download using `window.location.href` or `<a download>`
- [ ] AC-18: On error, shows toast notification with error message
- [ ] AC-19: Download button appears on each file in detail page file list
- [ ] AC-20: Button accessible via keyboard (Tab, Enter)

#### RTK Query Integration
- [ ] AC-21: Add `getFileDownloadUrl` query to `instructionsApi`
- [ ] AC-22: Query endpoint: `/instructions/mocs/:mocId/files/:fileId/download`
- [ ] AC-23: Query returns `{ downloadUrl: string, expiresAt: string }`
- [ ] AC-24: Query does not cache results (presigned URLs expire)
- [ ] AC-25: Query validates response with Zod schema

#### Database
- [ ] AC-26: No schema changes required (uses existing `moc_files` table)
- [ ] AC-27: Query includes `s3Key`, `originalFilename`, `mocId`, `fileType`

### Non-Goals
- Multi-file zip downloads (single file only)
- Download progress tracking (browser handles this)
- Download history/analytics (future story)
- Virus scanning before download (assumes files already scanned on upload)
- CDN delivery (files served from S3 via presigned URL)
- Thumbnail downloads (covered by INST-1103)

### Reuse Plan
- **Components**: `Button` from `@repo/app-component-library`
- **Patterns**:
  - Presigned URL generation from `apps/api/lego-api/domains/inspiration/adapters/storage.ts`
  - RTK Query mutation pattern from `instructionsApi`
  - Service layer authorization pattern from `mocService.getMoc`
- **Packages**:
  - `@aws-sdk/client-s3` (GetObjectCommand)
  - `@aws-sdk/s3-request-presigner` (getSignedUrl)
  - `@repo/logger` for backend logging
  - `lucide-react` for Download icon

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Unit Tests**:
  - Backend: Test presigned URL generation with mocked S3 client
  - Backend: Test authorization failure cases (wrong user, missing file)
  - Frontend: Test loading states, error states, success flow
- **Integration Tests**:
  - Backend: Test endpoint with real database, mocked S3
  - Frontend: Test RTK Query with MSW handlers
- **E2E Tests**:
  - Create file, then download it (verify filename matches)
  - Verify unauthorized user cannot download

### For UI/UX Advisor
- **Component Design**:
  - Button should match existing file list item styling
  - Loading state should be clear (spinner + disabled)
  - Error messages should be user-friendly ("Download failed. Please try again.")
- **Accessibility**:
  - Keyboard navigation (Tab to focus, Enter to activate)
  - Screen reader announces "Download [filename]"
  - Focus visible indicator on button
- **Responsive**:
  - Button scales appropriately on mobile vs desktop
  - Touch target size meets minimum (44x44px)

### For Dev Feasibility
- **Complexity**: Low
- **Estimated Effort**: 2-3 days
- **Risks**:
  - S3 credentials/permissions must be configured correctly in Lambda
  - Presigned URL expiry timing needs balance (too short = bad UX, too long = security risk)
- **Dependencies**:
  - Requires `@aws-sdk/s3-request-presigner` in API dependencies
  - Blocked by INST-1101 for E2E testing (detail page must exist)
- **Testing Considerations**:
  - E2E tests should use real S3 bucket (per ADR-005)
  - Unit tests can mock S3 client
