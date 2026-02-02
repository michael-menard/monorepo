schema: 2
command: pm-bootstrap-workflow
feature_dir: "/Users/michaelmenard/Development/Monorepo/plans/future/flow-sync"
prefix: "FLOW"
project_name: "flow-sync"
created: "2026-02-01T00:00:00Z"

raw_plan_file: "/Users/michaelmenard/Development/Monorepo/plans/future/flow-sync/PLAN.md"
raw_plan_summary: |
  # LangGraph Workflow Alignment Plan

  ## Overview

  Align the LangGraph orchestrator with recent Claude workflow changes:
  1. Simplified story state model (single `state` enum)
  2. Knowledge Base integration for read/write
  3. YAML artifact schemas (matching Claude workflow)
  4. PostgreSQL persistence with pgvector

  ---

  ## Phase 1: State Model Simplification

  ### Current State
  - `GraphState` uses `routingFlags` for control flow
  - Story state managed externally via markdown files
  - No direct integration with database state
