# Test Plan: KNOW-015 Disaster Recovery

## Scope Summary

**Endpoints touched:** None (infrastructure/operational procedures)

**UI touched:** No

**Data/storage touched:** Yes
- PostgreSQL database (full database)
- embedding_cache table
- knowledge_entries table
- S3 buckets (if any file storage exists)
- Configuration files

**Infrastructure touched:**
- Backup procedures (automated)
- Restore procedures
- Monitoring and alerting
- Runbook documentation

---

## Happy Path Tests

### Test 1: Automated Backup Creation
**Setup:**
- Knowledge base with 100+ entries
- Embedding cache with entries
- Scheduled backup job configured

**Action:**
- Trigger automated backup procedure (or wait for scheduled run)
- Verify backup completion

**Expected Outcome:**
- Backup file created in designated location
- Backup includes all database tables (knowledge_entries, embedding_cache)
- Backup metadata includes timestamp, size, checksum
- Backup completion logged

**Evidence:**
- Backup file exists and is accessible
- Backup size is reasonable (not empty, not corrupted)
- Checksum validation passes
- CloudWatch logs show successful backup execution

---

### Test 2: Manual Full Database Restore
**Setup:**
- Valid backup file from Test 1
- Empty/test PostgreSQL instance
- Knowledge base application stopped

**Action:**
- Execute restore procedure from backup
- Start knowledge base application
- Query knowledge entries

**Expected Outcome:**
- All knowledge entries restored correctly
- All embedding cache entries restored
- Content hashes match pre-backup state
- Application can query restored data

**Evidence:**
- SELECT COUNT(*) matches pre-backup count
- Random sample of 10 entries have correct content, tags, embeddings
- kb_search returns expected results
- No database errors in logs

---

### Test 3: Point-in-Time Recovery (PITR)
**Setup:**
- RDS with automated backups enabled
- Knowledge base with known state at timestamp T1
- Additional entries added after T1

**Action:**
- Execute point-in-time restore to timestamp T1
- Verify data state matches T1

**Expected Outcome:**
- Database restored to exact state at T1
- Entries added after T1 are not present
- All entries existing at T1 are present

**Evidence:**
- Entry count matches T1 count
- Specific entries added after T1 do not exist
- Specific entries existing at T1 exist with correct content

---

### Test 4: Backup Validation Script
**Setup:**
- Recent backup file
- Backup validation script/procedure

**Action:**
- Run validation script on backup file
- Check backup integrity

**Expected Outcome:**
- Validation script reports SUCCESS
- Checksum matches stored checksum
- Backup file is not corrupted
- Backup metadata is valid

**Evidence:**
- Script exit code 0
- Validation report shows no errors
- Checksum validation passes

---

### Test 5: RTO/RPO Documentation Verification
**Setup:**
- Disaster recovery runbook
- RTO/RPO targets defined

**Action:**
- Review runbook for completeness
- Time a full restore procedure

**Expected Outcome:**
- Runbook includes all required steps
- Restore completes within RTO target
- Data loss is within RPO target
- Runbook is actionable by on-call engineer

**Evidence:**
- Runbook includes prerequisites, step-by-step instructions, validation steps
- Measured restore time <= RTO target
- Data loss window <= RPO target
- Runbook review sign-off

---

## Error Cases

### Error 1: Backup Fails Due to Database Unavailability
**Setup:**
- PostgreSQL database unreachable
- Scheduled backup job triggers

**Action:**
- Backup job attempts to connect to database
- Database connection fails

**Expected Outcome:**
- Backup job logs clear error message
- CloudWatch alert triggered
- Retry mechanism attempts N times with backoff
- On-call notification sent if all retries fail

**Evidence:**
- Error logged with connection details
- Alert appears in CloudWatch/SNS
- Retry attempts visible in logs
- Final failure notification sent

---

### Error 2: Restore Fails Due to Corrupted Backup
**Setup:**
- Backup file with corrupted data (simulate with dd or similar)
- Restore procedure initiated

**Action:**
- Attempt restore from corrupted backup
- Restore fails during checksum validation or data import

**Expected Outcome:**
- Restore detects corruption before applying changes
- Error message clearly indicates corruption
- Database remains unchanged (no partial restore)
- Alternative backup suggestion provided

**Evidence:**
- Error message includes "corrupted" or "checksum mismatch"
- Database state unchanged from pre-restore
- Runbook provides fallback steps

---

### Error 3: Insufficient Storage for Backup
**Setup:**
- Backup destination with limited storage
- Backup size exceeds available space

**Action:**
- Backup job attempts to write backup file
- Storage runs out during backup

**Expected Outcome:**
- Backup fails gracefully
- Clear error message about storage
- Partial backup file cleaned up or marked invalid
- Alert triggered

**Evidence:**
- Error message mentions storage/disk space
- Partial backup not left in usable state
- CloudWatch alert fired
- Storage monitoring shows low disk space

---

### Error 4: Restore to Wrong Database Instance
**Setup:**
- Production backup file
- Attempt to restore to production instance (wrong target)

**Action:**
- Execute restore command with production instance as target
- Safety check should prevent overwrite

**Expected Outcome:**
- Restore procedure prompts for confirmation
- Restore procedure validates target is empty or explicitly confirmed
- Accidental production overwrite prevented

**Evidence:**
- Confirmation prompt in runbook
- Restore script checks for existing data
- Warning logged if attempting to overwrite

---

## Edge Cases (Reasonable)

### Edge 1: Large Database Backup (10k+ entries)
**Setup:**
- Knowledge base with 10,000+ entries
- Large embedding cache

**Action:**
- Trigger backup
- Monitor backup duration

**Expected Outcome:**
- Backup completes successfully
- Backup duration within acceptable range (< 30 minutes)
- Backup file size reasonable (compressed)

**Evidence:**
- Backup completion logged
- Backup file exists with expected size
- Backup duration logged

---

### Edge 2: Concurrent Backup and Write Operations
**Setup:**
- Knowledge base actively receiving updates
- Backup job triggered during write activity

**Action:**
- Trigger backup while kb_add operations in progress
- Monitor for consistency issues

**Expected Outcome:**
- Backup captures consistent snapshot (transaction isolation)
- Write operations not blocked or significantly slowed
- Backup includes either pre-write or post-write state consistently

**Evidence:**
- Backup checksum validates
- Restore produces consistent database state
- Write operations log no errors

---

### Edge 3: Multiple Consecutive Restores
**Setup:**
- Multiple backup files from different timestamps
- Execute restores in sequence

**Action:**
- Restore from backup T1
- Restore from backup T2
- Restore from backup T1 again

**Expected Outcome:**
- Each restore produces expected state
- Database state matches backup timestamp
- No residual data from previous restore

**Evidence:**
- Entry counts match expected counts for each timestamp
- Specific entries exist/don't exist as expected
- No duplicate entries

---

### Edge 4: Backup During Maintenance Window
**Setup:**
- Scheduled maintenance window
- Database schema migration in progress

**Action:**
- Backup triggered during or immediately after migration

**Expected Outcome:**
- Backup includes schema changes
- Backup is restorable
- Schema version metadata included in backup

**Evidence:**
- Restored database has correct schema
- Migration version table correct
- Application works with restored database

---

### Edge 5: Zero-Entry Database Backup
**Setup:**
- Fresh knowledge base with no entries
- Only schema exists

**Action:**
- Trigger backup of empty database

**Expected Outcome:**
- Backup succeeds
- Backup file is minimal size
- Restore produces empty database with correct schema

**Evidence:**
- Backup file created
- Restore succeeds
- Restored database has 0 entries but schema intact

---

## Required Tooling Evidence

### Backend Testing

**Backup Scripts:**
- `scripts/backup-kb.sh` or equivalent
- Script should output backup file path and checksum
- Assert: exit code 0, file exists, checksum logged

**Restore Scripts:**
- `scripts/restore-kb.sh` or equivalent
- Script should prompt for confirmation, restore from file
- Assert: exit code 0, database restored, application functional

**Validation Scripts:**
- `scripts/validate-backup.sh` or equivalent
- Script should verify checksum, backup integrity
- Assert: exit code 0, validation report clean

**Database Queries:**
- Query entry counts before/after backup
- Query specific entries to verify content
- Assert: counts match, content matches

**CloudWatch/Monitoring:**
- CloudWatch logs for backup/restore operations
- Alerts for backup failures
- Assert: logs exist, alerts configured

### RTO/RPO Verification

**Timed Restore Test:**
- Use `time scripts/restore-kb.sh` to measure duration
- Document measured RTO
- Assert: RTO <= target (document target in story)

**Data Loss Window:**
- Create entry at T0
- Restore from backup before T0
- Assert: entry does not exist (validates RPO)

---

## Risks to Call Out

### Risk 1: RTO/RPO Targets Not Defined
- Story must define specific RTO and RPO targets
- Without targets, cannot validate success
- **Recommendation:** PM should specify targets (e.g., RTO: 4 hours, RPO: 24 hours)

### Risk 2: Cross-Region Restore Not Specified
- Unclear if disaster recovery includes region failure
- May require cross-region replication
- **Recommendation:** PM should clarify scope (single-region vs multi-region)

### Risk 3: Secret Restoration
- Backup may not include secrets (API keys, DB passwords)
- Restore procedure must document secret restoration
- **Recommendation:** Runbook must include secret restoration steps

### Risk 4: Backup Storage Security
- Backups contain sensitive data (knowledge entries)
- Backup storage must be encrypted and access-controlled
- **Recommendation:** PM should specify backup storage security requirements

### Risk 5: Restore Testing Frequency
- Backups are useless if restore never tested
- Periodic restore drills required
- **Recommendation:** PM should specify restore drill frequency (quarterly?)

### Risk 6: Application Downtime During Restore
- Restore may require application downtime
- Downtime duration impacts availability SLOs
- **Recommendation:** PM should clarify acceptable downtime for restore operations

### Risk 7: Backup Retention Policy
- Unclear how long backups retained
- Storage costs increase with retention
- **Recommendation:** PM should specify retention policy (e.g., 30 days daily, 12 months monthly)
