# Elaboration Analysis - INFR-0020

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | **FAIL** | **Critical** | Story scope does NOT match stories.index.md. Story ID is INFR-0020 but stories.index.md lists INFR-002 (different naming). Story describes "Artifact Writer/Reader Service" but index describes different features. |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, decisions are consistent. AC matches scope. |
| 3 | Reuse-First | PASS | — | Story correctly plans to reuse all existing persistence utilities, artifact schemas, and PathResolver/SurfaceNormalizer. |
| 4 | Ports & Adapters | **FAIL** | **Critical** | Story violates Ports & Adapters architecture. Plans to create service in `packages/backend/orchestrator/src/services/` but this is NOT an API endpoint. Should NOT follow API layer patterns from api-layer.md. This is backend infrastructure, not HTTP routes. |
| 5 | Local Testability | PASS | — | Comprehensive unit and integration tests planned with .http tests for E2E (per ADR-006). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. All design decisions are complete. |
| 7 | Risk Disclosure | PASS | — | Risks properly disclosed (stage auto-detection performance, DB test dependencies, INFR-0120 prereqs). |
| 8 | Story Sizing | PASS | — | 10 ACs, single package, focused scope. Achievable in single session per story notes. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Scope mismatch with stories.index.md** | Critical | Verify correct story ID and feature directory. Story claims ID "INFR-0020" but infra-persistence/stories.index.md shows "INFR-002". Wrong index file or wrong story? |
| 2 | **Incorrect architecture pattern applied** | Critical | Remove all references to Ports & Adapters, routes.ts, application/, adapters/, ports/ structure. This is NOT an API endpoint. This is a backend service layer wrapper around persistence utilities. Use simple class-based service pattern, not hexagonal architecture. |
| 3 | **Misleading architecture notes** | High | Story references api-layer.md in audit checklist but then doesn't apply those patterns in implementation. Remove api-layer.md from dependencies since this story doesn't touch API endpoints. |
| 4 | **No API endpoints being created** | Medium | Story creates a service layer, not API routes. Tests should NOT reference endpoint testing patterns. Update test plan to focus on service layer testing only. |

## Split Recommendation

Not applicable - story is appropriately sized.

## Preliminary Verdict

**FAIL: Critical issues block implementation**

**Critical Blockers:**

1. **Scope Alignment Failure**: Story ID mismatch with stories.index.md requires resolution before implementation
2. **Architecture Pattern Misapplication**: Story incorrectly applies API layer patterns to non-API code

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Story ID verification | Cannot proceed with implementation | Verify INFR-0020 vs INFR-002 discrepancy. Confirm correct feature directory and stories index. |
| 2 | Architecture pattern correction | Implementation will violate project architecture | Remove hexagonal architecture references. This is a simple service wrapper, not an API layer. Use factory function + class pattern like existing orchestrator utilities (PathResolver, YamlArtifactReader, etc.). |
| 3 | Scope definition correction | Story claims to check against stories.index.md for scope alignment but the referenced index doesn't contain this story | Either: (a) Add story to correct stories.index.md, or (b) Update story to reference correct index file |

---

## Worker Token Summary

- Input: ~49,000 tokens (story, agent instructions, persistence utilities, artifact schemas, api-layer.md, stories indices, orchestrator index)
- Output: ~1,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
