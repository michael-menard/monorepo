# STORY-001: Health Check & Upload Config

## Goal

Migrate two foundational endpoints (`health` and `config/upload`) from AWS Lambda + API Gateway to Vercel serverless functions using ports & adapters architecture. These endpoints establish baseline system monitoring and public upload configuration with no authentication requirements.

## Non-Goals

- **Not** migrating any authenticated endpoints
- **Not** implementing database write operations
- **Not** handling file uploads or S3 operations
- **Not** implementing caching layers (Redis/ElastiCache)
- **Not** deploying to production Vercel environment (local development only)
- **Not** migrating OpenSearch dependency (health check will monitor PostgreSQL only)

## Scope

### Endpoints to Migrate

**1. Health Check Endpoint**
- **Source:** `apps/api/endpoints/health/handler.ts`
- **Target:** `apps/api/api/health.ts` (Vercel function)
- **Method:** GET
- **Route:** `/api/health`
- **Current behavior:**
  - Tests PostgreSQL connection via `testConnection()`
  - Tests OpenSearch connection via `testOpenSearchConnection()`
  - Returns health status: `healthy` | `degraded` | `unhealthy`
  - Returns 200 with health data if PostgreSQL connected
  - Returns 503 if PostgreSQL disconnected
  - Wrapped with `withErrorHandling` middleware
  - Logs request/response via logger
- **Simplified behavior for STORY-001:**
  - Tests PostgreSQL connection ONLY (OpenSearch monitoring deferred)
  - Returns health status based solely on PostgreSQL connection
  - Includes `opensearch: "not_monitored"` in response for backward compatibility
  - No Redis/caching layer monitoring

**2. Upload Config Endpoint**
- **Source:** `apps/api/endpoints/config/upload/handler.ts`
- **Target:** `apps/api/api/config/upload.ts` (Vercel function)
- **Method:** GET
- **Route:** `/api/config/upload`
- **Current behavior:**
  - Loads upload configuration from environment via `loadEnvConfig()`
  - Returns public-safe subset of upload config (file size limits, MIME types, etc.)
  - No database or external service dependencies
  - Wrapped with `withErrorHandling` middleware
  - Logs minimal request data

### Core Business Logic to Extract

**Health Check Core Logic:**
- Database connection testing (PostgreSQL only)
- Service health status determination (`determineHealthStatus`)
- Health check data structure (`HealthCheckData`)

**Upload Config Core Logic:**
- Environment config loading
- Public config filtering (excluding sensitive fields)

## Decisions (Required Before Implementation)

### D1: Core Logic Package Location
**Decision:** Use separate packages per feature:
- `packages/backend/health-check-core`
- `packages/backend/upload-config-core`

**Rationale:** Clearer boundaries, easier to test in isolation, better separation of concerns

**Constraint:** Package names must follow pattern `packages/backend/{feature}-core`

---

### D2: Adapter Strategy
**Decision:** Create shared `packages/backend/vercel-adapter` package with reusable wrappers

**Rationale:** Only 2 endpoints in this story, but foundation supports future stories (15+ more stories planned). Creating the adapter infrastructure now avoids duplication and establishes patterns for the entire migration.

**Constraint:** Adapter must be generic enough to support GET/POST/PUT/DELETE methods and standard error handling patterns

---

### D3: Database Client Choice
**Decision:** Use Neon serverless driver (`@neondatabase/serverless`)

**Rationale:** Optimized for serverless, no connection pooling needed, compatible with PostgreSQL wire protocol

**Installation:** `pnpm add @neondatabase/serverless --filter @repo/api`

**Connection string:** Uses standard `DATABASE_URL` environment variable

---

### D4: Error Response Format
**Decision:** Use Vercel/Next.js conventions (clean JSON responses)

**Response format:**
```json
{
  "error": "Service Unavailable",
  "message": "Database connection failed",
  "details": { ... }
}
```

**Rationale:** Cleaner, more standard than Lambda's APIGatewayProxyResult wrapper. Adapters will handle transformation to ensure client compatibility.

---

### D5: Local Testing Database
**Decision:** Use Neon branch database (cloud-based) for integration testing

**Rationale:** Avoids Docker Compose overhead, matches production environment, free tier sufficient for testing

**Fallback:** Unit tests will use mock database client for fast feedback

---

### D6: CORS Configuration
**Decision:** CORS is REQUIRED for browser clients

**Allowed origins:**
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Next.js dev server)

**Implementation:** Configure CORS headers in Vercel function responses (not in vercel.json)

**Headers required:**
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

---

### D7: Health Check Scope (Explicit)
**Decision:** Health check monitors PostgreSQL ONLY

**Services included:**
- ✅ PostgreSQL (via Neon serverless driver)

**Services excluded:**
- ❌ Redis/ElastiCache (no caching in STORY-001)
- ❌ OpenSearch (deferred to future story)
- ❌ S3 (not applicable for health check)

**Backward compatibility:** Response includes `opensearch: "not_monitored"` to prevent breaking existing clients that expect this field.

**Future restoration:** OpenSearch monitoring will be added in a future story (TBD). For now, health check is simplified to establish baseline pattern.

---

## Acceptance Criteria

### AC1: Health Check Vercel Function
- [ ] Vercel function created at `apps/api/api/health.ts`
- [ ] Core health check logic extracted to `packages/backend/health-check-core`
- [ ] Vercel adapter wraps core logic and handles Next.js `NextRequest`/`NextResponse`
- [ ] Function tests PostgreSQL connection using Neon serverless driver (`@neondatabase/serverless`)
- [ ] Health check ONLY monitors PostgreSQL (no Redis, OpenSearch monitoring deferred)
- [ ] Function returns correct status codes:
  - 200 for `healthy` (PostgreSQL connected)
  - 503 for `unhealthy` (PostgreSQL disconnected)
- [ ] Response includes: `status`, `services.postgres`, `services.opensearch` (value: `"not_monitored"`), `timestamp`, `version`
- [ ] OpenSearch field included with value `"not_monitored"` to maintain backward compatibility
- [ ] Version hardcoded to `"1.0.0"` for STORY-001 (dynamic version sourcing deferred to future story)
- [ ] Logger outputs structured logs with request context (see AC5 for format)
- [ ] CORS headers included in response

### AC2: Upload Config Vercel Function
- [ ] Vercel function created at `apps/api/api/config/upload.ts`
- [ ] Core config logic extracted to `packages/backend/upload-config-core`
- [ ] Vercel adapter wraps core logic and handles Next.js request/response
- [ ] Function loads configuration from Vercel environment variables
- [ ] Function returns public-safe upload config (excludes internal/sensitive fields)
- [ ] Response matches existing `PublicUploadConfig` type
- [ ] Logger outputs structured logs (see AC5 for format)
- [ ] CORS headers included in response

### AC3: Local Development & Testing
- [ ] Both functions run successfully via `vercel dev`
- [ ] Health endpoint accessible at `http://localhost:3000/api/health`
- [ ] Upload config endpoint accessible at `http://localhost:3000/api/config/upload`
- [ ] `.env.local` file configured with required environment variables
- [ ] `vercel.json` created at `apps/api/vercel.json` with route configuration
- [ ] Manual curl/browser tests verify correct responses
- [ ] Unit tests exist for core business logic (platform-agnostic functions)
- [ ] Integration tests exist for Vercel adapters (using mocked Next.js types)

### AC4: Ports & Adapters Architecture
- [ ] Core business logic has zero dependencies on AWS SDK or API Gateway types
- [ ] Core business logic has zero dependencies on Vercel/Next.js types
- [ ] Vercel adapter package created at `packages/backend/vercel-adapter`
- [ ] Adapter exports reusable wrappers for GET/POST methods (minimum)
- [ ] Adapters are thin wrappers that only handle platform-specific concerns:
  - Request parsing (API Gateway events → Vercel NextRequest)
  - Response formatting (APIGatewayProxyResult → NextResponse)
  - Error handling (platform-specific error responses)
  - CORS headers
- [ ] Core logic is testable in isolation without mocking platform types

### AC5: Logging & Observability
- [ ] Logger works identically in Vercel environment
- [ ] Logs include request ID, stage/environment, timestamp
- [ ] Structured logging format maintained (JSON)
- [ ] Error logs include stack traces and context
- [ ] All logs use the structured format specified below:

**Structured Log Format (REQUIRED):**
All logs must use JSON format with the following fields:

```json
{
  "level": "info",
  "timestamp": "2026-01-17T12:00:00.000Z",
  "requestId": "abc-123",
  "stage": "development",
  "message": "Health check succeeded",
  "context": {
    "status": "healthy",
    "durationMs": 45
  }
}
```

**Required fields:** `level`, `timestamp`, `requestId`, `stage`, `message`

**Optional field:** `context` (object containing additional structured data)

**Log levels:** `debug`, `info`, `warn`, `error`

---

## Required Vercel Infrastructure

### Serverless Functions

**Function 1: Health Check**
- **File:** `apps/api/api/health.ts`
- **Route:** `/api/health`
- **Method:** GET
- **Auth:** None
- **Timeout:** 10 seconds
- **Memory:** 256 MB
- **Max duration:** 10s

**Function 2: Upload Config**
- **File:** `apps/api/api/config/upload.ts`
- **Route:** `/api/config/upload`
- **Method:** GET
- **Auth:** None
- **Timeout:** 10 seconds
- **Memory:** 128 MB
- **Max duration:** 10s

### Environment Variables

**Note:** Both endpoints run in the same Vercel environment. All variables below must be present in `.env.local` for local development.

**Common Variables:**
```
DATABASE_URL=postgres://user:password@host:5432/dbname
STAGE=development
```

**Upload Config Specific:**
```
PDF_MAX_BYTES=104857600
IMAGE_MAX_BYTES=10485760
PARTS_LIST_MAX_BYTES=5242880
THUMBNAIL_MAX_BYTES=2097152
MAX_IMAGES_PER_MOC=20
MAX_PARTS_LISTS_PER_MOC=5
ALLOWED_PDF_MIME_TYPES=application/pdf
ALLOWED_IMAGE_MIME_TYPES=image/jpeg,image/png,image/webp
ALLOWED_PARTS_LIST_MIME_TYPES=text/csv,application/xml
PRESIGN_TTL_MINUTES=15
SESSION_TTL_MINUTES=60
```

### Database Connection

- **Provider:** Neon Postgres (via `DATABASE_URL`)
- **Driver:** Neon serverless driver (`@neondatabase/serverless`)
- **Connection pooling:** Not required (Neon handles internally)
- **Schema:** No migrations required (read-only health check)

### Routing Configuration

**vercel.json** (located at `apps/api/vercel.json`):
```json
{
  "routes": [
    { "src": "/api/health", "dest": "/api/health.ts" },
    { "src": "/api/config/upload", "dest": "/api/config/upload.ts" }
  ]
}
```

## Local Testing Plan

### Setup

1. **Install Vercel CLI:**
   ```bash
   pnpm add -g vercel
   ```

2. **Create `.env.local` file:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with real DATABASE_URL and config values
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

### Manual Testing

**Test 1: Health Check - Healthy Database**
```bash
# Start Vercel dev server
vercel dev

# Test health endpoint
curl http://localhost:3000/api/health

# Expected response (200 OK):
{
  "status": "healthy",
  "services": {
    "postgres": "connected",
    "opensearch": "not_monitored"
  },
  "timestamp": "2026-01-17T12:00:00.000Z",
  "version": "1.0.0"
}
```

**Test 2: Health Check - Database Unavailable**
```bash
# Stop local database or use invalid DATABASE_URL
# Test health endpoint
curl http://localhost:3000/api/health

# Expected response (503 Service Unavailable):
{
  "status": "unhealthy",
  "services": {
    "postgres": "disconnected",
    "opensearch": "not_monitored"
  },
  "timestamp": "2026-01-17T12:00:00.000Z",
  "version": "1.0.0"
}
```

**Test 3: Upload Config**
```bash
# Test upload config endpoint
curl http://localhost:3000/api/config/upload

# Expected response (200 OK):
{
  "pdfMaxBytes": 104857600,
  "imageMaxBytes": 10485760,
  "partsListMaxBytes": 5242880,
  "thumbnailMaxBytes": 2097152,
  "maxImagesPerMoc": 20,
  "maxPartsListsPerMoc": 5,
  "allowedPdfMimeTypes": ["application/pdf"],
  "allowedImageMimeTypes": ["image/jpeg", "image/png", "image/webp"],
  "allowedPartsListMimeTypes": ["text/csv", "application/xml"],
  "presignTtlMinutes": 15,
  "sessionTtlMinutes": 60
}
```

**Test 4: CORS Headers**
```bash
# Test OPTIONS preflight request
curl -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Verify response includes:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Methods: GET, OPTIONS
# Access-Control-Allow-Headers: Content-Type

# Test actual GET request with CORS
curl http://localhost:3000/api/health \
  -H "Origin: http://localhost:5173" \
  -v

# Verify response includes:
# Access-Control-Allow-Origin: http://localhost:5173
```

### Automated Testing

**Unit Tests (Core Logic):**
```bash
# Test platform-agnostic health check logic
pnpm test packages/backend/health-check-core

# Test platform-agnostic config logic
pnpm test packages/backend/upload-config-core
```

**Integration Tests (Vercel Adapters):**
```bash
# Test Vercel function wrappers
pnpm test apps/api/__tests__/health.test.ts
pnpm test apps/api/__tests__/config-upload.test.ts
```

**Coverage Requirements (ENFORCED):**
- **Core logic:** 80% minimum - CI will fail below this threshold
- **Adapters:** 60% minimum - CI will fail below this threshold
- **Rationale:** New code sets quality baseline for migration. Higher bar than global 45% minimum per CLAUDE.md.
- **Note:** These targets apply to new packages created in this story. Existing codebase maintains 45% global minimum.

## Risks / Edge Cases

### Risk 1: Database Connection Pooling
- **Issue:** Vercel serverless functions are stateless; connection pooling differs from Lambda
- **Mitigation:** Use Neon serverless driver (no pooling required)
- **Edge case:** Cold starts may have higher latency for first database connection

### Risk 2: Environment Variable Loading
- **Issue:** Lambda uses `process.env` directly; Vercel has different env var behavior
- **Mitigation:** Use Vercel's `.env.local` for local dev, Vercel dashboard for production
- **Edge case:** Missing env vars should fail fast with clear error messages

### Risk 3: OpenSearch Field Backward Compatibility
- **Issue:** Removing OpenSearch monitoring changes health check response structure
- **Mitigation:** Include `opensearch: "not_monitored"` field in response to maintain backward compatibility
- **Edge case:** Clients expecting `services.opensearch` field will receive `"not_monitored"` instead of connection status
- **Future restoration:** OpenSearch monitoring will be added in a future story, at which point the field value will change from `"not_monitored"` to `"connected"` or `"disconnected"`

### Risk 4: Logger Compatibility
- **Issue:** Logger may behave differently in Vercel vs Lambda (stdout vs CloudWatch)
- **Mitigation:** Test logger output in Vercel dev environment
- **Edge case:** Structured logs may need format adjustments for Vercel logs

### Risk 5: Response Format Changes
- **Issue:** `APIGatewayProxyResult` has different structure than `NextResponse`
- **Mitigation:** Ensure adapters maintain exact response shape for client compatibility
- **Edge case:** Missing or extra headers could break CORS or caching

### Risk 6: Error Handling Middleware
- **Issue:** `withErrorHandling` wrapper is Lambda-specific
- **Mitigation:** Create Vercel-compatible error handling wrapper in vercel-adapter package
- **Edge case:** Uncaught errors may not be logged consistently

### Risk 7: Cold Start Performance
- **Issue:** Vercel cold starts may be slower/faster than Lambda
- **Mitigation:** Measure cold start times in local testing
- **Edge case:** Health check timeout may need adjustment

### Risk 8: Request Context Access
- **Issue:** Lambda provides `requestContext.requestId`; Vercel uses different structure
- **Mitigation:** Extract request ID from Vercel headers or generate UUID
- **Edge case:** Missing request ID should not break logging

## Deferred Questions (Future Stories)

### Q1: OpenSearch Restoration Timeline
**Question:** When will OpenSearch health checks be restored?

**Answer needed from:** Product/Architecture team

**Impact:** OpenSearch monitoring is explicitly deferred. The `opensearch: "not_monitored"` field maintains backward compatibility while signaling that monitoring is not active.

**Status:** Deferred to future story (not blocking for STORY-001)

---

### Q2: Monitoring & Alerting
**Question:** What monitoring/alerting should be set up for these endpoints?

**Metrics needed:**
- Health check failure rate
- Health check response time (p50, p95, p99)
- Config endpoint cache hit rate (if cached)

**Status:** Deferred to later story focused on observability infrastructure

---

### Q3: Dynamic Version Sourcing
**Question:** How should the version field be dynamically sourced from package.json or CI/CD?

**Impact:** Version is hardcoded to `"1.0.0"` for STORY-001 to avoid complexity. Dynamic version sourcing will be addressed in a future story.

**Status:** Deferred to future story (not blocking for STORY-001)

---

## Notes

### Scope Alignment with Index
**IMPORTANT:** The `plans/stories/stories.index.md` file currently states "no database" for STORY-001 (line 16: "Risk Notes: Minimal risk - no auth, **no database**, no external services").

This is a **documentation inconsistency**. The actual implementation scope (as defined in this story) **INCLUDES database read operations** for the health check endpoint. A health check without database monitoring provides minimal value.

**Action Required (Future Task):** Update `plans/stories/stories.index.md` entry for STORY-001 to reflect:
```markdown
**Risk Notes:** Minimal risk - no auth, **database read-only (health checks only)**, no writes, no S3
```

This documentation correction is tracked but **NOT part of STORY-001 implementation scope**. The index should be corrected before STORY-002 begins to maintain documentation accuracy.

---

## Open Questions

**NONE** - All blocking questions have been resolved in the Decisions section or deferred to future stories.

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Notes |
|---|---|---|---|
| 2026-01-17T19:32:00-07:00 | QA Agent | Initial audit of STORY-001.md (v1) | Verdict: CONDITIONAL PASS - 4 Critical, 2 Medium, 2 Low issues |
| 2026-01-17T19:38:00-07:00 | PM Agent | Updated STORY-001.md with Decisions section | Resolved: Open Questions → Decisions (Issues 3, 4 from v1 audit) |
| 2026-01-17T20:15:00-07:00 | QA Agent | Re-audit of STORY-001.md (v2) | Verdict: CONDITIONAL PASS - 2 Critical, 1 High, 2 Medium, 2 Low issues remaining |
| 2026-01-17T21:00:00-07:00 | PM Agent | Updated STORY-001.md to resolve all Critical/High issues | Fixed: C1 (scope alignment), C2 (adapter scope), H1 (opensearch field), M1 (log format), M2 (coverage enforcement), L2 (version source) |
