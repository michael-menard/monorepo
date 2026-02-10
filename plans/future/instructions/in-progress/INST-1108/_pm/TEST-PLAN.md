# Test Plan: INST-1108 Edit MOC Metadata

Generated: 2026-02-09

---

## Scope Summary

### Endpoints Touched
- **Backend**: `PATCH /mocs/:id` (NEW - must implement)
- **Frontend RTK Query**: `useUpdateMocMutation` (EXISTS), `useGetMocDetailQuery` (EXISTS)

### UI Touched
**Yes** - EditMocPage component (new page at `/mocs/:mocId/edit`)

### Data/Storage Touched
**Yes** - `mocs` table (UPDATE operation on title, description, theme, tags, updatedAt)

### Components Modified/Created
- **New**: `EditMocPage.tsx` at `apps/web/app-instructions-gallery/src/pages/`
- **Reused**: `MocForm` component (no changes needed)
- **Integration**: Edit button on MOC detail page (INST-1101 dependency)

---

## Happy Path Tests

### HP-1: Load Edit Page with Pre-Populated Form
**Setup:**
- Authenticated user owns MOC with id="test-moc-123"
- MOC has: title="Castle MOC", description="My awesome castle", theme="Castle", tags=["medieval", "fortress"]

**Action:**
- Navigate to `/mocs/test-moc-123/edit`

**Expected:**
- EditMocPage renders
- MocForm component displays with fields pre-populated:
  - Title input: "Castle MOC"
  - Description textarea: "My awesome castle"
  - Theme select: "Castle" selected
  - Tags multi-select: ["medieval", "fortress"] selected
- Save button enabled (form is valid)
- Cancel button visible

**Evidence:**
- Playwright: `await expect(page.locator('input[name="title"]')).toHaveValue('Castle MOC')`
- Playwright: `await expect(page.locator('textarea[name="description"]')).toHaveValue('My awesome castle')`
- Screenshot: Form with pre-populated values

### HP-2: Update Title Only
**Setup:**
- EditMocPage loaded with MOC data (as in HP-1)

**Action:**
- Change title from "Castle MOC" to "Medieval Castle MOC"
- Click Save button

**Expected:**
- `PATCH /mocs/test-moc-123` called with body: `{ title: "Medieval Castle MOC" }`
- Response: 200 with updated MOC object
- Success toast: "MOC updated!"
- Navigation to detail page: `/mocs/test-moc-123`
- Detail page displays new title: "Medieval Castle MOC"

**Evidence:**
- `.http` request log: `PATCH /mocs/test-moc-123` with updated title
- Response body contains: `"title": "Medieval Castle MOC"`, `"updatedAt": <new timestamp>`
- Playwright: Toast visible with text "MOC updated!"
- Playwright: URL changed to `/mocs/test-moc-123`
- Playwright: Detail page shows new title

### HP-3: Update Multiple Fields
**Setup:**
- EditMocPage loaded with MOC data

**Action:**
- Change title to "Epic Castle"
- Change description to "A massive castle build"
- Change theme to "Fantasy"
- Add tag "epic"
- Click Save

**Expected:**
- `PATCH /mocs/test-moc-123` called with body:
  ```json
  {
    "title": "Epic Castle",
    "description": "A massive castle build",
    "theme": "Fantasy",
    "tags": ["medieval", "fortress", "epic"]
  }
  ```
- Response: 200 with updated MOC
- Success toast and redirect to detail page
- Detail page reflects all changes

**Evidence:**
- `.http` request: All fields in PATCH body
- Response: All fields updated
- Playwright: All changes visible on detail page

### HP-4: Cancel Edit Without Saving
**Setup:**
- EditMocPage loaded
- User changes title to "New Title" (not saved)

**Action:**
- Click Cancel button

**Expected:**
- No PATCH request sent
- Navigation to detail page: `/mocs/test-moc-123`
- Detail page shows original title "Castle MOC" (changes discarded)

**Evidence:**
- Network log: No PATCH request
- Playwright: URL changed to `/mocs/test-moc-123`
- Playwright: Detail page shows original title

### HP-5: Keyboard Shortcut Submit
**Setup:**
- EditMocPage loaded
- User changes title

**Action:**
- Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)

**Expected:**
- Form submitted (same as clicking Save)
- PATCH request sent
- Success toast and redirect

**Evidence:**
- Playwright: `await page.keyboard.press('Meta+Enter')`
- PATCH request logged
- Navigation to detail page

### HP-6: Keyboard Escape to Cancel
**Setup:**
- EditMocPage loaded

**Action:**
- Press Escape key

**Expected:**
- Cancel action triggered (same as clicking Cancel)
- Navigation to detail page without saving

**Evidence:**
- Playwright: `await page.keyboard.press('Escape')`
- URL changed to detail page

---

## Error Cases

### ERR-1: Authorization Failure (Not Owner)
**Setup:**
- User A authenticated
- MOC id="test-moc-456" owned by User B

**Action:**
- User A navigates to `/mocs/test-moc-456/edit`
- (Or attempts PATCH request)

**Expected:**
- Frontend: 404 error from `useGetMocDetailQuery` (authorization hidden as not-found)
- Backend: `PATCH /mocs/test-moc-456` returns 404 (not 403 to avoid leaking existence)
- Error page or toast: "MOC not found"

**Evidence:**
- `.http` response: 404 status
- Backend logs: Authorization check failed (userId mismatch)
- Playwright: Error state displayed

### ERR-2: Validation Error - Title Too Short
**Setup:**
- EditMocPage loaded

**Action:**
- Change title to "AB" (2 characters, min is 3)
- Attempt to submit

**Expected:**
- Client-side validation: Save button disabled
- Field-level error: "Title must be at least 3 characters"
- No PATCH request sent

**Evidence:**
- Playwright: Save button has `disabled` attribute
- Playwright: Error message visible below title input
- Network log: No PATCH request

### ERR-3: Validation Error - Title Too Long
**Setup:**
- EditMocPage loaded

**Action:**
- Change title to 501-character string
- Attempt to submit

**Expected:**
- Client-side validation prevents submission
- Error: "Title must be 500 characters or less"

**Evidence:**
- Playwright: Save button disabled
- Error message visible

### ERR-4: Validation Error - Too Many Tags
**Setup:**
- EditMocPage loaded

**Action:**
- Add tags until count exceeds 20
- Attempt to submit

**Expected:**
- Validation error: "Maximum 20 tags allowed"
- Save button disabled

**Evidence:**
- Playwright: Error message for tags field
- Save button disabled

### ERR-5: Backend Validation Error
**Setup:**
- Mock backend to return 400 validation error

**Action:**
- Submit form with valid client-side data

**Expected:**
- `PATCH /mocs/test-moc-123` returns 400 with error details
- Error toast displayed with retry button
- Form remains on edit page (does not navigate away)
- User can retry submission

**Evidence:**
- `.http` response: 400 status with validation error body
- Playwright: Toast visible with "Retry" button
- Playwright: Still on `/mocs/test-moc-123/edit` URL

### ERR-6: MOC Not Found (404)
**Setup:**
- Navigate to `/mocs/non-existent-id/edit`

**Action:**
- Page attempts to load MOC data

**Expected:**
- `GET /mocs/non-existent-id` returns 404
- Error page or state: "MOC not found"
- No form displayed

**Evidence:**
- `.http` response: 404 status
- Playwright: 404 error state rendered (not form)

### ERR-7: Network Error During Save
**Setup:**
- EditMocPage loaded
- Simulate network failure (disconnect or timeout)

**Action:**
- Change title
- Click Save

**Expected:**
- PATCH request fails with network error
- Error toast: "Failed to update MOC. Check your connection." with Retry button
- Form data preserved (no navigation)
- Retry button triggers new PATCH request

**Evidence:**
- Network log: Request timeout or failure
- Playwright: Error toast with Retry button
- Playwright: Form still populated with changes

### ERR-8: Server Error (500)
**Setup:**
- Mock backend to return 500 error

**Action:**
- Submit form

**Expected:**
- `PATCH /mocs/test-moc-123` returns 500
- Error toast: "Something went wrong. Please try again." with Retry button
- Form data preserved

**Evidence:**
- `.http` response: 500 status
- Playwright: Error toast visible
- Form not cleared

---

## Edge Cases

### EDGE-1: Empty Description (Optional Field)
**Setup:**
- EditMocPage loaded with description="My castle"

**Action:**
- Clear description field (delete all text)
- Submit form

**Expected:**
- PATCH request includes: `{ description: "" }` or `{ description: null }`
- Backend accepts empty description (optional field)
- Save succeeds

**Evidence:**
- `.http` request body: description is empty or null
- Response: 200 success
- Detail page shows no description

### EDGE-2: Boundary - Title Exactly 3 Characters
**Setup:**
- EditMocPage loaded

**Action:**
- Change title to "ABC" (exactly 3 chars)
- Submit

**Expected:**
- Validation passes (min is 3)
- Save succeeds

**Evidence:**
- Save button enabled
- PATCH request sent
- Success response

### EDGE-3: Boundary - Title Exactly 500 Characters
**Setup:**
- EditMocPage loaded

**Action:**
- Change title to 500-character string
- Submit

**Expected:**
- Validation passes (max is 500)
- Save succeeds

**Evidence:**
- Save button enabled
- PATCH succeeds

### EDGE-4: Boundary - Description Exactly 5000 Characters
**Setup:**
- EditMocPage loaded

**Action:**
- Change description to 5000-character string
- Submit

**Expected:**
- Validation passes
- Save succeeds

**Evidence:**
- No validation error
- PATCH succeeds

### EDGE-5: Boundary - Exactly 20 Tags
**Setup:**
- EditMocPage loaded

**Action:**
- Add tags until count is exactly 20
- Submit

**Expected:**
- Validation passes (max is 20)
- Save succeeds

**Evidence:**
- Save button enabled
- PATCH request includes all 20 tags
- Success response

### EDGE-6: No Changes Made
**Setup:**
- EditMocPage loaded with MOC data

**Action:**
- Do not change any fields
- Click Save

**Expected:**
- PATCH request sent (or optimized to skip if form detects no changes)
- If sent: Backend returns 200 with unchanged data
- Success toast and redirect
- Detail page shows same data

**Evidence:**
- Either: No PATCH request (optimized) OR PATCH request with same values
- Navigation to detail page
- No errors

### EDGE-7: Rapid Save Clicks (Double Submit)
**Setup:**
- EditMocPage loaded
- User changes title

**Action:**
- Click Save button twice rapidly

**Expected:**
- Only one PATCH request sent (button disabled during submission)
- Second click ignored
- Single success toast

**Evidence:**
- Network log: Only one PATCH request
- Playwright: Save button shows loading state (disabled)
- Single toast displayed

### EDGE-8: Form Recovery from localStorage
**Setup:**
- EditMocPage loaded
- User changes title to "Draft Title"
- PATCH request fails (network error)
- User closes tab/browser

**Action:**
- User returns to `/mocs/test-moc-123/edit` later

**Expected:**
- Form loads with MOC data from API
- localStorage draft detected
- Toast: "Unsaved changes found. Restore?"
- If user clicks Restore: Form fields updated with "Draft Title"
- If user clicks Discard: Form keeps API-loaded values

**Evidence:**
- localStorage key: `moc-edit-draft-test-moc-123` contains draft data
- Playwright: Recovery toast visible
- Form fields update based on user choice

### EDGE-9: Long Page Load (Slow Network)
**Setup:**
- Simulate slow network for `GET /mocs/:id` request

**Action:**
- Navigate to edit page

**Expected:**
- Loading skeleton displayed while fetching MOC data
- No form rendered until data loaded
- After data loads: Form populates correctly

**Evidence:**
- Playwright: Loading skeleton visible initially
- Playwright: Form appears after delay
- No errors during load

### EDGE-10: Special Characters in Title/Description
**Setup:**
- EditMocPage loaded

**Action:**
- Change title to: `My "Castle" & <Tower>`
- Change description to: `A castle with \n newlines and\ttabs`
- Submit

**Expected:**
- Special characters properly escaped/encoded in PATCH request
- Backend stores and returns data correctly
- Detail page displays special characters correctly

**Evidence:**
- `.http` request: JSON-encoded special characters
- Response: Special characters preserved
- Playwright: Detail page shows correct text with special chars

---

## Required Tooling Evidence

### Backend Tests

**Location**: `apps/api/lego-api/domains/mocs/__tests__/routes.test.ts`

**`.http` Requests Required:**
1. **PATCH /mocs/:id - Success**
   ```http
   PATCH http://localhost:3000/mocs/test-moc-123
   Authorization: Bearer <valid-token-user-A>
   Content-Type: application/json

   {
     "title": "Updated Title"
   }
   ```
   **Assertions:**
   - Status: 200
   - Response body: `moc.title === "Updated Title"`
   - Response body: `moc.updatedAt` > original updatedAt

2. **PATCH /mocs/:id - Authorization Failure**
   ```http
   PATCH http://localhost:3000/mocs/test-moc-123
   Authorization: Bearer <valid-token-user-B>
   Content-Type: application/json

   {
     "title": "Hacked Title"
   }
   ```
   **Assertions:**
   - Status: 404 (authorization hidden as not-found)

3. **PATCH /mocs/:id - Validation Error (Title Too Short)**
   ```http
   PATCH http://localhost:3000/mocs/test-moc-123
   Authorization: Bearer <valid-token-user-A>
   Content-Type: application/json

   {
     "title": "AB"
   }
   ```
   **Assertions:**
   - Status: 400
   - Response body contains validation error for title

4. **PATCH /mocs/:id - Validation Error (Too Many Tags)**
   ```http
   PATCH http://localhost:3000/mocs/test-moc-123
   Authorization: Bearer <valid-token-user-A>
   Content-Type: application/json

   {
     "tags": ["tag1", "tag2", ..., "tag21"]
   }
   ```
   **Assertions:**
   - Status: 400
   - Response body contains validation error for tags

5. **PATCH /mocs/:id - Not Found**
   ```http
   PATCH http://localhost:3000/mocs/non-existent-id
   Authorization: Bearer <valid-token-user-A>
   Content-Type: application/json

   {
     "title": "New Title"
   }
   ```
   **Assertions:**
   - Status: 404

6. **PATCH /mocs/:id - Partial Update (Only Tags)**
   ```http
   PATCH http://localhost:3000/mocs/test-moc-123
   Authorization: Bearer <valid-token-user-A>
   Content-Type: application/json

   {
     "tags": ["new-tag"]
   }
   ```
   **Assertions:**
   - Status: 200
   - Response: `moc.tags === ["new-tag"]`
   - Response: `moc.title` unchanged (other fields not affected)

### Frontend Tests (Vitest + React Testing Library)

**Location**: `apps/web/app-instructions-gallery/src/pages/__tests__/EditMocPage.test.tsx`

**Test Cases:**
1. **Renders loading skeleton while fetching MOC**
   - Mock `useGetMocDetailQuery` to return `{ isLoading: true }`
   - Assert: Loading skeleton rendered
   - Assert: Form not rendered

2. **Renders form pre-populated with MOC data**
   - Mock `useGetMocDetailQuery` to return MOC data
   - Assert: Title input has value "Castle MOC"
   - Assert: Description textarea has value "My castle"
   - Assert: Theme select has correct option selected
   - Assert: Tags multi-select has correct tags

3. **Save button disabled when form invalid**
   - Render EditMocPage
   - Change title to "AB" (too short)
   - Assert: Save button has `disabled` attribute

4. **Cancel button navigates to detail page**
   - Mock `useNavigate` from react-router
   - Click Cancel button
   - Assert: `navigate('/mocs/test-moc-123')` called

5. **Save button triggers mutation**
   - Mock `useUpdateMocMutation` to return successful mutation function
   - Change title to "New Title"
   - Click Save
   - Assert: Mutation called with `{ id: 'test-moc-123', input: { title: 'New Title' } }`

6. **Success shows toast and navigates**
   - Mock successful mutation
   - Submit form
   - Assert: Success toast displayed
   - Assert: Navigation to `/mocs/test-moc-123`

7. **Error shows toast with retry**
   - Mock mutation to return error
   - Submit form
   - Assert: Error toast visible with Retry button
   - Click Retry
   - Assert: Mutation called again

8. **Form recovery from localStorage**
   - Set localStorage draft: `{ title: "Draft Title" }`
   - Render EditMocPage
   - Assert: Recovery toast visible
   - Click Restore
   - Assert: Title input updated to "Draft Title"

### Frontend Integration Tests (Vitest + MSW)

**Location**: `apps/web/app-instructions-gallery/src/pages/__tests__/EditMocPage.integration.test.tsx`

**Test Cases:**
1. **Fetches MOC data on mount**
   - MSW handler: `GET /api/v2/mocs/test-moc-123` returns MOC data
   - Render EditMocPage
   - Assert: MSW handler called
   - Assert: Form populated with data from response

2. **PATCH request sent on save**
   - MSW handler: `PATCH /api/v2/mocs/test-moc-123` returns updated MOC
   - Render EditMocPage
   - Change title
   - Click Save
   - Assert: MSW handler called with correct body
   - Assert: Cache invalidated for `Moc` and `MocList` tags

3. **Handles 404 error**
   - MSW handler: `GET /api/v2/mocs/non-existent` returns 404
   - Render EditMocPage with mocId="non-existent"
   - Assert: 404 error state rendered

4. **Handles validation error from backend**
   - MSW handler: `PATCH /api/v2/mocs/test-moc-123` returns 400 validation error
   - Submit form
   - Assert: Error toast displayed
   - Assert: Form still on edit page (no navigation)

### E2E Tests (Playwright + Cucumber)

**Feature File**: `apps/web/playwright/features/instructions/inst-1108-edit.feature`

**Scenario 1: Edit Title and Save**
```gherkin
Feature: Edit MOC Metadata
  Scenario: Edit title and description
    Given user owns MOC "Castle MOC" with id "test-moc-123"
    And user is authenticated
    When user navigates to "/mocs/test-moc-123/edit"
    Then edit page loads with form pre-populated
    And title input shows "Castle MOC"
    When user changes title to "Medieval Castle"
    And user clicks Save button
    Then PATCH request sent to backend
    And success toast "MOC updated!" displayed
    And user redirected to "/mocs/test-moc-123"
    And detail page shows title "Medieval Castle"
```

**Scenario 2: Cancel Edit**
```gherkin
  Scenario: Cancel edit without saving
    Given user on edit page for MOC "test-moc-123"
    And title is "Castle MOC"
    When user changes title to "New Title"
    And user clicks Cancel button
    Then no PATCH request sent
    And user redirected to "/mocs/test-moc-123"
    And detail page shows original title "Castle MOC"
```

**Scenario 3: Validation Error Prevents Submission**
```gherkin
  Scenario: Validation prevents invalid submission
    Given user on edit page for MOC "test-moc-123"
    When user changes title to "AB"
    Then validation error "Title must be at least 3 characters" displayed
    And Save button is disabled
    When user attempts to submit form
    Then no PATCH request sent
```

**Scenario 4: Form Recovery**
```gherkin
  Scenario: Restore unsaved changes from localStorage
    Given user on edit page for MOC "test-moc-123"
    When user changes title to "Draft Title"
    And PATCH request fails with network error
    And user closes browser
    And user returns to "/mocs/test-moc-123/edit"
    Then recovery toast "Unsaved changes found. Restore?" displayed
    When user clicks Restore
    Then title input shows "Draft Title"
```

**Assertions Required:**
- URL navigation verified
- Form fields contain correct values
- Toast messages visible
- Network requests logged (PATCH with correct body)
- Button states (enabled/disabled)
- Error messages displayed

**Artifacts:**
- Playwright trace for each scenario
- Screenshots on failure
- Network request logs

---

## Risks to Call Out

### Risk 1: PATCH Endpoint Missing in Backend
**Severity**: HIGH (blocks implementation)

**Description**: The backend route `PATCH /mocs/:id` does not exist in `apps/api/lego-api/domains/mocs/routes.ts`. This must be implemented before frontend work can be fully tested.

**Mitigation**: Implement backend endpoint first (estimated 2-3 hours). Reuse patterns from `POST /mocs` route for validation and authorization.

### Risk 2: INST-1101 Dependency for E2E Testing
**Severity**: MEDIUM (blocks full E2E coverage)

**Description**: The edit button will be placed on the MOC detail page (INST-1101), which is not yet implemented. E2E test for "clicking edit button from detail page" cannot be completed until INST-1101 is done.

**Mitigation**:
- Test direct navigation to `/mocs/:id/edit` URL for E2E coverage
- Defer "edit button click" E2E test until INST-1101 completes
- Mark as known gap in test plan

### Risk 3: MocForm Component Stability
**Severity**: LOW (component is stable)

**Description**: EditMocPage depends on MocForm component. If MocForm has bugs or changes, it could affect EditMocPage.

**Mitigation**: MocForm is already implemented and tested in INST-1102 (In QA). Risk is low. Reuse as-is without modifications.

### Risk 4: Test Data Setup
**Severity**: MEDIUM (operational complexity)

**Description**: E2E tests require authenticated users with owned MOCs in the database. Test data setup may be complex.

**Mitigation**:
- Use INST-1102 (Create Basic MOC) flow to dynamically create test MOCs during E2E setup
- Alternatively: Seed test database with known MOC IDs for test users
- Document setup in E2E README

### Risk 5: Form Recovery localStorage Conflicts
**Severity**: LOW (edge case)

**Description**: If multiple MOCs are edited simultaneously (multiple tabs), localStorage drafts could conflict.

**Mitigation**: Use mocId in localStorage key (`moc-edit-draft-${mocId}`) to isolate drafts per MOC. Risk is low for MVP.

---

## Coverage Targets

| Layer | Target | Notes |
|-------|--------|-------|
| Backend Route | 90% | Standard for API routes - all branches, error cases |
| EditMocPage Component | 80% | UI component standard - rendering, validation, handlers |
| RTK Query Integration | 80% | Mutation flow, cache invalidation, error handling |
| E2E | 3 critical paths | Happy path, cancel path, validation path |

**Critical Paths for E2E:**
1. Edit and save successfully
2. Cancel without saving
3. Validation prevents invalid submission

---

## Success Criteria

This test plan is successful when:
1. ✅ All happy path tests pass (HP-1 to HP-6)
2. ✅ All error cases handled correctly (ERR-1 to ERR-8)
3. ✅ Edge cases covered (EDGE-1 to EDGE-10)
4. ✅ Backend route achieves 90% coverage
5. ✅ EditMocPage component achieves 80% coverage
6. ✅ At least 3 E2E scenarios pass with live API (per ADR-006)
7. ✅ No regression in existing MocForm behavior
8. ✅ Authorization correctly prevents unauthorized edits
9. ✅ Form recovery works after errors

---

## Test Execution Order

1. **Backend Route Tests** (implement and verify first)
   - Ensures PATCH /mocs/:id works correctly
   - Validates authorization, validation, error handling
   - Estimated time: 3-4 hours

2. **Frontend Unit Tests** (component in isolation)
   - Verifies EditMocPage rendering and behavior
   - Tests form validation, navigation, error handling
   - Estimated time: 2-3 hours

3. **Frontend Integration Tests** (with MSW)
   - Verifies RTK Query integration
   - Tests cache invalidation, error recovery
   - Estimated time: 2 hours

4. **E2E Tests** (full user journey)
   - Requires backend endpoint and frontend page complete
   - Tests real API, real database, real UI
   - Estimated time: 3-4 hours

**Total Testing Effort**: 10-13 hours
