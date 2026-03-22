# Phase 0 Setup Summary - APRS-1060

**Story ID:** APRS-1060  
**Title:** Agent Escalation Chain  
**Mode:** Implement (gen_mode: false)  
**Status:** SETUP COMPLETE  
**Timestamp:** 2026-03-21T00:00:00Z

---

## Story Overview

Implement a three-level quality-based escalation chain (Sonnet → Opus → human) triggered when an LLM node exhausts retries (NodeRetryExhaustedError). This is distinct from the existing provider-availability escalation chain.

**Key Requirement:** Budget guard before Opus, telemetry at each step, human tier blocks story with KB note context.

---

## Scope Analysis

### Domains Touched
- **Backend:** Orchestrator runner infrastructure ✓
- **Packages:** Core retry/escalation logic ✓
- **DB:** KB writes for notes/state updates ✓
- Frontend: No
- UI: No
- Infra: No

### Key Files to Modify/Create

**Modify:**
1. `packages/backend/orchestrator/src/runner/error-classification.ts` — Add `quality_below_threshold` category
2. `packages/backend/orchestrator/src/runner/types.ts` — Type support

**Create:**
1. `packages/backend/orchestrator/src/runner/quality-escalation.ts` — Main escalation wrapper (NEW)
2. `packages/backend/orchestrator/src/runner/__tests__/quality-escalation.test.ts` — Unit tests (NEW)
3. `packages/backend/orchestrator/src/runner/__tests__/quality-escalation-integration.test.ts` — Integration test (NEW)

**Reference (do NOT modify):**
- `packages/backend/orchestrator/src/pipeline/model-router.ts` — Provider escalation chain (separate concern)
- `packages/backend/orchestrator/src/pipeline/budget-accumulator.ts` — Budget checks
- `packages/backend/orchestrator/src/nodes/workflow/decision-callback-node.ts` — Human decision node
- `packages/backend/orchestrator/src/runner/retry.ts` — Existing retry logic
- `packages/backend/orchestrator/src/runner/node-factory.ts` — Node creation

---

## Acceptance Criteria (12 Total)

### Gap Fixes (AC-GAP series)
- **AC-GAP1:** Escalation triggered by NodeRetryExhaustedError only
- **AC-GAP2:** Human tier sets blocked + KB note, no interactive prompt
- **AC-GAP3:** Budget guard before Opus (BudgetAccumulator.checkBudget)

### Decision-Driven (AC-DEC series)
- **AC-DEC2:** Chain always starts from Sonnet regardless of original model
- **AC-DEC4:** Structured telemetry at each escalation step

### Implementation (AC-1 through AC-7)
- **AC-1:** New 'quality_below_threshold' error category in error-classification.ts
- **AC-2:** withQualityEscalation composable wrapper in runner/
- **AC-3:** Sonnet retry exhaustion → budget check → Opus invocation with telemetry
- **AC-4:** Opus exhaustion or budget insufficient → human tier with blocked state
- **AC-5:** Budget guard skips Opus with distinct blocked_reason
- **AC-6:** Unit tests for all scenarios
- **AC-7:** Integration test for full Sonnet→Opus→human path

---

## Implementation Subtasks

1. **ST-1:** Add `quality_below_threshold` error category to error-classification.ts
2. **ST-2:** Implement `withQualityEscalation` wrapper in runner/quality-escalation.ts
3. **ST-3:** Budget guard integration with BudgetAccumulator
4. **ST-4:** Human tier: KB note context + blocked state
5. **ST-5:** Escalation telemetry (structured logger events)
6. **ST-6:** Unit tests (5 scenarios)
7. **ST-7:** Integration test (full Sonnet→Opus→human path)

---

## Critical Constraints

### Do NOT Modify
- `model-router.ts` — Provider escalation is separate concern

### Must Enforce
1. Budget guard mandatory before Opus
2. Human tier uses `noop` mode (DecisionCallbackNodeConfig.mode = 'noop')
3. withQualityEscalation must compose without modifying factory signatures
4. KB writes must be atomic with state advances
5. Chain always starts from Sonnet (not from original model)

### Codebase Patterns
- Use `@repo/logger` (not console.log)
- No barrel files (import from source directly)
- Zod schemas for all types (no TypeScript interfaces)
- Named exports preferred
- Minimum 45% test coverage

---

## Key Design Decisions

### Quality Escalation vs. Provider Escalation

The existing `model-router.ts` implements **provider escalation**: when a provider is unavailable, try the next provider in the chain (ollama → openrouter → anthropic).

This story implements **quality escalation**: when an LLM node exhausts retries due to quality issues (NodeRetryExhaustedError), escalate to a higher-tier model regardless of original provider assignment.

**Relationship:** Independent, composable layers. Both can be active simultaneously.

### Budget Guard Before Opus

Before escalating from Sonnet to Opus:
1. Check remaining budget using `BudgetAccumulator.checkBudget(storyId, opusTokenEstimate, hardCap)`
2. If budget insufficient: skip Opus, go directly to human tier with distinct `blocked_reason`
3. If budget sufficient: invoke Opus with telemetry

### Human Tier Behavior

The human tier:
- Does NOT prompt interactively (uses `mode: 'noop'`)
- Sets story state to `blocked`
- Writes KB note with context (original error, escalation path, budget status)
- Human intervention required to unblock

### Telemetry Strategy

Structured logging at each step:
```
{
  event: 'quality_escalation_attempt',
  story_id: '...',
  from_tier: 'sonnet',
  to_tier: 'opus',
  reason: '...',
  tokens_consumed: 1234,
  budget_remaining: 5678
}
```

---

## Setup Artifacts

### Checkpoint (Iteration 0)
- Phase: setup
- Status: COMPLETE
- Next Phase: implementation

### Scope
- Touches: backend, packages, db
- Risk flags: external_apis, security, performance, budget_enforcement, kb_atomicity
- Elaboration: completed

---

## Next Steps (for Implementation Lead)

1. **Read** the story requirements in detail (APRS-1060 story artifact)
2. **Implement ST-1:** Add error category to error-classification.ts
3. **Implement ST-2:** Create quality-escalation.ts wrapper
4. **Implement ST-3-5:** Integrate budget, human tier, telemetry
5. **Test ST-6-7:** Unit and integration tests
6. **Verify** all 12 ACs pass
7. **Code review** per REVIEW.yaml checklist
8. **QA verification** per verification plan

---

## Constraint Verification

All constraints from story description verified:

| Constraint | Status | Evidence |
|-----------|--------|----------|
| Do NOT modify model-router.ts | ✓ | Separate concern, not in touched_paths_globs |
| Budget guard mandatory | ✓ | ST-3 explicit, AC-GAP3, AC-5 |
| Human tier noop mode | ✓ | AC-GAP2, referenced in design |
| Composable wrapper | ✓ | ST-2 withQualityEscalation, no factory changes |
| KB atomicity | ✓ | Design decision documented |
| Chain starts from Sonnet | ✓ | AC-DEC2 acceptance criteria |

---

## Reference Materials

**Key Files for Context:**
- `packages/backend/orchestrator/src/runner/retry.ts` — NodeRetryExhaustedError thrown here
- `packages/backend/orchestrator/src/runner/error-classification.ts` — ErrorCategory enum
- `packages/backend/orchestrator/src/runner/types.ts` — NodeRetryConfig, related types
- `packages/backend/orchestrator/src/pipeline/budget-accumulator.ts` — BudgetAccumulator.checkBudget()
- `packages/backend/orchestrator/src/nodes/workflow/decision-callback-node.ts` — DecisionCallbackNodeConfig.mode

**Testing Patterns:**
- Vitest framework
- Mock retry exhaustion scenarios
- Verify telemetry events emitted
- Test budget guard transitions
- Integration: full chain simulation

---

**Setup Completed:** 2026-03-21T00:00:00Z  
**Ready for Implementation:** Yes  
**Blocking Issues:** None
