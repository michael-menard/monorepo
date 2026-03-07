# PROOF-WINT-9105

**Generated**: 2026-03-03T16:00:00Z
**Story**: WINT-9105
**Evidence Version**: 1

---

## Summary

This documentation-only story synthesized LangGraph error handling strategy from existing code foundations into a single binding Architecture Decision Record (ADR). All 11 acceptance criteria are addressed in the ADR with explicit design decisions, rationale, and migration path to downstream stories. The deliverable is a 677-line ADR file defining retry policies, circuit breaker strategy, dead-letter queue design, idempotency contracts, and budget-aware retry caps for Tier 0-3 LLM models.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-001 | PASS | §2 Node-Level Retry Policy defines extended RETRY_PRESETS |
| AC-002 | PASS | §3 Error Classification Table + §4 Graph Propagation Rules |
| AC-003 | PASS | §5 Circuit Breaker Strategy (hybrid DB-shared + node-local) |
| AC-004 | PASS | §6 Dead-Letter Queue Strategy with schema |
| AC-005 | PASS | §7 Idempotency Contracts with per-category rules |
| AC-006 | PASS | §8 Timeout Strategy mapping from agent limits |
| AC-007 | PASS | §9 Partial-Success Semantics (50% threshold) |
| AC-008 | PASS | §10 Claude Code Agent Parity Mapping |
| AC-009 | PASS | §11 Budget-Aware Retry Caps (Tier 0-3 table) |
| AC-010 | PASS | §1 Layer Consolidation Decision (runner/ vs workflow-errors.ts) |
| AC-011 | PASS | Frontmatter status header with decision-date and deciders |

### Detailed Evidence

#### AC-001: Node-Level Retry Policy

**Status**: PASS

**Evidence Items**:
- **§2 Section**: Canonical `NodeRetryConfigSchema` from `runner/types.ts` documented (lines 93-107)
- **Extended Presets**: Adds `git`, `db_write`, `file_io` categories with full config values (lines 154-180)
- **Summary Table**: AC-001 preset table (lines 184-192) covers all 6 categories with maxAttempts, backoffMs, jitterFactor

#### AC-002: Error Classification + Graph Propagation

**Status**: PASS

**Evidence Items**:
- **§3 Error Classification**: Extended table (lines 203-220) covers node-execution and workflow-lifecycle error types
- **Retryability Rules**: Distinguishes retryable (network, rate_limit, AGENT_SPAWN_FAILED) vs terminal (ZodError, PRECONDITION_FAILED)
- **§4 Graph Propagation**: Fail-fast vs saga-style semantics (lines 229-251); graph type to semantics mapping (lines 255-262)

#### AC-003: Circuit Breaker Strategy

**Status**: PASS

**Evidence Items**:
- **Hybrid Decision**: DB-shared for LLM providers (Tier 0, 1, 3); node-local for file_io/git/db_write (lines 270-295)
- **Decision Impact**: Explicit callout for WINT-9107: "MUST implement the `workflow.circuitBreakerState` DB table" (lines 273-274)
- **Scope Table**: Per-node-category circuit state (lines 282-294)

#### AC-004: Dead-Letter Queue Strategy

**Status**: PASS

**Evidence Items**:
- **§6 Section**: DLQ entry schema with Zod (lines 343-360)
- **Retry Eligibility Rules** (lines 364-371): conditions for `retryEligible` flag
- **Manual Review Path**: Admin command requirements (lines 374-378)

#### AC-005: Idempotency Contracts

**Status**: PASS

**Evidence Items**:
- **§7 Category Table** (lines 388-397): per-category idempotency mechanism and contract
- **Git**: naturally idempotent by content hash
- **DB Write**: requires idempotency key
- **File I/O**: requires atomic write pattern
- **Idempotency Key Schema**: Zod schema for `workflow.idempotencyKeys` table (lines 401-415)

#### AC-006: Timeout Strategy

**Status**: PASS

**Evidence Items**:
- **§8 Mapping Table** (lines 428-438): agent limits to LangGraph timeoutMs (e.g., `dev-implement` 10 turns → LLM node 60000ms)
- **Timeout Hierarchy**: Graph deadline > node timeout (lines 441-451)
- **Implementation Note**: Wiring from `RETRY_PRESETS` (lines 456-457)

#### AC-007: Partial-Success Semantics

**Status**: PASS

**Evidence Items**:
- **§9 Section**: `BatchOutcomeSchema` with successRate and 50% threshold (lines 472-485)
- **Threshold Rules**: Per-graph-type thresholds (lines 492-497); `elab-epic` and `dev-batch-implement` at 50%, `code-audit` at 0%
- **Commit Independence**: Each story commits independently (lines 487-489)

#### AC-008: Claude Code Parity Mapping

**Status**: PASS

**Evidence Items**:
- **§10 Parity Table** (lines 509-515): 5 agents mapped to LangGraph equivalents
  - `dev-implement`: ZodError non-retryable; error context forwarding via state
  - `elab-story`: parse/write retries via MALFORMED_OUTPUT and EXTERNAL_SERVICE_DOWN
  - `elab-epic`: checkpointer replaces CHECKPOINT.yaml; timeout retry
  - `phase-contracts`: conditional edge on phaseBlocked flag
- **Error Context Forwarding**: `GraphStateSchema` with `lastNodeError` field (lines 522-532)

#### AC-009: Budget-Aware Retry Caps

**Status**: PASS

**Evidence Items**:
- **§11 Budget Cap Table** (lines 547-552): Tier 0-3 with max LLM retries and cap basis
  - Tier 0 (Opus): 2 retries (cost cap)
  - Tier 1 (Sonnet): 3 retries (cost cap)
  - Tier 2 (Ollama): 5 retries (latency-bound)
  - Tier 3 (OpenRouter): 5 retries (latency-bound)
- **`LLM_RETRY_BY_TIER` Schema** (lines 573-607): Per-tier config objects with maxAttempts overrides
- **Middleware Resolution Order** (lines 610-617): Lookup from model-assignments.yaml

#### AC-010: Layer Consolidation Decision

**Status**: PASS

**Evidence Items**:
- **§1 Section**: Decision table partitioning runner/ (failureThreshold=5) vs workflow-errors.ts (failureThreshold=3) (lines 61-64)
- **Ownership Table** (lines 73-84): 8 concerns mapped to owner module
- **Rationale**: Per-invocation noise (5) vs phase-level signal (3) (lines 68-70)
- **Non-Merge Rule**: "The two layers must not share or merge their CircuitBreakerConfig schemas" (line 85)

#### AC-011: Status Header & Sign-Off

**Status**: PASS

**Evidence Items**:
- **Frontmatter** (lines 2-6):
  - `status: accepted`
  - `decision-date: "2026-03-03"`
  - `deciders: ["Michael Menard", "dev-execute-leader (claude-sonnet-4-6)"]`
- **Status Section** (lines 17-19): "Accepted — 2026-03-03"

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `docs/adr/ADR-006-langgraph-error-handling.md` | CREATE | 677 |

**Total**: 1 file, 677 lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `ls -la docs/adr/ADR-006-langgraph-error-handling.md` | File exists, 677 lines | 2026-03-03T16:00:00Z |
| `grep -c "^##" docs/adr/ADR-006-langgraph-error-handling.md` | 13 sections found (TOC + 12 main sections) | 2026-03-03T16:00:00Z |
| `git diff --name-only` | Only ADR file shown; no src/ changes | 2026-03-03T16:00:00Z |
| `grep "interface " docs/adr/ADR-006-langgraph-error-handling.md` | No TypeScript interfaces — only Zod schemas | 2026-03-03T16:00:00Z |
| All AC sections present: AC-001 through AC-011 | All 11 sections addressable | 2026-03-03T16:00:00Z |

---

## Test Results

No test summary available. (Documentation-only story — ADR-006 E2E skip applies; unit tests exempt.)

**Build**: Exempt — no source code changes.
**Unit Tests**: Exempt — documentation only.
**E2E Tests**: Exempt — frontend_impacted=false (ADR-006).

---

## Implementation Notes

### Notable Decisions

- **Hybrid Circuit Breaker**: DB-shared state for LLM providers (Tier 0, 1, 3); node-local for others. This protects concurrent graphs from shared provider exhaustion.
- **Layer Partition**: `runner/` owns per-invocation, `workflow-errors.ts` owns per-phase. Both failureThreshold values (5 vs 3) are intentionally different and must not be merged.
- **Budget Caps**: Tier 0 (Opus) capped to 2 LLM retries; Tier 1 (Sonnet) to 3. Tier 2 and 3 are latency-bound, not cost-bound.
- **Saga-Style Batching**: Batch graphs continue on individual story failures; partial success (50% threshold) is acceptable.
- **Error Context Forwarding**: LangGraph middleware injects previous node error into graph state for `dev-implement` parity.

### Known Deviations

None. All 11 acceptance criteria are satisfied within the ADR. No contradictions with existing source code (runner/ and workflow-errors.ts are observed, not modified).

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Execute | 180000 | 120000 | 300000 |
| Proof | 45000 | 25000 | 70000 |
| **Total** | **225000** | **145000** | **370000** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
