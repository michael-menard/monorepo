# Elaboration Report - LNGG-0010

**Date**: 2026-02-13
**Verdict**: FAIL

## Summary

Story File Adapter development cannot proceed due to a critical scope alignment failure. The story requires the adapter to parse existing story YAML files, but these files use a different schema (14+ field mismatches) than the current `StoryArtifactSchema` v1. This fundamental incompatibility must be resolved by PM before implementation can begin.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story scope does NOT match index exactly - story uses fields not in StoryArtifactSchema |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, decisions, and ACs are consistent |
| 3 | Reuse-First | PASS | — | Properly reuses StoryArtifactSchema, Zod patterns, existing file structure |
| 4 | Ports & Adapters | PASS | — | Pure file I/O adapter, no business logic, transport-agnostic by design |
| 5 | Local Testability | PASS | — | Comprehensive test plan with .test.ts files and fixtures |
| 6 | Decision Completeness | PASS | — | All 4 missing requirements addressed in DEV-FEASIBILITY.md |
| 7 | Risk Disclosure | PASS | — | All 5 MVP-critical risks documented with concrete mitigations |
| 8 | Story Sizing | PASS | — | 6 ACs, file I/O only, backend-only, appropriate for 5-point story |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | **Schema Mismatch: Critical blocker** - Existing story.yaml files use 14+ fields NOT in StoryArtifactSchema v1 | Critical | PM must resolve schema alignment: (A) Update schema to match existing files, OR (B) Require migration of all existing files, OR (C) Support both with version detection | BLOCKED |
| 2 | Fields in WKFL-001 NOT in schema (14 mismatches): `status`, `phase`, `epic`, `prefix`, `blocks`, `owner`, `estimated_tokens`, `tags`, `summary`, `acceptance_criteria`, `scope.in/out`, `technical_notes`, `reuse_plan`, `local_testing`, `token_budget` | High | Either add these fields to schema as optional, or update story goal to clarify which fields are in scope | BLOCKED |
| 3 | Fields in schema NOT in existing files: `schema`, `type`, `points`, `depends_on`, `follow_up_from`, `acs` (field name mismatch), `risks` | High | Clarify whether new story.yaml format should be rolled out retroactively or used only for new files | BLOCKED |

## Split Recommendation

Not applicable. Story is appropriately sized but cannot proceed until schema alignment is resolved.

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Schema incompatibility between story.yaml files and StoryArtifactSchema v1 - adapter cannot parse existing files | **PM Review Required** | Critical blocker for entire adapter functionality. Without resolution, adapter fails its primary purpose. |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | No file locking mechanism - concurrent writes may cause last-write-wins behavior | KB-logged | Edge case, low impact, filed for future consideration |
| 2 | No caching layer - repeated reads hit disk every time | KB-logged | Performance optimization, low impact for MVP |
| 3 | No schema migration utilities - manual migration required if schema changes | KB-logged | Edge case, medium effort, filed for future enhancement |
| 4 | No validation of file path injection - malicious paths could escape monorepo root | KB-logged | Security consideration, low effort fix |
| 5 | No metrics/telemetry - cannot track adapter performance in production | KB-logged | Observability enhancement, low impact for MVP |
| 6 | No retry logic for transient failures - network drives may fail intermittently | KB-logged | Robustness enhancement, medium effort |
| 7 | No backup/rollback mechanism - failed writes may leave corrupted files | KB-logged | Safety enhancement, medium effort |
| 8 | No batch write support - writing 50 stories requires 50 individual calls | KB-logged | Performance enhancement, low effort |
| 9 | No diff/patch support - update() requires full object | KB-logged | Integration enhancement, medium effort |
| 10 | No watch mode - cannot detect external changes to story files | KB-logged | Feature enhancement, high effort |
| 11 | Add dry-run mode for write operations | KB-logged | UX polish, low effort |
| 12 | Add validation report mode - scan directory and report all invalid files | KB-logged | UX polish, low effort |
| 13 | Add pretty-print option for YAML output | KB-logged | UX polish, low effort |
| 14 | Add JSON output mode | KB-logged | UX polish, low effort |
| 15 | Add field filtering - read only specific fields | KB-logged | Performance optimization, medium effort |
| 16 | Add sorting/ordering for batch reads | KB-logged | UX polish, low effort |
| 17 | Add compression support - gzip large story files | KB-logged | Performance enhancement, medium effort |
| 18 | Add checksum validation - detect silent file corruption | KB-logged | Observability, low effort |
| 19 | Add YAML comment preservation - maintain human-added comments | KB-logged | UX polish, high effort |
| 20 | Add schema inference - auto-detect schema version | KB-logged | Integration enhancement, medium effort |

### Follow-up Stories Suggested

None - blocked by critical schema alignment issue.

### Items Marked Out-of-Scope

N/A - autonomously determined. No items marked out-of-scope.

## Proceed to Implementation?

**NO - Blocked, requires PM fixes**

The story cannot proceed to implementation until the Product Manager resolves the critical schema alignment issue. The adapter's primary use case (reading existing story files) is blocked by the schema mismatch.

**Required PM Actions:**
1. Survey existing story.yaml files across `plans/future/*/UAT/*/` and `plans/future/*/*/` directories
2. Compare field structure to current `StoryArtifactSchema` v1 in `packages/backend/orchestrator/src/artifacts/story.ts`
3. Decide on one of three approaches:
   - **Option A**: Update `StoryArtifactSchema` to include all existing fields (add ~14 optional fields)
   - **Option B**: Require migration of all existing story files to new schema format (document breaking change)
   - **Option C**: Implement bidirectional schema support with version detection (complex, higher effort)
4. Update story.yaml acceptance criteria to reflect the resolved schema approach
5. Clear this story for engineering implementation

---

## Context Notes

**Story ID**: LNGG-0010
**Feature**: platform
**Type**: infrastructure
**Status**: elaboration → needs-refinement
**Points**: 5
**Priority**: high

**Blocks**: LNGG-0020, LNGG-0040, LNGG-0060, LNGG-0070 (downstream adapters)

**Critical Dependencies**: StoryArtifactSchema alignment

---

## Elaboration Timeline

- **Analysis**: 2026-02-13 - Comprehensive audit conducted, critical schema mismatch identified
- **Autonomous Decision**: 2026-02-13 - FAIL verdict due to unresolvable scope alignment
- **Completion Review**: 2026-02-13 - Story moved to needs-refinement, awaiting PM scope resolution
