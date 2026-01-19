# Story HSKP-2000: API Service Extraction

## Status

Draft

## Story

**As a** developer,
**I want** business logic extracted from Lambda handlers into portable service packages,
**so that** the same logic can be used by Lambda, Express, and future adapters without duplication.

## Epic Context

This is the foundation story for the API Portability initiative. It enables local development (HSKP-2001) and future platform flexibility by implementing Hexagonal Architecture (Ports & Adapters).

## Priority

P0 - Foundation for local development workflow

## Estimated Effort

3-4 days

## Dependencies

None - this is the first story in the sequence.

## Acceptance Criteria

1. `@repo/api-services` package created with domain-organized business logic
2. `@repo/api-handlers` package created with unified Request/Response handlers using web standards
3. `@repo/lambda-adapter` package created with Lambda-to-web-standard conversion utilities
4. All 45 existing Lambda handlers updated to use new packages
5. All existing Lambda tests pass without modification
6. No production regression - deployed Lambda functions work identically
7. Business logic is testable independently of Lambda event format

## Tasks / Subtasks

- [ ] **Task 1: Create @repo/api-services Package** (AC: 1)
  - [ ] Create `packages/backend/api-services/` folder structure
  - [ ] Create package.json with workspace dependencies
  - [ ] Create tsconfig.json extending workspace base
  - [ ] Create barrel-free module structure by domain

- [ ] **Task 2: Extract MOC Services** (AC: 1)
  - [ ] Move `moc-service.ts` from `apps/api/endpoints/moc-instructions/_shared/`
  - [ ] Move `moc-file-service.ts`
  - [ ] Move `opensearch-moc.ts` to `moc-search-service.ts`
  - [ ] Move `parts-list-parser.ts` to parts-list domain
  - [ ] Move `parts-validators/*` to parts-list domain
  - [ ] Update all imports to use new paths

- [ ] **Task 3: Extract Gallery Services** (AC: 1)
  - [ ] Create `packages/backend/api-services/src/gallery/`
  - [ ] Extract gallery-related business logic
  - [ ] Extract gallery schemas

- [ ] **Task 4: Extract Wishlist Services** (AC: 1)
  - [ ] Create `packages/backend/api-services/src/wishlist/`
  - [ ] Extract wishlist-related business logic
  - [ ] Extract wishlist schemas

- [ ] **Task 5: Extract Parts List Services** (AC: 1)
  - [ ] Create `packages/backend/api-services/src/parts-list/`
  - [ ] Move parts-list-service.ts
  - [ ] Move parser and validators

- [ ] **Task 6: Create Shared Utilities** (AC: 1)
  - [ ] Create `packages/backend/api-services/src/shared/`
  - [ ] Create `errors.ts` with domain error classes
  - [ ] Create `pagination.ts` with pagination helpers
  - [ ] Create `response.ts` with response formatters

- [ ] **Task 7: Create @repo/api-handlers Package** (AC: 2)
  - [ ] Create `packages/backend/api-handlers/` folder structure
  - [ ] Create package.json with @repo/api-services dependency
  - [ ] Create tsconfig.json extending workspace base
  - [ ] Create `lib/request.ts` for Request parsing utilities
  - [ ] Create `lib/response.ts` for Response creation utilities
  - [ ] Create `lib/errors.ts` for error-to-Response conversion

- [ ] **Task 8: Create Unified Handlers** (AC: 2)
  - [ ] Create MOC handlers using web-standard Request/Response
  - [ ] Create Gallery handlers
  - [ ] Create Wishlist handlers
  - [ ] Create Parts List handlers
  - [ ] Each handler follows pattern: `(Request, Context) => Promise<Response>`

- [ ] **Task 9: Create @repo/lambda-adapter Package** (AC: 3)
  - [ ] Create `packages/backend/lambda-adapter/` folder structure
  - [ ] Create package.json
  - [ ] Create `request.ts` with `toLambdaRequest(APIGatewayEvent): Request`
  - [ ] Create `response.ts` with `fromLambdaResponse(Response): APIGatewayProxyResult`
  - [ ] Create `auth.ts` with `getUserId(event)` and `getUser(event)` helpers

- [ ] **Task 10: Update Lambda Handlers** (AC: 4, 5, 6)
  - [ ] Update all 16 MOC instruction handlers
  - [ ] Update all 13 Gallery handlers
  - [ ] Update all 9 Wishlist handlers
  - [ ] Update all 8 Parts List handlers
  - [ ] Verify all handlers use adapter pattern

- [ ] **Task 11: Verify Tests and Production** (AC: 5, 6, 7)
  - [ ] Run full test suite - all tests must pass
  - [ ] Run lint and type-check
  - [ ] Deploy to staging environment
  - [ ] Verify all endpoints work in staging
  - [ ] Add unit tests for api-services (isolated from Lambda)

## Dev Notes

### Package Structure

```
packages/backend/
├── api-services/              # Business logic (domain layer)
│   ├── src/
│   │   ├── moc/
│   │   │   ├── moc-service.ts
│   │   │   ├── moc-file-service.ts
│   │   │   ├── moc-search-service.ts
│   │   │   └── index.ts
│   │   ├── gallery/
│   │   ├── wishlist/
│   │   ├── parts-list/
│   │   └── shared/
│   │       ├── errors.ts
│   │       └── pagination.ts
│   └── package.json
│
├── api-handlers/              # Unified handlers (application layer)
│   ├── src/
│   │   ├── moc/
│   │   │   ├── list.handler.ts
│   │   │   ├── get.handler.ts
│   │   │   ├── create.handler.ts
│   │   │   └── index.ts
│   │   ├── gallery/
│   │   ├── wishlist/
│   │   └── lib/
│   │       ├── request.ts
│   │       └── response.ts
│   └── package.json
│
└── lambda-adapter/            # Lambda-specific conversion
    ├── src/
    │   ├── request.ts
    │   ├── response.ts
    │   ├── auth.ts
    │   └── index.ts
    └── package.json
```

### Handler Pattern

```typescript
// packages/backend/api-handlers/src/moc/list.handler.ts
import { listMocs } from '@repo/api-services/moc'
import { MocListQuerySchema } from '@repo/api-types/moc'

export interface HandlerContext {
  userId: string
}

export async function handleListMocs(
  request: Request,
  ctx: HandlerContext
): Promise<Response> {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)

    // Validate input
    const query = MocListQuerySchema.parse(params)

    // Call business logic
    const result = await listMocs(ctx.userId, query)

    // Return standard Response
    return Response.json(result)
  } catch (error) {
    return handleError(error)
  }
}
```

### Lambda Adapter Usage

```typescript
// apps/api/endpoints/moc-instructions/list/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { handleListMocs } from '@repo/api-handlers/moc'
import { toLambdaRequest, fromLambdaResponse, getUserId } from '@repo/lambda-adapter'

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event)
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const request = toLambdaRequest(event)
  const response = await handleListMocs(request, { userId })
  return fromLambdaResponse(response)
}
```

### Lambda Adapter Implementation

```typescript
// packages/backend/lambda-adapter/src/request.ts
import { APIGatewayProxyEvent } from 'aws-lambda'

export function toLambdaRequest(event: APIGatewayProxyEvent): Request {
  const protocol = event.headers['x-forwarded-proto'] || 'https'
  const host = event.headers.host || 'localhost'
  const url = new URL(event.path, `${protocol}://${host}`)

  // Add query parameters
  if (event.queryStringParameters) {
    Object.entries(event.queryStringParameters).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
    })
  }

  // Build headers
  const headers = new Headers()
  Object.entries(event.headers).forEach(([key, value]) => {
    if (value) headers.set(key, value)
  })

  const init: RequestInit = {
    method: event.httpMethod,
    headers,
  }

  // Add body for non-GET requests
  if (event.body && event.httpMethod !== 'GET') {
    init.body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body
  }

  return new Request(url, init)
}
```

### Files to Move

| Source | Destination |
|--------|-------------|
| `apps/api/endpoints/moc-instructions/_shared/moc-service.ts` | `packages/backend/api-services/src/moc/moc-service.ts` |
| `apps/api/endpoints/moc-instructions/_shared/moc-file-service.ts` | `packages/backend/api-services/src/moc/moc-file-service.ts` |
| `apps/api/endpoints/moc-instructions/_shared/opensearch-moc.ts` | `packages/backend/api-services/src/moc/moc-search-service.ts` |
| `apps/api/endpoints/moc-instructions/_shared/parts-list-parser.ts` | `packages/backend/api-services/src/parts-list/parser.ts` |
| `apps/api/endpoints/moc-instructions/_shared/parts-validators/*` | `packages/backend/api-services/src/parts-list/validators/*` |
| `apps/api/endpoints/moc-parts-lists/_shared/parts-list-service.ts` | `packages/backend/api-services/src/parts-list/s3-service.ts` |
| `apps/api/endpoints/websocket/_shared/*` | `packages/backend/api-services/src/websocket/*` |
| `apps/api/endpoints/gallery/schemas/*` | `packages/backend/api-services/src/gallery/schemas.ts` |
| `apps/api/endpoints/wishlist/schemas/*` | `packages/backend/api-services/src/wishlist/schemas.ts` |

## Testing

### Test Locations
- `packages/backend/api-services/src/**/__tests__/` - Service unit tests
- `packages/backend/api-handlers/src/**/__tests__/` - Handler unit tests
- `packages/backend/lambda-adapter/src/__tests__/` - Adapter unit tests
- `apps/api/endpoints/**/__tests__/` - Existing integration tests (must pass)

### Test Requirements
- Unit: Each service function has isolated tests
- Unit: Each handler has tests with mock Request/Response
- Unit: Adapter conversion functions tested with sample events
- Integration: All existing Lambda tests pass unchanged
- E2E: Deployed staging endpoints work correctly

### Running Tests

```bash
# Run new package tests
pnpm --filter @repo/api-services test
pnpm --filter @repo/api-handlers test
pnpm --filter @repo/lambda-adapter test

# Run existing API tests (must all pass)
pnpm --filter api test

# Run all tests
pnpm test:all
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Import path changes break handlers | Medium | High | Staged migration, one domain at a time |
| Web Request/Response not available in Lambda | Low | High | Use Node.js built-in fetch (18+) or polyfill |
| Performance regression from conversion | Low | Medium | Benchmark critical paths before/after |
| Missing edge cases in adapter | Medium | Medium | Comprehensive test coverage |

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft from API Portability PRD | SM Agent |
