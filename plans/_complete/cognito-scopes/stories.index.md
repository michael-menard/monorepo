---
doc_type: stories_index
title: "COGN Stories Index"
status: active
story_prefix: "COGN"
created_at: "2026-02-03T23:10:00Z"
updated_at: "2026-02-04T19:00:00Z"
---

# COGN Stories Index

All stories in this epic use the `COGN-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | 29 |

---

## New Stories Added from Epic Elaboration

These stories were identified during MVP blocker analysis and fill critical gaps in the implementation plan.

### COGN-NEW-001: Shared Middleware Framework Foundation

**Status:** pending
**Priority:** P0
**Phase:** 0 - Prerequisite
**Depends On:** none
**Source:** Epic Elaboration - Engineering MVP Blockers (COGN-B-003)
**Feature:** Create shared middleware framework package with consistent error handling, logging patterns, and authentication contract for all quota and scope middlewares
**Endpoints:** —
**Infrastructure:**
- Middleware package in packages/backend/
- Error handling utilities
- Auth contract types

**Goal:** Provide foundational middleware patterns before implementing individual middlewares (COGN-005, COGN-006, COGN-007, COGN-008)

**Risk Notes:** Must be generic enough to support multiple middleware types while maintaining consistency

---

### COGN-NEW-002: Database Connection Pooling Setup

**Status:** pending
**Priority:** P0
**Phase:** 0 - Prerequisite
**Depends On:** none
**Source:** Epic Elaboration - Engineering MVP Blockers (COGN-B-001, COGN-B-008)
**Feature:** Establish database connection pooling infrastructure for Lambda with connection lifecycle management, configuration, and monitoring
**Endpoints:** —
**Infrastructure:**
- Connection pool package
- Lambda-specific pooling configuration
- Connection state management

**Goal:** Provide reliable database connection management for COGN-004 and COGN-007 to handle Lambda cold starts and concurrent operations

**Risk Notes:** Lambda connection pooling is non-standard; requires careful lifecycle management and testing

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| COGN-001 | Create user_quotas Database Schema | — |
| COGN-003 | Configure Cognito User Pool & Groups | — |
| COGN-026 | Create Documentation & Runbooks | — |

---

## COGN-001: Create user_quotas Database Schema

**Status:** pending
**Depends On:** none
**Phase:** 1 - Foundation
**Feature:** Design and implement the user_quotas table with quota limits, usage tracking, and age verification fields
**Endpoints:** —
**Infrastructure:**
- PostgreSQL database
- Migration scripts

**Goal:** Establish the data foundation for tier-based quotas and usage tracking

**Risk Notes:** Migration must handle existing users, computed columns (is_minor) need testing

**MVP Blocker:** Define blue-green or phased migration plan with rollback capability and validation gates before COGN-001 implementation (blocks COGN-009 - zero-downtime migration strategy required for production data integrity)

---

## COGN-002: Create Quota Initialization Trigger

**Status:** pending
**Depends On:** COGN-001
**Phase:** 1 - Foundation
**Feature:** Implement database trigger to automatically create free-tier quotas for new users
**Endpoints:** —
**Infrastructure:**
- PostgreSQL trigger function

**Goal:** Ensure all new users automatically receive free-tier quotas on signup

**Risk Notes:** Trigger must handle race conditions, idempotency concerns

---

## COGN-003: Configure Cognito User Pool & Groups

**Status:** pending
**Depends On:** none
**Phase:** 1 - Foundation
**Feature:** Set up Cognito groups (admin, free-tier, pro-tier, power-tier) and configure JWT settings
**Endpoints:** —
**Infrastructure:**
- AWS Cognito User Pool
- Cognito Groups

**Goal:** Establish Cognito infrastructure for user authentication and group management

**Risk Notes:** Manual group assignment for admin, default group assignment for free-tier

---

## COGN-004: Implement Pre Token Generation Lambda

**Status:** pending
**Depends On:** COGN-001, COGN-003
**Phase:** 1 - Foundation
**Feature:** Create Lambda function that dynamically assigns scopes based on tier, age, and add-ons
**Endpoints:** —
**Infrastructure:**
- AWS Lambda
- Database connection pooling
- CloudWatch logging

**Goal:** Dynamically generate JWT scopes at login time based on user tier and attributes

**Risk Notes:** Cold starts impact UX, database connection failures must fail closed, timeout handling critical
**Sizing Warning:** Significant complexity

**MVP Blockers:**
- Define cold start requirements (<1s for MVP), implement connection pooling with clear failure modes (COGN-B-001)
- Define Lambda reserved concurrency, database connection pool sizing, and connection management strategy (COGN-B-008)
- Blocks: NEW-002 (Database connection pooling setup must be completed before implementation)

---

## COGN-005: Implement JWT Authentication Middleware

**Status:** pending
**Depends On:** COGN-003, COGN-004
**Phase:** 2 - API Authorization
**Feature:** Create middleware to verify JWT signature, extract user ID, groups, and scopes
**Endpoints:** —
**Infrastructure:**
- JWKS client for Cognito public keys

**Goal:** Verify and extract claims from JWT tokens for all API requests

**Risk Notes:** JWKS key rotation handling, token expiration edge cases

**MVP Blockers:**
- Define token expiration (1 hour per platform), refresh endpoint behavior, and error recovery flows (COGN-B-004)
- Spec JWKS verification algorithm, key rotation handling (cache <1hr), and signature validation (COGN-B-011)
- Blocked by: NEW-001 (Shared middleware framework foundation must be implemented first)

---

## COGN-006: Implement Scope Verification Middleware

**Status:** pending
**Depends On:** COGN-005
**Phase:** 2 - API Authorization
**Feature:** Create middleware to check if user has required scope for an operation
**Endpoints:** —
**Infrastructure:** —

**Goal:** Enforce scope-based authorization on API endpoints

**Risk Notes:** Admin bypass logic must be secure, error messages must guide users to upgrade

**MVP Blocker:** Define admin bypass only for specific scopes with approval workflow, implement audit logging, document enforcement before COGN-006 implementation (COGN-B-012)

---

## COGN-007: Implement Quota Check Middleware

**Status:** pending
**Depends On:** COGN-005, COGN-001
**Phase:** 2 - API Authorization
**Feature:** Create middleware to verify user hasn't exceeded quota limits before operations
**Endpoints:** —
**Infrastructure:**
- Database connection
- Row-level locking

**Goal:** Prevent users from exceeding tier-based quota limits

**Risk Notes:** Race conditions on concurrent operations, transaction handling, performance impact

**MVP Blockers:**
- Document transaction isolation levels (serializable for quota), row-level locking strategy before development (COGN-B-002)
- Define transaction isolation levels, create test fixtures for concurrent access patterns, implement race condition detection (COGN-B-006)
- Blocked by: NEW-001 (Shared middleware framework), NEW-002 (Database connection pooling)

---

## COGN-008: Implement Quota Increment Middleware

**Status:** pending
**Depends On:** COGN-007
**Phase:** 2 - API Authorization
**Feature:** Create middleware to update usage counts after successful operations
**Endpoints:** —
**Infrastructure:** —

**Goal:** Accurately track resource usage for quota enforcement

**Risk Notes:** Must handle failures gracefully, eventual consistency concerns

**MVP Blocker:** Blocked by: NEW-001 (Shared middleware framework foundation must be implemented first)

---

## COGN-009: Implement Storage Quota Middleware

**Status:** pending
**Depends On:** COGN-007
**Phase:** 2 - API Authorization
**Feature:** Create middleware to check storage limits before file uploads and increment after success
**Endpoints:** —
**Infrastructure:** —

**Goal:** Prevent storage quota overages from file uploads

**Risk Notes:** File size calculation before upload, mid-upload quota exhaustion handling

---

## COGN-010: Protect MOC API Endpoints

**Status:** pending
**Depends On:** COGN-006, COGN-008, COGN-009
**Phase:** 2 - API Authorization
**Feature:** Add authentication, scope checking (moc:manage), and quota enforcement to MOC endpoints
**Endpoints:**
- /api/mocs

**Infrastructure:** —

**Goal:** Secure MOC upload/edit/delete operations with proper authorization and quota checks

**Risk Notes:** Must handle file uploads, storage tracking, concurrent operations

---

## COGN-011: Protect Wishlist API Endpoints

**Status:** pending
**Depends On:** COGN-006, COGN-008
**Phase:** 2 - API Authorization
**Feature:** Add authentication, scope checking (wishlist:manage), and quota enforcement to wishlist endpoints
**Endpoints:**
- /api/wishlists

**Infrastructure:** —

**Goal:** Secure wishlist operations with tier-appropriate limits

**Risk Notes:** Free tier limited to 1 wishlist, Pro has 20, Power has 40

---

## COGN-012: Protect Gallery API Endpoints

**Status:** pending
**Depends On:** COGN-006, COGN-008
**Phase:** 2 - API Authorization
**Feature:** Add authentication, scope checking (gallery:manage), and quota enforcement to gallery endpoints
**Endpoints:**
- /api/galleries

**Infrastructure:** —

**Goal:** Secure gallery operations for Pro and Power tiers only

**Risk Notes:** Free tier has no gallery access, must return helpful upgrade prompts

---

## COGN-013: Protect Set List API Endpoints

**Status:** pending
**Depends On:** COGN-006, COGN-008
**Phase:** 2 - API Authorization
**Feature:** Add authentication, scope checking (setlist:manage), and quota enforcement to set list endpoints
**Endpoints:**
- /api/setlists

**Infrastructure:** —

**Goal:** Secure set list operations for Power tier only

**Risk Notes:** Power tier has unlimited set lists (constrained by storage)

---

## COGN-014: Standardize API Error Responses

**Status:** pending
**Depends On:** COGN-006, COGN-007
**Phase:** 2 - API Authorization
**Feature:** Create consistent error response format with upgrade URLs and actionable guidance
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide clear, actionable error messages when users hit quota or scope limits

**Risk Notes:** Balance between helpful guidance and information disclosure

---

## COGN-015: Implement Frontend JWT Storage & Parsing

**Status:** pending
**Depends On:** COGN-005
**Phase:** 3 - Frontend Integration
**Feature:** Store JWT in httpOnly cookies, parse scopes/groups, handle token refresh and expiration
**Endpoints:** —
**Infrastructure:**
- httpOnly cookies with CSRF protection

**Goal:** Securely store and manage JWT tokens in the frontend

**Risk Notes:** Cookie vs localStorage decision, XSS/CSRF protection, token refresh UX

---

## COGN-016: Implement UI Feature Gating

**Status:** pending
**Depends On:** COGN-015
**Phase:** 3 - Frontend Integration
**Feature:** Create hasScope() utility, show/hide features based on scopes, display upgrade prompts
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide seamless UI experience that adapts to user tier and permissions

**Risk Notes:** Client-side checks are UX only, not security (backend enforces)

---

## COGN-017: Implement Quota Usage Indicators

**Status:** pending
**Depends On:** COGN-016
**Phase:** 3 - Frontend Integration
**Feature:** Display quota usage (e.g., '3/5 MOCs used') and tier badges throughout UI
**Endpoints:** —
**Infrastructure:** —

**Goal:** Keep users informed of their quota status and encourage upgrades

**Risk Notes:** Real-time usage data may be stale, need refresh mechanism

---

## COGN-018: Implement Frontend Error Handling

**Status:** pending
**Depends On:** COGN-016
**Phase:** 3 - Frontend Integration
**Feature:** Handle 401/403/413/429 errors with user-friendly messages and upgrade prompts
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide helpful, contextual error messages that guide users to resolution

**Risk Notes:** Balance between helpful and annoying, timing of upgrade prompts

---

## COGN-019: Add Birthdate Field to User Signup

**Status:** pending
**Depends On:** COGN-001
**Phase:** 4 - Age Restrictions & Safety
**Feature:** Add birthdate field to signup form, store in database, compute is_minor flag
**Endpoints:**
- /api/auth/signup

**Infrastructure:** —

**Goal:** Capture user age for chat access restrictions

**Risk Notes:** Self-reported (honor system), easy to circumvent, compliance considerations

**MVP Blocker:** Document legal compliance approach (honor system vs. 3rd party verification), define enforcement with legal review before implementation (COGN-B-013)

---

## COGN-020: Implement Age-Based Scope Filtering

**Status:** pending
**Depends On:** COGN-004, COGN-019
**Phase:** 4 - Age Restrictions & Safety
**Feature:** Update Pre Token Generation Lambda to remove chat:participate scope for minors
**Endpoints:** —
**Infrastructure:** —

**Goal:** Prevent minors from accessing chat features

**Risk Notes:** Birthday changes require token refresh, minor turns 18 edge case

---

## COGN-021: Implement Chat Safety UI

**Status:** pending
**Depends On:** COGN-020, COGN-016
**Phase:** 4 - Age Restrictions & Safety
**Feature:** Hide chat for users without chat:participate scope, display age restriction messages
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide age-appropriate UI and clear messaging about age restrictions

**Risk Notes:** Chat safety features (report/block) needed but out of scope for this story

---

## COGN-022: Set Up CloudWatch Monitoring

**Status:** pending
**Depends On:** COGN-004, COGN-006
**Phase:** 5 - Monitoring & Operations
**Feature:** Create custom metrics, dashboards, and alarms for Lambda, API, and database
**Endpoints:** —
**Infrastructure:**
- CloudWatch metrics
- CloudWatch dashboards
- CloudWatch alarms
- SNS notifications

**Goal:** Monitor system health and receive alerts for critical issues

**Risk Notes:** Alert fatigue, threshold tuning, cost of CloudWatch

**MVP Blocker:** Define metrics (Lambda duration, quota operations, auth failures), dashboards, and alert thresholds before implementation (COGN-B-010)

---

## COGN-023: Implement Structured Logging

**Status:** pending
**Depends On:** COGN-004, COGN-006
**Phase:** 5 - Monitoring & Operations
**Feature:** Add structured JSON logging to Lambda and API with log-based metrics
**Endpoints:** —
**Infrastructure:**
- CloudWatch Logs
- Log retention policies

**Goal:** Enable debugging and analysis of authorization issues

**Risk Notes:** PII in logs, log volume/cost, sensitive data handling

---

## COGN-024: Create Quota Reconciliation Jobs

**Status:** pending
**Depends On:** COGN-008, COGN-009
**Phase:** 5 - Monitoring & Operations
**Feature:** Create daily cron jobs to recalculate actual usage vs recorded quotas and fix drift
**Endpoints:** —
**Infrastructure:**
- Lambda/ECS scheduled jobs

**Goal:** Ensure quota accuracy despite potential bugs or race conditions

**Risk Notes:** Job must not disrupt user operations, handle large user base efficiently

---

## COGN-025: Write Comprehensive Test Suite

**Status:** pending
**Depends On:** COGN-004, COGN-006, COGN-007, COGN-008
**Phase:** 6 - Testing & Launch
**Feature:** Unit tests for Lambda and middleware, integration tests for end-to-end flows, load tests
**Endpoints:** —
**Infrastructure:** —

**Goal:** Achieve >90% test coverage and validate system under load

**Risk Notes:** Test data setup complexity, load test infrastructure costs
**Sizing Warning:** Significant complexity

**MVP Blockers:**
- Spec all edge cases (concurrent requests at limit, quota increment failure, tier downgrade with violation) and race condition scenarios before test implementation (COGN-B-005)
- Spec token refresh scenarios (expired, refresh token invalid, concurrent refresh) and implement comprehensive test coverage (COGN-B-007)

---

## COGN-026: Create Documentation & Runbooks

**Status:** pending
**Depends On:** none
**Phase:** 6 - Testing & Launch
**Feature:** Write API docs, admin runbooks, user docs, and developer guides
**Endpoints:** —
**Infrastructure:** —

**Goal:** Enable operators and developers to work with the authorization system

**Risk Notes:** Documentation must stay current with implementation

---

## COGN-027: Production Deployment & Launch

**Status:** pending
**Depends On:** COGN-025, COGN-026, COGN-022, COGN-023
**Phase:** 6 - Testing & Launch
**Feature:** Deploy to production, assign admin users, create test users, monitor for 24 hours
**Endpoints:** —
**Infrastructure:**
- Production AWS environment

**Goal:** Successfully launch authorization system to production

**Risk Notes:** Zero-downtime deployment, rollback plan, monitoring critical for first 24h
