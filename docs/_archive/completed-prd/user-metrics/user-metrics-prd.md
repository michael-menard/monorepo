# User Tracking & Metrics Implementation - Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Analysis Source

- **Source:** User-provided Project Brief (created by Business Analyst)
- **Location:** `/Users/michaelmenard/Development/Monorepo/docs/user-metrics.md`
- **Type:** Comprehensive project brief with technical details

### Existing Project Overview

**Current Project State:**
The existing project is a serverless web application built with:

- **Frontend:** React 18+ with TypeScript, built using Vite, hosted on S3 + CloudFront
- **Backend:** Node.js 20.x Lambda functions (TypeScript)
- **Database:** Aurora PostgreSQL (existing instance)
- **Infrastructure:** AWS-exclusive, managed via SST (Serverless Stack)
- **Status:** Pre-launch with <100 expected monthly users

**Current Functionality:**
The application is a functional web platform ready for launch but currently **lacks comprehensive observability**. There is no session replay, analytics tracking, or unified metrics visualization in place.

### Available Documentation Analysis

**Available Documentation:**

- ✅ Project Brief (comprehensive - just created)
- ✅ Tech Stack identified (TypeScript, React/Vite, Lambda, Aurora, SST)
- ✅ Architecture patterns documented (serverless-first, AWS-native)
- ✅ Infrastructure approach defined (SST for IaC)
- ⚠️ Coding Standards (referenced but not detailed)
- ⚠️ API Documentation (existing but not reviewed)

**Documentation Assessment:**
The project brief provides excellent foundation. No need for document-project task as we have sufficient technical context from the brief.

### Enhancement Scope Definition

**Enhancement Type:**

- ✅ **New Feature Addition** (primary)
- ✅ **Integration with New Systems** (OpenReplay, Umami, Grafana)
- ✅ **Performance/Scalability Improvements** (monitoring foundation)

**Enhancement Description:**
Implement a comprehensive observability stack consisting of OpenReplay (self-hosted session replay), Umami (self-hosted privacy-focused analytics), and Amazon Managed Grafana (AWS-hosted metrics visualization) to provide Product, Engineering, and Customer Service teams with complete visibility into user behavior, application performance, and troubleshooting capabilities. This enhancement adds new infrastructure on AWS while instrumenting existing Lambda and React code with minimal invasiveness.

**Impact Assessment:**

- ✅ **Moderate to Significant Impact**
  - **Infrastructure:** New ECS/Fargate services, VPC configuration, Aurora schema addition
  - **Frontend:** Adding tracking scripts to React/Vite app (non-invasive)
  - **Backend:** Instrumenting Lambda functions with CloudWatch EMF and structured logging
  - **Database:** New Umami schema in existing Aurora instance
  - **Architecture:** Extends existing architecture without changing core patterns

### Goals and Background Context

**Goals:**

- Enable Product team to make data-driven prioritization decisions based on actual user behavior
- Provide Engineering team with real-time performance metrics (latency, errors, traffic) for proactive monitoring
- Equip Customer Service with session replay capability for efficient issue troubleshooting
- Establish privacy-first observability foundation with complete data ownership
- Create scalable infrastructure supporting 10x user growth and future AI/ML capabilities
- Maintain budget-conscious approach (~$100-150/month for <100 users)

**Background Context:**
The organization is preparing to launch a serverless web application but currently operates blind without visibility into user behavior, application performance, or debugging context. This creates three critical gaps: Product cannot prioritize features based on usage data, Engineering lacks diagnostic tools for performance issues, and Customer Service must troubleshoot user problems without context.

As a pre-launch personal project with budget constraints, the solution must balance comprehensive observability with cost efficiency. The choice of self-hosted tools for data collection (OpenReplay, Umami) combined with AWS-managed Grafana eliminates vendor lock-in for analytics data while reducing operational overhead for visualization infrastructure. This hybrid approach maintains data ownership while providing enterprise-grade managed dashboards.

### Change Log

| Change               | Date       | Version | Description                               | Author    |
| -------------------- | ---------- | ------- | ----------------------------------------- | --------- |
| Initial PRD Creation | 2025-11-22 | 1.0     | Created brownfield PRD from project brief | John (PM) |

## Requirements

### Functional Requirements

**FR1:** The system shall deploy self-hosted OpenReplay on AWS ECS/Fargate to capture and store user session recordings including clicks, navigation, form interactions, console errors, and network requests.

**FR2:** The system shall integrate OpenReplay tracking script into the React/Vite frontend application without breaking the existing build process or exceeding 50ms page load overhead.

**FR3:** The system shall deploy self-hosted Umami analytics on AWS ECS/Fargate with a dedicated PostgreSQL schema in the existing Aurora database.

**FR4:** The system shall integrate Umami tracking script into the React/Vite frontend to capture page views, referrers, device types, and traffic sources.

**FR5:** The system shall provision Amazon Managed Grafana workspace configured with CloudWatch, CloudWatch Logs Insights, and OpenSearch data sources (no Prometheus required for serverless architecture).

**FR6:** The system shall instrument all Lambda functions with CloudWatch Embedded Metric Format (EMF) for custom metrics including execution duration, cold start duration, error counts, and invocation counts.

**FR7:** The system shall implement structured logging (JSON format) in all Lambda functions using Pino or Winston, streaming to CloudWatch Logs.

**FR8:** The system shall configure PII masking in OpenReplay to sanitize sensitive fields including email addresses, names, payment information, and any other user-identifiable data.

**FR9:** The system shall create Grafana dashboards for Lambda performance (cold starts, duration, errors), API Gateway metrics (latency, errors), CloudFront metrics (cache hit ratio), and frontend Web Vitals using CloudWatch as the primary data source.

**FR10:** The system shall implement automated data retention policies: 30 days for session replays (S3 lifecycle), 1 year for analytics (Umami), 90 days for CloudWatch Logs (with S3 export), and appropriate OpenSearch ILM.

**FR11:** The system shall configure role-based access control in Amazon Managed Grafana using AWS SSO or IAM, and in OpenReplay and Umami with admin and viewer roles.

**FR12:** The system shall integrate Web Vitals tracking (LCP, FID, CLS) in the React frontend to measure user experience performance, sending metrics to CloudWatch via API Gateway endpoint.

### Non-Functional Requirements

**NFR1:** The observability infrastructure shall operate within a monthly budget of $100-150 for <100 users using budget-optimized configurations (Aurora Provisioned db.t4g.micro, right-sized ECS tasks, Amazon Managed Grafana Essential tier).

**NFR2:** The tracking scripts (OpenReplay + Umami) shall add no more than 50ms to page load time as measured by LCP (Largest Contentful Paint).

**NFR3:** The system shall capture 100% of user sessions in both OpenReplay and Umami at launch to ensure complete visibility.

**NFR4:** All self-hosted observability infrastructure (OpenReplay, Umami) shall be deployed via SST (Serverless Stack) infrastructure-as-code; Amazon Managed Grafana provisioned via AWS Console or CloudFormation.

**NFR5:** The system shall support scaling to 10x user growth (1000 users) without architectural changes, only requiring resource adjustments (ECS task sizing, Grafana tier upgrade).

**NFR6:** All observability data shall remain within the organization's AWS account with no third-party SaaS data transmission, ensuring complete data ownership (Amazon Managed Grafana is AWS-managed but data stays in account).

**NFR7:** The system shall maintain 99%+ uptime for observability tools: Amazon Managed Grafana provides 99.9% SLA; self-hosted tools (OpenReplay, Umami) target 99%+ via ECS/Fargate multi-AZ deployment.

**NFR8:** PII masking configuration shall be tested and verified before production deployment to prevent any privacy violations.

**NFR9:** The enhancement shall not modify existing application functionality or require changes to public APIs.

**NFR10:** All infrastructure components shall use cost tags for budget tracking and shall integrate with AWS Budgets for cost alerting.

### Compatibility Requirements

**CR1: Existing Application Compatibility** - The Lambda function instrumentation (EMF, structured logging) shall be additive only, preserving all existing application logic and not modifying business function behavior.

**CR2: Database Schema Compatibility** - The Umami schema addition to Aurora PostgreSQL shall be isolated and not interfere with existing application schemas or impact database performance.

**CR3: Frontend Build Compatibility** - Tracking script integration shall work seamlessly with Vite's build process in both development (HMR) and production modes without requiring Vite configuration changes.

**CR4: CloudFront Distribution Compatibility** - Tracking scripts shall be cached appropriately by CloudFront without requiring changes to existing CloudFront distribution configuration for application assets.

**CR5: AWS Account Compatibility** - All new infrastructure (VPC if needed, ECS, Aurora schema, S3 buckets, Amazon Managed Grafana workspace) shall coexist with existing resources using proper namespacing and tagging conventions.

**CR6: CloudWatch Data Source Compatibility** - Amazon Managed Grafana shall use CloudWatch as primary data source for all serverless metrics, eliminating need for Prometheus and reducing infrastructure complexity.

## User Interface Enhancement Goals

### Integration with Existing UI

**Tracking Script Integration:**
The React/Vite application will integrate OpenReplay and Umami tracking scripts in a non-invasive manner that maintains existing UI functionality and performance. Scripts will be loaded asynchronously to prevent blocking the main thread and will be initialized early in the application lifecycle (typically in `main.tsx` or `App.tsx`).

**Design Principles:**

- **Invisible to End Users:** Tracking operates transparently without visible UI changes
- **Performance First:** Scripts load asynchronously and defer to avoid impacting LCP/FID metrics
- **Vite Compatibility:** Integration works seamlessly with Vite's HMR in development and optimized builds in production
- **Error Boundaries:** React error boundaries capture unhandled errors and send to CloudWatch
- **Privacy Indicators:** Optional privacy notice component for user transparency (following existing design patterns)

**Component Integration Approach:**

- Tracking initialization isolated in dedicated modules (`src/lib/tracking/` directory structure)
- React Context or hooks pattern for tracking state (if needed for conditional tracking)
- TypeScript types for tracking events to ensure type safety
- Integration with existing routing to track page navigation
- Web Vitals reporting integrated with existing performance monitoring approach

### Modified/New Screens and Views

**No User-Facing UI Changes:**
This enhancement does not modify existing screens, views, or user-facing functionality. All changes are infrastructure and code-level integrations.

**Developer-Facing Changes:**

- **Development Console:** Web Vitals metrics logged to browser console in development mode
- **Error Tracking:** Enhanced error messages with tracking session IDs for debugging
- **Optional Debug UI:** Development-only overlay showing tracking status (optional, for validation)

**External Dashboards (Not Part of Application UI):**

- **Grafana Dashboards:** Amazon Managed Grafana workspace (separate AWS service)
- **OpenReplay UI:** Self-hosted ECS service with its own web interface
- **Umami UI:** Self-hosted ECS service with its own analytics dashboard

### UI Consistency Requirements

**CR-UI1: No Visual Changes** - The tracking integration shall not introduce any visible changes to the existing application UI, user workflows, or interaction patterns.

**CR-UI2: Performance Budget Compliance** - Tracking scripts shall respect the <50ms overhead budget and not degrade Web Vitals scores (LCP, FID, CLS).

**CR-UI3: React Pattern Consistency** - Tracking code shall follow existing React patterns (hooks, context, component structure) established in the codebase.

**CR-UI4: TypeScript Consistency** - All tracking-related code shall be fully typed using TypeScript, consistent with existing codebase standards.

**CR-UI5: Error Handling Consistency** - Frontend error tracking shall integrate with existing error boundary patterns without changing error UX.

**CR-UI6: Build Output Consistency** - Vite build output shall not significantly increase bundle size (target: <50KB added for both tracking scripts combined).

**CR-UI7: Development Experience** - Tracking integration shall not interfere with Vite's HMR, hot reload, or development server performance.

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages:**

- TypeScript (frontend and backend)
- Node.js 20.x runtime for Lambda functions

**Frameworks:**

- **Frontend:** React 18+, Vite (build tool)
- **Backend:** AWS Lambda (serverless functions)
- **Infrastructure:** SST (Serverless Stack) for infrastructure-as-code

**Database:**

- **Primary:** Aurora PostgreSQL (provisioned, existing instance)
- **Recommended Sizing:** db.t4g.micro (2 vCPU, 1 GB RAM) for <100 users
- **Schema:** Existing application schemas + new Umami schema (isolated)

**Infrastructure:**

- **Compute:** AWS Lambda (backend), ECS/Fargate (OpenReplay, Umami)
- **CDN:** CloudFront (frontend distribution)
- **Storage:** S3 (static assets, session replay storage)
- **Networking:** VPC (recommended: /24 CIDR, 2 AZs, single NAT Gateway for budget)
- **Monitoring:** CloudWatch (logs, metrics), OpenSearch (log aggregation)
- **Visualization:** Amazon Managed Grafana

**External Dependencies:**

- OpenReplay (self-hosted on ECS/Fargate)
- Umami (self-hosted on ECS/Fargate)
- web-vitals (npm package for frontend performance)
- CloudWatch EMF libraries for Lambda metrics
- Structured logging libraries (Pino or Winston)

### Integration Approach

**Database Integration Strategy:**

- **Umami Schema Isolation:** Create dedicated PostgreSQL schema in existing Aurora instance
- **Minimal Impact:** Umami schema estimated at 100-500 MB for <100 users
- **Connection Pooling:** Umami uses its own connection pool, isolated from application connections
- **No Migration Risk:** Umami manages its own schema migrations independently
- **Monitoring:** Add Aurora performance metrics to Grafana dashboards

**API Integration Strategy:**

- **Lambda Instrumentation:** Add CloudWatch EMF to existing Lambda handler wrapper pattern
- **Structured Logging:** Implement in existing logger configuration (minimal code changes)
- **API Gateway Logging:** Enable CloudWatch logging via SST configuration
- **Error Reporting:** Frontend errors sent to CloudWatch via dedicated API Gateway endpoint (new)
- **Web Vitals Endpoint:** Optional API endpoint to receive Web Vitals metrics from frontend

**Frontend Integration Strategy:**

- **Script Loading:** Initialize OpenReplay and Umami in `main.tsx` before React render
- **Async Loading:** Use dynamic imports or async script tags to prevent blocking
- **Environment Detection:** Different tracking configuration for dev/staging/prod
- **Vite Plugin Support:** Leverage Vite's plugin ecosystem if needed for env injection
- **CloudFront Caching:** Tracking scripts cached with appropriate headers (1-hour TTL recommended)

**Testing Integration Strategy:**

- **Unit Tests:** Mock tracking libraries in Jest/Vitest tests
- **Integration Tests:** Verify tracking initialization in test environment
- **E2E Tests:** Optional validation that tracking fires in Cypress/Playwright
- **Performance Testing:** Validate <50ms overhead with Lighthouse CI
- **PII Masking Tests:** Automated tests to verify sensitive data sanitization

### Code Organization and Standards

**File Structure Approach:**

```
apps/api/lego-api-serverless/
  src/
    lib/
      tracking/          # New: tracking utilities
        cloudwatch-emf.ts
        structured-logger.ts
      utils/
        lambda-wrapper.ts  # Enhanced: add EMF instrumentation

apps/web/                # Your React app
  src/
    lib/
      tracking/          # New: frontend tracking
        openreplay.ts
        umami.ts
        web-vitals.ts
        error-reporter.ts
    main.tsx             # Modified: initialize tracking
```

**Naming Conventions:**

- Follow existing TypeScript naming (camelCase for variables/functions, PascalCase for components/classes)
- Tracking-related modules prefixed with `tracking` namespace
- SST constructs for observability in dedicated directory (e.g., `sst/observability/`)

**Coding Standards:**

- Full TypeScript strict mode compliance
- ESLint rules from existing configuration
- Prettier formatting per existing setup
- Comprehensive TSDoc comments for tracking utilities
- Error handling follows existing patterns (try/catch, error boundaries)

**Documentation Standards:**

- README for tracking integration in both frontend and backend
- SST construct documentation for infrastructure
- Runbook for observability stack deployment and troubleshooting
- Dashboard documentation (what each Grafana dashboard shows)

### Deployment and Operations

**Build Process Integration:**

- **SST Deployment:** Extend existing `sst.config.ts` with observability constructs
- **Frontend Build:** No Vite configuration changes required (tracking via npm packages)
- **Lambda Layers:** Optional shared layer for logging/metrics libraries
- **Environment Variables:** Tracking configuration via SST secrets/parameters

**Deployment Strategy:**

- **Infrastructure First:** Deploy ECS services (OpenReplay, Umami), Aurora schema, Grafana workspace
- **Application Second:** Deploy instrumented Lambda functions and frontend with tracking
- **Validation:** Smoke tests to verify data flowing to all three systems
- **Rollback:** SST stack rollback for infrastructure; Lambda versions for code

**Monitoring and Logging:**

- **Self-Monitoring:** CloudWatch alarms for OpenReplay/Umami ECS task health
- **Grafana Uptime:** Monitor Amazon Managed Grafana workspace availability (99.9% SLA)
- **Cost Monitoring:** AWS Budgets alerts at 80% and 100% of monthly budget ($100-150)
- **Log Aggregation:** CloudWatch Logs → OpenSearch for centralized log analysis

**Configuration Management:**

- **SST Parameters:** Store tracking endpoint URLs, workspace IDs
- **AWS Secrets Manager:** Store Grafana API keys, Umami/OpenReplay admin credentials
- **Environment-Specific:** Different tracking configs for dev/staging/prod via SST stages
- **PII Masking Config:** Versioned configuration file for OpenReplay sanitization rules

### Risk Assessment and Mitigation

**Technical Risks:**

- **Risk:** OpenReplay session replay storage grows beyond S3 budget estimates
  - **Mitigation:** Aggressive 30-day lifecycle policy, S3 Intelligent-Tiering, monitor storage metrics

- **Risk:** CloudWatch EMF adds latency to Lambda cold starts
  - **Mitigation:** Async metric publishing, validate <50ms overhead, use Lambda layers for shared code

- **Risk:** Tracking scripts increase bundle size significantly
  - **Mitigation:** Dynamic imports, tree-shaking, target <50KB total, monitor bundle analyzer

- **Risk:** Aurora performance degrades with Umami schema addition
  - **Mitigation:** Start with db.t4g.micro, monitor RDS metrics, upgrade if needed, connection pooling

**Integration Risks:**

- **Risk:** Vite HMR breaks with tracking script initialization
  - **Mitigation:** Environment detection, conditional initialization, thorough dev testing

- **Risk:** PII accidentally captured despite masking configuration
  - **Mitigation:** Comprehensive masking rules, automated testing, regular audit of recordings

- **Risk:** Cross-tool session correlation difficult (OpenReplay ID ≠ Umami ID)
  - **Mitigation:** Optional unified session ID in localStorage, accept manual correlation for MVP

**Deployment Risks:**

- **Risk:** ECS task launch failures block entire observability stack
  - **Mitigation:** Deploy incrementally (Umami → OpenReplay → Grafana), health checks, rollback plan

- **Risk:** Amazon Managed Grafana workspace provisioning fails/delays
  - **Mitigation:** Provision Grafana first (separate from SST), validate before app deployment

- **Risk:** Budget overrun from misconfigured retention or task sizing
  - **Mitigation:** Cost alerts at 80%, daily cost review first week, right-size aggressively

**Mitigation Strategies Summary:**

1. **Incremental Deployment:** Deploy infrastructure components independently, validate each
2. **Comprehensive Testing:** PII masking tests, performance tests, integration tests
3. **Aggressive Monitoring:** Cost alerts, health checks, performance dashboards
4. **Clear Rollback Plan:** SST stack versioning, Lambda aliases, database schema rollback scripts
5. **Budget Guards:** AWS Budgets, cost tags, daily review during first month

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision: Single Comprehensive Epic**

**Rationale:**
This brownfield enhancement will be structured as **one comprehensive epic** with stories organized into logical implementation phases. This approach is appropriate because:

1. **Single Developer Context:** Personal project with one developer eliminates coordination complexity of multiple epics
2. **Flexibility:** Allows adjusting scope and sequencing during implementation without epic boundary constraints
3. **Cohesive Goal:** All work serves single unified objective (complete observability stack)
4. **Future Sharding Option:** Can use `*shard-prd` command later to split into separate epic files if needed for organization
5. **Implementation Freedom:** Developer can choose to implement incrementally or all-at-once

**Story Organization:**
Stories are grouped into 4 logical phases for clarity, but remain within single epic:

**Phase 1: Infrastructure Foundation (4 stories)**

- AWS infrastructure setup (VPC, IAM, networking)
- Aurora schema preparation for Umami
- S3 buckets and lifecycle policies
- Cost monitoring and budget alerts

**Phase 2: Amazon Managed Grafana & CloudWatch (4 stories)**

- Grafana workspace provisioning
- CloudWatch data source configuration
- Initial dashboard creation (Lambda, API Gateway, CloudFront)
- OpenSearch integration for logs

**Phase 3: Application Instrumentation (5 stories)**

- Lambda CloudWatch EMF instrumentation
- Structured logging implementation
- Frontend Web Vitals tracking
- Frontend error reporting to CloudWatch
- Performance validation and optimization

**Phase 4: Self-Hosted Analytics Tools (5 stories)**

- Umami deployment on ECS/Fargate
- OpenReplay deployment on ECS/Fargate
- Frontend tracking script integration (Umami + OpenReplay)
- PII masking configuration and validation
- End-to-end testing and documentation

**Total Stories:** 18 stories organized into 4 phases
**Epic Size:** Large but appropriate for personal project single-developer context

**Implementation Flexibility:**

- Stories can be implemented sequentially by phase (incremental approach)
- Stories within same phase can be parallelized if desired
- Phases can be re-sequenced based on priorities (e.g., Phase 2+3 before Phase 4 if analytics less urgent)
- Epic can be sharded into separate files later without losing work

## Epic 1: User Tracking & Metrics Implementation

**Epic Goal:** Implement a comprehensive, self-hosted observability stack (OpenReplay, Umami, Amazon Managed Grafana) that provides Product, Engineering, and Customer Service teams with complete visibility into user behavior, application performance, and troubleshooting capabilities while maintaining budget constraints (~$100-150/month) and privacy-first principles.

**Integration Requirements:** This epic extends the existing serverless application (React/Vite frontend, Lambda backend, Aurora database) with observability infrastructure and instrumentation while maintaining 100% compatibility with existing functionality. All tracking is additive; no existing features are modified.

---

### PHASE 1: Infrastructure Foundation

### Story 1.1: AWS Infrastructure Foundation Setup

**As a** DevOps Engineer,
**I want** to establish the core AWS infrastructure foundation for observability,
**so that** all observability tools have the necessary networking, storage, and access controls in place.

**Acceptance Criteria:**

1. VPC created or identified with /24 CIDR block, 2 availability zones, 2 public subnets (/27), 2 private subnets (/26)
2. Single NAT Gateway deployed in one AZ for cost optimization
3. Security groups created for ECS tasks (OpenReplay, Umami) with appropriate ingress/egress rules
4. IAM roles created for ECS task execution, Lambda enhanced permissions, Grafana access
5. Comprehensive resource tagging schema implemented on all resources:
   - Required tags: Project, Environment, ManagedBy, CostCenter, Owner
   - Functional tags: Component, Function, DataType (where applicable)
   - Centralized tag configuration created in `sst/observability/tags.ts`
   - Cost allocation tags activated in AWS Billing Console
6. Tag compliance validated via AWS CLI or Tag Editor (all resources have minimum 5 required tags)
7. SST configuration extended with observability infrastructure constructs

**Integration Verification:**

- IV1: Existing VPC resources (if any) remain unaffected and accessible
- IV2: Application Lambda functions can still access existing Aurora database
- IV3: No disruption to current application deployment pipeline

---

### Story 1.2: Aurora PostgreSQL Schema for Umami

**As a** Database Administrator,
**I want** to create an isolated PostgreSQL schema in Aurora for Umami analytics,
**so that** Umami has dedicated database storage without impacting application data.

**Acceptance Criteria:**

1. New PostgreSQL schema `umami` created in existing Aurora instance
2. Dedicated database user created with permissions scoped to `umami` schema only
3. Connection string and credentials stored in AWS Secrets Manager
4. Schema isolation verified (Umami cannot access application schemas)
5. Database performance baseline documented before and after schema addition
6. Umami schema migrations (tables, indexes) applied successfully

**Integration Verification:**

- IV1: Existing application schemas remain untouched and functional
- IV2: Application database connections unaffected by new schema
- IV3: Aurora RDS metrics show no performance degradation (CPU, connections, IOPS)

---

### Story 1.3: S3 Buckets and Lifecycle Policies

**As a** DevOps Engineer,
**I want** to create S3 buckets with appropriate lifecycle policies for session replay storage,
**so that** OpenReplay can store recordings cost-effectively with automatic cleanup.

**Acceptance Criteria:**

1. S3 bucket created for OpenReplay session recordings with encryption at rest
2. 30-day lifecycle policy configured to automatically delete old recordings
3. S3 Intelligent-Tiering enabled for automatic cost optimization
4. Bucket policy configured to allow ECS task role access only
5. CloudWatch metrics enabled for storage monitoring
6. S3 bucket for CloudWatch Logs export (optional) with 1-year Glacier transition

**Integration Verification:**

- IV1: Existing S3 buckets (frontend assets, etc.) remain unaffected
- IV2: CloudFront distribution continues serving frontend assets without disruption
- IV3: Application's existing S3 access patterns unchanged

---

### Story 1.4: Cost Monitoring and Budget Alerts

**As a** Budget Manager,
**I want** comprehensive cost monitoring and alerts configured,
**so that** observability infrastructure stays within $100-150/month budget.

**Acceptance Criteria:**

1. AWS Budget created with $150/month limit and alerts at 80% ($120) and 100% ($150)
2. Cost allocation tags applied to all observability resources
3. CloudWatch dashboard created showing daily cost trends by service
4. SNS topic configured for budget alert notifications (email)
5. Cost Explorer report created for observability resource group
6. Documentation created for monthly cost review process

**Integration Verification:**

- IV1: Existing AWS budgets and billing alarms remain active
- IV2: Cost allocation tags don't interfere with existing resource tagging
- IV3: Billing reports include both existing and new resources correctly

---

### PHASE 2: Amazon Managed Grafana & CloudWatch

### Story 2.1: Amazon Managed Grafana Workspace Provisioning

**As a** Platform Engineer,
**I want** to provision an Amazon Managed Grafana workspace with appropriate authentication,
**so that** teams can access centralized dashboards for metrics visualization.

**Acceptance Criteria:**

1. Amazon Managed Grafana workspace created in Essential tier (budget-conscious)
2. AWS SSO or IAM authentication configured for user access
3. Workspace admin role assigned to project owner
4. Viewer roles configured for Product, Engineering, CS teams
5. Workspace URL documented and shared with teams
6. Basic workspace settings configured (timezone, organization name)

**Integration Verification:**

- IV1: Grafana workspace accessible via HTTPS without interfering with application URLs
- IV2: Authentication does not conflict with existing AWS SSO/IAM setup
- IV3: No unexpected AWS quota limits hit during provisioning

---

### Story 2.2: CloudWatch Data Source Configuration

**As a** Engineering Team Member,
**I want** CloudWatch configured as primary data source in Grafana,
**so that** I can visualize Lambda, API Gateway, and CloudFront metrics.

**Acceptance Criteria:**

1. CloudWatch data source added to Grafana workspace with IAM role authentication
2. Permissions validated to query all relevant CloudWatch namespaces (Lambda, APIGateway, CloudFront)
3. CloudWatch Logs Insights configured as data source for log queries
4. Default region set correctly for data source
5. Test query executed successfully to verify connectivity
6. Data source marked as default for CloudWatch metrics

**Integration Verification:**

- IV1: CloudWatch metrics collection for existing resources unaffected
- IV2: Existing CloudWatch alarms continue functioning normally
- IV3: No additional CloudWatch API costs from Grafana queries (within free tier limits)

---

### Story 2.3: Initial Grafana Dashboards Creation

**As a** Engineering Team Member,
**I want** initial Grafana dashboards for Lambda, API Gateway, and CloudFront performance,
**so that** I can monitor application health from launch.

**Acceptance Criteria:**

1. **Lambda Performance Dashboard** created with panels for: invocations, duration (p50/p95/p99), errors, throttles, cold starts, concurrent executions
2. **API Gateway Dashboard** created with panels for: request count, latency (p50/p95/p99), 4xx errors, 5xx errors, by route/method
3. **CloudFront Dashboard** created with panels for: requests, cache hit ratio, bytes downloaded, error rates, edge location distribution
4. **System Health Dashboard** created with panels for: Aurora connections, CPU, S3 storage metrics, ECS task health (when added)
5. All dashboards use appropriate time ranges and refresh intervals
6. Dashboards organized into folders (Infrastructure, Application, Frontend)

**Integration Verification:**

- IV1: Dashboards display existing application metrics correctly
- IV2: Historical data (if any) visible in dashboard queries
- IV3: Dashboard refresh doesn't cause excessive CloudWatch API calls

---

### Story 2.4: OpenSearch Integration for Log Analysis

**As a** Engineering Team Member,
**I want** OpenSearch configured as Grafana data source for log analysis,
**so that** I can query and visualize application logs alongside metrics.

**Acceptance Criteria:**

1. OpenSearch data source added to Grafana workspace
2. CloudWatch Logs subscription filter configured to stream logs to OpenSearch
3. OpenSearch index lifecycle management (ILM) policy created (7 days hot, 30 days warm, 90 days delete)
4. Test log query dashboard created showing error patterns and search capabilities
5. Access permissions validated for OpenSearch queries from Grafana
6. Documentation created for log query syntax and common patterns

**Integration Verification:**

- IV1: Existing CloudWatch Logs streams continue functioning
- IV2: Application logging not impacted by subscription filter
- IV3: OpenSearch query performance acceptable (<2 second response for typical queries)

---

### PHASE 3: Application Instrumentation

### Story 3.1: Lambda CloudWatch EMF Instrumentation

**As a** Backend Developer,
**I want** Lambda functions instrumented with CloudWatch Embedded Metric Format,
**so that** custom application metrics appear in Grafana dashboards.

**Acceptance Criteria:**

1. CloudWatch EMF library installed in Lambda project dependencies
2. Lambda wrapper utility enhanced to emit EMF metrics (cold start, business metrics)
3. Custom metrics defined: execution duration, cold start indicator, error count, invocation count per function
4. Metrics published asynchronously to avoid adding latency
5. Environment-specific metric namespaces configured (dev vs prod)
6. Test metric queries validated in CloudWatch Metrics console before Grafana

**Integration Verification:**

- IV1: Existing Lambda function logic unchanged and tests still pass
- IV2: Lambda execution time increase <50ms due to EMF overhead
- IV3: No errors introduced in Lambda error handling flow

---

### Story 3.2: Structured Logging Implementation

**As a** Backend Developer,
**I want** structured JSON logging implemented across all Lambda functions,
**so that** logs are easily queryable in OpenSearch via Grafana.

**Acceptance Criteria:**

1. Winston or Pino logging library installed and configured
2. Structured log format defined (timestamp, level, message, context, requestId, userId if available)
3. Existing `console.log` statements migrated to structured logger
4. Log levels configured appropriately (ERROR, WARN, INFO, DEBUG)
5. Request correlation IDs added to all log entries for tracing
6. Log output validated in CloudWatch Logs with proper JSON structure

**Integration Verification:**

- IV1: All existing log statements still output (format changed but content preserved)
- IV2: Error handling and alerting based on logs still functional
- IV3: Log volume doesn't increase significantly (within CloudWatch budget)

---

### Story 3.3: Frontend Web Vitals Tracking

**As a** Frontend Developer,
**I want** Web Vitals tracking implemented in the React frontend,
**so that** I can monitor user experience performance in Grafana.

**Acceptance Criteria:**

1. `web-vitals` npm package installed in frontend project
2. Web Vitals tracking module created in `src/lib/tracking/web-vitals.ts`
3. LCP, FID, CLS, TTFB, INP metrics captured on page load/navigation
4. Metrics sent to CloudWatch via API Gateway endpoint (new Lambda function)
5. Metrics visible in CloudWatch Metrics console under custom namespace
6. Dev environment logging to console, prod environment sends to CloudWatch

**Integration Verification:**

- IV1: Vite build process unaffected, no build errors
- IV2: Web Vitals measurement doesn't impact actual Web Vitals scores
- IV3: Application routing and navigation unchanged

---

### Story 3.4: Frontend Error Reporting to CloudWatch

**As a** Frontend Developer,
**I want** unhandled frontend errors reported to CloudWatch,
**so that** I can debug production issues via logs in Grafana.

**Acceptance Criteria:**

1. Error reporting module created in `src/lib/tracking/error-reporter.ts`
2. React error boundary implemented to catch component errors
3. Global error handler for unhandled promise rejections and window errors
4. Error context captured (user agent, URL, stack trace, user session ID)
5. Errors sent to CloudWatch via API Gateway endpoint (batched for efficiency)
6. PII excluded from error reports (no user email, names, etc.)

**Integration Verification:**

- IV1: Existing error handling preserved (errors still display to users appropriately)
- IV2: Application functionality unaffected by error boundary wrapping
- IV3: Error boundary doesn't mask errors in development environment

---

### Story 3.5: Performance Validation and Optimization

**As a** QA Engineer,
**I want** comprehensive performance validation of all tracking instrumentation,
**so that** we confirm <50ms overhead requirement is met.

**Acceptance Criteria:**

1. Lighthouse CI configured to measure performance impact
2. Before/after performance tests run for page load (LCP, FID, CLS)
3. Lambda cold start and execution duration compared before/after EMF instrumentation
4. Bundle size analysis shows <50KB increase from tracking libraries
5. Load testing performed to validate tracking at expected traffic levels
6. Performance regression tests added to CI pipeline

**Integration Verification:**

- IV1: Application performance meets or exceeds pre-instrumentation baselines
- IV2: No performance regressions detected in critical user flows
- IV3: All existing performance tests still pass

---

### PHASE 4: Self-Hosted Analytics Tools

### Story 4.1: Umami Deployment on ECS/Fargate

**As a** DevOps Engineer,
**I want** Umami analytics deployed on ECS/Fargate with Aurora database,
**so that** the Product team can access privacy-focused web analytics.

**Acceptance Criteria:**

1. Umami Docker image configured and tested locally
2. ECS task definition created for Umami (0.25-0.5 vCPU, 512MB-1GB RAM)
3. ECS service deployed in private subnet with ALB (or direct service discovery)
4. Environment variables configured (database connection, encryption keys)
5. Umami web UI accessible and initial admin account created
6. Health checks configured and ECS service auto-recovery validated

**Integration Verification:**

- IV1: Aurora database performance unaffected by Umami connections
- IV2: ECS deployment doesn't interfere with existing application infrastructure
- IV3: Network connectivity from frontend (CloudFront) to Umami tracking endpoint works

---

### Story 4.2: OpenReplay Deployment on ECS/Fargate

**As a** DevOps Engineer,
**I want** OpenReplay deployed on ECS/Fargate with S3 storage,
**so that** Customer Service can replay user sessions for troubleshooting.

**Acceptance Criteria:**

1. OpenReplay Docker containers configured (multiple services: backend, storage, etc.)
2. ECS task definitions created for OpenReplay services (0.5-1 vCPU, 1-2GB RAM)
3. ECS services deployed with appropriate networking and load balancing
4. S3 bucket integration configured for session storage
5. OpenReplay web UI accessible and initial admin account created
6. Session recording backend validated with test recording

**Integration Verification:**

- IV1: S3 bucket permissions scoped correctly (no access to application buckets)
- IV2: ECS resources within VPC limits and quotas
- IV3: Network traffic from frontend to OpenReplay backend validated

---

### Story 4.3: Frontend Tracking Script Integration (Umami + OpenReplay)

**As a** Frontend Developer,
**I want** Umami and OpenReplay tracking scripts integrated into the React app,
**so that** user sessions and analytics are captured from production traffic.

**Acceptance Criteria:**

1. OpenReplay SDK installed via npm (`@openreplay/tracker`)
2. Umami tracking script integration configured (script tag or npm package)
3. Tracking initialization module created in `src/lib/tracking/` directory
4. Initialization happens in `main.tsx` before React render, asynchronously
5. Environment detection prevents tracking in development mode (optional based on preference)
6. Session recording and analytics events verified in respective UIs

**Integration Verification:**

- IV1: Vite HMR works correctly in development with tracking code present
- IV2: Production build succeeds and application loads without errors
- IV3: Tracking scripts don't block React render or impact initial page load

---

### Story 4.4: PII Masking Configuration and Validation

**As a** Privacy Officer,
**I want** comprehensive PII masking configured in OpenReplay session recordings,
**so that** sensitive user data is never captured or stored.

**Acceptance Criteria:**

1. OpenReplay sanitization rules configured for: email fields, name fields, payment info, password inputs, SSN, phone numbers
2. CSS selectors and input name patterns defined for PII fields
3. Automated tests created to verify PII masking (test forms with fake PII data)
4. Manual audit of 10+ test sessions confirms no PII visible in recordings
5. Masking configuration documented in runbook
6. PII masking rules versioned in source control

**Integration Verification:**

- IV1: Non-PII form fields still recorded correctly (debugging remains useful)
- IV2: Session replay usability maintained despite masking
- IV3: Application form validation and submission unaffected by tracking

---

### Story 4.5: End-to-End Testing and Documentation

**As a** Project Owner,
**I want** comprehensive end-to-end validation and documentation completed,
**so that** the observability stack is production-ready and maintainable.

**Acceptance Criteria:**

1. End-to-end smoke test suite created validating data flow: Frontend → OpenReplay/Umami → Grafana dashboards
2. All 18 previous story acceptance criteria re-validated in integrated environment
3. Runbook created covering: deployment, rollback, troubleshooting, common issues
4. Dashboard documentation created explaining each Grafana panel and its purpose
5. Team training materials prepared (quick start guides for Product, Engineering, CS)
6. Launch checklist completed confirming all success criteria from project brief met

**Integration Verification:**

- IV1: Complete application regression test suite passes with all tracking enabled
- IV2: Performance benchmarks meet targets (100% session capture, <50ms overhead, budget within limits)
- IV3: Existing functionality unaffected - application works identically to pre-instrumentation state
