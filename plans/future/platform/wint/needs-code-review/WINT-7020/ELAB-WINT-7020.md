# Elaboration Report: WINT-7020

**Story ID:** WINT-7020
**Title:** Create Agent Migration Plan: Categorize Agents by Risk and Define Migration Batches
**Status:** PASS
**Generated:** 2026-02-18T00:00:00Z
**Verdict:** Ready for implementation

---

## Summary

All 9 audit checks PASS. Zero MVP-critical gaps identified. Story is well-scoped, internally consistent, and ready for implementation. The 10 acceptance criteria are coherent and non-contradictory. All 7 WINT-7010 audit artifacts have been explicitly referenced and are available for consumption.

### Audit Results

| Check | Status | Notes |
|-------|--------|-------|
| Scope Alignment | PASS | Story scope precisely matches stories.index.md entry. Agent count discrepancy (52 vs 41+) explicitly resolved in scope (41 .agent.md + 16 command files + 3 skill files = 60 total; ~52 after excluding already-migrated). |
| Internal Consistency | PASS | Goals match ACs. Non-goals ("no agent modifications") enforced by AC-10. All 10 ACs are coherent and non-contradictory. |
| Reuse-First | PASS | All 7 WINT-7010 artifacts reused directly. migrate-agents-v3.md format reused as batch grouping template. story-update.md and story-status.md reused as canonical references. No new packages required. |
| Ports & Adapters | PASS | Documentation story — no API endpoints or service layers involved. |
| Local Testability | PASS | Test plan defines 10 concrete verification steps (all manual/structural, appropriate for documentation story). BATCH-SCHEDULE.yaml parse verification explicit. git diff command specified for AC-10. |
| Decision Completeness | PASS | All design decisions resolved: batch grouping strategy (by workflow domain), risk scoring model (spawn depth + workflow criticality), rollback strategy (shim directory fallback), orphaned agent handling (deprecation review classification). No blocking TBDs. |
| Risk Disclosure | PASS | Three MVP-critical risks identified and mitigated in DEV-FEASIBILITY.md: artifact path mismatch, agent count reconciliation ambiguity, orphaned agent disposition judgment. Shim rollback dependency explicit. No hidden infrastructure dependencies. |
| Story Sizing | PASS | 10 ACs — borderline but justified (story is documentation-only with no code changes). All 10 ACs are structural/completeness checks on two output files. All ACs share a single deliverable (the migration plan). Zero size indicators for code concerns. |
| Subtask Decomposition | PASS | 3 subtasks (ST-1: read artifacts, ST-2: risk inventory, ST-3: batches + YAML). ST-1 reads 7 files. ST-2 writes MIGRATION-PLAN.md sections 1-3. ST-3 writes sections 4-6 + BATCH-SCHEDULE.yaml. DAG is acyclic (ST-1 → ST-2 → ST-3). Each subtask has verification commands. 2 canonical references listed. |

---

## Key Findings

### MVP-Critical Gaps
**None.** Core journey is complete:
- Read 7 WINT-7010 audit artifacts (AC-1, ST-1)
- Build risk-scored inventory with orphan classification (AC-2, AC-3, AC-4, ST-2)
- Define 5-7 batches with verification criteria and rollback (AC-5, AC-6, AC-7, ST-3)
- Produce MIGRATION-PLAN.md and BATCH-SCHEDULE.yaml (AC-8, AC-9, ST-3)
- Zero agent/command/skill file modifications (AC-10, enforced by non-goal)

### Non-Blocking Findings

**4 Non-Blocking Gaps + 5 Enhancements** identified and queued to KB-WRITE-QUEUE.yaml:

1. **Orphan classification nuance** (Low impact) — ORPHANED-AGENTS.yaml does not distinguish "never referenced" vs "referenced only in archived agents". AC-4 rationale field is sufficient for implementation-time classification. Cross-checking against _archive/ bodies is an implementation detail, not a blocking gap.

2. **BATCH-SCHEDULE.yaml point estimates** (Low impact) — Placeholders; actual effort becomes known during WINT-7030-7090 elaboration. Should include `confidence: preliminary` field and note that each batch story re-estimates during its own elaboration.

3. **Skill file migration pattern** (Low impact) — 3 skill files (token-log, token-report, wt-new) are a distinct file type whose migration may require different tooling. Risk inventory must classify skill files explicitly; implementation note for developer to document skill migration pattern differences in MIGRATION-PLAN.md.

4. **Dynamic spawn detection** (Medium impact) — CROSS-REFERENCES.yaml generated from frontmatter spawned_by fields only; dynamic spawns in agent body text may not be captured. Spot-check grep recommended during implementation but not a blocking AC.

5. **Enhancement: Migration progress tracking** (Medium impact) — MIGRATION-PLAN.md is static; a live MIGRATION-STATUS.yaml companion updated by each batch story would enable live progress tracking. Defer to post-WINT-7020.

6. **Enhancement: Per-agent rollback** (Medium impact) — Current shim provides batch-level rollback only. Per-agent rollback is over-engineering at this stage; defer to Phase 8+ if needed.

7. **Enhancement: Verification script generation** (Low impact) — Batch verification commands could be pre-generated as runnable .sh scripts. Optional polish for developer experience.

8. **Enhancement: Audit subsystem opportunity** (Medium impact) — Orphaned audit-*, code-review-* agents represent a functional audit subsystem; potentially promotable to active use rather than deprecated.

9. **Enhancement: Batch dependency ordering** (Low impact) — Dependency graph depth (deepest spawn chains first) is an alternative to risk-tier ordering. Workflow-domain grouping is proven; defer alternative ordering.

---

## ACs Added
**0 ACs added.** All 10 original ACs remain. Story completeness does not require additions.

---

## KB Entries Deferred
**9 findings** (4 gaps + 5 enhancements) queued to `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/elaboration/WINT-7020/_implementation/KB-WRITE-QUEUE.yaml` for batch KB write post-implementation.

---

## Story Quality Assessment

### Strengths
- Thorough context section referencing all 7 WINT-7010 audit artifacts with explicit paths
- 10 ACs internally consistent with non-goals (AC-10 directly enforces no-modification non-goal)
- Risk scoring model fully defined (spawn depth + workflow criticality criteria per tier)
- Batch grouping strategy adapted from proven migrate-agents-v3.md prior art
- Rollback strategy relies on live shim — no new infrastructure needed
- Canonical references provided (story-update.md, story-status.md) for target migrated state
- 3 subtasks with acyclic DAG (ST-1 → ST-2 → ST-3); per-subtask verification commands
- BATCH-SCHEDULE.yaml parse verification command explicitly specified in ST-3

### Recommendations for Implementation
- At ST-2 implementation time, cross-check orphans against _archive/ bodies before classification
- Add `confidence: preliminary` field to each batch entry in BATCH-SCHEDULE.yaml
- Perform a spot-check grep for dynamic spawn patterns in swim-lane agent bodies during ST-2
- In orphan deprecation-review section, flag audit-* and code-review-* agents as potentially promotable

---

## Upstream Dependencies
**WINT-7010:** Audit Agent Directory References — ✅ Complete (7 artifacts at `plans/future/platform/UAT/WINT-7010/`)

---

## Downstream Dependencies (Unblocked by this story)
- WINT-7030: Migrate Batch 1 Agents (Story Management)
- WINT-7040: Migrate Batch 2 Agents (Workflow Orchestration)
- WINT-7050: Migrate Batch 3 Agents (Development)
- WINT-7060: Migrate Batch 4 Agents (QA)
- WINT-7070: Migrate Batch 5 Agents (Review)
- WINT-7080: Migrate Batch 6 Agents (Reporting)
- WINT-7090: Migrate Batch 7 Agents (Utility)

All 7 batch stories (WINT-7030–7090) are sequentially blocked by this story. The MIGRATION-PLAN.md and BATCH-SCHEDULE.yaml produced here are direct inputs to elaboration of each batch execution story.

---

## Conclusion

Story is **READY FOR IMPLEMENTATION**. All audit checks pass. Core journey is complete. Non-blocking findings are captured for reference during implementation. Developer has clear direction (3 subtasks, ST-1 → ST-2 → ST-3) with concrete verification criteria for each step.

No changes required to story ACs or scope.
