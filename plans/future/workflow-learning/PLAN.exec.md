# Workflow Intelligence Program — Execution Guidelines

## Package Locations

| Component | Location | Epic |
|-----------|----------|------|
| Orchestrator | `packages/backend/orchestrator/src/` | All |
| Provider Adapters | `packages/backend/orchestrator/src/providers/` | MODL |
| Model Selector | `packages/backend/orchestrator/src/model-selector/` | MODL |
| Quality Evaluator | `packages/backend/orchestrator/src/quality/` | MODL |
| Audit Nodes | `packages/backend/orchestrator/src/nodes/audit/` | AUDT |
| Audit Graph | `packages/backend/orchestrator/src/graphs/code-audit.ts` | AUDT |
| Audit Artifacts | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | AUDT |
| Learning Nodes | `packages/backend/orchestrator/src/nodes/learning/` | LERN |
| Optimization Nodes | `packages/backend/orchestrator/src/nodes/optimization/` | LERN |
| Telemetry Hooks | `packages/core/telemetry-hooks/src/` | TELE |
| Event SDK | `packages/core/workflow-events/src/` | INFR |
| DB Migrations | `packages/backend/database-schema/src/migrations/` | INFR |
| Agents (prototypes) | `.claude/agents/` | All |
| Commands | `.claude/commands/` | All |

## Coding Standards

### LangGraph Nodes

All nodes follow this pattern:

```typescript
import type { CodeAuditState } from '../../graphs/code-audit.js'

export async function myNodeName(state: CodeAuditState): Promise<Partial<CodeAuditState>> {
  // Pure code logic (Tier 0) or model call via Task Contract
  return {
    // Only return changed state fields
  }
}
```

### Model-Assisted Nodes

When a node needs a model, use `createModelNode`:

```typescript
import { createModelNode } from '../../model-selector/index.js'

export const calibrationNode = createModelNode({
  taskContract: {
    task_id: 'learning.calibration',
    requirements: {
      structured_output: true,
      reasoning_depth: 'moderate',
      code_understanding: 'none',
    },
    budget: {
      max_cost_usd: 0.005,
      max_latency_ms: 30000,
      min_quality_score: 0.7,
    },
  },
  execute: async (input, model) => {
    const response = await model.invoke(prompt)
    return CalibrationResultSchema.parse(response)
  },
})
```

### Provider Adapters

All providers implement:

```typescript
const ProviderResponseSchema = z.object({
  content: z.string(),
  model: z.string(),
  tokens_in: z.number(),
  tokens_out: z.number(),
  latency_ms: z.number(),
  cost_usd: z.number(),
  provider: z.string(),
})
```

### Zod Schemas

All data types use Zod schemas with `z.infer<>`. Never use TypeScript interfaces (per CLAUDE.md).

### KB Entries

All KB writes must include:
- `story_id` tag
- `category` tag (retro, calibration, pattern, feedback, proposal, model_score, audit_finding)
- `date:YYYY-MM` tag
- `source:{epic}-{component}` tag

## Artifact Naming Conventions

| Artifact Type | Pattern | Example |
|---------------|---------|---------|
| Story files | `{PREFIX}-{NNN}.md` | `INFR-001.md` |
| Agent files | `{function}.agent.md` | `audit-security.agent.md` |
| Output files | `{TYPE}-{date}.yaml` | `FINDINGS-2026-02-11.yaml` |
| Leaderboard | `MODEL-LEADERBOARD.yaml` | `plans/audit/MODEL-LEADERBOARD.yaml` |
| Dashboards | `{name}.json` | `apps/telemetry/dashboards/story-velocity.json` |

## Reuse Gates

### Must Reuse
- KB tools (`kb_search`, `kb_add`, etc.)
- Existing LangGraph patterns from `packages/backend/orchestrator/`
- Provider adapters (never call APIs directly from nodes)
- Quality evaluator (always score model outputs)
- Event SDK for telemetry

### Must Not
- Hard-code model assignments in nodes
- Duplicate existing KB functionality
- Create parallel logging systems
- Bypass the Model Selector for model calls
- Call provider APIs directly from application nodes

## Testing Requirements

### Per-Story
- [ ] LangGraph node compiles and type-checks
- [ ] Zod schemas validate with test fixtures
- [ ] Tests exist and pass (min 80% coverage for new code)
- [ ] No hard-coded model assignments
- [ ] KB integration uses standard patterns

### Per-Epic
- [ ] INFR: Events flow end-to-end, artifacts persist and retrieve
- [ ] AUDT: Full audit pipeline produces FINDINGS.yaml
- [ ] MODL: Model selector operates with 3+ providers, leaderboard tracks
- [ ] TELE: Dashboards render from real events, alerts fire
- [ ] LERN: Learning loop completes with 3+ models, proposals generated
- [ ] SDLC: Agent roles execute within budgets, DecisionRecords written

## Rollback Procedures

### Provider Rollback
If a provider is down, selector automatically falls back to next provider. If all providers fail, nodes return error state (non-fatal, use Tier 0 fallback).

### Model Selection Rollback
```typescript
await leaderboard.reset('audit.lens.security')  // Reset for task
await selector.override('audit.lens.security', 'anthropic/claude-3.5-sonnet')  // Force model
```

### Audit Rollback
```bash
rm plans/audit/FINDINGS-2026-02-11.yaml  # Remove latest
# persist-trends reads all remaining FINDINGS files to regenerate
```

## Observability

### Key Metrics

| Metric | Source | Frequency | Epic |
|--------|--------|-----------|------|
| Model quality scores | Quality evaluator | Per-invocation | MODL |
| Model cost tracking | Provider response | Per-invocation | MODL |
| Leaderboard convergence | Model selector | Per-invocation | MODL |
| Audit finding count | FINDINGS.yaml | Per-audit | AUDT |
| Finding precision | Human feedback | Weekly | AUDT |
| Story velocity | workflow_events | Per-story | TELE |
| Calibration drift | CALIBRATION.yaml | Weekly | LERN |
| Proposal acceptance | Proposal tracking | Monthly | LERN |

### Alerts

| Condition | Severity | Action |
|-----------|----------|--------|
| Provider API failure | Warning | Automatic fallback |
| Quality score < 0.5 | Warning | Increase exploration |
| All providers down | Critical | Use Tier 0 only |
| Gate pass rate drops >10% | Critical | Disable adaptation |
| Story churn >3 cycles | Warning | Risk predictor flag |
