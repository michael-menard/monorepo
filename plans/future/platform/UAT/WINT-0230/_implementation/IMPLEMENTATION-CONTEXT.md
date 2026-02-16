# WINT-0230 Implementation Context

## Task
Implement unified model interface with tier-based routing, escalation logic, and fallback chains.

## Key Context
- Strategy YAML at: packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml
- Provider interface (DO NOT MODIFY): packages/backend/orchestrator/src/providers/base.ts (ILLMProvider)
- Existing loader pattern: packages/backend/orchestrator/src/config/model-assignments.ts
- Package: @repo/orchestrator
- Use @repo/logger (NOT console.log)
- Zod-first types (NO TypeScript interfaces)

## Critical Requirements
1. 80%+ test coverage (vs 45% project standard)
2. All 11 ACs must have test evidence
3. E2E exempt (backend-only, no UI)
4. Graph validation for circular escalation paths
5. 30s TTL cache on strategy load
6. Fallback chain max 3 attempts
7. Integration tests use REAL strategy YAML (no mocks per ADR-005)

## Files to Create (in order)
1. src/models/strategy-loader.ts
2. src/models/unified-interface.ts
3. src/models/__tests__/strategy-loader.test.ts
4. src/models/__tests__/unified-interface.test.ts
5. src/models/__tests__/integration.test.ts
6. src/models/__tests__/fixtures/*.yaml (4 fixtures)

## Files to Modify
1. src/config/model-assignments.ts (add optional tier field)

## Commands After Implementation
```bash
pnpm build --filter @repo/orchestrator
pnpm test --filter @repo/orchestrator --coverage
pnpm lint --filter @repo/orchestrator
pnpm check-types --filter @repo/orchestrator
```
