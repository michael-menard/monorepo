# PIPE-3010 Setup Log

## Story
Wire Execute Node to LLM Invocation in dev-implement.ts

## Setup Phase Completed
- Timestamp: 2026-03-18
- Phase: setup
- Iteration: 0
- Gen Mode: false
- Status: in_progress

## Scope Analysis
- **Backend**: true (orchestrator graph node)
- **Frontend**: false
- **Packages**: true (@repo/orchestrator, @repo/logger)
- **Database**: false
- **Infrastructure**: false
- **Risk Flags**: external_apis=true (LLM dispatch)

## Constraints (from CLAUDE.md and story seed)
1. Use Zod schemas for all types (not TypeScript interfaces)
2. No barrel files - import directly from source files
3. Use @repo/logger, not console
4. Minimum 45% test coverage
5. Named exports preferred
6. Do NOT modify elab-story.ts (PIPE-3020 scope)
7. Do NOT call ModelRouter directly - use IModelDispatch injection
8. Do NOT duplicate change-loop logic - delegate to createChangeLoopNode
9. Do NOT use WINT-* references - use PIPE-3010
10. Do NOT introduce wint.* schema references
11. Do NOT implement worktree lifecycle - worktreePath config field already exists
12. Use spawn-based subprocess (no execSync, no execa)
13. Exported conditional edges for test access (ARCH-002)

## Primary Target Files
- packages/backend/orchestrator/src/graphs/dev-implement.ts (execute node stub replacement)
- packages/backend/orchestrator/src/graphs/__tests__/dev-implement.test.ts (test updates)

## Key Dependencies and Patterns
- createChangeLoopNode: Already implemented - delegate per-ChangeSpec loop here
- IModelDispatch: Injectable boundary for model calls - inject via DevImplementConfig
- shouldEscalate: Already exported - use for Sonnet→Opus→blocked routing
- createEvidence / addTouchedFile: Replace stub evidence collection
- CommitRecordSchema: Type for completedChanges state field

## Next Steps
1. Read story requirements and context
2. Implement backend changes:
   - Extend DevImplementStateAnnotation with worktreePath, changeSpecs, currentChangeIndex, completedChanges, changeLoopStatus
   - Extend DevImplementConfigSchema with modelDispatch injection
   - Replace createExecuteNode stub with real implementation
   - Replace createCollectEvidenceNode stub with real evidence collection
   - Implement afterExecute conditional edge with escalation routing
3. Write comprehensive unit tests
4. Run verification: pnpm test --filter @repo/orchestrator + pnpm check-types
