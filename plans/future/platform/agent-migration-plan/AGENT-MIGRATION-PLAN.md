# Agent Migration Plan (WINT-7020)

## Overview

This document summarizes the AGENT-MIGRATION-PLAN KB artifact created by WINT-7020. The full structured artifact lives in the Knowledge Base under story WINT-7020 with artifact type `analysis` and name `AGENT-MIGRATION-PLAN`.

**Purpose:** Eliminate filesystem directory references from agent/skill/command files. All 113 files identified by the WINT-7010 audit are assigned to exactly one migration batch.

**Schema version:** 1.0
**Source story:** WINT-7020
**Upstream dependency:** WINT-7010 (AGENT-FILESYSTEM-AUDIT)

---

## Batch Summary (9 batches)

| Batch | Name | Scope | Downstream Story |
|-------|------|-------|-----------------|
| Batch-0 | Shared includes / compatibility shims | Shared utilities used by all agents — migrate first, no dependencies | WINT-7030 |
| Batch-1 | Leader agents | Orchestration leaders that spawn workers | WINT-7040 |
| Batch-2 | Backend coder agents | Backend implementation coders | WINT-7050 |
| Batch-3 | Frontend coder agents | Frontend implementation coders | WINT-7050 |
| Batch-4 | Review agents | Code review and QA agents | WINT-7060 |
| Batch-5 | Skills / commands | Reusable skill and command files | WINT-7070 |
| Batch-6 | Partially migrated files | Files already partially updated — review-only remediation | WINT-7080 |
| Batch-7 | Pipeline scripts | Shell scripts referencing story filesystem paths | WINT-7080 |
| Batch-8 | Docs / prompts | Documentation and prompt files with path references | WINT-7090 |

Total files: **113** across all batches.

---

## Shim Strategy

A compatibility shim layer is introduced in Batch-0 before any agent migration begins. Shims allow agents to resolve story paths via KB lookups during the transition window, preventing breakage in partially-migrated states.

Key principle: shims are **temporary** — they are removed once all downstream batches (Batch-1 through Batch-8) are complete.

---

## Reference Categories (5)

All filesystem references fall into one of five categories. Each has a defined remediation action:

1. **Explicit story directory paths** (`plans/stories/{ID}/`) — replace with `kb_read_artifact` / `kb_update_story_status` calls
2. **_implementation/ subdirectory writes** — eliminate entirely; write to KB artifacts instead
3. **WORK-ORDER-BY-BATCH.md references** — remove; parallel conflict prevention is now via `kb_update_story_status` guard
4. **story.yaml file reads** — replace with `kb_get_story` calls
5. **elaboration/ directory references** — replace with KB elaboration artifact reads

---

## Migration Order Constraint

Batch-0 must be completed and validated before any other batch begins. Each subsequent batch may proceed once its declared dependencies are met. Batch-6 (partially migrated) requires human review gate before merge.

---

## Verification Per Batch

Each batch has grep-based negative assertions to confirm no residual filesystem references remain after migration:

```bash
# Example: verify no _implementation/ writes remain in a migrated agent
grep -rn '_implementation/' .claude/agents/<batch-files> && echo "FAIL" || echo "PASS"
```

Batch-0 additionally requires a human review gate before downstream stories begin.

---

## Downstream Story Map

| Story | Batches covered |
|-------|----------------|
| WINT-7030 | Batch-0 (shared includes / shims) |
| WINT-7040 | Batch-1 (leaders) |
| WINT-7050 | Batch-2, Batch-3 (backend + frontend coders) |
| WINT-7060 | Batch-4 (review agents) |
| WINT-7070 | Batch-5 (skills/commands) |
| WINT-7080 | Batch-6, Batch-7 (partially migrated + scripts) |
| WINT-7090 | Batch-8 (docs/prompts) |

---

## Reading the Full Artifact

The canonical machine-readable artifact is stored in the KB. To read it:

```javascript
kb_read_artifact({ story_id: 'WINT-7020', artifact_type: 'analysis' })
// Returns: { artifact_name: 'AGENT-MIGRATION-PLAN', schema_version: '1.0', batch_schedule: [...], shim_strategy: {...}, downstream_story_map: {...} }
```

Downstream stories (WINT-7030 through WINT-7090) should read the KB artifact directly when executing their batch migrations.
