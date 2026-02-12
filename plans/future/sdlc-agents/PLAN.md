# SDLC — Agent Roles & Decision Loops

## Goal

Formalize the virtual dev team as production-grade LangGraph agents with hard stage gates, budgets, confidence scoring, and auditability. This is the capstone epic — it consumes infrastructure, telemetry, model selection, and learning to create autonomous PO/PM/SM decision loops.

## Dependencies

- **INFRA:** Artifacts, events, state tracking in Postgres
- **MODL:** Model-agnostic execution via Task Contracts
- **TELE:** Dashboards and metrics for agent decisions
- **LEARN:** Pattern data and improvement proposals

## The Most Important Truth

A "team of agents" works only if you have:
- **Shared contracts** (schemas, templates, event types)
- **Hard stage gates** (no skipping, no exceptions)
- **Auditability** (every decision recorded with confidence and evidence)
- **A single source of truth** for work items (Postgres, not scattered YAML)
- **Budgets** (cost/time/retries — downgrade model or reduce scope if exceeded)

Without those, you get a noisy swarm that burns tokens and ships wrong solutions.

## Agent Org Chart

### Product
- **PO Agent:** Backlog priority, AC quality, scope boundaries, churn detection, stability prioritization
- **Intake Agent:** (future) Normalize requests, tag, ask clarifying questions

### Delivery
- **PM Agent:** Sequencing, dependencies, bottleneck detection, risk register, release planning
- **SM Agent:** WIP limits, blocked detection, ready queue health, cadence enforcement

### Engineering (existing, enhanced)
- **Architect Agent:** ADR-lite decisions, security/perf risk flags (exists as prototype)
- **Tech Lead Agent:** Implementation plan quality, convention enforcement (exists as prototype)
- **Implementation Subagents:** API, UI, DB, Infra, Tests, Observability (exist as prototypes)

### Quality (existing, enhanced)
- **QA Agent:** AC verification, gap logging (exists as prototype)
- **Release Agent:** (future) Changelog, telemetry verification, final checklist

## End-to-End Workflow

```
Stage 0: Intake → request.md
    Gate: request complete enough to write a story
Stage 1: PO Planning → epic.md + stories/*.md with AC + DoD + telemetry
    Gate: AC clear, scope bounded, telemetry hooks listed
Stage 2: Architecture → ADR + design.md
    Gate: high-risk areas addressed
Stage 3: Implementation → PR-ready diffs + tests + docs
    Gate: lint/typecheck/tests pass, diff size limits, no drive-by refactors
Stage 4: QA Verification → QA report + gap_found events
    Gate: no high-severity gaps
Stage 5: Release + Retro → release notes + dashboards + lessons
    Gate: human approves merge/deploy
```

## Machine-Readable PLAN.md Schema

Plans get YAML front matter with:
- `plan_id`, `plan_version`, `title`, `owner`
- `objectives` with success metrics
- `scope` (in/out)
- `roles` with responsibilities, inputs, outputs, guardrails
- `workflows` with stages, gates, telemetry events
- `events` catalog
- `metrics` and `alerts`
- `budgets` (max cost/day, max tokens/run, max retries/step)
- `learning_loop` config

Agents treat missing required sections as a **hard gate failure**.

## Guardrails

### Hard Budgets
- Max retries per step
- Max tokens per run
- Max USD per day/workflow
- Downgrade model or reduce scope if exceeded
- Emit `workflow.cost_limit_hit` event when limits are reached

### Confidence Scoring
- Every decision includes confidence 0..1
- Low confidence (< 0.7) escalates to stronger model
- Very low confidence (< 0.4) escalates to human
- Tracked via LERN calibration

### DecisionRecord (ADR-lite)
Every significant agent decision stored as an artifact:
- Decision, alternatives considered, evidence, confidence, outcome
- Override audit trail (human can override, recorded as event)

## Package Location

New LangGraph nodes:
```
packages/backend/orchestrator/src/nodes/
  sdlc/
    po-agent.ts            # PO decision loops
    pm-agent.ts            # PM sequencing + risk
    sm-agent.ts            # SM WIP + blocked detection
    decision-record.ts     # ADR-lite artifact creation
```
