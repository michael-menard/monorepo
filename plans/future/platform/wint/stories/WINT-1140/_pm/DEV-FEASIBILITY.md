# Dev Feasibility Review: WINT-1140

# Feasibility Summary
- **Feasible for MVP**: yes
- **Confidence**: high
- **Why**: The primary deliverable is a markdown command doc update (.claude/commands/dev-implement-story.md), not TypeScript source. All required capabilities exist: wt-new and wt-switch skills are present, worktree_register and worktree_get_by_story MCP tools are delivered by WINT-1130, and the step-numbered orchestrator pattern has a clear insertion point at Step 1.3. The main risk is verifying the wt-switch skill interface before assuming it accepts the right parameters.

---

# Likely Change Surface (Core Only)

- `.claude/commands/dev-implement-story.md` — primary modification: add Step 1.3 (Worktree Pre-flight) to the orchestrator sequence
- `packages/backend/orchestrator/src/artifacts/CHECKPOINT.yaml` or its Zod schema — add `worktree_id` field
- No new packages needed
- No new MCP tools needed (all provided by WINT-1130)
- No new wt-* skills needed (wt-new, wt-switch called unchanged)

---

# MVP-Critical Risks (Max 5)

## Risk 1: wt-switch Skill Interface Unknown
- **Why it blocks MVP**: AC-3 and AC-4 option (a) require calling `/wt:switch` with a worktree path or branch name. If wt-switch does not accept these parameters in the expected format, the "resume in existing worktree" path fails.
- **Required mitigation**: During implementation setup, read `.claude/skills/wt-switch/SKILL.md` and confirm the exact invocation syntax. If wt-switch does not support path-based switching, the scope needs adjustment (may need to use `git worktree list` output parsing instead).

## Risk 2: wt-new Output Parseability
- **Why it blocks MVP**: AC-2 requires passing `worktree_path` and `branch_name` to `worktree_register` after `/wt:new` runs. If wt-new does not output these values in a parseable format, the orchestrator cannot extract them.
- **Required mitigation**: During implementation setup, read `.claude/skills/wt-new/SKILL.md` and confirm what the skill outputs. If output is unstructured, the implementation must use `git worktree list` to discover the path after creation.

## Risk 3: CHECKPOINT.yaml Schema Enforcement
- **Why it blocks MVP**: If CHECKPOINT.yaml has a Zod schema in `packages/backend/orchestrator/src/artifacts/` that is enforced at read/write time, adding `worktree_id` without updating the schema will cause type errors.
- **Required mitigation**: Check `packages/backend/orchestrator/src/artifacts/` for checkpoint schema definition. If it exists, add `worktree_id: z.string().uuid().optional()` field. This is a small TypeScript change but must not be overlooked.

## Risk 4: WINT-1130 MCP Tools Not Yet Live
- **Why it blocks MVP**: Integration testing for WINT-1140 requires `worktree_register` and `worktree_get_by_story` to be callable from the MCP server. If WINT-1130 is not fully deployed at implementation time, integration tests cannot run.
- **Required mitigation**: Confirm WINT-1130 merge status before running integration tests. The command doc can be written and reviewed independently — only the final integration test gate requires WINT-1130 to be live.

---

# Missing Requirements for MVP

None blocking. The seed is well-specified with a clear insertion point (Step 1.3), clear MCP tool contracts, and clear skill references.

**One clarification needed during setup**: The exact invocation syntax for `/wt:new` and `/wt:switch` (see Risk 1 and Risk 2 above). The implementation must verify these before writing the orchestrator logic.

---

# MVP Evidence Expectations

- CHECKPOINT.yaml shows `worktree_id` field populated after Step 1.3
- `core.worktrees` DB table has an active row for the story
- All 3 pre-flight scenarios (no worktree, matching worktree, different-session worktree) demonstrated in integration tests
- `--skip-worktree` flag bypasses all MCP calls (verified by absence of DB row)
- `git worktree list` shows correct worktree state after each scenario
- No modifications to any wt-* skill files (diff must show zero changes to `.claude/skills/wt-*/`)

---

# Estimated Sizing

- **Type**: feature
- **Complexity**: Low-Medium
- **Estimated story points**: 3
- **Estimated days**: 2-3 days
- **Estimated tokens**: 40K-70K (markdown doc update + CHECKPOINT schema + integration testing)
- **Main risk to estimate**: wt-switch interface verification (adds ~0.5 days if interface mismatch found)
