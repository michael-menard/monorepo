# Test Plan - WISH-2008: Authorization Layer Testing and Policy Documentation

## Scope Summary

**Endpoints Touched:**
- `GET /api/wishlist` - List wishlist items
- `GET /api/wishlist/:id` - Get single wishlist item
- `POST /api/wishlist` - Create wishlist item
- `PATCH /api/wishlist/:id` - Update wishlist item
- `DELETE /api/wishlist/:id` - Delete wishlist item
- `PUT /api/wishlist/reorder` - Reorder wishlist items
- `POST /api/wishlist/:id/purchased` - Mark item as purchased
- `GET /api/wishlist/images/presign` - Get S3 presigned URL

**UI Touched:** No (backend authorization only)

**Data/Storage Touched:** Yes
- PostgreSQL: wishlist_items table (ownership verification queries)
- S3: Presigned URL generation (user-scoped prefixes)
- Authentication: Cognito JWT token validation

## Happy Path Tests

### Test 1: Authenticated user can list their own wishlist items
**Setup:**
- User A authenticated with valid Cognito JWT
- User A has 5 wishlist items in database
- User B has 3 wishlist items in database

**Action:**
```http
GET /api/wishlist
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 200 OK response
- Response contains only User A's 5 items
- User B's items NOT included
- Response includes userId field matching User A's Cognito sub claim

**Evidence:**
- HTTP response status: 200
- Response body: Verify userId matches JWT sub claim for all items
- Database query log: Verify WHERE clause includes userId filter

---

### Test 2: Authenticated user can retrieve their own wishlist item by ID
**Setup:**
- User A has item with id=123 in database
- User B has item with id=456 in database

**Action:**
```http
GET /api/wishlist/123
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 200 OK response
- Item 123 returned with full details
- userId field matches User A's Cognito sub claim

**Evidence:**
- HTTP response status: 200
- Response body: item.id === 123, item.userId matches JWT
- Database query: SELECT with WHERE id = 123 AND userId = {USER_A_ID}

---

### Test 3: Authenticated user can create a wishlist item
**Setup:**
- User A authenticated
- Valid wishlist item payload

**Action:**
```http
POST /api/wishlist
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "title": "UCS Millennium Falcon",
  "setNumber": "75192",
  "price": 849.99,
  "currency": "USD",
  "store": "LEGO",
  "pieceCount": 7541
}
```

**Expected Outcome:**
- 201 Created response
- Item created with userId matching User A's Cognito sub claim
- createdBy field populated with User A's userId

**Evidence:**
- HTTP response status: 201
- Response body: item.userId matches JWT sub
- Database: Verify INSERT with userId, createdBy fields populated

---

### Test 4: Authenticated user can update their own wishlist item
**Setup:**
- User A has item with id=123 in database

**Action:**
```http
PATCH /api/wishlist/123
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "price": 799.99,
  "notes": "Price dropped!"
}
```

**Expected Outcome:**
- 200 OK response
- Item 123 updated with new price and notes
- updatedBy field populated with User A's userId
- updatedAt timestamp updated

**Evidence:**
- HTTP response status: 200
- Response body: price === 799.99, updatedBy matches User A
- Database: UPDATE with WHERE id = 123 AND userId = {USER_A_ID}

---

### Test 5: Authenticated user can delete their own wishlist item
**Setup:**
- User A has item with id=123 in database

**Action:**
```http
DELETE /api/wishlist/123
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 204 No Content response
- Item 123 deleted from database

**Evidence:**
- HTTP response status: 204
- Database: DELETE with WHERE id = 123 AND userId = {USER_A_ID}
- Subsequent GET /api/wishlist/123 returns 404

---

### Test 6: Authenticated user can reorder their own wishlist items
**Setup:**
- User A has 5 items with sortOrder [0, 1, 2, 3, 4]

**Action:**
```http
PUT /api/wishlist/reorder
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "itemIds": [3, 1, 4, 0, 2]
}
```

**Expected Outcome:**
- 200 OK response
- Items reordered with new sortOrder values
- Only User A's items reordered (ownership verified)

**Evidence:**
- HTTP response status: 200
- Database: UPDATE sortOrder WHERE id IN (...) AND userId = {USER_A_ID}
- Verify sortOrder values updated correctly

---

### Test 7: Authenticated user can mark their own item as purchased
**Setup:**
- User A has unpurchased item with id=123

**Action:**
```http
POST /api/wishlist/123/purchased
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "purchaseDate": "2026-01-28",
  "actualPrice": 799.99
}
```

**Expected Outcome:**
- 200 OK response
- Item marked as purchased
- Set created in sets collection with cross-reference

**Evidence:**
- HTTP response status: 200
- Database: Item ownership verified before purchase
- Sets collection: New entry created with correct userId

---

### Test 8: Authenticated user can request S3 presigned URL for image upload
**Setup:**
- User A authenticated
- Valid image upload request

**Action:**
```http
GET /api/wishlist/images/presign?filename=millennium-falcon.jpg&contentType=image/jpeg
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 200 OK response
- Presigned URL returned with user-scoped S3 prefix
- URL format: `s3://bucket/wishlist/{USER_ID}/images/{filename}`

**Evidence:**
- HTTP response status: 200
- Response body: presignedUrl includes userId in path
- S3 path isolation: Verify prefix isolation per user

---

## Error Cases

### Auth Error 1: Unauthenticated request returns 401
**Setup:**
- No Authorization header or invalid token

**Action:**
```http
GET /api/wishlist
# No Authorization header
```

**Expected Outcome:**
- 401 Unauthorized response
- Error message: "Authentication required"

**Evidence:**
- HTTP response status: 401
- Response body: { error: "Unauthorized", message: "Authentication required" }
- No database queries executed

---

### Auth Error 2: Expired JWT token returns 401
**Setup:**
- Valid JWT token but expired (exp claim in past)

**Action:**
```http
GET /api/wishlist
Authorization: Bearer {EXPIRED_TOKEN}
```

**Expected Outcome:**
- 401 Unauthorized response
- Error message: "Token expired"

**Evidence:**
- HTTP response status: 401
- Response body: { error: "Unauthorized", message: "Token expired" }
- Cognito token validation failure logged

---

### Auth Error 3: User cannot access another user's wishlist item (GET)
**Setup:**
- User A authenticated
- User B has item with id=456

**Action:**
```http
GET /api/wishlist/456
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 403 Forbidden or 404 Not Found response
- Error message: "Access denied" or "Item not found"

**Evidence:**
- HTTP response status: 403 or 404
- Database query: WHERE id = 456 AND userId = {USER_A_ID} returns 0 rows
- Audit log: Attempted unauthorized access logged

---

### Auth Error 4: User cannot update another user's wishlist item (PATCH)
**Setup:**
- User A authenticated
- User B has item with id=456

**Action:**
```http
PATCH /api/wishlist/456
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "price": 999.99
}
```

**Expected Outcome:**
- 403 Forbidden or 404 Not Found response
- Item NOT updated in database

**Evidence:**
- HTTP response status: 403 or 404
- Database: No UPDATE executed (WHERE clause filters by userId)
- Audit log: Unauthorized update attempt logged

---

### Auth Error 5: User cannot delete another user's wishlist item (DELETE)
**Setup:**
- User A authenticated
- User B has item with id=456

**Action:**
```http
DELETE /api/wishlist/456
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 403 Forbidden or 404 Not Found response
- Item NOT deleted from database

**Evidence:**
- HTTP response status: 403 or 404
- Database: No DELETE executed (WHERE clause filters by userId)
- User B's item still exists in database

---

### Auth Error 6: User cannot reorder another user's wishlist items
**Setup:**
- User A authenticated
- User B has items with ids [10, 11, 12]

**Action:**
```http
PUT /api/wishlist/reorder
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "itemIds": [11, 10, 12]
}
```

**Expected Outcome:**
- 403 Forbidden response OR items silently filtered (no reorder applied)
- User B's items NOT reordered

**Evidence:**
- HTTP response status: 403 or 200 (with 0 items reordered)
- Database: No UPDATE executed for User B's items
- User B's sortOrder unchanged

---

### Validation Error 1: Invalid wishlist item ID format returns 400
**Setup:**
- User A authenticated
- Invalid ID format (non-UUID)

**Action:**
```http
GET /api/wishlist/invalid-id-123
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 400 Bad Request response
- Error message: "Invalid item ID format"

**Evidence:**
- HTTP response status: 400
- Response body: Zod validation error
- No database query executed

---

### Validation Error 2: Missing required fields returns 400
**Setup:**
- User A authenticated
- Invalid POST payload (missing title)

**Action:**
```http
POST /api/wishlist
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "price": 849.99
}
```

**Expected Outcome:**
- 400 Bad Request response
- Error message: "Title is required"

**Evidence:**
- HTTP response status: 400
- Response body: Zod validation error listing missing fields
- No database INSERT executed

---

### Not Found Error: Non-existent item returns 404
**Setup:**
- User A authenticated
- Item with id=99999 does not exist in database

**Action:**
```http
GET /api/wishlist/99999
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 404 Not Found response
- Error message: "Wishlist item not found"

**Evidence:**
- HTTP response status: 404
- Database query: WHERE id = 99999 AND userId = {USER_A_ID} returns 0 rows

---

## Edge Cases

### Edge Case 1: User with no wishlist items returns empty array
**Setup:**
- User A authenticated
- User A has 0 items in database

**Action:**
```http
GET /api/wishlist
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 200 OK response
- Empty array: []
- No errors

**Evidence:**
- HTTP response status: 200
- Response body: { items: [], total: 0 }
- Database query executed with userId filter

---

### Edge Case 2: Reorder with duplicate item IDs returns 400
**Setup:**
- User A authenticated
- Reorder payload contains duplicate IDs

**Action:**
```http
PUT /api/wishlist/reorder
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json

{
  "itemIds": [1, 2, 1, 3]
}
```

**Expected Outcome:**
- 400 Bad Request response
- Error message: "Duplicate item IDs not allowed"

**Evidence:**
- HTTP response status: 400
- Zod validation error
- No database UPDATE executed

---

### Edge Case 3: Concurrent updates to same item (optimistic locking)
**Setup:**
- User A authenticated
- Two concurrent PATCH requests to same item

**Action:**
```http
# Request 1
PATCH /api/wishlist/123
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json
{ "price": 799.99 }

# Request 2 (concurrent)
PATCH /api/wishlist/123
Authorization: Bearer {USER_A_TOKEN}
Content-Type: application/json
{ "price": 850.00 }
```

**Expected Outcome:**
- Both requests succeed OR second request fails with conflict error
- Last-write-wins OR optimistic locking conflict detected

**Evidence:**
- HTTP response statuses: 200 or 409
- Database: updatedAt timestamps verify order
- Final price reflects last successful update

---

### Edge Case 4: Large pagination (1000+ items)
**Setup:**
- User A authenticated
- User A has 1500 items in database

**Action:**
```http
GET /api/wishlist?page=1&limit=100
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- 200 OK response
- 100 items returned
- Pagination metadata: { page: 1, limit: 100, total: 1500, pages: 15 }
- Query performance < 2s

**Evidence:**
- HTTP response status: 200
- Response body: items.length === 100
- Database query: LIMIT 100 OFFSET 0 with userId filter
- Performance: Query execution time < 2s

---

### Edge Case 5: User attempts double-delete (idempotency)
**Setup:**
- User A authenticated
- Item with id=123 exists

**Action:**
```http
# First delete
DELETE /api/wishlist/123
Authorization: Bearer {USER_A_TOKEN}

# Second delete (item already deleted)
DELETE /api/wishlist/123
Authorization: Bearer {USER_A_TOKEN}
```

**Expected Outcome:**
- First request: 204 No Content
- Second request: 404 Not Found

**Evidence:**
- First response: 204
- Second response: 404
- Database: Item deleted after first request
- No errors or exceptions

---

## Required Tooling Evidence

### Backend Testing

**HTTP Requests Required:**
- `.http` file: `__http__/wishlist-authorization.http`
- Minimum 20 requests covering:
  - Happy path authorization (8 requests)
  - Auth/permission errors (6 requests)
  - Validation errors (2 requests)
  - Not found errors (1 request)
  - Edge cases (5 requests)

**Assertions Required:**
- HTTP status codes: 200, 201, 204, 400, 401, 403, 404
- Response body structure (Zod validation)
- userId field matching JWT sub claim
- Database ownership verification (WHERE clause with userId)
- Audit log entries for unauthorized attempts

**Test Coverage Expectations:**
- Unit tests: Authorization middleware (10 tests)
- Integration tests: All 8 endpoints with ownership checks (20 tests)
- Security tests: Cross-user access attempts (6 tests)

---

### Frontend Testing (N/A)

No frontend UI changes in this story. Authorization is enforced at API layer.

---

## Risks to Call Out

### Risk 1: Missing Authorization Checks
**Description:** Some endpoints may lack ownership verification in WHERE clauses
**Mitigation:** Comprehensive audit of all wishlist endpoints, verify userId filters in all queries
**Testing:** Attempt cross-user access for every endpoint

### Risk 2: JWT Token Validation Consistency
**Description:** Cognito JWT validation may differ across endpoints
**Mitigation:** Centralized auth middleware used by all routes
**Testing:** Test expired tokens, invalid signatures, missing claims

### Risk 3: Audit Logging Gaps
**Description:** Unauthorized access attempts may not be logged
**Mitigation:** Add structured logging for all 403/404 authorization failures
**Testing:** Verify CloudWatch logs contain unauthorized access attempts

### Risk 4: S3 Presigned URL Path Isolation
**Description:** Presigned URLs may allow cross-user file access if paths not scoped correctly
**Mitigation:** Verify S3 path format includes userId: `wishlist/{userId}/images/`
**Testing:** Attempt to upload to another user's S3 prefix

### Risk 5: Race Conditions in Ownership Verification
**Description:** Concurrent requests may bypass ownership checks
**Mitigation:** Database-level constraints (foreign keys, check constraints)
**Testing:** Concurrent update/delete requests to same item

---

## Policy Documentation Requirements

### Security Policy Document: `docs/wishlist-authorization-policy.md`

**Required Sections:**
1. **Ownership Model:** All wishlist items belong to a single user (userId foreign key)
2. **Authentication:** Cognito JWT required for all endpoints (sub claim = userId)
3. **Authorization Rules:**
   - Users can ONLY access their own wishlist items
   - All queries MUST filter by userId from JWT
   - Cross-user access returns 403 Forbidden or 404 Not Found
4. **Audit Logging:** All unauthorized access attempts logged to CloudWatch
5. **S3 Path Isolation:** Presigned URLs scoped to `wishlist/{userId}/images/`
6. **Role-Based Access (Future):** Admin users can access all items (Phase 2)

**Document Location:** `packages/backend/database-schema/docs/wishlist-authorization-policy.md`

---

## Definition of Done

- [ ] All 8 happy path tests pass
- [ ] All 9 error case tests pass
- [ ] All 5 edge case tests pass
- [ ] Authorization policy document created
- [ ] All endpoints verified to include userId in WHERE clauses
- [ ] Audit logging implemented for unauthorized attempts
- [ ] `.http` file created with 20+ authorization test scenarios
- [ ] Unit tests: 10+ authorization middleware tests pass
- [ ] Integration tests: 20+ endpoint ownership tests pass
- [ ] Security tests: 6+ cross-user access tests pass
- [ ] Code review approved (security focus)
- [ ] QA verification complete
