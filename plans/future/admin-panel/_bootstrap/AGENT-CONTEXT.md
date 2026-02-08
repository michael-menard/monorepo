---
schema: 2
command: pm-bootstrap-workflow
feature_dir: /Users/michaelmenard/Development/Monorepo/plans/future/admin-panel
prefix: ADMI
project_name: admin-panel
created: "2026-02-04T00:00:00Z"

raw_plan_file: /Users/michaelmenard/Development/Monorepo/plans/future/admin-panel/PLAN.md
raw_plan_summary: |
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

  ## Proposed Solution

  Build a modern, secure admin panel integrated into the main application that provides a unified interface for all user management operations. The solution consists of:

  1. **Protected Route Group:** Admin routes under `/admin/*` in the main-app, protected by admin group membership check
  2. **User Management Interface:** Searchable, paginated user list with user detail views and available actions
  3. **Dual-Layer Access Revocation:**
     - Cognito `AdminUserGlobalSignOut` API to invalidate all refresh tokens
     - Application-level `is_suspended` flag (from `user_quotas` table) checked on every request
  4. **Audit Logging:** All administrative actions logged for compliance and security review

  ## MVP Scope (Core Features - Must Have)

  - **Admin Route Protection:** Routes under `/admin/*` require JWT with `admin` group membership; redirect unauthorized users
  - **User List View:** Paginated table displaying users from Cognito
  - **User Search:** Search by email using Cognito `ListUsers` API with filter
  - **User Detail View:** Modal or page showing user information
  - **Revoke Refresh Tokens:** Button to call Cognito `AdminUserGlobalSignOut` API
  - **Block/Unblock User:** Toggle to set `is_suspended` flag in `user_quotas` table
  - **Revocation Reason Capture:** Required dropdown for reason when blocking
  - **Confirmation Dialog:** Modal requiring admin to confirm before executing revoke/block actions
  - **Restore Access:** Ability for admins to unblock users
  - **Audit Logging:** Automatic logging of all admin actions with timestamp, admin user ID, action type, target user ID, reason, and result

  ## Technical Architecture

  **Frontend:** `apps/web/main-app/src/routes/admin/*` with React 19, TypeScript, Tailwind CSS + shadcn/ui
  **Backend:** `apps/api/lego-api/domains/admin/*` with AWS Lambda
  **Database:** New `admin_audit_log` table in PostgreSQL via Drizzle ORM, uses existing `user_quotas` table

  API Endpoints:
  - GET    /admin/users              - List users (paginated)
  - GET    /admin/users?email=...    - Search users by email
  - GET    /admin/users/:userId      - Get user details
  - POST   /admin/users/:userId/revoke-tokens    - Revoke all refresh tokens
  - POST   /admin/users/:userId/block            - Block user
  - POST   /admin/users/:userId/unblock          - Unblock user
  - GET    /admin/audit-log          - List audit entries (paginated)

  ## Timeline & Resources

  - Timeline: Target 2-3 week development cycle for MVP
  - Resources: 1-2 full-stack developers
  - Constraint: Must integrate with `cognito-scopes` epic
---
