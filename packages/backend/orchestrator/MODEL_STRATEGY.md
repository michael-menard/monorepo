# Model Assignment Strategy - Ollama for Routine, Claude for Reasoning

## Strategy Overview

**Use Ollama (local, fast, cost-effective) for:**
- Code review (lint, syntax, style)
- Simple validation
- Data collection
- Artifact formatting
- Status updates

**Use Claude (powerful reasoning) for:**
- Gap analysis (PM, UX, QA perspectives)
- Decision making (readiness scoring, gates)
- Attack analysis (challenging assumptions)
- Synthesis (combining multiple analyses)
- Strategic planning

## Recommended Model Assignments

### Your Ollama Models

```bash
# Pull these models (in order of priority)
ollama pull deepseek-coder-v2:33b    # Best coding model you can run (requires ~20GB RAM)
ollama pull qwen2.5-coder:7b         # Fast, great quality, use for routine tasks
ollama pull codellama:13b            # Solid coding, use for mid-complexity
ollama pull llama3.2:8b              # Good general purpose

# Alternative if memory constrained:
# ollama pull deepseek-coder-v2:16b  # Lighter alternative to 33b (~10GB RAM)
```

### Model Assignment Configuration

Edit `.claude/config/model-assignments.yaml`:

```yaml
# ==============================================================================
# MODEL ASSIGNMENT STRATEGY
# ==============================================================================
# Ollama Models:
#   - ollama:qwen2.5-coder:7b         → Fast routine tasks (lint, syntax, formatting)
#   - ollama:codellama:13b            → Mid-complexity code analysis
#   - ollama:deepseek-coder-v2:33b    → Best coding model for complex generation (~20GB RAM)
#   - ollama:deepseek-coder-v2:16b    → Lighter alternative for complex code (~10GB RAM)
#   - ollama:llama3.2:8b              → General purpose analysis
#
# Claude Models:
#   - haiku  → Simple validation, status updates (fallback for Ollama)
#   - sonnet → Gap analysis, decision making, synthesis
#   - opus   → Critical strategic decisions (rarely used)
# ==============================================================================

# ==============================================================================
# SETUP LEADERS - Simple Validation
# Use Ollama for speed, fallback to haiku
# ==============================================================================
elab-setup-leader: ollama:qwen2.5-coder:7b
dev-setup-leader: ollama:qwen2.5-coder:7b
qa-verify-setup-leader: ollama:qwen2.5-coder:7b
pm-bootstrap-setup-leader: ollama:qwen2.5-coder:7b
pm-harness-setup-leader: ollama:qwen2.5-coder:7b
elab-epic-setup-leader: ollama:qwen2.5-coder:7b

# ==============================================================================
# WORK LEADERS - Gap Analysis & Decision Making
# KEEP ON CLAUDE SONNET - These require deep reasoning
# ==============================================================================
pm-story-generation-leader: sonnet    # Strategic story planning
pm-story-seed-agent: sonnet           # Initial story structure - reasoning required
pm-story-fix-leader: sonnet           # Problem diagnosis and fixing
pm-story-adhoc-leader: sonnet         # Ad-hoc analysis and decisions
pm-story-bug-leader: sonnet           # Bug analysis and root cause
pm-story-followup-leader: sonnet      # Follow-up decision making
pm-story-split-leader: sonnet         # Strategic story splitting
pm-triage-leader: sonnet              # Prioritization decisions
pm-bootstrap-analysis-leader: sonnet  # Initial analysis
elab-analyst: sonnet                  # Deep elaboration analysis
elab-epic-interactive-leader: sonnet  # Interactive epic planning
dev-implement-planning-leader: sonnet # Implementation strategy
dev-implement-implementation-leader: sonnet # Code generation orchestration
qa-verify-verification-leader: sonnet # Quality verification decisions

# ==============================================================================
# STORY WORKFLOW NODES - Gap Analysis & Decision Making
# KEEP ON CLAUDE SONNET - Core reasoning tasks
# ==============================================================================

# Gap Analysis - Requires deep reasoning about product, UX, and QA
story-fanout-pm: sonnet              # PM gap analysis - strategic thinking
story-fanout-ux: sonnet              # UX gap analysis - user empathy & design
story-fanout-qa: sonnet              # QA gap analysis - risk assessment

# Attack Analysis - Challenge assumptions, requires critical thinking
story-attack: sonnet                 # Red team analysis - adversarial reasoning

# Readiness Scoring - Multi-factor decision making
story-readiness-score: sonnet        # Complex scoring algorithm with judgment

# Synthesis - Combine multiple analyses coherently
story-synthesize: sonnet             # Synthesize PM, UX, QA insights

# Gap Hygiene - Quality checks on gaps
story-gap-hygiene: ollama:codellama:13b  # Can use mid-tier Ollama

# ==============================================================================
# PM WORKERS - Routine Tasks
# Use Ollama for speed
# ==============================================================================
pm-draft-test-plan: ollama:qwen2.5-coder:7b        # Template-based task
pm-dev-feasibility-review: ollama:codellama:13b    # Technical feasibility check
pm-uiux-recommendations: ollama:llama3.2:8b        # General UX suggestions

# ==============================================================================
# CODE REVIEW WORKERS - Routine Code Analysis
# Use Ollama for speed
# ==============================================================================
code-review-lint: ollama:qwen2.5-coder:7b           # Fast syntax checks
code-review-syntax: ollama:qwen2.5-coder:7b         # Fast syntax validation
code-review-style-compliance: ollama:qwen2.5-coder:7b  # Style guide enforcement
code-review-security: sonnet                         # KEEP ON CLAUDE - security requires deep analysis
code-review-typecheck: ollama:qwen2.5-coder:7b      # Type validation
code-review-build: ollama:qwen2.5-coder:7b          # Build verification

# ==============================================================================
# DEV IMPLEMENTATION WORKERS
# Mix of Ollama (routine) and Claude (complex)
# ==============================================================================
dev-implement-planner: sonnet                           # Strategic planning
dev-implement-plan-validator: ollama:codellama:13b      # Plan structure validation
dev-implement-backend-coder: ollama:deepseek-coder-v2:33b  # Complex code generation (use :16b if memory constrained)
dev-implement-frontend-coder: ollama:deepseek-coder-v2:33b # Complex code generation (use :16b if memory constrained)
dev-implement-contracts: ollama:qwen2.5-coder:7b        # Contract/interface definition
dev-implement-verifier: ollama:codellama:13b            # Verification logic
dev-implement-playwright: ollama:qwen2.5-coder:7b       # E2E test generation
dev-implement-proof-writer: ollama:llama3.2:8b          # Documentation
dev-implement-learnings: ollama:llama3.2:8b             # Extract learnings

# ==============================================================================
# EPIC ELABORATION WORKERS - Routine Analysis
# Use Ollama
# ==============================================================================
elab-epic-engineering: ollama:codellama:13b     # Technical feasibility
elab-epic-product: ollama:llama3.2:8b           # Product requirements extraction
elab-epic-qa: ollama:qwen2.5-coder:7b           # QA scenario generation
elab-epic-ux: ollama:llama3.2:8b                # UX considerations
elab-epic-platform: ollama:codellama:13b        # Platform implications
elab-epic-security: sonnet                       # KEEP ON CLAUDE - security analysis

# ==============================================================================
# COMPLETION LEADERS - Status Updates & Formatting
# Use Ollama for speed
# ==============================================================================
elab-completion-leader: ollama:qwen2.5-coder:7b
dev-documentation-leader: ollama:llama3.2:8b
qa-verify-completion-leader: ollama:qwen2.5-coder:7b
pm-bootstrap-generation-leader: ollama:qwen2.5-coder:7b
pm-harness-generation-leader: ollama:qwen2.5-coder:7b
elab-epic-aggregation-leader: ollama:llama3.2:8b
elab-epic-updates-leader: ollama:qwen2.5-coder:7b

# ==============================================================================
# UTILITY AGENTS - Routine Tasks
# Use Ollama
# ==============================================================================
knowledge-context-loader: ollama:qwen2.5-coder:7b
kb-writer: ollama:llama3.2:8b

# ==============================================================================
# FIX AGENTS - Problem Diagnosis
# KEEP ON CLAUDE - Requires reasoning
# ==============================================================================
dev-fix-fix-leader: sonnet

# ==============================================================================
# COMMITMENT GATE - Decision Making
# KEEP ON CLAUDE - Critical go/no-go decisions
# ==============================================================================
commitment-gate: sonnet
```

## Rationale

### Tasks That REQUIRE Claude (Sonnet)

These involve **multi-factor reasoning**, **strategic thinking**, or **critical decisions**:

1. **Gap Analysis** (`story-fanout-pm`, `story-fanout-ux`, `story-fanout-qa`)
   - Requires understanding stakeholder perspectives
   - Must identify non-obvious gaps and risks
   - Needs empathy and domain knowledge

2. **Attack Analysis** (`story-attack`)
   - Adversarial thinking to challenge assumptions
   - Requires creativity to find edge cases
   - Must think like a "red team"

3. **Readiness Scoring** (`story-readiness-score`)
   - Multi-dimensional scoring algorithm
   - Weighted decision making
   - Judgment calls on quality

4. **Synthesis** (`story-synthesize`)
   - Combine PM, UX, QA insights coherently
   - Resolve conflicts between perspectives
   - Create unified narrative

5. **Security Analysis** (`code-review-security`, `elab-epic-security`)
   - Threat modeling
   - Attack vector analysis
   - Risk assessment

### Tasks That Work Well on Ollama

These are **pattern-based**, **rule-following**, or **template-driven**:

1. **Code Review** (lint, syntax, style)
   - Follow predefined rules
   - Pattern matching
   - Deterministic checks

2. **Validation** (setup leaders, plan validators)
   - Check structure and format
   - Verify completeness
   - Simple logic

3. **Code Generation** (with deepseek-coder-v2:33b, or :16b for lighter systems)
   - Generate boilerplate
   - Follow patterns
   - Implement well-defined specs

4. **Documentation** (proof writers, learnings)
   - Format extraction
   - Template filling
   - Summarization

## Performance Comparison

| Task Type | Ollama (qwen2.5-coder:7b) | Claude Sonnet |
|-----------|---------------------------|---------------|
| Lint review | ~2s | ~5s |
| Gap analysis | ❌ Lower quality | ✅ High quality |
| Code generation | ~5s | ~8s |
| Decision making | ❌ Inconsistent | ✅ Reliable |
| Cost per 1M tokens | Free (local) | ~$3 |

## Environment Setup

### 1. Pull Ollama Models

```bash
# Start Ollama
ollama serve

# Pull models (in order of priority)
ollama pull deepseek-coder-v2:33b    # Best coding model you can run
ollama pull qwen2.5-coder:7b
ollama pull codellama:13b
ollama pull llama3.2:8b

# If you have memory constraints (<20GB available):
# ollama pull deepseek-coder-v2:16b  # Use instead of :33b
```

### 2. Configure Environment

`.env`:

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TEMPERATURE=0
OLLAMA_TIMEOUT_MS=60000

# Fallback to Claude when Ollama unavailable
OLLAMA_ENABLE_FALLBACK=true
OLLAMA_FALLBACK_MODEL=haiku
```

### 3. Verify Setup

```typescript
import { isOllamaAvailable, getLLMForAgent } from '@repo/orchestrator'

// Check Ollama
const available = await isOllamaAvailable()
console.log('Ollama available:', available)

// Check model assignments
const lintLLM = await getLLMForAgent('code-review-lint')
console.log('Lint uses:', lintLLM.provider, lintLLM.model)

const gapLLM = await getLLMForAgent('story-fanout-pm')
console.log('PM gap uses:', gapLLM.provider, gapLLM.model)
```

Expected output:
```
Ollama available: true
Lint uses: ollama { model: 'qwen2.5-coder', tag: '7b', fullName: 'qwen2.5-coder:7b' }
PM gap uses: claude sonnet
```

## Cost Savings Estimate

Based on typical usage:

| Workflow | With All Claude | With Hybrid | Savings |
|----------|----------------|-------------|---------|
| Story creation | ~$0.15 | ~$0.08 | 47% |
| Code review | ~$0.05 | ~$0.01 | 80% |
| Elaboration | ~$0.10 | ~$0.06 | 40% |

**Monthly estimate** (100 stories): ~$30 → ~$15 (50% reduction)

## Migration Notes

### Current State

The existing workflow nodes in `src/nodes/story/` use `createToolNode` and do **NOT** automatically integrate with the LLM provider system.

### To Enable Hybrid LLM

You have two options:

#### Option 1: Update Existing Nodes (Recommended)

Convert nodes to use `createLLMPoweredNode`:

```typescript
// BEFORE (in fanout-pm.ts)
export const fanoutPMNode = createToolNode(
  'fanout_pm',
  async (state) => {
    // Implementation that calls Claude externally
  }
)

// AFTER
export const fanoutPMNode = createLLMPoweredNode(
  { name: 'story-fanout-pm' },
  async (state, config) => {
    const llm = config.configurable?.llm

    if (llm?.provider === 'ollama') {
      // Use Ollama (though we configure this as sonnet anyway)
      const response = await llm.llm.invoke([...])
    } else {
      // Use Claude (configured in model-assignments.yaml)
      // Return signal for external Claude invocation
    }
  }
)
```

#### Option 2: Keep Current Implementation

Continue using Claude externally (via Claude Code) for gap analysis nodes. The model assignments above serve as documentation of the strategy, and will be used when nodes are migrated.

## Monitoring

Track which models are being used:

```typescript
import { getModelInfoForAgent } from '@repo/orchestrator'

const agents = [
  'code-review-lint',
  'story-fanout-pm',
  'story-attack',
  'dev-implement-backend-coder',
]

agents.forEach(agent => {
  const info = getModelInfoForAgent(agent)
  console.log(`${agent}: ${info.provider} - ${info.model}`)
})
```

## Summary

**Keep on Claude Sonnet (reasoning required):**
- ✅ Gap analysis (PM, UX, QA)
- ✅ Attack analysis
- ✅ Readiness scoring
- ✅ Synthesis
- ✅ Security analysis
- ✅ Decision making
- ✅ Strategic planning

**Move to Ollama (routine tasks):**
- ✅ Code review (lint, syntax, style)
- ✅ Validation
- ✅ Status updates
- ✅ Documentation
- ✅ Simple code generation
- ✅ Template filling
- ✅ Data collection

This strategy maximizes cost savings while preserving quality on critical reasoning tasks.
