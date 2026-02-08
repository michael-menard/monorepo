# Test Plan: INST-1107 - Download Files

## Scope Summary
- **Endpoints touched**: `GET /mocs/:id/files/:fileId/download`
- **UI touched**: Yes (FileDownloadButton component, detail page integration)
- **Data/storage touched**: Yes (`moc_files` table read, S3 presigned URL generation)

---

## Happy Path Tests

### HP-1: Download instruction PDF with correct filename
- **Setup**:
  - Authenticated user owns MOC with ID `moc-123`
  - MOC has instruction file with ID `file-456`, s3Key `instructions/user-abc/doc.pdf`, originalFilename `castle-instructions.pdf`
- **Action**:
  - User clicks Download button on instruction file
  - Frontend calls `GET /mocs/moc-123/files/file-456/download`
- **Expected**:
  - API returns 200 with `{ downloadUrl: "https://...", expiresAt: "2026-02-07T..." }`
  - downloadUrl is a valid presigned S3 URL
  - URL includes `response-content-disposition=attachment; filename="castle-instructions.pdf"`
  - expiresAt is ~15 minutes in future
  - Browser downloads file with correct filename
- **Evidence**:
  - Response JSON logged
  - Presigned URL structure verified (contains X-Amz-Signature, expires param)
  - Downloaded file has correct name

### HP-2: Download parts list CSV
- **Setup**:
  - MOC has parts list file (fileType='parts-list'), CSV format
- **Action**:
  - Click Download on parts list file
- **Expected**:
  - Same flow as HP-1
  - File downloads with `.csv` extension preserved
- **Evidence**:
  - Parts list file downloaded successfully
  - Filename matches originalFilename from database

### HP-3: Multiple file downloads from same MOC
- **Setup**:
  - MOC has 3 files (2 instruction PDFs, 1 parts list)
- **Action**:
  - Download each file sequentially
- **Expected**:
  - Each download generates fresh presigned URL
  - All 3 files download successfully
  - No cross-file contamination (correct s3Keys used)
- **Evidence**:
  - 3 distinct download URLs generated
  - 3 files downloaded with correct names

---

## Error Cases

### ERR-1: Unauthorized user cannot download
- **Setup**:
  - User A owns MOC `moc-123` with file `file-456`
  - User B attempts to download
- **Action**:
  - User B (not owner) calls `GET /mocs/moc-123/files/file-456/download`
- **Expected**:
  - API returns 404 (not revealing file exists)
  - Error body: `{ error: "NOT_FOUND" }`
  - No presigned URL generated
  - Frontend shows toast: "File not found or access denied"
- **Evidence**:
  - 404 response logged
  - Verify S3 `getSignedUrl` NOT called (check logs)

### ERR-2: File not found
- **Setup**:
  - User owns MOC `moc-123`
  - fileId `file-999` does not exist in database
- **Action**:
  - Call `GET /mocs/moc-123/files/file-999/download`
- **Expected**:
  - API returns 404
  - Error body: `{ error: "NOT_FOUND" }`
- **Evidence**:
  - 404 response
  - Database query returns no rows

### ERR-3: Unauthenticated request
- **Setup**:
  - No auth token provided
- **Action**:
  - Call download endpoint without Authorization header
- **Expected**:
  - API returns 401
  - Error body: `{ error: "UNAUTHORIZED" }`
- **Evidence**:
  - 401 response before any database query

### ERR-4: S3 presigning fails
- **Setup**:
  - Mock S3 client to throw error during `getSignedUrl`
- **Action**:
  - Attempt download
- **Expected**:
  - API returns 500
  - Error body: `{ error: "PRESIGN_FAILED" }`
  - Error logged to CloudWatch
- **Evidence**:
  - 500 response
  - Error log contains S3 exception details

### ERR-5: File belongs to different MOC
- **Setup**:
  - User owns MOC `moc-123`
  - File `file-456` belongs to MOC `moc-789` (different user)
- **Action**:
  - Call `GET /mocs/moc-123/files/file-456/download`
- **Expected**:
  - API returns 404 (file not found in this MOC's files)
- **Evidence**:
  - 404 response
  - Database JOIN ensures file.mocId = moc-123

---

## Edge Cases

### EDGE-1: Very long filename
- **Setup**:
  - File with originalFilename = 256 characters
- **Action**:
  - Download file
- **Expected**:
  - Filename truncated or encoded correctly in Content-Disposition
  - Download still succeeds
- **Evidence**:
  - Presigned URL generated
  - Download completes (filename may be truncated by browser)

### EDGE-2: Filename with special characters
- **Setup**:
  - originalFilename = `"My MOC's_Instructions (v2.1).pdf"`
- **Action**:
  - Download file
- **Expected**:
  - Filename properly encoded in Content-Disposition header
  - Browser downloads file with sanitized but recognizable name
- **Evidence**:
  - Downloaded filename preserves alphanumeric + basic punctuation

### EDGE-3: Presigned URL expiry boundary
- **Setup**:
  - Generate presigned URL
  - Wait 900 seconds (15 minutes)
- **Action**:
  - Attempt to use expired URL
- **Expected**:
  - S3 returns 403 (expired signature)
  - User must request new download URL
- **Evidence**:
  - S3 403 error after expiry
  - New request generates fresh URL

### EDGE-4: Rapid repeated download clicks
- **Setup**:
  - User double-clicks Download button quickly
- **Action**:
  - Two download requests sent within 100ms
- **Expected**:
  - Both requests succeed (stateless)
  - Two presigned URLs generated (OK, they're short-lived)
  - Or: Frontend debounces to prevent duplicate requests
- **Evidence**:
  - Either 2 successful responses OR frontend prevents duplicate

### EDGE-5: Large file download (50MB)
- **Setup**:
  - Instruction file is 50MB PDF
- **Action**:
  - Download file
- **Expected**:
  - Presigned URL generated successfully
  - Browser handles download with progress bar
  - No Lambda timeout (Lambda only generates URL, S3 serves file)
- **Evidence**:
  - Presigned URL generated in <1 second
  - File download completes (may take minutes, browser handles)

### EDGE-6: Missing s3Key in database
- **Setup**:
  - File record exists but s3Key is NULL or empty string
- **Action**:
  - Attempt download
- **Expected**:
  - API returns 500 or 404 with meaningful error
  - Error logged (data integrity issue)
- **Evidence**:
  - Error response
  - Log indicates missing s3Key

---

## Required Tooling Evidence

### Backend
**Required `.http` requests:**
```http
### HP-1: Successful download
GET {{baseUrl}}/mocs/{{mocId}}/files/{{fileId}}/download
Authorization: Bearer {{token}}

### ERR-1: Unauthorized user
GET {{baseUrl}}/mocs/{{otherUserMocId}}/files/{{fileId}}/download
Authorization: Bearer {{token}}

### ERR-2: File not found
GET {{baseUrl}}/mocs/{{mocId}}/files/invalid-file-id/download
Authorization: Bearer {{token}}

### ERR-3: No auth
GET {{baseUrl}}/mocs/{{mocId}}/files/{{fileId}}/download
```

**Assertions:**
- Status codes: 200, 401, 404, 500
- Response body shape: `{ downloadUrl: string, expiresAt: string }`
- downloadUrl contains: `X-Amz-Signature`, `response-content-disposition`
- expiresAt is valid ISO8601 timestamp

### Frontend (if UI touched)
**Playwright runs required:**
```gherkin
Feature: Download Files (INST-1107)
  Scenario: Download instruction PDF
    Given authenticated user on MOC detail page
    And MOC has instruction file "castle-instructions.pdf"
    When user clicks Download button on instructions file
    Then file downloads with correct filename
    And download button returns to ready state

  Scenario: Download parts list
    Given MOC detail page with parts list file
    When user clicks Download on parts list
    Then CSV file downloads
```

**Assertions:**
- Download button renders with Download icon
- Button shows loading spinner during API call
- Downloaded file appears in browser downloads
- Filename matches originalFilename (or close approximation)

**Artifacts:**
- Screenshot of download button in ready state
- Screenshot of download button in loading state
- Trace of download flow (optional for debugging)

---

## Risks to Call Out

### Risk 1: S3 Permissions
- **Description**: Lambda IAM role must have `s3:GetObject` permission on MOC files bucket
- **Mitigation**: Verify IAM policy before deployment, test in dev environment
- **Impact if missed**: All download requests return 500 (S3 presigning fails)

### Risk 2: CORS for S3 Downloads
- **Description**: If S3 bucket CORS not configured, browser may block download
- **Mitigation**: S3 bucket already configured for uploads, verify GET allowed
- **Impact if missed**: Downloads fail in browser with CORS error

### Risk 3: Filename Encoding Edge Cases
- **Description**: Content-Disposition header encoding varies by browser
- **Mitigation**: Test with common special characters, document limitations
- **Impact if missed**: Filenames with Unicode or special chars may download incorrectly

### Risk 4: Presigned URL Leakage
- **Description**: Presigned URLs logged or cached could be used by others within expiry window
- **Mitigation**: Short expiry (15 min), no caching, HTTPS only
- **Impact if missed**: Temporary unauthorized access to files

### Risk 5: E2E Test Flakiness
- **Description**: Browser download timing may be inconsistent in Playwright
- **Mitigation**: Use Playwright's download event listeners, not filesystem polling
- **Impact if missed**: Flaky E2E tests

---

## Test Coverage Targets

| Layer | Target | Notes |
|-------|--------|-------|
| Unit Tests (Backend) | 90% | Service layer, presigned URL generation |
| Unit Tests (Frontend) | 80% | Component logic, loading states |
| Integration Tests | 100% ACs | All happy path + error cases |
| E2E Tests | 100% MVP | Core download flow |

---

## Dependencies

- INST-1101 (View MOC Details) - **blocking for E2E** - detail page must exist to test download flow
- INST-1104 (Upload Instructions) - helpful for test data setup (uploaded files to download)
