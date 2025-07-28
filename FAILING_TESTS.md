# Failing Tests Report

Generated on: $(date)

## Summary
- **Total Test Files Failed**: 4
- **Total Tests Failed**: 41
- **Total Tests Passed**: 104
- **Total Tests**: 177

---

## @repo/auth Package

### Test File: `src/__tests__/auth.test.tsx`

#### 1. Login Component Test
- **Test**: `renders login form correctly`
- **Error**: `Object.getElementError` - Element with role 'status' not found
- **Line**: 123
- **Issue**: Test is looking for `screen.getByRole('status')` but no such element exists in the rendered component

#### 2. Signup Component Test
- **Test**: `renders signup form correctly`
- **Error**: `TestingLibraryElementError` - Found multiple elements with text "Create Account"
- **Line**: 151
- **Issue**: Both the heading and button contain "Create Account" text, causing ambiguity. Test should use more specific selectors.

#### 3. Auth Store Test
- **Test**: `has correct initial state`
- **Error**: `AssertionError` - State mismatch
- **Line**: 165
- **Expected State**:
  ```json
  {
    "error": null,
    "isAuthenticated": false,
    "isLoading": false,
    "tokens": null,
    "user": null
  }
  ```
- **Actual State**:
  ```json
  {
    "isCheckingAuth": true,
    "lastActivity": null,
    "message": null,
    "sessionTimeout": 1800000
  }
  ```

### Test File: `src/components/LoginForm/__tests__/LoginForm.test.tsx`

#### 4. Form Submission Test
- **Test**: `should call login function with valid data`
- **Error**: `AssertionError` - Expected spy to be called at least once
- **Line**: 146
- **Issue**: `mockClearError` function is not being called as expected during form submission

### Test File: `src/components/SignupForm/__tests__/SignupForm.test.tsx`

#### 5. Form Submission Test
- **Test**: `should call signup function with valid data`
- **Error**: `AssertionError` - Expected spy to be called at least once
- **Line**: 233
- **Issue**: `mockClearError` function is not being called as expected during form submission

---

## @repo/gallery Package

### Test File: `src/__tests__/Gallery.test.tsx`

#### 6. Gallery Rendering Test
- **Test**: `renders all images`
- **Error**: `could not find react-redux context value; please ensure the component is wrapped in a <Provider>`
- **Issue**: Component needs Redux Provider wrapper in test

#### 7. Gallery Data Test
- **Test**: `renders images with correct data`
- **Error**: `could not find react-redux context value; please ensure the component is wrapped in a <Provider>`
- **Issue**: Component needs Redux Provider wrapper in test

#### 8. Gallery Custom Class Test
- **Test**: `renders with custom className`
- **Error**: `could not find react-redux context value; please ensure the component is wrapped in a <Provider>`
- **Issue**: Component needs Redux Provider wrapper in test

### Test File: `src/components/CreateAlbumDialog/__tests__/CreateAlbumDialog.test.tsx`

#### 9-14. CreateAlbumDialog Tests
- **Status**: 6 out of 20 tests failing
- **Issue**: Multiple test failures in CreateAlbumDialog component tests
- **Details**: Specific test names not provided in output

### Test File: `src/components/InfiniteGallery/__tests__/InfiniteGallery.test.tsx`

#### 15-29. InfiniteGallery Tests
- **Status**: Multiple test failures
- **Issue**: Tests failing in InfiniteGallery component
- **Details**: Specific test names not provided in output

### Test File: `src/components/InspirationGallery/__tests__/InspirationGallery.test.tsx`

#### 30-44. InspirationGallery Tests
- **Status**: 0 out of 15 tests passing (all failing)
- **Issue**: All InspirationGallery tests are failing
- **Details**: Specific test names not provided in output

### Test File: `src/hooks/__tests__/useInfiniteGallery.test.ts`

#### 45-59. useInfiniteGallery Hook Tests
- **Status**: Multiple test failures
- **Issue**: Tests failing in useInfiniteGallery hook
- **Details**: Specific test names not provided in output

---

## @repo/api-auth-service Package

### Test File: `__tests__/auth.test.ts`

#### 60-77. Auth Service Tests
- **Status**: Multiple test failures
- **Issue**: Backend auth service tests failing
- **Details**: Specific test names not provided in output

---

## Root Cause Analysis

### Primary Issues:

1. **Missing Redux Provider Context**
   - Many gallery tests fail because components aren't wrapped in Redux Provider
   - Need to add proper test setup with Redux store

2. **Test Selector Problems**
   - Ambiguous selectors (multiple elements with same text)
   - Looking for non-existent elements (role='status')
   - Need more specific and reliable test selectors

3. **Mock Function Expectations**
   - Mock functions not being called as expected
   - Form submission tests failing due to mock setup issues

4. **State Management Issues**
   - Auth store initial state doesn't match test expectations
   - Store structure has changed but tests haven't been updated

5. **Backend Service Test Failures**
   - Multiple auth service tests failing
   - Need investigation into backend test setup and mocking

### Recommended Fixes:

1. **Add Redux Provider to Gallery Tests**
   ```typescript
   const renderWithProviders = (component: React.ReactElement) => {
     return render(
       <Provider store={store}>
         {component}
       </Provider>
     );
   };
   ```

2. **Fix Test Selectors**
   - Use more specific selectors (data-testid, aria-label)
   - Avoid ambiguous text-based selectors
   - Add missing elements or update expectations

3. **Update Mock Setup**
   - Ensure mock functions are properly configured
   - Check form submission logic and mock expectations

4. **Update Auth Store Tests**
   - Align test expectations with actual store structure
   - Update initial state assertions

5. **Investigate Backend Tests**
   - Check test setup and mocking configuration
   - Ensure proper database/test environment setup

---

## Next Steps

1. Fix Redux Provider issues in gallery tests
2. Update test selectors to be more specific
3. Fix mock function expectations in auth tests
4. Update auth store test expectations
5. Investigate and fix backend service tests
6. Run tests again to verify fixes

---

*This report was generated automatically from the test run output.* 