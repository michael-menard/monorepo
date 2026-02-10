# Test Plan: INST-1106 Upload Parts List

## Scope Summary

### Endpoints Touched
- `POST /api/v2/mocs/:id/files` (frontend path)
- `POST /mocs/:id/files` (backend path) with `type=parts-list` query param or body field

### UI Touched
- Yes - PartsListUpload component on MOC detail page
- Parts list display card showing uploaded file

### Data/Storage Touched
- S3 storage for parts list files (CSV, XML, PDF)
- `moc_files` table: insert/replace records with `type='parts-list'`
- Single file enforcement (delete old file when new one uploaded)

---

## Happy Path Tests

### Test 1: Upload CSV Parts List
**Setup**:
- User authenticated and has created a MOC (mocId exists)
- No existing parts list for this MOC
- CSV file ready: `parts-list.csv` (2MB, valid CSV format)

**Action**:
1. Navigate to MOC detail page (`/mocs/:id`)
2. Click "Add Parts List" button in Parts List card
3. Select `parts-list.csv` from file picker
4. Verify file preview shows filename and size
5. Click "Upload" button

**Expected Outcome**:
- Upload progress shows (spinner or loading state)
- Success toast displays: "Parts list uploaded!"
- Parts list card updates showing uploaded file
- File metadata displays: name, size, upload date
- Download button appears for the file

**Evidence**:
- Network tab: POST request to `/api/v2/mocs/:id/files` with multipart/form-data
- Response body: `{ id, mocId, type: 'parts-list', name, size, url, uploadedAt }`
- Status code: 200 or 201
- S3: File exists at key `mocs/{userId}/{mocId}/parts-list/parts-list.csv`
- Database: `moc_files` record with `type='parts-list'`, `mocId`, `name='parts-list.csv'`

---

### Test 2: Upload XML Parts List
**Setup**:
- User authenticated with existing MOC
- No existing parts list
- XML file ready: `parts-inventory.xml` (5MB, valid XML format)

**Action**:
1. Navigate to MOC detail page
2. Click "Add Parts List"
3. Select `parts-inventory.xml`
4. Click "Upload"

**Expected Outcome**:
- File uploads successfully
- Toast: "Parts list uploaded!"
- XML file displays in parts list card

**Evidence**:
- POST request with XML file
- Response: file metadata with `name='parts-inventory.xml'`
- S3 key: `mocs/{userId}/{mocId}/parts-list/parts-inventory.xml`
- MIME type validation passed: `application/xml` or `text/xml`

---

### Test 3: Upload PDF Parts List
**Setup**:
- User authenticated with existing MOC
- No existing parts list
- PDF file ready: `lego-parts.pdf` (8MB)

**Action**:
1. Navigate to MOC detail page
2. Click "Add Parts List"
3. Select `lego-parts.pdf`
4. Click "Upload"

**Expected Outcome**:
- PDF uploads successfully
- Toast: "Parts list uploaded!"
- PDF file displays with download button

**Evidence**:
- POST request with PDF file
- Response: file metadata with `name='lego-parts.pdf'`
- MIME type: `application/pdf`
- File size: 8,000,000 bytes (within 10MB limit)

---

### Test 4: Replace Existing Parts List
**Setup**:
- User authenticated with MOC that already has a parts list (CSV)
- Existing parts list: `old-parts.csv` uploaded previously
- New file ready: `updated-parts.xml` (3MB)

**Action**:
1. Navigate to MOC detail page (existing parts list visible)
2. Click "Replace Parts List" button
3. Select `updated-parts.xml`
4. Click "Upload"

**Expected Outcome**:
- Old CSV file replaced with new XML file
- Toast: "Parts list updated!"
- Parts list card shows only the new XML file (no old CSV)

**Evidence**:
- Backend logs: Old S3 object deletion logged
- S3: Old key `old-parts.csv` deleted, new key `updated-parts.xml` created
- Database: Single `moc_files` record with `type='parts-list'` for this MOC (updated, not inserted)
- Response: New file metadata

---

## Error Cases

### Error 1: Invalid File Type (JPEG Rejected)
**Setup**:
- User authenticated with MOC
- Attempt to upload JPEG image: `photo.jpg` (2MB)

**Action**:
1. Click "Add Parts List"
2. Select `photo.jpg`
3. Frontend validates file type

**Expected Outcome**:
- Client-side validation blocks upload
- Error message: "Only CSV, XML, and PDF files are allowed"
- Upload button disabled
- No POST request sent

**Evidence**:
- File input `accept` attribute filters file types
- Client-side validation runs before upload
- No network request in browser dev tools

---

### Error 2: File Too Large (15MB Rejected)
**Setup**:
- User authenticated with MOC
- Large file: `huge-parts.csv` (15MB, exceeds 10MB limit)

**Action**:
1. Click "Add Parts List"
2. Select `huge-parts.csv`
3. Client validates file size

**Expected Outcome**:
- Client-side validation rejects file
- Error toast: "File too large. Max 10MB"
- Upload button disabled

**Evidence**:
- File size check runs before upload
- No POST request sent
- Error logged to console

---

### Error 3: Backend MIME Type Rejection
**Setup**:
- User attempts to bypass client validation
- File with .csv extension but actually .exe content (spoofed MIME type)

**Action**:
1. Upload spoofed file
2. Backend validates actual MIME type

**Expected Outcome**:
- Backend rejects file
- Response: 400 Bad Request
- Error body: `{ error: 'INVALID_MIME_TYPE', message: 'Only CSV, XML, and PDF files are allowed' }`
- Security event logged to CloudWatch

**Evidence**:
- POST request sent with spoofed file
- Response status: 400
- Backend logs: Security event with userId, filename, rejection reason
- No S3 upload
- No database insert

---

### Error 4: Unauthorized Access (Wrong User)
**Setup**:
- User A authenticated
- User A attempts to upload parts list to User B's MOC (mocId belongs to User B)

**Action**:
1. User A navigates to `/mocs/{userB-moc-id}`
2. Attempts to upload parts list

**Expected Outcome**:
- Backend authorization check fails
- Response: 403 Forbidden
- Error body: `{ error: 'FORBIDDEN', message: 'You do not own this MOC' }`

**Evidence**:
- POST request sent
- Response status: 403
- Auth middleware verifies userId matches MOC owner
- No S3 upload
- No database update

---

### Error 5: MOC Not Found
**Setup**:
- User authenticated
- Attempts to upload to non-existent MOC (mocId = invalid UUID)

**Action**:
1. Navigate to `/mocs/00000000-0000-0000-0000-000000000000`
2. Attempt file upload

**Expected Outcome**:
- Backend returns 404 Not Found
- Error body: `{ error: 'NOT_FOUND', message: 'MOC not found' }`

**Evidence**:
- POST request with invalid mocId
- Response status: 404
- Database query finds no MOC with that ID

---

### Error 6: S3 Upload Failure
**Setup**:
- User authenticated with valid MOC
- S3 service temporarily unavailable (simulated)

**Action**:
1. Upload valid CSV file
2. Backend attempts S3 upload

**Expected Outcome**:
- S3 upload fails
- Backend returns 500 Internal Server Error
- Error body: `{ error: 'UPLOAD_FAILED', message: 'Failed to upload file. Please try again' }`
- Database NOT updated (transaction rollback)

**Evidence**:
- POST request sent
- Response status: 500
- Backend logs: S3 error logged to CloudWatch
- Database: No new `moc_files` record (transaction rolled back)
- No S3 object created

---

## Edge Cases (Reasonable)

### Edge 1: Empty File (0 Bytes)
**Setup**:
- User attempts to upload empty CSV file (0 bytes)

**Action**:
1. Select empty file
2. Attempt upload

**Expected Outcome**:
- Backend validation rejects
- Response: 400 Bad Request
- Error: `{ error: 'FILE_TOO_SMALL', message: 'File cannot be empty' }`

**Evidence**:
- File size validation runs: 1 byte ≤ size ≤ 10MB
- Response status: 400

---

### Edge 2: Exact 10MB File (Boundary)
**Setup**:
- File exactly 10,485,760 bytes (10 * 1024 * 1024)

**Action**:
1. Upload exact 10MB CSV file

**Expected Outcome**:
- File uploads successfully (boundary inclusive)
- Status: 200
- File stored in S3

**Evidence**:
- File size: 10,485,760 bytes
- Validation passes: size ≤ MAX_FILE_SIZE
- Upload succeeds

---

### Edge 3: File with Special Characters in Filename
**Setup**:
- File: `parts-list (v2) [updated] @2024.csv` (special characters)

**Action**:
1. Upload file with special characters

**Expected Outcome**:
- Filename sanitized by backend
- S3 key: `mocs/{userId}/{mocId}/parts-list/parts-list-v2-updated-2024.csv`
- Special characters replaced with hyphens or removed

**Evidence**:
- Original filename preserved in `moc_files.name` field
- S3 key sanitized
- File uploads successfully

---

### Edge 4: Concurrent Upload Attempts
**Setup**:
- User clicks "Upload" button twice rapidly (double-submit)

**Action**:
1. Click "Upload"
2. Immediately click "Upload" again before first completes

**Expected Outcome**:
- Upload button disabled after first click
- Only one upload request sent
- Or: Second request returns 409 Conflict if first still processing

**Evidence**:
- Frontend state management prevents double-submit
- Loading state disables button
- Network tab shows single POST request

---

### Edge 5: Upload During Network Interruption
**Setup**:
- User starts upload
- Network disconnected mid-upload (simulated)

**Action**:
1. Start uploading large file (8MB)
2. Disconnect network during upload

**Expected Outcome**:
- Upload fails with network error
- Error toast: "Network error. Please try again."
- Retry button or option to re-upload

**Evidence**:
- Network tab: Request aborted or timeout
- Error handling catches network failure
- No partial file in S3 (multipart upload cleanup)

---

### Edge 6: Very Long Filename (>255 Characters)
**Setup**:
- File with extremely long name (300 characters)

**Action**:
1. Upload file with long filename

**Expected Outcome**:
- Backend truncates or hashes filename
- S3 key remains under AWS limits
- File uploads successfully

**Evidence**:
- Filename sanitization logic handles long names
- S3 key within AWS limits (1024 characters)
- Original filename stored in database (truncated if needed)

---

## Required Tooling Evidence

### Backend Testing

#### .http Requests (VS Code REST Client)
```http
### Upload CSV Parts List
POST http://localhost:3001/mocs/{{mocId}}/files
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
Authorization: Bearer {{authToken}}

------WebKitFormBoundary
Content-Disposition: form-data; name="type"

parts-list
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="parts.csv"
Content-Type: text/csv

< ./test-fixtures/parts.csv
------WebKitFormBoundary--

### Expected Response: 200 or 201
# Assertions:
# - response.id exists
# - response.type === 'parts-list'
# - response.mocId === {{mocId}}
# - response.name === 'parts.csv'
# - response.url starts with CloudFront domain
```

#### Fields/Status Codes to Assert
- **200/201**: Success
- **400**: INVALID_MIME_TYPE, FILE_TOO_LARGE, FILE_TOO_SMALL, INVALID_EXTENSION
- **403**: FORBIDDEN (user doesn't own MOC)
- **404**: NOT_FOUND (MOC not found)
- **500**: UPLOAD_FAILED (S3 or database error)

#### Response Schema Validation
- Use Zod schema to validate response
- Required fields: `id`, `mocId`, `type`, `name`, `size`, `url`, `uploadedAt`
- `type` must be `'parts-list'`

---

### Frontend Testing (Playwright)

#### E2E Test: Upload CSV Parts List
```typescript
test('uploads CSV parts list successfully', async ({ page }) => {
  // Setup: Navigate to MOC detail page
  await page.goto('/mocs/test-moc-id')

  // Action: Upload CSV file
  await page.click('[data-testid="add-parts-list-button"]')
  const fileInput = await page.locator('input[type="file"]')
  await fileInput.setInputFiles('./fixtures/parts-list.csv')
  await page.click('[data-testid="upload-button"]')

  // Assert: Success toast appears
  await expect(page.locator('[role="alert"]')).toContainText('Parts list uploaded!')

  // Assert: File displayed in parts list card
  await expect(page.locator('[data-testid="parts-list-file"]')).toContainText('parts-list.csv')
  await expect(page.locator('[data-testid="download-button"]')).toBeVisible()
})
```

#### E2E Test: Replace Existing Parts List
```typescript
test('replaces existing parts list with new file', async ({ page }) => {
  // Setup: MOC with existing CSV parts list
  await page.goto('/mocs/moc-with-parts-list')

  // Assert: Existing file visible
  await expect(page.locator('[data-testid="parts-list-file"]')).toContainText('old-parts.csv')

  // Action: Upload new XML file
  await page.click('[data-testid="replace-parts-list-button"]')
  await page.locator('input[type="file"]').setInputFiles('./fixtures/new-parts.xml')
  await page.click('[data-testid="upload-button"]')

  // Assert: Old file replaced
  await expect(page.locator('[data-testid="parts-list-file"]')).toContainText('new-parts.xml')
  await expect(page.locator('[data-testid="parts-list-file"]')).not.toContainText('old-parts.csv')
})
```

#### E2E Test: Reject Invalid File Type
```typescript
test('rejects JPEG file with error message', async ({ page }) => {
  await page.goto('/mocs/test-moc-id')
  await page.click('[data-testid="add-parts-list-button"]')
  await page.locator('input[type="file"]').setInputFiles('./fixtures/image.jpg')

  // Assert: Error message
  await expect(page.locator('[role="alert"]')).toContainText('Only CSV, XML, and PDF files are allowed')

  // Assert: Upload button disabled
  await expect(page.locator('[data-testid="upload-button"]')).toBeDisabled()
})
```

#### Artifacts to Capture
- Video recording of upload flow
- Trace file for debugging failures
- Screenshot on upload success
- Network HAR file to verify API calls

---

## Risks to Call Out

### Risk 1: Backend Endpoint Structure Unclear (MEDIUM)
**Description**: Story index references `POST /mocs/:id/files` with `type='parts-list'`, but actual backend implementation may differ (could be `/mocs/:id/files/parts-list` or use body field instead of query param).

**Mitigation**: Dev Feasibility review must confirm exact endpoint structure by inspecting existing routes.ts and service layer.

**Blocking**: No - can be clarified during implementation. Test plan adapts to actual endpoint.

---

### Risk 2: Single File Replacement Logic (MEDIUM)
**Description**: Enforcing single parts list per MOC requires:
- Backend checks for existing `type='parts-list'` record
- Deletes old S3 object before uploading new
- Updates database record (or deletes + inserts)

**Mitigation**: Test Plan includes specific test case (Test 4) to verify replacement logic. Backend must log old file deletion.

**Blocking**: No - but missing this logic would fail AC requirement for single file enforcement.

---

### Risk 3: MIME Type Validation for CSV/XML (LOW)
**Description**: CSV and XML files have multiple valid MIME types:
- CSV: `text/csv`, `application/csv`
- XML: `text/xml`, `application/xml`

Backend validation must accept all valid variations.

**Mitigation**: Test Plan includes tests for both CSV and XML uploads. Backend validation function must whitelist all valid MIME types.

**Blocking**: No - but incomplete MIME type list would reject valid files.

---

### Risk 4: File Validation Reuse Assumption (LOW)
**Description**: Story seed assumes reusing `validateFileSize()` and creating new `validatePartsListFile()`. If file-validation.ts structure changes, reuse may not be straightforward.

**Mitigation**: Dev Feasibility confirms validation utility structure. Worst case: implement validation inline.

**Blocking**: No - validation logic is simple regardless of reuse.

---

## Coverage Targets

- **Frontend (PartsListUpload component)**: 80%
- **Backend (file upload route + service)**: 90%
- **File validation utilities**: 95%
- **E2E (Playwright)**: 3 happy path tests, 2 error case tests minimum
