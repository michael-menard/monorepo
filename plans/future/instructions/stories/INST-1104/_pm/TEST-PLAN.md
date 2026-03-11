# Test Plan: INST-1104 - Upload Instructions (Direct ≤10MB)

## Scope Summary

### Endpoints Touched
- `POST /api/v2/mocs/:id/files/instruction` (frontend)
- `POST /mocs/:id/files/instruction` (backend)
- `GET /api/v2/mocs/:id` (to verify uploaded files)

### UI Touched
Yes - InstructionsUpload component with file picker, file list display, validation, upload button

### Data/Storage Touched
- **Database**: `moc_files` table - insert records with `type='instruction'`
- **S3**: PDF storage at `mocs/{userId}/{mocId}/instructions/{uuid}-{filename}`
- **CloudFront**: URL conversion for file download URLs

---

## Happy Path Tests

### Test 1: Upload single PDF instruction file (5MB)
- **Setup**:
  - User authenticated
  - MOC exists with id `test-moc-456`
  - Valid PDF file (5MB, "castle-instructions.pdf")
- **Action**:
  1. Navigate to MOC detail page `/mocs/test-moc-456`
  2. Click "Add Instructions" button
  3. Select PDF file from file picker
  4. Click "Upload" button
- **Expected Outcome**:
  - File displays in selected files list with name and size
  - Loading spinner shows during upload
  - Success toast: "Instructions uploaded!"
  - File appears in instructions list on detail page
- **Evidence**:
  - POST /api/v2/mocs/test-moc-456/files/instruction returns 201 with `MocFile { id, mocId, type: 'instruction', name, size, url, uploadedAt }`
  - S3 object created at `mocs/{userId}/test-moc-456/instructions/{uuid}-castle-instructions.pdf`
  - Database `moc_files` record inserted with `type='instruction'`
  - GET /mocs/test-moc-456 response includes new file in `files` array

### Test 2: Upload multiple PDF files sequentially (3 files)
- **Setup**:
  - User authenticated
  - MOC exists
  - Three valid PDF files: "part1.pdf" (2MB), "part2.pdf" (4MB), "part3.pdf" (3MB)
- **Action**:
  1. Navigate to MOC detail page
  2. Click "Add Instructions"
  3. Select all 3 PDF files (multiple selection)
  4. Click "Upload" button
- **Expected Outcome**:
  - All 3 files display in selected files list
  - Files upload sequentially (one at a time)
  - Loading state shows for each file during upload
  - Success toast after all uploads complete
  - All 3 files appear in instructions list
- **Evidence**:
  - 3 separate POST requests to /api/v2/mocs/:id/files/instruction
  - Each returns 201 with unique file ID
  - 3 S3 objects created
  - 3 database records inserted
  - GET /mocs/:id shows all 3 files

### Test 3: Client-side validation accepts valid PDF
- **Setup**:
  - MOC exists
  - Valid PDF file (8MB, "valid-instructions.pdf")
- **Action**:
  1. Select PDF file
  2. Observe validation
- **Expected Outcome**:
  - File accepted (no error message)
  - File appears in selected files list
  - Upload button enabled
- **Evidence**:
  - No client-side validation error
  - File metadata (name, size) displayed correctly
  - MIME type checked as `application/pdf`

### Test 4: Display uploaded file in instructions list
- **Setup**:
  - MOC has 1 uploaded instruction file
- **Action**:
  1. Navigate to MOC detail page
- **Expected Outcome**:
  - Instructions card shows file with:
    - Filename
    - File size
    - Upload date
    - Download button
- **Evidence**:
  - GET /mocs/:id returns file in `files` array
  - UI renders file list item
  - CloudFront URL present for download

---

## Error Cases

### Test 5: Reject non-PDF file (client-side)
- **Setup**:
  - MOC exists
  - Invalid file: "image.jpg" (JPEG image)
- **Action**:
  1. Attempt to select JPEG file
- **Expected Outcome**:
  - File picker rejects file (if `accept="application/pdf"` enforced)
  - OR file selected but client validation shows error: "Only PDF files allowed"
  - Upload button disabled or shows error
- **Evidence**:
  - Client-side validation error message
  - No POST request made
  - File not added to selected files list

### Test 6: Reject oversized PDF (client-side >10MB)
- **Setup**:
  - MOC exists
  - PDF file "large.pdf" (15MB)
- **Action**:
  1. Select 15MB PDF file
- **Expected Outcome**:
  - Client validation error: "File too large. Max 10MB per file"
  - Upload button disabled or shows error
  - Option: Upgrade message "Use presigned upload for files >10MB (INST-1105)"
- **Evidence**:
  - Client-side file size validation error
  - No POST request made
  - File shown in list with error indicator

### Test 7: Server-side validation rejects non-PDF MIME type
- **Setup**:
  - MOC exists
  - Attempt to upload file with spoofed PDF extension but JPEG MIME type
- **Action**:
  1. POST file with `mimetype: 'image/jpeg'` to backend
- **Expected Outcome**:
  - Backend returns 400 with error code `INVALID_FILE`
  - Error message: "Only PDF files are allowed"
  - No S3 upload
  - No database record
- **Evidence**:
  - POST /mocs/:id/files/instruction returns 400
  - Response body: `{ error: 'INVALID_FILE' }`
  - Security log event created for rejected upload
  - No S3 object created

### Test 8: Server-side validation rejects oversized file
- **Setup**:
  - MOC exists
  - PDF file (12MB) - exceeds 10MB limit
- **Action**:
  1. POST file to backend
- **Expected Outcome**:
  - Backend returns 400 with error code `INVALID_FILE`
  - Error message: "File size exceeds maximum limit of 10MB"
  - No S3 upload
  - No database record
- **Evidence**:
  - POST /mocs/:id/files/instruction returns 400
  - Response body: `{ error: 'INVALID_FILE' }`
  - Security log event created
  - No S3 object created

### Test 9: Authorization failure - user does not own MOC
- **Setup**:
  - User A authenticated
  - MOC owned by User B
- **Action**:
  1. User A attempts to upload instruction file to User B's MOC
- **Expected Outcome**:
  - Backend returns 403 Forbidden
  - Error message: "You do not have permission to upload files to this MOC"
  - No S3 upload
  - No database record
- **Evidence**:
  - POST /mocs/:id/files/instruction returns 403
  - Authorization check logged
  - No file created

### Test 10: MOC not found (404)
- **Setup**:
  - User authenticated
  - Invalid MOC ID `non-existent-moc`
- **Action**:
  1. POST file to /mocs/non-existent-moc/files/instruction
- **Expected Outcome**:
  - Backend returns 404 Not Found
  - Error message: "MOC not found"
- **Evidence**:
  - POST returns 404
  - Response body: `{ error: 'NOT_FOUND' }`

### Test 11: S3 upload failure
- **Setup**:
  - MOC exists
  - Valid PDF file
  - S3 service unavailable or bucket permissions invalid
- **Action**:
  1. Attempt to upload file
- **Expected Outcome**:
  - Backend catches S3 error
  - Returns 500 Internal Server Error
  - Error message: "Upload failed. Please try again."
  - No database record created (transaction rollback)
- **Evidence**:
  - POST returns 500
  - Response body: `{ error: 'UPLOAD_FAILED' }`
  - Error logged to CloudWatch
  - Database transaction rolled back
  - No orphaned moc_files record

---

## Edge Cases

### Test 12: Upload file with special characters in filename
- **Setup**:
  - Valid PDF: "My Instructions (v2.1) [FINAL]!.pdf"
- **Action**:
  1. Upload file
- **Expected Outcome**:
  - Filename sanitized for S3 key
  - UUID prefix prevents collisions
  - Original filename preserved in database `name` field
- **Evidence**:
  - S3 key uses sanitized filename: `{uuid}-My_Instructions_v2_1_FINAL.pdf`
  - Database `name` field: "My Instructions (v2.1) [FINAL]!.pdf"
  - File downloads with original name

### Test 13: Upload file with duplicate filename
- **Setup**:
  - MOC already has instruction file "instructions.pdf"
  - User uploads another "instructions.pdf"
- **Action**:
  1. Upload second "instructions.pdf"
- **Expected Outcome**:
  - Both files stored (no replacement, append to list)
  - S3 keys differ due to UUID prefix
  - Both files appear in instructions list
- **Evidence**:
  - 2 S3 objects with different UUIDs
  - 2 database records with same `name` but different IDs
  - Both files listed in UI

### Test 14: Concurrent uploads (double-submit prevention)
- **Setup**:
  - Valid PDF file
  - User clicks "Upload" button twice rapidly
- **Action**:
  1. Double-click upload button
- **Expected Outcome**:
  - Upload button disabled after first click
  - Only one upload request sent
  - OR: Two requests sent, both succeed (no conflict)
- **Evidence**:
  - Upload button shows loading state
  - Single POST request logged
  - OR: Two POST requests, two separate files created (acceptable)

### Test 15: Zero-byte PDF file
- **Setup**:
  - PDF file with 0 bytes
- **Action**:
  1. Attempt to upload
- **Expected Outcome**:
  - Server-side validation rejects: "File cannot be empty (0 bytes)"
  - Returns 400 with error code `INVALID_FILE`
- **Evidence**:
  - File size validation fails
  - No S3 upload
  - No database record

### Test 16: Upload after MOC deletion (race condition)
- **Setup**:
  - MOC exists
  - User starts upload
  - MOC deleted before upload completes
- **Action**:
  1. Initiate upload
  2. Delete MOC mid-upload
- **Expected Outcome**:
  - Upload fails with 404 Not Found
  - S3 object may be orphaned (cleanup job handles this)
  - No database record created
- **Evidence**:
  - POST returns 404
  - Orphaned S3 object cleaned up by INST-1204

### Test 17: Large number of files for single MOC
- **Setup**:
  - MOC with 10 existing instruction files
  - User uploads 5 more
- **Action**:
  1. Upload 5 additional PDFs
- **Expected Outcome**:
  - All files uploaded successfully
  - No limit enforced (within storage quota)
  - All 15 files display in list
- **Evidence**:
  - 15 moc_files records for single MOC
  - All files retrievable via GET /mocs/:id
  - UI handles long file list (scrollable)

### Test 18: Upload with network interruption
- **Setup**:
  - Valid PDF file
  - Simulated network failure mid-upload
- **Action**:
  1. Start upload
  2. Disconnect network
- **Expected Outcome**:
  - Upload fails
  - Error toast: "Upload failed. Please try again."
  - No partial file in S3
  - No database record
- **Evidence**:
  - POST request times out or fails
  - Frontend shows error state
  - Retry button available (INST-1201)

---

## Required Tooling Evidence

### Backend Testing

**REST Client (.http file)**
```http
### Upload instruction file (happy path)
POST {{baseUrl}}/mocs/{{testMocId}}/files/instruction
Authorization: Bearer {{authToken}}
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="instructions.pdf"
Content-Type: application/pdf

< ./test-data/sample-instructions.pdf
------WebKitFormBoundary7MA4YWxkTrZu0gW--

### Expected Response (201 Created)
{
  "id": "file-uuid",
  "mocId": "test-moc-456",
  "type": "instruction",
  "name": "instructions.pdf",
  "size": 5242880,
  "url": "https://cdn.example.com/mocs/.../instructions.pdf",
  "uploadedAt": "2026-02-06T..."
}

### Upload non-PDF file (error case)
POST {{baseUrl}}/mocs/{{testMocId}}/files/instruction
Authorization: Bearer {{authToken}}
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="image.jpg"
Content-Type: image/jpeg

< ./test-data/test-image.jpg
------WebKitFormBoundary7MA4YWxkTrZu0gW--

### Expected Response (400 Bad Request)
{
  "error": "INVALID_FILE"
}
```

**Assertions**:
- Status code: 201 for valid, 400 for invalid, 403 for unauthorized, 404 for not found
- Response body matches MocFile schema
- S3 object exists at returned URL
- Database record created with correct `type='instruction'`
- Security log event for rejected uploads

### Frontend Testing (Playwright)

**Test File**: `apps/web/playwright/features/instructions/inst-1104-upload-direct.feature`

```gherkin
Feature: Upload Instructions (Direct ≤10MB)

  Scenario: Upload small PDF instruction file
    Given user is authenticated
    And MOC "Test MOC" exists
    When user navigates to MOC detail page
    And user clicks "Add Instructions" button
    And user selects PDF file "sample-5mb.pdf"
    And user clicks "Upload" button
    Then file uploads successfully
    And success toast "Instructions uploaded!" appears
    And instructions list shows "sample-5mb.pdf"
    And file shows correct size "5 MB"

  Scenario: Upload multiple PDF files
    Given user is on MOC detail page
    When user clicks "Add Instructions"
    And user selects 3 PDF files
    And user clicks "Upload"
    Then all 3 files upload sequentially
    And instructions list shows all 3 files
    And each file has download button

  Scenario: Reject non-PDF file
    Given user is on MOC detail page
    When user attempts to select JPEG file
    Then error message "Only PDF files allowed" appears
    And upload button is disabled

  Scenario: Reject oversized file for direct upload
    Given user is on MOC detail page
    When user selects 15MB PDF file
    Then error message "File too large. Max 10MB per file" appears
    And hint "Use presigned upload for larger files" may appear
```

**Required Assertions**:
- File picker accepts `.pdf` only
- Selected files display with name and size
- Upload button state (enabled/disabled/loading)
- Toast notifications appear
- Instructions list updates without page reload
- Download buttons functional

**Artifacts**:
- Screenshot: File picker with selected PDFs
- Screenshot: Upload success state
- Screenshot: Error state for invalid file
- Video: Full upload flow
- Trace: Network requests (POST /files/instruction)

---

## Risks to Call Out

### Risk 1: PDF MIME type validation inconsistency
- **Description**: Current validation utils (`file-validation.ts`) only support image MIME types. PDF validation needs to be added.
- **Mitigation**: Create `validatePdfMimeType()` function with whitelist `['application/pdf']`
- **Fragility**: If not implemented, PDFs will be rejected as `INVALID_MIME_TYPE`

### Risk 2: Multiple file upload UX complexity
- **Description**: Sequential uploads mean longer wait times for users uploading multiple files
- **Mitigation**: Show progress for each file individually, allow cancellation
- **Future**: Parallel uploads (INST-2036) or batch upload endpoint

### Risk 3: S3 transaction safety
- **Description**: If S3 upload succeeds but database insert fails, orphaned S3 objects created
- **Mitigation**: Wrap in database transaction, rollback on S3 failure. Background cleanup job (INST-1204) handles orphans.
- **Evidence**: Test S3 failure scenario (Test 11) to verify rollback

### Risk 4: Presigned URL upgrade path ambiguity
- **Description**: Index mentions "presigned URL flow triggered (INST-1105)" for >10MB files, but implementation details unclear
- **Mitigation**: For INST-1104, show error message with upgrade hint. INST-1105 handles presigned flow.
- **Blocking**: NOT blocking for INST-1104 - simply reject >10MB files for now

### Risk 5: E2E test dependency on INST-1102
- **Description**: E2E tests require MOC creation flow from INST-1102
- **Status**: INST-1102 currently in QA, POST /mocs endpoint functional
- **Mitigation**: Use existing MOC creation API in E2E setup. No blocker.

---

## Test Data Requirements

### Valid Test Files
- `sample-2mb.pdf` - Small PDF (2MB)
- `sample-5mb.pdf` - Medium PDF (5MB)
- `sample-10mb.pdf` - Max size PDF (10MB)
- `part1.pdf`, `part2.pdf`, `part3.pdf` - Multiple PDFs for batch testing

### Invalid Test Files
- `oversized-15mb.pdf` - Exceeds 10MB limit
- `image.jpg` - JPEG image (wrong MIME type)
- `document.txt` - Text file (wrong MIME type)
- `zero-byte.pdf` - Empty file (0 bytes)
- `spoofed.pdf` - File with `.pdf` extension but JPEG content

### Test MOCs
- MOC with no instruction files (empty state)
- MOC with 1 instruction file
- MOC with 10 instruction files (large list)
- MOC owned by different user (authorization test)

---

## Coverage Targets

- **Frontend Component**: 80% line coverage
  - File selection logic
  - Client-side validation (type, size)
  - Upload trigger
  - Error handling
  - File list display

- **Backend Route**: 90% line coverage
  - Multipart parsing
  - MIME type validation
  - File size validation
  - S3 upload
  - Database insert
  - Error handling (404, 403, 400, 500)

- **E2E Coverage**: 1 happy path (required by ADR-006), 3+ error cases
  - Upload single PDF
  - Upload multiple PDFs
  - Reject invalid file
  - Reject oversized file
