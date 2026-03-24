# PIPE-3010 Working Set

## Story Context
- Story ID: PIPE-3010
- Title: Wire Execute Node to LLM Invocation in dev-implement.ts
- Phase: implementation
- Iteration: 0
- Worktree Path: /Users/michaelmenard/Development/monorepo/tree/story/PIPE-3010

## Files to Modify
1. `packages/backend/orchestrator/src/graphs/dev-implement.ts`
   - Extend DevImplementStateAnnotation
   - Extend DevImplementConfigSchema
   - Replace createExecuteNode stub
   - Replace createCollectEvidenceNode stub
   - Implement afterExecute conditional edge

2. `packages/backend/orchestrator/src/graphs/__tests__/dev-implement.test.ts`
   - Add tests for new execute node implementation
   - Test escalation routing
   - Test evidence collection

## Constraints
1. Use Zod schemas for all types - no TypeScript interfaces
2. No barrel files - import directly from source
3. Use @repo/logger, not console
4. Minimum 45% test coverage required
5. Named exports preferred
6. Do NOT modify elab-story.ts (PIPE-3020 scope)
7. Do NOT call ModelRouter directly - use IModelDispatch injection
8. Do NOT duplicate change-loop logic - delegate to createChangeLoopNode
9. Do NOT use WINT-* references - use PIPE-3010 comments
10. Do NOT introduce wint.* schema references
11. Use spawn-based subprocess only (no execSync, no execa)
12. Exported conditional edges for test access (ARCH-002)

## Implementation Dependencies
- createChangeLoopNode: Already implemented in packages/backend/orchestrator/src/nodes/change-loop.ts
- IModelDispatch: Injectable interface at packages/backend/orchestrator/src/pipeline/i-model-dispatch.ts
- shouldEscalate: Existing function in dev-implement.ts
- createEvidence, addTouchedFile: From packages/backend/orchestrator/src/artifacts/evidence.ts
- CommitRecordSchema: From packages/backend/orchestrator/src/graphs/implementation.ts

## Quality Gates
- TypeScript compilation: pnpm check-types
- Tests: pnpm test --filter @repo/orchestrator
- Linting: pnpm lint (via /lint-fix skill)
- Minimum coverage: 45% global

## Key Architectural Notes
- State annotation must track changeSpecs, currentChangeIndex, completedChanges, changeLoopStatus
- Config injection enables testing without real model endpoints
- Escalation routing: Sonnet → Opus → blocked (via shouldEscalate)
- Evidence collection from completedChanges, not stub path "stub"
