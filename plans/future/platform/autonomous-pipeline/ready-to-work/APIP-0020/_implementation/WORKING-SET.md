# Working Set: APIP-0020

## Current Context
- **Story**: APIP-0020 — Supervisor Loop (Plain TypeScript)
- **Branch**: feature/APIP-0020-supervisor-loop
- **Phase**: setup → implementation
- **Iteration**: 0
- **Started**: 2026-02-25T23:37:35Z

## Story Summary
Plain TypeScript supervisor process that:
1. Consumes jobs from BullMQ work queue (APIP-0010)
2. Validates job payloads with Zod schema
3. Derives LangGraph thread ID: `{storyId}:{stage}:{attemptNumber}`
4. Dispatches to worker graphs (elaboration or story-creation)
5. Enforces wall clock timeout (10 min default)
6. Applies error classification (PERMANENT → fail, TRANSIENT → retry)
7. Protects with per-graph circuit breakers
8. Logs structured lifecycle events
9. Exposes start()/stop() for graceful shutdown

## Key Constraints
- Use Zod schemas for all types — no TypeScript interfaces (CLAUDE.md)
- No barrel files — import directly from source (CLAUDE.md)
- Use @repo/logger, not console.log (CLAUDE.md)
- Minimum 45% test coverage (CLAUDE.md)
- Named exports preferred (CLAUDE.md)
- ThreadID convention `{storyId}:{stage}:{attemptNumber}` is IRREVERSIBLE post-Phase 0
- Depends on APIP-0010 (BullMQ queue) — mitigated by injected config
- AC-13 CRITICAL: Pass story objects to graph functions, not bare storyIds
- AC-14: Import NodeCircuitBreaker from @repo/orchestrator, don't re-implement
- AC-15: Two-catch pattern: WallClockTimeoutError caught before error classifier

## Subtasks (8 total, ~67k tokens estimated)
- **ST-1**: Create apps/api/pipeline structure and Zod schema (6k)
- **ST-2**: Implement PipelineSupervisor class with BullMQ Worker (8k)
- **ST-3**: Implement dispatch router with thread ID derivation (10k)
- **ST-4**: Implement wall clock timeout (7k)
- **ST-5**: Integrate error classification (6k)
- **ST-6**: Implement per-graph circuit breakers (8k)
- **ST-7**: Write unit tests (12k)
- **ST-8**: Write integration tests and regression guard (10k)

## Acceptance Criteria (15 total)
✓ Coverage: AC-1 through AC-15 in story file
Key blockers: AC-13 (story object payload), AC-14 (circuit breaker import), AC-15 (timeout classification)

## Risk Flags
- external_apis: true (LangGraph dispatch, queue integration)
- security: true (error handling, circuit breaker resilience)
- performance: true (wall clock timeout, concurrency=1 constraint)
- Complex infrastructure: high iteration risk (prediction: 3 cycles)

## Architecture Notes
- **Location**: apps/api/pipeline/ (new Node.js process)
- **No Lambda**: Per APIP ADR-001, runs on dedicated server (APIP-5006)
- **Single concurrency**: BullMQ Worker with concurrency:1 (no parallel stories)
- **Circuit breaker**: Per-graph instances (elaboration + story-creation)
- **Timeout**: Promise.race() pattern with WallClockTimeoutError
- **State**: All supervisor state in Redis (BullMQ job records)
- **Logging**: Structured events via @repo/logger with threadId tracking

## Next Steps
1. Read full story requirements (APIP-0020.md)
2. ST-1: Create pipeline app structure
3. ST-2: Implement PipelineSupervisor class
4. ST-3: Implement dispatch router
5. ST-4: Implement timeout wrapper
6. ST-5: Integrate error classification
7. ST-6: Implement circuit breakers
8. ST-7: Write unit tests
9. ST-8: Write integration tests

## Files to Create
- apps/api/pipeline/package.json
- apps/api/pipeline/tsconfig.json
- apps/api/pipeline/src/supervisor/__types__/index.ts
- apps/api/pipeline/src/supervisor/index.ts
- apps/api/pipeline/src/supervisor/dispatch-router.ts
- apps/api/pipeline/src/supervisor/wall-clock-timeout.ts
- apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts
- apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts
- apps/api/pipeline/src/supervisor/__tests__/wall-clock-timeout.test.ts
- apps/api/pipeline/src/supervisor/__tests__/circuit-breakers.test.ts
- apps/api/pipeline/src/supervisor/__tests__/integration/supervisor.integration.test.ts

## Files to Read (Reference)
- packages/backend/orchestrator/src/graphs/elaboration.ts
- packages/backend/orchestrator/src/graphs/story-creation.ts
- packages/backend/orchestrator/src/runner/circuit-breaker.ts
- packages/backend/orchestrator/src/runner/error-classification.ts
- apps/api/lego-api/core/cache/redis-client.ts
