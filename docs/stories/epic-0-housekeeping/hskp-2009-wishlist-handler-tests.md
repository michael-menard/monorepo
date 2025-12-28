# Story hskp-2009: Wishlist Handler Integration Tests

## Status

Approved

## Story

**As a** developer,
**I want** comprehensive integration tests for all wishlist API handlers,
**so that** I can confidently deploy changes without breaking functionality.

## Background

During the wish-2000 QA review (TEST-001), it was discovered that zero integration tests exist for the 8 wishlist API handlers. This violates the CLAUDE.md requirement for minimum 45% test coverage and creates deployment risk.

## Acceptance Criteria

1. Integration tests exist for all 8 wishlist handlers
2. Tests cover happy path, validation errors, and authorization
3. Tests use mocked database and external services
4. Test coverage meets 45% minimum threshold
5. All tests pass in CI

## Tasks / Subtasks

### Task 1: Test Infrastructure Setup (AC: 3)

- [ ] Create `apps/api/endpoints/wishlist/__tests__/` directory structure
- [ ] Set up test utilities for mocking database
- [ ] Set up test utilities for mocking auth (getUserIdFromEvent)
- [ ] Create test data factories for wishlist items

### Task 2: Create Handler Tests (AC: 1, 2)

#### create-item handler
- [ ] Test: creates item with valid data
- [ ] Test: returns 400 for invalid body
- [ ] Test: returns 401 for missing auth
- [ ] Test: assigns correct userId from JWT

#### list handler
- [ ] Test: returns paginated items for user
- [ ] Test: filters by store
- [ ] Test: filters by priority
- [ ] Test: sorts by specified field
- [ ] Test: returns empty array for user with no items

#### get-item handler
- [ ] Test: returns item by ID
- [ ] Test: returns 404 for non-existent item
- [ ] Test: returns 403 for item owned by other user

#### update-item handler
- [ ] Test: updates item with valid data
- [ ] Test: returns 400 for invalid body
- [ ] Test: returns 404 for non-existent item
- [ ] Test: returns 403 for item owned by other user
- [ ] Test: partial update works correctly

#### delete-item handler
- [ ] Test: deletes item by ID
- [ ] Test: returns 404 for non-existent item
- [ ] Test: returns 403 for item owned by other user
- [ ] Test: cleans up S3 image if exists

#### reorder handler
- [ ] Test: reorders multiple items successfully
- [ ] Test: validates all items belong to user
- [ ] Test: returns 400 for invalid sort orders
- [ ] Test: transaction rolls back on failure

#### search handler
- [ ] Test: returns matching items
- [ ] Test: respects pagination
- [ ] Test: returns empty for no matches

#### upload-image handler
- [ ] Test: uploads image successfully
- [ ] Test: validates file type
- [ ] Test: validates file size
- [ ] Test: updates item imageUrl

### Task 3: Error Handling Tests (AC: 2)

- [ ] Test: database errors return 500
- [ ] Test: validation errors include field details
- [ ] Test: consistent error response format

### Task 4: Coverage Verification (AC: 4, 5)

- [ ] Run coverage report
- [ ] Verify 45% threshold met
- [ ] Add to CI pipeline

## Test File Structure

```
apps/api/endpoints/wishlist/
  __tests__/
    setup.ts                    # Test utilities and mocks
    factories.ts                # Test data factories
    create-item.handler.test.ts
    list.handler.test.ts
    get-item.handler.test.ts
    update-item.handler.test.ts
    delete-item.handler.test.ts
    reorder.handler.test.ts
    search.handler.test.ts
    upload-image.handler.test.ts
```

## Dev Notes

### Mock Setup Example

```typescript
// __tests__/setup.ts
import { vi } from 'vitest'

export const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

export const mockAuth = {
  getUserIdFromEvent: vi.fn().mockReturnValue('test-user-id'),
}

export function createMockEvent(overrides = {}) {
  return {
    headers: { authorization: 'Bearer test-token' },
    pathParameters: {},
    queryStringParameters: {},
    body: null,
    ...overrides,
  }
}
```

### Test Data Factory Example

```typescript
// __tests__/factories.ts
export function createTestWishlistItem(overrides = {}) {
  return {
    id: 'test-item-id',
    userId: 'test-user-id',
    title: 'Test LEGO Set',
    store: 'LEGO',
    setNumber: '12345',
    price: '99.99',
    currency: 'USD',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
```

## Definition of Done

- [ ] All 8 handlers have test files
- [ ] Each handler has happy path + error tests
- [ ] Coverage >= 45%
- [ ] Tests run in CI
- [ ] Code reviewed

## References

- QA Gate: docs/qa/gates/wish-2000-database-schema-types.yml (TEST-001)
- Related: TEST-015 (error message assertions), TEST-020 (database operations)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Created from wish-2000 QA findings | Quinn |
