# Dev Feasibility Review: KNOW-015 Disaster Recovery

## Feasibility Summary

**Feasible:** Yes

**Confidence:** Medium-High

**Why:**
- Backup/restore for PostgreSQL is well-understood with standard tooling (pg_dump, pg_restore, RDS automated backups)
- Docker Compose local environment simplifies local testing
- RDS provides built-in point-in-time recovery (PITR) capabilities
- Runbook creation is documentation work, low technical risk
- Main complexity is in defining appropriate RTO/RPO targets and testing procedures

**Medium Confidence Factors:**
- RTO/RPO targets not yet defined (business decision required)
- Deployment environment (local Docker vs RDS) determines implementation approach
- Secret restoration procedure depends on KNOW-011 (secrets management) which is deferred
- Cross-region replication decision impacts scope significantly

---

## Likely Change Surface

### Packages Impacted
- `apps/api/knowledge-base/` (new scripts/ directory for backup/restore automation)
- No code changes to existing packages
- Potentially new package: `packages/backend/ops-scripts` if reusable automation created

### Files Likely Created/Modified
**New Files:**
- `apps/api/knowledge-base/scripts/backup-kb.sh` - automated backup script
- `apps/api/knowledge-base/scripts/restore-kb.sh` - restore procedure script
- `apps/api/knowledge-base/scripts/validate-backup.sh` - backup integrity validation
- `apps/api/knowledge-base/docs/DISASTER-RECOVERY-RUNBOOK.md` - operational runbook
- `apps/api/knowledge-base/docs/RTO-RPO.md` - targets and SLOs documentation
- `.github/workflows/disaster-recovery-test.yml` (optional) - automated restore testing in CI

**Infrastructure Files:**
- CloudWatch alert configurations (if using Terraform/CDK)
- S3 bucket policy for backup storage
- IAM roles for backup automation

### Endpoints Impacted
- None (operational/infrastructure only)

### Migration/Deploy Touchpoints
- **Local Development:** Docker Compose volume snapshots or pg_dump scripts
- **Production:** RDS automated backups configuration, snapshot scheduling
- **CI/CD:** Optional automated restore testing in pipeline
- **Monitoring:** CloudWatch alarms for backup failures
- **Secrets:** Runbook must document secret restoration (depends on environment variable management from KNOW-028)

---

## Risk Register

### Risk 1: RTO/RPO Targets Not Defined
**Why Risky:**
- Cannot validate success without targets
- Business requirements drive technical implementation
- RTO < 1 hour requires different approach than RTO < 24 hours

**Mitigation:**
- PM MUST define targets before dev work begins
- Recommend: RTO: 4 hours, RPO: 24 hours (reasonable for MVP)
- Document targets in acceptance criteria

---

### Risk 2: Local vs Production Environment Divergence
**Why Risky:**
- Local Docker uses pg_dump/pg_restore
- RDS uses automated backups and snapshots
- Procedures may diverge between environments
- Testing in local may not validate production readiness

**Mitigation:**
- Create separate runbooks for local vs RDS
- Test RDS restore in staging/test environment
- Document environment-specific steps clearly
- Acceptance criteria should require both environments tested

---

### Risk 3: Secret Restoration Procedure
**Why Risky:**
- Database restore doesn't include API keys, DB passwords
- KNOW-011 (Secrets Management) is deferred to post-launch
- Current .env file approach means secrets not in backup
- Restore incomplete without secrets

**Mitigation:**
- Runbook MUST document manual secret restoration steps
- For MVP: document .env file restoration from secure storage
- Post-KNOW-011: document AWS Secrets Manager restoration
- Test complete restore including secrets

---

### Risk 4: Backup Storage Security
**Why Risky:**
- Backups contain all knowledge base entries (potentially sensitive)
- Backup files are database dumps (easily readable)
- Improper storage = data breach risk

**Mitigation:**
- PM should specify encryption at rest for backups
- Backups stored in S3 with restricted IAM policies
- Backup files encrypted with KMS
- Document retention and deletion policy

---

### Risk 5: Testing Restore Without Breaking Production
**Why Risky:**
- Restore procedure is destructive (overwrites database)
- Accidental production restore = data loss
- Testing must be safe and isolated

**Mitigation:**
- Restore script MUST prompt for confirmation
- Script should validate target is non-production or explicitly confirmed
- Test in isolated RDS instance or Docker container
- Document test procedure clearly in runbook

---

### Risk 6: Backup Automation Reliability
**Why Risky:**
- Automated backups fail silently = no backups when needed
- CloudWatch alarms may not fire
- On-call may not respond to alerts

**Mitigation:**
- Require CloudWatch alerts for backup failures
- Implement retry logic with exponential backoff
- Document alert response procedures
- Periodic drill to validate backup/restore process (quarterly)

---

### Risk 7: Large Database Backup Performance
**Why Risky:**
- 10k+ entry database may take significant time to backup
- Backup may impact database performance during backup
- Restore time may exceed RTO target

**Mitigation:**
- Test backup/restore with realistic dataset size (KNOW-012 overlap)
- Document expected backup/restore duration
- Consider RDS snapshot approach for faster restore
- Monitor backup duration and optimize if needed

---

### Risk 8: Schema Migration Version Mismatch
**Why Risky:**
- Backup from version N restored to version N+1 database
- Schema mismatch causes restore failure or data corruption
- Migration version not tracked in backup metadata

**Mitigation:**
- Include schema version in backup metadata
- Restore script validates schema compatibility
- Document migration version in backup filename/metadata
- Test restore after schema migration

---

### Risk 9: Point-in-Time Recovery (PITR) Complexity
**Why Risky:**
- RDS PITR requires understanding of transaction logs
- PITR to wrong time = wrong data state
- PITR testing requires precise timing

**Mitigation:**
- Document PITR procedure with examples
- Test PITR with known timestamps
- Runbook includes PITR decision tree (when to use PITR vs snapshot)
- Validate PITR in acceptance criteria

---

### Risk 10: Backup Retention and Cost
**Why Risky:**
- Retention policy not defined = storage costs grow unbounded
- Too short retention = insufficient recovery window
- S3 storage costs for large databases add up

**Mitigation:**
- PM should define retention policy (e.g., 30 days daily, 12 months monthly)
- Implement lifecycle policies to archive/delete old backups
- Document cost implications
- Monitor S3 storage costs

---

## Scope Tightening Suggestions (Non-breaking)

### Clarification 1: Single-Region Scope
**Suggestion:** Explicitly scope to single-region disaster recovery for MVP
- Cross-region replication is P2 enhancement
- Single-region DR covers most failure scenarios (AZ failure, accidental deletion)
- Multi-region DR significantly increases complexity and cost

### Clarification 2: RTO/RPO Targets
**Suggestion:** Define specific targets:
- **Recommended RTO:** 4 hours (time to restore from backup)
- **Recommended RPO:** 24 hours (acceptable data loss window)
- These are reasonable for MVP, can be tightened post-launch

### Clarification 3: Backup Frequency
**Suggestion:** Define backup schedule:
- **Daily automated backups** at 2 AM UTC (low traffic period)
- **Retention:** 30 days for daily backups
- RDS automated backups provide PITR for shorter RPO if needed

### Clarification 4: Explicit OUT OF SCOPE
**Suggestion:** Document out of scope for MVP:
- Cross-region disaster recovery
- Active-active multi-region setup
- Real-time replication (< 1 hour RPO)
- Automated failover (manual restore only for MVP)

---

## Missing Requirements / Ambiguities

### Ambiguity 1: Deployment Environment
**What's Unclear:** Is disaster recovery for local Docker, RDS, or both?

**Decision Needed:** PM should specify:
- "Disaster recovery procedures for both local Docker (development) and RDS (production)"
- Or: "RDS only (production focus)"

**Recommendation:** Both environments, with primary focus on RDS

---

### Ambiguity 2: RTO/RPO Targets
**What's Unclear:** What are acceptable recovery time and data loss windows?

**Decision Needed:** PM should specify exact targets:
- RTO: X hours (time to restore)
- RPO: Y hours (data loss window)

**Recommendation:** RTO: 4 hours, RPO: 24 hours (achievable with daily backups)

---

### Ambiguity 3: Backup Storage Location
**What's Unclear:** Where are backups stored? S3? Local filesystem?

**Decision Needed:** PM should specify:
- Production: S3 bucket with encryption and restricted access
- Local: Volume mount or local filesystem

**Recommendation:** S3 for production, local volume for development

---

### Ambiguity 4: Alerting and Monitoring
**What's Unclear:** What monitoring is required? Who gets alerted?

**Decision Needed:** PM should specify:
- CloudWatch alarms for backup failures
- SNS notification to on-call
- Dashboard for backup success metrics

**Recommendation:** CloudWatch + SNS to ops team

---

### Ambiguity 5: Restore Testing Frequency
**What's Unclear:** How often should restore procedures be tested?

**Decision Needed:** PM should specify drill frequency
- "Restore drill every 3 months (quarterly)"
- Or: "Restore tested before each major release"

**Recommendation:** Quarterly restore drills

---

### Ambiguity 6: Secret Restoration
**What's Unclear:** How are secrets (API keys, DB passwords) restored?

**Decision Needed:** PM should specify:
- For MVP: Document .env file restoration from secure storage
- Post-KNOW-011: Reference AWS Secrets Manager procedure

**Recommendation:** Document interim manual process, plan for automation post-KNOW-011

---

## Evidence Expectations

### What Dev/Proof Should Capture

**Backup Evidence:**
- Screenshot/log of successful automated backup
- Backup file exists in S3/local storage
- Checksum validation passes
- CloudWatch logs show backup completion

**Restore Evidence:**
- Screenshot/log of successful restore
- Before/after entry counts match
- Sample queries return expected results
- Application functional after restore

**PITR Evidence:**
- Restore to specific timestamp T1
- Verify entries added after T1 are absent
- Verify entries before T1 are present

**Runbook Evidence:**
- Complete runbook document with:
  - Prerequisites
  - Step-by-step backup procedure
  - Step-by-step restore procedure
  - PITR procedure
  - Secret restoration steps
  - Validation steps
  - Troubleshooting guide

**RTO/RPO Evidence:**
- Timed restore test showing duration
- Documented data loss window
- Compare against targets

**Monitoring Evidence:**
- CloudWatch dashboard showing backup metrics
- Alert configured for backup failures
- Test alert fires when backup fails

---

### What Might Fail in CI/Deploy

**CI Failures:**
- Restore test in CI requires database access (may need separate test DB)
- Backup scripts may fail in CI without AWS credentials
- Timing tests may be flaky in CI environment

**Deployment Failures:**
- RDS backup configuration requires Terraform/CDK changes
- IAM permissions for backup automation may be missing
- S3 bucket creation may fail if bucket name taken
- CloudWatch alarms may not create if SNS topic missing

**Recommendations:**
- Test backup/restore scripts locally before CI
- Use Docker Compose for CI restore testing
- Document required AWS infrastructure (S3, IAM, CloudWatch)
- Consider infrastructure-as-code (Terraform/CDK) for repeatability
