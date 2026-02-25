# WINT-9090: Working Set

## Story Context

Port context-warmer and session-manager agent logic to LangGraph nodes in `packages/backend/orchestrator/src/nodes/context/`.

**Status**: in-progress
**Iteration**: 0
**Phase**: setup → implementation

---

## Key Constraints (from CLAUDE.md & Story)

1. **Use Zod schemas for all types** — Never use TypeScript interfaces
2. **No barrel files** — Import directly from source files
3. **Use @repo/logger, not console** — All logging via logger module
4. **Minimum 45% test coverage** — Story expects >= 80% for nodes
5. **Named exports preferred** — Functions and types exported by name
6. **Dependency gate: WINT-9010** — Must reach uat/completed before implementation starts
7. **Factory pattern required** — All nodes use `createToolNode` from node-factory.ts
8. **Graceful degradation** — DB failures return null/false, never throw
9. **No schema changes** — Read-only access to context_cache tables

---

## Canonical References

| Pattern | File |
|---------|------|
| LangGraph node porting | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` |
| Extended graph state | `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` |
| DB injection pattern | `packages/backend/orchestrator/src/nodes/persistence/load-from-db.ts` |
| Context cache logic | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` |
| Session logic | `packages/backend/mcp-tools/src/session-management/session-create.ts` |

---

## Implementation Path

### Subtask 1: Directory Structure (ST-1)
- Create `packages/backend/orchestrator/src/nodes/context/index.ts`
- Estimated: 4k tokens

### Subtask 2: Context Warmer Node (ST-2)
- Implement `context-warmer.ts` with cache read + write logic
- Port `contextCacheGet` and `contextCachePut` from MCP tools
- Estimated: 14k tokens

### Subtask 3: Cache Invalidation (ST-3)
- Add invalidation operation to context-warmer.ts
- Port `contextCacheInvalidate` logic
- Estimated: 6k tokens

### Subtask 4: Session Manager Node (ST-4)
- Implement `session-manager.ts` with create/update/complete/cleanup
- Port all sessionManager operations from MCP tools
- Estimated: 14k tokens

### Subtask 5: Unit Tests (ST-5)
- Write `__tests__/context-warmer.test.ts` (injectable mocks)
- Write `__tests__/session-manager.test.ts` (injectable mocks)
- Achieve >= 80% coverage
- Estimated: 16k tokens

---

## Acceptance Criteria (14 total)

- [ ] AC-1: context-warmer.ts with factory and default export
- [ ] AC-2: session-manager.ts with factory and default export
- [ ] AC-3: nodes/context/index.ts re-exports both
- [ ] AC-4: Cache read from contextPacks
- [ ] AC-5: Cache write to contextPacks
- [ ] AC-6: Session create in contextSessions
- [ ] AC-7: Session update/complete operations
- [ ] AC-8: Both use createToolNode
- [ ] AC-9: Extended GraphState interfaces
- [ ] AC-10: DB injectable (factory pattern)
- [ ] AC-11: Graceful degradation on DB failure
- [ ] AC-12: >= 80% test coverage
- [ ] AC-13: Cache invalidation accessible
- [ ] AC-14: Zod schemas defined (not duplicated)

---

## Dependencies

**Blocking**: WINT-9010 must reach uat or completed

**Source code**:
- `@repo/logger`
- `@repo/db`
- `@repo/database-schema`
- `@repo/workflow-logic` (confirmation needed)
- MCP tool types from context-cache and session-management

---

## Branch & Worktree

- **Worktree**: `/Users/michaelmenard/Development/monorepo/tree/story/WINT-9090`
- **Main branch**: main
- **Feature branch**: TBD (create during implementation)

---

## Verification Commands

```bash
# Type check
pnpm check-types --filter @repo/orchestrator

# Test with coverage
pnpm test --filter @repo/orchestrator src/nodes/context/__tests__/ -- --coverage

# Full test suite
pnpm test:all
```

---

## Next Steps

1. Read canonical reference files (doc-sync.ts, load-knowledge-context.ts, load-from-db.ts)
2. Read MCP tool business logic (context-cache-get.ts, session-create.ts, etc.)
3. Implement ST-1 (directory structure)
4. Implement ST-2 (context-warmer)
5. Implement ST-3 (invalidation)
6. Implement ST-4 (session-manager)
7. Implement ST-5 (tests)
8. Run verification commands
9. Create PR and code review
