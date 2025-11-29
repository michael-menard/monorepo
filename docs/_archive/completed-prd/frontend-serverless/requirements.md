# Requirements

## Functional Requirements

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

## Non-Functional Requirements

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

## Compatibility Requirements

**CR1**: **Existing API Compatibility** - All frontend RTK Query endpoints SHALL maintain existing request/response contracts without breaking changes during migration period (3-4 weeks).

**CR2**: **Database Schema Compatibility** - PostgreSQL database schema SHALL remain unchanged; serverless API SHALL use identical Drizzle ORM schema as Express API to ensure data consistency.

**CR3**: **UI/UX Consistency** - All user-facing functionality (MOC management, gallery, wishlist) SHALL behave identically before/after migration with no visible UI changes or feature regressions.

**CR4**: **Integration Compatibility** - Third-party integrations (S3 storage, Redis caching, OpenSearch indexing) SHALL function identically with serverless backend as they did with Express backend.

**CR5**: **Authentication Compatibility** - AWS Cognito JWT tokens SHALL be compatible across both Express and serverless backends during transition period to avoid forced logouts.

**CR6**: **Browser Compatibility** - Frontend SHALL continue supporting modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions) without compatibility regressions.

**CR7**: **Development Environment Compatibility** - Local development setup (SST local Lambda + Vite dev server) SHALL provide feature parity with existing Express development workflow.

---
