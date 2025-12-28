# Story lnch-1037: Data Privacy Documentation

## Status

Draft

## Story

**As a** compliance officer,
**I want** comprehensive data privacy documentation,
**so that** we can demonstrate GDPR/CCPA compliance.

## Epic Context

This is **Story 5 of Launch Readiness Epic: Security & Compliance Workstream**.
Priority: **Medium** - Required for regulatory compliance.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1036: Data Retention Policy (deletion procedures)

## Related Stories

- lnch-1036: Data Retention Policy (retention/deletion)
- lnch-1038: Access Control Matrix (data access controls)

## Acceptance Criteria

1. Documentation exists at `docs/policies/data-privacy.md`
2. Documents personal data collected
3. Documents lawful basis for processing
4. Documents user rights implementation
5. Documents data subject request process
6. Documents third-party data sharing
7. Documents privacy by design measures

## Tasks / Subtasks

- [ ] **Task 1: Create Documentation Structure** (AC: 1)
  - [ ] Create `docs/policies/data-privacy.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Personal Data** (AC: 2)
  - [ ] Email addresses
  - [ ] Profile information
  - [ ] Usage data
  - [ ] Uploaded content metadata

- [ ] **Task 3: Document Legal Basis** (AC: 3)
  - [ ] Contract performance
  - [ ] Legitimate interest
  - [ ] Consent (where applicable)

- [ ] **Task 4: Document User Rights** (AC: 4)
  - [ ] Right to access (export)
  - [ ] Right to rectification
  - [ ] Right to erasure
  - [ ] Right to data portability

- [ ] **Task 5: Document DSR Process** (AC: 5)
  - [ ] How to submit request
  - [ ] Verification process
  - [ ] Response timeline
  - [ ] Execution procedures

- [ ] **Task 6: Document Third Parties** (AC: 6)
  - [ ] AWS (infrastructure)
  - [ ] Analytics providers (if any)
  - [ ] Data processing agreements

- [ ] **Task 7: Document Privacy Measures** (AC: 7)
  - [ ] Encryption at rest
  - [ ] Encryption in transit
  - [ ] Access controls
  - [ ] Pseudonymization

## Dev Notes

### Personal Data Inventory

| Data Category | Data Elements | Legal Basis |
|---------------|---------------|-------------|
| Account | Email, name | Contract |
| Content | MOCs, files | Contract |
| Usage | IP, timestamps | Legitimate Interest |
| Technical | Logs, errors | Legitimate Interest |

### User Rights Implementation

| Right | How Implemented |
|-------|-----------------|
| Access | Export data endpoint |
| Rectification | Edit profile UI |
| Erasure | Delete account flow |
| Portability | Export as JSON/ZIP |
| Objection | Contact support |

### Data Subject Request (DSR) Process

**Access Request**
1. User submits request (email or in-app)
2. Verify identity (email confirmation)
3. Compile data package (within 30 days)
4. Deliver via secure download link

**Deletion Request**
1. User submits request (email or in-app)
2. Verify identity
3. Initiate deletion (see data-retention.md)
4. Confirm completion within 30 days

### Third-Party Processors

| Processor | Purpose | DPA in Place |
|-----------|---------|--------------|
| AWS | Infrastructure | Yes (AWS DPA) |
| (Add others) | | |

### Privacy by Design Measures
- Minimal data collection
- Encryption at rest (S3, Aurora, Secrets Manager)
- Encryption in transit (HTTPS/TLS)
- VPC isolation for databases
- Structured logging with PII sanitization
- Access controls via Cognito + IAM

### PII Sanitization
```typescript
// Using @repo/pii-sanitizer
import { sanitize } from '@repo/pii-sanitizer'

logger.info('Request processed', sanitize({
  userId,
  email, // will be redacted
  action: 'login'
}))
```

## Testing

### Verification
- Documentation is complete
- Rights implementation is accurate
- DSR process is tested

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
