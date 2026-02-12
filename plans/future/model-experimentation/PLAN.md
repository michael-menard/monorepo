# MODL — Model Experimentation Platform

## Goal

Build a model-agnostic runtime where LangGraph nodes declare what they need (Task Contracts) and a multi-armed bandit learns which model is best for each task. Supports OpenRouter (200+ models), Ollama (local/free), and Anthropic direct.

## Why This Matters

Currently every agent hard-codes a model (sonnet, haiku). We have zero evidence for whether those are the right choices. This epic builds the infrastructure to:
- Try any model from any provider
- Automatically evaluate output quality
- Track cost, latency, and quality per model per task
- Converge on optimal model selection through experimentation

## Architecture

```
LangGraph Node
    |
    v
Task Contract (what the node needs)
    |
    v
Model Selector (multi-armed bandit)
    |
    +---> Provider Adapter ---> OpenRouter (Claude, GPT, Llama, Mistral, Qwen, DeepSeek, ...)
    +---> Provider Adapter ---> Ollama (local Llama, Qwen Coder, Mistral, ...)
    +---> Provider Adapter ---> Anthropic Direct (Sonnet, Haiku, Opus)
    |
    v
Quality Evaluator (was the output good enough?)
    |
    v
Leaderboard (track quality/cost/latency per model per task)
```

## Key Concepts

### Task Contract
Node declares requirements, not a model:
- `reasoning_depth`: shallow | moderate | deep
- `code_understanding`: none | basic | deep
- `structured_output`: true/false
- `max_cost_usd`: budget ceiling
- `max_latency_ms`: time ceiling
- `min_quality_score`: quality floor

### Multi-Armed Bandit
- **Exploration** (first 20 runs): round-robin across eligible models
- **Exploitation** (after 20 runs): Thompson Sampling weighted by quality and cost
- **Convergence** (95%+ confidence): reduce exploration to 5%, lock to best
- **Continuous monitoring**: alert on quality degradation > 10%

### Node Factory
```typescript
const securityNode = createModelNode({
  taskContract: securityLensContract,
  execute: async (input, model) => {
    const response = await model.invoke(prompt)
    return securityLensOutputSchema.parse(response)
  },
})
// Selector picks the model at runtime
```

## Package Location

```
packages/backend/orchestrator/src/
  providers/
    base.ts            # Abstract provider interface
    openrouter.ts      # OpenRouter adapter
    ollama.ts          # Ollama adapter
    anthropic.ts       # Anthropic direct adapter
    index.ts           # Factory

  model-selector/
    contracts.ts       # Task Contract schema
    selector.ts        # Multi-armed bandit
    registry.ts        # Model capability catalog
    leaderboard.ts     # Per-task tracking
    reports.ts         # Report generation
    index.ts           # createModelNode() factory

  quality/
    evaluator.ts       # Evaluation pipeline
    baseline.ts        # Reference comparison
    scoring.ts         # Composite scoring
```
