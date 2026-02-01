---
schema: 2
command: pm-bootstrap-workflow
feature_dir: plans/future/flow-convergence
prefix: FLOW
project_name: flow-convergence
created: "2026-01-31T00:00:00Z"

raw_plan_file: plans/future/flow-convergence/PLAN.md
raw_plan_summary: |
  MVP Plan: Knowledge-Driven Story Creation & Elaboration
  (with Reality Intake, Explicit Phase Contracts, and Convergence-Focused Metrics)

  Bootstrap Configuration:
  - Prefix: FLOW
  - Track 1 Start: FLOW-1000 (Claude Code workflow updates)
  - Track 2 Start: FLOW-2000 (LangGraph node implementations)

  Track 1: Claude Code Workflow (FLOW-1000 series)
  Updates to .claude/commands/ and .claude/agents/ to implement:
  - Reality Intake phase
  - Phase contracts in elaboration
  - Delta-only elaboration
  - Convergence metrics tracking
  - Commitment boundary gates

  Track 2: LangGraph Implementation (FLOW-2000 series)
  Build graph nodes in packages/backend/orchestrator/:
  - Reality Intake sub-graph
  - Story creation nodes (story.seed, story.fanout.*, story.attack, story.synthesize)
  - Elaboration nodes (delta-only)
  - Metrics collection integration

  Core Principle (Non-Negotiable):
  We do not optimize for fewer cycles. We optimize for fewer surprises *after
  commitment*. All metrics, gates, and reviews exist to enforce this boundary.
---
