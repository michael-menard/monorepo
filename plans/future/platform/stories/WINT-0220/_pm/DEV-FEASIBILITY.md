# Dev Feasibility Review: WINT-0220 - Define Model-per-Task Strategy

**Generated**: 2026-02-14
**Story**: WINT-0220
**Reviewer**: Dev Feasibility Agent

---

## Executive Summary

**Feasibility**: ✅ **HIGH** - Story is well-scoped documentation work with clear deliverables and manageable complexity.

**Risk Level**: 🟡 **MEDIUM** - Primary risks are around coordination with MODL-0010 and ensuring strategy is flexible enough for future experimentation.

**Estimated Effort**: 5-8 story points (documentation-heavy, requires research and analysis)

**Recommended Approach**: Iterative drafting with early validation from MODL-0010 implementer.

---

## Integration Points Analysis

### 1. MODL-0010: Provider Adapters (OpenRouter/Ollama/Anthropic)

**Status**: In progress (ready-to-work)
**Dependency Type**: Informational (non-blocking)

**Integration Requirements**:
- Strategy must reference models supported by provider adapters
- Configuration format should align with provider interface design
- Tier definitions need to work with provider abstraction layer

**Feasibility Assessment**: ✅ **FEASIBLE**
- MODL-0010 design doc should contain provider capabilities
- Strategy can reference planned capabilities even if not yet implemented
- No breaking changes expected

**Coordination Plan**:
1. Read MODL-0010 elaboration/design artifacts
2. Extract provider interface definitions and supported models
3. Validate strategy tier models against provider capabilities
4. Share strategy draft with MODL-0010 implementer for review
5. Iterate based on feedback

**Risk**: If MODL-0010 doesn't support a model referenced in strategy (e.g., specific Ollama model), strategy needs update.
**Mitigation**: Reference model categories (e.g., "Ollama 7B coding model") rather than specific versions.

---

### 2. Existing model-assignments.ts Schema

**Location**: `packages/backend/orchestrator/src/config/model-assignments.ts`
**Current State**: Functional with TypeScript loader and YAML configuration support

**Compatibility Requirements**:
- Strategy configuration format must be consumable by existing loader
- No breaking changes to `ModelAssignment` or `ModelSelectionCriteria` types
- Agent name → model mapping approach must be preserved

**Feasibility Assessment**: ✅ **FEASIBLE**

**Existing Schema (excerpt)**:
```typescript
export interface ModelAssignment {
  agentName: string
  model: string
  tier?: number
  criteria?: ModelSelectionCriteria
}

export interface ModelSelectionCriteria {
  complexity?: 'simple' | 'medium' | 'complex'
  criticality?: 'low' | 'medium' | 'high' | 'critical'
  costSensitive?: boolean
}
```

**Strategy Alignment**:
- ✅ Tier field already exists (optional)
- ✅ Criteria structure supports complexity/criticality dimensions
- ✅ Agent-based routing aligns with current approach
- ⚠️ May need to add escalation trigger fields (additive, non-breaking)

**Recommended Changes**:
```typescript
// Additive extension (non-breaking)
export interface EscalationConfig {
  qualityThreshold?: number
  maxRetries?: number
  escalateTo?: number // tier number
  fallbackModel?: string
}

export interface ModelAssignment {
  agentName: string
  model: string
  tier?: number
  criteria?: ModelSelectionCriteria
  escalation?: EscalationConfig // NEW, optional
}
```

---

### 3. Agent File Frontmatter (100+ files)

**Location**: `.claude/agents/*.agent.md`
**Current Pattern**: All agents have `model:` frontmatter (haiku/sonnet/opus)

**Compatibility Requirements**:
- Strategy must not break existing agent invocations
- Migration path must preserve backward compatibility
- Agents without tier assignment should have sensible defaults

**Feasibility Assessment**: ✅ **FEASIBLE**

**Current State Analysis**:
```bash
# Count of current model assignments
$ grep -h "^model:" .claude/agents/*.agent.md | sort | uniq -c
  45 model: haiku
  62 model: sonnet
  18 model: opus
```

**Strategy Approach**:
1. Map current assignments to proposed tiers:
   - `model: haiku` → Tier 3 (Simple) or Tier 2 (Routine)
   - `model: sonnet` → Tier 1 (Complex Reasoning)
   - `model: opus` → Tier 0 (Critical Decision)

2. Create backward compatibility layer:
```typescript
// Fallback mapping if tier not specified
const MODEL_TO_TIER: Record<string, number> = {
  'opus': 0,
  'sonnet': 1,
  'haiku': 2,
  'ollama': 3, // default to simple tier for local models
}

export function getModelTier(agentName: string): number {
  const assignment = modelAssignments[agentName]
  if (assignment?.tier !== undefined) return assignment.tier

  // Fallback to model name mapping
  const modelType = assignment?.model.toLowerCase()
  return MODEL_TO_TIER[modelType] ?? 1 // default to Tier 1 (Sonnet)
}
```

**Migration Plan**: AC-4 addresses this - document all discrepancies and create phased migration plan.

---

### 4. MODEL_STRATEGY.md (Existing Documentation)

**Location**: `packages/backend/orchestrator/MODEL_STRATEGY.md`
**Current State**: Informal strategy guidelines

**Integration Approach**:
- Extract key insights from current document
- Formalize into structured WINT-0220-STRATEGY.md
- Deprecate MODEL_STRATEGY.md or convert to overview/intro
- Ensure no contradictions between old and new docs

**Feasibility Assessment**: ✅ **FEASIBLE**

**Migration Path**:
1. Read MODEL_STRATEGY.md and extract:
   - Cost optimization goals (50% reduction target)
   - Model selection rationale
   - Ollama availability assumptions
2. Incorporate into formal strategy
3. Add deprecation notice to MODEL_STRATEGY.md pointing to new strategy
4. Update all references in code/docs to point to new location

---

## Technical Risks

### Risk 1: Strategy Too Rigid

**Description**: Strategy may not accommodate future experimentation or edge cases.

**Impact**: HIGH - Could block workflow optimization efforts.

**Likelihood**: MEDIUM

**Mitigation**:
1. Include "escape hatch" for experimentation:
   ```yaml
   experimental_overrides:
     - agent_pattern: ".*-experiment"
       tier: 0  # Always use best model for experimental agents
       rationale: "Experimentation workflows need maximum quality"
   ```

2. Version strategy configuration:
   ```yaml
   strategy_version: "1.0.0"
   effective_date: "2026-02-15"
   review_date: "2026-03-15"  # Force periodic review
   ```

3. Support multiple strategy profiles:
   ```yaml
   profiles:
     production:
       cost_weight: 0.7
       quality_weight: 0.3
     development:
       cost_weight: 0.3
       quality_weight: 0.7
     experimentation:
       cost_weight: 0.0
       quality_weight: 1.0
   ```

**Recommended**: Include all three mitigations in strategy document.

---

### Risk 2: Ollama Model Availability Variance

**Description**: Ollama model availability varies by developer machine and CI environment.

**Impact**: MEDIUM - Strategy may not be portable across environments.

**Likelihood**: HIGH

**Mitigation**:
1. Define minimum required Ollama models:
   ```yaml
   ollama_requirements:
     tier_2:
       required: ["deepseek-coder-v2:16b", "codellama:13b"]
       recommended: ["qwen2.5-coder:14b"]
     tier_3:
       required: ["qwen2.5-coder:7b", "llama3.2:3b"]
   ```

2. Document fallback behavior when required model missing:
   ```yaml
   fallback_policy:
     if_ollama_unavailable: "escalate_to_tier_1"  # Use Sonnet
     if_tier_model_missing: "use_tier_fallback"   # Use alternate model in same tier
   ```

3. Add environment detection:
   ```typescript
   export async function validateOllamaFleet(): Promise<ValidationResult> {
     const required = STRATEGY.ollama_requirements.tier_2.required
     const available = await getAvailableOllamaModels()
     const missing = required.filter(m => !available.includes(m))

     if (missing.length > 0) {
       logger.warn(`Missing Ollama models: ${missing.join(', ')}`)
       logger.warn('Falling back to Claude for Tier 2 tasks')
     }

     return { valid: missing.length === 0, missing }
   }
   ```

**Recommended**: Include minimum requirements and fallback policy in strategy.

---

### Risk 3: Cost Estimation Without Telemetry

**Description**: Cost projections may be inaccurate without real workflow telemetry data.

**Impact**: MEDIUM - Strategy may not achieve cost targets.

**Likelihood**: HIGH (INFR-0040 not yet complete)

**Mitigation**:
1. Document assumptions clearly:
   ```yaml
   cost_analysis:
     assumptions:
       - "Ollama available 95% of time"
       - "Average workflow: 5 tasks (2 Tier 3, 2 Tier 2, 1 Tier 1)"
       - "Claude pricing: Sonnet $3/M in, $15/M out; Haiku $0.25/M in, $1.25/M out"
       - "Ollama cost: $0 (local compute not tracked)"
     confidence: "LOW - based on estimates, not telemetry"
     review_trigger: "INFR-0040 complete + 50 workflows executed"
   ```

2. Start with conservative estimates (favor quality over cost):
   ```yaml
   initial_strategy:
     bias: "quality-first"
     rationale: "Establish baseline quality, then optimize cost with data"
   ```

3. Plan for strategy revision:
   ```yaml
   version_history:
     - version: "1.0.0"
       date: "2026-02-15"
       notes: "Initial strategy based on estimates"
     - version: "1.1.0"  # PLANNED
       date: "2026-03-15"
       notes: "Revised based on telemetry from INFR-0040"
   ```

**Recommended**: Use all three mitigations. Accept lower confidence initially, plan for data-driven revision.

---

### Risk 4: Provider Interface Changes

**Description**: MODL-0010 provider interfaces may change during implementation.

**Impact**: LOW - Strategy is documentation, can be updated easily.

**Likelihood**: MEDIUM

**Mitigation**:
1. Reference provider capabilities abstractly:
   ```yaml
   tier_0:
     models: ["anthropic/claude-opus-4.6"]  # Provider-prefixed
     provider_requirements:
       - supports_streaming: true
       - max_tokens: 200000
   ```

2. Stay in sync with MODL-0010:
   - Review MODL-0010 implementation artifacts before finalizing strategy
   - Share strategy draft with MODL-0010 implementer
   - Update strategy if provider interface changes

3. Version-lock provider interface:
   ```yaml
   provider_interface_version: "MODL-0010-v1"
   compatibility_notes: "Based on MODL-0010 design as of 2026-02-14"
   ```

**Recommended**: Coordinate review with MODL-0010 implementer before story completion.

---

## Implementation Notes

### Recommended Approach

**Phase 1: Research & Draft (2-3 story points)**
1. Read existing MODEL_STRATEGY.md
2. Review MODL-0010 artifacts (design doc, provider interfaces)
3. Analyze 100+ agent files for current model assignments
4. Draft tier definitions and task taxonomy
5. Create initial decision flowchart

**Phase 2: Validate & Iterate (2-3 story points)**
1. Schema validation (create Zod schema for strategy YAML)
2. Edge case analysis (Ollama down, budget exceeded, etc.)
3. Agent mapping analysis (identify discrepancies)
4. Cost impact analysis (with documented assumptions)
5. Share draft with MODL-0010 implementer for feedback

**Phase 3: Finalize & Document (1-2 story points)**
1. Write 5+ example scenarios
2. Create migration plan for misaligned agents
3. Document escalation triggers with graph analysis
4. Add version/review metadata
5. Final technical review

**Total Estimated Effort**: 5-8 story points

---

### Suggested Structure for WINT-0220-STRATEGY.md

```markdown
# Model-per-Task Strategy (WINT-0220)

## Overview
- Strategy version, effective date, review schedule
- Goals: cost optimization + quality preservation
- Principles: agent-first routing, tier-based selection, graceful degradation

## Model Tiers
- Tier 0: Critical Decision (Opus)
- Tier 1: Complex Reasoning (Sonnet)
- Tier 2: Routine Work (Ollama coding models)
- Tier 3: Simple Tasks (Ollama small models)

## Task Taxonomy
- Setup, Analysis, Generation, Validation, Decision, Completion
- Each type mapped to recommended tier with rationale

## Selection Criteria
- Decision flowchart (Mermaid diagram)
- Complexity assessment (AC count, keywords, criticality)
- Cost vs. quality trade-offs

## Escalation Triggers
- Quality thresholds (when to escalate to higher tier)
- Cost thresholds (when to de-escalate)
- Failure-based escalation (retry with more powerful model)
- Human-in-the-loop triggers

## Agent Mappings
- Current state analysis (100+ agents)
- Proposed tier assignments
- Migration plan for discrepancies
- Backward compatibility approach

## Cost Analysis
- Current cost estimate
- Proposed cost estimate
- Savings target (40-60%)
- Assumptions and confidence level

## Example Scenarios
- PM story generation
- Dev implementation
- QA verification
- Lint/format automation
- Gap analysis

## Integration
- MODL-0010 provider compatibility
- model-assignments.ts schema alignment
- Ollama fleet requirements (reference WINT-0240)

## Appendices
- Glossary of terms
- References to related stories
- Version history
```

---

### Configuration Format Recommendation

Use YAML for machine-readability + Markdown for human-readability:

```
packages/backend/orchestrator/docs/
  WINT-0220-STRATEGY.md        # Human-readable strategy document
  WINT-0220-STRATEGY.yaml      # Machine-readable configuration
```

**YAML Schema**:
```yaml
strategy_version: "1.0.0"
effective_date: "2026-02-15"
review_date: "2026-03-15"

tiers:
  - tier: 0
    name: "Critical Decision"
    models: ["anthropic/claude-opus-4.6"]
    criteria:
      complexity: "complex"
      criticality: "critical"
    fallback: "anthropic/claude-sonnet-4.5"

  - tier: 1
    name: "Complex Reasoning"
    models: ["anthropic/claude-sonnet-4.5"]
    criteria:
      complexity: "medium"
      criticality: "high"
    fallback: "anthropic/claude-haiku-3.5"

  - tier: 2
    name: "Routine Work"
    models: ["ollama/deepseek-coder-v2:16b", "ollama/codellama:13b"]
    criteria:
      complexity: "simple"
      criticality: "medium"
    fallback: "anthropic/claude-haiku-3.5"

  - tier: 3
    name: "Simple Tasks"
    models: ["ollama/qwen2.5-coder:7b", "ollama/llama3.2:3b"]
    criteria:
      complexity: "simple"
      criticality: "low"
    fallback: "ollama/deepseek-coder-v2:16b"

task_types:
  - type: "Setup"
    tier: 2
    rationale: "Routine initialization, low risk"

  - type: "Analysis"
    tier: 1
    rationale: "Requires reasoning about codebase"

  - type: "Generation"
    tier: 2
    rationale: "Code generation, routine work"

  - type: "Validation"
    tier: 3
    rationale: "Lint, format, simple checks"

  - type: "Decision"
    tier: 0
    rationale: "High-stakes decisions, complex trade-offs"

  - type: "Completion"
    tier: 3
    rationale: "Status updates, simple reporting"

escalation_triggers:
  quality:
    - trigger: "gate_failure"
      action: "escalate_one_tier"
      max_escalations: 2

    - trigger: "confidence_below_70"
      action: "human_review"

  cost:
    - trigger: "budget_80_percent"
      action: "de_escalate_tier_3_tasks"

    - trigger: "budget_95_percent"
      action: "pause_workflow"

  failure:
    - trigger: "task_retry_count_3"
      action: "escalate_to_tier_0"

    - trigger: "ollama_unavailable"
      action: "fallback_to_claude"

cost_analysis:
  current_estimate: "$0.50 per workflow (all Claude)"
  proposed_estimate: "$0.20 per workflow (hybrid)"
  savings_target: "60%"
  assumptions:
    - "Ollama available 95% of time"
    - "Average workflow: 5 tasks (2xT3, 2xT2, 1xT1)"
  confidence: "LOW - no telemetry data yet"
```

---

## Reuse Opportunities

### 1. Existing Components

| Component | Location | Reuse Potential |
|-----------|----------|-----------------|
| `model-assignments.ts` | `src/config/` | ✅ Schema consumer (extend, don't replace) |
| `llm-provider.ts` | `src/config/` | ✅ Ollama availability checks (30s cache) |
| `base.ts` (ILLMProvider) | `src/providers/` | ✅ Provider abstraction for tier models |
| Agent frontmatter parser | N/A (to be created) | ⚠️ Need to build for AC-4 validation |

### 2. Existing Patterns

- ✅ **YAML + TypeScript schema**: Use Zod for validation (already used in codebase)
- ✅ **Agent name → model mapping**: Preserve existing approach
- ✅ **Tier-based selection**: Informal pattern in MODEL_STRATEGY.md, formalize it
- ✅ **Graceful degradation**: Ollama → Claude fallback (already implemented)

### 3. Existing Packages

- `@repo/logger`: ✅ Log model selection decisions
- `zod`: ✅ Validate strategy YAML schema
- `yaml` (js-yaml): ✅ Parse strategy configuration
- `gray-matter`: ✅ Parse agent frontmatter (already in use)

**No new dependencies required** - all patterns and packages already exist.

---

## Dependency Management

### Blocking Dependencies

**None** - This is a Wave 1 story with no blocking dependencies.

### Informational Dependencies

| Story | Status | How It Affects WINT-0220 |
|-------|--------|--------------------------|
| MODL-0010 | in-progress | Strategy must align with provider interfaces |
| INFR-0040 | elaborated | Cost analysis limited without telemetry |

**Coordination Plan**:
1. Read MODL-0010 artifacts before finalizing strategy
2. Document cost analysis assumptions (revisit with INFR-0040 data)
3. Share strategy draft with MODL-0010 implementer for review

### Blocked Stories

| Story | How WINT-0220 Unblocks It |
|-------|---------------------------|
| WINT-0230 | Unified model interface needs strategy for routing logic |
| WINT-0240 | Ollama fleet config needs minimum model requirements |
| WINT-0250 | Escalation triggers need strategy-defined thresholds |

**Critical Path**: WINT-0220 blocks 3 Wave 2 stories. Prioritize completion.

---

## Quality Gates

### Pre-Completion Checklist

- [ ] All 8 ACs addressed in strategy document
- [ ] Schema validation script created and passing
- [ ] No circular dependencies in escalation logic (graph analysis)
- [ ] MODL-0010 implementer reviewed and approved alignment
- [ ] Cost analysis assumptions documented clearly
- [ ] Migration plan created for misaligned agents
- [ ] At least 5 example scenarios documented
- [ ] Technical review by 2+ team members

### Post-Completion Follow-Up

- [ ] Schedule strategy review for 1 month post-implementation
- [ ] Track actual cost savings vs. projections (when telemetry available)
- [ ] Monitor agent migration progress (100+ agents)
- [ ] Update strategy based on MODL-0040 leaderboard data

---

## Recommended Acceptance Criteria Adjustments

**No changes recommended** - All 8 ACs are feasible and well-scoped.

Optional enhancements (not required for story completion):
1. AC-9: Create interactive decision tree tool (web UI for strategy exploration)
2. AC-10: Automated agent tier assignment script (read frontmatter, suggest tier)

**Recommendation**: Keep optional enhancements as follow-up work to avoid scope creep.

---

## Feasibility Verdict

✅ **APPROVED FOR IMPLEMENTATION**

**Confidence**: HIGH

**Effort**: 5-8 story points (medium complexity documentation)

**Risks**: MEDIUM (mitigated with coordination plan and versioned strategy)

**Blockers**: None

**Recommendation**: Proceed with implementation. Coordinate with MODL-0010 implementer during Phase 2 validation.

---

**Reviewed By**: Dev Feasibility Agent
**Date**: 2026-02-14
**Next Review**: After strategy draft complete (Phase 2)
