# Test Plan - KNOW-017: Data Encryption

## Scope Summary

- **Endpoints touched:** None (infrastructure configuration)
- **UI touched:** No
- **Data/storage touched:** Yes (PostgreSQL RDS encryption configuration)
- **Infrastructure:** RDS encryption at rest, KMS key management

## Happy Path Tests

### Test 1: Verify RDS Encryption Enabled

**Setup:**
- Access AWS Console or AWS CLI with appropriate IAM permissions
- Locate the target PostgreSQL RDS instance for knowledge base

**Action:**
- Check RDS instance encryption status via AWS Console or CLI:
  ```bash
  aws rds describe-db-instances --db-instance-identifier <kb-instance-id> \
    --query 'DBInstances[0].StorageEncrypted'
  ```

**Expected Outcome:**
- Returns `true`
- Console shows "Encryption: Enabled"
- Encryption algorithm shown as AES-256

**Evidence:**
- CLI output screenshot or API response showing `StorageEncrypted: true`
- AWS Console screenshot showing encryption enabled
- KMS Key ARN displayed

### Test 2: Verify KMS Key Association

**Setup:**
- Same as Test 1
- Access to KMS console

**Action:**
- Retrieve KMS key ID from RDS instance:
  ```bash
  aws rds describe-db-instances --db-instance-identifier <kb-instance-id> \
    --query 'DBInstances[0].KmsKeyId'
  ```
- Verify key exists in KMS:
  ```bash
  aws kms describe-key --key-id <kms-key-id>
  ```

**Expected Outcome:**
- RDS instance references valid KMS key ARN
- KMS key status is "Enabled"
- Key policy allows RDS service principal access

**Evidence:**
- KMS Key ARN from RDS instance
- KMS key details (KeyState, CreationDate, Description)
- Key policy JSON showing RDS permissions

### Test 3: Verify Database Connectivity After Encryption

**Setup:**
- RDS encryption enabled
- Application connection string configured

**Action:**
- Connect to PostgreSQL database using connection string from knowledge-base package
- Run sample query:
  ```sql
  SELECT 1;
  ```

**Expected Outcome:**
- Connection successful
- Query returns expected result
- No performance degradation observed
- Connection encryption (SSL/TLS) also enabled

**Evidence:**
- Connection success log
- Query execution time
- SSL/TLS connection confirmation from PostgreSQL logs

### Test 4: Verify Automated Backups Are Encrypted

**Setup:**
- RDS encryption enabled
- Automated backups configured

**Action:**
- Check automated backup encryption status:
  ```bash
  aws rds describe-db-snapshots \
    --db-instance-identifier <kb-instance-id> \
    --query 'DBSnapshots[0].Encrypted'
  ```

**Expected Outcome:**
- Automated snapshots show `Encrypted: true`
- Same KMS key used for snapshots as instance

**Evidence:**
- CLI output showing encrypted snapshots
- KMS key ID matches between instance and snapshots

## Error Cases

### Error 1: Missing KMS Permissions

**Setup:**
- Attempt to enable encryption with insufficient KMS permissions
- IAM role lacks `kms:CreateGrant`, `kms:Decrypt`, or `kms:GenerateDataKey`

**Action:**
- Attempt RDS encryption enable operation

**Expected Outcome:**
- Operation fails with clear error message
- Error indicates missing KMS permissions
- No partial encryption state

**Evidence:**
- Error message from AWS API
- CloudWatch logs showing permission denied
- Documentation of required IAM permissions

### Error 2: Encryption on Existing Instance (Invalid Operation)

**Setup:**
- Existing unencrypted RDS instance
- Attempt direct encryption enable

**Action:**
- Try to enable encryption on running instance via AWS Console/CLI

**Expected Outcome:**
- AWS prevents direct encryption of existing unencrypted instance
- Error message indicates encryption must be enabled during creation or via snapshot restore

**Evidence:**
- Error message from AWS
- Documentation of encryption migration path (snapshot → restore encrypted)

### Error 3: KMS Key Deletion or Disablement

**Setup:**
- Encrypted RDS instance
- KMS key is disabled or scheduled for deletion

**Action:**
- Attempt database operations
- Check RDS instance status

**Expected Outcome:**
- Database operations fail
- RDS instance may enter "storage-failure" or "inaccessible-encryption-credentials" state
- CloudWatch alarm triggered

**Evidence:**
- RDS instance status showing encryption key issue
- CloudWatch alarm notification
- Database connection error logs

## Edge Cases (Reasonable)

### Edge 1: Cross-Region Snapshot Restore

**Setup:**
- Encrypted RDS snapshot in source region
- Attempt restore to different region

**Action:**
- Copy snapshot to target region with re-encryption:
  ```bash
  aws rds copy-db-snapshot \
    --source-db-snapshot-identifier <source-arn> \
    --target-db-snapshot-identifier <target-name> \
    --kms-key-id <target-region-kms-key> \
    --source-region <source-region>
  ```

**Expected Outcome:**
- Snapshot copied and re-encrypted with target region KMS key
- New snapshot is encrypted and functional

**Evidence:**
- Successful copy operation
- New snapshot shows encryption with target region KMS key
- Restored instance connects successfully

### Edge 2: KMS Key Rotation

**Setup:**
- RDS encryption enabled with KMS key
- Enable automatic key rotation for KMS key

**Action:**
- Wait for or trigger KMS key rotation
- Verify database operations continue

**Expected Outcome:**
- Database operations unaffected
- AWS automatically handles key material rotation
- No manual intervention required

**Evidence:**
- KMS key rotation status
- Database uptime during rotation period
- No connection errors in application logs

### Edge 3: Encryption with Existing Data Migration

**Setup:**
- Need to migrate from unencrypted to encrypted RDS instance
- Production data present

**Action:**
1. Create snapshot of unencrypted instance
2. Copy snapshot with encryption enabled
3. Restore encrypted snapshot to new instance
4. Update application connection strings
5. Verify data integrity

**Expected Outcome:**
- Data successfully migrated to encrypted instance
- No data loss
- All tables and records intact

**Evidence:**
- Row count comparison (source vs. target)
- Checksum validation on critical tables
- Application functional tests pass

### Edge 4: Performance Impact Testing

**Setup:**
- Encrypted RDS instance
- Baseline performance metrics available

**Action:**
- Run performance benchmarks:
  - Insert operations
  - Complex queries
  - Embedding searches (pgvector operations)

**Expected Outcome:**
- Encryption overhead < 5% in most operations
- No significant latency increase
- Throughput remains acceptable

**Evidence:**
- Benchmark results comparing encrypted vs. unencrypted baseline
- CloudWatch metrics (CPU, IOPS, latency)
- Application performance logs

## Required Tooling Evidence

### Infrastructure (AWS)

**Required AWS CLI commands:**
```bash
# Verify encryption status
aws rds describe-db-instances --db-instance-identifier <id>

# Check KMS key
aws kms describe-key --key-id <key-id>

# List encrypted snapshots
aws rds describe-db-snapshots --db-instance-identifier <id>

# Verify key policy
aws kms get-key-policy --key-id <key-id> --policy-name default
```

**Required assertions:**
- `StorageEncrypted: true` in RDS describe output
- `KeyState: Enabled` in KMS describe output
- `Encrypted: true` for all snapshots
- Key policy includes RDS service principal

**CloudWatch checks:**
- No encryption-related errors in RDS logs
- Database connection metrics remain healthy

### Application Layer

**Required connection test:**
- Knowledge base MCP server can connect to encrypted database
- SSL/TLS connection verified
- All CRUD operations function correctly

**Evidence:**
```bash
# From knowledge-base package
pnpm test -- --grep "database connection"
```

### Documentation Requirements

**Must produce:**
1. KMS key management runbook (`docs/ENCRYPTION-KEY-MANAGEMENT.md`)
   - Key rotation procedures
   - Key policy documentation
   - Disaster recovery scenarios (key loss, accidental deletion)
   - Key backup and recovery

2. Encryption migration guide (if migrating existing instance)
   - Step-by-step snapshot → restore process
   - Downtime estimation
   - Rollback procedures

3. Compliance documentation
   - Encryption standards met (AES-256)
   - Key management compliance (e.g., SOC 2, HIPAA if applicable)
   - Audit trail configuration

## Risks to Call Out

### Test Environment Constraints

- **Risk:** Enabling encryption on production RDS requires careful planning; cannot be easily reversed
- **Mitigation:** Test full encryption workflow in staging environment first; document rollback (snapshot restore) procedures

### KMS Cost Implications

- **Risk:** KMS key usage incurs costs ($1/month per key + API calls)
- **Mitigation:** Document KMS costs in infrastructure budget; consider using AWS-managed key vs. customer-managed key tradeoff

### Key Management Complexity

- **Risk:** Improper key management can lead to data loss (e.g., key deletion before retention period)
- **Mitigation:** Implement mandatory key deletion waiting period (30 days); document key recovery procedures; set up CloudWatch alarms for key usage

### Performance Testing Gaps

- **Risk:** Encryption overhead may impact high-throughput operations
- **Mitigation:** Baseline performance metrics before encryption; run load tests after encryption; monitor production metrics closely during initial rollout

### Cross-Region Disaster Recovery

- **Risk:** Encrypted snapshots require KMS key access in target region
- **Mitigation:** Document cross-region KMS key grant procedures; test DR failover with encrypted snapshots

### Missing Prerequisites

- **Blocker Check:** Do we have existing production data that requires migration? If yes, need detailed migration plan
- **Blocker Check:** Are there compliance requirements that dictate key management policies? If yes, need compliance review before implementation
