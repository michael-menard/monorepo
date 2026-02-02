---
schema: 2
command: pm-bootstrap-workflow
feature_dir: "plans/future/flow-update"
prefix: "FLOW"
project_name: "flow-update"
created: "2026-02-01T12:50:00Z"
raw_plan_file: "plans/future/flow-update/PLAN.md"
---

# Agent Context for flow-update Feature

## Raw Plan Summary

You are working in my monorepo's Claude workflow system. I have already refactored PM story generation and Elab into a structured "phase leader" pattern. I now want you to refactor the **Dev → Code Review → QA Verify cycle** the same way to reduce token usage, reduce re-reading, and make retries artifact-driven.

IMPORTANT: Before implementing, you MUST perform an **audit of current commands and agents** and propose a reconfiguration that better fits the new flow. Do not blindly preserve legacy structure if it conflicts with the new evidence-first design.

## Key Constraints

- Preserve existing user-facing commands and semantics as much as possible:
  - `/dev-implement-story STORY-XXX` remains the main entry point
  - `/dev-code-review STORY-XXX` remains available as standalone
  - `/qa-verify-story STORY-XXX` remains available
- Token savings is the primary goal: minimize reads per phase, use structured artifacts
- Commands mutate story state; "skills" produce evidence only
- New artifacts must be deterministic, diff-friendly, and short
- Prefer YAML for artifacts (human + machine readable)

## High-Level Objectives

1. Audit existing dev/review/qa infrastructure
2. Propose refactored command/agent architecture
3. Introduce Evidence Bundle v1 as single source of truth
4. Integrate lessons learned and ADR constraints
5. Refactor `/dev-implement-story`, `/dev-code-review`, `/qa-verify-story` with phase leaders
6. Reduce token usage through targeted reads and structured artifacts

## Analysis Summary

**Analyzed**: 2026-02-01T12:50:00Z

### Extracted Metrics
- **Total Stories**: 22
- **Phases**: 5 (Audit, Shared Infrastructure, Dev Refactor, Review Refactor, QA Refactor)
- **Critical Path**: 13 stories
- **Max Parallelization**: 4 stories at once
- **Sizing Warnings**: 4 stories flagged as potentially complex

### Phase Breakdown
- Phase 0 (Audit & Analysis): 2 stories
- Phase 1 (Shared Infrastructure): 5 stories
- Phase 2 (Dev Implementation Refactor): 7 stories
- Phase 3 (Code Review Refactor): 4 stories
- Phase 4 (QA Verify Refactor): 4 stories

### Critical Path Stories
FLOW-001 → FLOW-002 → FLOW-005 → FLOW-007 → FLOW-008 → FLOW-009 → FLOW-010 → FLOW-014 → FLOW-011 → FLOW-019 → FLOW-020 → FLOW-021 → FLOW-022

### High-Risk Items
1. **RISK-001 (High)**: Story context re-reading consumes 30-40% tokens
2. **RISK-002 (High)**: Evidence bundle schema verbosity risk
3. **RISK-007 (High)**: Migration path must maintain working system

### Stories with Sizing Warnings
- FLOW-009: Dev Execute Leader (complex orchestration)
- FLOW-013: Update Review Workers (multiple workers to modify)
- FLOW-016: QA Verify Verification Leader (core QA logic)
- FLOW-022: End-to-End Integration Testing (full workflow validation)

## Initial Checkpoint

Feature directory: `/Users/michaelmenard/Development/Monorepo/plans/future/flow-update`
Story prefix: `FLOW`
Bootstrap phase: Complete
Analysis phase: Complete
Ready for next phase: Yes
Analysis artifact: `plans/future/flow-update/_bootstrap/ANALYSIS.yaml`
