# Project Brief: Admin Panel

## Executive Summary

This project delivers an administrative control panel that enables authorized administrators to manage users, troubleshoot issues, and maintain system security. The admin panel provides essential user management capabilities including user search and listing, session management through Cognito token revocation, and user blocking/unblocking. Built with React, Tailwind CSS, and shadcn components on the frontend with a serverless backend architecture, this panel serves as the foundation for future administrative capabilities.

**Note:** This plan incorporates the `user-revocation` epic, which has been merged here since the functionality is tightly coupled. The `user-revocation` plan is now deprecated.

## Dependencies

| Dependency | Status | Required Before |
|------------|--------|-----------------|
| `cognito-scopes` epic | Planned | Development start |

**Why `cognito-scopes` is required:**
- Establishes `admin` Cognito group for authorization
- Creates `user_quotas` table with `is_suspended` flag for blocking
- Implements auth middleware that checks suspension status
- Defines database-authoritative permission model

## Problem Statement

**Current State and Pain Points:**

Currently, administrators lack a centralized interface for managing users and responding to support issues. Without a dedicated admin panel, teams face several operational challenges:

- **No User Visibility:** Administrators cannot easily view user lists, search for specific users, or access user information
- **Manual User Management:** User account management (blocking, session termination) requires direct AWS console access or manual database queries, creating security risks and operational bottlenecks
- **Scattered Tools:** Administrative tasks are spread across AWS Console, database tools, and custom scripts, leading to context switching and increased error potential
- **Security Gaps:** Granting AWS console access to support staff creates unnecessary security exposure and violates principle of least privilege
- **No Immediate Revocation:** When users need to be blocked, their Cognito refresh tokens remain valid until expiration (potentially days/weeks)

**Impact of the Problem:**

- **Operational Inefficiency:** Simple administrative tasks take 10-30 minutes instead of seconds
- **Security Risk:** Compromised accounts continue to have access even after being flagged
- **Compliance Exposure:** Failure to immediately revoke access may violate regulatory requirements
- **Scalability Limitations:** As user base grows, manual user management becomes increasingly unsustainable

## Proposed Solution

**Core Concept and Approach:**

Build a modern, secure admin panel integrated into the main application that provides a unified interface for all user management operations. The solution consists of:

1. **Protected Route Group:** Admin routes under `/admin/*` in the main-app, protected by admin group membership check
2. **User Management Interface:** Searchable, paginated user list with user detail views and available actions
3. **Dual-Layer Access Revocation:**
   - Cognito `AdminUserGlobalSignOut` API to invalidate all refresh tokens
   - Application-level `is_suspended` flag (from `user_quotas` table) checked on every request
4. **Audit Logging:** All administrative actions logged for compliance and security review

**Key Architectural Decisions:**

1. **Integrated into main-app** — Not a separate application; uses existing auth infrastructure
2. **Database-authoritative blocking** — `is_suspended` flag from `user_quotas` (defined in `cognito-scopes`)
3. **Cognito for user listing** — Use `ListUsers` API; no need to sync users to PostgreSQL
4. **Session-based impersonation** (Phase 2) — No custom JWT signing; server-side session state

## Target Users

### Primary User Segment: System Administrators

**Profile:**
- Internal team members with administrative responsibilities
- Technical proficiency ranges from non-technical support staff to experienced engineers
- Typically 5-20 admin users initially

**Current Behaviors:**
- Respond to user support tickets requiring account investigation
- Monitor user activity for suspicious behavior
- Manage user lifecycle events (access problems, session management)
- Currently use AWS Console for Cognito operations

**Goals:**
- Resolve user support issues quickly
- Maintain system security by managing compromised or problematic accounts
- Perform administrative tasks without requiring AWS console access
- Maintain audit trail for compliance and security reviews

## Goals & Success Metrics

### Business Objectives

- **Reduce Support Resolution Time:** Achieve user access revocation within 60 seconds of admin action
- **Eliminate AWS Console Dependency:** Remove need for support staff to have direct AWS console access
- **Improve Admin Productivity:** Enable admins to complete user management tasks 10x faster
- **Establish Audit Foundation:** Create comprehensive audit trail for all administrative actions

### Key Performance Indicators (KPIs)

- **User Search Performance:** Search results returned in < 2 seconds
- **Mean Time to Revoke (MTTR):** Target < 60 seconds from admin action to complete access termination
- **Revocation Success Rate:** 100% - no instances of revoked users maintaining access
- **Audit Completeness:** 100% of administrative actions logged with admin identity, timestamp, action type, and target user

## MVP Scope

### Core Features (Must Have)

- **Admin Route Protection:** Routes under `/admin/*` require JWT with `admin` group membership; redirect unauthorized users
  - _Rationale:_ Foundation for all security - must validate admin group before allowing any access

- **User List View:** Paginated table displaying users from Cognito with columns for email, user ID, account status (active/suspended), and actions
  - _Rationale:_ Primary interface for user discovery and management
  - _Implementation:_ Uses Cognito `ListUsers` API with pagination tokens

- **User Search:** Search by email using Cognito `ListUsers` API with filter
  - _Rationale:_ Critical for quickly finding specific users; search is the most common admin workflow
  - _Note:_ Cognito search is prefix-based only (e.g., `email ^= "john"`)

- **User Detail View:** Modal or page showing user information: email, user ID (sub), Cognito status, `is_suspended` flag, and available actions
  - _Rationale:_ Provides context needed for informed administrative decisions

- **Revoke Refresh Tokens:** Button to call Cognito `AdminUserGlobalSignOut` API to invalidate all refresh tokens for selected user
  - _Rationale:_ Core security feature for immediate session termination
  - _Behavior:_ Existing access tokens remain valid until expiry (typically 1 hour), but no new tokens can be obtained

- **Block/Unblock User:** Toggle to set `is_suspended` flag in `user_quotas` table; visual indicator of blocked status
  - _Rationale:_ Prevents blocked users from accessing API even if they have valid tokens
  - _Note:_ Depends on `cognito-scopes` auth middleware checking this flag

- **Revocation Reason Capture:** Required dropdown for reason when blocking (Security incident, Policy violation, Account compromise, Other)
  - _Rationale:_ Essential for audit trail and compliance

- **Confirmation Dialog:** Modal requiring admin to confirm before executing revoke/block actions
  - _Rationale:_ Prevents accidental clicks; critical given the immediate and disruptive nature

- **Restore Access:** Ability for admins to unblock users (remove `is_suspended` flag)
  - _Rationale:_ Handles error cases and temporary suspensions

- **Audit Logging:** Automatic logging of all admin actions with timestamp, admin user ID, action type, target user ID, reason, and result
  - _Rationale:_ Non-negotiable for security and compliance requirements

### Out of Scope for MVP

- User impersonation (deferred to Phase 2 - requires careful security design)
- Last login tracking (requires auth middleware changes)
- Bulk user operations (block multiple users, export user lists)
- Advanced filtering (by registration date, custom attributes)
- User creation/deletion through admin panel
- Role-based admin permissions (different admin levels)
- Admin activity dashboard/analytics
- Email notifications to users when blocked/unblocked
- Integration with support ticketing systems
- Mobile-optimized layout (desktop-first is acceptable)

### MVP Success Criteria

The MVP is successful when:

1. Admins can find any user by email in under 30 seconds
2. All core user management actions (revoke, block, unblock) work reliably with 100% success rate
3. Blocked users are immediately prevented from API access (verified through testing)
4. All administrative actions are logged with complete audit information
5. Admin panel is deployed to production and used for 100% of user management tasks within 30 days
6. Zero security incidents related to admin panel access

## Post-MVP Vision

### Phase 2 Features

- **User Impersonation:** Secure session-based impersonation allowing admins to view the application as a specific user
  - Implementation: Server-side session state tracking `impersonating_user_id`
  - Prominent visual banner during impersonation
  - Time-limited sessions (1-4 hours)
  - Comprehensive audit logging of actions during impersonation

- **Last Login Tracking:** Display last login timestamp in user list
  - Requires: Auth middleware to update `last_login_at` in database on each authentication

- **Bulk Operations:** Select multiple users for batch actions (bulk block, export to CSV)

- **Advanced Filtering:** Filter by account status, Cognito user status, registration date range

- **Audit Log Viewer:** Searchable interface for reviewing historical admin actions

### Phase 3 Features

- **Role-Based Admin Permissions:** Different admin levels (Super Admin, Support Admin, Read-Only)
- **Admin User Management:** Interface for managing admin accounts and permissions
- **User Communication:** Send emails to users directly from admin panel
- **Temporary Suspensions:** Time-limited blocks that automatically restore access

## Technical Architecture

### Frontend

- **Location:** `apps/web/main-app/src/routes/admin/*`
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Query for server state; React Context for admin state
- **Routing:** React Router v6 with protected route wrapper

### Backend

- **Location:** `apps/api/lego-api/domains/admin/*`
- **Compute:** AWS Lambda (existing infrastructure)
- **API:** RESTful endpoints under `/admin/*`
- **Authentication:** JWT validation checking for `admin` in `cognito:groups` claim
- **Database:** PostgreSQL via Drizzle ORM

### API Endpoints

```
GET    /admin/users              - List users (paginated)
GET    /admin/users?email=...    - Search users by email
GET    /admin/users/:userId      - Get user details
POST   /admin/users/:userId/revoke-tokens    - Revoke all refresh tokens
POST   /admin/users/:userId/block            - Block user (set is_suspended)
POST   /admin/users/:userId/unblock          - Unblock user
GET    /admin/audit-log          - List audit entries (paginated)
```

### Database Schema Changes

**New table: `admin_audit_log`**

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,           -- Cognito sub of admin
  action_type TEXT NOT NULL,             -- 'search', 'view', 'revoke_tokens', 'block', 'unblock'
  target_user_id TEXT,                   -- Cognito sub of target user (nullable for searches)
  reason TEXT,                           -- Required for block actions
  details JSONB,                         -- Action-specific data (search query, etc.)
  result TEXT NOT NULL,                  -- 'success' or 'failure'
  error_message TEXT,                    -- Error details if failed
  ip_address TEXT,                       -- Admin's IP address
  user_agent TEXT,                       -- Admin's browser/client
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action_type);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at);
```

**Uses existing from `cognito-scopes`:**
- `user_quotas.is_suspended` - blocking flag
- `user_quotas.suspended_at` - timestamp when blocked
- `user_quotas.suspended_reason` - reason for blocking

### Key Technical Components

**1. Admin Route Guard**

```typescript
// apps/web/main-app/src/routes/admin/AdminGuard.tsx
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />

  const isAdmin = user?.groups?.includes('admin')

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
```

**2. Cognito User Listing (Backend)**

```typescript
// Uses AWS SDK CognitoIdentityServiceProvider
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'

async function listUsers(paginationToken?: string, emailFilter?: string) {
  const client = new CognitoIdentityProviderClient({})

  const command = new ListUsersCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Limit: 50,
    PaginationToken: paginationToken,
    Filter: emailFilter ? `email ^= "${emailFilter}"` : undefined,
  })

  return client.send(command)
}
```

**3. Dual-Layer Revocation**

```typescript
async function revokeUserAccess(adminId: string, targetUserId: string, reason: string) {
  // 1. Call Cognito to invalidate refresh tokens
  await cognitoClient.send(new AdminUserGlobalSignOutCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: targetUserId,
  }))

  // 2. Set application-level block flag (fail-safe)
  await db.update(userQuotas)
    .set({
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedReason: reason,
    })
    .where(eq(userQuotas.userId, targetUserId))

  // 3. Log the action
  await db.insert(adminAuditLog).values({
    adminUserId: adminId,
    actionType: 'block',
    targetUserId,
    reason,
    result: 'success',
  })
}
```

### IAM Permissions Required

Lambda execution role needs:

```json
{
  "Effect": "Allow",
  "Action": [
    "cognito-idp:ListUsers",
    "cognito-idp:AdminGetUser",
    "cognito-idp:AdminUserGlobalSignOut"
  ],
  "Resource": "arn:aws:cognito-idp:*:*:userpool/${COGNITO_USER_POOL_ID}"
}
```

## Constraints & Assumptions

### Constraints

- **Budget:** Limited to existing AWS infrastructure costs; serverless architecture keeps incremental costs minimal
- **Timeline:** Target 2-3 week development cycle for MVP
  - Week 1: Backend API development (user endpoints, Cognito integration, audit logging)
  - Week 2: Frontend development (user list, search, detail views, actions)
  - Week 3: Testing, security review, deployment
- **Resources:**
  - 1-2 full-stack developers
  - Security review as part of standard release process
  - No dedicated designer (leverage shadcn components)
- **Technical:**
  - Must work with existing Cognito user pool
  - Must integrate with `user_quotas` table from `cognito-scopes` epic
  - Cognito `ListUsers` API has 60 requests/second rate limit
  - Cognito search is prefix-based only (cannot search for `*@domain.com`)

### Assumptions

- **`cognito-scopes` epic is completed first**, providing:
  - `admin` Cognito group configured
  - `user_quotas` table with `is_suspended`, `suspended_at`, `suspended_reason` fields
  - Auth middleware that checks `is_suspended` on every request
- Admin users are manually assigned to `admin` group via Cognito Console (acceptable for MVP)
- User base is < 10,000 users (Cognito `ListUsers` pagination is sufficient)
- Backend Lambda has appropriate IAM permissions for Cognito admin operations
- Audit log retention of 90 days is sufficient (configurable later)

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cognito API failures | User maintains access despite revocation | Application-level `is_suspended` flag as fail-safe |
| Auth middleware bypass | Critical - revocation ineffective | Comprehensive code review; all routes use same middleware |
| Accidental blocks | User disruption, support burden | Confirmation dialogs, easy unblock, audit trail |
| Cognito rate limits | Search/listing fails under load | Implement client-side caching, debounced search |
| IAM permission issues | Feature cannot function | Validate permissions in staging before production |

## Open Questions

1. **Admin assignment:** How will the first admin be assigned? (Recommend: Manual via Cognito Console)
2. **Audit retention:** What is the required retention period for audit logs? (Default: 90 days)
3. **Blocked user message:** Should blocked users see a specific message or generic error? (Recommend: Specific message)
4. **Expected usage:** How often will revocation/blocking occur? (Informs caching strategy)

## Next Steps

### Pre-Development (Week 0)

1. Confirm `cognito-scopes` epic completion timeline
2. Validate IAM permissions for Cognito admin operations in staging
3. Create `admin_audit_log` table migration
4. Set up admin group in Cognito (if not already done)

### Development (Weeks 1-3)

**Week 1: Backend**
- [ ] Create `admin_audit_log` Drizzle schema and migration
- [ ] Implement `/admin/users` list endpoint with Cognito `ListUsers`
- [ ] Implement `/admin/users?email=` search endpoint
- [ ] Implement `/admin/users/:userId` detail endpoint
- [ ] Implement `/admin/users/:userId/revoke-tokens` endpoint
- [ ] Implement `/admin/users/:userId/block` and `unblock` endpoints
- [ ] Add audit logging to all endpoints
- [ ] Write unit tests for all endpoints

**Week 2: Frontend**
- [ ] Create admin route group with `AdminGuard`
- [ ] Build user list page with pagination
- [ ] Build search functionality with debouncing
- [ ] Build user detail modal/page
- [ ] Implement revoke/block/unblock actions with confirmation dialogs
- [ ] Add loading states and error handling
- [ ] Write component tests

**Week 3: Integration & Deployment**
- [ ] Integration testing of frontend and backend
- [ ] Security review of admin scope validation
- [ ] Test blocking flow end-to-end (block user, verify they cannot access API)
- [ ] Deploy to staging, manual testing
- [ ] Deploy to production
- [ ] Document admin panel usage for team

### Key Milestones

- **Week 1 Complete:** Backend APIs functional and tested in staging
- **Week 2 Complete:** Frontend MVP complete with all core features
- **Week 3 Complete:** Production deployment successful, team trained

---

## Changelog

**2025-XX-XX - Initial Draft**
- Created comprehensive PRD for admin panel

**2026-02-04 - Slim MVP Revision**
- Merged `user-revocation` epic into this plan (deprecated separate plan)
- Added explicit dependency on `cognito-scopes` epic
- Deferred user impersonation to Phase 2 (undefined technical approach)
- Deferred last login tracking to Phase 2 (requires middleware changes)
- Aligned on using `is_suspended` from `user_quotas` table (not separate users table)
- Specified frontend location: protected routes in `main-app` at `/admin/*`
- Reduced timeline from 4-6 weeks to 2-3 weeks
- Added specific API endpoint definitions
- Added Drizzle schema for `admin_audit_log`
- Clarified Cognito search limitations (prefix-only)
- Added IAM permissions documentation

---

**End of PRD**
