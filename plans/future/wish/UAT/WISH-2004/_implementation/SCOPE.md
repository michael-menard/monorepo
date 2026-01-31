# Scope - WISH-2004

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | HTTP test files for DELETE /api/wishlist/:id and POST /api/wishlist/:id/purchased endpoints (verification artifacts, endpoints already exist) |
| frontend | true | Playwright E2E tests for delete-flow, purchase-flow, modal-accessibility (verification artifacts, components already exist) |
| infra | false | No infrastructure changes required |

## Scope Summary

WISH-2004 is a verification story for existing implementation. The DeleteConfirmModal and GotItModal components already exist with 40+ unit tests, and the DELETE/POST endpoints are implemented. This story creates missing test artifacts: HTTP test files for manual API testing and Playwright E2E tests for comprehensive AC verification.

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| DeleteConfirmModal | Implemented | `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/` |
| GotItModal | Implemented | `apps/web/app-wishlist-gallery/src/components/GotItModal/` |
| DELETE /api/wishlist/:id | Implemented | `apps/api/lego-api/domains/wishlist/routes.ts` |
| POST /api/wishlist/:id/purchased | Implemented | `apps/api/lego-api/domains/wishlist/routes.ts` |
| RTK Query mutations | Implemented | `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` |
| Unit tests (DeleteConfirmModal) | 17 tests | `components/DeleteConfirmModal/__tests__/` |
| Unit tests (GotItModal) | 23 tests | `components/GotItModal/__tests__/` |

## Missing Artifacts (AC31-32)

| Artifact | AC | Status |
|----------|-----|--------|
| HTTP test file for DELETE endpoint | AC31 | EXISTS at `__http__/wishlist.http` (has delete tests) |
| HTTP test file for POST /purchased | AC31 | EXISTS at `__http__/wishlist-purchase.http` |
| Playwright delete-flow.spec.ts | AC32 | **TO CREATE** |
| Playwright purchase-flow.spec.ts | AC32 | **TO CREATE** |
| Playwright modal-accessibility.spec.ts | AC32 | **TO CREATE** |
