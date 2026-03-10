# WINT-9090 Fix Setup Summary

**Timestamp:** 2026-02-25T16:13:24Z
**Story ID:** WINT-9090
**Mode:** fix
**Iteration:** 2 (from review iteration 1)

---

## Precondition Checks — ALL PASS

| Check | Result | Details |
|-------|--------|---------|
| Story exists | ✓ PASS | File at `/plans/future/platform/wint/in-progress/WINT-9090/WINT-9090.md` |
| Status is failure state | ✓ PASS | Status was `failed-code-review` (moved from that directory) |
| Failure report exists | ✓ PASS | `REVIEW.yaml` present with iteration: 1, verdict: PASS (with issues) |

---

## Setup Actions Completed

### 1. Story Directory Move
- **From:** `plans/future/platform/wint/failed-code-review/WINT-9090/`
- **To:** `plans/future/platform/wint/in-progress/WINT-9090/`
- **Status:** ✓ Complete

### 2. Story Status Update
- **File:** `plans/future/platform/wint/in-progress/WINT-9090/WINT-9090.md`
- **Change:** `status: failed-code-review` → `status: in-progress`
- **Status:** ✓ Complete

### 3. Story Index Update
- **File:** `plans/future/platform/wint/stories.index.md` (line 2381)
- **Change:** `**Status:** failed-code-review` → `**Status:** in-progress`
- **Status:** ✓ Complete

---

## Failure Analysis (from REVIEW.yaml)

**Review Verdict:** PASS (with 3 issues to address before production)

**Review Iteration:** 1
**All 14 ACs Passed:** ✓

**Findings to Address:**

### Priority 1: CR-001 (Medium Severity)
- **File:** packages/backend/orchestrator/package.json
- **Issue:** Add @repo/mcp-tools workspace dependency
- **Reason:** Default runtime fallback functions perform dynamic imports from '@repo/mcp-tools/...' but package is not listed in dependencies
- **Lines:** context-warmer.ts lines 176, 182, 190
- **Auto-fixable:** No
- **Effort:** Low
- **Blocks Merge:** No (nodes not yet wired into live graphs per WINT-9110)

### Priority 2: CR-002 (Medium Severity)
- **File:** packages/backend/mcp-tools/package.json
- **Issue:** Add ./context-cache subpath exports
- **Reason:** Dynamic imports reference subpaths not exported by package.json exports map
- **Lines:** context-warmer.ts lines 176, 182, 190
- **Auto-fixable:** No
- **Effort:** Low
- **Blocks Merge:** No (same scope rationale as CR-001)

### Priority 3: CR-003 (Low Severity)
- **File:** packages/backend/orchestrator/src/nodes/context/session-manager.ts
- **Issue:** Replace _placeholder hack with z.object({})
- **Details:** SessionManagerConfigSchema uses unconventional z.object({ _placeholder: z.undefined().optional() }) workaround
- **Lines:** 119, 120
- **Auto-fixable:** Yes
- **Effort:** Minimal
- **Blocks Merge:** No

### Non-Issue: CR-004 (Low Severity, Informational)
- **File:** context-warmer.test.ts
- **Issue:** AC-12 coverage numbers unverifiable in worktree (pre-existing @repo/logger build gap)
- **Status:** Accepted - coverage figures from implementer's environment valid; entire orchestrator package affected equally
- **Action:** Not a code fix - environment setup issue

---

## Review Strengths (Reference for Fix Implementation)

- ✓ `createToolNode` factory pattern correctly implemented
- ✓ GraphStateWithContextCache and GraphStateWithSession correctly extend GraphStateWithContext
- ✓ Injectable DB function pattern (cacheGetFn, cachePutFn, etc.) is clean and testable
- ✓ Graceful degradation — all DB operations wrapped in try/catch, return null fields, never throw
- ✓ Dynamic import pattern avoids hard-wiring drizzle-orm as orchestrator dependency
- ✓ 35 unit tests covering all 14 ACs, error cases, and edge cases including EC-4
- ✓ Schemas correctly mirror mcp-tools __types__/ without duplication
- ✓ index.ts follows exact nodes/sync/index.ts re-export pattern per AC-3
- ✓ State-dispatched operation pattern consistent with established node conventions
- ✓ Cleanup dryRun defaults to true for safety

---

## Bounded Scope Notes

- **Nodes not yet wired into live graphs** → WINT-9110 scope (integration into graphs)
- **All tested behavior uses injected mocks** → Production path broken but not exercised
- **Current implementation gates:** WINT-9010 (@repo/workflow-logic) must reach uat/completed
- **Tests cannot run locally:** @repo/logger dist/ absent (pre-existing worktree gap affecting entire orchestrator package)

---

## Next Steps for Developer

### Fix Implementation (Iteration 2)

1. **CR-001 Fix:**
   ```bash
   # Add @repo/mcp-tools to packages/backend/orchestrator/package.json
   pnpm add -F @repo/orchestrator @repo/mcp-tools
   ```
   - Update context-warmer.ts dynamic imports will now resolve at runtime

2. **CR-002 Fix:**
   - Edit `packages/backend/mcp-tools/package.json`
   - Add to exports map:
     ```json
     "./context-cache": "./src/context-cache/index.ts",
     "./context-cache/context-cache-get.js": "./src/context-cache/context-cache-get.ts",
     "./context-cache/context-cache-put.js": "./src/context-cache/context-cache-put.ts",
     "./context-cache/context-cache-invalidate.js": "./src/context-cache/context-cache-invalidate.ts"
     ```

3. **CR-003 Fix:**
   - Edit `packages/backend/orchestrator/src/nodes/context/session-manager.ts` lines 119-120
   - Replace:
     ```typescript
     _placeholder: z.undefined().optional()
     ```
   - With: Empty object (no placeholder needed)

4. **Verification:**
   ```bash
   pnpm check-types --filter @repo/orchestrator
   pnpm test --filter @repo/orchestrator src/nodes/context/__tests__/
   ```

5. **Submit for Review**
   - Code review will verify fixes resolve all 3 issues
   - AC-12 coverage and AC-14 logger build issue unchanged (environment constraints, not code)

---

## Constraints (from CLAUDE.md)

- Use Zod schemas for all types
- No barrel files
- Use @repo/logger, not console
- Minimum 45% test coverage
- Named exports preferred
- No semicolons, single quotes, trailing commas, 100 char line width

---

## Key Files for Reference

| File | Purpose |
|------|---------|
| `packages/backend/orchestrator/src/nodes/context/context-warmer.ts` | Dynamic imports to @repo/mcp-tools — needs CR-001 + CR-002 fixes |
| `packages/backend/orchestrator/src/nodes/context/session-manager.ts` | _placeholder workaround — needs CR-003 fix (lines 119-120) |
| `packages/backend/orchestrator/package.json` | Missing @repo/mcp-tools dependency — CR-001 |
| `packages/backend/mcp-tools/package.json` | Missing context-cache subpath exports — CR-002 |
| `REVIEW.yaml` | Full review details (verdict: PASS with issues) |
| `ELAB.yaml` | Story elaboration artifact (in _implementation/) |

---

## Blockers Check

- ✓ WINT-9010 (@repo/workflow-logic): Currently in-qa, must reach uat/completed before implementation
- ✓ WINT-2100 (session-manager agent): Behavioral source is MCP tools (confirmed in story scope)
- ✓ Database tables: context_cache.contextPacks and context_cache.contextSessions (schema exists via WINT-0030)

All blockers documented and manageable within story scope.

---

## Development Resources

- **Canonical reference (porting pattern):** `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts`
- **State extension pattern:** `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts`
- **DB injection pattern:** `packages/backend/orchestrator/src/nodes/persistence/load-from-db.ts`
- **MCP tool source for context-warmer:** `packages/backend/mcp-tools/src/context-cache/`
- **MCP tool source for session-manager:** `packages/backend/mcp-tools/src/session-management/`
- **Test suite size:** 35 unit tests covering all 14 ACs, error cases, and edge cases

---

**Setup completed by:** dev-setup-leader
**Mode:** fix (code-review-failed)
**Iteration:** 2 (from review iteration 1)
**Status:** READY FOR DEVELOPMENT
