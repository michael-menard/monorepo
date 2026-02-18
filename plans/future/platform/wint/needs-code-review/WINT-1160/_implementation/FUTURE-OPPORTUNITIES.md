# Future Opportunities - WINT-1160

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Auto-cleanup of orphaned DB records: SKILL.md detects [ORPHANED] records but provides no remediation path. Detection surfaces the problem; users must clean up manually. | Medium | Low | Defer to WINT-1170 or a future "worktree-cleanup" story. Per non-goals, remediation is explicitly out of scope (WINT-1130 QA non-blocking #1 acknowledged this). |
| 2 | EC-5 handling in TEST-PLAN.md uses `[CHECK-FAILED]` as an optional indicator but WINT-1160.md does not specify this indicator in the ACs. If the disk-check raises an unexpected error, the behavior is ambiguous (show record without indicator vs. show CHECK-FAILED). | Low | Low | Add a note in the SKILL.md implementation to handle disk-check errors by showing the record without any indicator (neutral fallback). Confirm this aligns with the intent during implementation. |
| 3 | No machine identity tracking in worktree records: if two machines both have an active worktree for the same story, `worktree_get_by_story` will detect the most recently registered one but cannot distinguish the machine. | Low | High | Deferred per non-goals ("No cross-machine session detection beyond what the DB provides"). Track for future enhancement if multi-machine usage grows. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Telemetry for conflict events: when option (b) take-over is selected and confirmed, log the conflict event to `telemetry.agent_invocations` or a conflict-specific table for trend analysis. | Medium | Low | Deferred to WINT-3020/WINT-3070 scope per non-goals. |
| 2 | `/wt:status` pagination: ECG-2 notes that 15+ active worktrees render all records, but with no truncation notice. For very large installations, a `limit` parameter or pagination hint in the skill output would improve readability. | Low | Low | Add pagination support or `worktree_list_active` `limit` parameter usage in a future enhancement story. |
| 3 | Re-present options after cancellation in take-over path: EC-4 states "options (a), (b), (c) are re-presented or abort message shown." Formalizing this as a re-prompt loop (rather than just an abort message) would improve the UX of the conflict resolution flow. | Low | Low | Track for WINT-1170 or a future UX polish story for the conflict handling flow. |
| 4 | Structured output for `/wt:status` DB section: the current spec defines a human-readable text format. A machine-parseable structured output block (similar to wt-new's `WORKTREE CREATED` block) would allow downstream orchestrators to consume the DB state programmatically. | Medium | Medium | Defer to a future story when automated conflict resolution (beyond warning + options) is needed. |
| 5 | `wt-status` version 2.0.0 description update (AC-8) is a minor frontmatter change. Consider whether the skill file version bump also needs a corresponding update to any SKILLS.md index or doc-sync output. | Low | Low | Confirm at implementation time whether doc-sync will pick this up automatically via WINT-0150/WINT-0160 infrastructure. |

## Categories

- **Edge Cases**: Items 2, 3 (disk-check ambiguity, machine identity)
- **UX Polish**: Items 3, 4 (re-prompt loop, structured output)
- **Observability**: Item 1 (conflict event telemetry)
- **Performance**: Item 2 (pagination for large worktree counts)
- **Integrations**: Items 4, 5 (structured output for automation, doc-sync version tracking)
