# Story lnch-1038: Access Control Matrix

## Status

Draft

## Story

**As a** security officer,
**I want** a documented access control matrix,
**so that** we can understand and audit who can access what.

## Epic Context

This is **Story 6 of Launch Readiness Epic: Security & Compliance Workstream**.
Priority: **Medium** - Required for security governance.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other security stories)

## Related Stories

- lnch-1034: IAM Audit Process (uses this matrix)
- lnch-1037: Data Privacy Documentation (data access controls)

## Acceptance Criteria

1. Matrix exists at `docs/policies/access-control-matrix.md`
2. Documents AWS account access
3. Documents GitHub access
4. Documents production data access
5. Documents user role permissions
6. Documents service-to-service access
7. Documents access review process

## Tasks / Subtasks

- [ ] **Task 1: Create Matrix Structure** (AC: 1)
  - [ ] Create `docs/policies/access-control-matrix.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document AWS Access** (AC: 2)
  - [ ] Console access roles
  - [ ] CLI access
  - [ ] Environment separation
  - [ ] MFA requirements

- [ ] **Task 3: Document GitHub Access** (AC: 3)
  - [ ] Repository permissions
  - [ ] Branch protection
  - [ ] Secrets access
  - [ ] Actions permissions

- [ ] **Task 4: Document Data Access** (AC: 4)
  - [ ] Production database access
  - [ ] S3 bucket access
  - [ ] Log access
  - [ ] Customer data access

- [ ] **Task 5: Document User Roles** (AC: 5)
  - [ ] Application user roles
  - [ ] Permission levels
  - [ ] Data isolation (multi-tenant)

- [ ] **Task 6: Document Service Access** (AC: 6)
  - [ ] Lambda to Aurora
  - [ ] Lambda to S3
  - [ ] Lambda to Secrets Manager
  - [ ] CI/CD to AWS

- [ ] **Task 7: Document Review Process** (AC: 7)
  - [ ] Access review frequency
  - [ ] Review procedure
  - [ ] Remediation process
  - [ ] Documentation requirements

## Dev Notes

### AWS Access Matrix

| Role | Dev | Staging | Prod | MFA Required |
|------|-----|---------|------|--------------|
| Admin | Full | Full | Full | Yes |
| Developer | Full | Read | None | Yes |
| Operator | None | Read | Read/Limited Write | Yes |
| CI/CD | Deploy | Deploy | Deploy | N/A (IAM Role) |

### GitHub Access Matrix

| Role | Read | Write | Admin | Secrets |
|------|------|-------|-------|---------|
| Owner | Yes | Yes | Yes | Yes |
| Maintainer | Yes | Yes | No | No |
| Developer | Yes | Yes | No | No |
| Viewer | Yes | No | No | No |

### Production Data Access

| Data Type | Who Can Access | How | Audit |
|-----------|----------------|-----|-------|
| User PII | Support (limited) | Admin tools | Logged |
| User Content | Owner only | API | Logged |
| Logs | Operators | CloudWatch | Logged |
| Metrics | All engineers | Dashboard | Logged |
| Backups | Admin only | AWS Console | Logged |

### Application User Roles

| Role | Own Data | Other Data | Admin Functions |
|------|----------|------------|-----------------|
| User | CRUD | None | None |
| (Future: Admin) | CRUD | View | Manage users |

### Service-to-Service Access

| Service | Accesses | Permission |
|---------|----------|------------|
| Lambda | Aurora | Read/Write via VPC |
| Lambda | S3 | Read/Write specific bucket |
| Lambda | Secrets Manager | Read secrets |
| Lambda | OpenSearch | Read/Write index |
| GitHub Actions | AWS | Deploy permissions |

### Access Review Checklist

**Quarterly Review**
- [ ] Review AWS IAM users/roles
- [ ] Review GitHub team members
- [ ] Review service account permissions
- [ ] Verify departed users removed
- [ ] Verify role changes updated
- [ ] Document findings

**On Employee Change**
- [ ] Joining: Provision appropriate access
- [ ] Role change: Adjust permissions
- [ ] Departing: Remove all access immediately

### Access Provisioning
- AWS: Via IAM Identity Center (recommended) or IAM users
- GitHub: Via team membership
- Application: Self-service registration

### Access Revocation
- Immediate on termination
- Within 24 hours on role change
- Documented in access log

## Testing

### Verification
- Matrix is accurate and current
- All access types are documented
- Review process is clear

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
