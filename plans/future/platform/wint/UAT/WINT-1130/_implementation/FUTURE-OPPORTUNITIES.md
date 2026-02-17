# Future Opportunities - WINT-1130

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No auto-cleanup of orphaned worktrees based on age threshold | Low | Medium | Add background job to mark worktrees as abandoned if createdAt > 7 days and status still active. Requires session timeout detection (deferred). |
| 2 | No conflict detection UI for parallel worktree usage | Low | High | Add UI indicator when story has active worktree in different session. Requires frontend integration (deferred to WINT-1160). |
| 3 | No validation for worktreePath length (could exceed DB limits) | Low | Low | Add `.max(500)` constraint to WorktreeRegisterInputSchema for worktreePath field. Consider in code review. |
| 4 | No metadata schema validation (JSONB is free-form) | Low | Low | Document expected metadata keys in JSDoc. Consider Zod refinement for metadata field in future if specific keys become required. |
| 5 | No index on worktreePath for fast lookup by path | Low | Low | Add `CREATE INDEX idx_worktrees_path ON wint.worktrees(worktree_path)` if path-based queries become common. Monitor query performance first. |
| 6 | No audit log for status transitions (active→merged, active→abandoned) | Low | Medium | Add state transition event to telemetry.state_transitions table (requires WINT-3100 completion). |
| 7 | No soft delete support (hard delete via FK cascade only) | Low | Medium | Consider adding deletedAt timestamp if worktree history needs to be preserved beyond FK cascade. Requires use case validation. |
| 8 | Pagination only supports offset-based paging (no cursor-based) | Low | Low | Cursor-based pagination more efficient for large datasets. Consider if worktree count exceeds 10K active records. |
| 9 | No batch operations (register multiple worktrees, mark multiple complete) | Low | Medium | Add worktree_register_batch and worktree_mark_complete_batch tools. Deferred to WINT-1170 (Batch Processing). |
| 10 | No search/filter by branchName pattern (e.g., all feature/* branches) | Low | Low | Add WorktreeListActiveInputSchema filter field with pattern matching. Consider if use case emerges. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Dashboard visualization of worktree lifecycle metrics | Medium | High | Create telemetry dashboard showing: active worktree count, avg time-to-merge, abandonment rate, top stories by worktree count. Requires telemetry integration (Phase 3). |
| 2 | Slack/Discord notification when worktree becomes orphaned | Low | Medium | Integrate with notification service to alert team when worktree active >3 days. Useful for multi-agent coordination. |
| 3 | Git integration to verify worktreePath exists before registration | Medium | Medium | Add pre-registration check: `fs.existsSync(worktreePath)` to prevent phantom worktrees. Trade-off: adds filesystem dependency. |
| 4 | Auto-populate metadata from git (commit count, last commit date, author) | Low | Medium | Enhance worktree_register to run `git log` on worktreePath and populate metadata.git_stats. Useful for analytics. |
| 5 | PR number linking (store prNumber field instead of metadata) | Low | Low | Add explicit prNumber column to worktrees table. Makes queries easier than JSONB metadata extraction. Consider if GitHub integration becomes standard. |
| 6 | Worktree health check (detect stale branches, uncommitted changes) | Medium | High | Create worktree_health_check tool that runs git status/diff on all active worktrees. Useful for batch cleanup. Requires git access. |
| 7 | Session-to-worktree linking (FK to sessions table) | Medium | Low | Add sessionId UUID column with FK to sessions table from WINT-0110. Enables session cleanup to cascade to worktrees. Logical enhancement. |
| 8 | Worktree conflict resolution wizard (UI flow for takeover decision) | Medium | High | When conflict detected (story has active worktree), show UI with options: (1) switch, (2) takeover, (3) abort. Requires HiTL sidecar integration (Phase 5). |
| 9 | Export worktree data to CSV/JSON for external analysis | Low | Low | Add worktree_export tool with format parameter. Useful for PM reports and external BI tools. |
| 10 | Worktree reuse detection (prevent re-registering same path) | Low | Medium | Add unique constraint on worktreePath to prevent accidental duplicate registration. Trade-off: prevents legitimate reuse of cleaned-up paths. |

## Categories

### Edge Cases
- Orphaned worktree auto-cleanup (Gap #1)
- Path length validation (Gap #3)
- Soft delete support (Gap #7)
- Cursor-based pagination (Gap #8)

### UX Polish
- Conflict detection UI (Gap #2)
- Dashboard visualization (Enhancement #1)
- Slack/Discord notifications (Enhancement #2)
- Conflict resolution wizard (Enhancement #8)

### Performance
- Index on worktreePath (Gap #5)
- Cursor-based pagination for large datasets (Gap #8)

### Observability
- Audit log for status transitions (Gap #6)
- Dashboard metrics (Enhancement #1)
- Worktree health check (Enhancement #6)

### Integrations
- Git integration for path verification (Enhancement #3)
- Auto-populate git metadata (Enhancement #4)
- Session-to-worktree linking (Enhancement #7)
- Export to CSV/JSON (Enhancement #9)

### Data Quality
- Metadata schema validation (Gap #4)
- PR number linking (Enhancement #5)
- Worktree reuse detection (Enhancement #10)

---

## Implementation Notes for Future Stories

**High-Value Next Steps** (if resources available):
1. **Gap #3 (Path length validation)** - 5-minute fix, prevents edge case DB errors
2. **Enhancement #7 (Session-to-worktree linking)** - Logical data model extension, enables cascade cleanup
3. **Gap #6 (State transition audit log)** - Synergizes with WINT-3100 (State Transition Event Log)

**Defer Until Need Proven**:
- Batch operations (Gap #9) - wait for WINT-1170
- Dashboard (Enhancement #1) - wait for Phase 3 telemetry
- Conflict resolution wizard (Enhancement #8) - wait for Phase 5 HiTL sidecar

**Low Priority / Nice-to-Have**:
- Export tools (Enhancement #9)
- Notifications (Enhancement #2)
- Search filters (Gap #10)
