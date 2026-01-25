# Epic 0: Launch Readiness Plan

## Overview

This epic covers all launch readiness work for the LEGO MOC instructions platform, including documentation, operational runbooks, UX improvements, and E2E testing. The work ensures the platform is ready for production use with proper operational support, accessibility compliance, and user experience polish.

**Total Stories:** 53
**Story Prefix:** `lnch`
**Status:** Draft

---

## Tech Stack Context

- **Frontend**: React 19, TanStack Router, Tailwind CSS, shadcn/ui
- **Backend**: AWS Lambda, Aurora PostgreSQL, S3, Cognito
- **Testing**: Vitest (unit), Playwright (E2E), axe-core (accessibility)
- **Monitoring**: CloudWatch, X-Ray
- **Infrastructure**: VPC, API Gateway, OpenSearch

---

## Workstreams

### 1. Package Documentation (9 stories)

Create README files for all shared packages to improve developer onboarding and maintainability.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1000 | README for @repo/ui (app-component-library) | Critical | S |
| lnch-1001 | README for @repo/logger | Critical | S |
| lnch-1002 | README for accessibility package | High | S |
| lnch-1003 | README for upload-client | High | S |
| lnch-1004 | README for upload-types | High | S |
| lnch-1005 | README for gallery package | Medium | S |
| lnch-1006 | README for charts package | Low | S |
| lnch-1007 | README for mock-data package | Low | S |
| lnch-1008 | README for s3-client | Low | S |

**Output Location:** `packages/*/README.md`

---

### 2. App Runbooks (10 stories)

Step-by-step operational procedures for deploying, rolling back, and troubleshooting the applications.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1009 | API Deployment Runbook | Critical | M |
| lnch-1010 | API Rollback Runbook | Critical | M |
| lnch-1011 | Frontend Deployment Runbook | Critical | M |
| lnch-1012 | Frontend Rollback Runbook | Critical | M |
| lnch-1013 | Lambda Troubleshooting Runbook | High | M |
| lnch-1014 | Database Operations Runbook | High | M |
| lnch-1015 | Database Troubleshooting Runbook | High | M |
| lnch-1016 | Cache Operations Runbook | Medium | M |
| lnch-1017 | Rate Limiting Adjustments Runbook | Medium | S |
| lnch-1018 | Module Federation Debugging | Medium | M |

**Output Location:** `docs/operations/runbooks/*.md`

---

### 3. Infrastructure Runbooks (5 stories)

Procedures for managing AWS infrastructure components.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1019 | VPC Troubleshooting Runbook | Medium | M |
| lnch-1020 | Aurora Operations Runbook | High | M |
| lnch-1021 | OpenSearch Operations Runbook | Medium | M |
| lnch-1022 | Cognito User Management Runbook | Medium | S |
| lnch-1023 | S3 Lifecycle Management Runbook | Low | S |

**Output Location:** `docs/operations/runbooks/*.md`

---

### 4. Incident Response (5 stories)

Documentation for handling production incidents effectively.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1024 | On-Call Playbook | Critical | M |
| lnch-1025 | Incident Classification Guide | Critical | S |
| lnch-1026 | Post-Mortem Template | High | S |
| lnch-1027 | Communication Templates | Medium | S |
| lnch-1028 | Escalation Procedures | Medium | S |

**Output Location:** `docs/operations/oncall-playbook.md`, `docs/operations/incidents/*.md`

---

### 5. Monitoring Documentation (4 stories)

Guides for understanding and using monitoring tools.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1029 | CloudWatch Dashboard Guide | High | M |
| lnch-1030 | Alarm Response Runbooks | High | L |
| lnch-1031 | Metrics Reference Guide | Medium | S |
| lnch-1032 | Log Analysis Guide | Medium | M |

**Output Location:** `docs/operations/monitoring/*.md`

---

### 6. Security & Compliance (6 stories)

Security procedures and compliance documentation.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1033 | Secret Rotation Runbook | High | M |
| lnch-1034 | IAM Audit Process | High | M |
| lnch-1035 | Security Incident Response | High | M |
| lnch-1036 | Data Retention Policy | High | S |
| lnch-1037 | Data Privacy Documentation | Medium | M |
| lnch-1038 | Access Control Matrix | Medium | M |

**Output Location:** `docs/operations/security/*.md`

---

### 7. UX Readiness (12 stories)

User experience improvements and accessibility compliance.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1039 | First-Time User Onboarding Flow | Critical | M |
| lnch-1040 | Error Message Standardization | Critical | M |
| lnch-1041 | Empty States Audit & Implementation | High | M |
| lnch-1042 | Loading State Consistency | High | S |
| lnch-1043 | Accessibility Audit (WCAG 2.1 AA) | Critical | L |
| lnch-1044 | Mobile Responsive Audit | High | M |
| lnch-1045 | Session Expiry & Re-auth UX | Critical | M |
| lnch-1046 | Browser Compatibility Testing | Medium | S |
| lnch-1047 | 404 & Error Page Design | Medium | S |
| lnch-1048 | User Feedback/Support Channel | High | M |
| lnch-1049 | Navigation for Incomplete Features | High | S |
| lnch-1050 | Confirmation & Success Feedback | Medium | S |

**Output Location:** Various frontend components in `apps/web/main-app/`

---

### 8. E2E Testing (2 stories)

End-to-end test coverage for critical user journeys.

| Story ID | Title | Priority | Effort |
|----------|-------|----------|--------|
| lnch-1051 | E2E Happy Path Journeys | High | L |
| lnch-1052 | E2E UX Improvements Verification | High | L |

**Output Location:** `apps/web/playwright/tests/*.spec.ts`

---

## Implementation Phases

### Phase 1: Critical Path (Must-Have Before Launch)

**12 stories** - These must be complete before any production launch.

| # | Story ID | Title | Workstream |
|---|----------|-------|------------|
| 1 | lnch-1000 | README for app-component-library | Package Docs |
| 2 | lnch-1001 | README for logger | Package Docs |
| 3 | lnch-1009 | API Deployment Runbook | App Runbooks |
| 4 | lnch-1010 | API Rollback Runbook | App Runbooks |
| 5 | lnch-1011 | Frontend Deployment Runbook | App Runbooks |
| 6 | lnch-1012 | Frontend Rollback Runbook | App Runbooks |
| 7 | lnch-1024 | On-Call Playbook | Incident Response |
| 8 | lnch-1025 | Incident Classification | Incident Response |
| 9 | lnch-1039 | First-Time User Onboarding | UX Readiness |
| 10 | lnch-1040 | Error Message Standardization | UX Readiness |
| 11 | lnch-1043 | Accessibility Audit (WCAG 2.1 AA) | UX Readiness |
| 12 | lnch-1045 | Session Expiry & Re-auth UX | UX Readiness |

---

### Phase 2: High Priority (Before Soft Launch)

**21 stories** - Complete before limited user access.

| # | Story ID | Title | Workstream |
|---|----------|-------|------------|
| 13 | lnch-1002 | README for accessibility | Package Docs |
| 14 | lnch-1003 | README for upload-client | Package Docs |
| 15 | lnch-1004 | README for upload-types | Package Docs |
| 16 | lnch-1013 | Lambda Troubleshooting | App Runbooks |
| 17 | lnch-1014 | Database Operations | App Runbooks |
| 18 | lnch-1015 | Database Troubleshooting | App Runbooks |
| 19 | lnch-1020 | Aurora Operations | Infra Runbooks |
| 20 | lnch-1026 | Post-Mortem Template | Incident Response |
| 21 | lnch-1029 | CloudWatch Dashboard Guide | Monitoring |
| 22 | lnch-1030 | Alarm Response Runbooks | Monitoring |
| 23 | lnch-1033 | Secret Rotation Runbook | Security |
| 24 | lnch-1034 | IAM Audit Process | Security |
| 25 | lnch-1035 | Security Incident Response | Security |
| 26 | lnch-1036 | Data Retention Policy | Security |
| 27 | lnch-1041 | Empty States | UX Readiness |
| 28 | lnch-1042 | Loading State Consistency | UX Readiness |
| 29 | lnch-1044 | Mobile Responsive Audit | UX Readiness |
| 30 | lnch-1048 | User Feedback Channel | UX Readiness |
| 31 | lnch-1049 | Incomplete Feature Navigation | UX Readiness |
| 32 | lnch-1051 | E2E Happy Path Journeys | E2E Testing |
| 33 | lnch-1052 | E2E UX Verification | E2E Testing |

---

### Phase 3: Medium Priority (Before General Availability)

**16 stories** - Complete before public launch.

| # | Story ID | Title | Workstream |
|---|----------|-------|------------|
| 34 | lnch-1005 | README for gallery | Package Docs |
| 35 | lnch-1016 | Cache Operations | App Runbooks |
| 36 | lnch-1017 | Rate Limiting Adjustments | App Runbooks |
| 37 | lnch-1018 | Module Federation Debugging | App Runbooks |
| 38 | lnch-1019 | VPC Troubleshooting | Infra Runbooks |
| 39 | lnch-1021 | OpenSearch Operations | Infra Runbooks |
| 40 | lnch-1022 | Cognito User Management | Infra Runbooks |
| 41 | lnch-1027 | Communication Templates | Incident Response |
| 42 | lnch-1028 | Escalation Procedures | Incident Response |
| 43 | lnch-1031 | Metrics Reference Guide | Monitoring |
| 44 | lnch-1032 | Log Analysis Guide | Monitoring |
| 45 | lnch-1037 | Data Privacy Documentation | Security |
| 46 | lnch-1038 | Access Control Matrix | Security |
| 47 | lnch-1046 | Browser Compatibility | UX Readiness |
| 48 | lnch-1047 | 404 & Error Pages | UX Readiness |
| 49 | lnch-1050 | Success Feedback | UX Readiness |

---

### Phase 4: Low Priority (Nice to Have)

**4 stories** - Complete when time allows.

| # | Story ID | Title | Workstream |
|---|----------|-------|------------|
| 50 | lnch-1006 | README for charts | Package Docs |
| 51 | lnch-1007 | README for mock-data | Package Docs |
| 52 | lnch-1008 | README for s3-client | Package Docs |
| 53 | lnch-1023 | S3 Lifecycle Management | Infra Runbooks |

---

## Dependencies

```
Phase 1 (Critical)
    │
    ├── All documentation stories can run in parallel
    │
    └── UX stories can run in parallel
            │
            ▼
Phase 2 (High Priority)
    │
    ├── lnch-1030 depends on lnch-1029 (Dashboard before Alarms)
    │
    ├── lnch-1035 references lnch-1033 (Security refs Secret Rotation)
    │
    └── E2E tests depend on UX stories being complete
            │
            ▼
Phase 3 & 4 (Medium/Low)
    │
    └── Can run in parallel after Phase 2
```

---

## Quick Wins

Template-based stories that can be completed rapidly:

| Story ID | Title | Effort |
|----------|-------|--------|
| lnch-1000 | README for app-component-library | S |
| lnch-1001 | README for logger | S |
| lnch-1025 | Incident Classification | S |
| lnch-1026 | Post-Mortem Template | S |
| lnch-1027 | Communication Templates | S |
| lnch-1036 | Data Retention Policy | S |
| lnch-1042 | Loading States | S |
| lnch-1049 | Incomplete Feature Navigation | S |

---

## Directory Structure

```
docs/
  operations/
    oncall-playbook.md           # lnch-1024
    runbooks/
      api-deployment.md          # lnch-1009
      api-rollback.md            # lnch-1010
      frontend-deployment.md     # lnch-1011
      frontend-rollback.md       # lnch-1012
      lambda-troubleshooting.md  # lnch-1013
      database-operations.md     # lnch-1014
      database-troubleshooting.md # lnch-1015
      cache-operations.md        # lnch-1016
      rate-limiting.md           # lnch-1017
      module-federation.md       # lnch-1018
      vpc-troubleshooting.md     # lnch-1019
      aurora-operations.md       # lnch-1020
      opensearch-operations.md   # lnch-1021
      cognito-management.md      # lnch-1022
      s3-lifecycle.md            # lnch-1023
    incidents/
      classification.md          # lnch-1025
      postmortem-template.md     # lnch-1026
      communication-templates.md # lnch-1027
      escalation-procedures.md   # lnch-1028
    monitoring/
      cloudwatch-dashboard.md    # lnch-1029
      alarm-response.md          # lnch-1030
      metrics-reference.md       # lnch-1031
      log-analysis.md            # lnch-1032
    security/
      secret-rotation.md         # lnch-1033
      iam-audit.md               # lnch-1034
      incident-response.md       # lnch-1035
      data-retention.md          # lnch-1036
      data-privacy.md            # lnch-1037
      access-control-matrix.md   # lnch-1038
packages/
  core/
    app-component-library/README.md  # lnch-1000
    logger/README.md                  # lnch-1001
    accessibility/README.md           # lnch-1002
    gallery/README.md                 # lnch-1005
    charts/README.md                  # lnch-1006
    mock-data/README.md               # lnch-1007
  backend/
    upload-client/README.md           # lnch-1003
    upload-types/README.md            # lnch-1004
    s3-client/README.md               # lnch-1008
apps/
  web/
    main-app/src/
      components/                     # UX stories
    playwright/
      tests/                          # E2E stories
```

---

## Effort Summary

| Size | Description | Count |
|------|-------------|-------|
| S | Small (1-2 hours) | 22 |
| M | Medium (2-4 hours) | 25 |
| L | Large (4-8 hours) | 6 |

---

## Workstream Priority Matrix

| Workstream | Critical | High | Medium | Low | Total |
|------------|----------|------|--------|-----|-------|
| Package Documentation | 2 | 3 | 1 | 3 | 9 |
| App Runbooks | 4 | 3 | 3 | 0 | 10 |
| Infrastructure Runbooks | 0 | 1 | 3 | 1 | 5 |
| Incident Response | 2 | 1 | 2 | 0 | 5 |
| Monitoring Documentation | 0 | 2 | 2 | 0 | 4 |
| Security & Compliance | 0 | 4 | 2 | 0 | 6 |
| UX Readiness | 4 | 5 | 3 | 0 | 12 |
| E2E Testing | 0 | 2 | 0 | 0 | 2 |
| **Total** | **12** | **21** | **16** | **4** | **53** |

---

## WCAG 2.1 AA Requirements (lnch-1043)

The accessibility audit must verify compliance with these key criteria:

| Criterion | Requirement |
|-----------|-------------|
| 1.1.1 Non-text Content | Alt text for images |
| 1.3.1 Info and Relationships | Semantic HTML |
| 1.4.3 Contrast (Minimum) | 4.5:1 text, 3:1 UI |
| 2.1.1 Keyboard | All functions via keyboard |
| 2.4.3 Focus Order | Logical tab order |
| 2.4.7 Focus Visible | Visible focus indicator |
| 3.3.2 Labels or Instructions | Form labels |
| 4.1.2 Name, Role, Value | ARIA for custom widgets |

---

## E2E Test Coverage (lnch-1051, lnch-1052)

### Happy Path Journeys (lnch-1051)

| Journey | Steps | Priority |
|---------|-------|----------|
| Signup -> Dashboard | 5+ | Critical |
| Login -> Dashboard | 3 | Critical |
| Create MOC | 6+ | Critical |
| View Gallery | 3 | High |
| Edit MOC | 4 | High |
| Delete MOC | 3 | High |
| Update Settings | 4 | Medium |

### UX Verification (lnch-1052)

- Error message display
- Empty states appearance
- Loading states behavior
- Session expiry handling
- 404 page display
- Accessibility (axe-core)

---

## Severity Levels (for Incident Response)

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| SEV1 | Complete outage | 15 min | Immediate |
| SEV2 | Major degradation | 30 min | 1 hour |
| SEV3 | Minor impact | 4 hours | Next business day |
| SEV4 | Low priority | Next business day | N/A |

---

## Change Log

| Date | Description |
|------|-------------|
| 2025-12-27 | Original stories created by SM Agent (Bob) |
| 2026-01-24 | Consolidated into plan format, migrated to plans directory |
