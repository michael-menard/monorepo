# Future Risks: WINT-1050

## Non-MVP Risks

### Risk 1: Concurrent update conflicts

- **Risk**: Two agents invoke `/story-update` on the same story simultaneously. DB write from one may interleave with frontmatter write from the other, producing inconsistent state.
- **Impact if not addressed post-MVP**: Story status in DB and frontmatter could diverge. WINT-1160 (Add Parallel Work Conflict Prevention) is the designated owner.
- **Recommended timeline**: Phase 1 (WINT-1160 is already in the backlog, target same phase)

### Risk 2: DB-only mode deferred

- **Risk**: Phase 1 retains the YAML frontmatter write for backward compatibility. This means every status update writes to both DB and FS, creating ongoing dual-write overhead.
- **Impact if not addressed post-MVP**: Dual-write overhead continues until Phase 7. Frontmatter can drift from DB if direct file edits occur outside the command.
- **Recommended timeline**: WINT-7030 (Phase 7 Migration) will remove the frontmatter write step.

### Risk 3: WINT-1070 index deprecation interaction

- **Risk**: If WINT-1070 (Deprecate stories.index.md) completes and changes the index to a generated file before WINT-1050 QA completes, the Step 4 index update behavior may differ.
- **Impact if not addressed post-MVP**: Non-blocking per seed — Step 4 is preserved regardless. Low risk.
- **Recommended timeline**: Verify during QA if WINT-1070 has landed.

### Risk 4: shimUpdateStoryStatus schema evolution

- **Risk**: The `StoryUpdateStatusInput` schema (`storyId`, `newState`, `triggeredBy`) could evolve after WINT-1050, potentially making the command's call syntax stale.
- **Impact if not addressed post-MVP**: Command spec would describe an outdated call signature.
- **Recommended timeline**: Monitor in WINT-7030 (Phase 7) when shim is removed and replaced with direct DB calls.

---

## Scope Tightening Suggestions

- The `--force` flag bypass (per the Status Transition Rules section) could interact with the DB write in unexpected ways. Consider whether `--force` should still attempt the DB write (current assumption: yes) or skip it. Defer to WINT-7030 for Phase 7 hardening.
- The `uat` status maps to DB state `in_qa` (not `uat`). This naming mismatch is inherited from SWIM_LANE_TO_STATE and the directory naming convention (`UAT/` directory). Document this in the mapping table to prevent future confusion.

---

## Future Requirements

- DB-only write mode (`--db-only` flag) to skip frontmatter update — deferred to WINT-7030
- Retry logic for transient DB failures (currently: null → WARNING → FS-only, no retry)
- Structured logging for all DB write attempts (for telemetry in WINT-3070)
- Eventual removal of `stories.index.md` Step 4 update after WINT-1070 stabilizes
