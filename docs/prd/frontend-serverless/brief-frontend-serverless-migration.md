# Project Brief: Frontend Serverless Migration

**Project ID:** FRONTEND-SERVERLESS-MIGRATION
**Date:** 2025-11-23
**Analyst:** Mary (Business Analyst)
**Status:** Draft - Awaiting Stakeholder Review

---

## Executive Summary

The LEGO MOC Instructions application is migrating from a traditional Express.js backend to an AWS serverless architecture using SST v3, Lambda, and API Gateway. The frontend React application (`lego-moc-instructions-app`) must be updated to communicate with the new serverless endpoints while maintaining zero user disruption and providing instant rollback capability.

**Key Challenge:** Safely migrate frontend API calls from Express (port 9000) to API Gateway/Lambda while mitigating risks around authentication, file uploads, CORS, response formats, and endpoint parity.

**Recommended Approach:** Hybrid strategy combining feature flag toggle with staged rollout, enabling instant rollback and gradual user exposure over a 3-4 week timeline.

**Success Criteria:** Zero user-facing disruption, <2% error rate increase, rollback capability maintained for 1 week post-cutover.

---

## Problem Statement

### Current State

The frontend application currently connects to:

- **Express API** (`lego-projects-api`) running on port 9000
- Hardcoded or environment-configured URLs in `src/config/api.ts`
- RTK Query endpoints configured for Express response formats
- Authentication via session-based tokens

The backend has been **successfully migrated** to AWS serverless infrastructure (`lego-api-serverless`), featuring:

- 30+ Lambda functions with API Gateway v2
- New endpoints: `/api/mocs/*`, `/api/images/*`, `/api/albums/*`, `/api/wishlist/*`, `/api/moc-instructions/*/parts-lists/*`
- WebSocket API for real-time features
- Cognito JWT authentication
- Enhanced capabilities (presigned S3 uploads, parts-list integration, gallery linking)

### Pain Points

**Technical Debt:**

- Frontend still pointing to deprecated Express API
- Cannot leverage new serverless endpoint capabilities
- No rollback plan if serverless migration has issues
- Dual backend maintenance overhead (Express + Serverless)

**Business Impact:**

- Delayed feature releases (new endpoints not accessible)
- Increased AWS costs (running both backends)
- User confusion if endpoints behave differently
- Risk of data inconsistency between backends

### Urgency

**HIGH PRIORITY** - The Express backend is deprecated and scheduled for decommission. Delayed migration blocks:

1. New feature releases (parts-list integration, enhanced gallery)
2. Cost optimization (eliminate redundant Express infrastructure)
3. Operational simplification (single backend to monitor)
4. Serverless benefits (auto-scaling, pay-per-use pricing)

---

## Proposed Solution

### High-Level Approach

Implement a **feature flag-based migration** with **staged rollout** that provides:

1. **Dual API Client Support** - Frontend can connect to Express OR Serverless via environment flag
2. **Instant Rollback** - Feature flag toggle switches backends without redeployment
3. **Gradual User Exposure** - Progressive rollout (10% → 25% → 50% → 100%)
4. **Comprehensive Validation** - Staging environment testing before production rollout
5. **Safety Net** - Keep Express running 1 week post-cutover for emergency rollback

### Key Differentiators

**Why This Succeeds:**

- ✅ **Zero User Disruption** - Transparent backend swap with instant rollback
- ✅ **Risk Mitigation** - Gradual exposure catches issues early with limited blast radius
- ✅ **Stakeholder Alignment** - Satisfies DevOps (rollback), QA (testing), PM (timeline), Security (validation)
- ✅ **Proven Pattern** - Industry-standard feature flag + canary deployment strategy

**Alternative Approaches Considered:**

- ❌ Big-bang cutover - Too risky, no rollback
- ⚠️ Proxy-based migration - Complex infrastructure, longer timeline
- ⚠️ Adapter pattern - Over-engineered for one-time migration

### High-Level Vision

**Immediate Outcome:** Frontend seamlessly connects to serverless backend with zero user impact

**Long-Term Vision:** Unlock serverless capabilities for future features:

- Real-time collaboration via WebSocket
- Direct S3 uploads for large files
- Enhanced parts-list management
- Album-based gallery organization

---

## Target Users

### Primary User Segment: Frontend Development Team

**Profile:**

- 3-5 frontend engineers working in React/TypeScript monorepo
- Familiarity with RTK Query, TanStack Router, AWS Amplify
- Responsible for implementing migration changes

**Current Behaviors:**

- Local development against Express backend (port 9000)
- Deploy via CI/CD to AWS Amplify / CloudFront
- Use environment variables for API configuration

**Pain Points:**

- Unclear which files need updating
- No local serverless testing environment documented
- Uncertainty about new API Gateway URL formats
- Error handling may break with new Lambda response formats

**Goals:**

- Clear migration checklist (which files to update)
- Local development setup with SST
- Confidence that changes won't break production
- Minimal code disruption

### Secondary User Segment: DevOps/SRE Team

**Profile:**

- 1-2 DevOps engineers managing AWS infrastructure and deployments
- Responsible for monitoring, incident response, and deployment safety

**Pain Points:**

- No documented rollback procedure for frontend migration
- Uncertain about monitoring strategy (CloudWatch dashboards, alarms)
- Lack of feature flag infrastructure
- Need deployment runbook for staged rollout

**Goals:**

- Safe deployment with minimal risk
- Instant rollback capability if issues arise
- Clear observability into frontend → Lambda requests
- Defined success metrics for each rollout stage

### Tertiary User Segment: End Users (LEGO MOC Enthusiasts)

**Profile:**

- Users creating, browsing, and managing LEGO MOC instructions
- Non-technical, expect seamless application experience

**Pain Points (If Migration Fails):**

- Suddenly logged out (JWT token incompatibility)
- Upload failures for instruction files
- Search or features broken (missing endpoints)
- Slow first-load times (Lambda cold starts)

**Goals:**

- **Zero visible disruption** - Application works identically before/after migration
- No re-authentication required
- No data loss or functionality regression

---

## Goals & Success Metrics

### Business Objectives

- **Decommission Express Backend** - Turn off `lego-projects-api` within 1 week post-migration, reducing AWS costs by ~$200/month
- **Enable New Features** - Unlock serverless-only capabilities (parts-lists, WebSocket, direct S3 uploads) for Q1 2026 roadmap
- **Reduce Operational Overhead** - Single backend to monitor, reducing on-call burden by ~30%

### User Success Metrics

- **Zero Downtime** - 100% uptime during migration window
- **No User-Visible Errors** - Error rate remains <2% (current baseline)
- **Session Preservation** - 0% forced logouts during cutover
- **Performance Parity** - P95 latency within 10% of Express baseline (<500ms)

### Key Performance Indicators (KPIs)

- **Error Rate:** <2% increase during rollout, back to baseline within 48 hours
- **Latency (P95):** <600ms for API calls (Express baseline: 450-500ms, accounting for Lambda cold starts)
- **Rollout Velocity:** Advance from 10% → 25% → 50% → 100% within 5 days if no issues detected
- **Rollback Usage:** 0 rollbacks to Express after 100% cutover (indicates stability)
- **Developer Velocity:** Frontend devs productive in local environment within 1 day of migration kickoff

---

## MVP Scope

### Core Features (Must Have)

- **Feature Flag Infrastructure:** Environment variable `VITE_USE_SERVERLESS_API` to toggle Express ↔ Serverless
  - _Rationale:_ Enables instant rollback without redeployment - addresses highest stakeholder concern

- **Environment Configuration Updates:** Update `src/config/api.ts`, `src/config/environment.ts` with API Gateway URLs
  - _Rationale:_ Frontend must know new endpoint locations for all environments (dev/staging/prod)

- **RTK Query Endpoint Validation:** Verify all existing endpoints (MOCs, wishlist, gallery) work with serverless API
  - _Rationale:_ Addresses endpoint parity risk - ensures no features break silently

- **Authentication Flow Testing:** Validate Cognito JWT tokens work with Lambda authorizers
  - _Rationale:_ Mitigates highest-severity risk (auth breakage would lock out all users)

- **File Upload Updates:** Ensure multipart/form-data uploads work within API Gateway limits (10MB) or implement presigned S3 URLs
  - _Rationale:_ Core functionality - users upload instruction files and images

- **Error Handling Standardization:** Update `baseQueryWithAuth` to handle Lambda error response formats
  - _Rationale:_ Poor error handling leads to bad UX and difficult debugging

- **Local Development Documentation:** Guide for running SST locally + Vite proxy configuration
  - _Rationale:_ Unblocks frontend developers immediately

- **Staging Environment Validation:** Full QA regression suite against serverless backend in staging
  - _Rationale:_ Catches issues before production exposure

- **Staged Production Rollout:** Canary deployment (10% → 25% → 50% → 100%) with monitoring
  - _Rationale:_ Limits blast radius, enables early issue detection

### Out of Scope for MVP

- **WebSocket Integration** - Real-time features deferred to Phase 2
- **New Parts-List Endpoints** - Frontend integration deferred (backend ready)
- **Gallery-MOC Linking Endpoints** - Backend implemented but frontend doesn't need yet
- **Performance Optimization** - Lambda provisioned concurrency (cost optimization comes later)
- **Advanced Monitoring** - CloudWatch Insights dashboards (basic monitoring sufficient for MVP)
- **Multi-Region Deployment** - Single-region serverless sufficient initially

### MVP Success Criteria

**Definition of Done:**

1. ✅ Frontend deployed to production with feature flag defaulting to Express
2. ✅ Serverless backend validated in staging with full QA regression pass
3. ✅ Staged rollout completed (100% users on serverless)
4. ✅ Error rate and latency within acceptable thresholds for 48 hours
5. ✅ Express backend decommissioned (or kept on standby for 1 week, then removed)
6. ✅ Zero critical issues requiring rollback

**Go/No-Go Gate at Each Rollout Stage:**

- Error rate <2% increase vs previous stage
- P95 latency <600ms
- No critical bugs reported by monitoring or users
- DevOps approval to proceed

---

## Post-MVP Vision

### Phase 2 Features (Next 1-2 Months)

**WebSocket Integration:**

- Connect frontend to `websocketApi` routes
- Enable real-time notifications (MOC updates, gallery comments)
- Implement reconnection logic and connection status UI

**New Endpoint Adoption:**

- Parts-list management UI (`/api/moc-instructions/{mocId}/parts-lists/*`)
- Gallery-MOC linking (`/api/mocs/{id}/gallery-images`)
- Album-based gallery organization

**Performance Optimization:**

- Lambda provisioned concurrency for high-traffic endpoints
- Implement aggressive caching strategies (ETags, stale-while-revalidate)
- Image optimization (WebP format, responsive images)

### Long-Term Vision (6-12 Months)

**Enhanced Serverless Capabilities:**

- Step Functions for multi-step workflows (e.g., MOC publishing pipeline)
- EventBridge for event-driven features (e.g., email notifications on MOC updates)
- AppSync for GraphQL API (if REST becomes limiting)

**Multi-Region Expansion:**

- CloudFront with edge locations for global users
- DynamoDB Global Tables for low-latency data access
- Regional Lambda deployments

**Advanced Monitoring:**

- Distributed tracing with X-Ray
- Custom CloudWatch metrics and dashboards
- Anomaly detection and auto-alerting

### Expansion Opportunities

- **Mobile App** - Leverage serverless API for iOS/Android apps
- **Third-Party Integrations** - API Gateway with API keys for partner access
- **AI/ML Features** - Lambda + SageMaker for MOC recommendations, image tagging

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Web (React SPA), deployed to AWS Amplify / CloudFront + S3
- **Browser/OS Support:** Modern browsers (Chrome, Firefox, Safari, Edge) - last 2 versions, no IE11
- **Performance Requirements:**
  - P95 latency <600ms (accounting for Lambda cold starts)
  - First Contentful Paint <2s
  - Time to Interactive <3.5s

### Technology Preferences

- **Frontend:**
  - React 19, TypeScript 5.8
  - RTK Query for data fetching (NO axios/fetch in feature code)
  - TanStack Router for routing (DO NOT introduce alternatives)
  - AWS Amplify SDK for Cognito authentication

- **Backend:**
  - AWS Lambda (Node.js 20.x), API Gateway v2
  - SST v3 (Ion) for infrastructure as code
  - Cognito for JWT authentication

- **Database:**
  - PostgreSQL 15.8 with Drizzle ORM
  - RDS Proxy for connection pooling
  - Redis 7.1 (ElastiCache) for caching

- **Hosting/Infrastructure:**
  - Frontend: AWS Amplify or CloudFront + S3
  - Backend: AWS Lambda + API Gateway
  - Monitoring: CloudWatch, X-Ray

### Architecture Considerations

- **Repository Structure:** Monorepo with pnpm workspaces, Turborepo for build caching
  - `apps/web/lego-moc-instructions-app/` - Frontend
  - `apps/api/lego-api-serverless/` - Serverless backend (SST)
  - `apps/api/lego-projects-api/` - Express backend (deprecated)

- **Service Architecture:**
  - Serverless event-driven (Lambda + API Gateway + EventBridge)
  - RESTful API design (not migrating to GraphQL yet)

- **Integration Requirements:**
  - AWS Cognito for authentication (JWT tokens)
  - S3 for file storage (presigned URLs for uploads >10MB)
  - Redis for session caching
  - OpenSearch for full-text search

- **Security/Compliance:**
  - HTTPS everywhere (TLS 1.2+)
  - CORS configured for frontend origin
  - JWT token validation in Lambda authorizers
  - Input validation (Zod schemas at API boundaries)
  - No PII in CloudWatch logs

---

## Constraints & Assumptions

### Constraints

- **Budget:** No additional AWS budget allocated - migration must be cost-neutral or reduce costs
- **Timeline:** Target 3-4 weeks for complete migration (includes staging validation + production rollout)
- **Resources:**
  - 2-3 frontend engineers (part-time, ~50% allocation)
  - 1 DevOps engineer (part-time, ~25% allocation)
  - 1 QA engineer (full-time during staging validation)
- **Technical:**
  - Cannot change backend API contracts during migration (frontend must adapt)
  - Must maintain Express backend running during rollout (no premature shutdown)
  - API Gateway 10MB payload limit for file uploads (requires presigned S3 URL workaround)

### Key Assumptions

- **Serverless backend is production-ready** - All Lambda endpoints tested and deployed to staging
- **API Gateway URLs available** - DevOps has provisioned custom domains or provided default Gateway URLs
- **Cognito authentication works** - Backend team validated JWT tokens with Lambda authorizers
- **Endpoint parity exists** - All Express endpoints have serverless equivalents (or documented exceptions)
- **No breaking changes during migration** - Backend team commits to API stability during 3-4 week window
- **QA capacity available** - QA can prioritize regression testing in staging environment
- **Feature flag infrastructure feasible** - Simple environment variable toggle, no complex tooling required

---

## Risks & Open Questions

### Key Risks

**Critical Risks (Require Immediate Mitigation):**

1. **API Gateway URL Configuration (Risk 1.1):**
   - **Impact:** ALL API calls fail if URLs wrong - complete application breakage
   - **Mitigation:** Validate URLs in staging, add runtime health check on app initialization, fail-fast if API unreachable

2. **JWT Token Format Changes (Risk 2.1):**
   - **Impact:** Authentication broken, users locked out
   - **Mitigation:** Validate Cognito tokens against Lambda authorizers in staging, test token refresh flows, ensure Amplify SDK compatibility

3. **File Upload Format Incompatibility (Risk 3.2):**
   - **Impact:** Uploads fail or corrupt for files >10MB (API Gateway limit)
   - **Mitigation:** Implement presigned S3 URLs for direct upload (bypass Gateway), test boundary cases (9MB, 10MB, 11MB files)

4. **Missing Endpoints (Risk 5.1):**
   - **Impact:** Features silently break (search, stats endpoints)
   - **Mitigation:** Create endpoint parity checklist (Express vs Lambda), test all frontend features in staging, implement graceful degradation

5. **Error Response Format Differences (Risk 7.1):**
   - **Impact:** Poor UX, error messages not displayed, debugging difficult
   - **Mitigation:** Standardize Lambda error formats, update RTK Query error handling, test error scenarios (401, 403, 404, 500)

**High Risks (Monitoring Required):**

6. **CORS Configuration Mismatch (Risk 1.2):** Test preflight requests, verify custom headers allowed
7. **Lambda Cold Start Latency (Risk 4.1):** Set realistic timeout expectations, add loading states
8. **No Rollback Plan (Risk 8.2):** Feature flag provides instant rollback - document procedure
9. **E2E Tests Pointing to Express (Risk 8.1):** Update Playwright configs, run against staging serverless

**Medium Risks (Accept or Monitor):**

10. **Response Wrapper Format (Risk 3.1):** Verify `{ status, message, data }` structure in staging
11. **Localhost Proxy Conflicts (Risk 6.2):** Document SST local dev setup for frontend developers
12. **Missing Environment Variables (Risk 6.1):** Validate env vars at build time, fail CI if missing

### Open Questions

**Infrastructure:**

- ❓ What are the actual API Gateway URLs for dev/staging/prod? (custom domain or default AWS URL?)
- ❓ Is feature flag tooling available (LaunchDarkly, AppConfig) or use simple env var?
- ❓ How is staged rollout controlled? (CloudFront Lambda@Edge, Route53 weighted routing, or manual percentage via feature flag service?)

**API Parity:**

- ❓ Are all Express endpoints migrated to serverless? If not, which are missing?
- ❓ Do Lambda response formats match Express exactly, or are transformations needed?
- ❓ What is the actual API Gateway payload limit configuration? (default 10MB or customized?)

**Authentication:**

- ❓ Will users be forced to re-login during cutover, or are Cognito tokens compatible with existing sessions?
- ❓ Does AWS Amplify SDK work seamlessly with Lambda authorizers, or are custom headers needed?

**Deployment:**

- ❓ What monitoring dashboards/alarms are needed for frontend → Lambda requests?
- ❓ What are the success criteria for advancing each rollout stage (10% → 25% → 50% → 100%)?
- ❓ How long should Express remain on standby post-cutover? (1 week? 2 weeks?)

**Testing:**

- ❓ Is staging environment available with serverless backend fully deployed?
- ❓ Can QA access staging for full regression testing before production rollout?
- ❓ Are there test user accounts and test data in staging?

### Areas Needing Further Research

- **WebSocket Client Implementation** - If real-time features are critical, need to research reconnection libraries (e.g., `socket.io-client`, `ws`)
- **Presigned S3 URL Flow** - Need backend API documentation for generating presigned URLs for large file uploads
- **Lambda Cold Start Mitigation** - Research provisioned concurrency costs vs benefits for high-traffic endpoints
- **Feature Flag Tooling** - Evaluate LaunchDarkly, AWS AppConfig, or custom solution for staged rollout control
- **API Contract Testing** - Research Pact or OpenAPI validation tools for ongoing API compatibility

---

## Appendices

### A. Research Summary

**Elicitation Analysis Completed:**

1. **Risk Analysis (Method: Identify Potential Risks)** - Identified 35+ risks across 8 categories
   - Top 5 risks: API Gateway URLs, file uploads, JWT tokens, missing endpoints, error formats
   - Mitigation strategies defined for all critical risks

2. **Stakeholder Perspective Analysis (Method: Expand for Different Stakeholders)** - Analyzed 7 stakeholder perspectives
   - Frontend Developers: Need clear migration checklist, local dev setup, API Gateway URLs
   - End Users: Expect zero disruption, no re-login, no functionality regression
   - DevOps/SRE: Need rollback plan, monitoring dashboards, deployment runbook
   - QA/Test Engineers: Need endpoint parity matrix, staging environment, regression suite
   - Product Manager: Need go/no-go criteria, user communication plan, feature parity validation
   - Security Engineer: Need JWT validation, CORS review, error message sanitization
   - Backend Engineers: Need contract tests, shared TypeScript types, breaking change process

3. **Tree of Thoughts (Method: Multi-Path Analysis)** - Evaluated 7 implementation strategies
   - **Path 1 (Big-Bang):** ❌ Rejected - too risky, no rollback
   - **Path 2 (Feature Flag):** ✅✅ RECOMMENDED - instant rollback, gradual exposure
   - **Path 3 (Proxy Migration):** ✅ Viable but complex infrastructure
   - **Path 4 (Shadow Testing):** ✅ Useful for validation phase
   - **Path 5 (Staged Rollout):** ✅✅ RECOMMENDED - industry standard canary deployment
   - **Path 6 (API Gateway Routing):** ✅ Elegant if Express accessible from Gateway
   - **Path 7 (Adapter Pattern):** ⚠️ Over-engineered for one-time migration
   - **OPTIMAL:** Hybrid of Path 2 + Path 5 (Feature Flag + Staged Rollout)

### B. Stakeholder Input

**Key Stakeholder Concerns Captured:**

- **Frontend Developers:** "How much code needs to change? Will my local dev break?"
- **DevOps:** "We need rollback capability and monitoring dashboards before production."
- **PM:** "Can we launch without new endpoints, or do we need feature parity?"
- **QA:** "Need API parity matrix and full regression suite against staging."
- **Security:** "JWT validation and CORS must be audited before go-live."
- **Backend:** "We built parts-list endpoints but frontend isn't using them yet."

**Cross-Stakeholder Conflicts Identified:**

- **Performance vs Cost:** DevOps wants provisioned concurrency, Finance balks at cost
- **Feature Parity vs Timeline:** Frontend wants to integrate new endpoints, PM wants fast launch
- **Testing Depth vs Speed:** QA needs 2 weeks, PM has 1-week deadline
- **Resolution:** Progressive rollout (test in prod with 10% traffic) balances concerns

### C. References

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

## Next Steps

### Immediate Actions

1. **Stakeholder Review & Approval** (1-2 days)
   - Share this brief with Frontend Lead, DevOps Lead, PM, QA Lead
   - Gather feedback on timeline, scope, risk mitigation strategies
   - Get written approval to proceed

2. **Infrastructure Readiness Validation** (2-3 days)
   - Confirm API Gateway URLs available for dev/staging/prod
   - Validate serverless backend deployed and stable in staging
   - Verify feature flag infrastructure (env var toggle or tooling)

3. **Create Detailed Epic & Stories** (1-2 days)
   - Break down migration into executable stories
   - Define acceptance criteria for each story
   - Estimate story points and assign to sprint(s)

4. **Establish Monitoring Baseline** (1 day)
   - Capture current Express API metrics (error rate, latency, throughput)
   - Define CloudWatch dashboards for frontend → Lambda monitoring
   - Set up alarms for error rate and latency thresholds

5. **Kickoff Meeting** (1 day)
   - Align all stakeholders on timeline, roles, and success criteria
   - Review rollback procedure
   - Establish daily standup for migration period

### PM Handoff

This Project Brief provides comprehensive context for the **Frontend Serverless Migration** project. The recommended approach is a **hybrid strategy combining feature flag toggle with staged rollout** to ensure safe, gradual migration with instant rollback capability.

**Next Recommended Action:** Create detailed implementation epic and stories based on this brief, incorporating:

- 3-4 week timeline with milestones
- Specific technical tasks (update config files, RTK Query endpoints, error handling)
- Testing requirements (staging validation, production smoke tests)
- Rollout plan (10% → 25% → 50% → 100% with monitoring gates)
- Success criteria and go/no-go decision points

**Key Decision Points Requiring PM Input:**

1. Accept 3-4 week timeline or need acceleration?
2. Defer new endpoint integration (parts-lists, WebSocket) to Phase 2?
3. Feature flag tooling: simple env var or invest in LaunchDarkly/AppConfig?
4. Post-cutover Express standby period: 1 week or 2 weeks?

---

**Document Version:** 1.0
**Last Updated:** 2025-11-23
**Status:** Ready for Stakeholder Review
