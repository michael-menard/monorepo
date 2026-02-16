# Workflow Intelligence Program — Architecture & Principles

## Architecture Principles

### 1. LangGraph is the Production Target

Claude Code agents (`.claude/agents/*.agent.md`) are prototypes that capture workflow logic. Every agent maps to a LangGraph node. The migration path is one-directional:

```
Claude Code Agent → Prototype/Spec → LangGraph Node → Production
```

Do not invest in Claude Code-specific infrastructure. Build for LangGraph.

### 2. Model Choice is a Learned Parameter

Never hard-code model assignments. Each node declares a Task Contract (what it needs), and the Model Selector learns the best model through experimentation.

```
WRONG: createToolNode({ model: 'claude-sonnet', ... })
RIGHT: createModelNode({ taskContract: { reasoning_depth: 'deep', max_cost: 0.05 }, ... })
```

### 3. Events are the Source of Truth

Structured workflow events feed everything: dashboards, learning, decisions. See INFR epic for the 5 core + 6 learning events.

### 4. Postgres is the Brain

Three-tier storage:
- **Postgres** (relational + JSONB): artifacts, events, state
- **MinIO/S3**: large blobs (> 500KB)
- **pgvector**: KB embeddings for semantic search

No MongoDB. See INFR epic for schema details.

### 5. Code First, Models Later

Start with code-only (Tier 0) implementations. Add model assistance only when code can't do the job. The multi-armed bandit will naturally find the cheapest model that meets quality thresholds.

```
Tier 0: Pure code (regex, AST, file matching) — free, fast, deterministic
Tier 1: Add model via Task Contract — bandit finds cheapest option
Tier 2: Upgrade budget if cheap models fail quality threshold
```

### 6. Proposals Over Auto-Changes

All learning outputs are proposals first. No automatic modification of agent prompts, workflow configuration, decision thresholds, or model assignments. Human approval required for structural changes.

### 7. Measurable Impact

Every component has success metrics with before/after comparisons, statistical significance requirements, rollback triggers, and cost tracking per model per task.

## System Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Application Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Audit   │  │ Learning │  │   Self-  │  │   SDLC   │            │
│  │  Engine  │  │   Loop   │  │  Optim.  │  │  Agents  │            │
│  │ (AUDT)   │  │ (LERN)   │  │ (LERN)   │  │ (SDLC)   │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       └──────────────┼──────────────┼──────────────┘                 │
│                      │              │                                 │
│  ┌───────────────────▼──────────────▼────────────────────────────┐   │
│  │                    Model Layer (MODL)                          │   │
│  │  Task Contracts → Model Selector (Bandit) → Quality Eval      │   │
│  │                         │                                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │   │
│  │  │OpenRouter│  │  Ollama  │  │Anthropic │                   │   │
│  │  └──────────┘  └──────────┘  └──────────┘                   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │              Observability Layer (TELE)                        │   │
│  │  OTel → Prometheus → Grafana → Alerts                        │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │              Infrastructure Layer (INFR)                       │   │
│  │  Postgres (artifacts + events) │ MinIO/S3 │ pgvector (KB)    │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Postgres Schema Separation

| Schema | Purpose | Epic |
|--------|---------|------|
| `work.*` | Artifacts, artifact_versions, artifact_links | INFR |
| `telemetry.*` | Workflow events, run metrics | INFR, TELE |
| `ai.*` | Model leaderboards, experiment results | MODL |
| `kb.*` | Knowledge base entries, embeddings | LERN |

## Cross-Epic Data Flow

```
Story Execution → OUTCOME.yaml → Retro Agent (WKFL-001)
                                      │
              ┌───────────────────────┼────────────────────┐
              ▼                       ▼                    ▼
        workflow_events         KB entries            artifacts
         (INFR-004)           (existing)            (INFR-001)
              │                    │                     │
    ┌─────────┼─────────┐         │              ┌──────┘
    ▼         ▼         ▼         ▼              ▼
  TELE      LERN      SDLC     MODL           AUDT
dashboards  mining    agents   evaluator      findings
```

## Task Contract Schema (v1)

```typescript
const TaskContractSchema = z.object({
  task_id: z.string(),
  input_schema: z.any(),
  output_schema: z.any(),
  requirements: z.object({
    structured_output: z.boolean().default(true),
    code_understanding: z.enum(['none', 'basic', 'deep']),
    reasoning_depth: z.enum(['shallow', 'moderate', 'deep']),
    context_window_min: z.number().default(4096),
  }),
  budget: z.object({
    max_cost_usd: z.number(),
    max_latency_ms: z.number(),
    min_quality_score: z.number(),
  }),
})
```

## Security Considerations

### Provider API Keys
- OpenRouter: `OPENROUTER_API_KEY` env var, never committed
- Anthropic: `ANTHROPIC_API_KEY` env var
- Ollama: No key needed (local)

### Data Privacy
- Ollama: All data stays local
- OpenRouter: Check model provider data policies
- No PII in KB entries (story IDs, not user names)
- Do not send production credentials to any model

### Experiment Safety
- Experiments cannot modify production data
- Rollback always available
- Learning components cannot break core workflow

## Glossary

| Term | Definition |
|------|------------|
| Task Contract | Node-level declaration of what a model must do (not which model) |
| Model Selector | Multi-armed bandit that picks the best model for a Task Contract |
| Provider | Adapter for a model hosting service (OpenRouter, Ollama, Anthropic) |
| Leaderboard | Per-task quality/cost/latency tracking |
| Convergence | When the bandit has high confidence in the best model for a task |
| Quality Evaluator | Automatic scoring of model outputs |
| DecisionRecord | ADR-lite artifact for significant agent decisions |
| Tier 0 | Code-only, no model needed |
| Tier 1-3 | Model-assisted at increasing cost/capability |
| Flywheel | Self-reinforcing improvement cycle |
