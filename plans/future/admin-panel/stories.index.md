---
doc_type: stories_index
title: "ADMI Stories Index"
status: active
story_prefix: "ADMI"
created_at: "2026-02-04T00:00:00Z"
updated_at: "2026-02-04T00:00:00Z"
---

# ADMI Stories Index

All stories in this epic use the `ADMI-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | 25 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| ADMI-001 | Create admin_audit_log database table | — |
| ADMI-002 | Configure IAM permissions for Cognito admin operations | — |
| ADMI-010 | Create AdminGuard route protection component | — |

---

## ADMI-001: Create admin_audit_log database table

**Status:** pending
**Depends On:** none
**Phase:** 1 (Foundation & Database)
**Feature:** Create Drizzle schema and migration for admin_audit_log table with fields for admin_user_id, action_type, target_user_id, reason, details (JSONB), result, error_message, ip_address, user_agent, and created_at with appropriate indexes
**Endpoints:** —
**Infrastructure:**
- PostgreSQL
- Drizzle ORM migration

**Goal:** Establish audit logging database table for tracking all administrative actions

**Risk Notes:** Low risk - straightforward schema creation

---

## ADMI-002: Configure IAM permissions for Cognito admin operations

**Status:** pending
**Depends On:** none
**Phase:** 1 (Foundation & Database)
**Feature:** Add IAM policy to Lambda execution role granting cognito-idp:ListUsers, cognito-idp:AdminGetUser, and cognito-idp:AdminUserGlobalSignOut permissions for the user pool
**Endpoints:** —
**Infrastructure:**
- AWS IAM
- Lambda execution role

**Goal:** Enable Lambda functions to perform admin operations on Cognito user pool

**Risk Notes:** Requires AWS access and proper permission scoping. Validate in staging before production.

---

## ADMI-003: Implement Cognito user listing service

**Status:** pending
**Depends On:** ADMI-002
**Phase:** 2 (Backend API)
**Feature:** Create backend service using AWS SDK CognitoIdentityProviderClient to list users with pagination support (50 per page) and optional email prefix filtering
**Endpoints:** —
**Infrastructure:**
- AWS SDK
- Cognito

**Goal:** Provide backend service for retrieving paginated user lists from Cognito

**Risk Notes:** Cognito ListUsers API has 60 req/sec rate limit. Email filter is prefix-only.

---

## ADMI-004: Implement GET /admin/users endpoint

**Status:** pending
**Depends On:** ADMI-003, ADMI-001
**Phase:** 2 (Backend API)
**Feature:** Create endpoint to list users with pagination support, returning user email, user ID (sub), Cognito status, and is_suspended flag from user_quotas table. Supports optional ?email= query parameter for search.
**Endpoints:**
- `GET /admin/users`
- `GET /admin/users?email={query}`

**Infrastructure:** —

**Goal:** Expose paginated user listing and search to frontend with combined Cognito and database data

**Risk Notes:** Must join Cognito data with user_quotas table. Handle cases where user_quotas record doesn't exist.

---

## ADMI-005: Implement GET /admin/users/:userId endpoint

**Status:** pending
**Depends On:** ADMI-002, ADMI-001
**Phase:** 2 (Backend API)
**Feature:** Create endpoint to retrieve detailed user information including email, user ID (sub), Cognito status, account creation date, is_suspended flag, suspended_at, and suspended_reason from user_quotas
**Endpoints:**
- `GET /admin/users/:userId`

**Infrastructure:** —

**Goal:** Provide detailed user information for admin review before taking action

**Risk Notes:** Must handle case where user exists in Cognito but not in user_quotas table

---

## ADMI-006: Implement POST /admin/users/:userId/revoke-tokens endpoint

**Status:** pending
**Depends On:** ADMI-002, ADMI-001
**Phase:** 2 (Backend API)
**Feature:** Create endpoint that calls Cognito AdminUserGlobalSignOut API to invalidate all refresh tokens for a user, with audit logging of admin_user_id, target_user_id, action result, IP address, and user agent
**Endpoints:**
- `POST /admin/users/:userId/revoke-tokens`

**Infrastructure:**
- Cognito AdminUserGlobalSignOut API

**Goal:** Enable immediate invalidation of user refresh tokens to terminate sessions

**Risk Notes:** Existing access tokens remain valid until expiry (typically 1 hour). Cognito API may fail - ensure error handling and audit logging.

---

## ADMI-007: Implement POST /admin/users/:userId/block endpoint

**Status:** pending
**Depends On:** ADMI-006, ADMI-001
**Phase:** 2 (Backend API)
**Feature:** Create endpoint that sets is_suspended=true, suspended_at, and suspended_reason in user_quotas table, calls AdminUserGlobalSignOut, and logs both actions to audit log with required reason parameter
**Endpoints:**
- `POST /admin/users/:userId/block`

**Infrastructure:** —

**Goal:** Provide dual-layer access revocation combining Cognito token invalidation with application-level blocking

**Risk Notes:** Critical path - must ensure auth middleware checks is_suspended flag. Requires transaction to ensure atomicity.

---

## ADMI-008: Implement POST /admin/users/:userId/unblock endpoint

**Status:** pending
**Depends On:** ADMI-001
**Phase:** 2 (Backend API)
**Feature:** Create endpoint that sets is_suspended=false and clears suspended_at/suspended_reason in user_quotas table, with audit logging of unblock action and admin identity
**Endpoints:**
- `POST /admin/users/:userId/unblock`

**Infrastructure:** —

**Goal:** Enable administrators to restore user access after suspension or error

**Risk Notes:** Low risk - straightforward database update

---

## ADMI-009: Implement GET /admin/audit-log endpoint

**Status:** pending
**Depends On:** ADMI-001
**Phase:** 2 (Backend API)
**Feature:** Create endpoint to retrieve paginated audit log entries with filters for admin_user_id, target_user_id, action_type, and date range, returning all audit fields ordered by created_at DESC
**Endpoints:**
- `GET /admin/audit-log`

**Infrastructure:** —

**Goal:** Expose audit trail for compliance review and security investigation

**Risk Notes:** May need performance optimization if audit log grows large. Consider archival strategy.

---

## ADMI-010: Create AdminGuard route protection component

**Status:** pending
**Depends On:** none
**Phase:** 3 (Frontend Core)
**Feature:** Create React component that checks JWT for 'admin' group membership, shows loading spinner during auth check, and redirects unauthorized users to root route
**Endpoints:** —
**Infrastructure:** —

**Goal:** Establish frontend route protection ensuring only admin group members can access admin panel

**Risk Notes:** Critical security component - must not have bypass routes. Ensure auth context properly exposes groups claim.

---

## ADMI-011: Create admin route structure under /admin/*

**Status:** pending
**Depends On:** ADMI-010
**Phase:** 3 (Frontend Core)
**Feature:** Set up React Router routes for /admin/users (list), /admin/users/:userId (detail), /admin/audit-log (audit viewer), all wrapped in AdminGuard component
**Endpoints:** —
**Infrastructure:** —

**Goal:** Establish protected route hierarchy for admin panel within main-app

**Risk Notes:** Low risk - standard routing setup

---

## ADMI-012: Build user list page with pagination

**Status:** pending
**Depends On:** ADMI-011, ADMI-004
**Phase:** 3 (Frontend Core)
**Feature:** Create paginated table view displaying users with columns for email, user ID, account status (active/suspended badge), and action buttons. Implement pagination controls using Cognito pagination tokens.
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide primary interface for browsing all users with clear status indicators

**Risk Notes:** Must handle loading states and empty states. Consider client-side caching for performance.

---

## ADMI-013: Build user search functionality

**Status:** pending
**Depends On:** ADMI-012
**Phase:** 3 (Frontend Core)
**Feature:** Implement email search input with debouncing (300ms) that queries GET /admin/users?email= endpoint, showing search results in same table format as user list
**Endpoints:** —
**Infrastructure:** —

**Goal:** Enable quick user discovery by email for common admin workflows

**Risk Notes:** Cognito search is prefix-only. Consider UX for communicating this limitation. Debouncing required to avoid rate limits.

---

## ADMI-014: Build user detail modal/page

**Status:** pending
**Depends On:** ADMI-011, ADMI-005
**Phase:** 4 (User Actions & Audit)
**Feature:** Create detail view showing user email, user ID (sub), Cognito status, is_suspended flag, suspended_at, suspended_reason, and available action buttons (revoke/block/unblock based on current state)
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide comprehensive user information context before administrators take action

**Risk Notes:** Must handle missing user_quotas records gracefully

---

## ADMI-015: Implement revoke tokens action with confirmation

**Status:** pending
**Depends On:** ADMI-014, ADMI-006
**Phase:** 4 (User Actions & Audit)
**Feature:** Create revoke tokens button that shows confirmation modal explaining action impact (refresh tokens invalidated, access tokens valid until expiry), calls POST /admin/users/:userId/revoke-tokens, and shows success/error toast
**Endpoints:** —
**Infrastructure:** —

**Goal:** Enable session termination with clear user communication about action consequences

**Risk Notes:** Must clearly communicate that existing access tokens remain valid. Handle API failures gracefully.

---

## ADMI-016: Implement block user action with reason capture

**Status:** pending
**Depends On:** ADMI-014, ADMI-007
**Phase:** 4 (User Actions & Audit)
**Feature:** Create block button that opens modal with required reason dropdown (Security incident, Policy violation, Account compromise, Other), optional notes field, confirmation checkbox, calls POST /admin/users/:userId/block, and updates UI to reflect blocked state
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide dual-layer revocation with mandatory reason capture for audit trail

**Risk Notes:** Critical action - must have clear confirmation. Consider adding 'Are you sure?' text verification.

---

## ADMI-017: Implement unblock user action

**Status:** pending
**Depends On:** ADMI-014, ADMI-008
**Phase:** 4 (User Actions & Audit)
**Feature:** Create unblock button (shown only for suspended users) with confirmation dialog, calls POST /admin/users/:userId/unblock, and updates UI to reflect active state
**Endpoints:** —
**Infrastructure:** —

**Goal:** Enable access restoration for temporary suspensions or administrative errors

**Risk Notes:** Low risk - simpler than block action

---

## ADMI-018: Build audit log viewer page

**Status:** pending
**Depends On:** ADMI-011, ADMI-009
**Phase:** 4 (User Actions & Audit)
**Feature:** Create paginated table displaying audit log entries with columns for timestamp, admin user, action type, target user, reason, and result. Support basic filtering by action type and date range.
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide audit trail visibility for compliance and security investigation

**Risk Notes:** May need performance optimization for large datasets. Consider virtualization for very long logs.

---

## ADMI-019: Add loading states and error handling

**Status:** pending
**Depends On:** ADMI-012, ADMI-013, ADMI-014, ADMI-015, ADMI-016, ADMI-017, ADMI-018
**Phase:** 4 (User Actions & Audit)
**Feature:** Implement comprehensive loading skeletons for all data fetching, error boundaries for component failures, error toasts for API failures, and retry mechanisms for transient failures
**Endpoints:** —
**Infrastructure:** —

**Goal:** Ensure robust UX with clear feedback for all loading and error states

**Risk Notes:** Cross-cutting concern - must review all components

---

## ADMI-020: Write backend unit tests

**Status:** pending
**Depends On:** ADMI-004, ADMI-005, ADMI-006, ADMI-007, ADMI-008, ADMI-009
**Phase:** 5 (Testing & Deployment)
**Feature:** Create unit tests for all admin endpoints covering success cases, error cases, unauthorized access, invalid inputs, Cognito API failures, database failures, and audit logging correctness
**Endpoints:** —
**Infrastructure:** —

**Goal:** Ensure backend reliability and security through comprehensive test coverage

**Risk Notes:** Must test auth middleware integration. Mock Cognito SDK calls.

---

## ADMI-021: Write frontend component tests

**Status:** pending
**Depends On:** ADMI-010, ADMI-012, ADMI-013, ADMI-014, ADMI-015, ADMI-016, ADMI-017, ADMI-018
**Phase:** 5 (Testing & Deployment)
**Feature:** Create React Testing Library tests for AdminGuard, user list, search, detail modal, and all action components covering user interactions, loading states, error states, and accessibility
**Endpoints:** —
**Infrastructure:** —

**Goal:** Ensure frontend components work correctly and are accessible

**Risk Notes:** Must test route protection behavior. Mock API calls with MSW.

---

## ADMI-022: End-to-end integration testing

**Status:** pending
**Depends On:** ADMI-020, ADMI-021
**Phase:** 5 (Testing & Deployment)
**Feature:** Create Playwright E2E tests covering full user flows: admin login -> search user -> view details -> revoke tokens, block user with reason, verify blocked user cannot access API, unblock user, verify audit log entries
**Endpoints:** —
**Infrastructure:**
- Playwright

**Goal:** Verify complete admin panel workflows function correctly end-to-end

**Risk Notes:** Requires test Cognito users with admin group. May need dedicated test environment. Sizing warning.

---

## ADMI-023: Security review and auth middleware validation

**Status:** pending
**Depends On:** ADMI-022
**Phase:** 5 (Testing & Deployment)
**Feature:** Conduct code review focusing on: admin group validation, is_suspended flag checks in auth middleware, route protection, audit logging completeness, IAM permission scoping, and potential bypass vectors
**Endpoints:** —
**Infrastructure:** —

**Goal:** Validate security posture and ensure no authorization bypass vulnerabilities

**Risk Notes:** Critical - security failures could allow unauthorized access or revocation bypass

---

## ADMI-024: Staging deployment and manual testing

**Status:** pending
**Depends On:** ADMI-023
**Phase:** 5 (Testing & Deployment)
**Feature:** Deploy admin panel to staging environment, perform manual testing of all user flows, verify IAM permissions work correctly, test with real Cognito users, validate audit logging, and test error scenarios
**Endpoints:** —
**Infrastructure:**
- Staging environment

**Goal:** Validate admin panel functions correctly in staging before production release

**Risk Notes:** May discover environment-specific issues. Ensure staging Cognito pool mirrors production.

---

## ADMI-025: Production deployment and team training

**Status:** pending
**Depends On:** ADMI-024
**Phase:** 5 (Testing & Deployment)
**Feature:** Deploy admin panel to production, create admin group in production Cognito pool, assign initial admin users, document admin panel usage, train support team on revocation workflows, and monitor for issues
**Endpoints:** —
**Infrastructure:**
- Production environment

**Goal:** Successfully launch admin panel to production and enable team to use it

**Risk Notes:** Requires production AWS access. Plan rollback strategy. Monitor error rates post-deployment.
