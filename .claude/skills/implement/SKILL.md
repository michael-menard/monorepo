---
name: implement
description: Complete story implementation workflow from start to finish. Use when implementing user stories, features, or epics. Handles validation, development (with optional parallel execution), QA review, issue resolution, and PR creation. Can implement single stories, multiple stories, or entire epics in parallel.
---

# /implement - Complete Story Implementation Workflow

## Description

One-command story implementation from start to finish. Automatically handles validation, development, QA review, issue resolution, and PR creation with support for both single-agent and parallel sub-agent execution.

**NEW:** Now supports implementing entire epics! Just pass an epic number (e.g., `epic:3`) and all stories in that epic will be implemented in parallel.

## Usage

```bash
# Simple story (single-agent)
/implement 1.2

# Complex story (parallel sub-agents)
/implement 1.1 --parallel

# With deep multi-specialist review
/implement 1.1 --parallel --deep-review

# Multiple stories in parallel
/implement 1.1,1.2,1.3 --parallel

# Quick review (skip deep analysis)
/implement 1.2 --quick-review

# ✨ NEW: Implement entire epic
/implement epic:3 --parallel --deep-review

# ✨ NEW: Implement epic (shorthand)
/implement 3 --epic --parallel --deep-review
```

## Parameters

- **story number(s)** - Single story (e.g., `1.1`) or multiple stories (e.g., `1.1,1.2,1.3`)
- **epic:{number}** - Implement all stories in an epic (e.g., `epic:3` for Epic 3)
- **--epic** - Treat the number as an epic number (e.g., `/implement 3 --epic`)
- **--parallel** - Use parallel sub-agent execution (faster for complex stories, **required for epics**)
- **--deep-review** - Use multi-specialist QA review (security, performance, accessibility)
- **--quick-review** - Use fast single-agent QA review
- **--skip-review** - Skip QA review (not recommended)

## Execution

When this skill is invoked, load and execute the task file: `.bmad-core/tasks/implement-story.md`

Follow all phases defined in that task exactly, including:
- Phase 2: Development Setup (creates worktree via `start-worktree-from-story.md`)
- All subsequent phases for implementation, QA, and PR creation

The task file is the source of truth for this workflow.

---

## What It Does

This slash command activates the Dev agent and runs the complete `*implement` workflow:

### For Stories

### Phase 1: Validation (1 min)
- Checks if story file exists
- Validates story status
- Confirms prerequisites

### Phase 2: Development (5-15 min)
- **Single-agent mode**: Traditional sequential development
- **Parallel mode**: Spawns multiple dev-workers for simultaneous execution

### Phase 3: Quality Assurance (3-10 min)
- **Deep review**: Multi-specialist analysis (security, performance, accessibility)
- **Quick review**: Fast single-agent validation
- **Skip**: No QA review (not recommended)

### For Epics

### Phase 1: Epic Discovery (1-2 min)
- Scans story directory for all stories in the epic
- Analyzes dependencies between stories
- Creates execution plan with waves

### Phase 2: Parallel Development (varies)
- Spawns dev-workers for all stories
- Coordinates execution based on dependencies
- Monitors progress in real-time

### Phase 3: Epic-Level QA (5-15 min)
- Validates integration across all stories
- Runs epic-level tests
- Ensures consistency

### Phase 4: Epic Summary
- Creates comprehensive completion report
- Shows all PRs created
- Provides next steps

### Phase 4: Issue Resolution (0-10 min)
- Identifies critical and high-priority issues
- Offers automatic parallel fixing
- Re-runs QA after fixes

### Phase 5: Final Validation (2 min)
- Confirms all quality gates pass
- Generates deployment decision
- Validates test coverage

### Phase 6: Pull Request (1 min)
- Creates GitHub PR with story details
- Links to story file
- Adds appropriate labels

### Phase 7: Summary
- Shows complete results
- Displays time taken
- Provides next steps

## Benefits

✅ **One Command** - Complete workflow from validation to PR
✅ **Flexible** - Choose single-agent or parallel execution
✅ **Automated** - No need to remember all the steps
✅ **Safe** - Quality gates and validation at every phase
✅ **Fast** - Parallel mode is 1.7x faster
✅ **Comprehensive** - Includes QA review and issue resolution
✅ **Transparent** - Shows progress at every step
✅ **Smart** - Automatically fixes issues when possible

## When to Use Each Mode

### Use Default (Single-Agent)
- Simple UI changes
- Documentation updates
- Small bug fixes
- Configuration changes
- Single-file modifications

### Use --parallel
- Multi-component features
- Full-stack implementations
- Complex business logic
- Multiple related changes
- Performance-critical features

### Use --deep-review
- Security-sensitive features (auth, payments, data access)
- Public-facing features
- Performance-critical paths
- Accessibility-required features
- Production deployments

### Use --quick-review
- Internal tools
- Development/staging only
- Low-risk changes
- Hotfixes (after manual review)
