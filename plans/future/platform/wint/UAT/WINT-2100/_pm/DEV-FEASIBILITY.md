# Dev Feasibility: WINT-2100 — Create session-manager Agent

## Feasibility Summary

- **Feasible for MVP**: yes
- **Confidence**: high
- **Why**: This story delivers a single `.agent.md` file only. No TypeScript code, no schema changes, no new MCP tools. The underlying infrastructure (5 session MCP tools from WINT-0110, session lifecycle patterns from SESSION-MANAGEMENT-TOOLS.md, haiku worker agent conventions from `turn-count-metrics-agent.agent.md`) is fully live and well-documented. Complexity is specification and wrapping, not new infrastructure. The only gate is WINT-2090 must be complete before implementation to confirm skill file paths and interfaces.

---

## Likely Change Surface (Core Only)

- **Files created**: `.claude/agents/session-manager.agent.md` (new file)
- **Files read**: `turn-count-metrics-agent.agent.md` (structural reference), `SESSION-MANAGEMENT-TOOLS.md` (API reference), `__types__/index.ts` (Zod schema reference), WINT-2090 skill files (once available)
- **Packages involved**: None created or modified — reference only: `@repo/mcp-tools` (session management tools), `@repo/database-schema` (type reference)
- **Critical deploy touchpoints**: None — agent file only, no database migration, no API change

---

## MVP-Critical Risks (Max 5)

### Risk 1: WINT-2090 skill files not yet available
- **Why it blocks MVP**: The agent must reference `session-create` and `session-inherit` skills by canonical path. If WINT-2090 is incomplete, the agent cannot accurately specify which skill to invoke or confirm the exact interface.
- **Required mitigation**: Gate implementation start on WINT-2090 completion. During implementation ST-2, verify skill files exist at `.claude/skills/session-create/SKILL.md` and `.claude/skills/session-inherit/SKILL.md` before referencing them in the agent body.

### Risk 2: sessionUpdate throw vs null semantics mismatch
- **Why it blocks MVP**: The seed documents that `sessionUpdate` throws (not returns null) when the session is already completed. If the agent documents null-return handling for this case (treating it the same as DB errors), the documented error handling will be incorrect and potentially misleading to consuming leaders.
- **Required mitigation**: During ST-1, re-read `session-update.ts` source to confirm the exact throw condition and error message. Document the two distinct failure modes: (a) DB error → null return, (b) completed session → throw. Handle both paths explicitly in AC-4.

### Risk 3: Concurrent session creation — no DB-level uniqueness constraint
- **Why it blocks MVP**: The seed confirms there is no uniqueness constraint on `(agentName, storyId)` in `wint.contextSessions`. Without explicit leaked-session detection, concurrent invocations could create duplicate active sessions for the same agent+story pair, producing session leaks.
- **Required mitigation**: AC-3 requires the agent to document `sessionQuery({ agentName, storyId, activeOnly: true })` check before creating a new session. This must be the first documented step in the creation phase, not optional.

---

## Missing Requirements for MVP

None blocking. The seed provides complete AC coverage (AC-1 through AC-10) with clear, testable acceptance criteria. All referenced infrastructure is live (WINT-0110 UAT complete).

---

## MVP Evidence Expectations

- `.claude/agents/session-manager.agent.md` file exists on disk
- Frontmatter YAML block parses cleanly with all required keys (`type`, `model`, `created`, `updated`, `version`, `permission_level`, `spawned_by`)
- All 10 ACs verifiable by reading the agent file (documentation-only story — evidence is the text itself)
- WINT-9090 porting interface section present and documents target node path `packages/backend/orchestrator/src/nodes/context/`
- No TypeScript errors, no ESLint errors (not applicable — no TS files)
- Cross-reference: all 4 lifecycle phases (create, update, complete, cleanup) documented with explicit error handling per AC-2 through AC-6

---

## Proposed Subtask Breakdown

### ST-1: Read canonical references and confirm API signatures
- **Goal**: Confirm exact MCP tool signatures, error semantics, and Zod schema field names before authoring agent documentation
- **Files to read**: `/Users/michaelmenard/Development/monorepo/packages/backend/mcp-tools/src/session-management/SESSION-MANAGEMENT-TOOLS.md`, `/Users/michaelmenard/Development/monorepo/packages/backend/mcp-tools/src/session-management/__types__/index.ts`, `/Users/michaelmenard/Development/monorepo/packages/backend/mcp-tools/src/session-management/session-update.ts` (confirm throw vs null semantics)
- **Files to create/modify**: None (read-only research phase)
- **ACs covered**: AC-2, AC-3, AC-4, AC-5, AC-6 (all lifecycle phases)
- **Depends on**: none
- **Verification**: Notes captured and ready for authoring; `session-update.ts` throw condition confirmed

### ST-2: Read WINT-2090 skill files and confirm interfaces
- **Goal**: Confirm `session-create` and `session-inherit` skill file paths and interfaces once WINT-2090 is complete
- **Files to read**: `.claude/skills/session-create/SKILL.md`, `.claude/skills/session-inherit/SKILL.md`
- **Files to create/modify**: None (read-only)
- **ACs covered**: AC-2 (session creation delegates to session-create skill)
- **Depends on**: ST-1, WINT-2090 completion
- **Verification**: Skill paths confirmed; exact invocation interface noted for AC-2 documentation

### ST-3: Draft agent frontmatter and structural scaffold
- **Goal**: Create `.claude/agents/session-manager.agent.md` with correct frontmatter and section headers matching the haiku worker convention from `turn-count-metrics-agent.agent.md`
- **Files to read**: `/Users/michaelmenard/Development/monorepo/.claude/agents/turn-count-metrics-agent.agent.md` (structural exemplar)
- **Files to create/modify**: `.claude/agents/session-manager.agent.md` (create)
- **ACs covered**: AC-1, AC-8 (frontmatter + spawned_by), AC-9 (non-negotiables section)
- **Depends on**: ST-1
- **Verification**: File exists; YAML frontmatter block parses; all required frontmatter fields present; `spawned_by` includes context-warmer agent

### ST-4: Write Phase 1 — session creation with leaked-session detection
- **Goal**: Document the session creation phase including `sessionQuery` pre-check, `session-create` skill delegation, null-return handling policy, and leaked-session resolution options
- **Files to read**: `.claude/agents/session-manager.agent.md` (current draft), WINT-2090 skill interface (from ST-2)
- **Files to create/modify**: `.claude/agents/session-manager.agent.md` (modify)
- **ACs covered**: AC-2, AC-3
- **Depends on**: ST-2, ST-3
- **Verification**: Phase 1 section present; leaked-session detection documents `sessionQuery({ activeOnly: true })` call; null-return policy explicitly stated (warn + continue)

### ST-5: Write Phase 2 and Phase 3 — session update and completion
- **Goal**: Document the session update phase (incremental mode default, completed-session throw handling) and the session completion phase (idempotent guard)
- **Files to read**: `.claude/agents/session-manager.agent.md` (current draft), `session-update.ts` throw confirmation from ST-1
- **Files to create/modify**: `.claude/agents/session-manager.agent.md` (modify)
- **ACs covered**: AC-4, AC-5
- **Depends on**: ST-4
- **Verification**: Phase 2 documents `mode: 'incremental'` as default; documents throw case with explicit catch-and-skip; Phase 3 documents idempotent guard

### ST-6: Write Phase 4 — cleanup with mandatory dry-run
- **Goal**: Document the cleanup phase: mandatory dry-run preview, `deletedCount`+`cutoffDate` reporting, explicit `dryRun: false` opt-in, active session protection
- **Files to read**: `.claude/agents/session-manager.agent.md` (current draft), Pattern 4 from `SESSION-MANAGEMENT-TOOLS.md`
- **Files to create/modify**: `.claude/agents/session-manager.agent.md` (modify)
- **ACs covered**: AC-6
- **Depends on**: ST-5
- **Verification**: Phase 4 section documents `dryRun: true` as first step; `dryRun: false` requires confirmation; active session protection explicitly stated

### ST-7: Write output format, non-negotiables, and completion signal
- **Goal**: Document the structured YAML output format (action, sessionId, result, token_totals), the non-negotiables section, and the completion signal
- **Files to read**: `.claude/agents/session-manager.agent.md` (current draft), `turn-count-metrics-agent.agent.md` (completion signal format reference)
- **Files to create/modify**: `.claude/agents/session-manager.agent.md` (modify)
- **ACs covered**: AC-7, AC-9
- **Depends on**: ST-6
- **Verification**: Output format section present with flat YAML structure; non-negotiables section explicitly states the three required prohibitions from AC-9; completion signal defined

### ST-8: Add LangGraph porting interface contract section
- **Goal**: Add the porting interface contract section required for WINT-9090 to port this agent without reimplementing discovery, documenting node target path and per-phase interface signatures
- **Files to read**: `.claude/agents/doc-sync.agent.md` or `.claude/skills/doc-sync/SKILL.md` (LangGraph porting section exemplar from WINT-0160), `.claude/agents/session-manager.agent.md` (current draft)
- **Files to create/modify**: `.claude/agents/session-manager.agent.md` (modify)
- **ACs covered**: AC-10
- **Depends on**: ST-7
- **Verification**: LangGraph porting section present; documents target node path (`packages/backend/orchestrator/src/nodes/context/`); all 4 lifecycle phases have input/output interface documented; section title matches convention from WINT-9020
