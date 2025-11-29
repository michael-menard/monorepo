# Epic 1: Frontend Serverless Migration

**Epic Goal:** Migrate the frontend React application from the deprecated Express.js API to the AWS serverless backend (API Gateway + Lambda) using a runtime feature flag with Route53 staged rollout, achieving zero user disruption and maintaining instant rollback capability.

**Integration Requirements:**

- Shared PostgreSQL database with identical Drizzle ORM schemas (no migrations)
- Runtime configuration via `/config.json` fetched from S3 on app initialization
- Route53 weighted routing for staged rollout (10% → 25% → 50% → 100%)
- Redis cache flush automation at each rollout stage
- CloudWatch monitoring dashboards operational before production rollout

---

## Story 1.1: Runtime Configuration Infrastructure Setup

**As a** DevOps engineer,
**I want** runtime configuration infrastructure deployed to S3 with environment-specific settings,
**so that** the frontend can switch between Express and Serverless APIs without rebuild/redeploy.

### Acceptance Criteria

**AC1**: `/config.json` deployed to S3 buckets for dev, staging, and production environments with correct permissions (public-read)

**AC2**: Config file structure validated with Zod schema:

```json
{
  "apiBaseUrl": "string (URL)",
  "useServerless": boolean,
  "cognitoConfig": {
    "userPoolId": "string",
    "clientId": "string",
    "region": "string"
  }
}
```

**AC3**: Cache-Control header set to `max-age=60` on S3 config files for 1-minute cache TTL

**AC4**: Infrastructure-as-code (Terraform/CDK) manages config file deployment with separate values per environment

**AC5**: Config update procedure documented in `docs/operations/config-management.md` with rollback steps

### Integration Verification

**IV1**: Existing S3 buckets for frontend hosting remain functional (Amplify deployment unaffected)

**IV2**: CORS configuration on S3 allows frontend origin to fetch `/config.json`

**IV3**: Manual config update test: Change `apiBaseUrl` in staging, verify frontend picks up change within 60 seconds

---

## Story 1.2: Frontend Runtime Config Fetch Implementation

**As a** frontend developer,
**I want** the application to fetch runtime configuration on initialization,
**so that** API routing can be controlled without code changes.

### Acceptance Criteria

**AC1**: Create `src/config/runtime-config.ts` with async config fetch function and Zod validation

**AC2**: Config fetched on app initialization before Redux store setup, with retry logic (3 attempts, exponential backoff)

**AC3**: Fallback to hardcoded Express API URL if config fetch fails (safe default with console warning)

**AC4**: Last-known-good config cached in localStorage, used if fetch fails and localStorage cache exists

**AC5**: Runtime config stored in Redux store or Context for app-wide access

**AC6**: TypeScript types inferred from Zod schema: `type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>`

**AC7**: Client-side backend lock stored in localStorage with 24-hour expiration to prevent sticky routing issues. Lock checked on app init, expired locks cleared automatically.

### Integration Verification

**IV1**: Existing app initialization flow (auth check, route setup) remains functional

**IV2**: Performance impact measured: Config fetch adds <200ms to app startup time (P95)

**IV3**: Error handling tested: S3 down → fallback to Express API, user-facing error message displayed

---

## Story 1.3: RTK Query Base URL Refactoring

**As a** frontend developer,
**I want** RTK Query to use runtime-configured API base URL instead of build-time env vars,
**so that** data fetching endpoints route to the correct backend without rebuild.

### Acceptance Criteria

**AC1**: Update `src/services/api.ts` - `baseQuery` configuration uses runtime config API URL (not `import.meta.env.VITE_*`)

**AC2**: All existing RTK Query endpoints (MOCs, gallery, wishlist) maintain identical request/response handling

**AC3**: Remove build-time env vars: `VITE_API_GATEWAY_URL_*` from Vite config and `.env` files

**AC4**: TypeScript compilation succeeds with zero errors after refactoring

**AC5**: Unit tests updated to mock runtime config instead of env vars

### Integration Verification

**IV1**: Existing RTK Query endpoints (`useGetMocsQuery`, `useUploadImageMutation`, etc.) function identically in local dev

**IV2**: Redux DevTools show correct API base URL in network requests

**IV3**: All existing frontend features (MOC list, upload, gallery, wishlist) work in local dev with SST serverless backend

---

## Story 1.4: AWS Cognito Authentication Integration

**As a** user,
**I want** to authenticate with AWS Cognito JWT tokens when using the serverless API,
**so that** I can access protected endpoints without re-login during migration.

### Acceptance Criteria

**AC1**: AWS Amplify SDK integrated in frontend for Cognito authentication (replace session-based tokens)

**AC2**: JWT token automatically attached to API requests via RTK Query `prepareHeaders` function

**AC3**: Token refresh logic implemented: Expired token triggers automatic refresh before API call

**AC4**: Login/logout flows updated to use Amplify Auth API (`Auth.signIn()`, `Auth.signOut()`)

**AC5**: User session persists across page reloads using Amplify session storage

**AC6**: 401 Unauthorized responses trigger re-authentication flow (redirect to login)

### Integration Verification

**IV1**: Existing user accounts authenticate successfully with Cognito (test with staging user pool)

**IV2**: Session preservation tested: User logged in with Express → switch to Serverless → session maintained (no forced logout)

**IV3**: Token validation tested in staging: Lambda authorizer accepts Amplify-generated JWT tokens

---

## Story 1.5: Presigned S3 URL File Upload Implementation

**As a** user,
**I want** to upload files larger than 10MB directly to S3,
**so that** file uploads succeed without API Gateway payload limit errors.

### Acceptance Criteria

**AC1**: File upload utility detects file size: ≤10MB → direct API Gateway upload, >10MB → presigned S3 URL flow

**AC2**: Presigned URL request endpoint created: `POST /api/files/presigned-url` returns `{ url, fields, key }`

**AC3**: Frontend implements presigned S3 upload with progress tracking (use `XMLHttpRequest` or `fetch` with progress events)

**AC4**: After S3 upload completes, send S3 key to Lambda: `POST /api/files/confirm-upload` creates DB record

**AC5**: Error handling: S3 upload failure shows user-friendly message, retry option available

**AC6**: Client-side file size validation with clear error message for files exceeding max limit (document limit in UI)

### Integration Verification

**IV1**: Existing file upload flows (MOC instructions, gallery images) work for files <10MB via API Gateway

**IV2**: Large file test (15MB image): Upload succeeds via presigned S3 URL, DB record created, file accessible in gallery

**IV3**: Boundary test: 9MB, 10MB, 11MB files all upload successfully with correct routing (Gateway vs S3)

---

## Story 1.6: Lambda Error Response Handling

**As a** developer,
**I want** standardized error handling for Lambda responses,
**so that** users see meaningful error messages without internal details exposed.

### Acceptance Criteria

**AC1**: Update RTK Query `baseQueryWithAuth` to handle Lambda error format: `{ statusCode, message, errorCode }`

**AC2**: Error mapping created: Lambda error codes → user-friendly messages (e.g., `INVALID_FILE_TYPE` → "Please upload a valid image file")

**AC3**: HTTP status codes handled correctly: 401 (re-auth), 403 (permission denied), 404 (not found), 500 (generic error)

**AC4**: Structured error logging: Winston logs include `{ userId, endpoint, requestId, errorCode }` without PII

**AC5**: Toast notifications display user-friendly error messages (not raw API responses) following existing design system patterns and WCAG 2.1 AA accessibility standards (existing system compliance maintained)

**AC6**: Sentry or error tracking integration captures Lambda errors with context for debugging

### Integration Verification

**IV1**: Error scenarios tested in staging: Invalid auth token → 401 → login redirect, Forbidden resource → 403 → error message

**IV2**: Internal server errors (500) do not expose stack traces or database errors to users

**IV3**: Error logs in CloudWatch contain sufficient context for debugging without exposing sensitive data

---

## Story 1.7: Redis Cache Flush Automation

**As a** DevOps engineer,
**I want** automated Redis cache flushing before each rollout stage,
**so that** users don't experience stale data during dual-backend operation.

### Acceptance Criteria

**AC1**: Cache flush script created: `scripts/flush-migration-cache.ts` with selective pattern flushing (mocs, gallery, wishlist)

**AC2**: Script preserves critical caches: `sessions:*`, `ratelimit:*`, `user-profiles:*`

**AC3**: Dry-run mode implemented: `DRY_RUN=true` logs keys without deleting (for validation)

**AC4**: Script added to package.json: `pnpm flush:migration-cache` and `pnpm flush:migration-cache:dry-run`

**AC5**: CloudWatch metrics tracked: Redis hit/miss rate before/after flush, DB query latency spike

**AC6**: Rollout runbook documents flush procedure: Run script → Wait 2 minutes → Advance Route53 weights

**AC7**: Script includes error handling: Redis connection failures trigger retry (3 attempts, exponential backoff), timeout after 60 seconds, clear error messages logged

### Integration Verification

**IV1**: Dry-run in staging identifies correct key patterns (manual review of output)

**IV2**: Live flush in staging: Cache cleared, preserved patterns intact (sessions still work)

**IV3**: Performance impact measured: Cache hit rate drops to ~40%, recovers to >80% within 10 minutes

---

## Story 1.8: Serverless Backend Cache Namespacing

**As a** backend engineer,
**I want** serverless Lambda functions to use `v2:` cache key prefix during migration,
**so that** cache collisions with Express backend are impossible.

### Acceptance Criteria

**AC1**: Environment variable `MIGRATION_MODE` added to serverless backend (default: `false`)

**AC2**: Cache key generation updated: `const prefix = process.env.MIGRATION_MODE === 'true' ? 'v2:' : ''`

**AC3**: All Redis cache operations (get, set, del) use prefixed keys when migration mode enabled

**AC4**: Unit tests verify correct prefix applied in migration mode, no prefix in normal mode

**AC5**: Post-migration cleanup documented: Set `MIGRATION_MODE=false`, flush `v1:*` keys

**AC6**: Cache namespacing strategy documented in `docs/operations/redis-cache-management.md` for future brownfield migrations

### Integration Verification

**IV1**: Staging deployment with `MIGRATION_MODE=true`: All cache operations use `v2:` prefix

**IV2**: Dual operation test: Express writes to `mocs:user:123:list`, Serverless reads from `v2:mocs:user:123:list` (no collision)

**IV3**: Cache isolation verified: User updates MOC via Express, switch to Serverless → no stale cache hit

---

## Story 1.9: Route53 Weighted Routing Configuration

**As a** DevOps engineer,
**I want** Route53 weighted routing configured for staged rollout control,
**so that** traffic can be gradually shifted from Express to Serverless API.

**Prerequisites:** DevOps must validate Route53 hosted zone exists for `api.example.com` with appropriate IAM permissions before starting this story. If hosted zone does not exist, DevOps must provision it and delegate DNS management from domain registrar.

### Acceptance Criteria

**AC1**: Route53 hosted zone configured with two A/AAAA records: `api.example.com` pointing to Express and Serverless endpoints

**AC2**: Initial weights set: 100 (Express) / 0 (Serverless) for production environment

**AC3**: Routing configuration files created for each stage: `10-percent.json`, `25-percent.json`, `50-percent.json`, `100-percent.json`

**AC4**: TTL set to 60 seconds on Route53 records to minimize DNS propagation delay

**AC5**: Health checks configured for both Express and Serverless endpoints with 30-second intervals

**AC6**: Automated weight update script: `scripts/update-route53-weights.sh --stage <percentage>`

### Integration Verification

**IV1**: DNS resolution tested: `dig api.example.com` returns correct endpoints with configured weights

**IV2**: Health checks functional: Unhealthy endpoint triggers CloudWatch alarm

**IV3**: Weight update tested in staging: Change from 0% → 10% Serverless, observe traffic distribution in CloudWatch metrics

---

## Story 1.10: CloudWatch Monitoring Dashboard Creation

**As a** DevOps engineer,
**I want** CloudWatch dashboards tracking frontend → Lambda metrics,
**so that** rollout health can be monitored in real-time with clear go/no-go criteria.

### Acceptance Criteria

**AC1**: CloudWatch dashboard created: "Frontend-Serverless-Migration" with widgets for:

- Lambda invocation count (by function)
- Lambda error rate (4xx, 5xx)
- Lambda duration (P50, P95, P99)
- API Gateway request count
- Redis cache hit/miss rate
- PostgreSQL query latency

**AC2**: Alarms configured:

- Error rate >2% sustained for 5 minutes → PagerDuty/Slack alert
- P95 latency >600ms (NA) or >900ms (EU) sustained for 5 minutes → alert
- Lambda concurrent execution >80% of account limit → alert

**AC3**: Comparison widgets show Express vs Serverless metrics side-by-side during dual operation

**AC4**: Geographic latency tracking: Separate metrics for NA vs EU users (CloudWatch Insights queries)

**AC5**: Dashboard JSON exported to infrastructure repo for version control and disaster recovery

### Integration Verification

**IV1**: Dashboard accessible to DevOps and engineering team (IAM permissions configured)

**IV2**: Metrics populate correctly during staging testing (Lambda invocations, errors visible)

**IV3**: Alarms trigger correctly when thresholds breached (test by inducing errors in staging)

---

## Story 1.11: Staging Environment Full Validation

**As a** QA engineer,
**I want** comprehensive regression testing against the serverless backend in staging,
**so that** endpoint parity and functionality are validated before production rollout.

### Acceptance Criteria

**AC1**: Staging frontend deployed with `/config.json` pointing to serverless API Gateway

**AC2**: Endpoint parity matrix created: All Express endpoints mapped to Serverless equivalents with test status

**AC3**: Full QA regression suite executed:

- User authentication (login, logout, token refresh) validated against existing UX patterns - no UI/UX regressions
- MOC CRUD operations (create, read, update, delete)
- File uploads (<10MB via Gateway, >10MB via presigned S3)
- Gallery management (upload images, create albums, search)
- Wishlist CRUD operations
- Error scenarios (invalid auth, forbidden access, not found, server errors)

**AC4**: Playwright E2E tests run against staging serverless backend (config updated from Express)

**AC5**: Performance validated: P95 latency <600ms for NA regions, <900ms for EU regions

**AC6**: Test results documented in `docs/qa/staging-validation-report.md` with pass/fail status for each feature

### Integration Verification

**IV1**: Zero critical bugs found in staging regression (blocking issues resolved before production)

**IV2**: All existing frontend features work identically on Serverless as they did on Express

**IV3**: QA approval obtained: "Staging validation complete, ready for production rollout"

---

## Story 1.12: Production Rollout - 10% Stage

**As a** DevOps engineer,
**I want** to route 10% of production traffic to the serverless backend,
**so that** we can validate production behavior with limited user exposure.

### Acceptance Criteria

**AC1**: Pre-rollout checklist completed:

- CloudWatch dashboard operational
- Alarms configured and tested
- Redis cache flush script tested in dry-run
- Team notified in Slack: "10% rollout starting"

**AC2**: Redis cache flushed: `pnpm flush:migration-cache` executed, 2-minute wait before Route53 update

**AC3**: Route53 weights updated: 10 (Serverless) / 90 (Express)

**AC4**: Monitoring period: 30 minutes active observation, then 24-hour passive monitoring

**AC5**: Go/no-go criteria met:

- Error rate <2% increase vs baseline
- P95 latency <600ms (NA), <900ms (EU)
- No critical user-reported issues
- Cache hit rate recovered to >80%

**AC6**: Rollback procedure ready: Scripts tested, team briefed on rollback decision criteria

### Integration Verification

**IV1**: Traffic distribution verified: CloudWatch shows ~10% requests hitting Serverless Lambda functions

**IV2**: Both backends operational: Express and Serverless handling requests without errors

**IV3**: User experience validated: Smoke test critical flows (login, upload MOC, browse gallery) successful

---

## Story 1.13: Production Rollout - 25% Stage

**As a** DevOps engineer,
**I want** to route 25% of production traffic to the serverless backend,
**so that** we can increase exposure while maintaining safety guardrails.

### Acceptance Criteria

**AC1**: 24-hour wait after 10% stage completed with healthy metrics

**AC2**: Redis cache flushed before weight update

**AC3**: Route53 weights updated: 25 (Serverless) / 75 (Express)

**AC4**: Monitoring: Same criteria as 10% stage (error rate, latency, user issues)

**AC5**: 24-hour observation period before advancing to 50%

### Integration Verification

**IV1**: Increased traffic handled successfully: Serverless auto-scales without performance degradation

**IV2**: No new issues introduced compared to 10% stage

**IV3**: Metrics remain within acceptable thresholds

---

## Story 1.14: Production Rollout - 50% Stage

**As a** DevOps engineer,
**I want** to route 50% of production traffic to the serverless backend,
**so that** we can validate equal load distribution before full cutover.

### Acceptance Criteria

**AC1**: 24-hour wait after 25% stage completed with healthy metrics

**AC2**: Redis cache flushed before weight update

**AC3**: Route53 weights updated: 50 (Serverless) / 50 (Express)

**AC4**: Extended monitoring: 48-hour observation period (weekend coverage if needed)

**AC5**: Database load validated: PostgreSQL handles dual-backend traffic without contention issues

### Integration Verification

**IV1**: Equal load distribution: CloudWatch shows ~50/50 split between backends

**IV2**: Database performance stable: Query latency and connection pool utilization within normal ranges

**IV3**: Cost metrics tracked: Serverless costs vs Express infrastructure savings calculated

---

## Story 1.15: Production Rollout - 100% Cutover

**As a** DevOps engineer,
**I want** to route 100% of production traffic to the serverless backend,
**so that** migration is complete and Express backend can be decommissioned.

### Acceptance Criteria

**AC1**: 48-hour wait after 50% stage completed with healthy metrics

**AC2**: Final stakeholder approval obtained: PM, Engineering Lead, DevOps Lead sign-off

**AC3**: Redis cache flushed before weight update

**AC4**: Route53 weights updated: 100 (Serverless) / 0 (Express)

**AC5**: Express backend remains on standby for 1 week (not decommissioned immediately)

**AC6**: Rollback procedure tested but not executed: Confidence in ability to revert if needed

**AC7**: Monitoring extended: 7-day observation period before Express decommissioning

**AC8**: User-facing release notes prepared documenting backend migration (transparent to users, no action required). Posted to support portal/status page.

### Integration Verification

**IV1**: All production traffic routes to Serverless: CloudWatch shows 100% Lambda invocations, 0% Express requests

**IV2**: Error rate and latency remain within SLAs for 48 consecutive hours

**IV3**: User feedback monitored: No increase in support tickets or complaints

---

## Story 1.16: Express Backend Decommissioning

**As a** DevOps engineer,
**I want** to safely decommission the Express backend infrastructure,
**so that** we realize cost savings and eliminate dual-maintenance burden.

### Acceptance Criteria

**AC1**: 1-week wait after 100% cutover with zero rollbacks and stable metrics

**AC2**: Final data validation: PostgreSQL, Redis, S3 contain no Express-specific data dependencies

**AC3**: Express backend shutdown:

- Stop EC2/ECS instances or disable service
- Remove Route53 DNS record for Express endpoint (retain 0-weight record for 1 week as safety)
- Archive Express codebase to GitHub with "DEPRECATED" tag

**AC4**: Cost savings validated: $200/month reduction in AWS bill confirmed in next billing cycle

**AC5**: Documentation updated:

- Remove Express API references from developer guides
- Update architecture diagrams to show only Serverless backend
- Archive Express-specific troubleshooting docs

**AC6**: Post-migration cleanup:

- Remove `MIGRATION_MODE` env var from Serverless backend
- Flush `v1:*` Redis cache keys
- Remove `/config.json` feature flag (embed API Gateway URL in frontend build for future deployments)

**AC7**: Post-migration retrospective conducted, lessons learned documented in `docs/retrospectives/frontend-serverless-migration.md` for future reference

**AC8**: Support team briefed on migration, runbook shared, common troubleshooting scenarios documented

### Integration Verification

**IV1**: Express infrastructure terminated: No running instances, no ongoing costs

**IV2**: Application fully functional: All features work without Express backend available

**IV3**: Team confirmation: Engineering and DevOps agree migration is complete and successful

---
