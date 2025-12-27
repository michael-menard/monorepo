# Story 3.1.60: Create MOC Flow Validation & Integration

## Status

Approved

## Story

**As a** registered user,
**I want** to create a new MOC instruction with title, description, instruction files, parts lists, and photos,
**so that** I can share my MOC building instructions with others.

## Epic Context

This is a **validation story** for Epic 3.1: Upload MOC Instructions. Stories 3.1.5-3.1.20 implemented the create flow in pieces, but integration may have drifted during the edit flow implementation (3.1.33-3.1.46). This story validates and fixes the end-to-end create flow.

## Background

During investigation, the following concerns were identified:

1. **Two upload flows exist**: Original (`initialize-with-files` + `finalize-with-files`) and newer multipart session flow (`moc-uploads/sessions/*`)
2. **Endpoint path mismatch**: `finalizeClient.ts` calls `/api/mocs/uploads/finalize` but serverless.yml shows `/api/mocs/uploads/sessions/{sessionId}/finalize`
3. **Mixed implementations**: Frontend may reference old endpoints that were superseded
4. **No deployment verification**: API endpoints exist in code but may not be deployed/functional

## Acceptance Criteria

1. Single canonical upload flow is documented and all code aligns to it
2. Frontend API client paths match serverless.yml endpoint definitions
3. `InstructionsNewPage.tsx` correctly integrates with the canonical API flow
4. Unused/deprecated upload flow code is removed or clearly marked
5. Integration tests verify the create flow with mocked API responses
6. Rate limit (429) and slug conflict (409) handling code is correct

## Tasks / Subtasks

- [ ] **Task 1: Decide Canonical Upload Flow** (AC: 1)
  - [ ] Review both upload flows in codebase (original vs multipart session)
  - [ ] Document decision: which flow is canonical for create MOC
  - [ ] Update Dev Notes in this story with decision rationale

- [ ] **Task 2: Audit & Fix API Endpoints** (AC: 1, 2)
  - [ ] Verify serverless.yml endpoint paths for canonical flow
  - [ ] Ensure handler code matches expected request/response contracts
  - [ ] Mark deprecated endpoints with TODO comments if not removing

- [ ] **Task 3: Audit & Fix Frontend API Clients** (AC: 2, 3)
  - [ ] Fix `finalizeClient.ts` endpoint path to match serverless.yml
  - [ ] Review `useUploadManager.ts` API calls align with canonical flow
  - [ ] Review `InstructionsNewPage.tsx` integration with API clients
  - [ ] Fix any endpoint path mismatches

- [ ] **Task 4: Cleanup Deprecated Code** (AC: 4)
  - [ ] Identify unused upload flow code (if keeping one flow)
  - [ ] Remove or mark as deprecated with clear comments
  - [ ] Update any imports/exports affected

- [ ] **Task 5: Review Existing Tests & Identify Gaps** (AC: 5)
  - [ ] Audit existing tests in `apps/web/main-app/src/routes/__tests__/`
  - [ ] Audit existing tests in `apps/web/main-app/src/services/api/__tests__/`
  - [ ] Audit existing tests in `apps/web/main-app/src/hooks/__tests__/`
  - [ ] Audit existing tests in `apps/web/main-app/src/components/Uploader/__tests__/`
  - [ ] Document test coverage gaps for create flow
  - [ ] Identify broken tests due to endpoint mismatches

- [ ] **Task 6: Fill Test Gaps** (AC: 5, 6)
  - [ ] Fix any broken tests from endpoint changes
  - [ ] Add missing tests identified in Task 5
  - [ ] Ensure coverage for: form validation, file selection, finalize flow
  - [ ] Ensure coverage for: 409 conflict handling, 429 rate limit handling
  - [ ] Verify all create flow tests pass

## Dev Notes

### Relevant Source Tree

```
apps/api/
├── endpoints/
│   ├── moc-instructions/
│   │   ├── initialize-with-files/handler.ts  # POST /api/mocs - Creates MOC + presigned URLs
│   │   ├── finalize-with-files/handler.ts    # POST /api/mocs/{id}/finalize
│   │   ├── upload-file/handler.ts            # POST /api/mocs/{id}/files
│   │   └── list/handler.ts                   # GET /api/mocs
│   └── moc-uploads/
│       └── sessions/                         # Newer multipart upload session flow
│           ├── create/handler.ts             # POST /api/mocs/uploads/sessions
│           ├── register-file/handler.ts
│           ├── upload-part/handler.ts
│           ├── complete-file/handler.ts
│           └── finalize/handler.ts           # POST /api/mocs/uploads/sessions/{sessionId}/finalize

apps/web/main-app/src/
├── routes/
│   ├── pages/
│   │   └── InstructionsNewPage.tsx           # Create MOC page (~700 lines)
│   └── index.ts                              # Route: /instructions/new
├── hooks/
│   ├── useUploadManager.ts                   # Upload state management
│   └── useUploaderSession.ts                 # Session persistence
├── services/api/
│   ├── finalizeClient.ts                     # Finalize API client (⚠️ endpoint mismatch?)
│   └── uploadClient.ts                       # Upload to presigned URL
└── components/Uploader/
    ├── SessionProvider/                      # Session state context
    ├── UploaderList/                         # File list display
    ├── UploaderFileItem/                     # Individual file item
    ├── ConflictModal/                        # 409 handling
    └── RateLimitBanner/                      # 429 handling
```

### API Flow Decision Required

Two upload flows exist in the codebase:

**Flow A: Original (initialize-with-files)**
1. `POST /api/mocs` - Create MOC + get presigned URLs
2. Client uploads files to S3 using presigned URLs
3. `POST /api/mocs/{id}/finalize` - Finalize MOC

**Flow B: Multipart Session (moc-uploads/sessions)**
1. `POST /api/mocs/uploads/sessions` - Create upload session
2. `POST .../sessions/{sessionId}/files` - Register file
3. `PUT .../files/{fileId}/parts/{partNumber}` - Upload parts
4. `POST .../files/{fileId}/complete` - Complete file
5. `POST .../sessions/{sessionId}/finalize` - Finalize session

**Decision needed**: Which flow is canonical? The frontend `finalizeClient.ts` calls `/api/mocs/uploads/finalize` which doesn't match either flow exactly.

### Key Schemas

From `apps/api/endpoints/moc-instructions/initialize-with-files/handler.ts`:

```typescript
const FileMetadataSchema = z.object({
  filename: z.string().min(1),
  fileType: z.enum(['instruction', 'parts-list', 'gallery-image', 'thumbnail']),
  mimeType: z.string().min(1),
  size: z.number().positive(),
})

const InitializeMocWithFilesSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['moc', 'set']),
  tags: z.array(z.string()).optional(),
  // ... many optional fields (author, theme, dimensions, etc.)
  files: z.array(FileMetadataSchema).min(1),
})
```

### Testing Requirements

**Test Location:** `apps/web/main-app/src/routes/__tests__/`

**Test Frameworks:**
- Vitest for unit/integration tests
- React Testing Library for component tests
- MSW for API mocking

**Coverage:** Maintain >= 45% global coverage

**Test Types Needed:**
- Unit: API client functions (finalizeClient, uploadClient)
- Integration: InstructionsNewPage form flow with mocked API

**Note:** E2E testing deferred until API is deployed.

## Testing

### Test Location
- `apps/web/main-app/src/routes/__tests__/create-moc-flow.integration.test.tsx`
- `apps/web/main-app/src/services/api/__tests__/finalizeClient.test.ts`

### Test Requirements
- Mock API responses for initialize, upload, finalize using MSW
- Test form validation states
- Test error handling (409, 429, network errors)
- Test success flow with mocked responses

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-26 | 0.1 | Initial draft - validation story for create flow | SM Agent (Bob) |
| 2024-12-26 | 0.2 | Removed E2E testing (nothing deployed), focused on code audit + integration tests | SM Agent (Bob) |
| 2024-12-26 | 0.3 | Added Task 5 to review existing tests and identify gaps before writing new ones | SM Agent (Bob) |
