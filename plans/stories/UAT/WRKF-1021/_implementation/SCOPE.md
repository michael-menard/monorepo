# Scope - WRKF-1021

## Surface Impact

backend: true
frontend: false
infra: false

## Notes

This is a pure TypeScript library extension in `packages/backend/orchestrator`.
No API endpoints, no frontend components, no infrastructure changes.

Files to create:
- `packages/backend/orchestrator/src/runner/metrics.ts`
- `packages/backend/orchestrator/src/runner/__tests__/metrics.test.ts`

Files to modify:
- `packages/backend/orchestrator/src/runner/node-factory.ts`
- `packages/backend/orchestrator/src/runner/index.ts`
- `packages/backend/orchestrator/src/index.ts`
