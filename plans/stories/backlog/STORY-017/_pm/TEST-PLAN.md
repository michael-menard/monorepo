# TEST-PLAN: STORY-017 - Multipart Upload Sessions (Vercel Migration)

## Overview

This test plan covers the migration of 5 AWS Lambda multipart upload session endpoints to Vercel serverless functions. The endpoints implement a chunked file upload workflow for MOC instruction files.

### Endpoints Under Test

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/api/mocs/uploads/sessions` | Create upload session |
| 2 | POST | `/api/mocs/uploads/sessions/:sessionId/files` | Register file within session |
| 3 | PUT | `/api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber` | Upload single part |
| 4 | POST | `/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete` | Complete file upload |
| 5 | POST | `/api/mocs/uploads/sessions/finalize` | Finalize session, create MOC |

### Database Tables

- `upload_sessions` - Session state, status, TTL, finalization state
- `upload_session_files` - Files with S3 keys and multipart upload IDs
- `upload_session_parts` - Part ETags for multipart completion
- `moc_instructions` - Created MOC record (on finalize)
- `moc_files` - File records for completed MOC

---

## 1. Create Session Endpoint

**Route:** `POST /api/mocs/uploads/sessions`

### 1.1 Happy Path Tests

| Test ID | Description | Expected Status | Response Shape |
|---------|-------------|-----------------|----------------|
| CS-HP-001 | Create session with single instruction file | 201 | `{ sessionId, partSizeBytes, expiresAt }` |
| CS-HP-002 | Create session with instruction + parts-list | 201 | Session created |
| CS-HP-003 | Create session with instruction + multiple images | 201 | Session created |
| CS-HP-004 | Create session with all file types (instruction, parts-list, images, thumbnail) | 201 | Session created |
| CS-HP-005 | Verify `partSizeBytes` is 5MB (5242880) | 201 | `partSizeBytes: 5242880` |
| CS-HP-006 | Verify `expiresAt` is ~15 minutes in future | 201 | ISO 8601 timestamp |

### 1.2 Authentication Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| CS-AUTH-001 | Missing Authorization header | 401 | `UNAUTHORIZED` |
| CS-AUTH-002 | Invalid/expired JWT token | 401 | `UNAUTHORIZED` |
| CS-AUTH-003 | Malformed JWT token | 401 | `UNAUTHORIZED` |

### 1.3 Validation Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| CS-VAL-001 | Missing request body | 400 | `BAD_REQUEST` |
| CS-VAL-002 | Invalid JSON body | 400 | `BAD_REQUEST` |
| CS-VAL-003 | Empty files array | 422 | `VALIDATION_ERROR` |
| CS-VAL-004 | No instruction file in files array | 400 | `BAD_REQUEST` |
| CS-VAL-005 | File missing `category` field | 422 | `VALIDATION_ERROR` |
| CS-VAL-006 | File missing `name` field | 422 | `VALIDATION_ERROR` |
| CS-VAL-007 | File missing `size` field | 422 | `VALIDATION_ERROR` |
| CS-VAL-008 | File missing `type` (MIME) field | 422 | `VALIDATION_ERROR` |
| CS-VAL-009 | File missing `ext` field | 422 | `VALIDATION_ERROR` |
| CS-VAL-010 | Invalid file category (not instruction/parts-list/image/thumbnail) | 422 | `VALIDATION_ERROR` |
| CS-VAL-011 | File name too long (>255 chars) | 422 | `VALIDATION_ERROR` |
| CS-VAL-012 | File extension too long (>10 chars) | 422 | `VALIDATION_ERROR` |
| CS-VAL-013 | Negative file size | 422 | `VALIDATION_ERROR` |
| CS-VAL-014 | Zero file size | 422 | `VALIDATION_ERROR` |

### 1.4 File Limit Errors

| Test ID | Description | Expected Status | Error Code | Notes |
|---------|-------------|-----------------|------------|-------|
| CS-LIM-001 | Instruction file exceeds 50MB limit | 413 | `BAD_REQUEST` | Size validation |
| CS-LIM-002 | Image file exceeds 10MB limit | 413 | `BAD_REQUEST` | Size validation |
| CS-LIM-003 | Parts-list file exceeds 5MB limit | 413 | `BAD_REQUEST` | Size validation |
| CS-LIM-004 | Too many parts-list files (>5) | 400 | `BAD_REQUEST` | Count validation |
| CS-LIM-005 | Too many image files (>20) | 400 | `BAD_REQUEST` | Count validation |
| CS-LIM-006 | Invalid MIME type for instruction (not PDF) | 415 | `BAD_REQUEST` | MIME validation |
| CS-LIM-007 | Invalid MIME type for image | 415 | `BAD_REQUEST` | MIME validation |
| CS-LIM-008 | Invalid MIME type for parts-list | 415 | `BAD_REQUEST` | MIME validation |

### 1.5 Rate Limiting

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| CS-RL-001 | Exceed daily rate limit | 429 | `TOO_MANY_REQUESTS` |
| CS-RL-002 | Rate limit response includes `nextAllowedAt` | 429 | Verify field present |
| CS-RL-003 | Rate limit response includes `retryAfterSeconds` | 429 | Verify field present |

---

## 2. Register File Endpoint

**Route:** `POST /api/mocs/uploads/sessions/:sessionId/files`

### 2.1 Happy Path Tests

| Test ID | Description | Expected Status | Response Shape |
|---------|-------------|-----------------|----------------|
| RF-HP-001 | Register instruction PDF file | 201 | `{ fileId, uploadId }` |
| RF-HP-002 | Register parts-list CSV file | 201 | `{ fileId, uploadId }` |
| RF-HP-003 | Register image file (JPEG) | 201 | `{ fileId, uploadId }` |
| RF-HP-004 | Register thumbnail file | 201 | `{ fileId, uploadId }` |
| RF-HP-005 | Verify `fileId` is valid UUID | 201 | UUID format |
| RF-HP-006 | Verify `uploadId` is non-empty string | 201 | S3 multipart upload ID |

### 2.2 Authentication Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| RF-AUTH-001 | Missing Authorization header | 401 | `UNAUTHORIZED` |
| RF-AUTH-002 | Session belongs to different user | 404 | `NOT_FOUND` |

### 2.3 Path Parameter Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| RF-PATH-001 | Missing sessionId in path | 400 | `BAD_REQUEST` |
| RF-PATH-002 | Invalid sessionId format (not UUID) | 404 | `NOT_FOUND` |
| RF-PATH-003 | Non-existent sessionId | 404 | `NOT_FOUND` |

### 2.4 Session State Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| RF-STATE-001 | Session status is not 'active' (completed) | 400 | `BAD_REQUEST` |
| RF-STATE-002 | Session status is 'expired' | 400 | `BAD_REQUEST` |
| RF-STATE-003 | Session status is 'cancelled' | 400 | `BAD_REQUEST` |
| RF-STATE-004 | Session has expired (past expiresAt) | 400 | `BAD_REQUEST` |

### 2.5 Validation Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| RF-VAL-001 | Missing request body | 400 | `BAD_REQUEST` |
| RF-VAL-002 | Invalid JSON body | 400 | `BAD_REQUEST` |
| RF-VAL-003 | Missing `category` field | 422 | `VALIDATION_ERROR` |
| RF-VAL-004 | Missing `name` field | 422 | `VALIDATION_ERROR` |
| RF-VAL-005 | Missing `size` field | 422 | `VALIDATION_ERROR` |
| RF-VAL-006 | Missing `type` field | 422 | `VALIDATION_ERROR` |
| RF-VAL-007 | Missing `ext` field | 422 | `VALIDATION_ERROR` |
| RF-VAL-008 | File size exceeds limit for category | 413 | `BAD_REQUEST` |
| RF-VAL-009 | Invalid MIME type for category | 415 | `BAD_REQUEST` |

---

## 3. Upload Part Endpoint

**Route:** `PUT /api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber`

### 3.1 Happy Path Tests

| Test ID | Description | Expected Status | Response Shape |
|---------|-------------|-----------------|----------------|
| UP-HP-001 | Upload first part (partNumber=1) | 200 | `{ partNumber, etag }` |
| UP-HP-002 | Upload subsequent parts (partNumber=2,3,...) | 200 | `{ partNumber, etag }` |
| UP-HP-003 | Upload minimum part size (1 byte) | 200 | Part accepted |
| UP-HP-004 | Upload 5MB part (max recommended) | 200 | Part accepted |
| UP-HP-005 | Verify ETag is returned from S3 | 200 | Non-empty etag |
| UP-HP-006 | Re-upload same part number (idempotent upsert) | 200 | Updated ETag |

### 3.2 Authentication Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| UP-AUTH-001 | Missing Authorization header | 401 | `UNAUTHORIZED` |
| UP-AUTH-002 | Session belongs to different user | 404 | `NOT_FOUND` |

### 3.3 Path Parameter Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| UP-PATH-001 | Missing sessionId in path | 400 | `BAD_REQUEST` |
| UP-PATH-002 | Missing fileId in path | 400 | `BAD_REQUEST` |
| UP-PATH-003 | Missing partNumber in path | 400 | `BAD_REQUEST` |
| UP-PATH-004 | Invalid sessionId format | 404 | `NOT_FOUND` |
| UP-PATH-005 | Invalid fileId format | 404 | `NOT_FOUND` |
| UP-PATH-006 | Non-numeric partNumber | 400 | `BAD_REQUEST` |
| UP-PATH-007 | Zero partNumber | 400 | `BAD_REQUEST` |
| UP-PATH-008 | Negative partNumber | 400 | `BAD_REQUEST` |
| UP-PATH-009 | Non-existent sessionId | 404 | `NOT_FOUND` |
| UP-PATH-010 | Non-existent fileId | 404 | `NOT_FOUND` |
| UP-PATH-011 | FileId exists but belongs to different session | 404 | `NOT_FOUND` |

### 3.4 Session/File State Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| UP-STATE-001 | Session not active | 400 | `BAD_REQUEST` |
| UP-STATE-002 | Session expired | 400 | `BAD_REQUEST` |
| UP-STATE-003 | File has no uploadId (not initialized) | 400 | `BAD_REQUEST` |

### 3.5 Body Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| UP-BODY-001 | Missing request body | 400 | `BAD_REQUEST` |
| UP-BODY-002 | Empty body (zero bytes) | 400 | `BAD_REQUEST` |

### 3.6 Vercel-Specific Considerations

| Test ID | Description | Expected Status | Notes |
|---------|-------------|-----------------|-------|
| UP-VERCEL-001 | Binary body via base64 encoding | 200 | Verify isBase64Encoded handling |
| UP-VERCEL-002 | Large part near Vercel body limit (4.5MB) | 200 | Vercel has 4.5MB body limit |
| UP-VERCEL-003 | Part exceeding Vercel body limit | 413 | May need chunking strategy |

---

## 4. Complete File Endpoint

**Route:** `POST /api/mocs/uploads/sessions/:sessionId/files/:fileId/complete`

### 4.1 Happy Path Tests

| Test ID | Description | Expected Status | Response Shape |
|---------|-------------|-----------------|----------------|
| CF-HP-001 | Complete single-part upload | 200 | `{ fileId, fileUrl }` |
| CF-HP-002 | Complete multi-part upload (3 parts) | 200 | `{ fileId, fileUrl }` |
| CF-HP-003 | Verify fileUrl points to S3 | 200 | Valid S3 URL format |
| CF-HP-004 | Verify file status updated to 'completed' | 200 | DB check |

### 4.2 Authentication Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| CF-AUTH-001 | Missing Authorization header | 401 | `UNAUTHORIZED` |
| CF-AUTH-002 | Session belongs to different user | 404 | `NOT_FOUND` |

### 4.3 Path Parameter Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| CF-PATH-001 | Missing sessionId in path | 400 | `BAD_REQUEST` |
| CF-PATH-002 | Missing fileId in path | 400 | `BAD_REQUEST` |
| CF-PATH-003 | Invalid sessionId format | 404 | `NOT_FOUND` |
| CF-PATH-004 | Invalid fileId format | 404 | `NOT_FOUND` |
| CF-PATH-005 | Non-existent sessionId | 404 | `NOT_FOUND` |
| CF-PATH-006 | Non-existent fileId | 404 | `NOT_FOUND` |
| CF-PATH-007 | FileId belongs to different session | 404 | `NOT_FOUND` |

### 4.4 Session/File State Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| CF-STATE-001 | Session not active | 400 | `BAD_REQUEST` |
| CF-STATE-002 | Session expired | 400 | `BAD_REQUEST` |
| CF-STATE-003 | File has no uploadId | 400 | `BAD_REQUEST` |
| CF-STATE-004 | File already completed | 400 | `BAD_REQUEST` |

### 4.5 Validation Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| CF-VAL-001 | Missing request body | 400 | `BAD_REQUEST` |
| CF-VAL-002 | Invalid JSON body | 400 | `BAD_REQUEST` |
| CF-VAL-003 | Missing `parts` array | 422 | `VALIDATION_ERROR` |
| CF-VAL-004 | Empty `parts` array | 422 | `VALIDATION_ERROR` |
| CF-VAL-005 | Part missing `partNumber` | 422 | `VALIDATION_ERROR` |
| CF-VAL-006 | Part missing `etag` | 422 | `VALIDATION_ERROR` |
| CF-VAL-007 | Part count mismatch (fewer parts than uploaded) | 400 | `BAD_REQUEST` |
| CF-VAL-008 | Part count mismatch (more parts than uploaded) | 400 | `BAD_REQUEST` |
| CF-VAL-009 | Incorrect ETag for part | S3 Error | S3 will reject |

---

## 5. Finalize Session Endpoint

**Route:** `POST /api/mocs/uploads/sessions/finalize`

### 5.1 Happy Path Tests

| Test ID | Description | Expected Status | Response Shape |
|---------|-------------|-----------------|----------------|
| FS-HP-001 | Finalize session with single instruction | 201 | `{ id, title, slug, pdfKey, ... }` |
| FS-HP-002 | Finalize session with all file types | 201 | Full response with imageKeys, partsKeys |
| FS-HP-003 | Finalize with title, description, tags, theme | 201 | All metadata in response |
| FS-HP-004 | Verify MOC record created in DB | 201 | Query moc_instructions |
| FS-HP-005 | Verify moc_files records created | 201 | Query moc_files |
| FS-HP-006 | Verify session status set to 'completed' | 201 | Query upload_sessions |
| FS-HP-007 | Verify session.finalizedAt set | 201 | Non-null timestamp |
| FS-HP-008 | Verify session.mocInstructionId set | 201 | MOC ID reference |
| FS-HP-009 | Idempotent retry returns same MOC | 200 | `idempotent: true` |
| FS-HP-010 | Slug generated from title | 201 | Verify slug format |
| FS-HP-011 | Duplicate slug gets suffix | 201 | e.g., `my-moc-1` |

### 5.2 Authentication Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| FS-AUTH-001 | Missing Authorization header | 401 | `UNAUTHORIZED` |
| FS-AUTH-002 | Session belongs to different user | 404 | `NOT_FOUND` |

### 5.3 Validation Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| FS-VAL-001 | Missing request body | 400 | `BAD_REQUEST` |
| FS-VAL-002 | Invalid JSON body | 400 | `BAD_REQUEST` |
| FS-VAL-003 | Missing `uploadSessionId` | 422 | `VALIDATION_ERROR` |
| FS-VAL-004 | Invalid `uploadSessionId` format (not UUID) | 422 | `VALIDATION_ERROR` |
| FS-VAL-005 | Missing `title` | 422 | `VALIDATION_ERROR` |
| FS-VAL-006 | Empty `title` | 422 | `VALIDATION_ERROR` |
| FS-VAL-007 | Title too long (>200 chars) | 422 | `VALIDATION_ERROR` |
| FS-VAL-008 | Description too long (>5000 chars) | 422 | `VALIDATION_ERROR` |
| FS-VAL-009 | Too many tags (>20) | 422 | `VALIDATION_ERROR` |
| FS-VAL-010 | Tag too long (>50 chars) | 422 | `VALIDATION_ERROR` |
| FS-VAL-011 | Theme too long (>100 chars) | 422 | `VALIDATION_ERROR` |

### 5.4 Session State Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| FS-STATE-001 | Non-existent uploadSessionId | 404 | `NOT_FOUND` |
| FS-STATE-002 | Session expired (past expiresAt) | 400 | `BAD_REQUEST` |
| FS-STATE-003 | No completed instruction files | 400 | `BAD_REQUEST` |
| FS-STATE-004 | Concurrent finalize (lock held) | 200 | `status: 'finalizing'` |

### 5.5 File Verification Errors

| Test ID | Description | Expected Status | Error Code | Notes |
|---------|-------------|-----------------|------------|-------|
| FS-VERIFY-001 | File not found in S3 (HeadObject fails) | 400 | `BAD_REQUEST` | Verification failure |
| FS-VERIFY-002 | File size mismatch (>1KB difference) | 400 | `BAD_REQUEST` | Size verification |
| FS-VERIFY-003 | Magic bytes validation fails (instruction) | 400 | `BAD_REQUEST` | Not a valid PDF |
| FS-VERIFY-004 | Magic bytes validation fails (image) | 400 | `BAD_REQUEST` | Not a valid image |

### 5.6 Conflict Errors

| Test ID | Description | Expected Status | Error Code |
|---------|-------------|-----------------|------------|
| FS-CONFLICT-001 | Duplicate title for same user | 409 | `CONFLICT` |
| FS-CONFLICT-002 | Conflict response includes suggestedSlug | 409 | Verify field present |

### 5.7 Concurrency Tests

| Test ID | Description | Expected Status | Notes |
|---------|-------------|-----------------|-------|
| FS-CONC-001 | Parallel finalize requests | 1x201, Nx200 | Only first creates MOC |
| FS-CONC-002 | Stale lock recovery (>5 min old) | 201 | New finalize succeeds |

---

## 6. End-to-End Workflow Tests

### 6.1 Complete Upload Workflow

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| E2E-001 | Single file upload | Create -> Register -> Upload part -> Complete -> Finalize | MOC created |
| E2E-002 | Multi-file upload | Create -> Register x3 -> Upload parts -> Complete x3 -> Finalize | MOC with 3 files |
| E2E-003 | Large file upload | Create -> Register -> Upload 10 parts -> Complete -> Finalize | MOC with large PDF |
| E2E-004 | Abort mid-upload | Create -> Register -> Upload 2/5 parts -> Let session expire | Session cleaned up |

---

## 7. HTTP Test File Cases

### File: `__http__/story-017-multipart-sessions.http`

```http
### STORY-017: Multipart Upload Sessions
### Vercel local dev: http://localhost:3001
### Requires AUTH_BYPASS=true in .env.local

@baseUrl = http://localhost:3001
@devUserId = dev-user-00000000-0000-0000-0000-000000000001

# ==============================================================================
# 1. CREATE SESSION
# ==============================================================================

### CS-HP-001: Create session with single instruction file - expect 201
# @name createSessionSingleFile
POST {{baseUrl}}/api/mocs/uploads/sessions
Content-Type: application/json

{
  "files": [
    {
      "category": "instruction",
      "name": "instructions.pdf",
      "size": 5242880,
      "type": "application/pdf",
      "ext": "pdf"
    }
  ]
}

### CS-HP-004: Create session with all file types - expect 201
# @name createSessionAllTypes
POST {{baseUrl}}/api/mocs/uploads/sessions
Content-Type: application/json

{
  "files": [
    { "category": "instruction", "name": "instructions.pdf", "size": 5242880, "type": "application/pdf", "ext": "pdf" },
    { "category": "parts-list", "name": "parts.csv", "size": 102400, "type": "text/csv", "ext": "csv" },
    { "category": "image", "name": "photo1.jpg", "size": 512000, "type": "image/jpeg", "ext": "jpg" },
    { "category": "thumbnail", "name": "thumb.jpg", "size": 51200, "type": "image/jpeg", "ext": "jpg" }
  ]
}

### CS-VAL-003: Empty files array - expect 422
POST {{baseUrl}}/api/mocs/uploads/sessions
Content-Type: application/json

{
  "files": []
}

### CS-VAL-004: No instruction file - expect 400
POST {{baseUrl}}/api/mocs/uploads/sessions
Content-Type: application/json

{
  "files": [
    { "category": "image", "name": "photo.jpg", "size": 512000, "type": "image/jpeg", "ext": "jpg" }
  ]
}

### CS-LIM-001: Instruction file too large (>50MB) - expect 413
POST {{baseUrl}}/api/mocs/uploads/sessions
Content-Type: application/json

{
  "files": [
    { "category": "instruction", "name": "huge.pdf", "size": 100000000, "type": "application/pdf", "ext": "pdf" }
  ]
}

### CS-LIM-006: Invalid MIME type for instruction - expect 415
POST {{baseUrl}}/api/mocs/uploads/sessions
Content-Type: application/json

{
  "files": [
    { "category": "instruction", "name": "instructions.exe", "size": 1024, "type": "application/x-executable", "ext": "exe" }
  ]
}

# ==============================================================================
# 2. REGISTER FILE (requires sessionId from step 1)
# ==============================================================================

@sessionId = {{createSessionSingleFile.response.body.$.data.data.sessionId}}

### RF-HP-001: Register instruction PDF file - expect 201
# @name registerFile
POST {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files
Content-Type: application/json

{
  "category": "instruction",
  "name": "instructions.pdf",
  "size": 5242880,
  "type": "application/pdf",
  "ext": "pdf"
}

### RF-PATH-003: Non-existent session - expect 404
POST {{baseUrl}}/api/mocs/uploads/sessions/00000000-0000-0000-0000-000000000000/files
Content-Type: application/json

{
  "category": "instruction",
  "name": "instructions.pdf",
  "size": 1024,
  "type": "application/pdf",
  "ext": "pdf"
}

### RF-VAL-008: File too large - expect 413
POST {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files
Content-Type: application/json

{
  "category": "instruction",
  "name": "huge.pdf",
  "size": 100000000,
  "type": "application/pdf",
  "ext": "pdf"
}

# ==============================================================================
# 3. UPLOAD PART (requires sessionId and fileId from steps 1-2)
# ==============================================================================

@fileId = {{registerFile.response.body.$.data.data.fileId}}

### UP-HP-001: Upload first part - expect 200
# NOTE: This requires binary body. Use curl or programmatic test.
# @name uploadPart
PUT {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files/{{fileId}}/parts/1
Content-Type: application/octet-stream

< ./test-data/part1.bin

### UP-PATH-007: Zero part number - expect 400
PUT {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files/{{fileId}}/parts/0
Content-Type: application/octet-stream

test data

### UP-PATH-008: Negative part number - expect 400
PUT {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files/{{fileId}}/parts/-1
Content-Type: application/octet-stream

test data

### UP-BODY-002: Empty body - expect 400
PUT {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files/{{fileId}}/parts/1
Content-Type: application/octet-stream


# ==============================================================================
# 4. COMPLETE FILE (requires sessionId and fileId)
# ==============================================================================

### CF-HP-001: Complete single-part upload - expect 200
# @name completeFile
POST {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files/{{fileId}}/complete
Content-Type: application/json

{
  "parts": [
    { "partNumber": 1, "etag": "{{uploadPart.response.body.$.data.data.etag}}" }
  ]
}

### CF-VAL-007: Part count mismatch - expect 400
POST {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files/{{fileId}}/complete
Content-Type: application/json

{
  "parts": [
    { "partNumber": 1, "etag": "abc123" },
    { "partNumber": 2, "etag": "def456" }
  ]
}

### CF-STATE-004: File already completed - expect 400
POST {{baseUrl}}/api/mocs/uploads/sessions/{{sessionId}}/files/{{fileId}}/complete
Content-Type: application/json

{
  "parts": [
    { "partNumber": 1, "etag": "abc123" }
  ]
}

# ==============================================================================
# 5. FINALIZE SESSION
# ==============================================================================

### FS-HP-001: Finalize session with minimal fields - expect 201
# @name finalizeSession
POST {{baseUrl}}/api/mocs/uploads/sessions/finalize
Content-Type: application/json

{
  "uploadSessionId": "{{sessionId}}",
  "title": "My Test MOC"
}

### FS-HP-003: Finalize with all metadata - expect 201
POST {{baseUrl}}/api/mocs/uploads/sessions/finalize
Content-Type: application/json

{
  "uploadSessionId": "{{sessionId}}",
  "title": "Castle with Full Metadata",
  "description": "A detailed medieval castle MOC",
  "tags": ["castle", "medieval", "modular"],
  "theme": "Castle"
}

### FS-HP-009: Idempotent retry - expect 200 with idempotent: true
POST {{baseUrl}}/api/mocs/uploads/sessions/finalize
Content-Type: application/json

{
  "uploadSessionId": "{{sessionId}}",
  "title": "My Test MOC"
}

### FS-VAL-003: Missing uploadSessionId - expect 422
POST {{baseUrl}}/api/mocs/uploads/sessions/finalize
Content-Type: application/json

{
  "title": "My Test MOC"
}

### FS-VAL-004: Invalid uploadSessionId format - expect 422
POST {{baseUrl}}/api/mocs/uploads/sessions/finalize
Content-Type: application/json

{
  "uploadSessionId": "not-a-uuid",
  "title": "My Test MOC"
}

### FS-VAL-005: Missing title - expect 422
POST {{baseUrl}}/api/mocs/uploads/sessions/finalize
Content-Type: application/json

{
  "uploadSessionId": "00000000-0000-0000-0000-000000000001"
}

### FS-STATE-001: Non-existent session - expect 404
POST {{baseUrl}}/api/mocs/uploads/sessions/finalize
Content-Type: application/json

{
  "uploadSessionId": "99999999-9999-9999-9999-999999999999",
  "title": "Test MOC"
}
```

---

## 8. Evidence Requirements

### 8.1 Per-Endpoint Evidence

For each endpoint, capture:

1. **Happy path screenshot** - Successful request/response in REST client
2. **Error case screenshots** - At least 3 error scenarios per endpoint
3. **Database state** - Query results showing records created/updated
4. **S3 verification** - For upload-part and complete-file, verify S3 objects

### 8.2 End-to-End Evidence

1. **Full workflow screenshot** - All 5 steps completing successfully
2. **MOC detail page** - Showing created MOC with uploaded files
3. **S3 bucket listing** - Showing files in correct path structure
4. **Database queries** - All 5 tables showing related records

### 8.3 Proof Document Checklist

```markdown
## PROOF-STORY-017 Evidence Checklist

### Create Session
- [ ] 201 response with sessionId, partSizeBytes, expiresAt
- [ ] 401 unauthenticated error
- [ ] 422 validation error (empty files)
- [ ] 400 no instruction file error
- [ ] 413 file too large error
- [ ] 415 invalid MIME type error
- [ ] 429 rate limit error

### Register File
- [ ] 201 response with fileId, uploadId
- [ ] 404 session not found
- [ ] 400 session not active
- [ ] 400 session expired

### Upload Part
- [ ] 200 response with partNumber, etag
- [ ] 400 invalid part number
- [ ] 400 empty body
- [ ] 404 file not found

### Complete File
- [ ] 200 response with fileId, fileUrl
- [ ] 400 part count mismatch
- [ ] 400 file already completed

### Finalize Session
- [ ] 201 response with MOC data
- [ ] 200 idempotent retry
- [ ] 404 session not found
- [ ] 400 no instruction files
- [ ] 409 title conflict

### End-to-End
- [ ] Complete workflow (5 endpoints in sequence)
- [ ] Multi-file upload (3+ files)
- [ ] Database verification (all 5 tables)
- [ ] S3 verification (files exist at correct paths)
```

---

## 9. Vercel-Specific Considerations

### 9.1 Body Size Limits

| Platform | Limit | Impact |
|----------|-------|--------|
| Vercel Serverless | 4.5 MB | Part upload must be <= 4.5 MB |
| AWS Lambda | 6 MB | AWS allows larger parts |

**Mitigation:** Set `partSizeBytes` to 4 MB (4194304) instead of 5 MB for Vercel.

### 9.2 Timeout Considerations

| Platform | Default Timeout | Max Timeout |
|----------|-----------------|-------------|
| Vercel Hobby | 10 seconds | 10 seconds |
| Vercel Pro | 15 seconds | 300 seconds |
| AWS Lambda | 30 seconds (configurable) | 900 seconds |

**At-Risk Operations:**
- Finalize endpoint (S3 verification + DB writes)
- Large part uploads

### 9.3 Cold Start Impact

| Test ID | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| VERCEL-COLD-001 | Cold start on create session | < 3 seconds |
| VERCEL-COLD-002 | Cold start on upload part | < 3 seconds |
| VERCEL-COLD-003 | Cold start on finalize | < 5 seconds |

### 9.4 Streaming vs Buffering

The upload-part endpoint receives binary data. Vercel serverless functions buffer the entire request body before handler execution. For parts near the size limit, monitor memory usage.

---

## 10. Test Data Requirements

### 10.1 Seed Data

```sql
-- Test user (matches AUTH_BYPASS user)
-- No user table needed; userId is Cognito reference

-- Existing MOC for conflict testing (FS-CONFLICT-001)
INSERT INTO moc_instructions (id, user_id, title, slug, type, status, created_at, updated_at)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'dev-user-00000000-0000-0000-0000-000000000001',
  'Existing MOC Title',
  'existing-moc-title',
  'moc',
  'published',
  NOW(),
  NOW()
);

-- Expired session for testing (RF-STATE-004)
INSERT INTO upload_sessions (id, user_id, status, part_size_bytes, expires_at, created_at, updated_at)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'dev-user-00000000-0000-0000-0000-000000000001',
  'active',
  5242880,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
);

-- Other user's session for auth testing
INSERT INTO upload_sessions (id, user_id, status, part_size_bytes, expires_at, created_at, updated_at)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'other-user-99999999-9999-9999-9999-999999999999',
  'active',
  5242880,
  NOW() + INTERVAL '15 minutes',
  NOW(),
  NOW()
);
```

### 10.2 Test Files

| File | Size | Purpose |
|------|------|---------|
| `test-instruction.pdf` | 1 MB | Valid PDF for happy path |
| `test-instruction-large.pdf` | 10 MB | Multi-part upload testing |
| `test-parts.csv` | 100 KB | Parts list testing |
| `test-image.jpg` | 500 KB | Image upload testing |
| `fake-pdf.txt` | 1 KB | Magic bytes validation failure |

---

## 11. Definition of Done

### 11.1 Endpoint Completion Criteria

- [ ] All happy path tests pass
- [ ] All error cases return correct status codes
- [ ] All validation errors include helpful messages
- [ ] Response shapes match AWS Lambda implementation
- [ ] Database state matches expected after each operation

### 11.2 Integration Criteria

- [ ] Full E2E workflow completes successfully
- [ ] Multiple concurrent sessions work correctly
- [ ] Idempotent operations are truly idempotent
- [ ] Rate limiting works as expected

### 11.3 Vercel-Specific Criteria

- [ ] Part size adjusted for Vercel body limit (4 MB)
- [ ] Timeout handling verified
- [ ] Cold start performance acceptable
- [ ] Binary upload works with base64 encoding

---

*Generated: 2025-01-21*
*Story: STORY-017 - Image Uploads Phase 3 (Multipart Sessions)*
