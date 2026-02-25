# SETUP SUMMARY: MODL-0020 Task Contracts & Model Selector

**Date:** 2026-02-23  
**Story ID:** MODL-0020  
**Status:** In-Progress (Catch-Up Mode)  
**Iteration:** 0

## Overview

MODL-0020 implements task-centric model selection to replace agent-level routing. The implementation code existed on the main branch prior to this setup phase, so this document captures the existing state and establishes KB artifacts for workflow tracking.

## Implementation Status

### Code Artifacts Verified

| File | Purpose | Status |
|------|---------|--------|
| `packages/backend/orchestrator/src/models/__types__/task-contract.ts` | Task contract schema (Zod) | ✓ Complete |
| `packages/backend/orchestrator/src/models/task-selector.ts` | Task-based model selector | ✓ Complete |
| `packages/backend/orchestrator/src/models/unified-interface.ts` | Extended with TaskContract support | ✓ Complete |
| `packages/backend/orchestrator/docs/TASK-CONTRACTS.md` | Documentation | ✓ Complete |

### Test Coverage

- **test-selector.test.ts** - Integration tests for tier selection matrix, escalation logic, fallback validation
- **task-contract-validation.test.ts** - Contract schema validation
- **unified-interface.test.ts** - Model selector integration
- **Total test count:** 52+ tests in models module
- **Status:** All passing ✓

### Quality Assurance

- Type checking: ✓ No errors
- Linting: ✓ Passing
- Test coverage: ✓ 45%+ (minimum requirement met)

## Scope

### Components Touched

- **Backend:** `packages/backend/orchestrator` (task selector, contracts, model router integration)
- **Packages:** `packages/core` (shared contract types)
- **Contracts:** Task contract schema for external/internal APIs

### Risk Profile

| Risk Factor | Status | Notes |
|------------|--------|-------|
| External APIs | Medium | Integrates with WINT-0230 ModelRouter; depends on WINT-0220 strategy |
| Performance | Medium | Adds routing logic; needs monitoring on task selection overhead |
| Auth | Low | No auth changes required |
| Payments | Low | No billing impact |
| Migrations | Low | No database migrations |
| Security | Low | No new security surface |

## Dependencies

### Satisfied

- **MODL-0010** (Provider Adapters) - Completed ✓
- **WINT-0230** (Unified Model Interface) - UAT → Ready for integration ✓
- **WINT-0220** (4-tier strategy) - Active, YAML deployed ✓

### Blocks

- **MODL-0030** (Quality Evaluator) - Dependent on task contract integration
- **MODL-0040** (Model Leaderboards) - Dependent on task-centric metrics

## Key Design Decisions

### 1. Task Contract Schemas (Zod-first)

```typescript
export const ComplexityEnum = z.enum(['low', 'medium', 'high'])
export const QualityRequirementEnum = z.enum(['adequate', 'good', 'high', 'critical'])
```

Contract captures task characteristics that drive tier selection:
- **Complexity** - computational/reasoning requirements
- **Quality Requirement** - output quality expectations
- **Security Sensitive** - blocks Ollama usage
- **Requires Reasoning** - logic depth indicator
- **Budget Tokens** - cost constraint

### 2. Escalation/De-escalation Rules

Precedence hierarchy:
1. **Security** - `securitySensitive=true` → Tier 0/1 (premium only)
2. **Quality** - `qualityRequirement='critical'` → Tier 0 (Opus)
3. **Complexity** - `complexity='high'` → escalate by 1 tier
4. **Budget** - `budgetTokens` constraint → de-escalate if quality permits

### 3. Fallback Chain Validation

Tier selection includes fallback chain (Tier 0 → 1 → 2 → 3 with Ollama filtering):
- If `allowOllama=false`, filters Ollama models from fallback
- Ensures graceful degradation without violating security constraints

## Next Steps

1. **Integration Testing** - Verify task selector with actual model router in dev environment
2. **Performance Monitoring** - Add instrumentation to track selection overhead
3. **Documentation** - Update API docs with task contract examples
4. **Dependent Stories** - MODL-0030 (Quality Evaluator) can proceed when ready

## Constraints & Guidelines

Per CLAUDE.md:
- Zod schemas for all types ✓
- No barrel files ✓
- @repo/logger (not console) ✓
- 45% test coverage minimum ✓
- Named exports ✓

## KB Artifacts

- **CHECKPOINT.yaml** - Current phase, iteration, warnings
- **SCOPE.yaml** - Component touches, risk flags, summary
- **SETUP-SUMMARY.md** - This document (manual reference)

---

*Setup completed in catch-up mode. Implementation code pre-existed; artifacts created for workflow tracking.*
