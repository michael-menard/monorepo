# Technical Constraints and Integration Requirements

## Existing Technology Stack

**Languages:**

- TypeScript 5.8 (strict mode, all source files)
- Node.js 20.x (Lambda runtime)

**Frontend Frameworks:**

- React 19 (functional components, hooks)
- TanStack Router (type-safe routing)
- Redux Toolkit + RTK Query (state management, data fetching)
- Tailwind CSS 4 (styling)
- Vite 6 (build tool, HMR)

**Backend Frameworks:**

- **Serverless**: AWS Lambda + API Gateway v2 (HTTP API), SST v3 (Ion) for IaC
- **Legacy**: Express.js (deprecated, port 9000)

**Database:**

- PostgreSQL 15.8 with Drizzle ORM
- RDS Proxy for Lambda connection pooling

**Caching:**

- Redis 7.1 (ElastiCache) for session management and query caching

**Search:**

- OpenSearch 2.13 for full-text search (gallery images, wishlist items, MOC instructions)

**Storage:**

- AWS S3 for MOC files, gallery images, wishlist images, user avatars
- Lifecycle policies for cost optimization

**Authentication:**

- AWS Cognito (user pools, JWT tokens)
- AWS Amplify SDK (frontend)
- Lambda authorizers (backend JWT validation)

**Infrastructure:**

- AWS (Lambda, API Gateway v2, RDS, S3, ElastiCache, OpenSearch, Cognito)
- SST v3 deployed via `sst deploy`
- VPC with public/private subnets, NAT Gateway, security groups

**Version Constraints:**

- ⚠️ **Cannot change backend API contracts** during migration (frontend adapts)
- ⚠️ **Must maintain Express backend running** until 100% rollout complete
- ⚠️ **API Gateway 10MB payload limit** requires presigned S3 workaround

## Integration Approach

**Database Integration Strategy:**

- **Shared PostgreSQL Database**: Both Express and serverless backends connect to the **same PostgreSQL 15.8 instance** using Drizzle ORM with identical schemas
- **Connection Pooling**: Serverless uses RDS Proxy; Express uses direct connection pooling
- **No Schema Changes**: Zero database migrations during frontend migration to avoid dual-write complexity
- **Cache Invalidation**: Redis cache keys follow pattern `{resource}:user:{userId}:{key}` - both backends use identical cache invalidation logic

**API Integration Strategy:**

**Runtime Feature Flag via Config File:**

- Frontend fetches `/config.json` from S3 on application initialization
- Config structure:
  ```json
  {
    "apiBaseUrl": "https://api-gateway.example.com" | "http://express-api.example.com:9000",
    "useServerless": true | false,
    "cognitoConfig": {
      "userPoolId": "...",
      "clientId": "...",
      "region": "..."
    }
  }
  ```
- **Rollback Procedure**: Update `/config.json` in S3 → Users get new config on next page refresh/app reload (~2-5 minutes for full propagation)
- **Cache Handling**: Set `Cache-Control: max-age=60` on `/config.json` to balance freshness vs performance
- **Validation**: Zod schema validates config structure on fetch, fallback to Express API if config unavailable

**Staged Rollout via Route53 Weighted Routing:**

- **DNS Setup**: Two Route53 records pointing to Express and Serverless API Gateway endpoints
- **Rollout Stages**:
  - **10%**: Route53 weight 10 (Serverless) / 90 (Express)
  - **25%**: Route53 weight 25 (Serverless) / 75 (Express)
  - **50%**: Route53 weight 50 (Serverless) / 50 (Express)
  - **100%**: Route53 weight 100 (Serverless) / 0 (Express)
- **Propagation Delay**: DNS changes take 5-60 minutes to fully propagate (update health check TTL accordingly)
- **Sticky Sessions**: Not natively supported by Route53 weighted routing - implement client-side "backend lock" using localStorage
- **Mitigation**: Once user hits Serverless, store flag in localStorage and always use Serverless endpoint for that session

**Cache Management During Migration:**

**Strategy**: Hybrid selective flush with serverless cache namespacing

- **Serverless Backend**: Uses `v2:` cache key prefix during migration period (env flag `MIGRATION_MODE=true`)
- **Express Backend**: Unchanged (uses original cache key patterns)
- **Flush Procedure**: Run selective cache flush script before each Route53 weight advancement:
  ```bash
  pnpm flush:migration-cache
  # Flushes patterns: mocs:*, gallery:*, wishlist:*, albums:*
  # Preserves: sessions:*, ratelimit:*, user-profiles:*
  ```
- **Automation**: Script developed in `scripts/flush-migration-cache.ts` with dry-run mode for validation
- **Performance Impact**: Expected 5-10 minute cache miss spike, monitored via CloudWatch Redis metrics
- **Post-Migration**: Remove `v2:` prefix from serverless backend after Express decommissioned

**Endpoint Mapping**: All Express endpoints (`/api/mocs/*`, `/api/images/*`, `/api/wishlist/*`) have 1:1 serverless equivalents at same paths

**Response Format Standardization**: Validate serverless responses match Express format `{ status, message, data }` structure in staging

**Error Handling**: Update `baseQueryWithAuth` in RTK Query to handle Lambda error formats (standardized `ApiError` class)

**Frontend Integration Strategy:**

- **RTK Query Refactoring**: No changes to endpoint definitions (`getMocs`, `uploadImage`, etc.) - only `baseQuery` configuration updated
- **Authentication Flow**: Replace session-based tokens with AWS Amplify SDK for Cognito JWT token management
- **CORS Configuration**: API Gateway configured with frontend origin (`https://app.example.com`, `http://localhost:3002`)
- **File Upload Strategy**:
  - Files ≤10MB: Direct upload to API Gateway (multipart/form-data)
  - Files >10MB: Request presigned S3 URL from Lambda, upload directly to S3, send S3 key to Lambda for database record creation
- **Health Check**: Call `/health` endpoint on app initialization to verify backend availability before user interactions

**Testing Integration Strategy:**

- **Staging Validation**: Full QA regression suite run against serverless backend in staging environment before production rollout
- **E2E Test Updates**: Update Playwright configs to point E2E tests at staging serverless endpoints (not Express)
- **Endpoint Parity Matrix**: Create checklist mapping every Express endpoint to serverless equivalent with validation status
- **Smoke Tests**: Run critical user flows (login, upload MOC, browse gallery) after each rollout stage (10% → 25% → 50% → 100%)

## Code Organization and Standards

**File Structure Approach:**

- **API Configuration**: `apps/web/lego-moc-instructions-app/src/config/api.ts` - centralized API base URL with feature flag logic
- **Environment Config**: `apps/web/lego-moc-instructions-app/src/config/environment.ts` - Zod-validated env vars (API Gateway URLs, Cognito config)
- **RTK Query**: `apps/web/lego-moc-instructions-app/src/services/api.ts` - `baseQueryWithAuth` updated for Lambda error handling
- **Authentication**: Use existing `@repo/auth` package, extend with AWS Amplify SDK integration
- **Local Development**: SST local dev documented in `docs/development-setup.md` with Vite proxy configuration

**Naming Conventions:**

- Follow existing monorepo standards (kebab-case files, PascalCase components, camelCase functions)
- Feature flag: `VITE_USE_SERVERLESS_API` (boolean: `"true"` | `"false"`)
- Environment variables: `VITE_API_GATEWAY_URL_*` (dev/staging/prod), `VITE_COGNITO_*` (user pool ID, client ID)

**Coding Standards:**

- TypeScript strict mode (no `any` types)
- Zod schemas for all environment variable validation
- RTK Query exclusively for data fetching (no axios/fetch in feature code)
- Winston logger (no console.log in production)
- Custom error classes (no `throw new Error()`)

**Documentation Standards:**

- Update `CLAUDE.md` with serverless API integration patterns
- Create `docs/frontend-serverless-migration.md` with rollout procedure, rollback steps, troubleshooting guide
- Add JSDoc comments to new presigned S3 upload utility functions

## Deployment and Operations

**Build Process Integration:**

- **Frontend Build**: `pnpm build` in `apps/web/lego-moc-instructions-app` - output to `dist/` for Amplify deployment
- Frontend build does NOT embed API URLs (runtime config used instead)
- `/config.json` deployed separately to S3 root, managed via infrastructure-as-code (Terraform/CDK)
- Different `/config.json` per environment (dev/staging/prod S3 buckets)

**Deployment Strategy:**

- **Staging Validation**: Deploy frontend, update staging `/config.json` to point to serverless, run full QA regression
- **Production Rollout**:
  1. Deploy frontend (agnostic to backend choice)
  2. Initial `/config.json` points to Express (`"useServerless": false`)
  3. Advance Route53 weights: 10% → 25% → 50% → 100% over 5-day period
  4. Monitor CloudWatch metrics between each stage (wait 24 hours if metrics healthy)
  5. After 100% cutover, wait 1 week, then decommission Express

**Rollback Procedure:**

- **Method 1 (DNS)**: Update Route53 weights back to 100% Express (takes 5-60 min DNS propagation)
- **Method 2 (Config)**: Update `/config.json` to `"useServerless": false` (users get change within 60 seconds due to Cache-Control: max-age=60)
- **Both methods can run in parallel** for defense-in-depth
- **Expected Rollback Time**: 2-5 minutes for most users

**Monitoring and Logging:**

- **CloudWatch Dashboards**: Create dashboard tracking:
  - Lambda invocation count, error count, duration (P50/P95/P99)
  - API Gateway 4xx/5xx errors, latency
  - Frontend → Lambda request volume by endpoint
  - Redis cache hit/miss rate
  - PostgreSQL query latency
- **Alarms**: Set alarms for:
  - Error rate >2% sustained for 5 minutes
  - P95 latency >600ms (NA) or >900ms (EU) sustained for 5 minutes
  - Lambda concurrent execution approaching account limits
- **Structured Logging**: Winston logs include `{ userId, endpoint, requestId, responseTime }` without PII
- **X-Ray Tracing**: Enable for critical paths (MOC upload, gallery search) to debug latency issues
- **CloudWatch Metrics by Backend**: Tag metrics with `backend=express|serverless` to compare side-by-side during dual operation
- **Route53 Health Checks**: Monitor both Express and Serverless endpoints, alert if either becomes unhealthy

**Configuration Management:**

- **Development**: `/config.json` → `{"apiBaseUrl": "http://localhost:3000", "useServerless": true}` (SST local dev)
- **Staging**: `/config.json` → `{"apiBaseUrl": "https://staging-api-gateway.example.com", "useServerless": true}`
- **Production**: `/config.json` → Initially Express, toggle via S3 update (no Terraform apply needed for toggle)

## Risk Assessment and Mitigation

**Technical Risks:**

**Risk T1 - API Gateway URL Misconfiguration:**

- **Impact**: All API calls fail → complete application breakage
- **Mitigation**:
  - Validate URLs in staging with health check endpoint
  - Add runtime health check on app initialization, fail-fast with user-friendly error if API unreachable
  - Document correct URLs in `.env.example` with comments

**Risk T2 - JWT Token Format Incompatibility:**

- **Impact**: Authentication broken → users locked out
- **Mitigation**:
  - Validate Cognito tokens against Lambda authorizers in staging
  - Test token refresh flows (expired token → automatic refresh)
  - Ensure AWS Amplify SDK version compatibility with Lambda authorizer expectations
  - Include token validation test in QA regression suite

**Risk T3 - File Upload Failures (>10MB):**

- **Impact**: Large file uploads fail or corrupt
- **Mitigation**:
  - Implement presigned S3 URL flow for files >10MB (bypass API Gateway)
  - Test boundary cases (9MB, 10MB, 11MB files) in staging
  - Add client-side file size validation with clear error messages
  - Document max file size limits in UI

**Risk T4 - Lambda Cold Start Latency:**

- **Impact**: First-request latency spikes → poor UX
- **Mitigation**:
  - Set realistic timeout expectations (P95 <600ms accounts for cold starts)
  - Add loading states to UI for all API calls
  - Consider provisioned concurrency for high-traffic endpoints post-MVP (cost trade-off)
  - Monitor cold start frequency in CloudWatch

**Risk T5 - Config File Fetch Failure:**

- **Impact**: If `/config.json` fetch fails (S3 down, CORS issue), entire app breaks
- **Mitigation**:
  - Implement fallback: If config fetch fails, use hardcoded Express API URL as safe default
  - Add retry logic with exponential backoff (3 attempts over 5 seconds)
  - Cache last-known-good config in localStorage, use cached version if fetch fails
  - Monitor `/config.json` fetch success rate in analytics

**Risk T6 - Redis Cache Collisions:**

- **Impact**: Route53 doesn't provide sticky sessions - same user could hit Express then Serverless in consecutive requests, seeing inconsistent cached data
- **Mitigation Strategy**: Hybrid approach combining selective cache flush with serverless cache namespacing
- **Implementation**:
  - Selective flush script targets data caches only (preserves auth/session caches)
  - Serverless backend uses `v2:` prefix during migration to avoid collisions
  - Automation script tested in staging before production use
- **Monitoring**: Track Redis hit/miss rate and DB query latency for 30 minutes post-flush
- **Acceptance Criteria**: Cache hit rate recovers to >80% within 10 minutes of flush

**Integration Risks:**

**Risk I1 - Missing Endpoints:**

- **Impact**: Features silently break (search, stats)
- **Mitigation**:
  - Create endpoint parity checklist (Express vs Serverless) - validate 100% coverage
  - Test all frontend features in staging (not just happy paths)
  - Implement graceful degradation for non-critical endpoints
  - Run Playwright E2E suite against serverless backend before production

**Risk I2 - CORS Configuration Mismatch:**

- **Impact**: Preflight requests fail → API calls blocked by browser
- **Mitigation**:
  - Test preflight OPTIONS requests in staging
  - Verify custom headers allowed (`Authorization`, `Content-Type`)
  - Document CORS config in `sst.config.ts` with frontend origins

**Risk I3 - Error Response Format Differences:**

- **Impact**: Poor UX, error messages not displayed correctly
- **Mitigation**:
  - Standardize Lambda error formats (use `ApiError` class)
  - Update RTK Query `baseQueryWithAuth` to handle Lambda error structure
  - Test error scenarios in staging (401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error)

**Risk I4 - OpenSearch Index Lag:**

- **Impact**: OpenSearch indexing may be **asynchronous**. If Express writes to DB → indexing delayed → Serverless search misses new data
- **Mitigation**:
  - Verify OpenSearch indexing triggers are **synchronous** or have minimal delay (<5s)
  - Test search functionality in staging immediately after create/update operations
  - Add search reindex job to rollout checklist if necessary

**Risk I5 - Geographic Latency for EU Users:**

- **Impact**: EU users experience higher latency with single-region (us-east-1) API Gateway
- **Mitigation**:
  - **Staging**: Test from EU regions (VPN or cloud VMs) to measure actual latency
  - **SLA Adjustment**: NFR1 updated to "P95 latency <600ms for NA users, <900ms for EU users"
  - **Phase 2 Planning**: Document multi-region API Gateway deployment as post-MVP improvement
  - **Monitoring**: Segment latency metrics by user geography (CloudWatch geo dimensions)

**Deployment Risks:**

**Risk D1 - No Rollback Plan Tested:**

- **Impact**: Cannot recover from production issues quickly
- **Mitigation**:
  - **Feature flag provides instant rollback** - document exact procedure
  - Test rollback in staging (toggle flag, verify Express fallback works)
  - Time rollback procedure (must complete in <5 minutes for config, <60 minutes for DNS)
  - Include rollback decision criteria in runbook

**Risk D2 - E2E Tests Pointing to Express:**

- **Impact**: Tests pass but serverless backend has issues
- **Mitigation**:
  - Update Playwright configs to run against staging serverless backend
  - Run E2E suite as part of staging validation (before production rollout)
  - Update CI/CD to run E2E tests against correct backend based on environment

**Risk D3 - Inadequate Monitoring During Rollout:**

- **Impact**: Issues not detected until widespread user impact
- **Mitigation**:
  - Create CloudWatch dashboard **before** rollout starts
  - Set up alarms with PagerDuty/Slack notifications
  - Manual monitoring during each rollout stage advancement (10% → 25% → 50%)
  - Define go/no-go criteria for advancing stages (error rate, latency thresholds)

**Risk D4 - CI/CD Pipeline Breakage:**

- **Impact**: Automated deployments may fail if environment-specific configs are not set in CI secrets
- **Mitigation**:
  - Pre-validate all CI/CD secrets exist before rollout week
  - Dry-run production deployment to staging environment
  - Document all required secrets in deployment runbook

**Risk D5 - Route53 DNS Propagation Delay:**

- **Impact**: Weight changes take 5-60 minutes to propagate globally, making rollout stages unpredictable
- **Mitigation**:
  - Set Route53 TTL to 60 seconds (minimize propagation delay)
  - Wait 24 hours between stage advancements (ensure full propagation)
  - Monitor actual traffic distribution via CloudWatch (may not match expected % during propagation)
  - Accept that "10% rollout" is approximate, not exact

**Operational Risks:**

**Risk O1 - Local Development Environment Parity:**

- **Impact**: SST local dev uses **mock Lambda environment**, not identical to production. File upload limits, timeout behaviors may differ.
- **Mitigation**:
  - Document known differences between SST local and production Lambda
  - Require staging testing for all file upload changes (don't trust local only)
  - Consider Docker-based local dev that mirrors Lambda runtime more closely

**Risk O2 - Feature Flag State Tracking:**

- **Impact**: Multiple environments (dev/staging/prod) + feature flag state = confusion about "which environment is on serverless?"
- **Mitigation**:
  - Centralized feature flag dashboard (even if just env var, track in Confluence/Notion)
  - Add `/debug/config` endpoint showing current backend in use (dev/staging only, not prod)
  - Slack notifications when production feature flag changes

**Risk O3 - Monitoring Alert Fatigue:**

- **Impact**: Too many alarms during rollout (cold start spikes, transient errors) → DevOps ignores real issues
- **Mitigation**:
  - Tune alarm thresholds higher during rollout period (e.g., 5% error rate instead of 2%)
  - Use separate "rollout-specific" alarms vs "business-as-usual" alarms
  - Implement composite alarms (only alert if multiple conditions met)

**Risk O4 - Client-Side Backend Lock Complexity:**

- **Impact**: localStorage "backend lock" adds client-side logic that could have bugs (infinite Serverless lock if user never clears localStorage)
- **Mitigation**:
  - Implement lock expiration (24 hours)
  - Add admin UI toggle to clear backend lock for testing
  - Document lock behavior in developer guide

---
