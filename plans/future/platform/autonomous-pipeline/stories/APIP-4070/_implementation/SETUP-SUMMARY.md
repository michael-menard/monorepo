# APIP-4070 Setup Summary

**Story**: Weekly Pipeline Health Report — Sunday Cron Aggregation and Slack Notification
**Status**: Ready for implementation
**Phase**: setup
**Iteration**: 0

## Artifacts Created

1. **CHECKPOINT.yaml** — Tracks implementation progress
   - Initial phase: setup
   - Max iterations: 3
   - Gen mode: false (standard flow)

2. **SCOPE.yaml** — Implementation scope definition
   - Backend: true (cron job + aggregation logic)
   - Database: true (data queries)
   - Frontend: false
   - External APIs: true (Slack notification)
   - Performance risk: true (aggregation complexity)

## Story Scope

### What Changes
- New directory: `packages/backend/orchestrator/src/nodes/reporting/`
- New cron node for Sunday pipeline health report aggregation
- Slack notification dispatch using injectable notification function (from APIP-2010)
- Four data aggregation functions: throughput, costs, model performance, codebase health
- Report formatting and trend analysis

### Touched Paths
- `packages/backend/orchestrator/src/nodes/reporting/**`
- `packages/backend/orchestrator/src/artifacts/**` (new checkpoint artifact types)

### Dependencies
- APIP-4010 (Weekly aggregation data structures)
- APIP-3020 (Learning-aware diff planner — for model performance metrics)
- APIP-2010 (Notification dispatch infrastructure — used as injectable parameter)

### Test Plan
- Unit tests: 7 happy path test cases
- Integration tests: End-to-end aggregation flow
- Test coverage: Minimum 45%
- Framework: Vitest + unit testing library

### Risk Flags
- **external_apis**: true — Slack notification reliability
- **performance**: true — Aggregation of multiple data sources may be computationally intensive
- **migrations**: false
- **auth**: false
- **payments**: false
- **security**: false

## Constraints (CLAUDE.md defaults)
1. Use Zod schemas for all types
2. No barrel files
3. Use @repo/logger, not console
4. Minimum 45% test coverage
5. Named exports preferred

## Next Steps
1. Read full story requirements (AC-1 through AC-16)
2. Implement cron node registration and Sunday schedule
3. Implement four aggregation functions with fallback patterns
4. Implement Slack message formatting (Block Kit)
5. Write unit + integration tests
6. Run type check and lint
7. Verify test coverage meets 45% minimum

---
Generated: 2026-03-01
