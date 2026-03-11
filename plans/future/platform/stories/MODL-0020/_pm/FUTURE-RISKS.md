# Future Risks: MODL-0020 - Task Contracts & Model Selector

## Non-MVP Risks

### Risk 1: Task Contract Persistence for Analytics
**Impact (if not addressed post-MVP)**:
- Cannot analyze task→tier selection patterns over time
- Cannot optimize task type taxonomy based on usage data
- Missing telemetry for cost/quality analysis

**Recommended Timeline**: MODL-0030 (Quality Evaluator) or MODL-0040 (Model Leaderboards)

**Future Story**: Create task contract logging to database or telemetry system for analytics.

---

### Risk 2: ML-Based Task Selection
**Impact (if not addressed post-MVP)**:
- Rule-based selection may not optimize for cost/quality trade-offs long-term
- Manual strategy updates required as model capabilities evolve
- Cannot learn from historical task outcomes

**Recommended Timeline**: WINT-5xxx epic (ML Pipeline)

**Future Story**: Train ML model to predict optimal tier based on task contract + historical performance.

---

### Risk 3: Dynamic Strategy Updates
**Impact (if not addressed post-MVP)**:
- Strategy changes require code deployment (strategy cached at startup)
- Cannot A/B test different tier selection strategies
- Cannot adjust tier mappings based on real-time cost/availability

**Recommended Timeline**: Post-MODL-0040 (after leaderboards establish performance baselines)

**Future Story**: Implement hot-reload for WINT-0220-STRATEGY.yaml with version control and rollback.

---

### Risk 4: Task Contract UI Builder
**Impact (if not addressed post-MVP)**:
- Developers must manually construct task contracts in code
- No interactive way to explore task→tier mappings
- Harder to understand tier selection without experimentation

**Recommended Timeline**: AUTO epic (automation dashboard)

**Future Story**: Create contract builder UI showing tier selection preview and cost estimates.

---

### Risk 5: Cache Eviction for Provider Instances
**Impact (if not addressed post-MVP)**:
- Provider instances cached indefinitely (potential memory leak in long-running services)
- No cache size limits documented
- Production deployments may accumulate stale connections

**Recommended Timeline**: Post-MVP (after production usage patterns observed)

**Future Story**: Implement LRU or TTL cache eviction for provider factory (similar to MODL-0010 lessons).

---

### Risk 6: Reasoning-Intensive Task Detection
**Impact (if not addressed post-MVP)**:
- `requiresReasoning` flag is manual (developer must set explicitly)
- Cannot automatically detect reasoning-heavy tasks
- May under-provision reasoning tasks (wrong tier)

**Recommended Timeline**: MODL-0030 (Quality Evaluator)

**Future Story**: Analyze task outputs to infer reasoning requirements, update contract schema with learned heuristics.

---

## Scope Tightening Suggestions

### Suggestion 1: Defer Multi-Tier Fallback Chains
**Current Scope**: AC-5 validates fallback chain with multiple tiers.

**Simplification**: MVP could use single-tier fallback (primary → backup), defer multi-tier chains to MODL-0030.

**Benefit**: Reduce selection logic complexity, fewer edge cases to test.

**Trade-off**: Less resilient to multiple provider failures.

**Recommendation**: Keep AC-5 as-is - fallback chain already implemented in WINT-0230, minimal additional effort.

---

### Suggestion 2: Defer Budget-Constrained De-escalation
**Current Scope**: AC-3 includes budget token de-escalation logic.

**Simplification**: MVP could focus on escalation only (higher quality), defer de-escalation to MODL-0040.

**Benefit**: Simpler decision tree, fewer decision factors.

**Trade-off**: Cannot optimize for cost in MVP.

**Recommendation**: Defer budget de-escalation to MODL-0040 - not critical for initial task-based selection.

---

### Suggestion 3: Start with Subset of Task Types
**Current Scope**: AC-2 maps all task types from WINT-0220-STRATEGY.yaml.

**Simplification**: MVP could support 3-5 core task types (code_generation, code_review, gap_analysis), add others incrementally.

**Benefit**: Faster MVP validation, focused testing.

**Trade-off**: Limited applicability until all task types supported.

**Recommendation**: Keep full taxonomy - no additional implementation cost, already defined in strategy.

---

## Future Requirements

### Future Requirement 1: Task Contract Versioning
**Nice-to-have**: Version task contract schema to enable backward-compatible changes.

**Use Case**: Add new fields (e.g., `languageComplexity`, `domainSpecialization`) without breaking existing contracts.

**Timeline**: Post-MODL-0040 (after contract usage patterns stable).

---

### Future Requirement 2: Task Contract Templates
**Nice-to-have**: Pre-defined contract templates for common task patterns.

**Use Case**:
```typescript
const codeReviewContract = TaskContracts.CODE_REVIEW_SECURITY
// Expands to: { taskType: 'code_review', securitySensitive: true, qualityRequirement: 'critical' }
```

**Timeline**: AUTO epic (developer experience improvements).

---

### Future Requirement 3: Task Contract Validation Against Strategy
**Nice-to-have**: Runtime validation that contract fields are compatible with strategy configuration.

**Use Case**: Prevent `allowOllama: false` + `taskType` that only has Ollama tiers defined.

**Timeline**: MODL-0030 (Quality Evaluator) - part of pre-execution validation.

---

### Future Requirement 4: Tier Selection Explanation API
**Nice-to-have**: Return structured explanation of tier selection decision (not just logs).

**Use Case**:
```typescript
const result = selectModelForTask(contract)
console.log(result.explanation)
// "Selected Tier 1 (Sonnet) due to: high complexity (+1 tier escalation), security sensitive (+2 tiers escalation)"
```

**Timeline**: AUTO epic (dashboard UI needs explanations for human review).

---

### Future Requirement 5: Cost Estimation Before Execution
**Nice-to-have**: Return estimated cost (tokens × price) before task execution.

**Use Case**: Budget enforcement, cost-aware task scheduling.

**Timeline**: WINT-0260 (Model Cost Tracking) - requires token cost mapping.

---

## Polish and Edge Case Handling

### Polish 1: Better Error Messages for Invalid Contracts
**Current**: Zod error messages are developer-facing.

**Future**: User-friendly error messages with suggestions.

**Example**:
```
Current: "Expected 'low' | 'medium' | 'high', received 'very_high'"
Future: "Invalid complexity 'very_high'. Did you mean 'high'? Valid values: low, medium, high"
```

---

### Polish 2: Contract Field Documentation in TypeScript
**Current**: Field descriptions in Zod schema only.

**Future**: JSDoc comments on TaskContract type for IDE autocomplete.

**Example**:
```typescript
type TaskContract = {
  /** Task category from WINT-0220 strategy. Determines default tier. */
  taskType: string
  /** Computational complexity. High complexity escalates tier. */
  complexity: 'low' | 'medium' | 'high'
}
```

---

### Polish 3: Telemetry for Tier Selection Outcomes
**Current**: Logging only (not queryable).

**Future**: Emit structured telemetry events for cost/quality analysis.

**Integration**: WINT-0040 (Telemetry Tables), TELE-0020 (Prometheus Metrics).

---

### Edge Case 1: Circular Fallback Chains
**Scenario**: Strategy misconfigured with circular fallback (Tier 1 → Tier 2 → Tier 1).

**Current Handling**: Not validated (assumes strategy configuration correct).

**Future Handling**: Validate fallback chain is acyclic (graph analysis) at strategy load time.

**Timeline**: WINT-0230 already implements `analyzeEscalationPaths()` - extend to fallback chains.

---

### Edge Case 2: All Providers Unavailable
**Scenario**: All Anthropic and Ollama providers down simultaneously.

**Current Handling**: Throws error (AC-5 validates this).

**Future Handling**: Queue task for retry with exponential backoff, notify human operator.

**Timeline**: AUTO epic (work queue + retry logic).

---

### Edge Case 3: Task Contract Conflicts
**Scenario**: `{ complexity: 'low', qualityRequirement: 'critical' }` - conflicting signals.

**Current Handling**: Quality requirement takes precedence (escalates to Tier 0).

**Future Handling**: Warn developer about conflicting contract fields.

**Timeline**: MODL-0030 (Quality Evaluator) - contract consistency validation.
