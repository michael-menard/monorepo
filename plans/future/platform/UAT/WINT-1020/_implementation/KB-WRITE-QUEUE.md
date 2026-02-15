# Knowledge Base Write Queue - WINT-1020

**Generated**: 2026-02-14
**Story**: WINT-1020 - Flatten Story Directories
**Status**: Pending KB writes
**Total Entries**: 14

---

## Overview

All 14 non-blocking findings from FUTURE-OPPORTUNITIES.md are queued for Knowledge Base persistence. These represent future enhancement opportunities that were intentionally excluded from MVP scope to keep the story focused on core migration functionality.

---

## KB Entry Queue

### 1. Performance: Large Epic Optimization
**Category**: performance
**Impact**: Low | **Effort**: Medium
**Tags**: `performance`, `optimization`, `future-work`

**Finding**: No performance optimization for large epics (100+ stories)

**Content**:
```
Current migration script processes stories sequentially, which works fine for
typical epics (10-20 stories) but may be slow for large epics (100+ stories).

Recommendation: WINT-1020.1
- Add parallel processing with Promise.all() for independent stories
- Add progress bar for real-time feedback
- Implement incremental migration with checkpoints for pause/resume
- Consider streaming operations to reduce memory footprint

Impact: Low (most epics have <50 stories)
Effort: Medium (requires refactoring to async/parallel model)
```

---

### 2. Edge Cases: Symlink/Hardlink Handling
**Category**: edge-cases
**Impact**: Low | **Effort**: Low
**Tags**: `edge-case`, `future-work`

**Finding**: Symlink/hardlink edge cases not thoroughly handled

**Content**:
```
Current migration script uses fs.rename() which works for regular files and
directories but may behave unexpectedly with symlinks or hardlinks.

Recommendation: WINT-1020.2
- Add symlink detection (fs.lstat) before moving directories
- Log warnings when symlinks are encountered
- Test migration with symlinked story artifacts
- Document symlink behavior in migration runbook

Impact: Low (symlinks rarely used in story directories)
Effort: Low (add detection + logging, minimal code change)
```

---

### 3. Observability: Git History Tracking
**Category**: observability
**Impact**: Low | **Effort**: Low
**Tags**: `observability`, `documentation`, `future-work`

**Finding**: Git history tracking obscured by migration commit

**Content**:
```
Migration creates a large commit that moves all stories to flat structure.
This makes it harder to track individual file history using 'git blame' or
'git log' without --follow flag.

Recommendation:
- Document 'git log --follow <file>' usage in migration runbook
- Add migration commit message with explicit note about --follow requirement
- Consider separate commits per epic for more granular history

Impact: Low (git --follow solves this, just needs documentation)
Effort: Low (documentation only)
```

---

### 4. Edge Cases: Concurrent Story Creation
**Category**: edge-cases
**Impact**: Low | **Effort**: Medium
**Tags**: `edge-case`, `future-work`, `wint-1030`

**Finding**: Concurrent story creation during migration could cause conflicts

**Content**:
```
If a new story is created (via /story-create) while migration is running,
it could create race conditions or directory conflicts.

Recommendation:
- Add file lock or migration-in-progress flag during migration
- Check lock before allowing story creation/moves
- This will be naturally resolved by WINT-1030 (DB-driven workflow)

Impact: Low (migration is one-time operation, unlikely to overlap with story creation)
Effort: Medium (requires locking mechanism)
Note: Defer to WINT-1030 - DB transactions will prevent this issue
```

---

### 5. Observability: File Timestamp Preservation
**Category**: observability
**Impact**: Low | **Effort**: Low
**Tags**: `observability`, `data-integrity`, `future-work`

**Finding**: File timestamps not explicitly preserved

**Content**:
```
Migration uses fs.rename() which generally preserves timestamps, but this is
not guaranteed across all filesystems and OS combinations.

Recommendation: WINT-1020.3
- Use fs.utimes() after move to explicitly preserve mtime/atime
- Log original and new timestamps in migration log
- Add validation step that checks timestamp preservation

Impact: Low (timestamps are metadata, not critical data)
Effort: Low (add fs.stat + fs.utimes calls)
```

---

### 6. Testing: Automated Integration Test Suite
**Category**: testing
**Impact**: Medium | **Effort**: Medium
**Tags**: `testing`, `automation`, `ci-cd`, `future-work`

**Finding**: No automated integration test suite

**Content**:
```
Test plan includes 14 manual tests, which is appropriate for MVP but does not
provide automated regression protection for future changes.

Recommendation: WINT-1020.7
- Create Vitest-based test suite in packages/backend/orchestrator/src/__tests__/
- Generate temp test epics with known structure
- Run migration script programmatically
- Validate outcomes (file locations, frontmatter, status fields)
- Run in CI on every PR touching migration code

Impact: Medium (prevents regressions, improves confidence)
Effort: Medium (requires test fixtures, setup/teardown logic)
```

---

### 7. UX Polish: HTML Migration Report
**Category**: ux-polish
**Impact**: Medium | **Effort**: Medium
**Tags**: `ux-polish`, `reporting`, `future-work`

**Finding**: HTML migration report would improve transparency

**Content**:
```
Current migration outputs JSON logs (migration-plan.json, migration-log.json)
which are developer-friendly but not accessible to non-technical reviewers.

Recommendation: WINT-1020.4
- Generate HTML report with migration summary
- Show duplicate resolution decisions (which lifecycle directory was chosen)
- Include before/after directory tree visualization
- Highlight warnings and errors in colored sections

Impact: Medium (improves stakeholder visibility into migration)
Effort: Medium (requires HTML templating, visualization logic)
```

---

### 8. UX Polish: Progressive Migration with Checkpoints
**Category**: ux-polish
**Impact**: Low | **Effort**: High
**Tags**: `ux-polish`, `performance`, `enterprise`, `future-work`

**Finding**: Progressive migration with checkpoint support

**Content**:
```
Current migration is all-or-nothing per epic. For very large migrations
(enterprise scale with 1000+ stories), pause/resume capability would be useful.

Recommendation: WINT-1020.5
- Add checkpoint mechanism that saves state after each epic
- Allow --resume flag to continue from last checkpoint
- Store checkpoint state in .migration-checkpoint.json

Impact: Low (current scale doesn't require this)
Effort: High (requires checkpoint state management, resume logic)
Note: Enterprise feature, not needed for current scale
```

---

### 9. UX Polish: Dry-Run Diff Visualization
**Category**: ux-polish
**Impact**: Medium | **Effort**: Medium
**Tags**: `ux-polish`, `visualization`, `future-work`

**Finding**: Dry-run diff visualization

**Content**:
```
Dry-run mode outputs migration-plan.json but no visual diff showing
before/after directory structure.

Recommendation: WINT-1020.6
- Generate side-by-side diff showing old vs new directory tree
- Use ASCII tree format or HTML with collapse/expand
- Highlight moved directories in color
- Include summary stats (files moved, stories migrated, duplicates resolved)

Impact: Medium (helps non-technical reviewers understand migration impact)
Effort: Medium (requires tree diffing logic, formatting)
```

---

### 10. UX Polish: Colored Console Output
**Category**: ux-polish
**Impact**: Low | **Effort**: Low
**Tags**: `ux-polish`, `cli`, `future-work`

**Finding**: Colored console output for better UX

**Content**:
```
Current migration outputs plain text logs. Colored output would improve
readability and make warnings/errors more visible.

Recommendation: WINT-1020.8
- Add chalk or picocolors dependency
- Use green for success messages
- Use yellow for warnings (duplicates, missing frontmatter)
- Use red for errors (validation failures, collisions)

Impact: Low (cosmetic improvement)
Effort: Low (add dependency, wrap console.log calls)
```

---

### 11. UX Polish: Interactive Confirmation Prompt
**Category**: ux-polish
**Impact**: Low | **Effort**: Low
**Tags**: `ux-polish`, `safety`, `future-work`

**Finding**: Interactive confirmation prompt

**Content**:
```
Migration script executes immediately with --execute flag. Adding a confirmation
prompt would prevent accidental executions.

Recommendation: WINT-1020.9
- Add "Are you sure?" prompt before executing migration
- Show summary (epic count, story count, estimated time)
- Require explicit "yes" (not just Enter)
- Allow --force flag to skip prompt for CI/automation

Impact: Low (safety improvement)
Effort: Low (use readline or prompts package)
```

---

### 12. Integrations: Email/Slack Notification
**Category**: integrations
**Impact**: Low | **Effort**: Medium
**Tags**: `integration`, `notifications`, `enterprise`, `future-work`

**Finding**: Email/Slack notification on completion

**Content**:
```
Long-running migrations (30+ minutes) would benefit from async notifications
when complete.

Recommendation: WINT-1020.10
- Integrate with notification service (SendGrid, Slack webhook)
- Send notification on migration completion/failure
- Include summary stats (stories migrated, time elapsed, errors)

Impact: Low (not needed for current scale)
Effort: Medium (requires notification service setup)
Note: Enterprise feature for async operations
```

---

### 13. Observability: Migration Metrics and Analytics
**Category**: observability
**Impact**: Low | **Effort**: Medium
**Tags**: `observability`, `metrics`, `analytics`, `future-work`

**Finding**: Migration metrics and analytics

**Content**:
```
Tracking migration metrics over time would help identify patterns and optimize
future migrations.

Recommendation:
- Track migration duration per epic
- Track success rate (% of stories migrated without errors)
- Track common failure patterns (malformed YAML, missing files, etc.)
- Store metrics in structured format for analysis

Impact: Low (nice-to-have for continuous improvement)
Effort: Medium (requires metrics collection, storage, analysis)
```

---

### 14. Reliability: Automated Rollback on Partial Failure
**Category**: reliability
**Impact**: Medium | **Effort**: Medium
**Tags**: `reliability`, `automation`, `safety`, `future-work`

**Finding**: Automated rollback on partial failure

**Content**:
```
Current migration requires manual rollback (extract backup tarball) if
mid-migration failure occurs.

Recommendation:
- Detect failures automatically during migration
- Trigger rollback without manual intervention
- Log rollback actions for audit trail
- Verify post-rollback state matches pre-migration state

Impact: Medium (improves reliability and reduces manual intervention)
Effort: Medium (requires failure detection, automated rollback logic)
```

---

## Execution Instructions

Each KB entry above should be written using the `kb-writer` agent with:

```yaml
entry_type: finding
source_stage: elab
story_id: WINT-1020
category: <category from entry>
content: <content from entry>
additional_tags: <tags from entry>
```

After KB writes complete, update `_implementation/DECISIONS.yaml` with `kb_entry_id` values.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Performance | 1 |
| Edge Cases | 2 |
| Observability | 3 |
| Testing | 1 |
| UX Polish | 5 |
| Integrations | 1 |
| Reliability | 1 |
| **TOTAL** | **14** |

| Impact Level | Count |
|--------------|-------|
| Low | 11 |
| Medium | 3 |
| High | 0 |

| Effort Level | Count |
|--------------|-------|
| Low | 7 |
| Medium | 6 |
| High | 1 |

---

## Next Actions

1. **Orchestrator**: Spawn `kb-writer` for each of the 14 entries above
2. **Record IDs**: Update DECISIONS.yaml with returned `kb_entry_id` values
3. **Move Story**: Transition WINT-1020 from `elaboration` to `ready-to-work`
4. **Future Reference**: These KB entries can be promoted to stories during backlog grooming
