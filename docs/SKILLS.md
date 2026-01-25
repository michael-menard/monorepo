# SKILLS.md - Skill Definitions

This document defines all skills available in the Claude Code CLI, their responsibilities, and usage patterns.

---

## Skill Registry

### Worktree Management Skills

| Skill ID | File | Description |
|----------|------|-------------|
| `wt-new` | `wt-new/SKILL.md` | Create a new git worktree and branch for feature development |
| `wt-switch` | `wt-switch/SKILL.md` | Switch development context to a different worktree |
| `wt-status` | `wt-status/SKILL.md` | Show comprehensive status of current and all worktrees |
| `wt-list` | `wt-list/SKILL.md` | List all active git worktrees with their status |
| `wt-sync` | `wt-sync/SKILL.md` | Sync current worktree with upstream remote changes |
| `wt-finish` | `wt-finish/SKILL.md` | Finish a feature by merging and cleaning up worktree |
| `wt-cleanup` | `wt-cleanup/SKILL.md` | Identify and remove merged or stale worktrees |
| `wt-prune` | `wt-prune/SKILL.md` | Clean up stale worktree references and metadata |

### Code Review & Quality Skills

| Skill ID | File | Description |
|----------|------|-------------|
| `review` | `review/SKILL.md` | Comprehensive code review with parallel specialist sub-agents |
| `review-draft-story` | `review-draft-story/SKILL.md` | Draft story review with PM, UX, and SM specialists |
| `qa-gate` | `qa-gate/SKILL.md` | Quality gate decision with persistent YAML output |

---

## Worktree Management Skills

These skills provide a complete workflow for managing git worktrees, enabling isolated development of multiple features simultaneously.

### /wt-new - Create New Worktree

**Purpose:** Create a new git worktree and branch for feature development.

**Usage:**
```bash
/wt-new
```

**Workflow:**
1. Verify git repository
2. Ask for base branch (e.g., `main`, `develop`)
3. Ask for feature branch name (e.g., `feature/gallery-123`)
4. Checkout and pull latest from base branch
5. Create worktree directory in `tree/`
6. Create new worktree at `tree/{branch-name}`

**Benefits:**
- Quick start with guided prompts
- Safe (verifies git state before changes)
- Organized (keeps all worktrees in `tree/` directory)

---

### /wt-switch - Switch Worktree

**Purpose:** Switch development context to a different git worktree.

**Usage:**
```bash
/wt-switch
```

**Workflow:**
1. List all available worktrees with numbers
2. Ask which to switch to (interactive selection)
3. Provide `cd` command to execute
4. Show branch status of target worktree

**Note:** The command provides the `cd` command for you to run (shell limitation prevents direct directory change).

---

### /wt-status - Worktree Status

**Purpose:** Show comprehensive status of current and all worktrees.

**Usage:**
```bash
/wt-status
```

**Information Displayed:**
- Current worktree location
- All worktrees and their states
- Uncommitted changes (modified, staged, untracked)
- Branches ahead/behind origin (sync status)

---

### /wt-list - List Worktrees

**Purpose:** Quick overview of all active git worktrees.

**Usage:**
```bash
/wt-list
```

**Output:**
- Worktree path (full path)
- Branch name (checked out branch)
- Commit (current commit hash)
- Status (clean, modified, etc.)

---

### /wt-sync - Sync Worktree

**Purpose:** Sync current worktree with upstream remote changes.

**Usage:**
```bash
/wt-sync
```

**Workflow:**
1. Check working directory (clean or offer to stash)
2. Fetch from origin
3. Ask merge preference (rebase or merge)
4. Apply chosen strategy
5. Show what changed

**Note:** Uncommitted changes are stashed and restored automatically.

---

### /wt-finish - Finish Feature

**Purpose:** Complete a feature by merging to base branch and cleaning up.

**Usage:**
```bash
/wt-finish
```

**Workflow:**
1. Verify all changes are committed
2. Ask for base branch to merge into
3. Optional: run tests before merging
4. Checkout base branch
5. Merge feature branch
6. Push changes
7. Remove worktree
8. Optionally delete feature branch

---

### /wt-cleanup - Clean Up Worktrees

**Purpose:** Identify and remove merged or stale worktrees.

**Usage:**
```bash
/wt-cleanup
```

**Workflow:**
1. List all worktrees
2. Identify branches already merged to main/develop
3. Ask which to remove (interactive selection)
4. Remove selected worktrees
5. Prune git metadata

**Note:** Only suggests worktrees with merged branches. Warns about unmerged branches.

---

### /wt-prune - Prune Stale References

**Purpose:** Clean up stale worktree administrative files and references.

**Usage:**
```bash
/wt-prune
```

**When to Use:**
- After manually deleting a worktree directory
- When git shows worktrees that don't exist
- After moving or renaming worktree directories

**Note:** Safe operation - only removes metadata, not actual files.

---

## Code Review & Quality Skills

These skills provide comprehensive code review and quality gate capabilities using parallel specialist sub-agents.

### /review - Comprehensive Code Review

**Purpose:** Full-spectrum code review with parallel specialist sub-agents.

**Usage:**
```bash
# Review a story by number
/review 3.1.5

# Review a story by file path
/review docs/stories/epic-6-wishlist/wish-2002-add-item-flow.md

# Review current branch (no story)
/review --branch

# Review all stories in an epic directory
/review epic-6-wishlist

# Filter by status
/review epic-6-wishlist --status=Draft

# Quick review (skip deep specialists)
/review 3.1.5 --quick

# Review with auto-fix
/review 3.1.5 --fix

# Review specific files only
/review --files src/auth/**/*.ts

# Skip gate decision
/review 3.1.5 --no-gate
```

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `target` | Story number, file path, or directory |
| `--branch` | Review current branch without story reference |
| `--status` | Filter stories by status (for directory review) |
| `--quick` | Skip deep specialists, run required checks only |
| `--fix` | Auto-fix issues when safe |
| `--files` | Review specific files only |
| `--no-gate` | Skip `/qa-gate`, return findings only |

**Specialist Sub-Agents (parallel, haiku model):**
1. **Requirements Traceability** - AC-to-test mapping, coverage gaps
2. **Code Quality** - Architecture, patterns, best practices
3. **Security** - OWASP Top 10, auth/authz, injection vulnerabilities
4. **Performance** - N+1 queries, memoization, bundle size
5. **Accessibility** - WCAG 2.1 AA, keyboard nav, ARIA
6. **Test Coverage** - Test quality, edge cases, mock appropriateness
7. **Technical Debt** - TODOs, outdated patterns, documentation gaps

**Issue ID Prefixes:**
| Prefix | Category |
|--------|----------|
| `SEC-` | Security |
| `PERF-` | Performance |
| `A11Y-` | Accessibility |
| `QUAL-` | Code Quality |
| `TEST-` | Test Coverage |
| `DEBT-` | Technical Debt |
| `REQ-` | Requirements Traceability |

**T-Shirt Sizing:**
Each specialist provides a size estimate (XS, S, M, L, XL, XXL) that is synthesized into an overall recommendation.

**Gate Decision:**
- **PASS** - Ready for merge
- **CONCERNS** - Proceed with awareness of issues
- **FAIL** - Address high-severity issues first

---

### /review-draft-story - Draft Story Review

**Purpose:** Review stories BEFORE implementation with PM, UX, and SM specialists.

**Usage:**
```bash
# Review a specific story
/review-draft-story 2002

# Review by file path
/review-draft-story docs/stories/epic-6-wishlist/wish-2002-add-item-flow.md

# Quick review
/review-draft-story 2002 --quick

# Focus on specific aspect
/review-draft-story 2002 --focus=ux

# Skip reviewers
/review-draft-story 2002 --skip-pm
/review-draft-story 2002 --skip-ux
```

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `story` | Story number or file path |
| `--quick` | Lightweight review, skip deep analysis |
| `--focus` | Focus on `pm`, `ux`, or `sm` aspect |
| `--skip-pm` | Skip PM review (no PRD context) |
| `--skip-ux` | Skip UX review (no UI in story) |

**Specialist Sub-Agents:**

**PM (John) - Product Perspective:**
- Requirements clarity
- Scope appropriateness
- User value identification
- Acceptance criteria quality
- Dependencies & sequencing
- Risk identification

**UX (Sally) - Design Perspective:**
- User flow clarity
- Interaction design
- Visual specifications
- State handling (loading, error, empty)
- Accessibility considerations
- Responsive design
- Component reusability

**SM (Bob) - Implementation Readiness:**
- Executes Story Draft Checklist
- Goal clarity assessment
- Technical guidance sufficiency
- Reference completeness
- Self-containment validation
- Testing coverage

**Concern Severity Levels:**
| Severity | Description |
|----------|-------------|
| `blocking` | Must fix before story can proceed |
| `should_fix` | Important issue to address |
| `note` | Minor observation, nice-to-have |

**Decision Outcomes:**
- **PASS** - Story approved, ready for `/implement`
- **CONCERNS** - Concerns appended, status becomes "Conditional"
- **FAIL** - Concerns appended, status becomes "Needs Revision"

---

### /qa-gate - Quality Gate Decision

**Purpose:** Generate a quality gate decision with persistent YAML output.

**Usage:**
```bash
# Quick gate (tests, types, lint only)
/qa-gate 3.1.5

# Full gate with specialist reviews
/qa-gate 3.1.5 --deep

# Gate for current branch
/qa-gate --branch

# Specific specialists
/qa-gate 3.1.5 --security --performance

# Waive known issues
/qa-gate 3.1.5 --waive --reason "Accepted for MVP" --approved-by "Product Owner"

# Dry run (no file output)
/qa-gate 3.1.5 --dry-run
```

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `story` | Story number (or omit for branch review) |
| `--deep` | Run all specialist reviews |
| `--security` | Run security specialist |
| `--performance` | Run performance specialist |
| `--accessibility` | Run accessibility specialist |
| `--branch` | Review current branch |
| `--waive` | Mark as WAIVED (requires --reason and --approved-by) |
| `--dry-run` | Run checks without persisting file |

**Required Checks (always run):**
```bash
pnpm test --filter='...[origin/main]'
pnpm check-types --filter='...[origin/main]'
pnpm lint --filter='...[origin/main]'
```

**Gate Statuses:**
| Status | Meaning | When Used |
|--------|---------|-----------|
| `PASS` | All good | No issues or low severity only |
| `CONCERNS` | Proceed with awareness | Medium severity issues |
| `FAIL` | Should not proceed | High severity or check failures |
| `WAIVED` | Accepted despite issues | Explicitly approved |

**Severity Scale:**
| Severity | Description | Action |
|----------|-------------|--------|
| `high` | Critical, should block | Must fix before release |
| `medium` | Should fix soon | Schedule for soon |
| `low` | Minor, cosmetic | Fix when convenient |

**Issue ID Prefixes:**
| Prefix | Category |
|--------|----------|
| `SEC-` | Security |
| `PERF-` | Performance |
| `A11Y-` | Accessibility |
| `TEST-` | Testing gaps |
| `REL-` | Reliability |
| `MNT-` | Maintainability |
| `ARCH-` | Architecture |
| `DOC-` | Documentation |
| `REQ-` | Requirements |

**Output:**
- Gate file: `docs/qa/gates/{STORY_NUM}-{slug}.yml`
- Story file updated with gate reference

---

## Workflow Integration

### Feature Development Lifecycle

```
1. /wt-new              → Create worktree for new feature
2. /wt-status           → Check current state
3. ... develop ...
4. /wt-sync             → Pull latest changes
5. /review-draft-story  → Review story before implementation
6. /review              → Code review after implementation
7. /qa-gate             → Quality gate decision
8. /wt-finish           → Merge and cleanup
9. /wt-cleanup          → Remove old worktrees
```

### Story Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                    Story Lifecycle                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Create story                                        │
│         ↓                                               │
│  2. /review-draft-story     ← Pre-implementation review │
│         ↓                                               │
│     ┌───┴───┐                                           │
│   PASS    FAIL/CONCERNS                                 │
│     ↓         ↓                                         │
│  Approved   Fix & Re-review                             │
│     ↓                                                   │
│  3. Implement story                                     │
│         ↓                                               │
│  4. /review                 ← Post-implementation review│
│         ↓                                               │
│  5. /qa-gate                ← Quality gate decision     │
│         ↓                                               │
│     ┌───┴───┐                                           │
│   PASS    CONCERNS/FAIL                                 │
│     ↓         ↓                                         │
│  Merged    Fix & Re-review                              │
│  & Done                                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Planning & Documentation Artifacts

This section documents the planning files and story documentation structure used in the multi-agent development workflow.

### Migration Planning Files

Located in `plans/` directory, these files govern cross-cutting migration strategy.

#### vercel.migration.plan.meta.md

**Purpose:** High-level planning principles and documentation structure for the migration project.

**Key Contents:**
- Documentation structure guidelines
- Naming conventions (timestamps in filenames: `YYYYMMDD-HHMM`)
- **Reuse-First Principle** (non-negotiable): Prefer existing workspace packages over creating per-story utilities
- Package boundary rules (`packages/core/*` vs `packages/backend/*`)
- Import policy (workspace package names, no deep relative imports)
- Append-only agent log

**When Referenced:** At the start of any migration-related story to understand documentation conventions.

---

#### vercel.migration.plan.exec.md

**Purpose:** Execution-level rules for story development and artifact production.

**Key Contents:**
- **Artifact Rules:** Story folders (`plans/stories/story-XXX/`) are the source of truth
- **Token Budget Rule:** Every story must track token usage per phase
- **Naming Rule:** All docs must include timestamps in filenames
- **Reuse Gate:** PM story docs require `## Reuse Plan`, Dev proof requires `## Reuse Verification`
- **Prohibited Patterns:** Duplicating adapter logic, copy/pasting logger initialization, recreating response helpers
- **Story Acceptance Rule:** Stories only marked "Done" if they reuse shared packages

**When Referenced:** Before creating or verifying any story to ensure artifact compliance.

---

### Token & Learning Tracking

#### TOKEN-BUDGET-TEMPLATE.md

**Purpose:** Template for tracking token (cost) usage per story phase.

**Usage:**
1. Add to each story's `## Token Budget` section
2. Before starting a phase, note session cost via `/cost`
3. After completing a phase, record the delta

**Sections:**
- **Phase Summary Table:** Estimates vs actuals for each phase (Story Gen, Test Plan, Feasibility, Implementation, etc.)
- **Estimation Formula:** `Input tokens ≈ (context_files_bytes / 4) + conversation_history`
- **Context Loading per Phase:** Expected file reads and token counts
- **Actual Measurements:** Date, phase, before/after cost, delta, notes
- **Token Optimization Tips:** Avoid re-reading large files, use Task agents, batch operations
- **High-Cost Patterns:** Operations that consume >10k tokens to avoid

**Template Values (Opus pricing):**
```
Cost ≈ (input × $0.003 + output × $0.015) / 1000
```

---

#### LESSONS-LEARNED.md

**Purpose:** Captures implementation learnings from completed stories to improve future planning and execution.

**Key Sections:**

**Token Usage Summary:**
- Story token costs table (cumulative)
- High-cost operations registry (operations consistently >10k tokens)
- Token optimization patterns (what works, what wastes tokens)

**Per-Story Sections (e.g., STORY-007, STORY-008, etc.):**
Each completed story documents:
- **Date:** When completed
- **Reuse Discoveries:** Patterns that can be reused in future stories
- **Blockers Hit:** What blocked progress and how it was resolved
- **Plan vs Reality:** Files planned vs files actually touched
- **Time Sinks:** What consumed unexpected effort
- **Verification Notes:** What fast-fail caught vs final verification
- **Recommendations for Future Stories:** Actionable learnings

**Example Entry:**
```markdown
## STORY-007: Gallery - Images Read
Date: 2026-01-19

### Reuse Discoveries
- DI pattern for core functions was highly reusable
- Discriminated union result types worked seamlessly
- Seed upsert pattern allowed idempotent seeding

### Blockers Hit
- None (smooth implementation)

### Plan vs Reality
- Files planned: 17
- Files actually touched: 18

### Recommendations
1. Extend existing packages first
2. Specify exact seed UUIDs in story
3. Route order matters in vercel.json
```

---

### Story Directory Structure

Each story lives in `plans/stories/STORY-XXX/` with a standardized structure:

```
plans/stories/STORY-XXX/
├── STORY-XXX.md                    # Main story document
├── ELAB-STORY-XXX.md               # Elaboration document
├── PROOF-STORY-XXX.md              # Implementation proof
├── CODE-REVIEW-STORY-XXX.md        # Code review findings
├── QA-VERIFY-STORY-XXX.md          # QA verification report
├── _pm/                            # PM phase artifacts
│   ├── TEST-PLAN.md                # Test plan with happy path, error, edge cases
│   ├── UIUX-NOTES.md               # UI/UX guidance
│   ├── DEV-FEASIBILITY.md          # Technical risks, dependencies
│   └── BLOCKERS.md                 # Known blockers
└── _implementation/                # Dev phase artifacts
    ├── SCOPE.md                    # Scope definition
    ├── IMPLEMENTATION-PLAN.md      # Step-by-step implementation plan
    ├── PLAN-VALIDATION.md          # Plan validation results
    ├── CONTRACTS.md                # HTTP/API contracts
    ├── BACKEND-LOG.md              # Backend implementation log
    ├── FRONTEND-LOG.md             # Frontend implementation log (if applicable)
    ├── VERIFICATION.md             # Verification results
    ├── TOKEN-SUMMARY.md            # Token usage summary
    ├── CODE-REVIEW-*.md            # Code review sub-reports
    └── ...
```

---

### Story Document (STORY-XXX.md)

**Purpose:** The main story specification document - source of truth for requirements.

**Standard Sections:**
```markdown
---
status: draft|approved|in-progress|uat|done
---

# STORY-XXX: Title

## Title
Short descriptive title

## Context
Background and motivation

## Goal
What this story achieves

## Non-Goals
What is explicitly out of scope

## Scope
### Endpoints (for API stories)
### Packages/Apps Affected

## Acceptance Criteria
- [ ] **AC-1:** Criterion description
- [ ] **AC-2:** Criterion description
...

## Reuse Plan
### Existing Packages to Use
### What Will Be Extended
### New Shared Packages (if any)

## Architecture Notes
Design decisions, patterns to follow

## HTTP Contract Plan
Sample API requests/responses

## Seed Requirements
Test data needed

## Test Plan
### Happy Path Tests
### Error Cases
### Edge Cases

## Token Budget
(From TOKEN-BUDGET-TEMPLATE.md)

## Agent Log
Append-only log of agent actions
```

---

### Implementation Plan (IMPLEMENTATION-PLAN.md)

**Purpose:** Detailed step-by-step implementation guide for the dev agent.

**Standard Sections:**
```markdown
## Scope Surface
- backend/API: yes/no
- frontend/UI: yes/no
- infra/config: yes/no

## Acceptance Criteria Checklist
Checkbox list of all ACs

## Files To Touch (Expected)
List of files to create/modify

## Reuse Targets
### Existing Packages to Import
### Existing Code to Reference
### Existing Handlers as Templates

## Architecture Notes
What goes where (core vs adapters)

## Step-by-Step Plan (Small Steps)
### Phase 1: ... (Steps 1-N)
#### Step 1: Objective, Files, Verification
...

## Test Plan
Unit tests, type check, lint commands

## Stop Conditions / Blockers
Known blockers or risks

## Token Log
Files read/written with byte/token estimates

## Dependencies / Sequencing Notes
What must complete before what

## Implementation Notes
Key differences from reference implementations
```

---

### Proof Document (PROOF-STORY-XXX.md)

**Purpose:** Evidence that implementation meets all acceptance criteria.

**Standard Sections:**
```markdown
## Story
Story reference

## Summary
Brief description of what was implemented

## Acceptance Criteria Evidence
Table mapping each AC to evidence (file, line, test)

## Reuse & Architecture Compliance
### Reuse-First Summary
### Ports & Adapters Compliance

## Verification
### Build Verification
### Type Check
### Lint Verification
### Unit Tests
### HTTP Contracts
### Playwright (if applicable)

## Files Changed
### New Files
### Modified Files

## Deviations / Notes
Any differences from plan

## Blockers
Any unresolved blockers

## Token Log
Input/output token estimates

## Agent Log
Actions taken by each agent
```

---

### Agent Phases & Responsibilities

| Phase | Agent | Artifacts Produced |
|-------|-------|-------------------|
| **PM: Story Gen** | PM | `STORY-XXX.md` |
| **PM: Test Plan** | pm-draft-test-plan | `_pm/TEST-PLAN.md` |
| **PM: Feasibility** | pm-dev-feasibility | `_pm/DEV-FEASIBILITY.md` |
| **PM: UI/UX** | pm-uiux-recommendations | `_pm/UIUX-NOTES.md` |
| **PM: Elaboration** | elab-story | `ELAB-STORY-XXX.md` |
| **Dev: Planning** | dev-implement-planner | `_implementation/IMPLEMENTATION-PLAN.md` |
| **Dev: Validation** | dev-implement-plan-validator | `_implementation/PLAN-VALIDATION.md` |
| **Dev: Backend** | dev-implement-backend-coder | `_implementation/BACKEND-LOG.md` |
| **Dev: Frontend** | dev-implement-frontend-coder | `_implementation/FRONTEND-LOG.md` |
| **Dev: Contracts** | dev-implement-contracts | `_implementation/CONTRACTS.md` |
| **Dev: Verification** | dev-implement-verifier | `_implementation/VERIFICATION.md` |
| **Dev: Proof** | dev-implement-proof-writer | `PROOF-STORY-XXX.md` |
| **QA: Review** | code-review | `CODE-REVIEW-STORY-XXX.md` |
| **QA: Verify** | qa-verify | `QA-VERIFY-STORY-XXX.md` |

---

### Key Principles

1. **Story folders are atomic and self-contained** - All artifacts for a story live together
2. **Token budget tracking is mandatory** - Track costs per phase using `/cost`
3. **Reuse-first is non-negotiable** - Use existing packages, don't create per-story utilities
4. **Append-only agent logs** - Every document has an agent log section
5. **Timestamps in filenames** - Format: `YYYYMMDD-HHMM` (America/Denver)
6. **YAML front matter** - All story docs include status metadata
7. **Lessons learned feed forward** - Document learnings to improve future stories
