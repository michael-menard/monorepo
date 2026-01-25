# Agent Deep Dive: Tools, Permissions & Shared Skills Analysis

**Date**: 2026-01-24
**Agents Analyzed**: 59
**Purpose**: Document tool requirements, permission needs, and identify refactoring opportunities

---

## Agent Classification Summary

| Type | Count | Description |
|------|-------|-------------|
| **Leader** | 35 | Orchestrate phases, spawn workers, manage state |
| **Worker** | 20 | Execute specific tasks, produce artifacts |
| **Reference** | 2 | Policy documents read by other agents (qa.agent.md, uiux.agent.md) |
| **Orchestrator** | 2 | Top-level coordination (pm.agent.md, dev orchestrators) |

---

## 1. Tool Requirements by Agent Category

### 1.1 Read-Only Agents (Analysis/Review)

These agents only read files and produce reports - no code modifications.

| Agent | Tools Needed | Description |
|-------|--------------|-------------|
| `code-review-lint` | `Bash (eslint)`, `Read`, `Grep` | Runs linter, reads output |
| `code-review-style-compliance` | `Read`, `Grep`, `Glob` | Scans for style violations |
| `code-review-syntax` | `Read` | Checks ES7+ syntax |
| `code-review-security` | `Read`, `Grep` | OWASP vulnerability scan |
| `elab-analyst` | `Read`, `Glob` | Story audit against checklist |
| `elab-epic-engineering` | `Read` | Architecture/feasibility review |
| `elab-epic-product` | `Read` | Value/prioritization review |
| `elab-epic-qa` | `Read` | Testability review |
| `elab-epic-ux` | `Read` | UX/accessibility review |
| `elab-epic-platform` | `Read` | Infrastructure review |
| `elab-epic-security` | `Read` | Security review |
| `dev-implement-plan-validator` | `Read`, `Glob` | Validates implementation plan |
| `pm-draft-test-plan` | `Read` | Draft test plan |
| `pm-uiux-recommendations` | `Read` | UI/UX guidance |
| `pm-dev-feasibility-review` | `Read` | Dev feasibility assessment |

**Recommended Permission Level**: `read-only`

---

### 1.2 File-Writing Agents (Documentation)

These agents read files and write documentation/reports - no code modifications.

| Agent | Tools Needed | Description |
|-------|--------------|-------------|
| `dev-implement-proof-writer` | `Read`, `Write` | Creates PROOF files |
| `dev-implement-learnings` | `Read`, `Edit` | Updates LESSONS-LEARNED.md |
| `elab-completion-leader` | `Read`, `Write`, `Edit`, `Bash (mv)` | Writes ELAB report, moves dirs |
| `dev-documentation-leader` | `Read`, `Write`, `Edit`, `Task` | Orchestrates doc writers |
| `elab-epic-aggregation-leader` | `Read`, `Write` | Merges review YAMLs |
| `elab-epic-updates-leader` | `Read`, `Edit` | Updates stories index/roadmap |
| `pm-story-generation-leader` | `Read`, `Write`, `Edit`, `Task` | Creates story files |
| `pm-story-fix-leader` | `Read`, `Edit` | Fixes QA feedback |
| `pm-triage-leader` | `Read`, `Edit` | Updates FEATURES.md |
| `ui-ux-review-report-leader` | `Read`, `Write` | Compiles UI/UX report |
| `qa-verify-completion-leader` | `Read`, `Edit`, `Bash (mv)`, `Task` | Updates status, moves dirs |

**Recommended Permission Level**: `docs-only` (can write to `plans/`, `_implementation/`, etc.)

---

### 1.3 Code-Writing Agents (Implementation)

These agents write actual source code.

| Agent | Tools Needed | Description |
|-------|--------------|-------------|
| `dev-implement-backend-coder` | `Read`, `Write`, `Edit`, `Bash (pnpm check-types)` | Backend implementation |
| `dev-implement-frontend-coder` | `Read`, `Write`, `Edit`, `Bash (pnpm check-types)` | Frontend implementation |
| `dev-implement-contracts` | `Read`, `Write` | Swagger/HTTP files |
| `dev-implement-planner` | `Read`, `Write` | Implementation plan (no code) |

**Recommended Permission Level**: `code-write` (can write to `apps/`, `packages/`)

---

### 1.4 Test-Running Agents (Verification)

These agents run tests and capture output.

| Agent | Tools Needed | Description |
|-------|--------------|-------------|
| `dev-implement-verifier` | `Read`, `Write`, `Bash (pnpm build/test/lint)` | Runs verification commands |
| `dev-implement-playwright` | `Read`, `Edit`, `Bash (playwright)` | Runs E2E tests |
| `qa-verify-verification-leader` | `Read`, `Edit`, `Bash (pnpm test, .http)` | Full test suite |
| `ui-ux-review-reviewer` | `Read`, `Bash (lighthouse/axe)`, MCP tools | Design system + a11y checks |

**Recommended Permission Level**: `test-run` (can execute test commands)

---

### 1.5 Setup Agents (Directory/State Management)

These agents create directories and manage workflow state.

| Agent | Tools Needed | Description |
|-------|--------------|-------------|
| `dev-setup-leader` | `Read`, `Write`, `Edit`, `Bash (mv, mkdir)` | Story setup for dev |
| `elab-setup-leader` | `Bash (mv, mkdir, ls)` | Story setup for elaboration |
| `elab-epic-setup-leader` | `Read`, `Write`, `Bash (mkdir)` | Epic elaboration setup |
| `pm-bootstrap-setup-leader` | `Read`, `Write`, `Bash (mkdir)` | Bootstrap workflow setup |
| `pm-harness-setup-leader` | `Read`, `Write`, `Bash (mkdir)` | Harness story setup |
| `qa-verify-setup-leader` | `Read`, `Write`, `Edit`, `Bash (mv)` | QA setup |
| `ui-ux-review-setup-leader` | `Read`, `Write` | UI/UX review setup |
| `scrum-master-setup-leader` | `Read`, `Write` | Workflow state init |

**Recommended Permission Level**: `setup` (can create dirs, move files in plans/)

---

### 1.6 Orchestration Agents (Spawn Workers)

These agents primarily spawn other agents via Task tool.

| Agent | Tools Needed | Description |
|-------|--------------|-------------|
| `dev-implement-planning-leader` | `Read`, `Task`, `Write` | Spawns planner + validator |
| `dev-implement-implementation-leader` | `Read`, `Task`, `TaskOutput` | Spawns backend/frontend coders |
| `dev-verification-leader` | `Read`, `Task`, `TaskOutput`, `Write` | Spawns verifier + playwright |
| `dev-fix-fix-leader` | `Read`, `Task`, `TaskOutput`, `Edit` | Spawns coders for fixes |
| `elab-epic-reviews-leader` | `Read`, `Task`, `TaskOutput`, `Write` | Spawns 6 perspective reviewers |
| `elab-epic-interactive-leader` | `Read`, `AskUserQuestion`, `Write` | Interactive user session |
| `pm-bootstrap-analysis-leader` | `Read`, `Write` | Extracts story data |
| `pm-bootstrap-generation-leader` | `Read`, `Write` | Generates bootstrap artifacts |
| `pm-harness-generation-leader` | `Read`, `Write` | Generates harness story |
| `scrum-master-loop-leader` | `Read`, `Task`, `TaskOutput`, `AskUserQuestion`, `Edit` | Phase execution loop |
| `pm-story-adhoc-leader` | `Read`, `Write`, `Edit` | Ad-hoc story generation |
| `pm-story-bug-leader` | `Read`, `Write` | Bug story generation |
| `pm-story-followup-leader` | `Read`, `Write`, `Edit` | Follow-up story generation |
| `pm-story-split-leader` | `Read`, `Write`, `Edit` | Story split handling |

**Recommended Permission Level**: `orchestrator` (can spawn agents, manage tasks)

---

## 2. Permission Matrix

| Permission Level | Read | Write (docs) | Write (code) | Bash (test) | Bash (mv/mkdir) | Task | Interactive |
|------------------|------|--------------|--------------|-------------|-----------------|------|-------------|
| `read-only` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `docs-only` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `test-run` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `code-write` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `setup` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `orchestrator` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## 3. Shared Skills Inventory

### 3.1 Implemented Skills

| Skill | Location | Status | Used By |
|-------|----------|--------|---------|
| `/token-log` | `.claude/commands/token-log.md` | ✅ Existing | All leaders |
| `/token-report` | `.claude/commands/token-report.md` | ✅ Existing | Documentation leaders |
| `/qa-gate` | `.claude/commands/qa-gate.md` | ✅ Existing | QA completion |
| `/review` | `.claude/commands/review.md` | ✅ Existing | Code review orchestration |
| `/story-status` | `.claude/commands/story-status.md` | ✅ Existing | Read-only status check |
| `/story-update` | `.claude/commands/story-update.md` | ✅ **NEW** | Status updates (8 agents) |
| `/story-move` | `.claude/commands/story-move.md` | ✅ **NEW** | Directory moves (6 agents) |
| `/index-update` | `.claude/commands/index-update.md` | ✅ **NEW** | Index maintenance (5 agents) |
| `/context-init` | `.claude/commands/context-init.md` | ✅ **NEW** | Context file creation (15 agents) |
| `/checkpoint` | `.claude/commands/checkpoint.md` | ✅ **NEW** | Resume capability (8 agents) |
| `/precondition-check` | `.claude/commands/precondition-check.md` | ✅ **NEW** | Validation (8 agents) |

### 3.2 New Skill Details

#### **A. `/story-update STORY-ID NEW-STATUS [--no-index]`**
Updates story frontmatter status and optionally syncs to index.

**Replaces duplicated logic in**:
- `dev-setup-leader`
- `elab-completion-leader`
- `qa-verify-completion-leader`
- `dev-documentation-leader`
- `pm-story-split-leader`
- `pm-story-followup-leader`

**Permission Level**: `docs-only`

---

#### **B. `/story-move STORY-ID TO-STAGE [--update-status]`**
Moves story directory between workflow stages.

**Replaces duplicated logic in**:
- `dev-setup-leader`
- `elab-setup-leader`
- `elab-completion-leader`
- `qa-verify-setup-leader`
- `qa-verify-completion-leader`

**Permission Level**: `setup`

---

#### **C. `/index-update STORY-ID [--status=X] [--clear-deps] [--add-dep=Y]`**
Updates story entry in stories index with status, dependencies, and counts.

**Replaces duplicated logic in**:
- `pm-story-generation-leader`
- `pm-story-followup-leader`
- `pm-story-split-leader`
- `qa-verify-completion-leader`
- `elab-completion-leader`

**Permission Level**: `docs-only`

---

#### **D. `/context-init STORY-ID COMMAND-NAME [--path=X]`**
Creates standardized AGENT-CONTEXT.md for workflow phases.

**Replaces duplicated logic in**: All 15 leader agents

**Permission Level**: `docs-only`

---

#### **E. `/checkpoint STORY-ID PHASE SIGNAL [--resume-from=N]`**
Maintains CHECKPOINT.md for workflow resume capability.

**Replaces duplicated logic in**:
- All setup leaders
- All completion leaders
- `scrum-master-*` agents

**Permission Level**: `docs-only`

---

#### **F. `/precondition-check STORY-ID --command=X [options]`**
Validates preconditions before workflow phases.

**Replaces duplicated logic in**: All 8 setup leaders

**Permission Level**: `read-only`

---

### 3.3 Remaining Candidates (P3)

#### **G. Token Summary Writer Skill** (Not yet implemented)
**Current Pattern**: Workers all write similar token summaries
```markdown
## Worker Token Summary
- Input: ~X tokens (files read)
- Output: ~Y tokens (files written)
```

**Agents Using This**: All 20 workers

**Proposed Skill**: `/token-summary <input-bytes> <output-bytes>` (returns formatted section)

---

### 3.3 Shared Reference Patterns

These aren't skills but could be standardized shared includes:

| Pattern | Current Files | Consolidation |
|---------|---------------|---------------|
| Completion Signals | Embedded in each agent | `_shared/completion-signals.md` ✓ |
| Token Tracking | Embedded in each agent | `_shared/token-tracking.md` ✓ |
| Output Format Rules | Embedded in each agent | `_shared/lean-docs.md` ✓ |
| Story Context | Embedded in each agent | `_shared/story-context.md` ✓ |
| Retry Policy | Varies by agent | Standardize per category |

---

## 4. Tool Access Recommendations by Agent

### 4.1 Code Review Agents (4 agents)

| Agent | Current Tools | Recommended Change |
|-------|---------------|--------------------|
| `code-review-lint` | Bash, Read, Grep | Add: `--filter` to Bash |
| `code-review-style-compliance` | Read, Grep, Glob | No change |
| `code-review-syntax` | Read | No change |
| `code-review-security` | Read, Grep | Add: OWASP pattern library |

**Permission**: `read-only` + `bash (lint only)`

---

### 4.2 Dev Implementation Agents (12 agents)

| Agent | Current Tools | Recommended Change |
|-------|---------------|--------------------|
| `dev-setup-leader` | Read, Write, Edit, Bash | Add: `/context-init` skill |
| `dev-implement-planning-leader` | Read, Task, Write | No change |
| `dev-implement-planner` | Read, Write | No change |
| `dev-implement-plan-validator` | Read, Glob, Write | No change |
| `dev-implement-implementation-leader` | Read, Task, TaskOutput | No change |
| `dev-implement-backend-coder` | Read, Write, Edit, Bash | Consider: sandbox mode |
| `dev-implement-frontend-coder` | Read, Write, Edit, Bash | Consider: sandbox mode |
| `dev-implement-contracts` | Read, Write | No change |
| `dev-verification-leader` | Read, Task, TaskOutput, Write | No change |
| `dev-implement-verifier` | Read, Write, Bash | No change |
| `dev-implement-playwright` | Read, Edit, Bash | Add: Playwright MCP |
| `dev-implement-proof-writer` | Read, Write | No change |
| `dev-implement-learnings` | Read, Edit | No change |
| `dev-documentation-leader` | Read, Write, Edit, Task | Add: `/story-status` skill |

---

### 4.3 Elaboration Agents (13 agents)

| Agent | Current Tools | Recommended Change |
|-------|---------------|--------------------|
| `elab-setup-leader` | Bash | Add: `/precondition-check` |
| `elab-analyst` | Read, Glob | No change |
| `elab-completion-leader` | Read, Write, Edit, Bash | Add: `/story-move`, `/story-status` |
| `elab-epic-setup-leader` | Read, Write, Bash | Add: `/context-init` |
| `elab-epic-reviews-leader` | Read, Task, TaskOutput, Write | No change |
| `elab-epic-engineering` | Read | No change |
| `elab-epic-product` | Read | No change |
| `elab-epic-qa` | Read | No change |
| `elab-epic-ux` | Read | No change |
| `elab-epic-platform` | Read | No change |
| `elab-epic-security` | Read | No change |
| `elab-epic-aggregation-leader` | Read, Write | No change |
| `elab-epic-interactive-leader` | Read, AskUserQuestion, Write | No change |
| `elab-epic-updates-leader` | Read, Edit | Add: `/index-update` |

---

### 4.4 PM Agents (15 agents)

| Agent | Current Tools | Recommended Change |
|-------|---------------|--------------------|
| `pm.agent.md` | Task, Read | Orchestrator only |
| `pm-bootstrap-setup-leader` | Read, Write, Bash | Add: `/precondition-check` |
| `pm-bootstrap-analysis-leader` | Read, Write | No change |
| `pm-bootstrap-generation-leader` | Read, Write | No change |
| `pm-harness-setup-leader` | Read, Write, Bash | Add: `/precondition-check` |
| `pm-harness-generation-leader` | Read, Write | No change |
| `pm-story-generation-leader` | Read, Write, Edit, Task | Add: `/index-update` |
| `pm-story-fix-leader` | Read, Edit | No change |
| `pm-story-adhoc-leader` | Read, Write, Edit | No change |
| `pm-story-bug-leader` | Read, Write | No change |
| `pm-story-followup-leader` | Read, Write, Edit | Add: `/index-update` |
| `pm-story-split-leader` | Read, Write, Edit | Add: `/index-update` |
| `pm-triage-leader` | Read, Edit | No change |
| `pm-draft-test-plan` | Read | No change |
| `pm-uiux-recommendations` | Read | No change |
| `pm-dev-feasibility-review` | Read | No change |

---

### 4.5 QA Agents (3 agents)

| Agent | Current Tools | Recommended Change |
|-------|---------------|--------------------|
| `qa-verify-setup-leader` | Read, Write, Edit, Bash | Add: `/precondition-check`, `/story-move` |
| `qa-verify-verification-leader` | Read, Edit, Bash | Add: HTTP client MCP |
| `qa-verify-completion-leader` | Read, Edit, Bash, Task | Add: `/story-move`, `/index-update` |

---

### 4.6 UI/UX Agents (3 agents)

| Agent | Current Tools | Recommended Change |
|-------|---------------|--------------------|
| `ui-ux-review-setup-leader` | Read, Write | Add: `/precondition-check` |
| `ui-ux-review-reviewer` | Read, Bash | **Needs**: Playwright MCP, Chrome DevTools MCP |
| `ui-ux-review-report-leader` | Read, Write | No change |

---

### 4.7 Scrum Master Agents (2 agents)

| Agent | Current Tools | Recommended Change |
|-------|---------------|--------------------|
| `scrum-master-setup-leader` | Read, Write | Add: `/checkpoint`, `/context-init` |
| `scrum-master-loop-leader` | Read, Task, TaskOutput, AskUserQuestion, Edit | Add: `/checkpoint` |

---

### 4.8 Reference Documents (2)

| Agent | Type | Change |
|-------|------|--------|
| `qa.agent.md` | Reference | Already correct - read-only policy doc |
| `uiux.agent.md` | Reference | Already correct - read-only policy doc |

---

## 5. MCP Integration Requirements

### 5.1 Required MCPs by Agent

| Agent | MCP Needed | Use Case |
|-------|------------|----------|
| `ui-ux-review-reviewer` | Playwright MCP | Screenshots, axe scans |
| `ui-ux-review-reviewer` | Chrome DevTools MCP | Lighthouse audits |
| `qa-verify-verification-leader` | HTTP Client MCP | .http file execution |
| `dev-implement-playwright` | Playwright MCP | E2E test runs, video |

### 5.2 Optional MCPs (Enhancements)

| Agent | MCP | Benefit |
|-------|-----|---------|
| `elab-analyst` | Knowledge Base MCP | Faster codebase search |
| `code-review-*` | ESLint MCP | Real-time lint integration |
| `pm-story-*` | GitHub MCP | Issue linking |

---

## 6. Refactoring Progress

| Skill/Pattern | Impact | Status | Location |
|---------------|--------|--------|----------|
| `/story-update` | High (8 agents) | ✅ Done | `.claude/commands/story-update.md` |
| `/story-move` | High (6 agents) | ✅ Done | `.claude/commands/story-move.md` |
| `/index-update` | High (5 agents) | ✅ Done | `.claude/commands/index-update.md` |
| `/context-init` | Medium (15 agents) | ✅ Done | `.claude/commands/context-init.md` |
| `/checkpoint` | Medium (8 agents) | ✅ Done | `.claude/commands/checkpoint.md` |
| `/precondition-check` | Medium (8 agents) | ✅ Done | `.claude/commands/precondition-check.md` |
| Permissions doc | High (all agents) | ✅ Done | `.claude/agents/_shared/permissions.md` |
| `/token-summary` | Low (20 agents) | ⏳ Backlog | Not yet created |

---

## 7. Remaining Work

### Completed ✅
1. ~~Create `/story-update` skill~~ → `story-update.md`
2. ~~Create `/story-move` skill~~ → `story-move.md`
3. ~~Create `/index-update` skill~~ → `index-update.md`
4. ~~Create `/context-init` skill~~ → `context-init.md`
5. ~~Create `/checkpoint` skill~~ → `checkpoint.md`
6. ~~Create `/precondition-check` skill~~ → `precondition-check.md`
7. ~~Create permissions document~~ → `_shared/permissions.md`
8. ~~Add permission_level to agent frontmatter~~ → All 59 agents updated to v2.0.0
9. ~~Update leaders with skills_used~~ → All leader agents reference shared skills
10. ~~Create architectural decisions protocol~~ → `_shared/architectural-decisions.md`

### Next Steps
1. **Integrate MCP tools**:
   - Playwright MCP for UI review
   - Chrome DevTools MCP for performance
   - HTTP Client MCP for QA verification
2. **Create `/token-summary` skill** (P3 - low priority)
3. **Standardize retry policies** per permission level

---

## Appendix A: Full Agent Inventory

### Leaders (35)
```
dev-setup-leader
dev-implement-planning-leader
dev-implement-implementation-leader
dev-verification-leader
dev-documentation-leader
dev-fix-fix-leader
elab-setup-leader
elab-completion-leader
elab-epic-setup-leader
elab-epic-reviews-leader
elab-epic-aggregation-leader
elab-epic-interactive-leader
elab-epic-updates-leader
pm-bootstrap-setup-leader
pm-bootstrap-analysis-leader
pm-bootstrap-generation-leader
pm-harness-setup-leader
pm-harness-generation-leader
pm-story-generation-leader
pm-story-fix-leader
pm-story-adhoc-leader
pm-story-bug-leader
pm-story-followup-leader
pm-story-split-leader
pm-triage-leader
qa-verify-setup-leader
qa-verify-verification-leader
qa-verify-completion-leader
ui-ux-review-setup-leader
ui-ux-review-report-leader
scrum-master-setup-leader
scrum-master-loop-leader
```

### Workers (20)
```
code-review-lint
code-review-style-compliance
code-review-syntax
code-review-security
dev-implement-backend-coder
dev-implement-frontend-coder
dev-implement-planner
dev-implement-plan-validator
dev-implement-contracts
dev-implement-verifier
dev-implement-playwright
dev-implement-proof-writer
dev-implement-learnings
elab-analyst
elab-epic-engineering
elab-epic-product
elab-epic-qa
elab-epic-ux
elab-epic-platform
elab-epic-security
pm-draft-test-plan
pm-uiux-recommendations
pm-dev-feasibility-review
ui-ux-review-reviewer
```

### Reference Documents (2)
```
qa.agent.md
uiux.agent.md
```

### Orchestrators (2)
```
pm.agent.md
```
