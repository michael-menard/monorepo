---
created: 2026-01-24
updated: 2026-01-24
version: 2.1.0
---

# Refactor Command to Phase Leader Pattern

Refactor a command file to use the phase leader pattern.

---

## FIRST: Get Command File

Before doing anything else, ask for the command file:

```
Which command would you like to refactor?

Please provide:
1. **File path** (e.g., `.claude/commands/dev-implement-story.md`)
   — OR —
2. **Command name** (e.g., `/dev-implement-story` or `dev-implement-story`)

I'll locate the file and begin the audit.
```

**If user provides command name** (not path):
- Search `.claude/commands/` for matching file
- Confirm: "Found `.claude/commands/<name>.md` — is this correct?"

**If file not found**:
- List available commands: `ls .claude/commands/*.md`
- Ask user to select from list

**Once confirmed**, proceed with the audit using `<FILE_PATH>` = the confirmed path.

---

## Context Documents (READ FIRST - MANDATORY)

**STOP. Before ANY analysis, you MUST read these files using the Read tool.**

### Required Reading Checklist

Use the Read tool to load each file. Do NOT proceed until all are read:

| # | Document | Location | What to Look For |
|---|----------|----------|------------------|
| 1 | **COMMANDS.md** | `docs/COMMANDS.md` | Current command entry, status transitions, artifacts |
| 2 | **SKILLS.md** | `docs/SKILLS.md` | Skills this command uses or chains to |
| 3 | **FULL_WORKFLOW.md** | `docs/FULL_WORKFLOW.md` | Where command fits in workflow, agent relationships |
| 4 | **FEATURE-DEVELOPMENT-WORKFLOW.md** | `docs/FEATURE-DEVELOPMENT-WORKFLOW.md` | User-facing docs, mermaid diagrams, troubleshooting |
| 5 | **Lean Docs Standard** | `.claude/agents/_shared/lean-docs.md` | Output format rules (YAML over prose) |

Optional (read if relevant):
- **Junior Guardrails** | `.claude/agents/_shared/junior-guardrails.md` | Safety guardrails
- **Executive Demo Guide** | `.claude/docs/executive-demo-guide.md` | Demo script

### Context Loading Report (REQUIRED)

After reading, report what you found:

```
## Context Loading Report

| Doc | Read? | Command Found? | Last Updated | Notes |
|-----|-------|----------------|--------------|-------|
| COMMANDS.md | ✓ | Line XX | YYYY-MM-DD | <current description> |
| SKILLS.md | ✓ | Line XX or N/A | YYYY-MM-DD | <skills referenced> |
| FULL_WORKFLOW.md | ✓ | Section XX | YYYY-MM-DD | <workflow position> |
| FEATURE-DEVELOPMENT-WORKFLOW.md | ✓ | Section XX | YYYY-MM-DD | <user doc status> |
| lean-docs.md | ✓ | — | — | <output rules confirmed> |
```

### Documents That MUST Be Updated

These documents MUST be updated if the refactor changes:
- Command behavior or status transitions → COMMANDS.md, FEATURE-DEVELOPMENT-WORKFLOW.md
- Agent responsibilities or outputs → FULL_WORKFLOW.md, FEATURE-DEVELOPMENT-WORKFLOW.md
- Workflow phases or decision points → FULL_WORKFLOW.md, FEATURE-DEVELOPMENT-WORKFLOW.md
- Skill usage patterns → SKILLS.md

---

## Step 0: Pre-Flight Checks (REQUIRED)

Before any refactoring, perform these safety checks.

### 0.1 Dependency Analysis

Identify what depends on this command:

```
## Dependency Analysis: <command>

### Commands that call this command
Search for `/<command>` in `.claude/commands/`:
- <list or "none found">

### Agents that reference this command
Search for `/<command>` in `.claude/agents/`:
- <list or "none found">

### Skills that chain to this command
Check "Next Step" sections in skills:
- <list or "none found">

### Documentation references
- COMMANDS.md: <referenced? line number>
- FULL_WORKFLOW.md: <referenced? section>
- Other: <list>

### Impact Summary
| Dependency | Type | Impact |
|------------|------|--------|
| <name> | <type> | <must update/test/notify> |
```

### 0.2 Safety Plan

Before modifying files:

```
## Safety Plan

### Git Branch
- [ ] Create branch: `refactor/<command>-phase-leaders`
- [ ] Verify clean working directory

### In-Progress Work Check
Stories currently using this command:
- <list from `plans/stories/in-progress/` or "none">

### Rollback Plan
If refactor fails:
1. `git checkout main -- .claude/commands/<command>.md`
2. Delete new leader agents: `rm .claude/agents/<command>-*-leader.agent.md`
3. Delete reference doc: `rm .claude/docs/<command>-reference.md`
```

### 0.3 Backward Compatibility Check

```
## Backward Compatibility

### Existing Artifacts
Check for in-progress stories with artifacts from current command:
- [ ] Search `plans/stories/*/` for command-specific artifacts
- [ ] Identify format differences (old → new)

| Artifact | Old Format | New Format | Migration Needed |
|----------|------------|------------|------------------|
| <file> | <format> | <format> | Yes/No |

### Migration Strategy
If migration needed:
- [ ] Auto-convert in setup phase
- [ ] Manual migration script
- [ ] Version gate (old artifacts fail fast with clear message)
```

---

## Step 1: Audit & Recommend (THIS SESSION)

First, analyze the command and present recommendations. **Do NOT create any files yet.**

### 1.1 Audit

Read the command file and report:

```
## Audit: <command-name>

**Lines**: X
**Current structure**: monolithic | partial-agents | already-refactored

### Bloat Identified
- [ ] Embedded sub-agent prompts (~X lines)
- [ ] Detailed step-by-step instructions (~X lines)
- [ ] ASCII diagrams/tables (~X lines)
- [ ] Examples/notes (~X lines)

### Execution Phases Found
1. <phase> - <what it does>
2. <phase> - <what it does>
...

### Reusable Agents
| Agent | Can Reuse | Adjustment Needed |
|-------|-----------|-------------------|
| `<agent>.md` | Yes/No | <what to change> |

### Current Patterns
- Sub-agents spawned: Yes/No
- Parallel execution: Yes/No
- Artifacts used: <list>

### Documentation Output
- Output format: markdown | yaml | mixed
- Prose vs structured: heavy prose | tables | structured yaml
- Empty sections present: Yes/No
- Uses unified files (VERIFICATION.yaml): Yes/No
- Follows lean-docs.md: Yes/No/Partial
```

### 1.2 Recommend Phase Leaders

Propose the architecture:

```
## Recommended Architecture

| # | Phase | Mission | Workers | Model | Signal |
|---|-------|---------|---------|-------|--------|
| 0 | Setup | <mission> | (self) | haiku | SETUP COMPLETE |
| 1 | ... | ... | ... | ... | ... |

### Model Justification
- Phase 0 (haiku): <why>
- Phase 1 (sonnet): <why>
...

### Reuse Summary
- **Reusing**: <list of existing agents>
- **Creating**: <list of new agents>

### Estimated Reduction
| Metric | Before | After (est) | Change |
|--------|--------|-------------|--------|
| Orchestrator | X lines | ~40 lines | ~Y% |
| Cost (model mix) | all opus | X haiku, Y sonnet | ~Z% |
| Doc tokens | X per run | ~Y per run | ~Z% |

### Documentation Changes
- [ ] Convert markdown outputs to YAML
- [ ] Merge separate review files into VERIFICATION.yaml
- [ ] Apply lean-docs.md rules (skip empty, structured over prose)
```

### 1.3 Recommend Execution Approach

Based on complexity, recommend one of:

```
## Recommended Approach

**Option A: Single Session** (small commands, <200 lines)
- Create all files in this session
- Best for: simple commands with 2-3 phases

**Option B: Two Sessions** (medium commands, 200-400 lines)
- Session 1: Create shared files + phase leaders
- Session 2: Create reference doc + update orchestrator
- Best for: commands with 4-5 phases

**Option C: Multi-Session** (large commands, >400 lines)
- Session 1: Create shared files (if needed)
- Session 2: Create phase leaders (1-2 per session)
- Session 3: Create reference doc
- Session 4: Update orchestrator
- Best for: complex commands with many phases

**My recommendation**: Option X because <reason>

### Estimated Effort

| Size | Lines | Phases | Sessions | Est. Tokens |
|------|-------|--------|----------|-------------|
| Small | <200 | 2-3 | 1 | ~50k |
| Medium | 200-400 | 4-5 | 2 | ~100k |
| Large | >400 | 6+ | 3-4 | ~200k |

This command is: <size> → <estimated effort>
```

### 1.4 Enhancement Recommendations

**IMPORTANT**: Evaluate against the "What Makes a Killer Command" section (end of this document).
For each high-ROI feature, assess whether it should be added during this refactor.

Report:

```
## Enhancement Recommendations

### High-ROI Features Assessment

| Feature | Has It? | Recommendation |
|---------|---------|----------------|
| Checkpoint & Resume | ❌/⚠️/✅ | <specific recommendation> |
| Dry-Run Mode | ❌/⚠️/✅ | <specific recommendation> |
| Cost Budget | ❌/⚠️/✅ | <specific recommendation> |
| Approval Gates | ❌/⚠️/✅ | <specific recommendation> |
| Self-Diagnosis | ❌/⚠️/✅ | <specific recommendation> |
| Incremental Execution | ❌/⚠️/✅ | <specific recommendation> |
| Semantic Validation | ❌/⚠️/✅ | <specific recommendation> |
| Context Carryover | ❌/⚠️/✅ | <specific recommendation> |
| Blast Radius Check | ❌/⚠️/✅ | <specific recommendation> |
| Workflow Orchestration | ❌/⚠️/✅ | <specific recommendation> |

Legend: ❌ = Missing, ⚠️ = Partial, ✅ = Has it

### Command-Specific Gaps

Beyond the standard features, this command specifically needs:
- [ ] <gap unique to this command's domain>
- [ ] <missing edge case handling>
- [ ] <integration it should have>

### What Would Make This Command 10x Better

The single highest-impact improvement for this specific command:
> <one clear recommendation with rationale>

### Quick Wins (Add During Refactor)

These can be added with minimal effort during the refactor:
1. <feature> - <how to add it> - <expected benefit>
2. <feature> - <how to add it> - <expected benefit>

### Future Enhancements (Separate Effort)

These need dedicated work but would be valuable:
1. <feature> - <why it matters> - <rough scope>
2. <feature> - <why it matters> - <rough scope>
```

### 1.5 MCP & Tooling Integration Assessment

Evaluate what MCPs and tools could enhance this command:

```
## MCP & Tooling Integration

### Current Tooling Used
- [ ] Playwright MCP (browser automation, screenshots, E2E)
- [ ] Chrome DevTools MCP (Lighthouse, performance metrics)
- [ ] Knowledge Base MCP (codebase search, documentation)
- [ ] GitHub MCP (PR creation, issue management)
- [ ] Database MCP (schema inspection, query validation)
- [ ] Other: <list>

### Recommended MCP Integrations

| MCP | Use Case in This Command | Phase |
|-----|--------------------------|-------|
| <mcp> | <how it would help> | <which phase> |

### Recommended MCPs by Command Type

**Backend/API Commands:**
- **Database MCP** - Schema validation, migration verification
- **HTTP Client MCP** - Contract testing, API verification
- **OpenAPI MCP** - Spec validation, documentation sync

**Frontend/UI Commands:**
- **Playwright MCP** - E2E testing, screenshot capture, interaction verification
- **Chrome DevTools MCP** - Lighthouse audits, performance metrics, accessibility
- **Figma MCP** - Design token validation, component matching

**Code Quality Commands:**
- **ESLint MCP** - Real-time lint results
- **TypeScript MCP** - Type checking, inference analysis
- **Dependency Cruiser MCP** - Architecture validation

**Documentation Commands:**
- **Knowledge Base MCP** - Search existing docs, find patterns
- **Markdown MCP** - Validate formatting, link checking

**General Enhancements:**
- **GitHub MCP** - PR creation, issue linking, code review comments
- **Slack MCP** - Notifications on completion/failure
- **Metrics MCP** - Token tracking, cost logging

### Missing Tooling Gaps

If no MCP exists for a need, note it:
- [ ] <gap> - <what's needed> - <workaround or feature request>
```

### 1.6 Documentation Update Requirements

Identify what docs need updating after this refactor:

```
## Documentation Updates Required

### COMMANDS.md
- [ ] Update command description
- [ ] Update status transitions
- [ ] Update artifacts produced
- [ ] Add new commands (if any)

### SKILLS.md
- [ ] Update skill usage (if applicable)
- [ ] Add new skills (if any)

### FULL_WORKFLOW.md
- [ ] Update phase diagrams
- [ ] Update agent relationships
- [ ] Update decision points
- [ ] Update files created tables

### FEATURE-DEVELOPMENT-WORKFLOW.md
- [ ] Update command reference table (Section 3)
- [ ] Update phase diagrams (Section 4)
- [ ] Update artifacts table (Section 5)
- [ ] Update troubleshooting (Section 7)
- [ ] Update version/date at bottom

### Other Docs
- [ ] <doc> - <what needs updating>
```

### 1.7 Ask for Approval

End with:

```
## Ready to Proceed?

1. **Approve plan** - Continue with recommended approach
2. **Approve + enhancements** - Include high-priority enhancements
3. **Approve + MCP integrations** - Include recommended MCP additions
4. **Modify** - Adjust phases, models, or approach
5. **Single session** - Do everything now regardless of size
6. **Stop** - Just use this analysis, I'll refactor manually

Which option?
```

---

## Step 2: Create Shared Files (IF NEEDED)

Only if `.claude/agents/_shared/` doesn't exist or is missing files:

**lean-docs.md:** (CRITICAL - defines all output format rules)
```markdown
# Lean Documentation Standard

## Rules
1. Structured over prose (tables/YAML, not paragraphs)
2. Skip empty sections entirely
3. Evidence as references, not full copies
4. One-line verdicts

## Standard File Formats
- VERIFICATION.yaml (replaces CODE-REVIEW + QA-VERIFY + QA-GATE)
- EPIC-REVIEW.yaml (replaces 6 perspective files + analysis)

See full spec in existing file.
```

**token-tracking.md:**
```markdown
# Token Tracking Standard

## For Workers
End output with:
## Tokens
- In: ~X (bytes read / 4)
- Out: ~Y (bytes written / 4)

## For Leaders
Before completion signal:
/token-log STORY-XXX <phase-name> <input> <output>
```

**completion-signals.md:**
```markdown
# Completion Signals Standard

| Signal | Meaning |
|--------|---------|
| `<PHASE> COMPLETE` | Success, proceed |
| `<PHASE> BLOCKED: <reason>` | Needs input |
| `<PHASE> FAILED: <reason>` | Work failed |
```

**story-context.md:**
```markdown
# Story Context Standard

Setup phase creates `_implementation/AGENT-CONTEXT.md`:
story_id: STORY-XXX
base_path: plans/stories/STORY-XXX/
artifacts_path: plans/stories/STORY-XXX/_implementation/
<workflow-specific fields>
```

---

## Step 3: Create Phase Leaders

Use compressed template (note: frontmatter is REQUIRED):

```markdown
---
created: {{DATE}}
updated: {{DATE}}
version: 1.0.0
type: leader
triggers: ["/<command>"]
---

# Agent: <command>-<phase>-leader

**Model**: haiku | sonnet

## Mission
<1 sentence>

## Inputs
Read from `_implementation/AGENT-CONTEXT.md`:
- <fields>

## Output Format
Follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown
- Skip empty sections
- One-line findings
- Evidence as references

If this phase produces artifacts:
- Use VERIFICATION.yaml (not separate .md files)
- Append to existing sections, don't overwrite

## Workers
| Worker | Agent | Condition |
|--------|-------|-----------|

## Steps
1. **Step** - description
2. **Spawn workers** - `run_in_background: true` for parallel
   ```
   prompt: |
     Read instructions: .claude/agents/<agent>.md
     CONTEXT:
     Story: STORY-XXX
     OUTPUT: YAML only, follow lean-docs.md
   ```
3. **Wait** for signals
4. **Handle errors** per retry policy

## Retry Policy
| Error | Action |
|-------|--------|

## Signals
- `<PHASE> COMPLETE`
- `<PHASE> BLOCKED: <reason>`
- `<PHASE> FAILED: <reason>`

## Output
Format: YAML (not prose)
Max: N lines
```yaml
phase: <phase-name>
verdict: PASS | FAIL
metrics:
  files_created: N
  tests_passed: N
findings: []  # only if issues
```

## Token tracking
See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log STORY-XXX <phase> <in> <out>`
```

---

## Step 4: Create Reference Doc

Write to `.claude/docs/<command>-reference.md`:

```markdown
# <Command> - Reference

## Architecture
<ASCII diagram, max 15 lines>

## Output Format
All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

Primary artifact: `VERIFICATION.yaml` or command-specific YAML

## Artifacts
| File | Created By | Purpose |
|------|------------|---------|

## Signals
See: `.claude/agents/_shared/completion-signals.md`

## Token Tracking
See: `.claude/agents/_shared/token-tracking.md`

## Retry Policy
| Phase | Error | Retries |
|-------|-------|---------|

## Troubleshooting
| Issue | Check |
|-------|-------|
```

---

## Step 5: Rewrite Orchestrator

Replace command with (~40 lines, frontmatter REQUIRED):

```markdown
---
created: {{ORIGINAL_DATE}}
updated: {{DATE}}
version: X.0.0
type: orchestrator
agents: ["<command>-setup-leader.agent.md", "<command>-...-leader.agent.md"]
---

/<command> <ARGS>

<1 sentence role>. Do NOT implement directly.

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|

## Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N <Command> STORY-XXX"
  prompt: |
    Read instructions: .claude/agents/<agent>
    Story ID: STORY-XXX
```

- Wait for signal
- BLOCKED/FAILED → stop, report
- COMPLETE → next phase

## Error
Report: "STORY-XXX blocked at Phase N: <reason>"

## Done
<final state>
**Next**: `/<next-command> STORY-XXX`

## Ref
`.claude/docs/<command>-reference.md`
```

---

## Step 5.5: Smoke Test (REQUIRED)

Before reporting complete, verify the refactored command works:

```
## Smoke Test Results

### Parse Check
- [ ] Orchestrator YAML frontmatter valid
- [ ] All leader agents have valid frontmatter
- [ ] No syntax errors in markdown

### Setup Phase Test
Run setup phase only with a test story:
- [ ] Phase 0 executes without error
- [ ] Expected artifacts created
- [ ] Completion signal emitted correctly

### Signal Check
Verify signals work:
| Phase | Expected Signal | Actual |
|-------|-----------------|--------|
| Setup | SETUP COMPLETE | ✓/✗ |
| ... | ... | ... |

### Quick Validation
| Test | Result |
|------|--------|
| Orchestrator parses | ✓/✗ |
| Leaders spawn correctly | ✓/✗ |
| Artifacts created | ✓/✗ |
| Signals emit | ✓/✗ |

If any fail → debug before marking complete.
```

---

## Step 6: Report Results

```
## Refactor Complete: <command>

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Orchestrator | X lines | Y lines | Z% |
| Phase leaders | 0 | N | — |
| Reused workers | — | N | — |
| Model mix | all opus | X haiku, Y sonnet | ~Z% cost |

### Files Created
- `.claude/agents/<command>-*-leader.agent.md`
- `.claude/docs/<command>-reference.md`

### Files Updated
- `.claude/commands/<command>.md`

### Obsolete Files (Candidates for Deletion)

Files no longer needed after refactor:
| File | Reason | Action |
|------|--------|--------|
| <file> | Logic moved to leader | Delete / Archive |

**Note**: Files without frontmatter can be safely deleted.
Files with frontmatter should have version deprecated or be archived.

### Version Summary
| File | Old Version | New Version | Change Type |
|------|-------------|-------------|-------------|
| `<command>.md` | 1.x.x | 2.0.0 | Major (refactor) |
| `<leader>.agent.md` | — | 1.0.0 | New |

### Next Steps
- [ ] Test end-to-end with real task
- [ ] Verify all signals work correctly
- [ ] Check token usage in practice
- [ ] Delete obsolete files (after validation)
- [ ] Merge branch to main
```

---

## Step 7: Update Documentation (REQUIRED - HARD GATE)

**⚠️ DO NOT report "Refactor Complete" until this step is done.**

After refactoring, you MUST update all affected documentation. Use the Edit tool to make changes.

### 7.1 Update COMMANDS.md

Read `docs/COMMANDS.md`, find the command entry, and update:

```markdown
### `/<command>`

**Usage:** `/<command> <ARGS>`

<updated description>

**Pipeline Phases:**
| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `<command>-setup-leader.agent.md` | `<artifact>` |
...

**Status Transition:** `<from>` → `<to>`

**Next Step:** `/<next-command>`
```

### 7.2 Update FULL_WORKFLOW.md

Read `docs/FULL_WORKFLOW.md` and update:
- Agent diagrams in relevant phase section
- "Files Created" tables
- Decision points if verdicts changed
- Add changelog entry at bottom

### 7.3 Update SKILLS.md

Read `docs/SKILLS.md` and update (if applicable):
- Skill descriptions
- "When Used" guidance
- Workflow integration section

### 7.4 Update FEATURE-DEVELOPMENT-WORKFLOW.md

Read `docs/FEATURE-DEVELOPMENT-WORKFLOW.md` and update:
- Command reference table (Section 3)
- Phase diagrams if workflow changed (Section 4)
- Artifacts table if new files created (Section 5)
- Troubleshooting section if new failure modes (Section 7)
- Update version and date at bottom of file

### 7.5 Verification (REQUIRED OUTPUT)

After making all edits, report exactly what changed:

```
## Documentation Sync Verification

| Doc | Updated | Edit Made | Line Numbers |
|-----|---------|-----------|--------------|
| COMMANDS.md | ✓/✗ | <what changed> | L123-145 |
| SKILLS.md | ✓/✗/N/A | <what changed> | L45-50 |
| FULL_WORKFLOW.md | ✓/✗ | <what changed> | L200-220 |
| FEATURE-DEVELOPMENT-WORKFLOW.md | ✓/✗ | <what changed> | L300-350 |

**Confirmation:** All documentation is now in sync with refactored command.
```

**If you skip this step, the refactor is INCOMPLETE and will cause drift.**

---

## What Makes a Killer Command

Reference this when evaluating and enhancing commands.

### Table Stakes (You Probably Have These)

| Category | Features |
|----------|----------|
| **Reliability** | Precondition validation, idempotent, graceful degradation |
| **Observability** | Progress indicators, token tracking, artifact trail |
| **Robustness** | Retry logic, timeout handling, blocker detection |
| **Integration** | Chain-friendly, artifact compatibility, workflow awareness |
| **UX** | Single entry point, sensible defaults, clear summaries |
| **Efficiency** | Parallel workers, model tiering, minimal context |

### High-ROI Features Often Missed

Evaluate the command against these - they pay dividends:

#### 1. Checkpoint & Resume
**Problem**: Command fails at Phase 3, you lose all Phase 0-2 work and tokens.
**Solution**: Write `CHECKPOINT.md` after each phase with state. On restart, detect checkpoint and skip completed phases.
```markdown
# _implementation/CHECKPOINT.md
last_completed_phase: 2
phase_0_signal: SETUP COMPLETE
phase_1_signal: PLANNING COMPLETE
phase_2_signal: IMPLEMENTATION COMPLETE
resume_from: 3
```
**ROI**: Saves 50-80% tokens on retry after late-stage failure.

#### 2. Dry-Run Mode
**Problem**: You want to see what a command would do before committing tokens.
**Solution**: Add `--dry-run` flag that runs Setup phase only, outputs planned actions.
```
/dev-implement-story STORY-007 --dry-run
→ Would create: 4 files, modify: 2 files
→ Estimated phases: 5
→ Estimated tokens: ~150k
→ Estimated cost: ~$0.50
```
**ROI**: Prevents wasted runs, builds confidence.

#### 3. Cost Budget & Estimation
**Problem**: Command burns through tokens with no warning.
**Solution**: Estimate cost before each phase. Stop if approaching budget.
```markdown
## Budget Check
- Budget: 200k tokens
- Used: 145k tokens
- Phase 4 estimate: 40k tokens
- Status: WARN - may exceed budget
- Action: Proceed with caution | Pause for approval
```
**ROI**: No surprise bills, better planning.

#### 4. Approval Gates (Not Just End)
**Problem**: Command makes wrong decision in Phase 2, you don't find out until Phase 5.
**Solution**: Insert approval gates at high-risk decision points.
```markdown
## Approval Gate: Implementation Plan

The plan includes:
- Creating new package: `packages/backend/new-service`
- Modifying shared type: `packages/core/types/user.ts`

⚠️ Shared type modification affects 12 consumers.

[Approve] [Modify] [Abort]
```
**ROI**: Catches expensive mistakes early.

#### 5. Self-Diagnosis on Failure
**Problem**: Command fails with "BLOCKED: type errors" - user doesn't know why or how to fix.
**Solution**: On failure, spawn a diagnostic agent that analyzes and recommends.
```markdown
## Failure Diagnosis

**Failed at**: Phase 2 (Implementation)
**Signal**: BLOCKED: type errors

**Root Cause Analysis**:
- File: `packages/backend/user-service/index.ts:45`
- Error: Property 'email' does not exist on type 'User'
- Likely cause: User type was updated in STORY-005 but this code wasn't migrated

**Recommended Fix**:
1. Update import to use `UserV2` from `@repo/types`
2. Or add `email` field to local User interface

**Auto-fix available**: Yes
[Apply fix and retry] [Show diff] [Abort]
```
**ROI**: Turns dead-ends into guided recovery.

#### 6. Incremental Execution
**Problem**: Re-running command redoes work that's already done.
**Solution**: Hash inputs, skip phases whose inputs haven't changed.
```markdown
## Incremental Check
- STORY-XXX.md: unchanged (hash: abc123)
- IMPLEMENTATION-PLAN.md: unchanged (hash: def456)
- Source files: 2 modified since last run

Skipping: Phase 0 (Setup), Phase 1 (Planning)
Starting at: Phase 2 (Implementation) - only modified files
```
**ROI**: 60-80% faster on iteration cycles.

#### 7. Semantic Validation
**Problem**: Command "completes" but output doesn't actually satisfy requirements.
**Solution**: Post-completion validation that checks meaning, not just existence.
```markdown
## Semantic Validation

Checking PROOF-STORY-XXX.md against STORY-XXX.md...

| AC | Claimed Evidence | Validation |
|----|------------------|------------|
| AC1 | "See UserService.ts:45" | ✓ Code exists and matches |
| AC2 | "Test in user.test.ts" | ⚠️ Test exists but doesn't assert AC2 |
| AC3 | "Manual verification" | ✗ No automated evidence |

**Result**: PARTIAL - 1 of 3 ACs fully validated
```
**ROI**: Catches false completions before downstream.

#### 8. Context Carryover
**Problem**: Each command starts fresh, doesn't learn from previous runs.
**Solution**: Maintain a learning file that captures patterns.
```markdown
# .claude/learnings/dev-implement.md

## Common Failures
- Type errors in user-service: Usually missing V2 migration
- Frontend build fails: Check for missing tailwind classes

## Successful Patterns
- Backend + Frontend parallel: Works when no shared types
- Contracts after backend: Required for API stories

## Story-Specific Notes
- STORY-007: Required manual DB migration, document this
```
**ROI**: Compound improvement over time.

#### 9. Blast Radius Check
**Problem**: Change looks small but affects many consumers.
**Solution**: Before implementation, analyze impact.
```markdown
## Blast Radius Analysis

Planned changes to: `packages/core/types/user.ts`

**Direct consumers**: 8 packages
**Indirect consumers**: 23 files
**Test coverage of affected**: 67%

**Risk assessment**: MEDIUM
- High-traffic code paths affected
- Some consumers have low test coverage

**Recommendation**: Add tests to `apps/web/main-app/UserProfile` before proceeding
```
**ROI**: Prevents cascade failures.

#### 10. Workflow Orchestration
**Problem**: User has to manually chain commands: implement → review → fix → review → qa.
**Solution**: Meta-command that runs the full workflow with gates.
```
/dev-complete-story STORY-007

Phase 1: Implementation → [auto]
Phase 2: Code Review → [gate: if FAIL, auto-fix up to 2x]
Phase 3: QA Verify → [gate: if FAIL, return to Phase 1]
Phase 4: Complete → [auto-merge if approved]
```
**ROI**: Hands-off execution of full workflow.

### Priority Matrix

| Feature | Token Savings | Time Savings | Risk Reduction | Effort |
|---------|---------------|--------------|----------------|--------|
| Checkpoint & Resume | High | High | Medium | Low |
| Dry-Run Mode | Medium | Medium | High | Low |
| Cost Budget | Medium | Low | High | Low |
| Approval Gates | Low | Medium | High | Medium |
| Self-Diagnosis | High | High | Medium | Medium |
| Incremental Exec | High | High | Low | High |
| Semantic Validation | Low | Medium | High | Medium |
| Context Carryover | Medium | Medium | Medium | Low |
| Blast Radius | Low | Low | High | Medium |
| Workflow Orchestration | High | High | Medium | High |

**Quick wins** (add during refactor): Checkpoint & Resume, Dry-Run, Cost Budget
**Next iteration**: Self-Diagnosis, Approval Gates, Context Carryover
**Major investment**: Incremental Execution, Workflow Orchestration

---

## Version Strategy

When versioning refactored files:

| Scenario | Version Change | Example |
|----------|----------------|---------|
| New leader agent | `1.0.0` | First creation |
| New worker agent | `1.0.0` | First creation |
| Refactored orchestrator | Major bump | `1.x.x` → `2.0.0` |
| Existing worker modified | Minor if additive | `1.0.0` → `1.1.0` |
| Existing worker breaking change | Major | `1.1.0` → `2.0.0` |
| Bug fix / clarification | Patch | `1.1.0` → `1.1.1` |

**Always**:
- Update `updated` date on all touched files
- Preserve original `created` date
- Use today's date for new files

---

## Shared Worker Impact

If modifying a worker used by multiple commands:

### 1. Find All Consumers

```bash
grep -r "<worker>.md" .claude/commands/
grep -r "<worker>.md" .claude/agents/
```

### 2. Report Impact

```
## Shared Worker Impact: <worker>

Used by:
| Command/Agent | How It Uses Worker | Breaking Change? |
|---------------|-------------------|------------------|
| `/dev-implement` | Spawns for backend | Yes - input format |
| `/dev-fix` | Spawns for fixes | No |

### Migration Required
- [ ] Update all consumers in same session
- [ ] Or create follow-up tasks for each consumer
- [ ] Or version the worker (keep old, create new)
```

### 3. Decision

- **Same session**: Update all consumers now (preferred for <3 consumers)
- **Follow-up tasks**: Create tasks to update each consumer
- **Version fork**: Keep `worker-v1.md`, create `worker-v2.md`

---

## Optimization Checklist

Applied to all new agents:

- [ ] **Frontmatter**: REQUIRED on all agents/commands (created, updated, version)
- [ ] **Self-loading**: `Read instructions: .claude/agents/<file>` (not embedded)
- [ ] **Model tiering**: haiku for simple, sonnet for complex
- [ ] **Compressed format**: No verbose prose, just instructions
- [ ] **AGENT-CONTEXT.md**: Setup writes, others read
- [ ] **Output constraints**: Max line limits on all outputs
- [ ] **Shared refs**: `See: _shared/<file>.md` (not repeated)
- [ ] **Parallel workers**: Single message with `run_in_background: true`
- [ ] **Lean docs**: YAML over markdown, skip empty sections (see `lean-docs.md`)
- [ ] **Unified files**: Use VERIFICATION.yaml not separate review files

See `.claude/agents/_shared/FRONTMATTER.md` for frontmatter standard.

## Unified Output Files

### VERIFICATION.yaml (for code review + QA + gate)

Commands that produce verification artifacts should write to a single file:

```yaml
schema: 1
story: STORY-XXX
updated: <timestamp>

code_review:
  verdict: PASS | FAIL
  lint: PASS | FAIL
  types: PASS | FAIL
  findings: []  # only if issues

qa_verify:
  verdict: PASS | FAIL
  tests_executed: true
  test_results:
    unit: { pass: N, fail: N }
  coverage: NN%
  acs_verified:
    - ac: "AC text"
      status: PASS
      evidence: "file:line"

gate:
  decision: PASS | CONCERNS | FAIL
  reason: "one line"
```

**Replaces**: CODE-REVIEW-XXX.md + QA-VERIFY-XXX.md + QA-GATE-XXX.yaml

### EPIC-REVIEW.yaml (for epic elaboration)

Epic-level reviews use single file with all perspectives:

```yaml
schema: 1
epic: PREFIX
reviewed: <timestamp>

verdict: READY | CONCERNS | BLOCKED

perspectives:
  engineering: { verdict: READY, critical: [], high: [] }
  product: { verdict: READY, gaps: [] }
  qa: { verdict: READY, coverage_gaps: [] }
  ux: { verdict: CONCERNS, a11y_issues: [...] }
  platform: { verdict: READY, infra_concerns: [] }
  security: { verdict: READY, owasp_gaps: [] }

findings:
  critical: []
  high: []
```

**Replaces**: 6 perspective markdown files + EPIC-ANALYSIS.md

---

## Session Continuation Prompts

If using multi-session approach, use these to continue:

**Session 2+ (Phase Leaders):**
```
Continue refactoring <command>. Create phase leaders N-M per the approved plan.
```

**Session N (Reference Doc):**
```
Continue refactoring <command>. Create the reference doc per the approved plan.
```

**Final Session (Orchestrator):**
```
Continue refactoring <command>. Update the orchestrator per the approved plan.
```

---

## MCP Integration Reference

### Available MCPs

| MCP | Purpose | Best For |
|-----|---------|----------|
| **Playwright** | Browser automation, E2E testing, screenshots | UI verification, E2E tests, visual regression |
| **Chrome DevTools** | Lighthouse, performance metrics, accessibility | UI/UX review, performance audits |
| **Knowledge Base** | Codebase search, documentation retrieval | Context loading, pattern discovery |
| **GitHub** | PR creation, issue management, code review | Workflow automation, CI integration |
| **Filesystem** | File operations, directory management | Artifact creation, bulk operations |
| **SQLite/Postgres** | Database queries, schema inspection | Data verification, migration validation |

### MCP Integration Patterns

#### Pattern 1: Verification Enhancement
Use MCPs to automate manual verification steps:
```markdown
## Verification Phase

1. Run `pnpm test` (existing)
2. Run Playwright MCP screenshot capture (NEW)
3. Run Chrome DevTools MCP Lighthouse audit (NEW)
4. Aggregate results into VERIFICATION.md
```

#### Pattern 2: Context Loading
Use Knowledge Base MCP to reduce context bloat:
```markdown
## Planning Phase

Instead of reading all files manually:
1. Query Knowledge Base MCP for relevant patterns
2. Get summarized context (not full files)
3. Use summaries to create plan
```

#### Pattern 3: Automated Artifacts
Use MCPs to generate artifacts automatically:
```markdown
## Documentation Phase

1. Chrome DevTools MCP → Performance metrics
2. Playwright MCP → Screenshots for proof
3. GitHub MCP → PR description draft
```

### Recommended MCP Additions by Command Type

| Command Type | Recommended MCPs | Value Add |
|--------------|------------------|-----------|
| `/dev-implement-*` | Knowledge Base, GitHub | Faster context, auto-PR |
| `/dev-code-review` | ESLint MCP, TypeScript MCP | Real-time analysis |
| `/qa-verify-*` | Playwright, Chrome DevTools | Automated evidence |
| `/ui-ux-review` | Playwright, Chrome DevTools, Figma | Full visual audit |
| `/pm-generate-*` | Knowledge Base | Pattern reuse |

### MCP Integration Checklist

When adding MCP to a command:
- [ ] Identify which phase benefits from automation
- [ ] Verify MCP is available and configured
- [ ] Add MCP call to phase leader (not orchestrator)
- [ ] Handle MCP failures gracefully (fallback to manual)
- [ ] Log MCP results to artifacts
- [ ] Update reference doc with MCP usage

### Future MCPs to Consider

| MCP | Would Enable |
|-----|--------------|
| **Jira/Linear** | Issue tracking integration, status sync |
| **Slack/Discord** | Notifications on phase completion |
| **Sentry** | Error monitoring integration |
| **DataDog/Grafana** | Metrics dashboard integration |
| **Figma** | Design token validation |
| **Storybook** | Component documentation sync |
| **OpenAPI** | API spec validation |
| **Docker** | Container management for tests |

---

## Agent/Skill/Command Ecosystem Reference

### Hierarchy

```
Commands (orchestrate workflows)
    │
    ├─→ Phase Leaders (manage phases)
    │       │
    │       └─→ Workers (do specific tasks)
    │
    └─→ Skills (provide evidence, don't change state)
            │
            └─→ MCPs (provide tooling capabilities)
```

### When to Use What

| Need | Use | Example |
|------|-----|---------|
| Full workflow orchestration | Command | `/dev-implement-story` |
| Phase management with retry | Phase Leader | `dev-fix-fix-leader` |
| Specific task execution | Worker | `dev-implement-backend-coder` |
| Evidence generation | Skill | `/review`, `/qa-gate` |
| External tool integration | MCP | Playwright, Chrome DevTools |

### Interaction Rules

1. **Commands** call **Phase Leaders** sequentially
2. **Phase Leaders** spawn **Workers** (parallel OK)
3. **Workers** may use **Skills** for evidence
4. **Skills** may use **MCPs** for tooling
5. **MCPs** return data, don't mutate workflow state

### Shared Resources

| Resource | Location | Used By |
|----------|----------|---------|
| Frontmatter standard | `_shared/FRONTMATTER.md` | All agents/commands/skills |
| Token tracking | `_shared/token-tracking.md` | All leaders |
| Completion signals | `_shared/completion-signals.md` | All agents |
| Story context | `_shared/story-context.md` | All leaders |
| Junior guardrails | `_shared/junior-guardrails.md` | All commands |
