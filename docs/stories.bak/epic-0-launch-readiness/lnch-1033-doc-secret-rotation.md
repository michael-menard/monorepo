# Story lnch-1033: Secret Rotation Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a secret rotation runbook,
**so that** I can safely rotate secrets when needed.

## Epic Context

This is **Story 1 of Launch Readiness Epic: Security & Compliance Workstream**.
Priority: **High** - Required for security operations.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (first story in security workstream)

## Related Stories

- lnch-1035: Security Incident Response (emergency rotation)
- lnch-1034: IAM Audit Process (access to secrets)

## Acceptance Criteria

1. Runbook exists at `docs/operations/security/secret-rotation.md`
2. Documents all secret types and locations
3. Documents rotation procedure for each type
4. Documents verification steps
5. Documents rollback procedures
6. Documents emergency rotation
7. Documents rotation schedule

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/security/` directory
  - [ ] Create `secret-rotation.md`

- [ ] **Task 2: Inventory Secrets** (AC: 2)
  - [ ] Database credentials (Secrets Manager)
  - [ ] OAuth secrets (SSM Parameter Store)
  - [ ] API keys (if any)
  - [ ] Encryption keys

- [ ] **Task 3: Document Rotation Procedures** (AC: 3)
  - [ ] Database credentials rotation
  - [ ] OAuth client secrets
  - [ ] Third-party API keys
  - [ ] JWT signing keys (if applicable)

- [ ] **Task 4: Document Verification** (AC: 4)
  - [ ] Health checks post-rotation
  - [ ] Authentication testing
  - [ ] Application functionality

- [ ] **Task 5: Document Rollback** (AC: 5)
  - [ ] How to restore previous secret
  - [ ] Secrets Manager versioning
  - [ ] SSM Parameter Store history

- [ ] **Task 6: Document Emergency Rotation** (AC: 6)
  - [ ] When to emergency rotate
  - [ ] Expedited procedure
  - [ ] Communication requirements

- [ ] **Task 7: Document Schedule** (AC: 7)
  - [ ] Recommended rotation frequency
  - [ ] Compliance requirements
  - [ ] Automation options

## Dev Notes

### Secret Inventory

| Secret | Location | Rotation | Auto-Rotate |
|--------|----------|----------|-------------|
| DB Credentials | Secrets Manager | 90 days | Possible |
| Google OAuth | SSM Parameter Store | Annual | No |
| Apple OAuth | SSM Parameter Store | Annual | No |
| Facebook OAuth | SSM Parameter Store | Annual | No |
| AWS CI Creds | GitHub Secrets | Manual | No |

### Secrets Manager Rotation

**Database Credentials**
```bash
# View current secret
aws secretsmanager get-secret-value \
  --secret-id lego-api-production-db-credentials

# Rotate (if auto-rotation configured)
aws secretsmanager rotate-secret \
  --secret-id lego-api-production-db-credentials

# Manual update
aws secretsmanager put-secret-value \
  --secret-id lego-api-production-db-credentials \
  --secret-string '{"username":"...","password":"..."}'
```

### SSM Parameter Store Update

**OAuth Secrets**
```bash
# Update OAuth secret
aws ssm put-parameter \
  --name "/lego-api/production/google-client-secret" \
  --value "new-secret-value" \
  --type SecureString \
  --overwrite
```

### Rotation Checklist
1. [ ] Notify team of upcoming rotation
2. [ ] Create new secret/credential
3. [ ] Update in secret store
4. [ ] Deploy application (to pick up new secret)
5. [ ] Verify application health
6. [ ] Revoke old secret (after grace period)
7. [ ] Document rotation in audit log

### Emergency Rotation
Trigger immediately if:
- Secret is exposed publicly
- Unauthorized access detected
- Employee with access leaves unexpectedly
- Security audit finding

## Testing

### Verification
- Rotation procedures are accurate
- Rollback procedures work
- Emergency process is clear

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
