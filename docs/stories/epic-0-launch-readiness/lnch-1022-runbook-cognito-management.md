# Story lnch-1022: Cognito User Management Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a Cognito user management runbook,
**so that** I can handle user account issues.

## Epic Context

This is **Story 4 of Launch Readiness Epic: Infrastructure Runbooks Workstream**.
Priority: **Medium** - Required for user support.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1024: On-Call Playbook (auth issues escalation)
- lnch-1045: Session Expiry Handling (auth UX)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/cognito-management.md`
2. Documents user lookup procedures
3. Documents password reset procedures
4. Documents account unlock procedures
5. Documents user attribute updates
6. Documents user deletion/disabling
7. Documents MFA management

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/cognito-management.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document User Lookup** (AC: 2)
  - [ ] Find user by email
  - [ ] Find user by ID
  - [ ] View user attributes
  - [ ] View user status

- [ ] **Task 3: Document Password Reset** (AC: 3)
  - [ ] Admin password reset
  - [ ] Force password change
  - [ ] Temporary password handling

- [ ] **Task 4: Document Account Unlock** (AC: 4)
  - [ ] Identify locked accounts
  - [ ] Unlock procedure
  - [ ] Reset failed attempts

- [ ] **Task 5: Document Attribute Updates** (AC: 5)
  - [ ] Update email
  - [ ] Update custom attributes
  - [ ] Email verification

- [ ] **Task 6: Document User Disable/Delete** (AC: 6)
  - [ ] Disable user (preserves data)
  - [ ] Delete user (permanent)
  - [ ] GDPR deletion considerations

- [ ] **Task 7: Document MFA** (AC: 7)
  - [ ] View MFA status
  - [ ] Reset MFA
  - [ ] Disable MFA for user

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/cognito-management.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers user lookup, password reset, account management

2. **Playbook**: `docs/operations/playbooks/auth-incident.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers login failures, account lockouts, MFA issues

The runbook handles normal operations; the playbook handles when things go wrong.

---

### User Pool IDs
- Dev: `us-east-1_xxxDev`
- Staging: `us-east-1_xxxStaging`
- Production: `us-east-1_xxxProd`

### Common Commands

**Find User by Email**
```bash
aws cognito-idp list-users \
  --user-pool-id us-east-1_xxx \
  --filter "email = \"user@example.com\""
```

**Get User Details**
```bash
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_xxx \
  --username user-id-or-email
```

**Admin Password Reset**
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_xxx \
  --username user@example.com \
  --password "TemporaryP@ss123" \
  --permanent
```

**Disable User**
```bash
aws cognito-idp admin-disable-user \
  --user-pool-id us-east-1_xxx \
  --username user@example.com
```

**Enable User**
```bash
aws cognito-idp admin-enable-user \
  --user-pool-id us-east-1_xxx \
  --username user@example.com
```

**Delete User**
```bash
aws cognito-idp admin-delete-user \
  --user-pool-id us-east-1_xxx \
  --username user@example.com
```

### Authentication Configuration
- Email/password login
- Email OTP verification
- Social login ready (Google, Apple, Facebook)

## Testing

### Verification
- Commands work with actual user pools
- Procedures are safe (confirm before delete)
- Privacy considerations documented

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
