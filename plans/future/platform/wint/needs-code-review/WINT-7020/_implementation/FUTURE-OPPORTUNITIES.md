# Future Opportunities - WINT-7020

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | ORPHANED-AGENTS.yaml does not distinguish between "never referenced" vs "referenced only in archived agents" — some orphans may have had prior usage | Low | Low | During WINT-7020 implementation, cross-check each orphan against `_archive/` agent bodies. If an orphan is only referenced by a deprecated/archived agent, classify as archive-not-migrate with clear rationale. No new AC needed — current AC-4 rationale field is sufficient. |
| 2 | BATCH-SCHEDULE.yaml estimated points are placeholder at story creation time — actual effort per batch will become known during WINT-7030-7090 elaboration | Low | Low | Add a note in BATCH-SCHEDULE.yaml that point estimates are preliminary. Each batch story (WINT-7030-7090) will re-estimate during its own elaboration. Consider adding a `confidence: preliminary` field to each batch YAML entry. |
| 3 | The 3 skill files (token-log, token-report, wt-new) with swim-lane references are a small but distinct file type — their migration may require different tooling than agent files | Low | Low | Include skill files in the risk inventory with explicit classification. The skill migration pattern may differ from agent migration; note this in MIGRATION-PLAN.md for the developer implementing the relevant batch. |
| 4 | CROSS-REFERENCES.yaml was generated from frontmatter `spawned_by` fields only — dynamic spawns embedded in agent instructions (string literals in body text) may not be captured | Medium | Medium | During WINT-7020 implementation, perform a spot-check grep on the 41 swim-lane agents for inline spawn patterns. If undocumented spawn relationships are found, note them in the risk inventory. A future audit story could formalize dynamic spawn detection. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Migration progress tracking: MIGRATION-PLAN.md is a static document. As WINT-7030-7090 execute, there is no live progress view of which agents have been migrated | Medium | Low | Consider adding a MIGRATION-STATUS.yaml companion file (updated by each batch story completion) to track per-agent migration state. Could serve as input to a future `/migration-status` command. Defer to post-WINT-7020. |
| 2 | Rollback granularity: the compatibility shim provides batch-level rollback (all agents in a batch revert together via directory fallback). Per-agent rollback is not possible with the current shim design | Medium | High | The current shim design is sufficient for Phase 7. Per-agent rollback is an over-engineering concern at this stage. If a batch introduces a regression, reverting the entire batch is the correct approach. Document this explicitly in the rollback section. Defer per-agent rollback to Phase 8+ if the need materializes. |
| 3 | Batch verification commands in MIGRATION-PLAN.md could be pre-generated as runnable `.sh` scripts rather than inline checklist items | Low | Low | Add a note in MIGRATION-PLAN.md that verification checklist items can optionally be scripted as `.sh` files in `_implementation/verify-batch-N.sh`. Not required for WINT-7020 completeness — a future story could add automation. |
| 4 | Some orphaned agents (audit-*, code-review-*) represent a functional audit subsystem that may have value as a standalone capability even without swim-lane migration — they could be promoted to active use | Medium | Medium | Document these as "potentially promotable to active use" in the deprecation-review section rather than simply deprecate-before-migrate. This surfaces a future opportunity for the PM to decide whether to invest in formalizing the audit agent subsystem. Defer decision to backlog. |
| 5 | MIGRATION-PLAN.md batch ordering is based on risk tier (critical/high/medium/low). An alternative ordering based on dependency graph depth (deepest spawn chains first) could reduce integration risk during migration | Low | Low | The workflow-domain grouping strategy from migrate-agents-v3.md is proven and should be used as specified. Dependency-graph ordering is a future optimization to consider if WINT-7030-7090 encounter integration issues. |

## Categories

- **Edge Cases**: Items 1, 3, 4 (orphan classification nuance, skill file handling, dynamic spawn detection)
- **UX Polish**: Items 3 in enhancements (runnable verification scripts)
- **Observability**: Item 1 in enhancements (live migration progress tracking)
- **Future-Proofing**: Items 2, 5 in enhancements (rollback granularity, dependency-graph ordering)
- **Product Opportunities**: Item 4 in enhancements (audit subsystem promotion)
