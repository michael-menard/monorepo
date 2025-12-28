# Story lnch-1034: IAM Audit Process

## Status

Draft

## Story

**As a** security officer,
**I want** an IAM audit process,
**so that** we can regularly verify least-privilege access.

## Epic Context

This is **Story 2 of Launch Readiness Epic: Security & Compliance Workstream**.
Priority: **High** - Required for security compliance.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other security stories)

## Related Stories

- lnch-1038: Access Control Matrix (reference for audit)
- lnch-1033: Secret Rotation Runbook (secrets access)

## Acceptance Criteria

1. Process exists at `docs/operations/security/iam-audit.md`
2. Documents audit frequency and triggers
3. Documents what to audit
4. Documents audit procedures
5. Documents remediation process
6. Documents reporting requirements
7. Includes audit checklist

## Tasks / Subtasks

- [ ] **Task 1: Create Document Structure** (AC: 1)
  - [ ] Create `docs/operations/security/iam-audit.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Frequency** (AC: 2)
  - [ ] Regular audit schedule (quarterly)
  - [ ] Trigger-based audits
  - [ ] New deployment audits

- [ ] **Task 3: Document Scope** (AC: 3)
  - [ ] Lambda execution roles
  - [ ] CI/CD roles
  - [ ] Human access (console)
  - [ ] Cross-account access

- [ ] **Task 4: Document Procedures** (AC: 4)
  - [ ] How to list permissions
  - [ ] How to identify over-permission
  - [ ] How to analyze access patterns
  - [ ] How to use Access Analyzer

- [ ] **Task 5: Document Remediation** (AC: 5)
  - [ ] How to tighten permissions
  - [ ] Testing changes
  - [ ] Rollback if needed

- [ ] **Task 6: Document Reporting** (AC: 6)
  - [ ] Audit report template
  - [ ] Stakeholder distribution
  - [ ] Retention requirements

- [ ] **Task 7: Create Checklist** (AC: 7)
  - [ ] Pre-audit checklist
  - [ ] During-audit checklist
  - [ ] Post-audit checklist

## Dev Notes

### Audit Scope

| Resource Type | Count | Audit Focus |
|---------------|-------|-------------|
| Lambda Roles | ~43 | Per-function permissions |
| CI/CD Roles | 2-3 | GitHub Actions access |
| User Access | TBD | Console/CLI access |
| Cross-Account | 0 | N/A currently |

### IAM Analysis Commands

**List Lambda Execution Roles**
```bash
aws lambda list-functions \
  --query 'Functions[*].[FunctionName,Role]' \
  --output table
```

**Get Role Policy**
```bash
aws iam get-role-policy \
  --role-name lego-api-production-role \
  --policy-name lambda-policy
```

**List Attached Policies**
```bash
aws iam list-attached-role-policies \
  --role-name lego-api-production-role
```

**IAM Access Analyzer**
```bash
# Create analyzer (one-time)
aws accessanalyzer create-analyzer \
  --analyzer-name account-analyzer \
  --type ACCOUNT

# List findings
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:...
```

### Audit Checklist

**Pre-Audit**
- [ ] Document current role inventory
- [ ] Gather recent Access Analyzer findings
- [ ] Review any new deployments since last audit

**During Audit**
- [ ] Review each Lambda role's permissions
- [ ] Check for wildcard (*) permissions
- [ ] Verify resource constraints are in place
- [ ] Check for unused permissions (via Access Advisor)
- [ ] Verify S3 bucket policies
- [ ] Verify Secrets Manager access

**Post-Audit**
- [ ] Document findings
- [ ] Create remediation tickets
- [ ] Schedule follow-up for critical findings
- [ ] Update audit log

### Least Privilege Principles
- No `*` for actions unless absolutely necessary
- Resources should be constrained to specific ARNs
- Use conditions where possible (VPC, source IP)
- Separate roles per function where permissions differ

## Testing

### Verification
- Audit commands work
- Checklist is comprehensive
- Remediation process is clear

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
