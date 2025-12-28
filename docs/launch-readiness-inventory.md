# Launch Readiness Technical Inventory

**Date:** 2025-12-27
**Authors:** Winston (Architect Agent), Sally (UX Expert Agent)
**Status:** Complete

---

## Executive Summary

This document provides a comprehensive technical inventory of the LEGO MOC Instructions platform to support launch readiness planning. The assessment covers applications, packages, infrastructure, CI/CD, monitoring, and identifies gaps requiring documentation before launch.

**Key Findings:**
- 43 Lambda functions deployed across 7 API domains
- 10 web applications (1 shell + 9 micro-frontends)
- 23 shared packages (15 documented, 8 need READMEs)
- Robust CI/CD with 15 GitHub workflows
- CloudWatch monitoring exists but is undocumented
- **No runbooks exist** for any operational procedures
- Security scanning active but compliance documentation missing
- **No UX review completed** for any user journey
- **Accessibility untested** - WCAG compliance unknown
- **No user support channel** - help/feedback mechanisms missing

**Estimated Work:** 45-55 stories across 7 workstreams

---

## 1. Application Inventory

### 1.1 Backend API (`apps/api`)

The API is deployed using Serverless Framework with AWS Lambda, API Gateway, Aurora PostgreSQL, and OpenSearch.

#### Lambda Functions by Domain

| Domain | Functions | Auth Required | Description |
|--------|-----------|---------------|-------------|
| **Health** | 1 | No | Health check endpoint |
| **Gallery** | 12 | Yes | Image upload, albums, search, flagging |
| **MOC Instructions** | 12 | Yes | CRUD, file management, stats |
| **MOC Upload Sessions** | 5 | Yes | Multipart upload flow |
| **Wishlist** | 8 | Yes | CRUD, reorder, search, images |
| **Parts Lists** | 7 | Yes | CRUD, parsing, status |
| **WebSocket** | 3 | Yes | Real-time connect/disconnect/messages |
| **Scheduled** | 1 | N/A | Daily cleanup of orphaned files |
| **Total** | **43** | | |

#### API Endpoints Reference

```
# Health (Public)
GET  /health

# Gallery (Authenticated)
POST /api/gallery/images
GET  /api/gallery/images
GET  /api/gallery/images/{id}
PATCH /api/gallery/images/{id}
DELETE /api/gallery/images/{id}
POST /api/gallery/images/{id}/flag
GET  /api/gallery/search
POST /api/gallery/albums
GET  /api/gallery/albums
GET  /api/gallery/albums/{id}
PATCH /api/gallery/albums/{id}
DELETE /api/gallery/albums/{id}

# MOC Instructions (Authenticated)
GET  /api/mocs
POST /api/mocs
POST /api/mocs/{id}/finalize
POST /api/mocs/{id}/files
GET  /api/mocs/{mocId}/files/{fileId}/download
DELETE /api/mocs/{id}/files/{fileId}
GET  /api/mocs/stats
GET  /api/mocs/uploads-over-time
GET  /api/mocs/{id}/gallery-images
POST /api/mocs/{id}/gallery-images
DELETE /api/mocs/{id}/gallery-images/{imageId}
POST /api/mocs/{id}/parts-list
POST /api/mocs/{mocId}/edit/finalize

# MOC Upload Sessions (Authenticated)
POST /api/mocs/uploads/sessions
POST /api/mocs/uploads/sessions/{sessionId}/files
PUT  /api/mocs/uploads/sessions/{sessionId}/files/{fileId}/parts/{partNumber}
POST /api/mocs/uploads/sessions/{sessionId}/files/{fileId}/complete
POST /api/mocs/uploads/sessions/{sessionId}/finalize

# Wishlist (Authenticated)
GET  /api/wishlist
POST /api/wishlist
GET  /api/wishlist/{id}
PATCH /api/wishlist/{id}
DELETE /api/wishlist/{id}
POST /api/wishlist/reorder
GET  /api/wishlist/search
POST /api/wishlist/{id}/image

# Parts Lists (Authenticated)
POST /api/parts-lists
GET  /api/parts-lists/{id}
PATCH /api/parts-lists/{id}
DELETE /api/parts-lists/{id}
POST /api/parts-lists/{id}/parse
PATCH /api/parts-lists/{id}/status
GET  /api/parts-lists/user-summary
```

#### API Documentation Status

| Document | Exists | Location | Quality |
|----------|--------|----------|---------|
| API README | Yes | `apps/api/README.md` | Excellent (560 lines) |
| OpenAPI Spec | No | - | Needs creation |
| Postman Collection | No | - | Needs creation |
| Error Codes Reference | No | - | Needs creation |

---

### 1.2 Frontend Web Applications

#### Application Inventory

| App | Path | Type | README | Runbook |
|-----|------|------|--------|---------|
| `main-app` | `apps/web/main-app` | Shell (host) | **Missing** | **Missing** |
| `app-dashboard` | `apps/web/app-dashboard` | Micro-frontend | Present | **Missing** |
| `app-instructions-gallery` | `apps/web/app-instructions-gallery` | Micro-frontend | Present | **Missing** |
| `app-inspiration-gallery` | `apps/web/app-inspiration-gallery` | Micro-frontend | Present | **Missing** |
| `app-wishlist-gallery` | `apps/web/app-wishlist-gallery` | Micro-frontend | Present | **Missing** |
| `app-sets-gallery` | `apps/web/app-sets-gallery` | Micro-frontend | Present | **Missing** |
| `user-settings` | `apps/web/user-settings` | Micro-frontend | Present | **Missing** |
| `reset-password` | `apps/web/reset-password` | Auth flow | **Missing** | **Missing** |
| `playwright` | `apps/web/playwright` | E2E tests | **Missing** | N/A |

#### Frontend Stack

- **Framework:** React 19
- **Build:** Vite with Module Federation
- **State:** RTK Query
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** AWS Cognito
- **Hosting:** S3 + CloudFront

---

## 2. Package Documentation Status

### 2.1 Core Packages (`packages/core/`)

| Package | README | Quality | Purpose |
|---------|--------|---------|---------|
| `accessibility` | **Missing** | - | A11y utilities, focus management |
| `api-client` | Present | Excellent | RTK Query client, auth integration |
| `app-component-library` | **Missing** | - | @repo/ui shadcn components |
| `cache` | Present | Good | Client-side caching utilities |
| `charts` | **Missing** | - | Chart components (Recharts) |
| `design-system` | Present | Excellent | Design tokens, Tailwind preset |
| `file-list` | Present | Good | File list display component |
| `gallery` | **Missing** | - | Shared gallery utilities |
| `logger` | **Missing** | - | @repo/logger structured logging |
| `upload-client` | **Missing** | - | Client-side upload utilities |
| `upload-types` | **Missing** | - | Zod schemas for uploads |

**Core Packages Summary:** 6 of 11 have READMEs

### 2.2 Backend Packages (`packages/backend/`)

| Package | README | Quality | Purpose |
|---------|--------|---------|---------|
| `cognito-client` | Present | Good | Cognito API wrapper |
| `db` | Present | Excellent | Drizzle ORM, connection pooling |
| `file-validator` | Present | Good | File type/size validation |
| `image-processing` | Present | Good | Sharp image processing |
| `lambda-auth` | Present | Excellent | JWT validation, ownership |
| `lambda-responses` | Present | Good | Standardized Lambda responses |
| `lambda-utils` | Present | Good | Lambda handler utilities |
| `mock-data` | **Missing** | - | Test fixtures |
| `pii-sanitizer` | Present | Good | PII removal for logging |
| `rate-limiter` | Present | Good | Request rate limiting |
| `s3-client` | **Missing** | - | S3 operations wrapper |
| `search` | Present | Good | OpenSearch client |

**Backend Packages Summary:** 10 of 12 have READMEs

### 2.3 Packages Requiring Documentation

Priority list of packages needing READMEs:

1. **`app-component-library`** - Critical, imported as @repo/ui everywhere
2. **`logger`** - Critical, used in all backend code
3. **`accessibility`** - Important for a11y compliance
4. **`upload-client`** - Important for understanding upload flow
5. **`upload-types`** - Important for Zod schema reference
6. **`gallery`** - Moderate priority
7. **`charts`** - Lower priority
8. **`mock-data`** - Lower priority (test support)
9. **`s3-client`** - Lower priority (internal use)

---

## 3. Infrastructure Documentation

### 3.1 AWS Resources (per serverless.yml)

| Resource | Type | Stages | Notes |
|----------|------|--------|-------|
| VPC | AWS::EC2::VPC | All | /24 CIDR, 2 AZs |
| Subnets | Public + Private | All | 2 public, 2 private |
| NAT Gateway | AWS::EC2::NatGateway | staging/prod only | Cost optimization |
| VPC Endpoints | S3, SecretsManager, Logs | dev only | Alternative to NAT |
| Aurora PostgreSQL | Serverless v2 | All | 0.5-4 ACU based on stage |
| OpenSearch | AWS::OpenSearchService::Domain | staging/prod only | PostgreSQL FTS in dev |
| S3 Bucket | Files storage | All | Lifecycle rules for multipart |
| Cognito | User Pool + Client | All | Email OTP, social login ready |
| DynamoDB | WebSocket connections | All | TTL enabled |
| API Gateway | HTTP API v2 | All | JWT authorizer |

### 3.2 Environment Configuration

| Environment | Stage | NAT Gateway | OpenSearch | Dashboard |
|-------------|-------|-------------|------------|-----------|
| Development | `dev` | No | No | No |
| Staging | `staging` | Yes | Yes | Yes |
| Production | `production` | Yes | Yes | Yes |

### 3.3 Secrets Management

| Secret Type | Storage | Rotation |
|-------------|---------|----------|
| Database credentials | Secrets Manager | Auto-generated |
| OAuth (Google) | SSM Parameter Store | Manual |
| OAuth (Apple) | SSM Parameter Store | Manual |
| OAuth (Facebook) | SSM Parameter Store | Manual |
| AWS credentials (CI) | GitHub Secrets | Manual |

---

## 4. CI/CD Pipeline Documentation

### 4.1 GitHub Workflows

| Workflow | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| `ci.yml` | PR, push to main/develop | Lint, typecheck, test | Active |
| `deploy-lego-api.yml` | Push to main, manual | Deploy API to dev | Active |
| `deploy-frontend.yml` | Push to main, manual | Deploy to S3/CloudFront | Active |
| `e2e.yml` | On demand | Playwright E2E tests | Active |
| `security.yml` | Scheduled, PR | Security scanning | Active |
| `dependencies.yml` | Scheduled | Dependency updates | Active |
| `release.yml` | Manual | Release management | Active |
| `coderabbit-integration.yml` | PR | AI code review | Active |
| `coderabbit-status.yml` | PR | Review status | Active |
| `project-automation.yml` | Issues, PRs | Project board automation | Active |
| `archive-done-items.yml` | Scheduled | Archive completed items | Active |
| `update-issue-status.yml` | PR events | Issue status sync | Active |
| `setup-branch-protection.yml` | Manual | Branch protection rules | Active |
| `deploy-api-lambdas.yml` | Manual | Individual Lambda deploy | Active |
| `reusable-deploy-lambda.yml` | Called | Reusable Lambda deploy | Active |

### 4.2 Deployment Documentation Status

| Document | Exists | Location |
|----------|--------|----------|
| API Deployment Guide | Partial | `apps/api/README.md` |
| Frontend Deployment Guide | No | - |
| Rollback Procedures | No | - |
| Hotfix Procedures | No | - |
| Feature Flag Management | No | - |

---

## 5. Monitoring & Observability

### 5.1 Current Monitoring Setup

| Component | Configured | Documented |
|-----------|------------|------------|
| CloudWatch Dashboard | Yes (conditional) | **No** |
| CloudWatch Alarms | Yes (10 alarms) | **No** |
| X-Ray Tracing | Yes | **No** |
| Lambda Metrics | Yes (auto) | **No** |
| API Gateway Metrics | Yes (auto) | **No** |
| Aurora Metrics | Yes (auto) | **No** |
| OpenSearch Metrics | Yes (auto) | **No** |

### 5.2 Configured CloudWatch Alarms

| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| `lambda-errors` | Lambda Errors | > 5 in 5min | None configured |
| `api-5xx-errors` | API Gateway 5xx | > 10 in 5min | None configured |
| `api-high-latency` | API Gateway p95 | > 5000ms | None configured |
| `aurora-high-cpu` | RDS CPU | > 80% | None configured |
| `aurora-high-connections` | RDS Connections | > 50 | None configured |
| `opensearch-cluster-red` | ES ClusterStatus.red | >= 1 | None configured |
| `opensearch-jvm-pressure` | ES JVMMemoryPressure | > 80% | None configured |
| `dynamodb-throttle` | DynamoDB ThrottledRequests | >= 1 | None configured |
| `lambda-slow` | Lambda Duration p95 | > 25000ms | None configured |
| `health-check-failing` | Lambda Errors (health) | >= 1 | None configured |

**Note:** Alarms exist but no SNS topics or notification actions are configured.

### 5.3 Monitoring Documentation Needed

1. Dashboard interpretation guide
2. Alarm response runbooks
3. Metrics reference guide
4. Log analysis procedures
5. X-Ray trace debugging guide

---

## 6. Operational Runbooks (All Missing)

### 6.1 API Runbooks Needed

| Runbook | Priority | Description |
|---------|----------|-------------|
| API Deployment | Critical | Step-by-step deployment procedures |
| API Rollback | Critical | How to rollback a failed deployment |
| Lambda Troubleshooting | High | Cold starts, timeouts, OOM errors |
| Database Operations | High | Migrations, backups, point-in-time recovery |
| Database Troubleshooting | High | Connection issues, slow queries |
| Cache Operations | Medium | Redis/OpenSearch cache management |
| Rate Limiting Adjustments | Medium | How to modify limits |
| S3 Cleanup | Low | Manual file cleanup procedures |

### 6.2 Frontend Runbooks Needed

| Runbook | Priority | Description |
|---------|----------|-------------|
| Frontend Deployment | Critical | S3 sync, CloudFront invalidation |
| Frontend Rollback | Critical | Restore previous version |
| Module Federation Debug | Medium | Micro-frontend issues |

### 6.3 Infrastructure Runbooks Needed

| Runbook | Priority | Description |
|---------|----------|-------------|
| VPC Troubleshooting | Medium | Network connectivity issues |
| Aurora Scaling | Medium | Manual capacity adjustments |
| OpenSearch Operations | Medium | Index management, reindexing |
| Cognito User Management | Medium | Password resets, user lockouts |
| SSL Certificate Renewal | Low | CloudFront certificate updates |

### 6.4 Incident Response Needed

| Document | Priority | Description |
|----------|----------|-------------|
| On-Call Playbook | Critical | Contact list, escalation paths |
| Incident Classification | High | Severity levels, SLAs |
| Post-Mortem Template | High | Incident documentation format |
| Communication Templates | Medium | Status page updates, customer comms |

---

## 7. Security & Compliance

### 7.1 Current Security Measures

| Measure | Status | Notes |
|---------|--------|-------|
| JWT Authentication | Active | Cognito + API Gateway authorizer |
| VPC Isolation | Active | Lambda in private subnets |
| Encryption at Rest | Active | S3, Aurora, OpenSearch |
| Encryption in Transit | Active | HTTPS enforced |
| IAM Least Privilege | Partial | Per-function roles |
| Dependency Scanning | Active | `security.yml` workflow |
| Secret Management | Active | Secrets Manager + SSM |

### 7.2 Security Documentation Needed

| Document | Priority | Description |
|----------|----------|-------------|
| Secret Rotation Runbook | High | How to rotate each secret type |
| IAM Audit Process | High | Periodic permission review |
| Security Incident Response | High | Breach response procedures |
| Dependency Audit Process | Medium | Regular dependency reviews |
| Penetration Testing | Medium | Scope and schedule |

### 7.3 Compliance Documentation Needed

| Document | Priority | Description |
|----------|----------|-------------|
| Data Retention Policy | High | What data is kept, for how long |
| Data Privacy Documentation | High | GDPR/CCPA compliance |
| Data Classification | Medium | Sensitivity levels |
| Access Control Matrix | Medium | Who can access what |
| Audit Logging | Medium | What's logged, retention |

---

## 8. Recommended Workstreams

### Workstream 1: Package Documentation
**Scope:** 8 packages missing READMEs
**Priority:** High
**Estimated Stories:** 8-10

| Story | Package | Priority |
|-------|---------|----------|
| 1.1 | `app-component-library` | Critical |
| 1.2 | `logger` | Critical |
| 1.3 | `accessibility` | High |
| 1.4 | `upload-client` | High |
| 1.5 | `upload-types` | High |
| 1.6 | `gallery` | Medium |
| 1.7 | `charts` | Low |
| 1.8 | `mock-data` | Low |
| 1.9 | `s3-client` | Low |

### Workstream 2: App Runbooks
**Scope:** API + Frontend operational procedures
**Priority:** Critical
**Estimated Stories:** 10-12

| Story | Runbook | Priority |
|-------|---------|----------|
| 2.1 | API Deployment Runbook | Critical |
| 2.2 | API Rollback Runbook | Critical |
| 2.3 | Frontend Deployment Runbook | Critical |
| 2.4 | Frontend Rollback Runbook | Critical |
| 2.5 | Lambda Troubleshooting | High |
| 2.6 | Database Operations | High |
| 2.7 | Database Troubleshooting | High |
| 2.8 | Cache Operations | Medium |
| 2.9 | Rate Limiting | Medium |
| 2.10 | Module Federation Debug | Medium |

### Workstream 3: Infrastructure Runbooks
**Scope:** AWS infrastructure operations
**Priority:** High
**Estimated Stories:** 5-6

| Story | Runbook | Priority |
|-------|---------|----------|
| 3.1 | VPC Troubleshooting | Medium |
| 3.2 | Aurora Operations | High |
| 3.3 | OpenSearch Operations | Medium |
| 3.4 | Cognito User Management | Medium |
| 3.5 | S3 Lifecycle Management | Low |

### Workstream 4: Incident Response
**Scope:** On-call and incident management
**Priority:** Critical
**Estimated Stories:** 4-5

| Story | Document | Priority |
|-------|----------|----------|
| 4.1 | On-Call Playbook | Critical |
| 4.2 | Incident Classification | High |
| 4.3 | Post-Mortem Template | High |
| 4.4 | Communication Templates | Medium |
| 4.5 | Escalation Procedures | Medium |

### Workstream 5: Monitoring Documentation
**Scope:** Dashboard and alerting documentation
**Priority:** High
**Estimated Stories:** 3-4

| Story | Document | Priority |
|-------|----------|----------|
| 5.1 | CloudWatch Dashboard Guide | High |
| 5.2 | Alarm Response Runbooks | High |
| 5.3 | Metrics Reference | Medium |
| 5.4 | Log Analysis Guide | Medium |

### Workstream 6: Security & Compliance
**Scope:** Security procedures and compliance docs
**Priority:** High
**Estimated Stories:** 5-6

| Story | Document | Priority |
|-------|----------|----------|
| 6.1 | Secret Rotation Runbook | High |
| 6.2 | IAM Audit Process | High |
| 6.3 | Security Incident Response | High |
| 6.4 | Data Retention Policy | High |
| 6.5 | Data Privacy Documentation | Medium |
| 6.6 | Access Control Matrix | Medium |

---

## 9. User Experience Readiness

**Author:** Sally (UX Expert Agent)

### 9.1 User Journey Audit Status

| Journey | Implemented | UX Reviewed | Edge Cases Handled |
|---------|-------------|-------------|-------------------|
| **Signup/Onboarding** | Yes | **No** | Unknown |
| **First MOC Upload** | Yes | **No** | Unknown |
| **Browse Own Gallery** | Yes | **No** | Unknown |
| **Edit Existing MOC** | Yes | **No** | Unknown |
| **Wishlist Management** | Partial | **No** | Unknown |
| **Inspiration Gallery** | Partial | **No** | Unknown |
| **Sets Collection** | Partial | **No** | Unknown |
| **Account Settings** | Yes | **No** | Unknown |
| **Password Reset** | Yes | **No** | Unknown |

### 9.2 Critical UX Components Status

| Component | Exists | Consistent | Documented |
|-----------|--------|------------|------------|
| Loading States (spinners/skeletons) | Partial | **Unknown** | **No** |
| Empty States | Partial | **Unknown** | **No** |
| Error Messages (user-facing) | Partial | **Unknown** | **No** |
| Success Confirmations | Partial | **Unknown** | **No** |
| Form Validation Feedback | Yes | **Unknown** | **No** |
| Toast/Notification System | Yes | **Unknown** | **No** |
| Modal Patterns | Yes | **Unknown** | **No** |
| Navigation Breadcrumbs | Partial | **Unknown** | **No** |

### 9.3 Accessibility Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| `accessibility` package | Exists | Undocumented |
| Keyboard Navigation | **Untested** | Focus traps, tab order |
| Screen Reader Support | **Untested** | ARIA labels, live regions |
| Color Contrast (WCAG AA) | **Untested** | 4.5:1 text, 3:1 UI |
| Focus Indicators | **Untested** | Visible focus rings |
| Skip Links | **Unknown** | Skip to main content |
| Form Labels | **Untested** | Associated labels |
| Alt Text for Images | **Untested** | MOC images, thumbnails |
| Motion/Animation Controls | **Unknown** | Reduce motion support |

### 9.4 Responsive Design Status

| Breakpoint | Tested | Issues Known |
|------------|--------|--------------|
| Mobile (< 640px) | **No** | Unknown |
| Tablet (640-1024px) | **No** | Unknown |
| Desktop (1024-1440px) | Partial | Unknown |
| Large Desktop (> 1440px) | **No** | Unknown |

### 9.5 Browser Compatibility

| Browser | Tested | Supported |
|---------|--------|-----------|
| Chrome (latest 2) | **No** | TBD |
| Firefox (latest 2) | **No** | TBD |
| Safari (latest 2) | **No** | TBD |
| Edge (latest 2) | **No** | TBD |
| Mobile Safari | **No** | TBD |
| Mobile Chrome | **No** | TBD |

### 9.6 Error Handling UX

| Scenario | User Message | Recovery Path |
|----------|--------------|---------------|
| Network Offline | **Undocumented** | Unknown |
| API 500 Error | **Undocumented** | Unknown |
| API 401 (Session Expired) | **Undocumented** | Unknown |
| API 403 (Forbidden) | **Undocumented** | Unknown |
| API 404 (Not Found) | **Undocumented** | Unknown |
| API 429 (Rate Limited) | **Undocumented** | Unknown |
| Upload Failed | **Undocumented** | Unknown |
| File Too Large | **Undocumented** | Unknown |
| Invalid File Type | **Undocumented** | Unknown |
| Form Validation Error | Exists | Inline feedback |

### 9.7 Empty State Inventory

| Screen | Empty State Exists | CTA Provided |
|--------|-------------------|--------------|
| Dashboard (no MOCs) | **Unknown** | Unknown |
| Instructions Gallery (empty) | **Unknown** | Unknown |
| Wishlist (empty) | **Unknown** | Unknown |
| Inspiration Gallery (empty) | **Unknown** | Unknown |
| Sets Collection (empty) | **Unknown** | Unknown |
| Search Results (no matches) | **Unknown** | Unknown |

### 9.8 User Support & Feedback

| Channel | Exists | Location |
|---------|--------|----------|
| Help/FAQ Page | **No** | - |
| Contact/Support Email | **No** | - |
| In-App Feedback Widget | **No** | - |
| Error Reporting (user-facing) | **No** | - |
| Feature Request Mechanism | **No** | - |

### 9.9 UX Workstream

**Scope:** User-facing experience readiness
**Priority:** Critical
**Estimated Stories:** 10-12

| Story | Focus | Priority | Effort |
|-------|-------|----------|--------|
| 7.1 | **First-Time User Onboarding Flow** | Critical | Medium |
| 7.2 | **Error Message Standardization** | Critical | Medium |
| 7.3 | **Empty States Audit & Implementation** | High | Medium |
| 7.4 | **Loading State Consistency Audit** | High | Small |
| 7.5 | **Accessibility Audit (WCAG 2.1 AA)** | Critical | Large |
| 7.6 | **Mobile Responsive Audit** | High | Medium |
| 7.7 | **Session Expiry & Re-auth UX** | High | Medium |
| 7.8 | **Browser Compatibility Testing** | Medium | Small |
| 7.9 | **404 & Error Page Design** | Medium | Small |
| 7.10 | **User Feedback/Support Channel** | High | Medium |
| 7.11 | **Navigation for Incomplete Features** | High | Small |
| 7.12 | **Confirmation & Success Feedback Audit** | Medium | Small |

---

## 10. Summary

### Total Documentation Effort

| Workstream | Stories | Priority |
|------------|---------|----------|
| 1. Package Documentation | 8-10 | High |
| 2. App Runbooks | 10-12 | Critical |
| 3. Infrastructure Runbooks | 5-6 | High |
| 4. Incident Response | 4-5 | Critical |
| 5. Monitoring Documentation | 3-4 | High |
| 6. Security & Compliance | 5-6 | High |
| **7. User Experience Readiness** | **10-12** | **Critical** |
| **Total** | **45-55** | |

### Critical Path Items (Must-Have for Launch)

1. API Deployment Runbook
2. API Rollback Runbook
3. Frontend Deployment Runbook
4. Frontend Rollback Runbook
5. On-Call Playbook
6. Incident Classification
7. `app-component-library` README
8. `logger` README
9. CloudWatch Dashboard Guide
10. Alarm Response Runbooks
11. **Error Message Standardization** - Users need understandable errors
12. **Session Expiry UX** - Graceful re-authentication flow
13. **Empty States for Core Features** - Dashboard, Instructions Gallery
14. **Basic Accessibility** - Keyboard nav, focus indicators, alt text
15. **Mobile Responsive (minimum viable)** - Primary flows work on mobile

### Quick Wins (Can be done rapidly)

1. Package READMEs (template-based)
2. Post-Mortem Template (standard format)
3. Communication Templates (standard format)
4. Data Retention Policy (document existing practices)
5. **Empty State Components** - Template-based, reuse across galleries
6. **Standard Error Toast Messages** - Map API errors to user messages
7. **Loading Skeleton Components** - Already exist in shadcn/ui
8. **"Coming Soon" Badges** - For incomplete feature areas

---

## Appendix A: Existing Documentation Files

```
docs/
├── architecture/
│   ├── api-design-and-integration.md
│   ├── front-end-architecture.md
│   └── [12 more architecture docs]
├── operations/
│   └── config-management.md
├── prd/
│   ├── epic-5-inspiration-gallery.md
│   ├── epic-6-wishlist.md
│   └── epic-7-sets-gallery.md
├── stories/
│   └── [organized by epic]
└── _archive/
    └── completed-stories/
```

## Appendix B: Related Files

- `apps/api/serverless.yml` - Complete infrastructure definition
- `apps/api/README.md` - API documentation
- `.github/workflows/` - All CI/CD workflows
- `packages/*/README.md` - Package documentation (where exists)

---

**Document Version:** 1.1
**Last Updated:** 2025-12-27
**Contributors:** Winston (Architect), Sally (UX Expert)
**Next Review:** Before launch
