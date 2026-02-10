---
schema: 2
command: pm-bootstrap-workflow
feature_dir: plans/future/review-fixes
prefix: REVI
project_name: review-fixes
created: 2026-02-01T00:00:00Z

raw_plan_file: plans/future/review-fixes/PLAN.md
raw_plan_summary: |
  # Workflow Hardening Improvements

  ## Objective

  Harden both the Claude workflow system (`docs/FULL_WORKFLOW.md`, `.claude/commands/`, `.claude/agents/`) and the LangGraph orchestrator (`packages/backend/orchestrator/`) to address gaps identified in agent builder review.

  ## Scope

  ### Target Systems

  1. **Claude Workflow** - Markdown-based command/agent system
     - `docs/FULL_WORKFLOW.md` - Master documentation
     - `.claude/commands/*.md` - Command orchestrators
     - `.claude/agents/*.agent.md` - Phase leaders and workers

  2. **LangGraph Orchestrator** - TypeScript-based graph execution
     - `packages/backend/orchestrator/src/graphs/` - Graph definitions
     - `packages/backend/orchestrator/src/nodes/` - Node implementations
     - `packages/backend/orchestrator/src/artifacts/` - Artifact schemas

  ## Key Improvements

  The plan addresses 8 major hardening initiatives:
  1. Error Contracts - Explicit error handling contracts between phases
  2. Parallel Worker Synchronization - Timeout handling and partial failure semantics
  3. Complete State Machine - Full 17-status state diagram with all transitions
  4. Token Budget Enforcement - Cost control with enforcement levels
  5. Idempotency Guarantees - Defined behavior on command re-runs
  6. Centralized Model Assignments - Source of truth for model/agent pairings
  7. Observability Section - Tracing, logging, and metrics guidance
  8. Testing Section - Guidance on testing new agents
---
