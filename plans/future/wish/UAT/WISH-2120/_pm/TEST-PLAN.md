# Test Plan: WISH-2120 - Test Utility Helpers

## Scope Summary

- **Endpoints touched:** None (test infrastructure only)
- **UI touched:** No
- **Data/storage touched:** No (test utilities only)
- **Test infrastructure touched:** Yes
  - `apps/web/app-wishlist-gallery/src/test/utils/` - New test utilities directory
  - `apps/web/app-wishlist-gallery/src/hooks/__tests__/` - Refactor existing tests
  - `apps/web/app-wishlist-gallery/src/components/**/__tests__/` - Refactor component tests

---

## Happy Path Tests

### Test 1: createMockFile with defaults

**Setup:** Import `createMockFile` from test utilities

**Action:**
```typescript
const file = createMockFile()
```

**Expected outcome:**
- Returns a valid `File` object
- Default name: `'test-image.jpg'`
- Default type: `'image/jpeg'`
- Default size: reasonable (e.g., 1KB)
- File is readable via FileReader

**Evidence:**
- `file instanceof File` is `true`
- `file.name === 'test-image.jpg'`
- `file.type === 'image/jpeg'`
- `file.size > 0`

### Test 2: createMockFile with custom properties

**Setup:** Import `createMockFile` from test utilities

**Action:**
```typescript
const file = createMockFile({
  name: 'custom-photo.png',
  type: 'image/png',
  size: 5 * 1024 * 1024, // 5MB
  content: 'custom content'
})
```

**Expected outcome:**
- Returns a `File` object with specified properties
- Content is accessible via FileReader

**Evidence:**
- `file.name === 'custom-photo.png'`
- `file.type === 'image/png'`
- `file.size === 5 * 1024 * 1024`

### Test 3: mockS3Upload success scenario

**Setup:** Import `mockS3Upload` from test utilities

**Action:**
```typescript
const cleanup = mockS3Upload({ scenario: 'success' })
// ... perform upload test ...
cleanup()
```

**Expected outcome:**
- Presign API returns 200 with valid presigned URL
- S3 PUT returns 200
- Upload completes successfully

**Evidence:**
- Mock handlers intercepted API calls
- Upload hook state transitions to `'complete'`
- `cleanup()` removes handlers without errors

### Test 4: mockS3Upload with progress simulation

**Setup:** Import `mockS3Upload` from test utilities

**Action:**
```typescript
const cleanup = mockS3Upload({
  scenario: 'success',
  progressSteps: [25, 50, 75, 100]
})
// ... perform upload test ...
```

**Expected outcome:**
- Progress callbacks fire at 25%, 50%, 75%, 100%
- Each step fires in sequence

**Evidence:**
- onProgress mock called 4 times
- Progress values match specified steps

---

## Error Cases

### Test 5: mockS3Upload error scenario (presign failure)

**Setup:** Import `mockS3Upload` from test utilities

**Action:**
```typescript
const cleanup = mockS3Upload({
  scenario: 'presign-error',
  statusCode: 403
})
// ... perform upload test ...
```

**Expected outcome:**
- Presign API returns 403
- Upload fails with appropriate error
- Hook state transitions to `'error'`

**Evidence:**
- `result.current.state === 'error'`
- `result.current.error` contains meaningful message

### Test 6: mockS3Upload error scenario (S3 upload failure)

**Setup:** Import `mockS3Upload` from test utilities

**Action:**
```typescript
const cleanup = mockS3Upload({
  scenario: 's3-error',
  statusCode: 500
})
// ... perform upload test ...
```

**Expected outcome:**
- Presign API succeeds
- S3 PUT returns 500
- Upload fails with appropriate error

**Evidence:**
- `result.current.state === 'error'`
- Error indicates S3 upload failure

### Test 7: mockS3Upload timeout scenario

**Setup:** Import `mockS3Upload` from test utilities

**Action:**
```typescript
const cleanup = mockS3Upload({
  scenario: 'timeout',
  delay: 30000 // 30 seconds
})
// ... perform upload test with AbortController timeout ...
```

**Expected outcome:**
- Request does not complete within expected time
- AbortController cancels the request
- Hook handles cancellation gracefully

**Evidence:**
- `result.current.state === 'idle'` (cancelled state)
- No hanging promises

---

## Edge Cases

### Test 8: createMockFile with 0-byte file

**Setup:** Import `createMockFile` from test utilities

**Action:**
```typescript
const file = createMockFile({ size: 0 })
```

**Expected outcome:**
- Returns a valid `File` object with size 0
- Useful for testing empty file validation

**Evidence:**
- `file.size === 0`
- `file instanceof File` is `true`

### Test 9: createMockFile with max file size

**Setup:** Import `createMockFile` from test utilities

**Action:**
```typescript
const file = createMockFile({ size: 10 * 1024 * 1024 }) // 10MB
```

**Expected outcome:**
- Returns a `File` object at the size limit
- Performance is acceptable (< 100ms creation time)

**Evidence:**
- `file.size === 10 * 1024 * 1024`
- No memory errors or excessive delays

### Test 10: createMockFile with special characters in filename

**Setup:** Import `createMockFile` from test utilities

**Action:**
```typescript
const file = createMockFile({ name: 'photo (1) [final].jpg' })
```

**Expected outcome:**
- Filename with special characters is preserved
- Useful for testing filename sanitization

**Evidence:**
- `file.name === 'photo (1) [final].jpg'`

### Test 11: mockS3Upload with custom delay

**Setup:** Import `mockS3Upload` from test utilities

**Action:**
```typescript
const start = Date.now()
const cleanup = mockS3Upload({
  scenario: 'success',
  delay: 200
})
await performUpload()
const elapsed = Date.now() - start
```

**Expected outcome:**
- Upload takes at least 200ms
- Useful for testing loading states

**Evidence:**
- `elapsed >= 200`

### Test 12: mockS3Upload cleanup prevents handler leaks

**Setup:** Set up multiple test scenarios

**Action:**
```typescript
const cleanup1 = mockS3Upload({ scenario: 'success' })
cleanup1()
const cleanup2 = mockS3Upload({ scenario: 'error' })
// ... test uses error scenario, not success ...
cleanup2()
```

**Expected outcome:**
- Each cleanup removes only its handlers
- No interference between tests

**Evidence:**
- Second test sees error scenario, not success
- No MSW warnings about handler conflicts

---

## Required Tooling Evidence

### Backend

- **N/A** - This story is frontend test infrastructure only

### Frontend (Test Infrastructure)

**Vitest runs required:**
```bash
pnpm --filter app-wishlist-gallery test src/test/utils
```

**Assertions:**
- All utility tests pass
- Type checking passes (`pnpm check-types`)
- Utility exports are tree-shakable

**Required artifacts:**
- Test coverage report showing 100% coverage of new utilities
- TypeScript compilation success

### Existing Test Refactoring

**Pre-refactoring baseline:**
```bash
pnpm --filter app-wishlist-gallery test src/hooks/__tests__/useS3Upload.test.ts
```

**Post-refactoring:**
- Same tests pass after refactoring to use utilities
- Lines of code reduced (measurable diff)
- No functionality regression

---

## Risks to Call Out

1. **Test Performance:** Large file creation (10MB) could slow tests if not optimized with lazy content generation.

2. **MSW Handler Cleanup:** If cleanup is not called in every test, handlers could leak between tests causing flaky behavior.

3. **TypeScript Types:** Utility options objects need careful typing to ensure autocomplete works correctly.

4. **Tree-shaking:** Utilities must be individually importable to avoid bundling unused code in production (even though these are test-only).

---

## Test Matrix Summary

| Utility | Scenario | Tests |
|---------|----------|-------|
| createMockFile | defaults | 1 |
| createMockFile | custom props | 1 |
| createMockFile | edge cases | 3 |
| mockS3Upload | success | 2 |
| mockS3Upload | errors | 3 |
| mockS3Upload | timeout | 1 |
| mockS3Upload | cleanup | 1 |
| **Total** | | **12** |
