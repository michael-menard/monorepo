# Frontend Serverless Migration - Product Requirements Document

**Project ID:** FRONTEND-SERVERLESS-MIGRATION
**Version:** 1.0
**Date:** 2025-11-23
**Status:** Ready for Stakeholder Review
**Author:** John (Product Manager)

---

## Table of Contents

- [Intro Project Analysis and Context](#intro-project-analysis-and-context)
- [Requirements](#requirements)
- [Technical Constraints and Integration Requirements](#technical-constraints-and-integration-requirements)
- [Epic and Story Structure](#epic-and-story-structure)
- [Success Criteria](#success-criteria)
- [Appendices](#appendices)

---

## Intro Project Analysis and Context

### Analysis Source

**Analysis Available:**

- ✅ **Comprehensive Project Brief** available at: `docs/brief-frontend-serverless-migration.md`
- ✅ **Architecture Documentation** available:
  - `docs/architecture/tech-stack.md`
  - `docs/architecture/source-tree.md`
  - `docs/architecture/coding-standards.md`
- ✅ **Serverless Infrastructure** deployed at: `apps/api/lego-api-serverless/sst.config.ts`

**Analysis Type:** **Hybrid** - Combination of existing documentation + IDE-based project analysis

### Existing Project Overview

The **LEGO MOC Instructions** application is a full-stack monorepo enabling users to create, browse, and manage LEGO MOC (My Own Creation) instructions with gallery and wishlist features.

**Current Architecture:**

- **Frontend**: React 19 SPA (`lego-moc-instructions-app`) using TanStack Router, Redux Toolkit, RTK Query, Tailwind CSS
- **Backend (Legacy)**: Express.js API (`lego-projects-api`) on port 9000 with MongoDB/Mongoose + PostgreSQL/Drizzle
- **Backend (Serverless)**: AWS Lambda + API Gateway v2 (`lego-api-serverless`) deployed via SST v3 with PostgreSQL, Redis, OpenSearch, S3
- **Authentication**: AWS Cognito with JWT tokens
- **Infrastructure**: AWS-native (Lambda, API Gateway, RDS, S3, ElastiCache, OpenSearch, Cognito)

**Current State:** The backend has been **successfully migrated** to serverless, but the **frontend still points to the Express API** on port 9000, creating technical debt and blocking access to new serverless capabilities.

### Available Documentation Analysis

**Documentation Status:**

✅ **Tech Stack Documentation** - Comprehensive (docs/architecture/tech-stack.md)
✅ **Source Tree/Architecture** - Complete monorepo structure (docs/architecture/source-tree.md)
✅ **Coding Standards** - Fully defined (docs/architecture/coding-standards.md)
✅ **API Documentation** - Serverless endpoints documented in sst.config.ts (lines 598-1521)
⚠️ **External API Documentation** - Partial (API Gateway URLs TBD)
❌ **UX/UI Guidelines** - Not available (no design system documentation found)
❌ **Technical Debt Documentation** - Not formally documented (identified in brief)

**Documentation Gaps Identified:**

- API Gateway endpoint URLs for dev/staging/prod environments
- Frontend migration checklist
- Endpoint parity matrix (Express vs Serverless)
- Rollback procedure documentation

**Recommendation:** Proceed with PRD creation using available documentation. Address gaps in Epic/Story technical implementation details.

### Enhancement Scope Definition

**Enhancement Type:**
✅ **Integration with New Systems** - Frontend migration from Express → Serverless API
✅ **Technology Stack Upgrade** - Adopting serverless architecture patterns
✅ **Bug Fix and Stability Improvements** - Eliminating dual-backend technical debt

**Enhancement Description:**

Migrate the frontend React application from the legacy Express.js API (port 9000) to the AWS serverless backend (API Gateway + Lambda) using a **feature flag-based approach with staged rollout** to ensure zero user disruption and instant rollback capability.

**Impact Assessment:**
✅ **Moderate Impact** - Isolated to API configuration, RTK Query endpoints, and authentication flows
✅ **Some existing code changes** required in:

- `src/config/api.ts` (API base URLs)
- `src/services/api.ts` (RTK Query configuration)
- Authentication flows (AWS Amplify SDK integration)
- File upload logic (presigned S3 URLs for >10MB files)
- Error handling (Lambda response format standardization)

**Risk Level:** **HIGH** - Authentication, file uploads, endpoint parity, and CORS configuration are critical integration points requiring careful validation.

### Goals and Background Context

**Goals:**

- Decommission Express backend within 1 week post-migration, reducing AWS costs by ~$200/month
- Enable access to serverless-only capabilities (parts-lists, WebSocket, direct S3 uploads)
- Reduce operational overhead (single backend to monitor, ~30% on-call burden reduction)
- Achieve zero downtime and <2% error rate increase during migration
- Maintain instant rollback capability throughout 3-4 week rollout period

**Background Context:**

The backend serverless migration (`lego-api-serverless`) was completed successfully, deploying 30+ Lambda functions with API Gateway v2, enhanced capabilities (presigned S3 uploads, parts-list integration, gallery linking), and WebSocket API for real-time features.

However, the frontend continues to use the deprecated Express API, creating **dual backend maintenance overhead**, **delayed feature releases**, **increased AWS costs**, and **risk of data inconsistency**. This enhancement eliminates the technical debt by migrating frontend API calls to the serverless backend while maintaining zero user-facing disruption through a **feature flag + staged rollout** strategy.

### Change Log

| Change              | Date       | Version | Description                                                                                                                                                                  | Author                 |
| ------------------- | ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Initial Draft       | 2025-11-23 | 0.1     | PRD created from project brief                                                                                                                                               | John (PM) + Claude     |
| Technical Decisions | 2025-11-23 | 0.2     | Feature flag, rollout, cache strategy finalized                                                                                                                              | John (PM) + User Input |
| Epic & Stories      | 2025-11-23 | 1.0     | Complete PRD with 16 stories, ready for review                                                                                                                               | John (PM) + Claude     |
| PO Refinements      | 2025-11-23 | 1.1     | Added PO validation recommendations: Route53 prerequisite, accessibility, UX preservation, error handling, localStorage lock, user communication, documentation improvements | Sarah (PO) + Claude    |

---

## Requirements

### Functional Requirements

**FR1**: The frontend application SHALL switch between Express API and Serverless API based on runtime configuration fetched from `/config.json` without requiring code changes.

**FR2**: All existing MOC instruction endpoints (list, create, read, update, delete) SHALL function identically when connected to the serverless API.

**FR3**: All existing gallery endpoints (list images, upload, delete, album management) SHALL function identically when connected to the serverless API.

**FR4**: All existing wishlist endpoints (list, create, read, update, delete, image upload) SHALL function identically when connected to the serverless API.

**FR5**: The frontend SHALL support AWS Cognito JWT authentication tokens when connecting to the serverless API via Lambda authorizers.

**FR6**: File uploads >10MB SHALL use presigned S3 URLs to bypass the API Gateway 10MB payload limit.

**FR7**: The frontend SHALL handle Lambda error response formats and display user-friendly error messages without exposing internal error details.

**FR8**: CORS preflight requests SHALL succeed for all serverless endpoints with the frontend origin configured in API Gateway.

**FR9**: Health check endpoint (`/health`) SHALL be accessible to verify serverless backend availability before user interactions.

**FR10**: The frontend SHALL gracefully degrade functionality if new serverless-only endpoints (parts-lists, WebSocket) are unavailable, maintaining backward compatibility during rollout.

### Non-Functional Requirements

**NFR1**: **Performance** - P95 API response latency SHALL remain <600ms for North America users and <900ms for European users (accounting for Lambda cold starts and cross-region latency).

**NFR2**: **Availability** - The migration process SHALL maintain 100% uptime with zero user-facing downtime during rollout phases.

**NFR3**: **Error Rate** - Error rate SHALL remain <2% during staged rollout, returning to baseline within 48 hours of each stage completion.

**NFR4**: **Rollback Time** - Updating `/config.json` in S3 SHALL enable rollback to Express API within <5 minutes, with DNS weight rollback completing within <60 minutes due to DNS propagation.

**NFR5**: **Session Preservation** - Users SHALL NOT be forced to re-login during cutover from Express to serverless authentication.

**NFR6**: **Developer Productivity** - Frontend developers SHALL be productive in local development environment within 1 day of migration kickoff using SST local dev setup.

**NFR7**: **Monitoring** - CloudWatch dashboards SHALL provide visibility into frontend → Lambda request metrics (error rate, latency, throughput) within 1 day of production rollout start.

**NFR8**: **Security** - JWT token validation SHALL occur on all protected Lambda endpoints with proper 401/403 error responses for unauthorized requests.

**NFR9**: **Scalability** - The serverless backend SHALL auto-scale to handle production traffic patterns without manual intervention or performance degradation.

**NFR10**: **Observability** - Error logs SHALL include structured context (userId, endpoint, request ID) for debugging without exposing PII in CloudWatch logs.

**NFR11**: **DNS Propagation** - Route53 weighted routing changes SHALL use 60-second TTL to minimize propagation delay, with 24-hour wait periods between rollout stage advancements to ensure global propagation.

### Compatibility Requirements

**CR1**: **Existing API Compatibility** - All frontend RTK Query endpoints SHALL maintain existing request/response contracts without breaking changes during migration period (3-4 weeks).

**CR2**: **Database Schema Compatibility** - PostgreSQL database schema SHALL remain unchanged; serverless API SHALL use identical Drizzle ORM schema as Express API to ensure data consistency.

**CR3**: **UI/UX Consistency** - All user-facing functionality (MOC management, gallery, wishlist) SHALL behave identically before/after migration with no visible UI changes or feature regressions.

**CR4**: **Integration Compatibility** - Third-party integrations (S3 storage, Redis caching, OpenSearch indexing) SHALL function identically with serverless backend as they did with Express backend.

**CR5**: **Authentication Compatibility** - AWS Cognito JWT tokens SHALL be compatible across both Express and serverless backends during transition period to avoid forced logouts.

**CR6**: **Browser Compatibility** - Frontend SHALL continue supporting modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions) without compatibility regressions.

**CR7**: **Development Environment Compatibility** - Local development setup (SST local Lambda + Vite dev server) SHALL provide feature parity with existing Express development workflow.

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

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

### Integration Approach

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

### Code Organization and Standards

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

### Deployment and Operations

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

### Risk Assessment and Mitigation

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

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision:** **Single Comprehensive Epic**

**Rationale:** This frontend migration is a **cohesive technical enhancement** with tightly coupled dependencies (config infrastructure, API integration, authentication, deployment). Breaking into multiple epics would create artificial boundaries and complicate coordination. A single epic with sequenced stories ensures:

- Clear dependency management (infrastructure → integration → validation → rollout)
- Unified rollout timeline (3-4 weeks as single delivery)
- Simplified tracking and rollback decisions

**Alternative Considered:** Separate epics for "Infrastructure Setup" and "Frontend Integration" were evaluated but rejected due to tight coupling - infrastructure changes have no value until frontend integration is complete.

---

## Epic 1: Frontend Serverless Migration

**Epic Goal:** Migrate the frontend React application from the deprecated Express.js API to the AWS serverless backend (API Gateway + Lambda) using a runtime feature flag with Route53 staged rollout, achieving zero user disruption and maintaining instant rollback capability.

**Integration Requirements:**

- Shared PostgreSQL database with identical Drizzle ORM schemas (no migrations)
- Runtime configuration via `/config.json` fetched from S3 on app initialization
- Route53 weighted routing for staged rollout (10% → 25% → 50% → 100%)
- Redis cache flush automation at each rollout stage
- CloudWatch monitoring dashboards operational before production rollout

---

### Story 1.1: Runtime Configuration Infrastructure Setup

**As a** DevOps engineer,
**I want** runtime configuration infrastructure deployed to S3 with environment-specific settings,
**so that** the frontend can switch between Express and Serverless APIs without rebuild/redeploy.

#### Acceptance Criteria

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

#### Integration Verification

**IV1**: Existing S3 buckets for frontend hosting remain functional (Amplify deployment unaffected)

**IV2**: CORS configuration on S3 allows frontend origin to fetch `/config.json`

**IV3**: Manual config update test: Change `apiBaseUrl` in staging, verify frontend picks up change within 60 seconds

---

### Story 1.2: Frontend Runtime Config Fetch Implementation

**As a** frontend developer,
**I want** the application to fetch runtime configuration on initialization,
**so that** API routing can be controlled without code changes.

#### Acceptance Criteria

**AC1**: Create `src/config/runtime-config.ts` with async config fetch function and Zod validation

**AC2**: Config fetched on app initialization before Redux store setup, with retry logic (3 attempts, exponential backoff)

**AC3**: Fallback to hardcoded Express API URL if config fetch fails (safe default with console warning)

**AC4**: Last-known-good config cached in localStorage, used if fetch fails and localStorage cache exists

**AC5**: Runtime config stored in Redux store or Context for app-wide access

**AC6**: TypeScript types inferred from Zod schema: `type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>`

**AC7**: Client-side backend lock stored in localStorage with 24-hour expiration to prevent sticky routing issues. Lock checked on app init, expired locks cleared automatically.

#### Integration Verification

**IV1**: Existing app initialization flow (auth check, route setup) remains functional

**IV2**: Performance impact measured: Config fetch adds <200ms to app startup time (P95)

**IV3**: Error handling tested: S3 down → fallback to Express API, user-facing error message displayed

---

### Story 1.3: RTK Query Base URL Refactoring

**As a** frontend developer,
**I want** RTK Query to use runtime-configured API base URL instead of build-time env vars,
**so that** data fetching endpoints route to the correct backend without rebuild.

#### Acceptance Criteria

**AC1**: Update `src/services/api.ts` - `baseQuery` configuration uses runtime config API URL (not `import.meta.env.VITE_*`)

**AC2**: All existing RTK Query endpoints (MOCs, gallery, wishlist) maintain identical request/response handling

**AC3**: Remove build-time env vars: `VITE_API_GATEWAY_URL_*` from Vite config and `.env` files

**AC4**: TypeScript compilation succeeds with zero errors after refactoring

**AC5**: Unit tests updated to mock runtime config instead of env vars

#### Integration Verification

**IV1**: Existing RTK Query endpoints (`useGetMocsQuery`, `useUploadImageMutation`, etc.) function identically in local dev

**IV2**: Redux DevTools show correct API base URL in network requests

**IV3**: All existing frontend features (MOC list, upload, gallery, wishlist) work in local dev with SST serverless backend

---

### Story 1.4: AWS Cognito Authentication Integration

**As a** user,
**I want** to authenticate with AWS Cognito JWT tokens when using the serverless API,
**so that** I can access protected endpoints without re-login during migration.

#### Acceptance Criteria

**AC1**: AWS Amplify SDK integrated in frontend for Cognito authentication (replace session-based tokens)

**AC2**: JWT token automatically attached to API requests via RTK Query `prepareHeaders` function

**AC3**: Token refresh logic implemented: Expired token triggers automatic refresh before API call

**AC4**: Login/logout flows updated to use Amplify Auth API (`Auth.signIn()`, `Auth.signOut()`)

**AC5**: User session persists across page reloads using Amplify session storage

**AC6**: 401 Unauthorized responses trigger re-authentication flow (redirect to login)

#### Integration Verification

**IV1**: Existing user accounts authenticate successfully with Cognito (test with staging user pool)

**IV2**: Session preservation tested: User logged in with Express → switch to Serverless → session maintained (no forced logout)

**IV3**: Token validation tested in staging: Lambda authorizer accepts Amplify-generated JWT tokens

---

### Story 1.5: Presigned S3 URL File Upload Implementation

**As a** user,
**I want** to upload files larger than 10MB directly to S3,
**so that** file uploads succeed without API Gateway payload limit errors.

#### Acceptance Criteria

**AC1**: File upload utility detects file size: ≤10MB → direct API Gateway upload, >10MB → presigned S3 URL flow

**AC2**: Presigned URL request endpoint created: `POST /api/files/presigned-url` returns `{ url, fields, key }`

**AC3**: Frontend implements presigned S3 upload with progress tracking (use `XMLHttpRequest` or `fetch` with progress events)

**AC4**: After S3 upload completes, send S3 key to Lambda: `POST /api/files/confirm-upload` creates DB record

**AC5**: Error handling: S3 upload failure shows user-friendly message, retry option available

**AC6**: Client-side file size validation with clear error message for files exceeding max limit (document limit in UI)

#### Integration Verification

**IV1**: Existing file upload flows (MOC instructions, gallery images) work for files <10MB via API Gateway

**IV2**: Large file test (15MB image): Upload succeeds via presigned S3 URL, DB record created, file accessible in gallery

**IV3**: Boundary test: 9MB, 10MB, 11MB files all upload successfully with correct routing (Gateway vs S3)

---

### Story 1.6: Lambda Error Response Handling

**As a** developer,
**I want** standardized error handling for Lambda responses,
**so that** users see meaningful error messages without internal details exposed.

#### Acceptance Criteria

**AC1**: Update RTK Query `baseQueryWithAuth` to handle Lambda error format: `{ statusCode, message, errorCode }`

**AC2**: Error mapping created: Lambda error codes → user-friendly messages (e.g., `INVALID_FILE_TYPE` → "Please upload a valid image file")

**AC3**: HTTP status codes handled correctly: 401 (re-auth), 403 (permission denied), 404 (not found), 500 (generic error)

**AC4**: Structured error logging: Winston logs include `{ userId, endpoint, requestId, errorCode }` without PII

**AC5**: Toast notifications display user-friendly error messages (not raw API responses) following existing design system patterns and WCAG 2.1 AA accessibility standards (existing system compliance maintained)

**AC6**: Sentry or error tracking integration captures Lambda errors with context for debugging

#### Integration Verification

**IV1**: Error scenarios tested in staging: Invalid auth token → 401 → login redirect, Forbidden resource → 403 → error message

**IV2**: Internal server errors (500) do not expose stack traces or database errors to users

**IV3**: Error logs in CloudWatch contain sufficient context for debugging without exposing sensitive data

---

### Story 1.7: Redis Cache Flush Automation

**As a** DevOps engineer,
**I want** automated Redis cache flushing before each rollout stage,
**so that** users don't experience stale data during dual-backend operation.

#### Acceptance Criteria

**AC1**: Cache flush script created: `scripts/flush-migration-cache.ts` with selective pattern flushing (mocs, gallery, wishlist)

**AC2**: Script preserves critical caches: `sessions:*`, `ratelimit:*`, `user-profiles:*`

**AC3**: Dry-run mode implemented: `DRY_RUN=true` logs keys without deleting (for validation)

**AC4**: Script added to package.json: `pnpm flush:migration-cache` and `pnpm flush:migration-cache:dry-run`

**AC5**: CloudWatch metrics tracked: Redis hit/miss rate before/after flush, DB query latency spike

**AC6**: Rollout runbook documents flush procedure: Run script → Wait 2 minutes → Advance Route53 weights

**AC7**: Script includes error handling: Redis connection failures trigger retry (3 attempts, exponential backoff), timeout after 60 seconds, clear error messages logged

#### Integration Verification

**IV1**: Dry-run in staging identifies correct key patterns (manual review of output)

**IV2**: Live flush in staging: Cache cleared, preserved patterns intact (sessions still work)

**IV3**: Performance impact measured: Cache hit rate drops to ~40%, recovers to >80% within 10 minutes

---

### Story 1.8: Serverless Backend Cache Namespacing

**As a** backend engineer,
**I want** serverless Lambda functions to use `v2:` cache key prefix during migration,
**so that** cache collisions with Express backend are impossible.

#### Acceptance Criteria

**AC1**: Environment variable `MIGRATION_MODE` added to serverless backend (default: `false`)

**AC2**: Cache key generation updated: `const prefix = process.env.MIGRATION_MODE === 'true' ? 'v2:' : ''`

**AC3**: All Redis cache operations (get, set, del) use prefixed keys when migration mode enabled

**AC4**: Unit tests verify correct prefix applied in migration mode, no prefix in normal mode

**AC5**: Post-migration cleanup documented: Set `MIGRATION_MODE=false`, flush `v1:*` keys

**AC6**: Cache namespacing strategy documented in `docs/operations/redis-cache-management.md` for future brownfield migrations

#### Integration Verification

**IV1**: Staging deployment with `MIGRATION_MODE=true`: All cache operations use `v2:` prefix

**IV2**: Dual operation test: Express writes to `mocs:user:123:list`, Serverless reads from `v2:mocs:user:123:list` (no collision)

**IV3**: Cache isolation verified: User updates MOC via Express, switch to Serverless → no stale cache hit

---

### Story 1.9: Route53 Weighted Routing Configuration

**As a** DevOps engineer,
**I want** Route53 weighted routing configured for staged rollout control,
**so that** traffic can be gradually shifted from Express to Serverless API.

**Prerequisites:** DevOps must validate Route53 hosted zone exists for `api.example.com` with appropriate IAM permissions before starting this story. If hosted zone does not exist, DevOps must provision it and delegate DNS management from domain registrar.

#### Acceptance Criteria

**AC1**: Route53 hosted zone configured with two A/AAAA records: `api.example.com` pointing to Express and Serverless endpoints

**AC2**: Initial weights set: 100 (Express) / 0 (Serverless) for production environment

**AC3**: Routing configuration files created for each stage: `10-percent.json`, `25-percent.json`, `50-percent.json`, `100-percent.json`

**AC4**: TTL set to 60 seconds on Route53 records to minimize DNS propagation delay

**AC5**: Health checks configured for both Express and Serverless endpoints with 30-second intervals

**AC6**: Automated weight update script: `scripts/update-route53-weights.sh --stage <percentage>`

#### Integration Verification

**IV1**: DNS resolution tested: `dig api.example.com` returns correct endpoints with configured weights

**IV2**: Health checks functional: Unhealthy endpoint triggers CloudWatch alarm

**IV3**: Weight update tested in staging: Change from 0% → 10% Serverless, observe traffic distribution in CloudWatch metrics

---

### Story 1.10: CloudWatch Monitoring Dashboard Creation

**As a** DevOps engineer,
**I want** CloudWatch dashboards tracking frontend → Lambda metrics,
**so that** rollout health can be monitored in real-time with clear go/no-go criteria.

#### Acceptance Criteria

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

#### Integration Verification

**IV1**: Dashboard accessible to DevOps and engineering team (IAM permissions configured)

**IV2**: Metrics populate correctly during staging testing (Lambda invocations, errors visible)

**IV3**: Alarms trigger correctly when thresholds breached (test by inducing errors in staging)

---

### Story 1.11: Staging Environment Full Validation

**As a** QA engineer,
**I want** comprehensive regression testing against the serverless backend in staging,
**so that** endpoint parity and functionality are validated before production rollout.

#### Acceptance Criteria

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

#### Integration Verification

**IV1**: Zero critical bugs found in staging regression (blocking issues resolved before production)

**IV2**: All existing frontend features work identically on Serverless as they did on Express

**IV3**: QA approval obtained: "Staging validation complete, ready for production rollout"

---

### Story 1.12: Production Rollout - 10% Stage

**As a** DevOps engineer,
**I want** to route 10% of production traffic to the serverless backend,
**so that** we can validate production behavior with limited user exposure.

#### Acceptance Criteria

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

#### Integration Verification

**IV1**: Traffic distribution verified: CloudWatch shows ~10% requests hitting Serverless Lambda functions

**IV2**: Both backends operational: Express and Serverless handling requests without errors

**IV3**: User experience validated: Smoke test critical flows (login, upload MOC, browse gallery) successful

---

### Story 1.13: Production Rollout - 25% Stage

**As a** DevOps engineer,
**I want** to route 25% of production traffic to the serverless backend,
**so that** we can increase exposure while maintaining safety guardrails.

#### Acceptance Criteria

**AC1**: 24-hour wait after 10% stage completed with healthy metrics

**AC2**: Redis cache flushed before weight update

**AC3**: Route53 weights updated: 25 (Serverless) / 75 (Express)

**AC4**: Monitoring: Same criteria as 10% stage (error rate, latency, user issues)

**AC5**: 24-hour observation period before advancing to 50%

#### Integration Verification

**IV1**: Increased traffic handled successfully: Serverless auto-scales without performance degradation

**IV2**: No new issues introduced compared to 10% stage

**IV3**: Metrics remain within acceptable thresholds

---

### Story 1.14: Production Rollout - 50% Stage

**As a** DevOps engineer,
**I want** to route 50% of production traffic to the serverless backend,
**so that** we can validate equal load distribution before full cutover.

#### Acceptance Criteria

**AC1**: 24-hour wait after 25% stage completed with healthy metrics

**AC2**: Redis cache flushed before weight update

**AC3**: Route53 weights updated: 50 (Serverless) / 50 (Express)

**AC4**: Extended monitoring: 48-hour observation period (weekend coverage if needed)

**AC5**: Database load validated: PostgreSQL handles dual-backend traffic without contention issues

#### Integration Verification

**IV1**: Equal load distribution: CloudWatch shows ~50/50 split between backends

**IV2**: Database performance stable: Query latency and connection pool utilization within normal ranges

**IV3**: Cost metrics tracked: Serverless costs vs Express infrastructure savings calculated

---

### Story 1.15: Production Rollout - 100% Cutover

**As a** DevOps engineer,
**I want** to route 100% of production traffic to the serverless backend,
**so that** migration is complete and Express backend can be decommissioned.

#### Acceptance Criteria

**AC1**: 48-hour wait after 50% stage completed with healthy metrics

**AC2**: Final stakeholder approval obtained: PM, Engineering Lead, DevOps Lead sign-off

**AC3**: Redis cache flushed before weight update

**AC4**: Route53 weights updated: 100 (Serverless) / 0 (Express)

**AC5**: Express backend remains on standby for 1 week (not decommissioned immediately)

**AC6**: Rollback procedure tested but not executed: Confidence in ability to revert if needed

**AC7**: Monitoring extended: 7-day observation period before Express decommissioning

**AC8**: User-facing release notes prepared documenting backend migration (transparent to users, no action required). Posted to support portal/status page.

#### Integration Verification

**IV1**: All production traffic routes to Serverless: CloudWatch shows 100% Lambda invocations, 0% Express requests

**IV2**: Error rate and latency remain within SLAs for 48 consecutive hours

**IV3**: User feedback monitored: No increase in support tickets or complaints

---

### Story 1.16: Express Backend Decommissioning

**As a** DevOps engineer,
**I want** to safely decommission the Express backend infrastructure,
**so that** we realize cost savings and eliminate dual-maintenance burden.

#### Acceptance Criteria

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

#### Integration Verification

**IV1**: Express infrastructure terminated: No running instances, no ongoing costs

**IV2**: Application fully functional: All features work without Express backend available

**IV3**: Team confirmation: Engineering and DevOps agree migration is complete and successful

---

## Success Criteria

**Migration Success Defined:**

✅ Frontend deployed to production with serverless API integration
✅ Staged rollout completed (10% → 25% → 50% → 100%) over 5-day period
✅ Error rate remained <2% throughout rollout with no rollbacks required
✅ P95 latency maintained <600ms (NA) and <900ms (EU) for 7 consecutive days post-100% cutover
✅ Zero user-reported authentication issues or forced logouts
✅ Express backend decommissioned with $200/month cost savings realized
✅ Serverless-only capabilities (parts-lists, WebSocket) accessible for Phase 2 development

**Quality Gates:**

- **Gate 1 (Staging)**: Full QA regression pass, zero critical bugs, QA approval
- **Gate 2 (10% Production)**: 24 hours with error rate <2%, latency within SLA
- **Gate 3 (25% Production)**: 24 hours with error rate <2%, latency within SLA
- **Gate 4 (50% Production)**: 48 hours with error rate <2%, latency within SLA, database stable
- **Gate 5 (100% Production)**: 7 days with error rate <2%, latency within SLA, zero rollbacks
- **Gate 6 (Decommission)**: 7 days post-100% with stable metrics, stakeholder approval

---

## Appendices

### A. Open Questions (Resolved)

All open questions from the brief have been resolved through user clarification:

✅ **Feature Flag Mechanism**: Runtime config file (`/config.json` from S3)
✅ **Rollout Control**: Route53 weighted routing (DNS-level traffic split)
✅ **CDN Caching**: Not applicable (direct Amplify/S3 hosting, no CloudFront)
✅ **User Geography**: North America + Europe (latency SLA adjusted accordingly)
✅ **Redis Cache Strategy**: Hybrid selective flush + serverless namespacing
✅ **API Gateway URLs**: To be provided by DevOps during Story 1.1 implementation

### B. Timeline Estimate

**Total Duration**: 4-5 weeks

- **Week 1**: Infrastructure + Frontend Implementation (Stories 1.1-1.6)
- **Week 2**: Backend Changes + Automation (Stories 1.7-1.9)
- **Week 3**: Monitoring + Staging Validation (Stories 1.10-1.11)
- **Week 4**: Production Rollout (Stories 1.12-1.15, 1 day per stage + observation)
- **Week 5**: Final monitoring + Express decommissioning (Story 1.16)

### C. Risks Not Addressed (Accepted)

**Low-Priority Risks Accepted for MVP:**

- **WebSocket Migration**: Deferred to Phase 2 (out of scope)
- **Multi-Region Deployment**: Single-region acceptable for MVP, plan for Phase 2 if EU latency unacceptable
- **Provisioned Lambda Concurrency**: Not implementing initially, will evaluate post-migration if cold starts problematic
- **Advanced Feature Flags (LaunchDarkly)**: Using simple config file for MVP, can upgrade later if needed

### D. References

**Technical Documentation:**

- `/docs/architecture/source-tree.md` - Monorepo structure
- `/docs/architecture/tech-stack.md` - Frontend/backend technology stack
- `apps/api/lego-api-serverless/sst.config.ts` - Serverless infrastructure (API routes defined lines 598-1521)
- `apps/web/lego-moc-instructions-app/src/config/api.ts` - Current API configuration
- `apps/web/lego-moc-instructions-app/src/services/api.ts` - RTK Query setup

**Migration Context:**

- Express API originally on port 9000 (`apps/api/lego-projects-api/`)
- Serverless API routes: `/health`, `/api/mocs/*`, `/api/images/*`, `/api/albums/*`, `/api/wishlist/*`, `/api/moc-instructions/*/parts-lists/*`
- WebSocket API: `$connect`, `$disconnect`, `$default` routes

---

**Document Version:** 1.1
**Last Updated:** 2025-11-23
**Status:** ✅ PO Approved - Ready for Sprint Planning

---

**End of PRD**
