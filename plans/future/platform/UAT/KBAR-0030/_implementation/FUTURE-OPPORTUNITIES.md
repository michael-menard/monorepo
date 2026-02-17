# Future Opportunities - KBAR-0030

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No batch sync operations | Low | Medium | Deferred to KBAR-0040. Batch sync would improve performance for full repo syncs but not needed for MVP single-story workflow. |
| 2 | No automated sync triggers | Low | Medium | Deferred to KBAR-0060+. File watchers or cron jobs would enable automatic sync but manual sync is sufficient for MVP. |
| 3 | No conflict resolution UI | Low | High | Deferred to KBAR-0080+. Manual conflict resolution is acceptable for MVP. Conflicts logged to database with full metadata. |
| 4 | No MCP tool wrapper | Medium | Low | Deferred to KBAR-0050+. MCP tools would expose sync functions to agents but direct function calls work for MVP. |
| 5 | No CLI commands | Medium | Low | Deferred to KBAR-0050. CLI would enable human operators to trigger syncs but programmatic API is sufficient for MVP. |
| 6 | No artifact sync (non-story files) | Low | Medium | Deferred to KBAR-0040. PLAN.yaml, SCOPE.yaml, etc. sync would complete the artifact model but story sync alone unblocks core workflow. |
| 7 | No index regeneration | Low | Medium | Deferred to KBAR-0230. DB-driven index generation would keep index files in sync but manual index updates work for MVP. |
| 8 | No streaming for large files | Low | Low | Story mentions 5MB size limit and streaming for large files as risk mitigation but doesn't implement streaming. Add streaming in future if needed (unlikely for story YAML files). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Performance: Parallel sync operations | Medium | Low | Batch operations in KBAR-0040 could sync multiple stories in parallel using Promise.all() for faster full repo syncs. |
| 2 | Observability: Sync metrics dashboard | Low | Medium | Track sync duration, success rate, conflict rate over time. Add to telemetry stack in TELE-0010+. |
| 3 | UX: Dry-run mode | Low | Low | Add `dryRun: boolean` option to sync functions to preview changes without applying them. Useful for testing and validation. |
| 4 | Performance: Checksum caching | Low | Low | Cache checksums in memory to avoid recomputing for unchanged files. Minor optimization since SHA-256 is fast. |
| 5 | Edge Cases: Symlink handling | Low | Low | Story doesn't specify behavior for symlinks. Add explicit symlink detection and logging if encountered in future. |
| 6 | Edge Cases: Permission errors | Low | Low | Story handles filesystem errors generically. Add specific handling for EACCES/EPERM with actionable error messages. |
| 7 | Integrations: Git integration | Medium | High | Detect git status before sync (modified, staged, uncommitted). Warn if syncing uncommitted changes. Useful for preventing data loss. |
| 8 | Integrations: Webhook notifications | Low | Medium | Trigger webhook on sync events (success, conflict, failure). Useful for Slack/Discord notifications in automation scenarios. |

## Categories

- **Edge Cases**: Symlink handling, permission errors, large file streaming
- **UX Polish**: Dry-run mode, better error messages, git integration warnings
- **Performance**: Parallel batch syncs, checksum caching
- **Observability**: Sync metrics dashboard, webhook notifications
- **Integrations**: Git status detection, MCP tools (KBAR-0050), CLI (KBAR-0050), batch operations (KBAR-0040)
