# Backup Validation Schedule - Knowledge Base MCP Server

> **Purpose:** Ensure backups remain restorable through periodic integrity checks
>
> **Audience:** Operations team, on-call engineers
>
> **Last Updated:** 2026-01-25

---

## Schedule Overview

| Activity | Frequency | When | Duration |
|----------|-----------|------|----------|
| Automated backup | Daily | 2:00 AM | ~5 min |
| Quick validation | Daily | After backup | ~1 min |
| Full validation | Monthly | 1st Friday, 9:00 AM | ~30 min |
| DR drill | Monthly | 2nd Friday, 10:00 AM | ~1 hour |

---

## 1. Daily Backup Validation

### Automated Check

After each daily backup, the backup script automatically verifies:
- [x] File created successfully
- [x] SHA-256 checksum generated
- [x] File permissions set correctly (0600)

### Manual Verification (Optional)

If you want to manually verify a backup:

```bash
cd apps/api/knowledge-base
./scripts/validate-backup.sh --backup-file=./backups/kb-backup-$(date +%Y%m%d)*.sql.gz --quick
```

---

## 2. Monthly Full Validation

### Schedule

- **When:** First Friday of each month at 9:00 AM local time
- **Duration:** ~30 minutes
- **Who:** On-call engineer or designated backup owner

### Calendar Reminders

Add these to your calendar:

| Month | Date (2026) |
|-------|-------------|
| February | Friday, Feb 6 |
| March | Friday, Mar 6 |
| April | Friday, Apr 3 |
| May | Friday, May 1 |
| June | Friday, Jun 5 |
| July | Friday, Jul 3 |
| August | Friday, Aug 7 |
| September | Friday, Sep 4 |
| October | Friday, Oct 2 |
| November | Friday, Nov 6 |
| December | Friday, Dec 4 |

### Procedure

1. **Navigate to the knowledge-base directory:**
   ```bash
   cd apps/api/knowledge-base
   ```

2. **Run the monthly validation script:**
   ```bash
   ./scripts/monthly-validate-all.sh
   ```

3. **Review the output:**
   - All backups should show `[PASS]`
   - Any `[FAIL]` requires immediate investigation

4. **Check the validation log:**
   ```bash
   cat ./backups/.validation-log | tail -50
   ```

5. **Document results:**
   - Update the validation log below
   - Report any failures to the team

---

## 3. Validation Log

Track monthly validation results here:

| Date | Validator | Backups Checked | Passed | Failed | Notes |
|------|-----------|-----------------|--------|--------|-------|
| 2026-01-25 | [Name] | [#] | [#] | [#] | Initial setup |
| | | | | | |
| | | | | | |

---

## 4. Handling Validation Failures

### If a Backup Fails Validation

1. **Do NOT delete the failed backup** - it may be needed for investigation.

2. **Investigate the failure:**
   ```bash
   ./scripts/validate-backup.sh --backup-file=./backups/<failed-backup> 2>&1 | tee validation-debug.log
   ```

3. **Common failure causes:**

   | Symptom | Likely Cause | Action |
   |---------|--------------|--------|
   | Checksum mismatch | Disk corruption or file modified | Delete and re-backup |
   | File not readable | Permissions changed | `chmod 0600 <file>` |
   | SQL syntax error | Incomplete backup | Delete and re-backup |
   | Dry-run restore fail | Schema incompatible | Check database version |

4. **If multiple backups fail:**
   - This may indicate storage issues (bad disk, filesystem corruption)
   - Escalate to platform team immediately
   - Do NOT run cleanup until investigation complete

5. **Document the failure:**
   - Add entry to validation log above
   - Create incident ticket if recurring

### Emergency: No Valid Backups

If monthly validation shows ALL backups failed:

1. **STOP** - Do not delete any backups
2. **Create a fresh backup immediately:**
   ```bash
   ./scripts/backup-kb.sh
   ```
3. **Validate the new backup:**
   ```bash
   ./scripts/validate-backup.sh --backup-file=./backups/kb-backup-<latest>.sql.gz
   ```
4. **If new backup also fails:**
   - Database may be corrupted
   - Escalate to development team
   - Consider restoring from off-site backup (if available)

---

## 5. Interpreting Validation Results

### Result Categories

| Result | Meaning | Action |
|--------|---------|--------|
| `[PASS]` | Backup is valid and restorable | None required |
| `[WARN]` | Minor issue (e.g., missing checksum) | Monitor, non-critical |
| `[FAIL]` | Backup cannot be restored | Investigate immediately |

### Validation Report Format

The `.validation-log` file contains:

```
========================================
MONTHLY VALIDATION - 2026-01-25
========================================
Period: Last 30 days
Mode: Full (with dry-run)

Backups validated: 30
Passed: 30
Failed: 0

Next validation due: First Friday of 2026-02
========================================
```

### Metrics to Track

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Pass rate | 100% | 95-99% | <95% |
| Validation duration | <30 min | 30-60 min | >60 min |
| Failed backups | 0 | 1-2 | 3+ |

---

## 6. Automation (Future)

### Planned Improvements

- [ ] Automated monthly validation via cron/scheduler
- [ ] Slack/email alerts for validation failures
- [ ] Integration with monitoring dashboard
- [ ] Automated ticket creation for failures

### Manual Cron Setup (Optional)

To automate monthly validation:

```bash
# Edit crontab
crontab -e

# Add line (runs 1st Friday of each month at 9:00 AM)
# Note: This runs every Friday on days 1-7, which catches the first Friday
0 9 1-7 * 5 cd /path/to/apps/api/knowledge-base && ./scripts/monthly-validate-all.sh >> ./backups/.validation-cron.log 2>&1
```

---

## 7. Related Documentation

- [Disaster Recovery Runbook](./DISASTER-RECOVERY-RUNBOOK.md)
- [Backup Sizing Guide](./BACKUP-SIZING.md)
- [DR Drill Procedure](./DR-DRILL-PROCEDURE.md)
