# ELAB-WRKF-1020: Node Runner Infrastructure

**Elaboration Date:** 2026-01-24 (Re-elaboration)
**QA Agent:** Story Elaboration/Audit
**Previous Elaboration:** 2026-01-23 (CONDITIONAL PASS)

---

## Overall Verdict: PASS

The story **WRKF-1020** may proceed to implementation.

**Previous Conditions (All Resolved):**
1. ✅ **AC-15 and AC-16 added:** Timeout handling and error classification now in story
2. ✅ **wrkf-1010 dependency resolved:** Status upgraded from `in-progress` to `uat` with full implementation

**New ACs Recommended (from Discovery):**
- AC-17 through AC-24 recommended based on interactive discovery session
- PM should incorporate these before implementation begins

**Sizing Note:** Story now has 24 ACs total (16 original + 8 new). While this exceeds the 8-AC guideline, all functionality is cohesive (node runner infrastructure) and the user explicitly approved adding all discoveries as ACs. No split recommended.

---

## Audit Checklist Results

### 1) Scope Alignment ✅ PASS

| Check | Result | Notes |
|-------|--------|-------|
| WRKF-1020.md scope matches wrkf.stories.index.md | ✅ PASS | Story covers node factory, error handling, retry logic, logging integration, state mutation helpers |
| No extra endpoints/infrastructure | ✅ PASS | Pure TypeScript library package, no API endpoints |
| No features beyond scope | ✅ PASS | Explicitly excludes specific nodes, subgraphs, adapters |

### 2) Internal Consistency ✅ PASS

| Check | Result | Notes |
|-------|--------|-------|
| Goals vs Non-goals | ✅ PASS | Clear separation - builds infrastructure, not specific nodes |
| Decisions vs Non-goals | ✅ PASS | No contradictions |
| AC matches Scope | ✅ PASS | 16 ACs cover factory, retry, timeout, error classification, logging, state helpers, tests |
| Local Testing Plan matches AC | ✅ PASS | Tests cover happy path (18), error cases (10), edge cases (14), integration (4) |

### 3) Reuse-First Enforcement ✅ PASS

| Check | Result | Notes |
|-------|--------|-------|
| Reuses @repo/logger | ✅ PASS | AC-13, AC-14 require @repo/logger |
| Adapts @repo/api-client retry patterns | ✅ PASS | Explicitly adapts patterns, not imports directly |
| Uses zod from repo | ✅ PASS | For type definitions |
| Uses GraphState from wrkf-1010 | ✅ PASS | Depends on wrkf-1010 schemas (now at `uat` status) |
| New shared code justified | ✅ PASS | Creates shared runner infrastructure in packages/backend/orchestrator |

### 4) Ports & Adapters Compliance ✅ PASS

| Check | Result | Notes |
|-------|--------|-------|
| Core logic transport-agnostic | ✅ PASS | Node factory is pure TypeScript, no HTTP/transport concerns |
| Adapters explicitly identified | N/A | No adapters in this story (adapter stories are wrkf-1110+) |
| Platform-specific logic isolated | ✅ PASS | No platform-specific code |

### 5) Local Testability ✅ PASS

| Check | Result | Notes |
|-------|--------|-------|
| Backend changes require runnable tests | ✅ PASS | Unit tests via Vitest |
| Tests are concrete and executable | ✅ PASS | Demo script provides verification steps |
| Coverage requirement specified | ✅ PASS | 80%+ coverage for src/runner/ |

### 6) Decision Completeness ✅ PASS

| Check | Result | Notes |
|-------|--------|-------|
| No blocking TBDs | ✅ PASS | All decisions made in PM Decisions Log |
| Open Questions section empty | ✅ PASS | No open questions |

### 7) Risk Disclosure ✅ PASS

| Check | Result | Notes |
|-------|--------|-------|
| Auth risks | N/A | No auth in this story |
| DB risks | N/A | No DB in this story |
| Upload risks | N/A | No uploads |
| Caching risks | N/A | No caching |
| Infra risks | N/A | No infrastructure changes |
| Dependencies disclosed | ✅ PASS | wrkf-1010 dependency clearly stated and now resolved |

### 8) Story Sizing ⚠️ PASS WITH NOTE

| Indicator | Check | Notes |
|-----------|-------|-------|
| More than 8 AC | ⚠️ YES | 24 ACs total (16 original + 8 from discovery) |
| More than 5 endpoints | ❌ NO | 0 endpoints |
| Both significant frontend AND backend | ❌ NO | Backend only |
| Multiple independent features | ⚠️ MAYBE | Factory + retry + timeout + cancellation + circuit breaker - becoming feature-rich |
| More than 3 test scenarios in happy path | ⚠️ YES | 18+ happy path tests |
| Touches more than 2 packages | ❌ NO | Only @repo/orchestrator |

**Sizing Verdict:** Story has 3 indicators present. However:
- All functionality is cohesive (node runner infrastructure)
- User explicitly approved adding all discoveries as ACs during interactive review
- No endpoints or external integrations
- Single package scope

**Recommendation:** Proceed without split. If implementation proves too large, consider splitting circuit breaker (AC-21) and execution context (AC-22) into wrkf-1023.

---

## Condition Resolution (from Previous Elaboration)

### Condition 1: Add AC-15 and AC-16 ✅ RESOLVED

The story now includes:
- **AC-15:** Node factory supports optional `timeoutMs` configuration with `NodeTimeoutError`
- **AC-16:** `isRetryableNodeError(error)` utility function for error classification

### Condition 2: wrkf-1010 Dependency ✅ RESOLVED

- Previous status: `in-progress`
- Current status: `uat` (User Acceptance Testing)
- Implementation verified: Full `src/state/` module exists with all schemas, validators, and utilities

---

## Issues Found

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~Medium~~ | ~~wrkf-1010 dependency has status in-progress~~ | ✅ RESOLVED - now `uat` |
| 2 | Low | RunnableConfig import path not specified | Clarified in previous elab |
| 3 | Low | Partial state updates and validation refinements | Clarified in previous elab |

**No blocking issues remain.**

---

## What Is Acceptable As-Is

The following aspects of WRKF-1020 are acceptable without modification:

1. **Package structure** - `src/runner/` module location is correct
2. **File Touch List** - All files correctly identified
3. **Reuse Plan** - Properly references existing packages
4. **Test Plan** - Comprehensive coverage of scenarios
5. **Demo Script** - Executable and verifiable
6. **Constraints** - All constraints clearly specified
7. **PM Decisions Log** - All decisions documented with rationale
8. **AC-15 and AC-16** - Properly integrated from previous elaboration

---

## New Acceptance Criteria (from Discovery Session)

The following ACs should be added to WRKF-1020.md by PM:

### AC-17: Cancellation/Abort Handling

> **AC-17:** Node factory supports `AbortSignal` via `RunnableConfig.signal` for graceful cancellation. When signal is aborted, node stops execution, captures `NodeCancellationError` in state.errors, and sets appropriate routing flag.

### AC-18: Retry Jitter

> **AC-18:** Retry delay calculation includes configurable jitter (default: 0-25% random variance) to prevent thundering herd problems, following the pattern from `@repo/api-client`.

### AC-19: Timeout Cleanup Callback

> **AC-19:** Node factory supports optional `onTimeout` cleanup callback in `NodeConfig` for resource cleanup when timeout occurs. Callback receives node name and partial execution context.

### AC-20: Stack Trace Sanitization

> **AC-20:** Error capture includes configurable stack trace handling: `maxStackLength` (default 2000 chars), `filterNodeModules` (default true), converting absolute paths to relative.

### AC-21: Circuit Breaker

> **AC-21:** Node factory supports optional circuit breaker configuration with `failureThreshold` (default 5), `recoveryTimeoutMs` (default 60000). When threshold exceeded, node short-circuits to `blocked` state without execution.

### AC-22: Node Execution Context

> **AC-22:** Node factory injects `NodeExecutionContext` containing `traceId`, `graphExecutionId`, `retryAttempt` (current/max), and `parentNodeId` (if applicable) for observability.

### AC-23: Retry Event Callback

> **AC-23:** `NodeRetryConfig` supports optional `onRetryAttempt(attempt: number, error: Error, delayMs: number)` callback fired before each retry attempt.

### AC-24: Error Message Templates

> **AC-24:** Define error code constants (`NODE_TIMEOUT`, `RETRY_EXHAUSTED`, `VALIDATION_FAILED`, `CANCELLED`, `CIRCUIT_OPEN`) and message templates for infrastructure-level errors with consistent formatting.

---

## Discovery Findings Summary

### Gaps & Blind Spots Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | wrkf-1010 dependency now at `uat` status | Acknowledged | Soft gate fully resolved |
| 2 | No cancellation/abort handling | Added as AC-17 | AbortSignal support |
| 3 | No jitter in retry backoff | Added as AC-18 | Prevents thundering herd |
| 4 | No timeout cleanup mechanism | Added as AC-19 | onTimeout callback |
| 5 | Stack trace not sanitized | Added as AC-20 | Truncation and filtering |

### Enhancement Opportunities Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Circuit breaker pattern | Added as AC-21 | Fail-fast for persistent failures |
| 2 | Node execution context | Added as AC-22 | Observability metadata |
| 3 | Retry event callbacks | Added as AC-23 | onRetryAttempt hook |
| 4 | Error message templates | Added as AC-24 | Consistent error codes |

### Follow-up Stories (Previously Suggested)

- [x] **wrkf-1021: Node Execution Metrics** - Already generated
- [x] **wrkf-1022: Node Middleware Hooks** - Already generated

### Items Marked Out-of-Scope

- None

---

## Implementation Readiness Statement

**WRKF-1020 is approved for implementation.**

Before starting implementation, PM should:
1. Add AC-17 through AC-24 to the story (or defer to follow-up stories if preferred)
2. Update test plan to cover new ACs
3. Update file touch list if new files needed

Clarifications from previous elaboration remain valid:
- Import `RunnableConfig` from `@langchain/core`
- Partial state updates bypass Zod refinements (by design)
- Use `createLogger` from `@repo/logger`

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: WRKF-1020.md | input | 18,456 | ~4,614 |
| Read: wrkf.stories.index.md | input | 10,234 | ~2,559 |
| Read: wrkf.plan.exec.md | input | 6,543 | ~1,636 |
| Read: wrkf.plan.meta.md | input | 3,678 | ~920 |
| Read: qa.agent.md | input | 3,212 | ~803 |
| Read: WRKF-1010.md | input | 15,234 | ~3,809 |
| Read: ELAB-WRKF-1020.md (previous) | input | 8,456 | ~2,114 |
| Read: stories.index.md (Vercel) | input | 14,567 | ~3,642 |
| Interactive discovery (9 items) | input | ~2,000 | ~500 |
| Write: ELAB-WRKF-1020.md | output | ~12,000 | ~3,000 |
| Write: QA Discovery Notes | output | ~2,500 | ~625 |
| **Total Input** | — | ~82,380 | **~20,597** |
| **Total Output** | — | ~14,500 | **~3,625** |

---

*QA Re-Elaboration completed 2026-01-24*
*Previous elaboration: 2026-01-23 (CONDITIONAL PASS)*
*Current verdict: PASS*
