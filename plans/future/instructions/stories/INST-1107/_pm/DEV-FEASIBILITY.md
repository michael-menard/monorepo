# Dev Feasibility Review: INST-1107 - Download Files

## Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Well-scoped story with established patterns. Backend pattern exists (presigned URLs for uploads in inspiration domain), frontend pattern exists (PDF download button in detail page). Core complexity is low - just generating a presigned GET URL instead of PUT. No new infrastructure required.

---

## Likely Change Surface (Core Only)

### Areas/Packages for Core Journey

**Backend:**
- `apps/api/lego-api/domains/mocs/routes.ts` - Add GET `/mocs/:id/files/:fileId/download` route
- `apps/api/lego-api/domains/mocs/application/services.ts` - Add `getFileDownloadUrl` method to MocService
- `apps/api/lego-api/domains/mocs/adapters/repositories.ts` - Query `moc_files` table (existing method works)
- `apps/api/lego-api/domains/mocs/types.ts` - Add `GetFileDownloadUrlResponse` schema

**Frontend:**
- `apps/web/app-instructions-gallery/src/components/FileDownloadButton.tsx` - **NEW** component
- `apps/web/app-instructions-gallery/src/pages/detail-page.tsx` - Integrate FileDownloadButton into file list
- `packages/core/api-client/src/rtk/instructions-api.ts` - Add `getFileDownloadUrl` query
- `packages/core/api-client/src/schemas/instructions.ts` - Add download URL response schema

**Minimal Surface:**
- 1 new backend route (~50 lines)
- 1 new service method (~40 lines)
- 1 new RTK Query endpoint (~30 lines)
- 1 new component (~100 lines)
- Integration into detail page (~20 lines)

Total estimated LOC: ~240 lines (small story)

### Endpoints for Core Journey

**New Endpoint:**
- `GET /mocs/:id/files/:fileId/download`
  - Input: mocId (path), fileId (path), userId (from auth context)
  - Output: `{ downloadUrl: string, expiresAt: string }`
  - Logic: Query file → verify ownership → generate presigned S3 URL → return

**Existing Endpoints (No Changes):**
- `GET /mocs/:id` - Already returns files array, no changes needed

### Critical Deploy Touchpoints

**IAM Permissions:**
- Lambda execution role must have `s3:GetObject` on MOC files bucket
- **Verify**: Check serverless.yml or IAM console for existing S3 permissions
- **Risk**: Low - upload already requires S3 permissions, download uses same bucket

**Environment Variables:**
- `S3_BUCKET` - Already exists (used for uploads)
- `AWS_REGION` - Already exists
- No new env vars required

**No New Infrastructure:**
- No new S3 buckets
- No new API Gateway routes (uses existing `/mocs` base)
- No new database tables

---

## MVP-Critical Risks (Max 5)

### Risk 1: S3 IAM Permissions Missing
- **Why it blocks MVP**: If Lambda lacks `s3:GetObject` permission, all download requests fail with 500
- **Likelihood**: Low (upload permissions likely grant full S3 access)
- **Required Mitigation**:
  - Verify IAM policy before deployment
  - Test in dev environment with real S3
  - Add explicit `s3:GetObject` permission if missing

### Risk 2: File Belongs to Wrong MOC (Authorization Bypass)
- **Why it blocks MVP**: Security vulnerability - user could guess fileIds and download others' files
- **Likelihood**: Medium (if JOIN logic incorrect)
- **Required Mitigation**:
  - Database query MUST join `moc_files.mocId = mocs.id` AND `mocs.userId = {authenticated user}`
  - Unit test unauthorized access returns 404
  - Integration test verifies JOIN logic

### Risk 3: Filename Encoding in Content-Disposition
- **Why it blocks MVP**: Files with special characters (Unicode, quotes, spaces) may fail to download or download with garbled names
- **Likelihood**: Medium (edge case but common in user data)
- **Required Mitigation**:
  - Use RFC 5987 encoding for filenames: `filename*=UTF-8''${encodeURIComponent(fileName)}`
  - Test with filenames containing: spaces, quotes, apostrophes, Unicode
  - Fallback: Sanitize filename to ASCII if encoding fails

### Risk 4: Presigned URL Expiry Too Short
- **Why it blocks MVP**: If expiry is too short (e.g., 60s), slow networks or large files may fail mid-download
- **Likelihood**: Low (900s / 15 minutes is standard)
- **Required Mitigation**:
  - Use 900-second (15-minute) expiry (standard for downloads)
  - Document that user must re-request URL if expired
  - Log warning if user attempts download after 10 minutes (edge case monitoring)

### Risk 5: INST-1101 Dependency Not Ready
- **Why it blocks MVP**: E2E tests require MOC detail page to exist with file list
- **Likelihood**: Low (INST-1101 marked "Ready to Work" in index)
- **Required Mitigation**:
  - Verify INST-1101 is complete before starting INST-1107
  - Unit/integration tests can proceed without INST-1101
  - E2E tests blocked until INST-1101 done
  - **Fallback**: Implement INST-1107 backend first, frontend waits for INST-1101

---

## Missing Requirements for MVP

### 1. Filename Encoding Standard
**Missing Decision:**
- How to handle filenames with special characters (Unicode, quotes, slashes, etc.)?
- Which encoding standard to use (RFC 2616 vs RFC 5987)?

**Concrete Decision Text for PM:**
> Use RFC 5987 encoding for Content-Disposition: `filename*=UTF-8''${encodeURIComponent(originalFilename)}`. Fallback: If encoding fails or filename invalid, use `filename="download.pdf"` with logged warning.

### 2. Presigned URL Expiry Duration
**Missing Decision:**
- 5 minutes? 15 minutes? 1 hour?

**Concrete Decision Text for PM:**
> Presigned URLs expire in 900 seconds (15 minutes). This balances security (short-lived) with UX (enough time for large file downloads on slow connections).

### 3. Error Message for Expired URL
**Missing Decision:**
- What does user see if they try to use expired presigned URL?

**Concrete Decision Text for PM:**
> If S3 returns 403 (expired signature), frontend shows toast: "Download link expired. Please try again." Backend logs event for monitoring.

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

**Backend Evidence:**
1. `.http` file demonstrating:
   - Successful download URL generation (200 response)
   - Unauthorized access blocked (404 response)
   - File not found handled (404 response)
2. Unit test coverage ≥90% on service layer
3. Integration test covering all error cases (ERR-1 through ERR-5 from TEST-PLAN.md)

**Frontend Evidence:**
1. Component renders in Storybook (or screenshot)
2. Loading state visible in UI
3. Error state visible with toast
4. Unit test coverage ≥80% on component logic

**E2E Evidence:**
1. Playwright test downloads real file from dev S3 bucket
2. Downloaded file has correct filename
3. Video or screenshot of download flow

### Critical CI/Deploy Checkpoints

**Before Merge:**
- [ ] All unit tests pass (backend + frontend)
- [ ] Integration tests pass (including auth tests)
- [ ] E2E test passes (real S3 download)
- [ ] IAM permissions verified in dev environment
- [ ] No hardcoded file paths or bucket names

**Post-Deploy (Staging):**
- [ ] Smoke test: Download file from staging environment
- [ ] Monitor CloudWatch for S3 presigning errors (should be zero)
- [ ] Verify presigned URL expiry works (wait 16 minutes, verify 403)

---

## Implementation Estimate

| Task | Estimated Time | Notes |
|------|----------------|-------|
| Backend route + service | 3-4 hours | Straightforward with existing patterns |
| RTK Query integration | 1-2 hours | Similar to upload mutations |
| FileDownloadButton component | 2-3 hours | Including loading/error states |
| Unit tests (backend) | 2 hours | Service layer mocking |
| Unit tests (frontend) | 1-2 hours | Component + RTK Query |
| Integration tests | 2-3 hours | Auth edge cases |
| E2E tests | 2-3 hours | Real S3 download flow |
| Documentation | 1 hour | Update API docs, component README |
| **Total** | **2-3 days** | Includes testing and documentation |

**Confidence**: High - well-scoped, clear requirements, proven patterns.

---

## FUTURE-RISKS.md (Non-MVP Concerns)

### Non-MVP Risks

#### Risk: Download Analytics Missing
- **Impact**: No visibility into which files are downloaded most, download failure rate, etc.
- **Recommended Timeline**: Post-MVP (Phase 2)
- **Mitigation**: Add CloudWatch metrics for download requests (count, success rate)

#### Risk: Large File Downloads May Time Out Users
- **Impact**: If file >50MB and network slow, presigned URL may expire mid-download
- **Recommended Timeline**: Post-MVP (monitor first)
- **Mitigation**: Extend presigned URL expiry to 1 hour for files >25MB

#### Risk: No Download Retry Mechanism
- **Impact**: If download fails (network error), user must manually retry
- **Recommended Timeline**: Post-MVP (UX enhancement)
- **Mitigation**: Add retry button or auto-retry with exponential backoff

#### Risk: Batch Downloads Not Supported
- **Impact**: Users must download files one-by-one (tedious for MOCs with many files)
- **Recommended Timeline**: Post-MVP (feature request)
- **Mitigation**: Add "Download All as ZIP" button (requires backend ZIP generation)

---

## Scope Tightening Suggestions

### Clarifications for Future Iterations
- **Download History**: Track download events in database? (Not MVP)
- **Download Limits**: Rate limiting per user? (Not MVP, CloudWatch monitoring only)
- **CDN for Downloads**: Use CloudFront signed URLs instead of S3? (Not MVP, S3 is fine)

### OUT OF SCOPE Candidates for Later
- [ ] Download progress tracking (browser native progress is sufficient)
- [ ] File preview before download (PDF thumbnails)
- [ ] Download notifications (email/push when download completes)
- [ ] Download queue (batch downloads)
- [ ] Download speed analytics (CloudWatch metrics only)

---

## Future Requirements

### Nice-to-Have Requirements
- **Retry Logic**: Auto-retry failed downloads with exponential backoff
- **Download History UI**: Show list of recently downloaded files
- **File Validation**: Verify file integrity (checksum) before/after download
- **Download Notifications**: Email or push notification when large file ready

### Polish and Edge Case Handling
- **Copy Download Link**: Button to copy presigned URL to clipboard (for sharing within org)
- **QR Code for Mobile**: Generate QR code with download link for mobile access
- **Download Speed Limit**: Throttle download speed to reduce S3 costs (not typical)
- **Download Expiry Warning**: Show countdown timer if presigned URL expiring soon (<5 min remaining)

---

## Reuse Opportunities

| Pattern/Package | Location | Reuse For |
|-----------------|----------|-----------|
| Presigned URL generation | `apps/api/lego-api/domains/inspiration/adapters/storage.ts:89-90` | Download URL generation (use GetObjectCommand instead of PutObjectCommand) |
| MocService authorization | `apps/api/lego-api/domains/mocs/application/services.ts` | Verify user owns MOC |
| RTK Query pattern | `packages/core/api-client/src/rtk/instructions-api.ts` | Add download query |
| Button component | `@repo/app-component-library/_primitives/button` | Download button UI |
| Error handling | `apps/api/lego-api/domains/mocs/routes.ts:309-343` | Map errors to HTTP status codes |

**Reuse Percentage**: ~80% of patterns already exist. Only new logic: GetObjectCommand for download (vs PutObjectCommand for upload).

---

## Conclusion

**INST-1107 is highly feasible for MVP** with clear scope, proven patterns, and minimal risk. Estimated 2-3 days implementation including comprehensive testing. No new infrastructure required. Primary risks are easily mitigated with standard practices (IAM verification, authorization testing, filename encoding). Story is ready for implementation once INST-1101 (View MOC Details) is complete.
