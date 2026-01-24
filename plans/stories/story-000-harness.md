# Story 000: Vercel Runtime Harness/Adapter

  ## Overview

  Create a runtime harness/adapter layer that enables existing AWS Lambda + API
  Gateway handlers to run on Vercel with minimal or no changes to handler logic.
  This is a vertical slice proof-of-concept that establishes the migration spine.

  ## Goals

  - Run ONE existing Lambda handler on Vercel successfully
  - Handler logic remains unchanged or requires minimal modification
  - Adapter handles API Gateway event → Vercel request transformation
  - Adapter handles Vercel response → API Gateway response transformation
  - Local development experience preserved (or improved)

  ## Non-Goals

  - Authentication integration (Cognito → alternative)
  - File/binary uploads or multipart handling
  - WebSocket support
  - Streaming responses
  - Full endpoint migration (just ONE handler to prove the pattern)
  - Production deployment configuration

  ## Success Criteria

  1. `apps/api/endpoints/sets/list/handler.ts` runs on Vercel with ZERO logic changes
  2. Response JSON structure byte-identical to Lambda for same inputs
  3. HTTP 500 errors return same structure as Lambda (with stack traces in dev)
  4. `vercel dev` starts without errors and responds to GET /api/sets/list
  5. Existing handler unit tests pass without modification

  ## Technical Approach

  ### 1. Adapter Layer Architecture

  Create `packages/backend/vercel-adapter/` with:

  ```typescript
  // Core adapter function
  export function createVercelHandler(lambdaHandler: LambdaHandler) {
    return async (req: VercelRequest, res: VercelResponse) => {
      // Transform Vercel request → API Gateway event
      const event = transformRequest(req)

      // NOTE: createLambdaContext() creates minimal Lambda context stub
      // Only includes: requestId, functionName, awsRequestId
      // Does NOT mock business logic, DB, or external services
      const context = createLambdaContext()

      // Invoke Lambda handler (real logic, no mocks)
      const result = await lambdaHandler(event, context, () => {})

      // Transform Lambda response → Vercel response
      transformResponse(result, res)
    }
  }

  2. Request Transformation

  Map Vercel Request to API Gateway APIGatewayProxyEvent:

  - HTTP method, path, query parameters
  - Headers (lowercase normalization)
  - Body (JSON parse if needed)
  - Request context (mock minimal required fields)

  3. Response Transformation

  Map Lambda handler result to Vercel response:

  - Status code
  - Headers
  - Body (stringify if object)
  - Error responses

  4. Target Handler Selection

  Select a simple, read-only handler for proof-of-concept:
  - Minimal dependencies
  - No auth required for testing
  - Straightforward request/response
  - Existing tests we can validate against

  Candidate: apps/api/endpoints/sets/list/handler.ts (GET endpoint, read-only)

  5. Local Development

  Create apps/api/vercel-dev.ts:

  import { createVercelHandler } from '@repo/vercel-adapter'
  import { handler as listSetsHandler } from './endpoints/sets/list/handler'

  export const GET = createVercelHandler(listSetsHandler)

  Run with vercel dev to test locally.

  Implementation Steps

  1. Create adapter package
    - packages/backend/vercel-adapter/
    - Core transformation logic
    - TypeScript types for both runtimes
  2. Implement request transformer
    - Vercel Request → API Gateway Event
    - Handle query params, headers, body
    - Mock required context fields
  3. Implement response transformer
    - Lambda response → Vercel response
    - Status codes, headers, body
    - Error handling
  4. Create Vercel endpoint wrapper
    - Wire up one existing handler
    - Export as Vercel API route
    - Test locally with vercel dev
  5. Validate handler behavior
    - Compare responses: Lambda vs Vercel
    - Run existing handler tests
    - Verify error handling
  6. Document adapter usage
    - README with usage examples
    - Migration guide for future endpoints
    - Known limitations and workarounds
  7. Create OpenAPI spec and .http file
    - Update OpenAPI spec with actual endpoint behavior
    - Create runnable .http file with all test scenarios

  ## Demo Script (QA Verification)

  **Prerequisites (Reality Checks):**
  - [ ] Fresh `pnpm install` completed with no errors
  - [ ] `pnpm build` passes (TypeScript compiles)
  - [ ] `pnpm lint` passes for adapter package
  - [ ] `pnpm test` passes for adapter package
  - [ ] Database running and seeded with test data
  - [ ] No placeholder/TODO comments in adapter code
  - [ ] OpenAPI spec exists at `apps/api/openapi.yaml` with complete `sets/list` definition
  - [ ] `.http` file exists at `apps/api/endpoints/sets/list/test.http` with all scenarios

  **Steps:**
  ```bash
  # 1. Start Vercel dev server
  cd apps/api
  vercel dev
  # Expected: Server starts on http://localhost:3000

  # 2. Run .http file tests
  # Open apps/api/endpoints/sets/list/test.http in VS Code with REST Client extension
  # OR use httpyac CLI: httpyac send apps/api/endpoints/sets/list/test.http
  # Expected: All requests succeed with documented responses

  # 3. Verify basic GET request
  # From test.http: GET http://localhost:3000/api/sets/list
  # Expected: 200 OK with JSON array of sets

  # 4. Verify query params
  # From test.http: GET http://localhost:3000/api/sets/list?limit=5&offset=10
  # Expected: 200 OK with filtered results

  # 5. Compare responses (Lambda vs Vercel)
  # Run handler via Lambda locally
  # Run handler via Vercel adapter using test.http
  # Expected: Identical JSON structure (diff should be empty)

  # 6. Verify error handling
  # From test.http: POST http://localhost:3000/api/sets/list
  # Expected: 405 Method Not Allowed (if handler rejects POST)

  # 7. Verify edge cases from test.http
  # - Empty query parameters
  # - Missing headers
  # - Malformed requests
  # Expected: Documented error responses

  # 8. Run existing tests
  pnpm test apps/api/endpoints/sets/list
  # Expected: All tests pass (no modifications)

  # 9. Validate OpenAPI spec
  # Compare actual responses against OpenAPI spec definitions
  # Expected: Responses match schema exactly
  ```

  **Success:**
  - All .http file requests execute successfully
  - No 500 errors for valid requests
  - Response structure matches Lambda exactly
  - OpenAPI spec accurately documents endpoint behavior

  ## Testing Strategy

  ### Unit Tests
  - Request transformation: method, path, query, headers, body edge cases
  - Response transformation: status codes, headers, body serialization
  - Error paths: handler throws, invalid responses, malformed inputs

  ### Integration Tests
  - Full `sets/list` handler execution through adapter
  - Mock database responses to isolate adapter behavior
  - Validate output matches API Gateway response format

  ### Edge Cases & Failure Modes to Cover

  **Request Edge Cases:**
  - Empty query parameters object → `event.queryStringParameters = {}`
  - Null/undefined body → `event.body = null`
  - Headers with mixed case → normalize to lowercase in `event.headers`
  - Very large query string (>1KB) → should pass through (no size limit yet)
  - Special characters in query params → proper URL decoding
  - Missing Content-Type header → should not crash, use default

  **Response Edge Cases:**
  - Handler returns no statusCode → default to 200
  - Handler returns non-JSON body → pass through as-is
  - Handler returns undefined/null → 500 Internal Server Error
  - Handler returns only headers (no body) → empty response body
  - Handler returns statusCode outside 200-599 → clamp or error

  **Failure Modes:**
  - Handler throws synchronous error → catch and return 500 with message
  - Handler throws async error (rejected promise) → catch and return 500
  - Handler never returns (infinite loop) → Vercel timeout (document)
  - Handler returns malformed response object → 500 with validation error
  - Adapter receives malformed Vercel request → 400 Bad Request

  **NOT Covered (Out of Scope):**
  - Binary/file uploads (multipart/form-data)
  - WebSocket upgrade requests
  - Streaming responses
  - Multiple concurrent requests (performance testing)

  **All edge cases MUST have corresponding requests in test.http file**

  ## Acceptance Criteria

  ### AC1: Handler Unchanged
  - `apps/api/endpoints/sets/list/handler.ts` imports and exports work with adapter
  - ZERO modifications to handler logic (only import path changes allowed)
  - Handler's existing tests run and pass without modification

  ### AC2: Request Transformation
  - HTTP method (GET) mapped correctly
  - Path `/api/sets/list` → API Gateway path format
  - Query params `?limit=10&offset=5` → event.queryStringParameters
  - Headers normalized (lowercase) → event.headers
  - Empty body → event.body = null

  ### AC3: Response Transformation
  - Lambda `{ statusCode: 200, body: '{"data":[]}' }` → Vercel 200 + JSON
  - Lambda `{ statusCode: 500, body: '{"error":"..."}' }` → Vercel 500 + JSON
  - Lambda headers → Vercel response headers (including CORS if present)

  ### AC4: Error Handling
  - Handler throws exception → Vercel returns 500 with error message
  - Malformed JSON body → 400 Bad Request
  - Handler returns invalid statusCode → 500 Internal Server Error

  ### AC5: Local Dev
  - `vercel dev` starts without errors in <10 seconds
  - GET http://localhost:3000/api/sets/list returns 200
  - Response matches Lambda response structure

  ### AC6: Test Coverage
  - Request transformer: 100% coverage (pure functions)
  - Response transformer: 100% coverage (pure functions)
  - Integration test: full handler execution through adapter
  - Edge cases: null body, empty query params, missing headers

  ### AC7: Documentation
  - README with 3-step "wrap a handler" guide
  - Table of supported vs unsupported API Gateway event fields
  - Known limitations list (binary uploads, WebSockets, etc.)

  ### AC8: OpenAPI & HTTP Test File (REQUIRED)
  - OpenAPI spec at `apps/api/openapi.yaml` includes complete `sets/list` endpoint definition:
    - Request parameters (query, headers)
    - Response schemas (200, 400, 405, 500)
    - Error response formats
  - Runnable `.http` file at `apps/api/endpoints/sets/list/test.http` includes:
    - Happy path: basic GET request
    - Query parameters: limit, offset, filtering
    - Error cases: wrong method, invalid params, edge cases
    - Comments documenting expected responses
  - OpenAPI spec matches actual endpoint behavior (no placeholders, no dummy examples)
  - `.http` file executes successfully and returns documented responses (no dummy requests)
  - All edge cases from Testing Strategy have corresponding .http requests

  Dependencies

  None (foundational story)

  ## Constraints & Red Flags

  **MUST NOT:**
  - Mock database calls in the adapter layer
  - Mock business logic or handler behavior
  - Change handler error handling semantics
  - Add Vercel-specific code to handler files
  - Create placeholder OpenAPI entries (e.g., "TODO", "TBD", generic descriptions)
  - Create dummy .http requests that don't actually work
  - Copy/paste OpenAPI schemas without validating against actual responses

  **MUST:**
  - Use real handler code (no test doubles)
  - Preserve exact error messages from handler
  - Keep context mock minimal (only requestId, functionName, etc.)
  - Document every API Gateway field we DON'T support
  - Update OpenAPI spec BEFORE marking story complete
  - Test .http file requests return expected responses
  - Validate OpenAPI schema matches actual response structure

  **OpenAPI Validation Checklist:**
  - [ ] Response schemas match actual handler output (run handler, capture response, compare to schema)
  - [ ] Error responses documented with actual error messages
  - [ ] Query parameters have correct types (string, integer, etc.)
  - [ ] Required vs optional fields marked correctly
  - [ ] No generic examples ("string", "number", etc.) - use realistic data

  **.http File Validation Checklist:**
  - [ ] All requests execute without manual editing
  - [ ] Expected responses documented in comments
  - [ ] Variables used for base URL (localhost vs deployed)
  - [ ] All edge cases from Testing Strategy covered
  - [ ] Failure modes produce expected error responses

  ## Risks & Mitigations

  **Risk:** API Gateway event structure too complex to replicate
  - **Mitigation:** Support only fields used by `sets/list` handler initially
  - **Detection:** Run handler with real API Gateway event, log field usage
  - **Acceptance:** Document unsupported fields in README

  **Risk:** Lambda context usage breaks in Vercel runtime
  - **Mitigation:** Analyze handler for context.getRemainingTimeInMillis(), context.callbackWaitsForEmptyEventLoop
  - **Detection:** Handler crashes with "undefined" errors
  - **Acceptance:** If handler uses context heavily, choose simpler target handler

  **Risk:** Environment variable differences (AWS_REGION, etc.)
  - **Mitigation:** Document env var mapping in README
  - **Detection:** Handler fails due to missing AWS_* vars
  - **Acceptance:** Provide `.env.local` template for Vercel

  **Risk:** Handler depends on AWS SDK in ways incompatible with Vercel
  - **Mitigation:** Choose handler with minimal AWS dependencies
  - **Detection:** Runtime errors about missing AWS credentials
  - **Acceptance:** This story fails if handler needs AWS SDK; document and defer

  **Risk:** OpenAPI spec becomes stale or incorrect
  - **Mitigation:** Run actual requests, capture responses, validate against schema
  - **Detection:** Schema validation fails or responses don't match spec
  - **Acceptance:** Update OpenAPI spec to match reality, not assumptions

  **Risk:** .http file has dummy requests that look real but don't work
  - **Mitigation:** Execute .http file as part of Definition of Done
  - **Detection:** Requests fail or return unexpected responses
  - **Acceptance:** Fix .http file until all requests execute successfully

  ## Token Budget

  Track token usage per phase to identify optimization opportunities.

  ### Phase Summary

  | Phase | Agent | Est. Input | Est. Output | Est. Total | Actual | Cost |
  |-------|-------|------------|-------------|------------|--------|------|
  | Story Generation | PM | — | — | — | — | — |
  | Test Plan | PM | — | — | — | — | — |
  | Dev Feasibility | PM | — | — | — | — | — |
  | Implementation | Dev | — | — | — | — | — |
  | Proof | Dev | — | — | — | — | — |
  | Code Review | Review | — | — | — | — | — |
  | QA Verification | QA | — | — | — | — | — |
  | **Total** | — | — | — | — | **—** | **—** |

  ### Measurement Instructions

  1. Before starting a phase, run `/cost` and record the session total
  2. After completing the phase, run `/cost` again
  3. Record the delta in the Actual column
  4. Note any unusually high costs for investigation

  ### Actual Measurements

  | Date | Phase | Before `/cost` | After `/cost` | Delta | Notes |
  |------|-------|----------------|---------------|-------|-------|
  | — | — | — | — | — | — |

  ---

  ## Definition of Done (QA Gate)

  **Story is DONE when:**
  1. ✅ All 8 Acceptance Criteria verified in reality (not just tests passing)
  2. ✅ Demo Script executes successfully from clean state using .http file
  3. ✅ `sets/list` handler responds identically via Vercel and Lambda runtimes
  4. ✅ No mocked business logic or database calls in critical path
  5. ✅ README includes limitations and unsupported features table
  6. ✅ Handler tests run unmodified and pass
  7. ✅ OpenAPI spec validates against actual endpoint responses (use schema validator)
  8. ✅ .http file executes successfully with expected responses (run all requests)
  9. ✅ OpenAPI spec contains ZERO placeholder/TODO/TBD entries
  10. ✅ .http file contains ZERO dummy requests (all requests work as-is)

  **Automatic FAIL conditions:**
  - Handler logic modified to accommodate adapter
  - Database or S3 calls mocked in adapter layer
  - Response structure differs between Lambda and Vercel runtimes
  - `vercel dev` fails to start or crashes on request
  - Demo Script requires workarounds or "ignore this error" steps
  - OpenAPI spec has placeholder entries or doesn't match actual responses
  - .http file requests fail or require manual editing to work
  - OpenAPI spec and actual responses differ (schema validation fails)

  ## Future Work

  - Authentication adapter (Cognito → Vercel auth)
  - File upload handling (multipart/form-data)
  - WebSocket support
  - Streaming responses
  - Full endpoint migration (sets/create, sets/update, etc.)
  - Performance benchmarking (Lambda vs Vercel cold start)
