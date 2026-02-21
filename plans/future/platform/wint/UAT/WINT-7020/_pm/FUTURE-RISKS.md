# Future Risks: WINT-7020 — Create Agent Migration Plan

## Non-MVP Risks

### Risk 1: Migration plan staleness if WINT-7030 is delayed

- **Risk**: If WINT-7030 begins weeks/months after WINT-7020 completes, agent inventory may have shifted (new agents added, agents modified) making MIGRATION-PLAN.md outdated.
- **Impact (if not addressed post-MVP)**: WINT-7030-7090 developers would work from a stale plan, potentially missing newly added swim-lane references or including already-deprecated agents.
- **Recommended timeline**: WINT-7030 should begin within 2 weeks of WINT-7020 UAT. If delayed >1 month, a quick re-scan of `.claude/agents/` for new swim-lane references should precede WINT-7030 implementation.

### Risk 2: Batch sizing may need adjustment after initial scan

- **Risk**: The 5-7 batch definition is based on the WINT-7010 audit data. During WINT-7020 implementation, the actual substantive-vs-incidental classification may reduce the migrateable agent count significantly, making 5-7 batches too many.
- **Impact (if not addressed post-MVP)**: WINT-7030-7090 may execute trivially small batches, wasting story overhead.
- **Recommended timeline**: Address during WINT-7030 elaboration if batch sizes turn out to be small. BATCH-SCHEDULE.yaml can be amended before WINT-7031 if needed.

### Risk 3: BATCH-SCHEDULE.yaml story IDs may conflict with pre-existing backlog entries

- **Risk**: The BATCH-SCHEDULE.yaml will propose story IDs for WINT-7030 through WINT-7090. If those story IDs are already allocated in the index with different scope, there would be a naming collision.
- **Impact**: Story generation for WINT-7030-7090 would need to resolve conflicts.
- **Recommended timeline**: Review stories.index.md during WINT-7020 implementation to confirm WINT-7030-7090 IDs are available/pending with matching scope.

---

## Scope Tightening Suggestions

- **Incidental reference categorization**: If the scan reveals many agents with only comment-level swim-lane mentions (not functional), consider tightening the definition of "requires migration" to exclude pure comment references. Document in MIGRATION-PLAN.md scope section.
- **Orphaned agent review**: Rather than classifying all 41 orphaned agents individually, the developer may choose to classify by agent-name prefix patterns (e.g., all `audit-*` orphans → deprecate-before-migrate). This is acceptable if documented with rationale.

---

## Future Requirements

- **WINT-7020 amendment process**: If WINT-7030 execution reveals that the MIGRATION-PLAN.md scope was incorrect (e.g., an agent was wrongly classified as incidental when it had substantive logic), define a lightweight amendment process (update MIGRATION-PLAN.md and BATCH-SCHEDULE.yaml without a new story).
- **Post-migration validation story (WINT-7110)**: Run full workflow test suite using only DB queries — already planned in the WINT roadmap.
