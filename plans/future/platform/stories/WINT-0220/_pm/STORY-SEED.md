---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0220

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No knowledge base lessons loaded (KB context not yet migrated to new artifact system)

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Model Assignments System | `packages/backend/orchestrator/src/config/model-assignments.ts` | **Foundational** - TypeScript consumer for model-agent mappings |
| LLM Provider Factory | `packages/backend/orchestrator/src/config/llm-provider.ts` | **Foundational** - Hybrid Claude/Ollama support with fallback |
| Provider Adapters (MODL-0010) | `packages/backend/orchestrator/src/providers/` | **In Progress** - OpenRouter/Ollama/Anthropic base interfaces |
| Agent Files with Model Metadata | `.claude/agents/*.agent.md` | **Foundational** - 100+ agent files with `model:` frontmatter |
| MODEL_STRATEGY.md | `packages/backend/orchestrator/MODEL_STRATEGY.md` | **Reference** - Existing informal strategy documentation |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| MODL-0010 | Provider Adapters (OpenRouter/Ollama/Anthropic) | in-progress | **Blocks WINT-0220** - Base provider interfaces needed |

### Constraints to Respect

1. **No Knowledge Base Migration Yet**: KB artifact migration (kb-artifact-migration epic) is future work. Cannot assume KB lessons are available in YAML format.
2. **Provider Adapters In-Flight**: MODL-0010 is actively being implemented. Must coordinate on provider interface design.
3. **Existing Agent Files**: 100+ agent files already have `model:` frontmatter (haiku/sonnet/opus). Strategy must preserve this metadata.
4. **Ollama Local Infrastructure**: Ollama is already set up and documented in MODEL_STRATEGY.md. Strategy must leverage this.
5. **No Breaking Changes**: Existing agent invocations via Claude Code must continue working during transition.

---

## Retrieved Context

### Related Endpoints
N/A - This is a platform/infrastructure story, not an API endpoint story.

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| Model Assignments Config | `src/config/model-assignments.ts` | TypeScript consumer for YAML model assignments |
| LLM Provider Config | `src/config/llm-provider.ts` | Provider factory with Ollama availability checks |
| Provider Base Interface | `src/providers/base.ts` | ILLMProvider interface for all providers |
| Ollama Provider | `src/providers/ollama.ts` | Ollama adapter implementation |
| OpenRouter Provider | `src/providers/openrouter.ts` | OpenRouter adapter (200+ models) |
| Anthropic Provider | `src/providers/anthropic.ts` | Direct Anthropic API adapter |
| Model Strategy Docs | `MODEL_STRATEGY.md` | Existing informal strategy |

### Reuse Candidates

1. **Existing Model Selection Logic**: `getModelForAgent()`, `parseOllamaModel()`, `suggestModel()` in `model-assignments.ts`
2. **Availability Checking**: `isOllamaAvailable()` with 30s cache TTL in `llm-provider.ts`
3. **Provider Abstractions**: `ILLMProvider` interface from `base.ts`
4. **Agent Frontmatter Pattern**: Existing `model:` field in all agent files
5. **Cost Optimization Framework**: Documented in MODEL_STRATEGY.md (50% cost reduction target)

---

## Knowledge Context

### Lessons Learned
*Note: KB lessons not yet migrated to YAML artifacts. Using codebase and documentation analysis instead.*

### Blockers to Avoid (from past stories)
- **Over-engineering model selection**: Keep it simple - agent name → model mapping is sufficient for MVP
- **Ignoring local development**: Ollama fallback to Claude is critical when Ollama unavailable
- **Breaking existing workflows**: Claude Code invocations must continue working during migration
- **Assuming uniform capabilities**: Different models have different strengths (reasoning vs speed vs cost)

### Architecture Decisions (ADRs)
*Note: No ADRs currently cover model selection strategy. This story will inform future ADR.*

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | No existing ADRs apply | This story will establish model-per-task strategy |

### Patterns to Follow
- **Configuration as Code**: Use YAML + TypeScript schemas (following existing pattern)
- **Graceful Degradation**: Ollama → Claude fallback when local unavailable
- **Cost Optimization**: Route simple tasks (lint, validation) to free local models
- **Quality Preservation**: Keep complex reasoning (gap analysis, decisions) on Claude Sonnet
- **Cache Availability Checks**: 30s TTL to avoid hammering Ollama server
- **Agent-Based Routing**: Use agent name as primary routing key (not task type)

### Patterns to Avoid
- **Runtime Model Selection**: Don't compute model at runtime - use static configuration
- **Per-Task Type Routing**: Too coarse - different agents of same type need different models
- **Ignoring Model Characteristics**: Don't treat all models as equivalent
- **Hard-Coding Model Names**: Keep configuration external and version-controlled

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Define Model-per-Task Strategy

### Description

**Context**: The WINT (Workflow Intelligence) epic aims to build a sophisticated AI-powered workflow system. A critical foundation is defining which AI model should handle each type of task. Currently, we have:
- 100+ agent files with informal `model:` frontmatter (haiku/sonnet/opus)
- Ollama local infrastructure for fast, cost-effective models
- MODEL_STRATEGY.md with informal guidelines
- Provider adapters (MODL-0010) being implemented

**Problem**: Without a formal, documented model-per-task strategy, we risk:
- Inefficient cost allocation (using expensive models for simple tasks)
- Inconsistent quality (using weak models for complex reasoning)
- Migration complexity when scaling to 200+ agents
- No clear escalation path for quality vs. cost trade-offs

**Proposed Solution**: Define and document a comprehensive model-per-task strategy that:
1. Maps each task type to optimal model tier (Opus, Sonnet, Haiku, Ollama variants)
2. Establishes decision criteria (reasoning complexity, criticality, cost sensitivity)
3. Documents escalation triggers (when to use more powerful/expensive models)
4. Provides migration path from current informal system to formal strategy
5. Integrates with emerging provider adapter system (MODL-0010)

**Key Design Principles**:
- **Agent-First Routing**: Use agent name as primary routing key (granular control)
- **Tier-Based Selection**: Define clear tiers (Critical/Complex/Routine/Simple)
- **Cost Optimization**: Default to free local models where quality sufficient
- **Quality Gates**: Preserve Claude Sonnet/Opus for reasoning-critical tasks
- **Graceful Degradation**: Ollama → Claude fallback when local unavailable
- **Versioned Configuration**: YAML-based, version-controlled mappings

### Initial Acceptance Criteria

- [ ] **AC-1: Strategy Document Created**
  - WINT-0220-STRATEGY.md document exists in `packages/backend/orchestrator/docs/`
  - Defines 4 model tiers with clear selection criteria
  - Documents escalation triggers for quality vs. cost trade-offs
  - Includes decision flowchart for model selection

- [ ] **AC-2: Task Taxonomy Defined**
  - All workflow tasks categorized into types (Setup, Analysis, Generation, Validation, Decision, Completion)
  - Each task type mapped to recommended model tier
  - Rationale documented for each mapping
  - Edge cases and exceptions documented

- [ ] **AC-3: Model Tier Specifications**
  - **Tier 0 (Critical Decision)**: Opus 4.6 - high-stakes decisions, complex multi-factor reasoning
  - **Tier 1 (Complex Reasoning)**: Sonnet 4.5 - gap analysis, synthesis, strategic planning
  - **Tier 2 (Routine Work)**: Ollama (deepseek-coder-v2, codellama) - code generation, validation
  - **Tier 3 (Simple Tasks)**: Ollama (qwen2.5-coder, llama3.2) - lint, formatting, status updates
  - Fallback model defined for each tier when primary unavailable

- [ ] **AC-4: Agent Mappings Validated**
  - All 100+ existing agent `model:` frontmatter reviewed
  - Discrepancies between current assignments and strategy documented
  - Migration plan for misaligned agents created
  - Backward compatibility approach defined

- [ ] **AC-5: Escalation Triggers Defined**
  - Quality threshold triggers documented (when to escalate from Tier 3 → 2 → 1 → 0)
  - Cost threshold triggers documented (when to de-escalate for budget constraints)
  - Failure-based escalation (retry failed task with more powerful model)
  - Human-in-the-loop triggers (when to pause for human decision)

- [ ] **AC-6: Integration with Provider System**
  - Strategy aligns with MODL-0010 provider adapter interfaces
  - Configuration format compatible with existing `model-assignments.ts`
  - Migration path from informal MODEL_STRATEGY.md to formal strategy
  - No breaking changes to existing agent invocations

- [ ] **AC-7: Cost Impact Analysis**
  - Estimated cost per workflow with current informal strategy
  - Projected cost per workflow with formal strategy
  - Cost savings estimate (target: 40-60% reduction)
  - Quality impact assessment (no degradation on critical tasks)

- [ ] **AC-8: Example Scenarios Documented**
  - At least 5 real workflow scenarios with model selection walkthrough
  - Edge cases covered (Ollama unavailable, budget exceeded, quality failure)
  - Decision rationale explained for each scenario
  - Comparison with current informal approach

### Non-Goals

- **Implementing Auto-Selection Logic**: This story defines strategy, not implementation (WINT-0230 will create unified interface)
- **Building Model Leaderboards**: Quality evaluation is MODL-0030/0040 scope
- **Configuring Ollama Fleet**: Ollama setup is WINT-0240 scope
- **Creating Escalation Automation**: Trigger implementation is WINT-0250 scope
- **Migrating All Agents**: Strategy definition only - migration is follow-up work
- **Adding New Providers**: Provider adapters are MODL-0010 scope
- **Cost Tracking Implementation**: Telemetry is separate epic (TELE)

### Reuse Plan

- **Components**:
  - Existing `model-assignments.ts` schema and loader
  - `MODEL_SELECTION_CRITERIA` from `model-assignments.ts`
  - Agent frontmatter pattern (`model:` field)

- **Patterns**:
  - YAML configuration with TypeScript schema validation
  - Agent name → model mapping approach
  - Tier-based model selection (already informal in MODEL_STRATEGY.md)
  - Ollama → Claude fallback pattern

- **Packages**:
  - `@repo/logger` for decision logging
  - `zod` for strategy schema validation
  - `yaml` for configuration parsing

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Focus Area**: Validate strategy document completeness and consistency
- **Test Scenarios**:
  - All task types have model assignments
  - No circular dependencies in escalation triggers
  - Cost projections are realistic (compare with actual workflow telemetry when available)
  - Edge cases covered (Ollama down, budget exceeded, quality failure)
- **Validation Approach**: Manual review checklist + automated schema validation
- **Key Risk**: Strategy too complex to understand/apply - test with sample agent mappings

### For UI/UX Advisor
- **Not Applicable**: This is a pure technical strategy story with no UI component
- **Future Consideration**: WINT-0260 (cost tracking) and AUTO epic (dashboard) will have UX needs

### For Dev Feasibility
- **Integration Points**:
  - Must align with MODL-0010 provider adapter interfaces (coordinate with that story)
  - Must be compatible with existing `model-assignments.ts` schema
  - Must not break existing agent file frontmatter
- **Technical Risks**:
  - Strategy may be too rigid - need flexibility for experimentation
  - Ollama model availability varies by machine (document minimum required models)
  - Cost estimation requires telemetry data that may not exist yet
- **Implementation Notes**:
  - Start with conservative mappings (can optimize later with data)
  - Document assumptions clearly (can revisit with MODL-0040 leaderboards)
  - Keep strategy versioned (may need multiple strategies for different use cases)
- **Dependency Management**:
  - Block WINT-0230 until strategy defined
  - Coordinate with MODL-0010 on provider interface design
  - May inform WINT-0240 Ollama fleet configuration

---

**Story Seed Generated**: 2026-02-14
**Baseline Reality**: 2026-02-13
**Knowledge Base**: Not yet migrated (relying on codebase analysis)
**Blocking Dependencies**: None (Wave 1 story)
**Blocked Stories**: WINT-0230, WINT-0240, WINT-0250
