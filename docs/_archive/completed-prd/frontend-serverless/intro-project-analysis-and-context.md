# Intro Project Analysis and Context

## Analysis Source

**Analysis Available:**

- ✅ **Comprehensive Project Brief** available at: `docs/brief-frontend-serverless-migration.md`
- ✅ **Architecture Documentation** available:
  - `docs/architecture/tech-stack.md`
  - `docs/architecture/source-tree.md`
  - `docs/architecture/coding-standards.md`
- ✅ **Serverless Infrastructure** deployed at: `apps/api/lego-api-serverless/sst.config.ts`

**Analysis Type:** **Hybrid** - Combination of existing documentation + IDE-based project analysis

## Existing Project Overview

The **LEGO MOC Instructions** application is a full-stack monorepo enabling users to create, browse, and manage LEGO MOC (My Own Creation) instructions with gallery and wishlist features.

**Current Architecture:**

- **Frontend**: React 19 SPA (`lego-moc-instructions-app`) using TanStack Router, Redux Toolkit, RTK Query, Tailwind CSS
- **Backend (Legacy)**: Express.js API (`lego-projects-api`) on port 9000 with MongoDB/Mongoose + PostgreSQL/Drizzle
- **Backend (Serverless)**: AWS Lambda + API Gateway v2 (`lego-api-serverless`) deployed via SST v3 with PostgreSQL, Redis, OpenSearch, S3
- **Authentication**: AWS Cognito with JWT tokens
- **Infrastructure**: AWS-native (Lambda, API Gateway, RDS, S3, ElastiCache, OpenSearch, Cognito)

**Current State:** The backend has been **successfully migrated** to serverless, but the **frontend still points to the Express API** on port 9000, creating technical debt and blocking access to new serverless capabilities.

## Available Documentation Analysis

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

## Enhancement Scope Definition

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

## Goals and Background Context

**Goals:**

- Decommission Express backend within 1 week post-migration, reducing AWS costs by ~$200/month
- Enable access to serverless-only capabilities (parts-lists, WebSocket, direct S3 uploads)
- Reduce operational overhead (single backend to monitor, ~30% on-call burden reduction)
- Achieve zero downtime and <2% error rate increase during migration
- Maintain instant rollback capability throughout 3-4 week rollout period

**Background Context:**

The backend serverless migration (`lego-api-serverless`) was completed successfully, deploying 30+ Lambda functions with API Gateway v2, enhanced capabilities (presigned S3 uploads, parts-list integration, gallery linking), and WebSocket API for real-time features.

However, the frontend continues to use the deprecated Express API, creating **dual backend maintenance overhead**, **delayed feature releases**, **increased AWS costs**, and **risk of data inconsistency**. This enhancement eliminates the technical debt by migrating frontend API calls to the serverless backend while maintaining zero user-facing disruption through a **feature flag + staged rollout** strategy.

## Change Log

| Change              | Date       | Version | Description                                                                                                                                                                  | Author                 |
| ------------------- | ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Initial Draft       | 2025-11-23 | 0.1     | PRD created from project brief                                                                                                                                               | John (PM) + Claude     |
| Technical Decisions | 2025-11-23 | 0.2     | Feature flag, rollout, cache strategy finalized                                                                                                                              | John (PM) + User Input |
| Epic & Stories      | 2025-11-23 | 1.0     | Complete PRD with 16 stories, ready for review                                                                                                                               | John (PM) + Claude     |
| PO Refinements      | 2025-11-23 | 1.1     | Added PO validation recommendations: Route53 prerequisite, accessibility, UX preservation, error handling, localStorage lock, user communication, documentation improvements | Sarah (PO) + Claude    |

---
