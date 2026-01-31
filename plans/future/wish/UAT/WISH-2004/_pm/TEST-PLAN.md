# WISH-2004: Modals & Transitions - Test Plan

## Scope Summary

- **Endpoints touched:**
  - `DELETE /api/wishlist/:id` - Delete wishlist item permanently
  - `POST /api/wishlist/:id/purchased` - Mark item as purchased and transition to Sets
- **UI touched:** Yes
  - DeleteConfirmModal component
  - GotItModal component (purchase flow form)
  - Toast notifications with undo capability
- **Data/storage touched:** Yes
  - wishlist_items table (delete operations)
  - sets table (create from wishlist via purchased endpoint)
  - S3 storage (image copy/delete during transition)

---

## Happy Path Tests

### Test 1: Delete Item via Modal Confirmation

- **Setup:** User has wishlist item with id `abc-123`
- **Action:** Open delete modal, confirm deletion
- **Expected:**
  - `DELETE /api/wishlist/abc-123` returns 204
  - Item removed from gallery list (RTK Query cache invalidation)
  - Toast notification shows "Item deleted"
- **Evidence:**
  - HTTP response status 204
  - Gallery list no longer contains item
  - Toast appears in bottom-right

### Test 2: Purchase Item ("Got It" Flow) with Minimal Input

- **Setup:** User has wishlist item with id `abc-123`, price `849.99`
- **Action:** Open GotItModal, click "Add to Collection" with defaults
- **Expected:**
  - `POST /api/wishlist/abc-123/purchased` with `{ quantity: 1, keepOnWishlist: false }`
  - Returns 201 with new Set item
  - Wishlist item deleted
  - Toast shows "Item added to your collection" with "View in Sets" link
- **Evidence:**
  - HTTP response status 201
  - Response contains SetItem with `wishlistItemId: "abc-123"`
  - Wishlist gallery refreshes without item
  - Toast with View in Sets button appears

### Test 3: Purchase with Full Form Data

- **Setup:** Wishlist item with image
- **Action:** Fill all fields: pricePaid=`799.99`, tax=`64.00`, shipping=`15.00`, quantity=`2`, purchaseDate=`2026-01-15`, keepOnWishlist=`false`
- **Expected:**
  - Set created with all purchase details
  - Image copied to Sets S3 prefix
  - Original image deleted from Wishlist S3 prefix
  - Wishlist item deleted
- **Evidence:**
  - SetItem response has `purchasePrice: "799.99"`, `tax: "64.00"`, `shipping: "15.00"`, `quantity: 2`
  - S3 has new key in `sets/user-id/`

### Test 4: Purchase with "Keep on Wishlist" Checked

- **Setup:** Wishlist item with id `abc-123`
- **Action:** Mark as purchased with `keepOnWishlist: true`
- **Expected:**
  - Set created successfully
  - Wishlist item NOT deleted
  - Original image NOT deleted (kept for wishlist)
- **Evidence:**
  - SetItem created with `wishlistItemId`
  - `GET /api/wishlist/abc-123` still returns item
  - Both images exist (wishlist + sets)

---

## Error Cases

### Test 5: Delete Item Not Owned (403)

- **Setup:** Item owned by user-A, request from user-B
- **Action:** `DELETE /api/wishlist/:id` as user-B
- **Expected:** 403 Forbidden response
- **Evidence:** Response status 403, body `{ error: "FORBIDDEN" }`

### Test 6: Delete Non-Existent Item (404)

- **Setup:** No item with id `nonexistent-id`
- **Action:** `DELETE /api/wishlist/nonexistent-id`
- **Expected:** 404 Not Found response
- **Evidence:** Response status 404, body `{ error: "NOT_FOUND" }`

### Test 7: Purchase Item Not Owned (403)

- **Setup:** Item owned by user-A, request from user-B
- **Action:** `POST /api/wishlist/:id/purchased` as user-B
- **Expected:** 403 Forbidden, no Set created
- **Evidence:** Response status 403, no new Sets entry

### Test 8: Purchase Non-Existent Item (404)

- **Setup:** No item with id `nonexistent-id`
- **Action:** `POST /api/wishlist/nonexistent-id/purchased`
- **Expected:** 404 Not Found
- **Evidence:** Response status 404, body `{ error: "NOT_FOUND" }`

### Test 9: Purchase with Invalid Form Data (400)

- **Setup:** Valid wishlist item
- **Action:** Submit with invalid data: `pricePaid: "abc"`, `quantity: 0`
- **Expected:** 400 Validation Error
- **Evidence:**
  - Response status 400
  - Body contains `{ error: "Validation failed", details: { ... } }`
  - Modal shows inline validation errors

### Test 10: Atomic Transaction - Set Creation Fails

- **Setup:** Simulate Sets service failure
- **Action:** `POST /api/wishlist/:id/purchased`
- **Expected:**
  - Wishlist item NOT deleted (transaction safety)
  - Returns 500 with `SET_CREATION_FAILED`
- **Evidence:**
  - Response status 500
  - `GET /api/wishlist/:id` still returns item

---

## Edge Cases

### Test 11: Delete Modal Cancel

- **Setup:** Open DeleteConfirmModal
- **Action:** Click "Cancel" or press ESC
- **Expected:** Modal closes, no deletion occurs
- **Evidence:** Item still in gallery, no DELETE request made

### Test 12: GotItModal Cancel

- **Setup:** Open GotItModal, fill some fields
- **Action:** Click "Cancel"
- **Expected:** Modal closes, form state reset on reopen
- **Evidence:** No POST request, reopening shows defaults

### Test 13: Delete During Loading State

- **Setup:** Click delete, while isDeleting=true
- **Action:** Try to click Cancel or close modal
- **Expected:** Buttons disabled, modal cannot be dismissed
- **Evidence:** Buttons have disabled attribute, modal stays open

### Test 14: Purchase with No Image

- **Setup:** Wishlist item without imageUrl
- **Action:** Mark as purchased
- **Expected:** Set created successfully, no S3 operations
- **Evidence:** SetItem has no image, no S3 copy/delete calls

### Test 15: Empty Price Fields Accepted

- **Setup:** Wishlist item with price, user clears form field
- **Action:** Submit with empty pricePaid, tax, shipping
- **Expected:** Uses original wishlist price as purchasePrice
- **Evidence:** SetItem has original wishlist price

### Test 16: Form Reset on Modal Reopen

- **Setup:** Open GotItModal, enter tax=`50.00`, close modal
- **Action:** Reopen modal
- **Expected:** Tax field is empty (form reset)
- **Evidence:** Input value is empty string

---

## Required Tooling Evidence

### Backend

**Required .http requests:**

```http
### Delete wishlist item (happy path)
DELETE {{baseUrl}}/api/wishlist/{{itemId}}
Authorization: Bearer {{token}}

### Expected: 204 No Content
```

```http
### Purchase item (happy path)
POST {{baseUrl}}/api/wishlist/{{itemId}}/purchased
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "pricePaid": "799.99",
  "tax": "64.00",
  "shipping": "15.00",
  "quantity": 1,
  "keepOnWishlist": false
}

### Expected: 201 Created with SetItem body
```

```http
### Delete item not owned (403 test)
DELETE {{baseUrl}}/api/wishlist/{{otherUserItemId}}
Authorization: Bearer {{token}}

### Expected: 403 { error: "FORBIDDEN" }
```

```http
### Purchase with keepOnWishlist
POST {{baseUrl}}/api/wishlist/{{itemId}}/purchased
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "quantity": 1,
  "keepOnWishlist": true
}

### Expected: 201, item still exists after GET
```

**Assertions:**
- Status codes: 204 (delete), 201 (purchase), 403, 404, 400
- Response shapes match Zod schemas
- Cache invalidation: subsequent GET /api/wishlist excludes deleted items

### Frontend (UI touched)

**Playwright runs required:**

1. `delete-flow.spec.ts`:
   - Open gallery, click delete icon on card
   - Verify modal appears with item preview
   - Verify cancel closes modal (item persists)
   - Verify confirm deletes (item gone from list)
   - Verify loading state disables buttons

2. `purchase-flow.spec.ts`:
   - Open gallery, click "Got It" on card
   - Verify modal shows item title
   - Verify form fields have correct defaults
   - Fill form, submit, verify success toast
   - Verify "View in Sets" link works

3. `modal-accessibility.spec.ts`:
   - Verify ESC closes DeleteConfirmModal (when not loading)
   - Verify focus trap in GotItModal
   - Verify Tab navigation through form fields
   - Verify Enter submits form

**Required artifacts:**
- Screenshots of modal states (open, loading, closed)
- Trace files for failed tests

---

## Risks to Call Out

1. **Transaction atomicity:** The "create Set, then delete Wishlist" flow is NOT in a true database transaction. Tests must verify that Set creation failure does NOT delete the wishlist item.

2. **S3 image operations:** Image copy/delete operations are "best effort" - they log warnings on failure but don't block the transaction. Tests should verify this behavior.

3. **Undo feature:** The GotItModal success toast has an "Undo" button that currently shows "Coming soon". True undo would require a separate story.

4. **Toast timing:** Success toasts dismiss after 5 seconds. E2E tests must account for this timing.

5. **RTK Query cache:** Tests should verify that cache invalidation (`Wishlist`, `WishlistItem`, `Sets` tags) works correctly after mutations.
