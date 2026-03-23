# APRS-1060 Setup Phase - Complete Index

**Status:** SETUP COMPLETE  
**Timestamp:** 2026-03-21T00:00:00Z  
**Story:** Agent Escalation Chain  
**Mode:** Implement (gen_mode: false)  
**Phase:** Phase 0 - Setup

---

## Executive Summary

Phase 0 setup completed for APRS-1060 (Agent Escalation Chain). Comprehensive scope and checkpoint artifacts created. Ready for implementation phase.

**Key Deliverables:**
1. Checkpoint artifact (phase: setup, iteration: 0)
2. Scope artifact with full acceptance criteria and subtasks
3. Working set sync configuration
4. Implementation roadmap with 7 subtasks
5. Risk assessment and constraint verification

**No Blocking Issues:** All preconditions met, ready to proceed with implementation.

---

## Story Details

**APRS-1060: Agent Escalation Chain**

Implement a three-level quality-based escalation chain (Sonnet → Opus → human) triggered when an LLM node exhausts retries (NodeRetryExhaustedError). This is distinct from the existing provider-availability escalation chain in `model-router.ts`.

**Key Requirements:**
- Escalation triggered by `NodeRetryExhaustedError` only
- Budget guard before Opus invocation
- Human tier sets blocked state without interactive prompt
- Structured telemetry at each escalation step
- KB note context with escalation details

---

## Scope Breakdown

### Files Modified
```
packages/backend/orchestrator/src/runner/
  ├── error-classification.ts          (ADD error category)
  └── types.ts                         (Type support for escalation config)
```

### Files Created
```
packages/backend/orchestrator/src/runner/
  ├── quality-escalation.ts            (NEW - Main escalation wrapper)
  └── __tests__/
      ├── quality-escalation.test.ts   (NEW - Unit tests)
      └── quality-escalation-integration.test.ts (NEW - Integration test)
```

### Files Referenced (DO NOT MODIFY)
```
packages/backend/orchestrator/src/
  ├── runner/retry.ts
  ├── runner/node-factory.ts
  ├── runner/state-helpers.ts
  ├── pipeline/model-router.ts          (CRITICAL: Separate concern)
  ├── pipeline/budget-accumulator.ts    (Use for budget check)
  └── nodes/workflow/decision-callback-node.ts (Use for human tier)
```

### Domain Coverage
- Backend: ✓ (orchestrator runner)
- Packages: ✓ (core retry/escalation)
- DB: ✓ (KB writes for notes)
- Frontend: - (no changes)
- UI: - (no changes)
- Infra: - (no changes)

---

## Acceptance Criteria Matrix

| AC ID | Category | Requirement | Status |
|-------|----------|-------------|--------|
| AC-GAP1 | Gap Fix | Escalation triggered by NodeRetryExhaustedError only | SCOPE |
| AC-GAP2 | Gap Fix | Human tier sets blocked + KB note, no interactive prompt | SCOPE |
| AC-GAP3 | Gap Fix | Budget guard before Opus (BudgetAccumulator.checkBudget) | SCOPE |
| AC-DEC2 | Decision | Chain starts from Sonnet regardless of original model | SCOPE |
| AC-DEC4 | Decision | Structured telemetry at each escalation step | SCOPE |
| AC-1 | Impl | New 'quality_below_threshold' error category | SCOPE |
| AC-2 | Impl | withQualityEscalation composable wrapper | SCOPE |
| AC-3 | Impl | Sonnet → budget check → Opus with telemetry | SCOPE |
| AC-4 | Impl | Opus exhaustion or budget insufficient → human + blocked | SCOPE |
| AC-5 | Impl | Budget guard skips Opus with distinct blocked_reason | SCOPE |
| AC-6 | Test | Unit tests for all scenarios | SCOPE |
| AC-7 | Test | Integration test for full Sonnet→Opus→human path | SCOPE |

---

## Implementation Roadmap

### Phase 1: Error Handling (ST-1)
- Add `quality_below_threshold` to ErrorCategory enum
- Update error classification patterns
- Add supporting telemetry fields

### Phase 2: Escalation Wrapper (ST-2)
- Create `withQualityEscalation` wrapper function
- Compose with existing `withNodeRetry` wrapper
- Type definitions and ZodSchema

### Phase 3: Integration (ST-3, ST-4, ST-5)
- Budget guard: use `BudgetAccumulator.checkBudget()`
- Human tier: trigger decision callback with `mode: 'noop'`
- Telemetry: structure logging events with context

### Phase 4: Testing (ST-6, ST-7)
- Unit tests: 5 scenarios (Sonnet failure, budget checks, Opus failure, human escalation)
- Integration test: full chain simulation end-to-end
- Verify 45% minimum coverage

---

## Risk Assessment

### High Risk Areas
- **Budget Enforcement:** Must prevent Opus invocation if budget insufficient
  - Mitigation: Explicit `checkBudget()` call with hard cap enforcement
- **KB Atomicity:** State update and KB note must advance together
  - Mitigation: Transactional write or rollback pattern
- **Telemetry Correctness:** Structured events at each step for observability
  - Mitigation: Unit tests for all telemetry paths

### Medium Risk Areas
- **Composability:** Must not modify factory signatures
  - Mitigation: Wrapper-only pattern, no intrusive changes
- **State Management:** Blocked flag + escalation metadata
  - Mitigation: Use existing `createBlockedUpdate()` helper

### Low Risk Areas
- **Error Classification:** Simple enum addition
  - Mitigation: Follows existing patterns

---

## Key Decisions

### 1. Quality Escalation vs Provider Escalation (Separation of Concerns)
- **Quality Escalation (APRS-1060):** When LLM quality is poor → escalate to better model
- **Provider Escalation (model-router.ts):** When provider unavailable → try next provider
- **Relationship:** Independent, orthogonal concerns. Both can be active.
- **Decision:** Implement as separate wrapper layer, do NOT modify model-router.ts

### 2. Budget Guard Before Opus
```
Sonnet → FAIL (retry exhausted)
  → Check budget: checkBudget(storyId, opusTokenEstimate, hardCap)
    ✓ Budget available → Opus tier (+ telemetry)
    ✗ Budget insufficient → Human tier (distinct blocked_reason)
```
**Rationale:** Avoid expensive Opus invocation if budget already consumed.

### 3. Human Tier Uses Noop Mode
```
Human tier:
  mode: 'noop'           (no interactive prompt)
  state: blocked         (story blocked, needs human unblock)
  context: KB note       (escalation details for human review)
```
**Rationale:** Automation cannot solve quality issue; human review required.

### 4. Chain Always Starts from Sonnet
- Even if original model assignment is Opus or Haiku
- Quality escalation always tries lower-cost Sonnet first
- Only escalates if Sonnet exhausts retries
- **Rationale:** Cost optimization while maintaining quality gate

### 5. Structured Telemetry
```json
{
  "event": "quality_escalation_attempt",
  "story_id": "...",
  "from_tier": "sonnet",
  "to_tier": "opus",
  "reason": "retry_exhausted",
  "tokens_consumed": 1234,
  "budget_remaining": 5678,
  "timestamp": "2026-03-21T..."
}
```
**Rationale:** Understand escalation patterns, cost tracking, failure analysis.

---

## Constraints Verified

| Constraint | Status | Evidence |
|-----------|--------|----------|
| Do NOT modify model-router.ts | ✓ | Separate wrapper pattern only |
| Budget guard mandatory | ✓ | ST-3, AC-GAP3, AC-5 explicit |
| Human tier noop mode | ✓ | AC-GAP2, design doc |
| Composable wrapper | ✓ | ST-2, no factory changes |
| KB atomicity | ✓ | Design decision, documented |
| Chain starts from Sonnet | ✓ | AC-DEC2, design principle |
| @repo/logger (no console) | ✓ | Codebase standard |
| Zod schemas (no interfaces) | ✓ | Codebase standard |
| No barrel files | ✓ | Import from source directly |
| Named exports preferred | ✓ | Codebase standard |
| 45% min coverage | ✓ | Testing plan |

---

## Implementation Checklist

Pre-Implementation:
- [x] Story requirements analyzed
- [x] Scope determined
- [x] Risk assessment completed
- [x] Key decisions documented
- [x] Constraints verified
- [x] Checkpoint artifact created
- [x] Scope artifact created

Implementation (next phase):
- [ ] ST-1: Error category added
- [ ] ST-2: Escalation wrapper created
- [ ] ST-3: Budget integration done
- [ ] ST-4: Human tier integrated
- [ ] ST-5: Telemetry structured
- [ ] ST-6: Unit tests passing
- [ ] ST-7: Integration test passing
- [ ] All 12 ACs verified
- [ ] Code review approved
- [ ] QA verification passed

---

## Reference Documentation

**Key Code Files:**
1. `packages/backend/orchestrator/src/runner/retry.ts` — withNodeRetry, NodeRetryExhaustedError
2. `packages/backend/orchestrator/src/runner/error-classification.ts` — ErrorCategory, classifyError()
3. `packages/backend/orchestrator/src/runner/types.ts` — NodeRetryConfig, related schemas
4. `packages/backend/orchestrator/src/runner/state-helpers.ts` — createBlockedUpdate(), createErrorUpdate()
5. `packages/backend/orchestrator/src/pipeline/budget-accumulator.ts` — BudgetAccumulator.checkBudget()
6. `packages/backend/orchestrator/src/nodes/workflow/decision-callback-node.ts` — DecisionCallbackNode
7. `packages/backend/orchestrator/src/runner/__tests__/retry.test.ts` — Retry test patterns
8. `packages/backend/orchestrator/src/runner/__tests__/integration.test.ts` — Integration test patterns

**Codebase Standards:**
- CLAUDE.md — Project guidelines
- MEMORY.md — User preferences and KB architecture
- Decision handling patterns (`.claude/agents/_shared/decision-handling.md`)

---

## Next Steps

**For Implementation Lead:**

1. **Review this setup summary** — Understand scope, constraints, design decisions
2. **Read APRS-1060 story artifact** — Full requirements and context
3. **Examine key files** — Understand existing retry, error, state patterns
4. **Implement ST-1** — Add error category to error-classification.ts
5. **Implement ST-2** — Create quality-escalation.ts wrapper
6. **Implement ST-3-5** — Budget, human tier, telemetry
7. **Test ST-6-7** — Unit and integration tests
8. **Verify ACs** — All 12 acceptance criteria pass
9. **Code review** — Per REVIEW.yaml checklist
10. **QA verification** — Per verification plan

---

## Artifacts Created

- **SETUP-CHECKPOINT.yaml** — Phase 0 checkpoint state
- **SETUP-SUMMARY.md** — Detailed setup analysis
- **SETUP-INDEX.md** — This document

All artifacts synchronized to KB (APRS-1060, phase: setup, iteration: 0)

---

**Setup Phase Status:** COMPLETE ✓  
**Ready for Implementation:** YES ✓  
**No Blocking Issues:** ✓
