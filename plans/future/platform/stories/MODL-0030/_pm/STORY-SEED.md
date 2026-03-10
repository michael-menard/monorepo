---
generated: "2026-02-16"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: MODL-0030

## Reality Context

### Baseline Status
- Loaded: **NO** - No baseline reality file found
- Date: N/A
- Gaps: Missing current baseline context (non-blocking)

### Relevant Existing Features

MODL-0030 builds on the completed MODL-0020 (Task Contracts & Model Selector) foundation:

| Feature | Status | Location | Description |
|---------|--------|----------|-------------|
| Task Contract Schema | **UAT** | `packages/backend/orchestrator/src/models/__types__/task-contract.ts` | Zod schema defining task characteristics (complexity, quality, security) |
| Task Selector | **UAT** | `packages/backend/orchestrator/src/models/task-selector.ts` | `selectModelForTask()` function implementing tier selection logic |
| Model Router | **UAT** | `packages/backend/orchestrator/src/models/unified-interface.ts` | `ModelRouter` class with agent-based and task-based selection |
| Provider Adapters | **Completed** | `packages/backend/orchestrator/src/providers/` | Anthropic, OpenRouter, Ollama, MiniMax adapters via `ILLMProvider` interface |
| Strategy Loader | **UAT** | `packages/backend/orchestrator/src/models/strategy-loader.ts` | Loads WINT-0220-STRATEGY.yaml with task type taxonomy |
| 4-Tier Strategy | **Active** | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` | Tier 0-3 model assignments and task type taxonomy |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| KBAR-0030 | ready-to-work | **None** | Story sync functions - different package, no overlap |
| WINT-0160 | ready-to-work | **None** | doc-sync agent - different domain |
| WINT-0200 | ready-to-work | **None** | User flows schema - different domain |
| LNGG-0070 | in-progress | **None** | LangGraph integration tests - different layer |

**Conclusion**: No overlapping work detected. MODL-0030 can proceed safely.

### Constraints to Respect

From MODL-0020 completion and CLAUDE.md:

1. **Zod-First Types** (REQUIRED): All schemas must use Zod with `z.infer<>`, never raw TypeScript interfaces
2. **@repo/logger** (REQUIRED): Use structured logging, never `console.log`
3. **Provider Abstraction** (PROTECTED): Do not bypass `ILLMProvider` interface from MODL-0010
4. **Task Contract API** (PROTECTED): Reuse existing `TaskContract` schema from MODL-0020, do not modify
5. **Strategy Configuration** (PROTECTED): WINT-0220-STRATEGY.yaml structure is established, extend only if needed
6. **No Barrel Files** (REQUIRED): Import directly from source files, no `index.ts` re-exports

---

## Retrieved Context

### Related Endpoints

**None** - MODL-0030 is backend-only orchestrator package work, no API Gateway endpoints involved.

### Related Components

Quality evaluation patterns already exist in the orchestrator:

| Component | Path | Relevance |
|-----------|------|-----------|
| Readiness Score Node | `packages/backend/orchestrator/src/nodes/story/readiness-score.ts` | **High** - Scoring pattern with deductions/additions, thresholds, breakdown schema |
| Metrics Nodes | `packages/backend/orchestrator/src/nodes/metrics/` | **Medium** - Measurement patterns (PCAR, TTDC, churn) for tracking outcomes |
| Audit Findings | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | **Medium** - Quality assessment pattern for code analysis |
| Task Contract | `packages/backend/orchestrator/src/models/__types__/task-contract.ts` | **High** - Input schema for quality evaluator |

### Reuse Candidates

#### 1. Readiness Score Pattern (High Priority)
**File**: `packages/backend/orchestrator/src/nodes/story/readiness-score.ts`

**Reuse**:
- Scoring methodology: Base score (100) with deductions/additions
- Schema patterns: `ScoreBreakdownSchema`, `ScoreAdjustmentSchema`
- Threshold pattern: `READINESS_THRESHOLD = 85` as boolean gate
- Factor-based scoring: Multiple input factors drive final score

**Why Critical**: Proven scoring pattern already in production, provides template for quality scoring.

---

#### 2. Zod Schema Validation (High Priority)
**Files**: All `__types__/` directories

**Reuse**:
- Enum patterns: `z.enum(['adequate', 'good', 'high', 'critical'])` from TaskContract
- Nested object schemas with clear field documentation
- `z.infer<>` for type derivation
- Optional fields with `.optional()` for flexibility

**Why Critical**: Consistency with established schema patterns, required by CLAUDE.md.

---

#### 3. Structured Logging Patterns (High Priority)
**Files**: All nodes and selector files

**Reuse**:
- Event-based logging: `logger.info('event_name', { context })`
- Decision logging: Log tier escalation, quality assessment decisions
- Error logging: `logger.error()` with full context for debugging

**Why Critical**: Required for debugging quality evaluation decisions, telemetry integration.

---

#### 4. Task Selector Logic (High Priority)
**File**: `packages/backend/orchestrator/src/models/task-selector.ts`

**Reuse**:
- Escalation precedence pattern: Security > Quality > Complexity
- Multi-factor decision tree with clear logging
- Error handling for invalid inputs
- Contract validation with clear error messages

**Why Critical**: Quality evaluator will integrate with task selector, must follow same patterns.

---

### Similar Stories

| Story | Similarity | Relevant Patterns |
|-------|------------|-------------------|
| MODL-0020 | **0.90** | Task contract schema design, tier selection logic, integration with ModelRouter |
| WINT-0230 | **0.75** | ModelRouter implementation, tier-based routing, strategy integration |
| MODL-0010 | **0.65** | Provider abstraction, interface design, error handling patterns |
| INFR-0020 | **0.60** | Artifact validation patterns, schema design for structured data |

---

### Relevant Packages

| Package | Usage | Notes |
|---------|-------|-------|
| `zod` | Schema validation | Required for all type definitions |
| `@repo/logger` | Logging | Required for all decision logging |
| `@langchain/core` | Type compatibility | May be needed for provider integration |
| `yaml` | Strategy loading | If extending WINT-0220-STRATEGY.yaml |

**No new dependencies required** - all packages already in use.

---

## Knowledge Context

### Lessons Learned
- Lessons loaded: **NO** (KB search not performed - non-blocking)
- ADRs loaded: **NO** (ADR-LOG.md not located - non-blocking)

**Note**: While knowledge base context would be valuable, the absence of baseline and KB access is non-blocking. Proceeding with codebase context from MODL-0020 completion and established patterns from similar stories.

### Blockers to Avoid (from past stories)

Based on MODL-0020 and similar model management stories:

1. **Avoid complex multi-model comparisons in MVP** - MODL-0020 deferred ML-based selection to WINT-5xxx. Quality evaluator should start with rule-based scoring.
2. **Avoid premature persistence** - MODL-0020 deferred contract persistence to MODL-0040. Quality evaluator should log results via @repo/logger first, persist later.
3. **Avoid strategy schema changes mid-flight** - WINT-0220-STRATEGY.yaml is established. Only extend if absolutely necessary.
4. **Avoid bypassing provider abstraction** - MODL-0010 established `ILLMProvider` interface. Quality evaluator must use existing adapters.

### Architecture Decisions (ADRs)

While ADR-LOG.md was not located, MODL-0020 documentation and CLAUDE.md establish clear constraints:

| ADR | Title | Constraint |
|-----|-------|------------|
| CLAUDE.md | Zod-First Types | All schemas must use Zod with `z.infer<>`, never raw TypeScript interfaces |
| CLAUDE.md | Logging Standard | Use `@repo/logger` for all logging, never `console.log` |
| MODL-0010 | Provider Abstraction | All model interactions via `ILLMProvider` interface |
| MODL-0020 | Task Contract API | Quality evaluator consumes `TaskContract`, does not modify schema |
| WINT-0220 | 4-Tier Strategy | Quality expectations defined per tier in strategy YAML |

### Patterns to Follow

1. **Scoring Pattern** (from readiness-score.ts):
   - Base score with deductions/additions
   - Clear factor-based scoring with documented thresholds
   - Breakdown schema for transparency

2. **Zod Schema Pattern** (from task-contract.ts):
   - Enum-based validation for quality levels
   - Clear field documentation with examples
   - Partial schema support for builder pattern

3. **Decision Logging Pattern** (from task-selector.ts):
   - Log all escalation/evaluation decisions with full context
   - Event-based logging for telemetry integration
   - Clear error messages with available options

4. **Integration Pattern** (from unified-interface.ts):
   - Extend existing classes, don't replace
   - Backward compatibility with optional parameters
   - Clear migration path documentation

### Patterns to Avoid

1. **Avoid barrel files** - CLAUDE.md prohibits `index.ts` re-exports
2. **Avoid console.log** - Use `@repo/logger` exclusively
3. **Avoid raw TypeScript types** - Use Zod schemas with `z.infer<>`
4. **Avoid modifying protected features** - Task contracts, provider interfaces are locked

---

## Conflict Analysis

**No conflicts detected.**

All dependencies (MODL-0010, MODL-0020, WINT-0230, WINT-0220) are in UAT or completed status. No overlapping in-progress work. Protected features clearly identified and will not be modified.

---

## Story Seed

### Title
Quality Evaluator

### Description

**Context**:
MODL-0020 (Task Contracts & Model Selector) established task-based tier selection, enabling tasks to declare their requirements via contracts and receive optimal model assignments. However, there is currently **no validation mechanism** to assess whether the selected model actually delivered the expected quality. Without quality evaluation:

- Tier selection cannot be tuned based on actual performance
- Task contracts cannot be validated against outcomes
- Model leaderboards (MODL-0040) have no quality data source
- Cost/quality tradeoffs cannot be measured
- ML-based selection (WINT-5xxx) lacks training data

**Problem**:
The system can select models based on predicted requirements but cannot verify if the selection was optimal. For example:
- A task marked `complexity: 'low'` routed to Tier 3 (Ollama) may produce low-quality output requiring rework
- A task marked `qualityRequirement: 'critical'` routed to Tier 0 (Opus) may have succeeded at Tier 1 (Sonnet) for lower cost
- Security-sensitive tasks routed to Tier 0/1 need validation that output meets security standards
- Budget-constrained tasks de-escalated to lower tiers need quality verification

**Proposed Solution**:
Create a **Quality Evaluator** that:
1. Accepts a task contract, selected tier, and model output
2. Evaluates output against contract quality requirements
3. Returns a quality score (0-100) with detailed breakdown
4. Identifies contract mismatches (over-provisioned or under-provisioned tier)
5. Logs evaluation results for telemetry and future ML training
6. Provides foundation for MODL-0040 (Model Leaderboards) quality tracking

**Quality Dimensions**:
- **Correctness**: Does output satisfy acceptance criteria?
- **Completeness**: Are all required elements present?
- **Coherence**: Is reasoning sound and well-structured?
- **Compliance**: Does output meet security/quality constraints?
- **Cost-Efficiency**: Could lower tier have achieved same quality?

**Integration**:
Quality evaluator will be invoked post-execution to validate model selections. Initially used for logging and metrics. Future integration with ModelRouter for dynamic tier adjustment based on historical quality data.

### Initial Acceptance Criteria

- [ ] **AC-1: Quality Evaluation Schema**
  - Define `QualityEvaluationSchema` with Zod including:
    - `taskContract` - Original task contract evaluated
    - `selectedTier` - Tier selected by task selector
    - `modelUsed` - Actual model used for task
    - `qualityScore` - Overall score (0-100)
    - `qualityDimensions` - Breakdown by dimension (correctness, completeness, coherence, compliance, cost-efficiency)
    - `contractMismatch` - Flag if tier over/under-provisioned
    - `recommendation` - Suggested tier for similar future tasks
  - Export `QualityEvaluation` type via `z.infer<>`
  - Schema located in `packages/backend/orchestrator/src/models/__types__/quality-evaluation.ts`

- [ ] **AC-2: Quality Scoring Logic**
  - Implement `evaluateQuality(contract, tier, output)` function
  - Score output against contract quality requirements:
    - `qualityRequirement: 'adequate'` → threshold 60
    - `qualityRequirement: 'good'` → threshold 75
    - `qualityRequirement: 'high'` → threshold 85
    - `qualityRequirement: 'critical'` → threshold 95
  - Calculate dimension-specific scores (correctness, completeness, coherence, compliance, cost-efficiency)
  - Return overall score as weighted average of dimensions
  - Log all scoring decisions with full context

- [ ] **AC-3: Contract Mismatch Detection**
  - Compare achieved quality score against expected quality from contract
  - Flag **over-provisioning** if:
    - Score significantly exceeds threshold (e.g., `qualityRequirement: 'good'` (75 threshold) but achieved 95+)
    - Lower tier could have met requirements at lower cost
  - Flag **under-provisioning** if:
    - Score falls below threshold
    - Higher tier needed to meet quality requirements
  - Generate tier adjustment recommendations

- [ ] **AC-4: Quality Dimension Evaluators**
  - Implement evaluators for each quality dimension:
    - **Correctness**: Does output match requirements? (rule-based checks)
    - **Completeness**: Are all required elements present? (schema validation)
    - **Coherence**: Is reasoning sound? (heuristic checks)
    - **Compliance**: Meets security/quality constraints? (contract flag validation)
    - **Cost-Efficiency**: Could lower tier achieve same quality? (tier comparison)
  - Each evaluator returns score (0-100) with rationale
  - Configurable weights per dimension (default: equal weight)

- [ ] **AC-5: Integration with ModelRouter**
  - Add optional `evaluateQuality()` method to `ModelRouter` class
  - Accept task contract, tier selection, and output
  - Return `QualityEvaluation` result
  - Log evaluation via `@repo/logger` for telemetry
  - Maintain backward compatibility (evaluation is optional)

- [ ] **AC-6: Quality Thresholds Configuration**
  - Define quality thresholds in WINT-0220-STRATEGY.yaml (or separate config)
  - Per-tier quality expectations:
    - Tier 0: 95+ (critical quality)
    - Tier 1: 85+ (high quality)
    - Tier 2: 75+ (good quality)
    - Tier 3: 60+ (adequate quality)
  - Configurable dimension weights
  - Threshold overrides for specific task types

- [ ] **AC-7: Testing**
  - Unit tests: Schema validation (15+ test cases covering all fields)
  - Unit tests: Quality scoring logic (20+ test cases covering all dimensions)
  - Unit tests: Contract mismatch detection (10+ test cases for over/under-provisioning)
  - Integration tests: End-to-end evaluation with real task contracts
  - Minimum 80% coverage for evaluation logic
  - 100% coverage for error paths

- [ ] **AC-8: Documentation**
  - Document quality evaluation schema in code comments
  - Provide usage examples for each quality dimension
  - Document threshold configuration in WINT-0220-STRATEGY.md
  - Add to `packages/backend/orchestrator/docs/QUALITY-EVALUATION.md`
  - Example evaluations for common task types

### Non-Goals

- ❌ **ML-Based Quality Prediction** - WINT-5xxx scope. This story uses rule-based evaluation only.
- ❌ **Model Leaderboards** - MODL-0040 scope. Quality evaluator provides data source, leaderboard UI is separate.
- ❌ **Automatic Tier Adjustment** - Follow-up story. This story logs recommendations, doesn't auto-adjust.
- ❌ **Quality Evaluation Persistence** - MODL-0040 scope. MVP logs via @repo/logger, DB persistence deferred.
- ❌ **LLM-as-Judge Evaluation** - Future enhancement. MVP uses rule-based/heuristic evaluation for speed.
- ❌ **Quality Evaluation UI** - AUTO epic scope. Backend API only, no dashboard.
- ❌ **Historical Quality Trends** - MODL-0040 scope. This story provides point-in-time evaluation only.

### Reuse Plan

#### 1. Readiness Score Pattern (HIGH PRIORITY)
**File**: `packages/backend/orchestrator/src/nodes/story/readiness-score.ts`

**Reuse**:
- Base score (100) with deductions/additions pattern
- `ScoreBreakdownSchema` and `ScoreAdjustmentSchema` as templates
- Threshold-based boolean gate pattern
- Factor-based scoring methodology

**Why Critical**: Proven scoring pattern in production. Quality evaluator should follow same structure for consistency.

---

#### 2. Task Contract Schema (PROTECTED)
**File**: `packages/backend/orchestrator/src/models/__types__/task-contract.ts`

**Reuse**:
- `TaskContract` type as input to quality evaluator
- Quality requirement enums: `adequate | good | high | critical`
- Validation patterns with Zod
- **Do NOT modify** - quality evaluator consumes this schema

**Why Critical**: Task contracts are established API. Quality evaluator validates against these requirements.

---

#### 3. Strategy Loader (HIGH PRIORITY)
**File**: `packages/backend/orchestrator/src/models/strategy-loader.ts`

**Reuse**:
- Use `loadStrategy()` for quality threshold configuration
- Extend `StrategySchema` if adding quality thresholds to YAML
- Reuse caching pattern for performance

**Why Critical**: Centralized configuration management. Quality thresholds belong in strategy configuration.

---

#### 4. Logging Patterns (REQUIRED)
**Package**: `@repo/logger`

**Reuse**:
- Event-based logging: `quality_evaluation_start`, `dimension_score`, `contract_mismatch_detected`
- Structured log context with full evaluation breakdown
- Error logging with clear messages

**Why Critical**: Required for debugging and telemetry. Quality data feeds MODL-0040 leaderboards.

---

#### 5. ModelRouter Integration (EXTEND)
**File**: `packages/backend/orchestrator/src/models/unified-interface.ts`

**Reuse**:
- Extend `ModelRouter` class with optional `evaluateQuality()` method
- Follow backward compatibility pattern from MODL-0020
- Maintain existing tier selection logic (quality evaluator is post-selection)

**Why Critical**: Central integration point for quality validation.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Focus on rule-based evaluation logic**: Quality evaluation is deterministic (no LLM-as-judge), testable with fixtures
- **Test dimension scoring independently**: Each quality dimension (correctness, completeness, coherence, compliance, cost-efficiency) should have isolated tests
- **Test threshold boundaries**: Verify scoring at edge cases (59 vs 60 for adequate, 94 vs 95 for critical)
- **Test contract mismatch detection**: Critical logic for identifying over/under-provisioning
- **Integration testing**: Use real task contracts from MODL-0020 tests as fixtures
- **Coverage requirement**: Minimum 80% for scoring logic, 100% for error paths

### For UI/UX Advisor

**N/A** - MODL-0030 is backend-only work. No UI components involved. Quality evaluation results will be consumed by:
- CLI logging output (via @repo/logger)
- Future dashboards in MODL-0040 (Model Leaderboards)
- Future AUTO epic dashboard (automation monitoring)

### For Dev Feasibility

- **Complexity**: Medium (5-8 story points estimated)
  - Quality schema design: 1 point
  - Dimension evaluators: 3 points (5 dimensions, rule-based logic)
  - Contract mismatch logic: 1 point
  - Integration with ModelRouter: 1 point
  - Testing: 2 points (comprehensive dimension tests)

- **Dependencies**: All satisfied (MODL-0010, MODL-0020, WINT-0230 in UAT or completed)

- **Key Risks**:
  1. **Evaluation accuracy** (Medium) - Rule-based evaluation may miss nuanced quality issues
     - **Mitigation**: Start with conservative thresholds, tune based on real data
  2. **Dimension weight tuning** (Low) - Equal weights may not reflect reality
     - **Mitigation**: Make weights configurable in strategy YAML, allow experimentation
  3. **Over-fitting to specific task types** (Low) - Generic evaluation may not fit all tasks
     - **Mitigation**: Allow per-task-type threshold overrides in configuration

- **Scope Tightening Options**:
  1. Defer cost-efficiency dimension to MODL-0040 (reduces to 4 dimensions)
  2. Start with 3 quality levels (adequate/good/critical) instead of 4
  3. Defer threshold configuration to code constants (simpler than YAML extension)

- **Recommendation**: Keep full scope - all features leverage existing patterns with minimal additional complexity.

---

## Story Dependencies

**Blocks**:
- MODL-0040 (Model Leaderboards) - Requires quality evaluation data source
- WINT-5xxx (ML-Based Selection) - Requires quality scores for training data
- Future tier auto-adjustment story - Requires quality recommendations

**Depends On**:
- ✅ MODL-0020 (Task Contracts & Model Selector) - **UAT** - Provides task contract schema and tier selection API
- ✅ MODL-0010 (Provider Adapters) - **Completed** - Provides model execution abstraction
- ✅ WINT-0230 (Unified Model Interface) - **UAT** - Provides ModelRouter for integration
- ✅ WINT-0220 (Model Strategy) - **Active** - Provides tier definitions and quality expectations

**All dependencies satisfied** - MODL-0030 is ready to start.

---

## Estimated Effort

**Story Points**: 5-8 (Medium)

**Breakdown**:
- Quality evaluation schema (Zod): 0.5 points
- Quality scoring logic (5 dimensions): 3 points
- Contract mismatch detection: 1 point
- ModelRouter integration: 0.5 points
- Configuration (strategy YAML extension): 1 point
- Testing (unit + integration): 2 points

**Timeline**: 3-5 days for experienced developer familiar with MODL-0020 and orchestrator patterns.

---

## Future Opportunities

1. **LLM-as-Judge Evaluation** (High Impact, Medium Effort)
   - Use Tier 0 model to evaluate Tier 2/3 output quality
   - Provides more nuanced quality assessment than rule-based
   - Requires careful prompt design to avoid bias

2. **Quality Trend Analysis** (Medium Impact, Low Effort - MODL-0040)
   - Track quality scores over time per task type
   - Identify quality degradation patterns
   - Feed into leaderboard analytics

3. **Automatic Tier Adjustment** (High Impact, Medium Effort)
   - Use quality evaluation to auto-adjust tier selection
   - Close the feedback loop for continuous optimization
   - Requires careful rollout with human-in-loop validation

4. **Multi-Model Ensembling** (High Impact, High Effort)
   - Run task on multiple tiers, compare quality
   - Select best output based on quality score
   - Increases cost but maximizes quality

5. **Quality-Based Contract Templates** (Low Impact, Low Effort)
   - Pre-built contracts for common task patterns
   - Include expected quality ranges based on historical data
   - Quick wins for common use cases

6. **Quality SLAs per Epic** (Medium Impact, Medium Effort)
   - Define quality targets per epic (e.g., WINT requires 85+ average)
   - Alert when quality drops below SLA
   - Enables quality-driven prioritization

---

**STORY-SEED COMPLETE WITH WARNINGS: 2 warnings**

**Warnings**:
1. No baseline reality file found - proceeding with codebase context from MODL-0020 completion
2. Knowledge base and ADR-LOG.md not loaded - proceeding with established patterns from CLAUDE.md and similar stories

**Note**: Despite missing baseline and KB context, sufficient information exists in completed MODL-0020 story, codebase patterns, and established constraints to generate a comprehensive story seed. Quality evaluator builds directly on task contracts and model selector from MODL-0020, with clear integration path and reuse patterns identified.
