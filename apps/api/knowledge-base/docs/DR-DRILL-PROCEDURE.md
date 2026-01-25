# Disaster Recovery Drill Procedure - Knowledge Base MCP Server

> **Purpose:** Validate DR procedures through simulated disaster scenarios
>
> **Audience:** Development team, QA, operations
>
> **Last Updated:** 2026-01-25

---

## Schedule Overview

| Activity | Frequency | When | Duration |
|----------|-----------|------|----------|
| DR Drill | Monthly | 2nd Friday, 10:00 AM | ~1 hour |

---

## 1. Drill Schedule

### Calendar (2026)

| Month | Date | Lead | Observer |
|-------|------|------|----------|
| February | Friday, Feb 13 | [TBD] | [TBD] |
| March | Friday, Mar 13 | [TBD] | [TBD] |
| April | Friday, Apr 10 | [TBD] | [TBD] |
| May | Friday, May 8 | [TBD] | [TBD] |
| June | Friday, Jun 12 | [TBD] | [TBD] |
| July | Friday, Jul 10 | [TBD] | [TBD] |
| August | Friday, Aug 14 | [TBD] | [TBD] |
| September | Friday, Sep 11 | [TBD] | [TBD] |
| October | Friday, Oct 9 | [TBD] | [TBD] |
| November | Friday, Nov 13 | [TBD] | [TBD] |
| December | Friday, Dec 11 | [TBD] | [TBD] |

**Role Rotation:** Rotate the lead role each month to ensure multiple team members are proficient.

---

## 2. Drill Roles

| Role | Responsibilities |
|------|-----------------|
| **Lead** | Execute the drill, follow runbook, make decisions |
| **Observer** | Time the drill, take notes, don't help unless critical |
| **Facilitator** | Announce scenarios, track progress, handle blockers |

**Requirements:**
- Lead should be someone who hasn't led in the last 2 months
- At least one observer should be non-technical (PM/QA)
- Facilitator is usually the most experienced team member

---

## 3. Pre-Drill Checklist

Complete these items **before** the scheduled drill:

### Environment Preparation

- [ ] Development environment is available
- [ ] Docker is running and healthy
- [ ] Knowledge base database has test data (50+ entries)
- [ ] At least one valid backup exists
- [ ] `.env` file is configured correctly

### Documentation Check

- [ ] Runbook is accessible: `docs/DISASTER-RECOVERY-RUNBOOK.md`
- [ ] Lead has NOT reviewed runbook in last 24 hours (simulates real scenario)
- [ ] Timer/stopwatch ready

### Communication

- [ ] Team notified of drill time
- [ ] Slack channel ready for drill communications
- [ ] Video call set up (if remote)

---

## 4. Drill Scenarios

Choose one scenario per drill, rotating through them:

### Scenario A: Complete Database Loss

**Situation:** The database has been accidentally dropped. All data is lost.

**Steps:**
1. Facilitator announces: "The knowledge base database has been dropped. You need to restore it."
2. Start timer.
3. Lead follows runbook to restore from latest backup.
4. Stop timer when Lead confirms data is restored.

**Success Criteria:**
- Database restored within 30 minutes
- Entry count matches backup
- Sample queries return expected data

### Scenario B: Corrupted Database

**Situation:** The database is corrupted and showing errors. Data is partially accessible.

**Steps:**
1. Facilitator announces: "The knowledge base is showing SQL errors. Some data appears corrupted."
2. Start timer.
3. Lead diagnoses the issue and decides to restore.
4. Lead follows runbook to restore from backup.
5. Stop timer when Lead confirms data is restored.

**Success Criteria:**
- Correct decision made within 10 minutes
- Restore completed within 30 minutes
- Corruption resolved

### Scenario C: Failed Restore

**Situation:** You need to restore, but the first backup you try is corrupted.

**Steps:**
1. (Pre-drill: Create a corrupted backup file)
2. Facilitator announces: "Restore from backup. Note: the most recent backup may have issues."
3. Start timer.
4. Lead attempts restore, encounters failure, troubleshoots.
5. Lead selects alternative backup and completes restore.
6. Stop timer.

**Success Criteria:**
- Corrupted backup identified within 10 minutes
- Alternative backup selected appropriately
- Restore completed within 45 minutes total

### Scenario D: Non-Technical Lead

**Situation:** Regular restore, but lead is PM or QA (non-developer).

**Steps:**
1. Non-technical team member is the Lead.
2. Facilitator announces: "Restore the database from the latest backup."
3. Start timer.
4. Lead follows runbook exactly.
5. Stop timer when complete.

**Success Criteria:**
- Runbook is clear enough for non-developer to follow
- Restore completed within 45 minutes
- Lead can verify success without dev assistance

---

## 5. Drill Execution

### During the Drill

1. **Facilitator announces scenario** (from Section 4)
2. **Start timer**
3. **Lead executes restore:**
   - Opens runbook
   - Follows steps
   - Documents any issues encountered
4. **Observer records:**
   - Time for each major step
   - Any deviations from runbook
   - Questions the Lead had
   - Places where Lead got stuck
5. **Stop timer** when Lead declares "Restore complete"
6. **Verify success:**
   ```bash
   psql -h localhost -p 5433 -U kbuser -d knowledgebase \
        -c "SELECT COUNT(*) FROM knowledge_entries;"
   ```

### Timer Checkpoints

Record time at these milestones:

| Milestone | Target | Actual |
|-----------|--------|--------|
| Runbook opened | 0:00 | |
| Backup file selected | 0:05 | |
| Pre-flight checks complete | 0:10 | |
| Restore started | 0:15 | |
| Restore complete | 0:25 | |
| Verification complete | 0:30 | |

---

## 6. Post-Drill Debrief

Immediately after the drill (15-20 minutes):

### Discussion Questions

1. What went well?
2. What was confusing in the runbook?
3. Where did the Lead get stuck?
4. What information was missing?
5. How could the tools be improved?

### Debrief Template

Copy this template for each drill:

```markdown
## DR Drill Debrief - [DATE]

### Participants
- Lead: [Name]
- Observer: [Name]
- Facilitator: [Name]

### Scenario
[Scenario A/B/C/D - brief description]

### Timing
- Total duration: [MM:SS]
- Target: 30:00
- Result: [PASS/FAIL]

### Issues Encountered
1. [Issue description]
   - Impact: [How it affected the drill]
   - Resolution: [How it was resolved]

2. [Issue description]
   ...

### Runbook Improvements Needed
- [ ] [Specific improvement]
- [ ] [Specific improvement]

### Tool Improvements Needed
- [ ] [Specific improvement]
- [ ] [Specific improvement]

### Lessons Learned
1. [Lesson]
2. [Lesson]

### Action Items
| Item | Owner | Due Date |
|------|-------|----------|
| [Action] | [Name] | [Date] |
```

---

## 7. Drill Log

Track all drills here:

| Date | Scenario | Lead | Duration | Result | Notes |
|------|----------|------|----------|--------|-------|
| 2026-01-25 | Initial | [TBD] | [TBD] | [TBD] | First drill |
| | | | | | |
| | | | | | |

---

## 8. Success Metrics

### Individual Drill

| Metric | Target | Acceptable | Needs Work |
|--------|--------|------------|------------|
| Total time | <30 min | 30-45 min | >45 min |
| Runbook deviations | 0 | 1-2 | 3+ |
| Lead questions | 0-2 | 3-5 | 6+ |
| Verification success | First try | Second try | Failed |

### Quarterly Summary

Track these metrics quarterly:

| Quarter | Drills | Avg Time | Pass Rate | Runbook Updates |
|---------|--------|----------|-----------|-----------------|
| Q1 2026 | 3 | [avg] | [%] | [count] |
| Q2 2026 | 3 | [avg] | [%] | [count] |

---

## 9. Drill Artifacts

### Files Created

After each drill, save these artifacts:

| Artifact | Location | Retention |
|----------|----------|-----------|
| Debrief notes | `./backups/.dr-drill-log` | Permanent |
| Timer log | Debrief document | Permanent |
| Screenshots | Team wiki | 6 months |

### Updating the Drill Log

After each drill:

```bash
# Append to drill log
cat >> ./backups/.dr-drill-log << EOF

========================================
DR DRILL - $(date '+%Y-%m-%d')
========================================
Scenario: [A/B/C/D]
Lead: [Name]
Duration: [MM:SS]
Result: [PASS/FAIL]
Issues: [Summary]
Actions: [Summary]
========================================
EOF
```

---

## 10. Related Documentation

- [Disaster Recovery Runbook](./DISASTER-RECOVERY-RUNBOOK.md)
- [Backup Validation Schedule](./BACKUP-VALIDATION-SCHEDULE.md)
- [Backup Sizing Guide](./BACKUP-SIZING.md)
