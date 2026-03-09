# Dev Feasibility Review: WINT-1150
# Integrate Worktree Cleanup into Story Completion

Generated: 2026-02-16
Worker: pm-dev-feasibility-review
Story: WINT-1150

---

## Verdict: FEASIBLE (with scope clarification required)

**Confidence**: HIGH
**Story Points Estimate**: 3-5 (pending wt-finish output structure discovery)
**Token Estimate**: 80K-120K
**Complexity**: LOW-MEDIUM

---

## Feasibility Summary

This story integrates existing infrastructure without introducing new database schemas or new
service layers. The primary work is modifying agent/command instruction files and wiring
existing MCP tools into the PASS flow. The principal risk is the unknown structured output
of the `wt-finish` skill - if it does not surface CI/PR status as machine-readable data,
AC-5 and AC-6 require a scope extension.

---

## Primary Modification Targets

### 1. `.claude/agents/qa-verify-completion-leader.agent.md` (PRIMARY)

- **File type**: Agent instruction (Markdown), not TypeScript
- **Permission level**: Agent instruction files can be modified
- **Constraint**: This agent is haiku-powered; modifications must remain lightweight and mechanical
- **Scope of change**: Add logic to PASS branch only:
  1. Call `worktree_get_by_story` MCP tool
  2. If result: invoke `/wt-finish` skill
  3. Handle result (success → `worktree_mark_complete`; failure → defer + warn)
- **Backward compatibility**: Must not break FAIL branch; must not block completion on cleanup failure
- **Risk**: LOW - modifying the PASS branch only; haiku model can handle a 3-step conditional flow

### 2. `.claude/commands/story-update.md` (SECONDARY)

- **File type**: Command instruction (Markdown), docs-only permission
- **Constraint**: Cannot make direct DB calls; must delegate to MCP tools
- **Scope of change**: Add cleanup check for `completed` transition only
- **Risk**: LOW - the `story-update` command already has conditional logic for transitions; adding a `completed` case is minimal

---

## Dependency Analysis

### Critical Dependency: wt-finish Structured Output

**Status**: UNKNOWN - must be verified before implementing AC-5 and AC-6

The current `wt-finish` skill likely returns a success/failure indication, but it is unknown whether it:
- Exposes CI check status as a discrete failure reason (`ci_failing`)
- Exposes PR requested-changes status as a discrete failure reason (`pr_review_pending`)

**Discovery Required**: Read `.claude/skills/wt-finish.md` (or equivalent) before implementing.

**If wt-finish does NOT expose CI/PR status**:
- AC-5 and AC-6 require adding structured output to `wt-finish` first (1-2 point scope addition)
- Consider adding to this story's scope or creating a prerequisite task
- Scope risk: MEDIUM if wt-finish needs modification; LOW if it already returns structured reasons

**If wt-finish DOES expose structured failure reasons**: proceed as scoped.

---

## Reuse Candidates (Confirmed Available via WINT-1130)

| Tool | Package | Usage |
|------|---------|-------|
| `worktree_get_by_story` | `packages/backend/mcp-tools/src/worktree-management/` | Pre-flight check |
| `worktree_mark_complete` | `packages/backend/mcp-tools/src/worktree-management/` | Post-success update |
| Error handling pattern | WINT-1130 patterns | No uncaught throws, return null on error |

---

## TypeScript Work Required

**Minimal TypeScript code changes expected:**

1. If MCP tool parameters need Zod schema wrapping for the new invocation context, add to existing schema files in `packages/backend/mcp-tools/src/worktree-management/`.
2. No new database schema changes.
3. No new MCP tool implementations.
4. No new API endpoints.

**New Zod schemas needed** (per CLAUDE.md requirement):
- Input/output types for the cleanup result handler
- Failure reason enum: `z.enum(['ci_failing', 'pr_review_pending', 'user_requested', 'unknown'])`
- Metadata update schema: `z.object({ cleanup_deferred: z.boolean(), reason: z.string() })`

---

## Architecture Compliance

| Check | Status |
|-------|--------|
| Zod-first types (no TS interfaces) | Required for any new types |
| No barrel files | Confirm imports are direct |
| Use @repo/logger, not console | Required in any TS changes |
| Haiku model limit for completion-leader | No complex business logic in agent |
| Resilient error handling (WINT-1130 pattern) | Required - AC-11 |
| Protected features unchanged | story-update FAIL flow, PASS flow non-worktree path |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| wt-finish lacks structured output for CI/PR status | MEDIUM | Discover before implementing; add to scope if needed |
| Auto-merge triggered by accident | HIGH | wt-finish skill handles merge decision; this story delegates, not controls |
| haiku agent complexity budget exceeded | MEDIUM | Keep PASS branch logic to 3 conditional steps; complex checks in wt-finish |
| story completion blocked by cleanup failure | CRITICAL | AC-11 explicitly prevents; test first |
| WINT-1130 not yet fully deployed to QA | MEDIUM | Story is correctly marked pending WINT-1130 completion |

---

## Implementation Order Recommendation

1. **Pre-work**: Read `wt-finish` skill; verify structured output. Log finding in implementation DECISIONS.yaml.
2. **Phase 1**: Modify `qa-verify-completion-leader.agent.md` PASS branch - no-op path first (AC-1, AC-2)
3. **Phase 2**: Add cleanup invocation and success path (AC-3, AC-4)
4. **Phase 3**: Add failure/deferral paths (AC-5, AC-6, AC-7)
5. **Phase 4**: Modify `story-update.md` for `completed` transition (AC-8)
6. **Phase 5**: Write tests covering all 4 scenarios (AC-10, AC-11)
7. **Phase 6**: Zod schema review (AC-9)

---

## Conclusion

Story is implementable with existing infrastructure. No new database schema, no new MCP tools,
no new services. The critical gate is verifying wt-finish structured output before committing
to AC-5/AC-6 implementation. Story points: 3 (if wt-finish already surfaces CI/PR reasons) or 5
(if wt-finish modification is required). Recommend discovering this in implementation Phase 1
pre-work and adjusting scope accordingly.
