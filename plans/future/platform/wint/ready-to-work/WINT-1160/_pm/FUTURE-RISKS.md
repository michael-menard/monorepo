# Future Risks: WINT-1160 — Add Parallel Work Conflict Prevention

## Non-MVP Risks

### Risk 1: Orphaned Worktree Auto-Cleanup

**Risk**: The "untracked" flag in `/wt:status` identifies potential orphan worktrees but does not clean them up. Over time, orphaned worktrees may accumulate and consume disk space.

**Impact (if not addressed post-MVP)**: Disk space consumption on developer machines; orphan worktrees may confuse future conflict detection.

**Recommended timeline**: Future story (post-WINT-1160, pre-WINT-1170) — auto-cleanup as an optional flag on `/wt:status` or a separate `/wt:clean-orphans` skill.

---

### Risk 2: worktreePath Path Normalization Drift

**Risk**: As worktrees are created on different OS platforms (macOS, Linux, Windows WSL), path formats may diverge, causing cross-reference matching failures in `/wt:status` AC-8.

**Impact (if not addressed post-MVP)**: All worktrees may appear "untracked" on one platform, degrading the usefulness of the associations section.

**Recommended timeline**: Validate during WINT-1170 batch worktree work. Add normalization utility function if cross-platform issues are discovered.

---

### Risk 3: Conflict Detection Coverage for --skip-worktree Sessions

**Risk**: Sessions that used `--skip-worktree` bypass the `worktree_register` call. These sessions will never appear in the DB, so conflict detection cannot protect them.

**Impact (if not addressed post-MVP)**: Two developers could both use `--skip-worktree` and work on the same story with no conflict warning.

**Recommended timeline**: Document known limitation in the spec. Consider a warning when `--skip-worktree` is used that notes: "conflict detection is bypassed."

---

## Scope Tightening Suggestions

- The "age" calculation format in the Story Associations table is not pinned (relative time vs ISO delta). Future stories should standardize this across all CLI output.
- The confirmation token for the secondary take-over confirmation ("abandon") should be evaluated for UX. A single word is efficient but may be missed in noisy terminal output.

## Future Requirements

- `/wt:status --story WINT-XXXX` filter to show only worktrees for a specific story
- `/wt:status --orphans` to show only untracked (orphan) worktrees
- Automatic worktree age warnings (e.g., "WARNING: This worktree is 14 days old — consider cleaning up")
- Integration with WINT-1170 batch-coordinator to show batch worktree status
