# Worker Instructions for BUGF-032

## Context
This is a frontend-only story that wires the presigned URL API into upload pages.
Backend API is already deployed (BUGF-031 dependency).

## Workers

### Worker 1: Packages (api-client)
**Agent:** dev-implement-backend-coder
**Scope:** Steps 1-3, 8, 13
- Create uploads-api.ts RTK Query slice
- Create upload schemas
- Verify endpoint configuration
- Write unit tests
- Update exports

**Output:** PACKAGES-LOG.md

### Worker 2: Frontend (upload pages)
**Agent:** dev-implement-frontend-coder  
**Scope:** Steps 4-7, 9-10
- Integrate API in upload-page.tsx
- Integrate API in InstructionsNewPage.tsx
- Implement session refresh handler
- Add loading states and error banners
- Write integration tests

**Output:** FRONTEND-LOG.md

### Worker 3: E2E Tests
**Agent:** dev-implement-playwright
**Scope:** Steps 11-12
- Create E2E test suite for upload flow
- Create E2E test for session refresh

**Output:** E2E-LOG.md (or VERIFICATION.md)

## Execution Order
1. Packages (Worker 1) - FIRST
2. Frontend (Worker 2) - After packages complete
3. E2E (Worker 3) - After frontend complete

## Key Patterns
- RTK Query: Follow wishlist-gallery-api.ts pattern
- Presigned URL schemas: Follow inspiration.ts pattern
- Upload manager: Use existing interface, no modifications
- Error handling: 401, 400, 413, 500 with user-friendly messages
