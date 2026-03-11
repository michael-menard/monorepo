# TEST-PLAN: STORY-010 - MOC Parts Lists Management

## Overview

This test plan covers the 7 API endpoints for MOC Parts Lists management:
1. `POST /api/moc-instructions/{mocId}/parts-lists` - Create parts list
2. `GET /api/moc-instructions/{mocId}/parts-lists` - Get all parts lists for a MOC
3. `GET /api/user/parts-lists/summary` - Get user's parts list summary
4. `PUT /api/moc-instructions/{mocId}/parts-lists/{id}` - Update parts list
5. `PATCH /api/moc-instructions/{mocId}/parts-lists/{id}/status` - Update status flags
6. `DELETE /api/moc-instructions/{mocId}/parts-lists/{id}` - Delete parts list
7. `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse` - Parse CSV/XML file

---

## Happy Path Tests

### HP-1: Create Parts List
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists`
**Preconditions:**
- Valid JWT token
- User owns MOC with given `mocId`
- MOC exists in database

**Test Steps:**
1. Send POST with valid body: `{ title, description?, built?, purchased? }`
2. Verify 201 response
3. Verify returned parts list has generated `id`
4. Verify database record created with correct fields
5. Verify `createdAt` and `updatedAt` are populated

**Expected Evidence:**
- `.http` request/response captured
- Database query showing new record

---

### HP-2: Create Parts List with Initial Parts Array
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists`
**Preconditions:** Same as HP-1

**Test Steps:**
1. Send POST with parts array: `{ title, parts: [{ partId, partName, quantity, color }] }`
2. Verify 201 response
3. Verify `moc_parts` table has corresponding records
4. Verify foreign key relationship to parts list

**Expected Evidence:**
- `.http` request/response captured
- Database query showing parts list AND parts records

---

### HP-3: Get Parts Lists for MOC
**Endpoint:** `GET /api/moc-instructions/{mocId}/parts-lists`
**Preconditions:**
- Valid JWT token
- User owns MOC
- MOC has at least 1 parts list

**Test Steps:**
1. Send GET request
2. Verify 200 response
3. Verify array of parts lists returned
4. Verify each parts list includes parts array

**Expected Evidence:**
- `.http` request/response captured

---

### HP-4: Get User Parts Lists Summary
**Endpoint:** `GET /api/user/parts-lists/summary`
**Preconditions:**
- Valid JWT token
- User has at least 1 parts list across any MOC

**Test Steps:**
1. Send GET request
2. Verify 200 response
3. Verify aggregated stats: `totalLists`, `totalParts`, `totalBuilt`, `totalPurchased`, etc.

**Expected Evidence:**
- `.http` request/response captured

---

### HP-5: Update Parts List Metadata
**Endpoint:** `PUT /api/moc-instructions/{mocId}/parts-lists/{id}`
**Preconditions:**
- Valid JWT token
- User owns MOC
- Parts list exists

**Test Steps:**
1. Send PUT with updated fields: `{ title?, description?, notes?, costEstimate? }`
2. Verify 200 response
3. Verify `updatedAt` changed
4. Verify only specified fields updated

**Expected Evidence:**
- `.http` request/response captured
- Database query showing updated record

---

### HP-6: Update Parts List Status
**Endpoint:** `PATCH /api/moc-instructions/{mocId}/parts-lists/{id}/status`
**Preconditions:**
- Valid JWT token
- User owns MOC
- Parts list exists

**Test Steps:**
1. Send PATCH with status: `{ built: true, purchased: true }`
2. Verify 200 response
3. Verify database flags updated

**Expected Evidence:**
- `.http` request/response captured

---

### HP-7: Delete Parts List
**Endpoint:** `DELETE /api/moc-instructions/{mocId}/parts-lists/{id}`
**Preconditions:**
- Valid JWT token
- User owns MOC
- Parts list exists with associated parts

**Test Steps:**
1. Send DELETE request
2. Verify 204 response
3. Verify parts list deleted from database
4. Verify associated `moc_parts` records cascaded/deleted

**Expected Evidence:**
- `.http` request/response captured
- Database query confirming deletion

---

### HP-8: Parse CSV File
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse`
**Preconditions:**
- Valid JWT token
- User owns MOC
- Parts list exists
- Valid CSV file with columns: Part ID, Part Name, Quantity, Color

**Test Steps:**
1. Send POST with CSV content
2. Verify 200 response
3. Verify parts inserted into `moc_parts` table
4. Verify batch processing handled correctly

**Expected Evidence:**
- `.http` request/response captured
- Database query showing inserted parts

---

## Error Cases

### E-1: Create Parts List - Unauthorized (No Token)
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists`
**Test Steps:**
1. Send POST without Authorization header
2. Verify 401 response
3. Verify error code: `UNAUTHORIZED`

---

### E-2: Create Parts List - MOC Not Found
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists`
**Test Steps:**
1. Send POST with non-existent `mocId` (valid UUID format)
2. Verify 404 response
3. Verify error code: `NOT_FOUND`

---

### E-3: Create Parts List - MOC Not Owned by User
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists`
**Test Steps:**
1. Send POST with `mocId` owned by different user
2. Verify 404 response (or 403)
3. Verify error code: `NOT_FOUND` or `FORBIDDEN`

---

### E-4: Create Parts List - Invalid Body
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists`
**Test Steps:**
1. Send POST with missing required `title`
2. Verify 400 response
3. Verify error code: `VALIDATION_ERROR`

---

### E-5: Get Parts List - MOC Not Found
**Endpoint:** `GET /api/moc-instructions/{mocId}/parts-lists`
**Test Steps:**
1. Send GET with non-existent `mocId`
2. Verify 404 response

---

### E-6: Update Parts List - Parts List Not Found
**Endpoint:** `PUT /api/moc-instructions/{mocId}/parts-lists/{id}`
**Test Steps:**
1. Send PUT with non-existent parts list `id`
2. Verify 404 response

---

### E-7: Delete Parts List - Parts List Not Found
**Endpoint:** `DELETE /api/moc-instructions/{mocId}/parts-lists/{id}`
**Test Steps:**
1. Send DELETE with non-existent parts list `id`
2. Verify 404 response

---

### E-8: Parse CSV - Invalid Format
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse`
**Test Steps:**
1. Send POST with malformed CSV (missing columns)
2. Verify 400 response
3. Verify error code: `VALIDATION_ERROR`
4. Verify descriptive error message about missing columns

---

### E-9: Parse CSV - Exceeds Row Limit
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse`
**Test Steps:**
1. Send POST with CSV > 10,000 rows
2. Verify 400 response
3. Verify error message indicates row limit exceeded

---

### E-10: Parse CSV - Invalid Quantity
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse`
**Test Steps:**
1. Send POST with CSV containing negative quantity
2. Verify 400 response
3. Verify validation error for quantity field

---

## Edge Cases

### ED-1: Create Parts List - Empty Parts Array
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists`
**Test Steps:**
1. Send POST with `parts: []`
2. Verify 201 response (empty array is valid)
3. Verify parts list created with zero parts

---

### ED-2: Update Parts List - Replace All Parts
**Endpoint:** `PUT /api/moc-instructions/{mocId}/parts-lists/{id}`
**Test Steps:**
1. Send PUT with new parts array
2. Verify existing parts replaced (not appended)
3. Verify old parts removed from database

---

### ED-3: Parse CSV - Duplicate Part IDs
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse`
**Test Steps:**
1. Send CSV with duplicate part ID + color combinations
2. Verify behavior (aggregate quantities OR keep separate)
3. Document expected behavior

**PM Decision:** Parts with same ID but different colors are distinct. Parts with same ID and same color should be separate rows (not aggregated) - CSV is source of truth.

---

### ED-4: Get User Summary - No Parts Lists
**Endpoint:** `GET /api/user/parts-lists/summary`
**Test Steps:**
1. Query with user having zero parts lists
2. Verify 200 response with zeroed stats
3. Verify no error (empty state is valid)

---

### ED-5: Parse CSV - Special Characters in Part Names
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse`
**Test Steps:**
1. Send CSV with Unicode characters, quotes, commas in part names
2. Verify correct parsing and storage
3. Verify special characters preserved

---

### ED-6: Large Parts List Performance
**Endpoint:** `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse`
**Test Steps:**
1. Send CSV with 9,999 rows (just under limit)
2. Verify successful processing
3. Verify batch insert pattern (1,000 chunks) works correctly
4. Verify transaction atomicity (all-or-nothing)

---

### ED-7: Concurrent Updates
**Test Steps:**
1. Send two simultaneous PUT requests to same parts list
2. Verify no data corruption
3. Verify `updatedAt` reflects last write

---

## Evidence Requirements

### Required `.http` Requests
All tests must be executed via:
- `/__http__/moc-parts-lists.http`

### Database Verification
For create/update/delete operations:
- Show record state before and after

### Test Coverage
- Unit tests for Zod validation schemas
- Integration tests for each endpoint handler
- Transaction rollback test for parse failures

---

## Blockers

None identified. All test cases are executable with:
- Seeded test data (MOC records owned by test user)
- Valid JWT token for authenticated requests
- Sample CSV files for parse tests
