# Story hskp-2007: Fix Redis Dependency in Wishlist Handlers

## Status

Approved

## Story

**As a** developer,
**I want** the wishlist handlers to work without crashing when Redis is disabled,
**so that** the API endpoints function correctly in our current infrastructure.

## Background

During the wish-2000 QA review (SEC-001), it was discovered that all wishlist handlers import and call `getRedisClient()` which throws a runtime error: "Redis has been disabled. Please use PostgreSQL directly."

Redis infrastructure was removed to save costs, but the handlers still contain cache invalidation code that will crash at runtime.

## Acceptance Criteria

1. Wishlist endpoints do not crash when processing requests
2. Cache invalidation code is safely disabled or removed
3. All existing tests continue to pass
4. No regression in endpoint functionality

## Tasks / Subtasks

### Task 1: Audit Redis Usage (AC: 1, 2)

- [ ] Identify all Redis imports in wishlist handlers
- [ ] Document each cache invalidation call location
- [ ] Determine if caching is needed for MVP

### Task 2: Remove or Stub Redis Calls (AC: 1, 2, 3)

- [ ] Option A: Remove `invalidateWishlistCaches()` calls entirely
- [ ] Option B: Replace with no-op stub that logs instead of throwing
- [ ] Update imports to remove unused Redis dependencies
- [ ] Verify no compile errors

### Task 3: Test and Verify (AC: 3, 4)

- [ ] Run existing tests
- [ ] Manually test each endpoint (create, list, update, delete, reorder, search)
- [ ] Verify no runtime errors in logs

## Affected Files

| File | Action |
|------|--------|
| apps/api/endpoints/wishlist/create-item/handler.ts | Remove Redis calls |
| apps/api/endpoints/wishlist/update-item/handler.ts | Remove Redis calls |
| apps/api/endpoints/wishlist/delete-item/handler.ts | Remove Redis calls |
| apps/api/endpoints/wishlist/reorder/handler.ts | Remove Redis calls |
| apps/api/endpoints/wishlist/upload-image/handler.ts | Remove Redis calls |
| apps/api/endpoints/wishlist/list/handler.ts | Remove Redis cache read |
| apps/api/endpoints/wishlist/get-item/handler.ts | Remove Redis cache read |
| apps/api/endpoints/wishlist/search/handler.ts | Remove Redis cache read |

## Dev Notes

### Option A: Complete Removal (Recommended for MVP)

```typescript
// Remove these lines from each handler:
import { getRedisClient } from '@/core/cache/redis'

// Remove invalidateWishlistCaches() function entirely
// Remove all calls to invalidateWishlistCaches(userId)
// Remove cache read/write blocks in list/get/search handlers
```

### Option B: No-op Stub

```typescript
async function invalidateWishlistCaches(userId: string): Promise<void> {
  // Cache invalidation disabled - Redis infrastructure removed
  // TODO: Re-implement when Redis is re-enabled (hskp-XXXX)
  logger.debug('Cache invalidation skipped - Redis disabled', { userId })
}
```

## Definition of Done

- [ ] All wishlist endpoints respond without errors
- [ ] No Redis-related runtime exceptions
- [ ] Tests pass
- [ ] Code reviewed

## References

- QA Gate: docs/qa/gates/wish-2000-database-schema-types.yml (SEC-001)
- Redis client: apps/api/core/cache/redis.ts

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Created from wish-2000 QA findings | Quinn |
