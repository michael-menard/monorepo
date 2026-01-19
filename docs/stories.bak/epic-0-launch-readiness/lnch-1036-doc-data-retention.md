# Story lnch-1036: Data Retention Policy

## Status

Draft

## Story

**As a** compliance officer,
**I want** a documented data retention policy,
**so that** we comply with legal and regulatory requirements.

## Epic Context

This is **Story 4 of Launch Readiness Epic: Security & Compliance Workstream**.
Priority: **High** - Required for compliance.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other compliance stories)

## Related Stories

- lnch-1037: Data Privacy Documentation (GDPR rights)
- lnch-1023: S3 Lifecycle Runbook (S3 retention implementation)

## Acceptance Criteria

1. Policy exists at `docs/policies/data-retention.md`
2. Documents all data types stored
3. Documents retention periods for each type
4. Documents deletion procedures
5. Documents exceptions and holds
6. Documents audit requirements
7. Aligns with GDPR/CCPA requirements

## Tasks / Subtasks

- [ ] **Task 1: Create Policy Structure** (AC: 1)
  - [ ] Create `docs/policies/` directory
  - [ ] Create `data-retention.md`

- [ ] **Task 2: Inventory Data Types** (AC: 2)
  - [ ] User account data
  - [ ] User-generated content (MOCs, images)
  - [ ] Application logs
  - [ ] Analytics data
  - [ ] Backups

- [ ] **Task 3: Define Retention Periods** (AC: 3)
  - [ ] Active user data: Indefinite
  - [ ] Deleted user data: 30 days
  - [ ] Logs: 14-90 days
  - [ ] Backups: 7-30 days

- [ ] **Task 4: Document Deletion** (AC: 4)
  - [ ] User-initiated deletion
  - [ ] Automatic expiration
  - [ ] Verification of deletion
  - [ ] Backup purging

- [ ] **Task 5: Document Exceptions** (AC: 5)
  - [ ] Legal holds
  - [ ] Investigation requirements
  - [ ] Regulatory exceptions

- [ ] **Task 6: Document Auditing** (AC: 6)
  - [ ] Retention compliance audits
  - [ ] Deletion verification
  - [ ] Exception documentation

- [ ] **Task 7: Align with Regulations** (AC: 7)
  - [ ] GDPR right to erasure
  - [ ] CCPA deletion rights
  - [ ] Data minimization principles

## Dev Notes

### Data Inventory

| Data Type | Location | Retention | Deletion Method |
|-----------|----------|-----------|-----------------|
| User Profile | Aurora | Until deleted | Soft delete → hard delete |
| MOC Instructions | Aurora + S3 | Until deleted | Soft delete → hard delete |
| Uploaded Files | S3 | Until deleted | S3 lifecycle |
| User Sessions | DynamoDB | 24 hours | TTL |
| Lambda Logs | CloudWatch | 14 days | Auto-expire |
| API Logs | CloudWatch | 14 days | Auto-expire |
| Database Backups | Aurora | 7 days | Auto-rotate |

### User Deletion Flow
1. User requests account deletion
2. Account marked for deletion (soft delete)
3. 30-day grace period (recovery possible)
4. After 30 days:
   - User record hard deleted
   - Associated MOCs deleted
   - S3 files deleted
   - Search index entries removed

### GDPR Requirements
- Right to erasure (Article 17)
- Delete within 30 days of request
- Notify third parties (if data shared)
- Document deletion completion

### CCPA Requirements
- Right to delete personal information
- Respond within 45 days
- Exceptions for legal obligations

### Legal Hold Process
1. Legal issues hold request
2. Affected data identified
3. Retention policies suspended for that data
4. Hold documented and tracked
5. Hold released when legal matter resolved
6. Normal retention resumes

### Automated Deletion

**S3 Lifecycle Rules**
```yaml
# Already configured in serverless.yml
Rules:
  - ID: AbortIncompleteMultipartUpload
    AbortIncompleteMultipartUpload:
      DaysAfterInitiation: 7
```

**DynamoDB TTL**
- Enabled on WebSocket connections table
- Records expire after 24 hours

**CloudWatch Log Retention**
- Set per log group
- Default: 14 days

## Testing

### Verification
- All data types are documented
- Retention periods are appropriate
- Deletion procedures are tested

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
