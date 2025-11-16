# Epic 1 - Unit Test Plan

## Test Strategy

**Testing Philosophy**: Focus on **pure, business-critical logic** that can be tested in isolation without infrastructure dependencies.

**Out of Scope for Unit Tests**:
- Lambda handlers (integration tests)
- Database clients (integration tests with test database)
- Redis/OpenSearch clients (integration tests with mocks)
- SST infrastructure (e2e deployment tests)

**In Scope for Unit Tests**: Pure functions and self-contained modules

---

## Test Suite 1: Environment Validation (`src/lib/utils/env.ts`)

### Why Test This
- **Critical path**: Application fails to start if env validation fails
- **Pure functions**: No side effects, easy to test
- **High complexity**: Schema with many optional fields and defaults
- **Error scenarios**: Multiple validation failure modes

### Test Cases

#### ✅ Happy Path Tests

1. **`validateEnv()` with all required fields**
   ```typescript
   Given: process.env contains all required environment variables
   When: validateEnv() is called
   Then: Returns typed Env object with all values
   ```

2. **`validateEnv()` with defaults applied**
   ```typescript
   Given: process.env missing optional fields (NODE_ENV, AWS_REGION, LOG_LEVEL)
   When: validateEnv() is called
   Then: Returns Env object with default values applied:
     - NODE_ENV: 'development'
     - STAGE: 'dev'
     - AWS_REGION: 'us-east-1'
     - LOG_LEVEL: 'info'
   ```

3. **`getEnv()` memoization**
   ```typescript
   Given: validateEnv() has been called once
   When: getEnv() is called multiple times
   Then: validateEnv() is only called once (memoized result returned)
   ```

#### ❌ Error Path Tests

4. **`validateEnv()` with invalid NODE_ENV**
   ```typescript
   Given: NODE_ENV='invalid-value'
   When: validateEnv() is called
   Then: Throws Error with message containing 'Environment validation failed'
     And: Logs ZodError issues to console.error
   ```

5. **`validateEnv()` with invalid STAGE**
   ```typescript
   Given: STAGE='invalid-stage' (not dev/staging/production)
   When: validateEnv() is called
   Then: Throws Error with 'Environment validation failed'
     And: Error includes validation issues
   ```

6. **`validateEnv()` with invalid LOG_LEVEL**
   ```typescript
   Given: LOG_LEVEL='trace' (not debug/info/warn/error)
   When: validateEnv() is called
   Then: Throws Error with 'Environment validation failed'
   ```

#### Edge Cases

7. **`validateEnv()` with optional AWS fields present**
   ```typescript
   Given: All AWS optional fields provided (AWS_ACCOUNT_ID, POSTGRES_*, REDIS_*, etc.)
   When: validateEnv() is called
   Then: Returns Env object with all AWS fields populated
   ```

8. **`getEnv()` reset between test suites**
   ```typescript
   Given: getEnv() has been called with cached result
   When: Test suite resets _env cache to null
     And: getEnv() is called again
   Then: validateEnv() is called again (not using stale cache)
   ```

### Test Implementation Notes
- Mock `process.env` using Jest/Vitest environment manipulation
- Reset `_env` cache between tests: `(getEnv as any)._env = null` or use module re-import
- Use `vi.spyOn(console, 'error')` to verify error logging
- Test both `validateEnv()` directly and `getEnv()` wrapper

---

## Test Suite 2: Error Classes (`src/lib/errors/index.ts`)

### Why Test This
- **API contract**: All error responses depend on these classes
- **Self-contained**: No external dependencies
- **Inheritance hierarchy**: Need to verify all error types behave correctly
- **JSON serialization**: Critical for API Gateway responses

### Test Cases

#### ✅ Error Class Instantiation

1. **All error classes have correct status codes**
   ```typescript
   Given: Each ApiError subclass (BadRequestError, NotFoundError, etc.)
   When: Instantiated with a message
   Then: Has correct statusCode property:
     - BadRequestError: 400
     - UnauthorizedError: 401
     - ForbiddenError: 403
     - NotFoundError: 404
     - ConflictError: 409
     - ValidationError: 422
     - RateLimitError: 429
     - InternalServerError: 500
     - ServiceUnavailableError: 503
     - FileError: 400
     - SearchError: 500
     - DatabaseError: 500
   ```

2. **All error classes have correct errorType**
   ```typescript
   Given: Each ApiError subclass
   When: Instantiated
   Then: Has correct errorType property matching ApiErrorType enum
   ```

3. **Error constructor with custom message**
   ```typescript
   Given: NotFoundError('MOC project not found')
   When: Instantiated
   Then: error.message === 'MOC project not found'
     And: error.name === 'NotFoundError'
     And: error.statusCode === 404
     And: error.errorType === 'NOT_FOUND'
   ```

4. **Error constructor with details**
   ```typescript
   Given: NotFoundError('MOC not found', { mocId: '123', userId: 'abc' })
   When: Instantiated
   Then: error.details === { mocId: '123', userId: 'abc' }
   ```

5. **Error without details**
   ```typescript
   Given: BadRequestError('Invalid request')
   When: Instantiated
   Then: error.details === undefined
   ```

#### 🔄 Error Serialization

6. **`toJSON()` serialization**
   ```typescript
   Given: NotFoundError('Resource not found', { id: '123' })
   When: error.toJSON() is called
   Then: Returns object with keys: name, errorType, message, statusCode, details
     And: Values match error properties
   ```

7. **`toJSON()` without details**
   ```typescript
   Given: BadRequestError('Bad request')
   When: error.toJSON() is called
   Then: Returns object with details: undefined
   ```

#### 🔍 Error Type Guards

8. **`isApiError()` returns true for ApiError instances**
   ```typescript
   Given: NotFoundError instance
   When: isApiError(error) is called
   Then: Returns true
   ```

9. **`isApiError()` returns false for non-ApiError**
   ```typescript
   Given: Standard Error('Something broke')
   When: isApiError(error) is called
   Then: Returns false
   ```

10. **`isApiError()` returns false for non-Error objects**
    ```typescript
    Given: Plain object { message: 'error' } or null or undefined
    When: isApiError(value) is called
    Then: Returns false
    ```

#### 🔄 Error Conversion

11. **`toApiError()` preserves ApiError instances**
    ```typescript
    Given: NotFoundError('Not found')
    When: toApiError(error) is called
    Then: Returns the same NotFoundError instance (not wrapped)
    ```

12. **`toApiError()` wraps standard Error**
    ```typescript
    Given: Error('Database connection failed')
    When: toApiError(error) is called
    Then: Returns InternalServerError with:
      - message: 'Database connection failed'
      - details.originalError: 'Error'
      - details.stack: (stack trace present)
    ```

13. **`toApiError()` wraps non-Error values**
    ```typescript
    Given: String 'Something went wrong' or Number 500
    When: toApiError(value) is called
    Then: Returns InternalServerError with:
      - message: 'An unexpected error occurred'
      - details.error: String representation of value
    ```

#### Edge Cases

14. **Error stack trace captured**
    ```typescript
    Given: Any ApiError subclass instantiated
    When: Checking error.stack property
    Then: Stack trace is present and starts with error name
    ```

15. **Default messages used when not provided**
    ```typescript
    Given: BadRequestError() with no message
    When: Instantiated
    Then: error.message === 'Bad request' (default)
    ```

### Test Implementation Notes
- Test all 12 error class constructors
- Verify inheritance chain (all extend ApiError)
- Test JSON.stringify(error) to ensure serialization works
- Mock stack traces if needed for deterministic tests

---

## Test Suite 3: Response Builders (`src/lib/responses/index.ts`)

### Why Test This
- **API contract**: All Lambda responses use these builders
- **Pure functions**: Deterministic, easy to test
- **Critical for consistency**: All endpoints must follow same response format
- **Environment-dependent**: Production vs dev behavior differs

### Test Cases

#### ✅ Success Responses

1. **`successResponse()` with data**
   ```typescript
   Given: successResponse(200, { id: '123', title: 'My MOC' })
   When: Called
   Then: Returns APIGatewayProxyResult with:
     - statusCode: 200
     - headers: { 'Content-Type': 'application/json', CORS headers }
     - body: JSON string with { success: true, data, timestamp }
   ```

2. **`successResponse()` with optional message**
   ```typescript
   Given: successResponse(201, { id: '123' }, 'Resource created')
   When: Called
   Then: body includes message: 'Resource created'
   ```

3. **`successResponse()` timestamp is ISO string**
   ```typescript
   Given: successResponse(200, {})
   When: Called
   Then: Parsed body.timestamp matches ISO 8601 format
     And: Timestamp is within last 1 second (Date.now())
   ```

4. **`successResponse()` CORS headers present**
   ```typescript
   Given: successResponse(200, {})
   When: Called
   Then: headers include:
     - 'Access-Control-Allow-Origin': '*'
     - 'Access-Control-Allow-Credentials': true
   ```

#### ❌ Error Responses

5. **`errorResponse()` with all parameters**
   ```typescript
   Given: errorResponse(404, 'NOT_FOUND', 'Resource not found', { id: '123' })
   When: Called in non-production env
   Then: Returns APIGatewayProxyResult with:
     - statusCode: 404
     - body: { success: false, error: { type, message, details }, timestamp }
   ```

6. **`errorResponse()` strips details in production**
   ```typescript
   Given: process.env.NODE_ENV='production'
     And: errorResponse(500, 'INTERNAL_ERROR', 'Error', { stack: '...' })
   When: Called
   Then: Parsed body.error.details === undefined (stripped for security)
   ```

7. **`errorResponse()` includes details in development**
   ```typescript
   Given: process.env.NODE_ENV='development'
     And: errorResponse(400, 'BAD_REQUEST', 'Invalid', { field: 'email' })
   When: Called
   Then: Parsed body.error.details === { field: 'email' }
   ```

#### 🔄 Error Response from Error Object

8. **`errorResponseFromError()` with ApiError**
   ```typescript
   Given: NotFoundError('MOC not found', { mocId: '123' })
   When: errorResponseFromError(error) is called
   Then: Returns error response with:
     - statusCode: 404 (from NotFoundError)
     - error.type: 'NOT_FOUND'
     - error.message: 'MOC not found'
     - error.details: { mocId: '123' } (if dev)
   ```

9. **`errorResponseFromError()` with standard Error**
   ```typescript
   Given: Error('Unexpected failure')
   When: errorResponseFromError(error) is called
   Then: Returns error response with:
     - statusCode: 500 (wrapped as InternalServerError)
     - error.type: 'INTERNAL_ERROR'
     - error.message: 'Unexpected failure'
   ```

10. **`errorResponseFromError()` with unknown error**
    ```typescript
    Given: String 'Something broke' or null
    When: errorResponseFromError(value) is called
    Then: Returns error response with:
      - statusCode: 500
      - error.message: 'An unexpected error occurred'
    ```

#### 🏥 Health Check Response

11. **`healthCheckResponse()` when healthy**
    ```typescript
    Given: HealthCheckData with status='healthy', all services connected
    When: healthCheckResponse(data) is called
    Then: Returns success response with:
      - statusCode: 200
      - data includes status and services object
      - message: 'System status: healthy'
    ```

12. **`healthCheckResponse()` when degraded**
    ```typescript
    Given: HealthCheckData with status='degraded' (some services down)
    When: healthCheckResponse(data) is called
    Then: Returns response with:
      - statusCode: 200 (still returns 200 for degraded)
      - message: 'System status: degraded'
    ```

13. **`healthCheckResponse()` when unhealthy**
    ```typescript
    Given: HealthCheckData with status='unhealthy'
    When: healthCheckResponse(data) is called
    Then: Returns response with:
      - statusCode: 503 (Service Unavailable)
      - message: 'System status: unhealthy'
    ```

#### 🔀 Special Responses

14. **`noContentResponse()` for deletes**
    ```typescript
    Given: DELETE operation succeeded
    When: noContentResponse() is called
    Then: Returns APIGatewayProxyResult with:
      - statusCode: 204
      - body: '' (empty)
      - CORS headers present
    ```

15. **`redirectResponse()` for presigned URLs**
    ```typescript
    Given: redirectResponse('https://s3.amazonaws.com/bucket/key')
    When: Called
    Then: Returns APIGatewayProxyResult with:
      - statusCode: 302
      - headers.Location: 'https://s3.amazonaws.com/bucket/key'
      - body: '' (empty)
    ```

16. **`corsResponse()` for OPTIONS preflight**
    ```typescript
    Given: corsResponse() is called
    When: Called
    Then: Returns APIGatewayProxyResult with:
      - statusCode: 200
      - headers include: Allow-Origin, Allow-Methods, Allow-Headers, Max-Age
      - body: '' (empty)
    ```

#### Edge Cases

17. **Response body is valid JSON**
    ```typescript
    Given: Any response builder (success or error)
    When: Called
    Then: JSON.parse(result.body) does not throw
      And: Parsed object has expected structure
    ```

18. **All response builders include CORS headers**
    ```typescript
    Given: Any response builder
    When: Called
    Then: headers['Access-Control-Allow-Origin'] === '*'
      And: headers['Access-Control-Allow-Credentials'] === true
    ```

### Test Implementation Notes
- Mock `process.env.NODE_ENV` to test production vs dev behavior
- Use `JSON.parse(response.body)` to verify response structure
- Test timestamp generation with Date mocking for determinism
- Verify CORS headers are present on ALL responses (security requirement)

---

## Test Execution Plan

### Phase 1: Setup Test Infrastructure
1. Install Vitest and testing dependencies (already in package.json)
2. Create `vitest.config.ts` if not exists
3. Add test script to package.json: `"test": "vitest run"`

### Phase 2: Write Tests (Ordered by Priority)
1. **High Priority**: Response builders (most critical for API contract)
2. **High Priority**: Error classes (essential for error handling)
3. **Medium Priority**: Environment validation (startup requirement)

### Phase 3: CI Integration
1. Add test step to GitHub Actions workflow
2. Require 80% code coverage for tested modules
3. Block PRs if tests fail

### Phase 4: Test Coverage Goals
- **Response builders**: 100% coverage (pure functions, mission-critical)
- **Error classes**: 100% coverage (self-contained, high value)
- **Environment validation**: 90% coverage (allow some edge cases)

---

## Files to Create

```
apps/api/lego-api-serverless/
├── src/
│   ├── lib/
│   │   ├── utils/
│   │   │   └── __tests__/
│   │   │       └── env.test.ts          (8 test cases)
│   │   ├── errors/
│   │   │   └── __tests__/
│   │   │       └── index.test.ts        (18 test cases)
│   │   └── responses/
│   │       └── __tests__/
│   │           └── index.test.ts        (18 test cases)
└── vitest.config.ts
```

**Total Test Cases**: 44 unit tests covering ~3 modules

---

## Next Steps

Would you like me to:
1. **Generate the actual test files** with implementation?
2. **Create a vitest.config.ts** tailored for this project?
3. **Add test scripts** to package.json?
4. **Set up test coverage reporting**?

Simply let me know which you'd like me to proceed with, or say "implement all" to generate everything!
