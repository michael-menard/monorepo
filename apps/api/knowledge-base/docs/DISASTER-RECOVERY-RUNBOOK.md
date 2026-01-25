# Disaster Recovery Runbook - Knowledge Base MCP Server

> **Audience:** On-call engineers, PM, QA (non-technical users welcome)
>
> **Purpose:** Step-by-step guide to backup and restore the Knowledge Base database
>
> **Last Updated:** 2026-01-25

---

## Quick Reference

| Action | Command | Time |
|--------|---------|------|
| Create backup | `./scripts/backup-kb.sh` | ~2 min |
| Validate backup | `./scripts/validate-backup.sh --backup-file=<path>` | ~1 min |
| Restore from backup | `./scripts/restore-kb.sh --backup-file=<path>` | ~5 min |
| Monthly validation | `./scripts/monthly-validate-all.sh` | ~10 min |

**RTO Target:** 4 hours (time from incident to restored service)
**RPO Target:** 24 hours (maximum data loss = 1 day)

---

## 1. Prerequisites

Before you begin, ensure you have:

### Access Requirements

- [ ] Terminal access to the server or development machine
- [ ] Access to the `.env` file with database credentials
- [ ] Write access to the `apps/api/knowledge-base/` directory

### Tools Needed

All tools are standard Unix utilities:

| Tool | Check Command | What It Does |
|------|---------------|--------------|
| psql | `which psql` | PostgreSQL client |
| pg_dump | `which pg_dump` | Creates database backups |
| gzip | `which gzip` | Compresses backups |
| sha256sum | `which sha256sum` | Verifies backup integrity |

If any tool is missing, install PostgreSQL client tools:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

### Environment Setup

1. Navigate to the knowledge-base directory:
   ```bash
   cd apps/api/knowledge-base
   ```

2. Verify your `.env` file exists:
   ```bash
   ls -la .env
   ```

3. If `.env` doesn't exist, copy from example:
   ```bash
   cp .env.example .env
   # Then edit .env with your database credentials
   ```

---

## 2. Backup Procedures

### 2.1 Running a Manual Backup

**When to use:** Before deployments, schema changes, or as a safety measure.

**Steps:**

1. Navigate to the knowledge-base directory:
   ```bash
   cd apps/api/knowledge-base
   ```

2. Run the backup script:
   ```bash
   ./scripts/backup-kb.sh
   ```

3. You will see output like this:
   ```
   [2026-01-25 14:30:00] Knowledge Base Backup Starting
   [2026-01-25 14:30:00] Validating database connection...
   [2026-01-25 14:30:01] Connection OK (1s)
   [2026-01-25 14:30:01] Starting pg_dump...
   [2026-01-25 14:32:15] pg_dump complete (134s)
   [2026-01-25 14:32:15] Generating SHA-256 checksum...
   [2026-01-25 14:32:15] BACKUP COMPLETE

   BACKUP_FILE=./backups/kb-backup-20260125-143000.sql.gz
   CHECKSUM=abc123...
   ENTRY_COUNT=1234
   ```

4. **Verify the backup was created:**
   ```bash
   ls -lh ./backups/kb-backup-*.sql.gz
   ```

### 2.2 Verifying a Backup

**When to use:** After creating a backup, or before attempting a restore.

**Steps:**

1. Run the validation script:
   ```bash
   ./scripts/validate-backup.sh --backup-file=./backups/kb-backup-20260125-143000.sql.gz
   ```

2. Look for all checks to show `[PASS]`:
   ```
   CHECKS:
     [PASS] File exists
     [PASS] File is readable
     [PASS] File size: 1.2 MB
     [PASS] SHA-256 checksum verified
     [PASS] SQL syntax valid
     [PASS] Dry-run restore successful (1234 entries)

   RESULT: PASS
   ```

3. **If any check shows `[FAIL]`**, the backup may be corrupted. Create a new backup.

### 2.3 Finding Your Backups

Backups are stored in the `./backups/` directory:

```bash
# List all backups, newest first
ls -lt ./backups/kb-backup-*.sql.gz

# See backup sizes
du -h ./backups/kb-backup-*.sql.gz
```

**Backup file naming:**
- Format: `kb-backup-YYYYMMDD-HHMMSS.sql.gz`
- Example: `kb-backup-20260125-143000.sql.gz` = January 25, 2026 at 2:30 PM

---

## 3. Restore Procedures

> **WARNING:** Restoring a backup will **DELETE ALL CURRENT DATA** in the database.
> Make sure you have a recent backup before proceeding!

### 3.1 Standard Restore

**When to use:** After data loss, corruption, or to recover from a failed deployment.

**Steps:**

1. **Stop any running applications** that connect to the database.

2. Navigate to the knowledge-base directory:
   ```bash
   cd apps/api/knowledge-base
   ```

3. Choose which backup to restore:
   ```bash
   # List available backups
   ls -lt ./backups/kb-backup-*.sql.gz
   ```

4. Run the restore script:
   ```bash
   ./scripts/restore-kb.sh --backup-file=./backups/kb-backup-20260125-143000.sql.gz
   ```

5. You will see pre-flight checks:
   ```
   [2026-01-25 15:00:00] Validating backup file...
     File exists: YES
     File readable: YES
     Checksum verified: abc123...
   [2026-01-25 15:00:01] Checking disk space...
     Disk space: OK
   ```

6. **Confirm the restore when prompted:**
   ```
   WARNING: DESTRUCTIVE OPERATION

   This will DROP and RECREATE the database:
     Target: knowledgebase

   Type 'RESTORE' to confirm:
   ```

   Type `RESTORE` and press Enter.

7. Wait for the restore to complete:
   ```
   [2026-01-25 15:00:30] Restoring from backup...
   [2026-01-25 15:03:00] RESTORE COMPLETE

   Entries restored: 1234
   Duration: 2m 30s
   ```

8. **Verify the restore:**
   ```bash
   # Check entry count
   psql -h localhost -p 5433 -U kbuser -d knowledgebase \
        -c "SELECT COUNT(*) FROM knowledge_entries;"
   ```

### 3.2 Restore to Test Database

**When to use:** To verify a backup without affecting production data.

**Steps:**

1. Run restore with a different target database:
   ```bash
   ./scripts/restore-kb.sh \
     --backup-file=./backups/kb-backup-20260125-143000.sql.gz \
     --target-db=kb_restore_test
   ```

2. This creates a new database called `kb_restore_test` with the backup data.

3. After verification, you can drop the test database:
   ```bash
   psql -h localhost -p 5433 -U kbuser -d postgres \
        -c "DROP DATABASE kb_restore_test;"
   ```

---

## 4. Secret Restoration

The database backup does **NOT** include secrets (passwords, API keys).

### 4.1 Required Secrets

After restoring the database, verify these are in your `.env` file:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| KB_DB_PASSWORD | Database password | Team password manager |
| OPENAI_API_KEY | OpenAI API key | OpenAI dashboard |

### 4.2 Restoring the .env File

If your `.env` file is lost:

1. Copy the template:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required values from your password manager.

3. Verify the configuration:
   ```bash
   # Try connecting to the database
   psql -h localhost -p 5433 -U kbuser -d knowledgebase -c "SELECT 1;"
   ```

For detailed secret management, see: [KNOW-028 Environment Variables](../README.md)

---

## 5. Validation Steps

After any restore, perform these verification steps:

### 5.1 Quick Validation

```bash
# 1. Check entry count
psql -h localhost -p 5433 -U kbuser -d knowledgebase \
     -c "SELECT COUNT(*) as entries FROM knowledge_entries;"

# 2. Check recent entries
psql -h localhost -p 5433 -U kbuser -d knowledgebase \
     -c "SELECT id, title, created_at FROM knowledge_entries ORDER BY created_at DESC LIMIT 5;"

# 3. Check tables exist
psql -h localhost -p 5433 -U kbuser -d knowledgebase \
     -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### 5.2 Expected Results

| Check | Expected Result |
|-------|-----------------|
| Entry count | Should match the backup (shown during restore) |
| Recent entries | Should show titles and dates |
| Tables | Should include: `knowledge_entries`, `embedding_cache` |

---

## 6. Troubleshooting

### Problem: "Lock file exists" Error

**Symptoms:**
```
ERROR: Restore already in progress
Lock file: ./backups/.restore.lock
```

**Cause:** A previous restore did not complete or was interrupted.

**Solution:**
1. Check if another restore is actually running:
   ```bash
   cat ./backups/.restore.lock
   ```
2. If no restore is running, remove the lock:
   ```bash
   rm ./backups/.restore.lock
   ```

### Problem: "Checksum mismatch" Error

**Symptoms:**
```
ERROR: Checksum mismatch!
  Expected: abc123...
  Actual:   xyz789...
```

**Cause:** The backup file was corrupted or modified.

**Solution:**
1. **Do NOT use this backup** - it may be corrupted.
2. Try an older backup file.
3. Create a fresh backup if possible.

### Problem: "Connection refused" Error

**Symptoms:**
```
ERROR: Database connection failed
Host: localhost:5433
```

**Cause:** PostgreSQL is not running.

**Solution:**
1. Start the database:
   ```bash
   docker-compose up -d
   ```
2. Wait 10 seconds for startup.
3. Retry the backup/restore.

### Problem: "Permission denied" Error

**Symptoms:**
```
ERROR: Permission denied: ./backups/kb-backup-xxx.sql.gz
```

**Cause:** File permissions are too restrictive.

**Solution:**
```bash
# Check current permissions
ls -la ./backups/

# Fix permissions (owner read/write only)
chmod 0600 ./backups/kb-backup-*.sql.gz
```

### Problem: "Insufficient disk space" Error

**Symptoms:**
```
ERROR: Insufficient disk space for restore
Need at least X bytes, have Y
```

**Cause:** Not enough free space for the restore operation.

**Solution:**
1. Check available space:
   ```bash
   df -h .
   ```
2. Free up space by removing old files.
3. Alternatively, use a different backup location:
   ```bash
   export KB_BACKUP_LOCAL_PATH=/path/with/more/space
   ```

---

## 7. Rollback Procedure

If a restore fails partway through:

### 7.1 Database in Unknown State

1. **Do NOT attempt to use the database** - it may be partially restored.

2. Try restoring again with a fresh backup:
   ```bash
   ./scripts/restore-kb.sh --backup-file=<different-backup> --force
   ```

3. If that fails, manually reset the database:
   ```bash
   # Connect to postgres (not the knowledge base)
   psql -h localhost -p 5433 -U kbuser -d postgres

   # Drop the corrupted database
   DROP DATABASE IF EXISTS knowledgebase;

   # Recreate it
   CREATE DATABASE knowledgebase;

   # Exit psql
   \q
   ```

4. Then run the restore again.

### 7.2 Restore from Older Backup

If the most recent backup is corrupted:

1. List all backups:
   ```bash
   ls -lt ./backups/kb-backup-*.sql.gz
   ```

2. Validate older backups:
   ```bash
   ./scripts/validate-backup.sh --backup-file=./backups/kb-backup-<older>.sql.gz
   ```

3. Restore from the oldest valid backup.

---

## 8. Version Compatibility

### Schema Versions

| Schema Version | Date | Compatible With |
|----------------|------|-----------------|
| 1.0.0 | 2026-01 | All KNOW-001+ backups |

### Restoring Older Backups

If the backup schema version doesn't match the current database schema:

1. The restore script will warn you:
   ```
   WARNING: Schema version mismatch
   Backup: 1.0.0, Current: 1.1.0
   ```

2. You have two options:
   - **Restore anyway** and manually run migrations
   - **Use a newer backup** that matches the current schema

3. For migration guidance, contact the development team.

---

## 9. Contact Information

### Escalation Path

1. **First:** Try the troubleshooting section above
2. **Then:** Contact the on-call engineer
3. **Finally:** Escalate to the platform team

### Resources

- [Knowledge Base README](../README.md)
- [Backup Sizing Guide](./BACKUP-SIZING.md)
- [DR Drill Procedure](./DR-DRILL-PROCEDURE.md)

---

## 10. Runbook Validation

This runbook was tested and validated by:

| Date | Tester | Role | Restore Time | Result |
|------|--------|------|--------------|--------|
| 2026-01-25 | [To be completed] | PM/QA | [To be completed] | [To be completed] |

**Validation Requirement:** This runbook must be tested by a non-developer (PM or QA) following the steps without assistance. Update the table above when validated.
