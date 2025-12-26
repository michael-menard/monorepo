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

## Examples

### Example 1: Simple Feature

```bash
/implement 1.2

# Activates Dev agent and runs:
@dev
*implement story=1.2

# Output:
# ✅ Story validated: .bmad-stories/1.2-forgot-password-link.md
# 🔨 Starting traditional single-agent development...
# ... (15 minutes later)
# ✅ Story approved for deployment!
# 📝 Pull request created!
# 🔗 https://github.com/org/repo/pull/42
```

### Example 2: Complex Feature with Parallel Execution

```bash
/implement 1.1 --parallel --deep-review

# Activates Dev agent and runs:
@dev
*implement story=1.1 mode=parallel review=deep

# Output:
# ✅ Story validated: .bmad-stories/1.1-user-login.md
# 🚀 Starting parallel sub-agent development...
# 📊 Spawning 3 workers...
# [Worker 1] Frontend Component - Progress: 100% ✅
# [Worker 2] Backend API - Progress: 100% ✅
# [Worker 3] Tests - Progress: 100% ✅
# ✨ Integration complete in 6 minutes!
# 🔍 Starting deep multi-specialist review...
# [Security] Found 1 high-priority issue
# [Performance] All checks passed ✅
# [Accessibility] All checks passed ✅
# 🔧 Auto-fixing 1 issue...
# ✅ All issues fixed!
# ✅ Story approved for deployment!
# 📝 Pull request created!
```

### Example 3: Multiple Stories

```bash
/implement 1.1,1.2,1.3 --parallel --deep-review

# Activates Dev agent and runs:
@dev
*implement stories=[1.1,1.2,1.3] mode=parallel review=deep

# Output:
# ✅ Validated 3 stories
# 🚀 Starting parallel development for 3 stories...
# 📊 Spawning 9 workers (3 per story)...
# ... (20 minutes later)
# ✅ All 3 stories approved for deployment!
# 📝 Creating 3 pull requests...
# ✅ Pull requests created!
```

---

### Example 4: Entire Epic ✨ NEW

```bash
/implement epic:3 --parallel --deep-review

# Activates Dev agent and runs:
@dev
*implement epic=3 mode=parallel review=deep

# Output:
# 🔍 Discovering stories in Epic 3...
# ✅ Found 29 stories in Epic 3
# 📊 Analyzing dependencies...
# ✅ Dependency graph created
# 📋 Execution Plan:
#     Wave 1: Story 3.0.1 (foundation)
#     Wave 2: Stories 3.0.2-3.0.10, 3.1.1-3.1.4, 3.2.1-3.2.6, 3.3.1-3.3.4, 3.4.1-3.4.5 (28 stories in parallel)
# 🚀 Spawning 29 dev-workers...
# ... (45 minutes later)
# ✅ All 29 stories complete!
# 🔍 Running epic-level integration tests...
# ✅ Integration tests passed!
# 📝 Creating 29 pull requests...
# ✅ Epic 3 complete!
#
# Time: 45 minutes
# Sequential: 290 minutes (29 stories × 10 min avg)
# Speedup: 6.4x faster
```

---

### Example 5: Epic (Shorthand) ✨ NEW

```bash
/implement 3 --epic --parallel --deep-review

# Same as Example 4, just different syntax
# Some users prefer this shorthand
```

---

## Time Comparison

### Single-Agent Mode (Default)
- **Total Time**: ~39 minutes per story
- **Best For**: Simple features, bug fixes, small changes

### Parallel Mode (--parallel)
- **Total Time**: ~23 minutes per story
- **Speedup**: 1.7x faster
- **Best For**: Complex features, multiple components, epics

### Multiple Stories (--parallel)
- **Total Time**: ~80 minutes for 8 stories
- **Speedup**: 8x faster than sequential
- **Best For**: Epics, related features, batch work

### Epic Mode (epic:{n} --parallel) ✨ NEW
- **Total Time**: Depends on dependency graph
  - **No dependencies**: ~10-15 minutes (all stories in parallel)
  - **Linear dependencies**: Same as sequential
  - **Tree dependencies**: 2-6x faster (typical)
- **Example**: Epic 3 (29 stories)
  - Sequential: 290 minutes
  - Parallel: 45 minutes
  - Speedup: 6.4x faster
- **Best For**: Implementing entire epics at once

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

## Error Handling

The command provides clear error messages and recovery steps:

```bash
# Story not found
❌ Story file not found: .bmad-stories/1.1-*.md
💡 Create story first with: @sm *draft story=1.1

# Story not approved
⚠️  Story status: Draft
💡 Story should be 'Approved' before implementation
Continue anyway? (y/n):

# Critical issues found
🚨 Found 2 critical and 3 high-priority issues
Auto-fix issues in parallel? (y/n):

# Quality gates failed
❌ Story blocked: QUALITY_GATES_FAILED
💡 Fix quality gate failures before deployment
```

## Related Commands

- **/start-feature** - Start new feature with worktree
- **@sm *draft** - Create new story
- **@dev *develop-story** - Traditional development workflow
- **@qa *deep-review** - Multi-specialist QA review

## Notes

- This is the **recommended way** to implement stories in BMAD
- It replaces the need to manually run multiple commands
- It automatically selects the best workflow based on parameters
- It integrates seamlessly with existing BMAD workflows
- It provides comprehensive error handling and recovery
- It supports both simple and complex stories
- It's safe to use in production workflows

