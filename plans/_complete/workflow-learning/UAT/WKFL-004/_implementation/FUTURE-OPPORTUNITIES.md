# Future Opportunities - WKFL-004

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Post-gate interactive prompt | Medium | Medium | After `/qa-gate` completes, prompt user to provide feedback on findings interactively. Improves capture rate vs. post-hoc manual commands. Story references this as "Optional" (lines 486-494). Defer to WKFL-004-A enhancement story. |
| 2 | Bulk feedback mode | Low | Low | Support `--file feedback.yaml` to capture multiple findings at once. Useful for batch processing after reviewing many findings. Defer to future enhancement. |
| 3 | Feedback editing/deletion | Low | Medium | Allow users to update or delete previously captured feedback. Adds complexity with audit trail concerns. Append-only model is safer for MVP. Defer to future story if user demand arises. |
| 4 | User attribution | Low | Low | Track who provided feedback (e.g., via git user). Story currently recommends anonymous for MVP to encourage honesty. Could add as optional flag `--attribute` in future. |
| 5 | Finding ID collision handling | Low | Low | If same finding ID appears across multiple stories, command currently scopes by story context. Could add explicit conflict resolution UX if edge case arises frequently. Monitor in practice. |
| 6 | Duplicate feedback detection | Low | Low | Command allows duplicate feedback on same finding (user may change mind). Could add `--replace` flag or warning message if duplicate detected. Monitor if users request this. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Feedback summary command | Medium | Low | Add `/feedback-stats` command to show feedback summary (e.g., "15 false positives for security agent this month"). Helps visualize impact before WKFL-002 calibration runs. Defer to WKFL-004-B enhancement story. |
| 2 | Feedback export | Low | Low | Export feedback to CSV/JSON for external analysis. Useful for sharing with team or importing into analytics tools. Defer to future if users request. |
| 3 | Feedback confidence scoring | Medium | Medium | Allow users to rate confidence in their feedback (e.g., "I'm 80% sure this is false positive"). Adds nuance for calibration. Defer to WKFL-002 integration story. |
| 4 | Rich text notes | Low | Medium | Support markdown in feedback notes for better formatting (code snippets, links). Current implementation stores plain text. Enhance if users request. |
| 5 | Feedback templates | Low | Medium | Pre-populate feedback notes with common patterns (e.g., "This pattern is allowed per ADR-XXX"). Could integrate with KB to suggest relevant context. Defer to future UX enhancement. |
| 6 | Slack/Discord integration | Low | High | Post feedback to team chat for visibility and discussion. Useful for team learning. Defer to future integration story (requires webhook setup). |
| 7 | Feedback gamification | Low | Medium | Track feedback contribution metrics (e.g., "You've provided 50 feedback items!"). May increase engagement. Defer to future if adoption is low. |
| 8 | Finding similarity detection | Medium | High | When user provides feedback on finding X, suggest similar findings from other stories that may have same feedback type. Requires embedding similarity. Defer to WKFL-006 pattern mining integration. |

## Categories

### Edge Cases
- Finding ID not in current VERIFICATION.yaml but user wants to reference different story
- VERIFICATION.yaml malformed or missing findings section
- Very long feedback notes (>10k chars) - current implementation accepts up to reasonable limit
- Special characters in notes (quotes, newlines) - properly escaped in current design

### UX Polish
- Post-gate interactive prompt (deferred to enhancement)
- Feedback summary/stats commands (deferred)
- Rich text markdown support (deferred)
- Feedback templates with KB integration (deferred)

### Performance
- No performance concerns for MVP (one feedback at a time, small YAML files, tag queries are indexed)
- Bulk operations may need batching in future (deferred)

### Observability
- Feedback capture rate tracking (how many findings get feedback vs. ignored)
- Feedback quality metrics (usefulness of feedback for calibration)
- Agent-specific feedback trends (which agents get most false positives)
- All deferred to WKFL-002 calibration analytics

### Integrations
- WKFL-002: Calibration agent will query feedback for ground truth data
- WKFL-003: Heuristic evolution will analyze false positive patterns
- WKFL-006: Pattern mining could cluster similar feedback across stories
- Slack/Discord: Team notification integration (future enhancement)

---

## Open Questions Addressed

Story includes 7 Open Questions (lines 563-586). All are marked as recommendations for PM to confirm, not blockers:

1. **Finding ID Uniqueness**: Recommendation is to scope by story_id in tags. ✅ Addressed
2. **Multiple Feedback**: Recommendation is to allow (append-only). ✅ Addressed
3. **Bulk Feedback**: Recommendation is to defer to future enhancement. ✅ Addressed
4. **Post-Gate Integration**: Recommendation is to defer to future enhancement. ✅ Addressed
5. **Feedback Editing**: Recommendation is append-only for MVP. ✅ Addressed
6. **Anonymous vs Attributed**: Recommendation is anonymous for MVP. ✅ Addressed
7. **VERIFICATION.yaml Location**: Recommendation is to support explicit `--story` flag as fallback. ✅ Addressed

All recommendations are sensible and properly scoped for MVP vs. future work.

---

## Implementation Notes for Future Stories

### WKFL-004-A: Post-Gate Interactive Prompt
**Scope:** Add optional prompt after `/qa-gate` completes to capture feedback interactively.

**Integration Point:** `qa-verify-completion-leader.agent.md` after gate decision finalized.

**UX Flow:**
```
Gate complete. Any feedback on findings?

[SEC-042] No Zod validation (high) - false positive? helpful?
[ARCH-015] API boundary issue (medium) - false positive? helpful?

Type finding ID to give feedback, or press Enter to skip.
> SEC-042
Feedback type? [false-positive/helpful/missing/severity-wrong]
> false-positive
Reason (optional):
> This is intentional behavior for admin users

✓ Feedback captured for SEC-042

More feedback? (y/n)
> n
```

**Effort:** ~10k tokens (prompt logic, interactive flow, integration with existing `/feedback` command)

### WKFL-004-B: Feedback Stats Command
**Scope:** Add `/feedback-stats` command to summarize feedback data.

**Output:**
```
Feedback Summary (Last 30 Days)

Total Feedback: 42 entries

By Type:
  False Positives: 18 (43%)
  Helpful:         15 (36%)
  Missing:          6 (14%)
  Severity Wrong:   3 (7%)

By Agent:
  code-review-security:      15 entries (10 false positives)
  code-review-architecture:  12 entries (5 false positives)
  qa-verify-completion:       8 entries (2 false positives)

Top Stories with Feedback:
  WISH-2045: 8 entries
  WKFL-004:  5 entries
  KNOW-001:  4 entries
```

**Integration:** Queries KB with `kb_search({tags: ['feedback']})` and aggregates results.

**Effort:** ~8k tokens (query logic, aggregation, formatted output)

---

**All future opportunities are valuable but intentionally deferred to keep WKFL-004 focused on core feedback capture capability.**
