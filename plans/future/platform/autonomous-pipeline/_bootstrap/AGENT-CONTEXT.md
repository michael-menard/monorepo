---
feature_dir: "plans/future/platform/autonomous-pipeline"
prefix: "APIP"
project_name: "autonomous-pipeline"
plan_slug: "autonomous-pipeline"
created: 2026-02-25T13:55:00Z
---

# Autonomous Pipeline Bootstrap Context

## Project Overview

**Project**: Autonomous Pipeline
**Feature Directory**: plans/future/platform/autonomous-pipeline
**Story Prefix**: APIP
**Total Stories**: 23

## Scope

Build a complete autonomous development pipeline that can:
- Process work items through a supervisor graph
- Generate code changes with atomic decomposition
- Execute comprehensive code reviews and QA
- Merge validated changes with learnings extraction
- Optimize routing and quality over time

## Story Organization

Stories are organized across 5 phases:

| Phase | Name | Count | Status |
|-------|------|-------|--------|
| 0 | Foundation | 4 | backlog |
| 1 | Full Worker Graphs | 8 | backlog |
| 2 | Resilience & Monitoring | 3 | backlog |
| 3 | Learning System & Optimization | 5 | backlog |
| 4 | Long-Term Quality | 3 | backlog |

## Critical Path

12 stories form the critical path to MVP autonomous operation:
APIP-0010 → APIP-0020 → APIP-1010 → APIP-1020 → APIP-1030 → APIP-1050 → APIP-1060 → APIP-1070 → APIP-3010 → APIP-3020 → APIP-3040 → APIP-3070

## Key Risks

| Risk ID | Severity | Issue |
|---------|----------|-------|
| RISK-001 | HIGH | Cheap models produce incorrect code that passes micro-verify but fails QA |
| RISK-002 | HIGH | Diff Planner produces poor ChangeSpec decompositions |
| RISK-009 | HIGH | Runaway token costs per story without budget hard-cap |
