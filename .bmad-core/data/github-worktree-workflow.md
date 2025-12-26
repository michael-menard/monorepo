# GitHub + Worktree Workflow Guide

## Overview

This workflow integrates BMAD agents with GitHub issues and git worktrees for efficient parallel development.

## Complete Workflow

### Phase 1: Story Creation (SM Agent)

```bash
# Activate SM Agent
@sm

# Create the story
*draft

# Create GitHub issue from story
*create-issue
```

**What happens:**
1. SM creates story file in `docs/stories/`
2. SM creates GitHub issue via `gh` CLI
3. Story file is updated with issue number and URL
4. Issue contains story details and acceptance criteria

**Story file will include:**
```markdown
## GitHub Issue
- Issue: #123
- URL: https://github.com/owner/repo/issues/123
- Status: Open
```

---

### Phase 2: Start Development (Dev Agent)

```bash
# Activate Dev Agent
@dev

# Start work on the story
*start-work
```

**What happens:**
1. Dev reads story file to get GitHub issue number
2. Asks for branch type (feature, bug, hotfix, etc.)
3. Asks for app/package scope (gallery, main-app, ui, etc.)
4. Generates semantic branch name: `feature/gallery-123`
5. Asks for base branch (main, develop, etc.)
6. Checks out base branch and pulls latest
7. Creates worktree in `tree/feature/gallery-123/`
8. Creates new branch in the worktree
9. Updates story file with worktree info

**Story file will include:**
```markdown
## Development Environment
- Worktree: `tree/feature/gallery-123`
- Branch: `feature/gallery-123` (feature/gallery-123)
- Branch Type: `feature`
- Scope: `gallery`
- Base Branch: `main`
- Created: 2025-12-20T10:30:00Z
```

**Next steps:**
```bash
# Switch to the worktree
cd tree/feature/gallery-123

# Continue with dev agent in the worktree
@dev
*develop-story
```

---

### Phase 3: Implementation (Dev Agent)

Work in the worktree as normal:

```bash
# In tree/feature/gallery-123/
@dev
*develop-story

# Agent implements tasks, writes tests, updates story file
# All work is isolated in the worktree
```

---

### Phase 4: Finish Development & Open PR (Dev Agent)

```bash
# After story is complete and tests pass
@dev
*finish-work
```

**What happens:**
1. Verifies all changes are committed
2. Verifies all tests pass
3. Verifies story status is "Ready for Review"
4. Asks for target branch for PR
5. Pushes feature branch to origin
6. Creates Pull Request with story details
7. Links PR to GitHub issue
8. Updates story file with PR info
9. **Keeps worktree active** for potential QA-requested fixes
10. Hands off to QA for review

**Story file will include:**
```markdown
## Development Environment
- Worktree: `tree/feature/gallery-123` (active)
- Branch: `feature/gallery-123` (pushed to origin)
- Branch Type: `feature`
- Scope: `gallery`
- Base Branch: `main`
- Created: 2025-12-20T10:30:00Z
- Development Completed: 2025-12-20T14:45:00Z

## Pull Request
- PR: #45
- URL: https://github.com/owner/repo/pull/45
- Status: Open - Ready for QA Review
- Target Branch: `main`

## GitHub Issue
- Issue: #123
- URL: https://github.com/owner/repo/issues/123
- Status: Open (linked to PR)
```

---

### Phase 5: QA Review (QA Agent)

```bash
# Activate QA Agent
@qa

# Review the story
*review docs/stories/epic-1.1-user-auth.md
```

**What happens:**
1. QA runs comprehensive review checklist
2. QA creates gate decision (PASS/CONCERNS/FAIL/WAIVED)
3. QA updates story file with QA Results

**If QA PASSES:**
```bash
@qa
*approve-and-merge docs/stories/epic-1.1-user-auth.md
```

**What happens on approval:**
1. Verifies PR is mergeable
2. Asks for merge strategy (squash/merge/rebase)
3. Merges PR to target branch
4. Closes GitHub issue
5. Removes worktree
6. Deletes feature branch
7. Updates story file with completion info

**Story file will include:**
```markdown
## Development Environment
- Worktree: `tree/feature/gallery-123` (removed)
- Branch: `feature/gallery-123` (merged and deleted)
- Branch Type: `feature`
- Scope: `gallery`
- Base Branch: `main`
- Created: 2025-12-20T10:30:00Z
- Development Completed: 2025-12-20T14:45:00Z
- QA Approved: 2025-12-20T15:30:00Z
- Merged: 2025-12-20T15:32:00Z

## Pull Request
- PR: #45
- URL: https://github.com/owner/repo/pull/45
- Status: Merged
- Target Branch: `main`
- Merge Commit: abc123def

## GitHub Issue
- Issue: #123
- URL: https://github.com/owner/repo/issues/123
- Status: Closed
```

**If QA FAILS:**
- QA follows normal rejection workflow
- Dev agent can continue work in existing worktree
- No cleanup happens until QA approves

---

## Benefits

### 🎯 **Centralized Tracking**
- GitHub issues serve as single source of truth
- Easy to see what's in progress
- Links between code, stories, and issues

### 🌳 **Isolated Development**
- Each feature in its own worktree
- Work on multiple features in parallel
- No branch switching disruption

### 🤖 **Agent Integration**
- SM agent handles story → issue creation
- Dev agent handles worktree → merge lifecycle
- Automated linking and tracking

### 📊 **Clear History**
- Branch names include issue numbers
- Commit messages reference issues
- Easy to trace changes back to requirements

---

## Branch Naming Convention

### Format
```
{type}/{scope}-{issue-number}
```

### Types
- `feature` - New features or enhancements
- `bug` - Bug fixes
- `hotfix` - Urgent production fixes
- `refactor` - Code refactoring
- `docs` - Documentation changes
- `test` - Test additions/changes

### Scope (App/Package)
The scope identifies which app or package is primarily affected:

**Apps:**
- `main-app` - Main user-facing application
- `app-dashboard` - Dashboard application
- `api` - API/backend services

**Packages:**
- `ui` - Component library (@repo/ui)
- `logger` - Logging utility (@repo/logger)
- `design-system` - Design tokens

**Features:**
- `gallery` - Gallery feature
- `auth` - Authentication
- `payments` - Payment processing
- `search` - Search functionality

### Examples
```
feature/gallery-123        - New gallery feature (issue #123)
bug/main-app-456          - Bug fix in main app (issue #456)
hotfix/api-789            - Urgent API fix (issue #789)
refactor/ui-234           - Refactor UI components (issue #234)
feature/auth-567          - New auth feature (issue #567)
```

---

## Directory Structure

```
/
├── docs/
│   └── stories/
│       └── epic-1.1-user-authentication.md  # Story file with issue link
├── tree/                                     # Worktrees directory
│   ├── feature/
│   │   ├── gallery-123/                     # Feature worktree for issue #123
│   │   └── auth-567/                        # Feature worktree for issue #567
│   ├── bug/
│   │   └── main-app-456/                    # Bug fix worktree for issue #456
│   └── hotfix/
│       └── api-789/                         # Hotfix worktree for issue #789
└── [main working directory]                  # Your primary workspace
```

---

## Prerequisites

### Required Tools
```bash
# GitHub CLI
brew install gh
gh auth login

# Git (with worktree support)
git --version  # Should be 2.5+
```

### Repository Setup
```bash
# Create tree directory
mkdir -p tree

# Add to .gitignore if needed
echo "tree/" >> .gitignore
```

---

## Quick Reference

### SM Agent Commands
- `*draft` - Create new story
- `*create-issue` - Create GitHub issue from story
- `*story-checklist` - Validate story completeness

### Dev Agent Commands
- `*start-work` - Create worktree for story
- `*develop-story` - Implement the story
- `*finish-work` - Open PR and hand off to QA (keeps worktree)
- `*run-tests` - Execute tests

### QA Agent Commands
- `*review {story}` - Run comprehensive QA review
- `*approve-and-merge {story}` - Merge PR, close issue, cleanup worktree (after QA passes)

---

## Troubleshooting

### GitHub CLI Not Authenticated
```bash
gh auth login
```

### Worktree Already Exists
The task will detect this and offer options:
1. Use existing worktree
2. Remove and recreate
3. Choose different name

### Merge Conflicts
The finish-work task will detect conflicts and guide you through resolution.

---

## Best Practices

1. **Always create GitHub issue before starting work**
   - Provides tracking and context
   - Links code to requirements

2. **Use descriptive branch names**
   - Include issue number
   - Include brief description
   - Example: `feature/issue-123-user-authentication`

3. **Keep worktrees clean**
   - Remove worktrees after merging
   - Don't accumulate stale worktrees

4. **Commit regularly in worktrees**
   - Worktrees are independent
   - Regular commits prevent data loss

5. **Run tests before finishing**
   - Ensure all tests pass
   - Verify code quality
   - Check story completion criteria

