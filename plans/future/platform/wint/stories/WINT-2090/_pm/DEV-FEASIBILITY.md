# Dev Feasibility: WINT-2090 — Session Context Management Skills

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: The entire story produces 2 markdown skill files (.claude/skills/session-create/SKILL.md and .claude/skills/session-inherit/SKILL.md). No TypeScript code is required. The MCP tool layer (from WINT-0110) already exists on disk and is fully implemented. The only risk is the WINT-0110 formal status gap, which appears to be a tracking issue rather than a real implementation gap.

---

## Likely Change Surface (Core Only)

**New files** (this story creates):
- `.claude/skills/session-create/SKILL.md` — new skill file
- `.claude/skills/session-inherit/SKILL.md` — new skill file

**Read-only references** (no modifications):
- `packages/backend/mcp-tools/src/session-management/session-create.ts` — tool to call
- `packages/backend/mcp-tools/src/session-management/session-query.ts` — tool to call
- `packages/backend/mcp-tools/src/session-management/session-update.ts` — tool to call
- `packages/backend/mcp-tools/src/session-management/session-complete.ts` — tool to reference (leader-only restriction)
- `packages/backend/mcp-tools/src/session-management/session-cleanup.ts` — referenced in lifecycle docs only
- `packages/backend/mcp-tools/src/session-management/__types__/index.ts` — Zod schemas for accurate tool API documentation
- `.claude/skills/wt-new/SKILL.md` — canonical skill structure reference
- `.claude/skills/doc-sync/SKILL.md` — canonical complex skill reference

**Packages involved**: None new. No TypeScript, no package.json changes, no imports.

**Critical deploy touchpoints**: None. Skill files are documentation consumed by agent runtime, not deployed services.

---

## MVP-Critical Risks (Max 5)

### Risk 1: WINT-0110 Dependency Not Formally Promoted

**Why it blocks MVP**: The skill execution instructions describe exactly which MCP tools to call and in what order. If the tool APIs are still unstable (i.e., WINT-0110 is pending for good reason, not just a status gap), the skill documentation may describe outdated parameter names or return types, requiring immediate revision.

**Required mitigation**: Before writing the skill files, run:
```bash
pnpm --filter @repo/mcp-tools test
```
Confirm all session-management tests pass. If tests pass, the tools are stable and this risk is resolved. If tests fail, block WINT-2090 until WINT-0110 is fixed and promoted.

---

### Risk 2: Output Block Format Incompatibility with Orchestrators

**Why it blocks MVP**: `session-create` skill's primary job is to emit a `SESSION CREATED` structured block that calling orchestrators parse to extract `session_id`. If the format deviates from what orchestrators expect (wrong indentation, different keyword, extra lines), the session ID will not be captured and downstream workers will receive no session context. This breaks the core value proposition.

**Required mitigation**: Define the output block format precisely in the skill and validate against the `/wt-new/SKILL.md` WORKTREE CREATED precedent. The format must be parseable by regex pattern: `/SESSION CREATED\n\s+session_id:\s+([0-9a-f-]{36})/`.

---

### Risk 3: Double-Completion Not Prevented by Skill Documentation

**Why it blocks MVP**: If `session-inherit/SKILL.md` does not explicitly and unambiguously state that workers MUST NOT call `sessionComplete`, a dev agent following the skill may attempt to "clean up after itself" by completing the session. The WINT-0110 tool throws a `Business Logic Error` on double-completion, which will surface as an unexpected error in the workflow.

**Required mitigation**: AC-10 must be a top-level, visually prominent restriction in `session-inherit/SKILL.md` — not buried in a footnote. Consider a bold warning block or a dedicated "Restrictions" section immediately after the Usage block.

---

## Missing Requirements for MVP

None identified. All 10 ACs are well-specified and self-contained for a markdown-only delivery.

---

## MVP Evidence Expectations

- Both `.claude/skills/session-create/SKILL.md` and `.claude/skills/session-inherit/SKILL.md` exist on disk
- Both files have valid YAML frontmatter with `name` and `description` fields
- `session-create/SKILL.md` contains the `SESSION CREATED` structured output block (exact format)
- `session-create/SKILL.md` contains the `SESSION UNAVAILABLE — continuing without session tracking` fallback text
- `session-inherit/SKILL.md` contains `SESSION NOT FOUND` warning text
- `session-inherit/SKILL.md` contains `sessionUpdate` example with `mode: 'incremental'` shown explicitly
- Both files contain "Session Lifecycle" section covering all 4 lifecycle steps
- Both files contain "Graceful Degradation" section
- `session-inherit/SKILL.md` has unambiguous restriction against workers calling `sessionComplete`
- All `sessionCreate` tool parameters referenced in the skill match the Zod schemas in `__types__/index.ts`

**CI/deploy checkpoints**: None applicable (markdown files only).

---

## Proposed Subtask Breakdown

### ST-1: Prerequisite — Verify WINT-0110 Tool Stability

- **Goal**: Confirm that session management MCP tools pass their test suite and their API is stable enough to document in skill files.
- **Files to read**: `packages/backend/mcp-tools/src/session-management/__types__/index.ts`, `packages/backend/mcp-tools/src/session-management/session-create.ts`
- **Files to create/modify**: None (read-only verification step)
- **ACs covered**: Prerequisite for all ACs — ensures skill documentation is accurate
- **Depends on**: none
- **Verification**: `pnpm --filter @repo/mcp-tools test 2>&1 | tail -20` — all tests pass

---

### ST-2: Write session-create/SKILL.md

- **Goal**: Create the `session-create` skill file with valid frontmatter, usage section, execution steps invoking `sessionCreate`, and the structured `SESSION CREATED` output block.
- **Files to read**: `.claude/skills/wt-new/SKILL.md` (structure), `packages/backend/mcp-tools/src/session-management/__types__/index.ts` (input params)
- **Files to create/modify**: `.claude/skills/session-create/SKILL.md` (create new)
- **ACs covered**: AC-1, AC-2, AC-9
- **Depends on**: ST-1
- **Verification**: `head -6 .claude/skills/session-create/SKILL.md | grep -E "^name:|^description:"` — both fields present

---

### ST-3: Add Null-Return Handling to session-create/SKILL.md

- **Goal**: Add the `SESSION UNAVAILABLE` fallback section to `session-create/SKILL.md` that documents how to handle a null return from `sessionCreate`.
- **Files to read**: `.claude/skills/session-create/SKILL.md` (from ST-2)
- **Files to create/modify**: `.claude/skills/session-create/SKILL.md` (modify)
- **ACs covered**: AC-3
- **Depends on**: ST-2
- **Verification**: `grep "SESSION UNAVAILABLE" .claude/skills/session-create/SKILL.md` — text present

---

### ST-4: Write session-inherit/SKILL.md

- **Goal**: Create the `session-inherit` skill file with valid frontmatter, usage section, execution steps for `sessionQuery` (activeOnly: true), confirmation/warning output, and incremental `sessionUpdate` example.
- **Files to read**: `.claude/skills/doc-sync/SKILL.md` (complex skill pattern), `packages/backend/mcp-tools/src/session-management/__types__/index.ts` (schemas)
- **Files to create/modify**: `.claude/skills/session-inherit/SKILL.md` (create new)
- **ACs covered**: AC-4, AC-5, AC-6
- **Depends on**: ST-1
- **Verification**: `grep -c "mode: 'incremental'" .claude/skills/session-inherit/SKILL.md` — at least 1 match

---

### ST-5: Add sessionComplete Restriction to session-inherit/SKILL.md

- **Goal**: Add the prominent `sessionComplete` restriction section to `session-inherit/SKILL.md` stating workers MUST NOT call `sessionComplete`.
- **Files to read**: `.claude/skills/session-inherit/SKILL.md` (from ST-4)
- **Files to create/modify**: `.claude/skills/session-inherit/SKILL.md` (modify)
- **ACs covered**: AC-10
- **Depends on**: ST-4
- **Verification**: `grep "sessionComplete" .claude/skills/session-inherit/SKILL.md` — restriction text present

---

### ST-6: Add Session Lifecycle and Graceful Degradation Sections to Both Skills

- **Goal**: Add the "Session Lifecycle" section (4-step lifecycle contract) and "Graceful Degradation" section (DB-unavailable handling) to both skill files.
- **Files to read**: `.claude/skills/session-create/SKILL.md`, `.claude/skills/session-inherit/SKILL.md`
- **Files to create/modify**: `.claude/skills/session-create/SKILL.md` (modify), `.claude/skills/session-inherit/SKILL.md` (modify)
- **ACs covered**: AC-7, AC-8
- **Depends on**: ST-3, ST-5
- **Verification**: `grep -l "Session Lifecycle" .claude/skills/session-create/SKILL.md .claude/skills/session-inherit/SKILL.md | wc -l` — outputs `2`

---

**Story sizing**: 1 point. 6 subtasks covering 10 ACs across 2 markdown files. Low complexity, no TypeScript, straightforward documentation authoring.
