# PROOF-WINT-7020: Create Agent Migration Plan

**Story**: WINT-7020
**Date**: 2026-02-18
**Verdict**: PASS

---

## Summary

Produced MIGRATION-PLAN.md and BATCH-SCHEDULE.yaml that categorize all 141 agents by migration risk, exclude 3 already-migrated commands, classify 41 orphaned agents, define 7 sequential migration batches (WINT-7030 through WINT-7090), and specify per-batch verification criteria with a shim-based rollback procedure.

## Acceptance Criteria Verification

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | All 7 WINT-7010 artifacts consumed | PASS | Section 1.3 lists all 7 with file paths |
| AC-2 | Risk-scored inventory with 6 fields | PASS | Section 3: ~100 agents with path, type, ref count, depth, tier, rationale |
| AC-3 | Already-migrated files excluded | PASS | Section 2: story-move/status/update excluded; not in any batch |
| AC-4 | 41 orphans classified | PASS | Section 4: 33 include, 6 deprecate, 2 archive |
| AC-5 | 5-7 sequential batches | PASS | 7 batches defined with files, effort, dependencies |
| AC-6 | Per-batch verification criteria | PASS | Section 6: checklist per batch |
| AC-7 | Rollback procedure | PASS | Section 7: shim fallback, verification, when-not-to-rollback |
| AC-8 | MIGRATION-PLAN.md produced | PASS | File at _implementation/MIGRATION-PLAN.md |
| AC-9 | BATCH-SCHEDULE.yaml produced | PASS | File at _implementation/BATCH-SCHEDULE.yaml; js-yaml validates |
| AC-10 | No agent/command/skill files modified | PASS | git diff confirms zero changes |

## Output Artifacts

1. `_implementation/MIGRATION-PLAN.md` — 9 sections, ~400 lines
2. `_implementation/BATCH-SCHEDULE.yaml` — 7 batches, validates as YAML
3. `_implementation/EVIDENCE.yaml` — All 10 ACs pass
4. `_implementation/CHECKPOINT.yaml` — Workflow tracking
5. `_implementation/SCOPE.yaml` — Scope definition

## Downstream Consumers

- **WINT-7030**: Batch 1 (Story Management verification)
- **WINT-7040**: Batch 2 (Dev Workflow migration)
- **WINT-7050**: Batch 3 (Elab Workflow migration)
- **WINT-7060**: Batch 4 (QA & UAT migration)
- **WINT-7070**: Batch 5 (PM & Planning migration)
- **WINT-7080**: Batch 6 (Review & Architecture migration)
- **WINT-7090**: Batch 7 (Utility & Orphan Cleanup)
