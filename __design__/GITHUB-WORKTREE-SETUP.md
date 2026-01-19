# GitHub + Worktree Integration - Setup Complete ✅

## What Was Built

Your BMAD workflow now integrates **GitHub Issues** and **Git Worktrees** with proper **QA gates**.

### New BMAD Tasks Created

1. **`.bmad-core/tasks/create-github-issue.md`**
   - Used by: SM Agent (`*create-issue`)
   - Creates GitHub issue from story file
   - Links issue to story

2. **`.bmad-core/tasks/start-worktree-from-story.md`**
   - Used by: Dev Agent (`*start-work`)
   - Creates worktree linked to GitHub issue
   - Sets up isolated development environment

3. **`.bmad-core/tasks/finish-worktree-from-story.md`**
   - Used by: Dev Agent (`*finish-work`)
   - Opens Pull Request
   - Links PR to issue
   - Keeps worktree active for QA fixes

4. **`.bmad-core/tasks/qa-approve-and-merge.md`**
   - Used by: QA Agent (`*approve-and-merge`)
   - Merges PR after QA approval
   - Closes GitHub issue
   - Removes worktree and cleans up

### Updated BMAD Agents

- **SM Agent** - Added `*create-issue` command
- **Dev Agent** - Added `*start-work` and `*finish-work` commands
- **QA Agent** - Added `*approve-and-merge` command

### Documentation Created

- **`.bmad-core/data/github-worktree-workflow.md`** - Complete workflow guide
- **`.bmad-core/data/github-worktree-workflow-diagram.md`** - Visual flow diagram
- **`GITHUB-WORKTREE-SETUP.md`** - This file (setup summary)

---

## Complete Workflow

```
SM Agent:
  *draft → *create-issue
    ↓
Dev Agent:
  *start-work → *develop-story → *finish-work (opens PR)
    ↓
QA Agent:
  *review → *approve-and-merge (merges PR, closes issue, cleanup)
```

---

## Key Features

### ✅ **Proper QA Gates**
- Dev agent NEVER merges or closes issues
- Dev agent opens PR and hands off to QA
- QA agent has final merge authority

### 🌳 **Worktree Lifecycle**
- Created when dev starts work
- Stays active during QA review (for potential fixes)
- Removed only after QA approves and merges

### 🔗 **Complete Traceability**
```
Story ←→ GitHub Issue ←→ Branch ←→ Worktree ←→ PR ←→ Merge
```

### 🔄 **Iteration Support**
- If QA rejects, dev continues in same worktree
- No environment recreation needed
- Fast iteration cycle

---

## Prerequisites

### Install GitHub CLI
```bash
brew install gh
gh auth login
```

### Create Worktree Directory
```bash
mkdir -p tree
```

### Optional: Add to .gitignore
```bash
echo "tree/" >> .gitignore
```

---

## Quick Start Example

### 1. SM Creates Story + Issue
```bash
@sm
*draft
# ... create story ...
*create-issue
# ✅ Story created with GitHub issue #123
```

### 2. Dev Starts Work
```bash
@dev
*start-work
# Select story file
# Choose branch type: feature
# Choose scope: gallery
# Choose base branch: main
# ✅ Worktree created: tree/feature/gallery-123/
```

### 3. Dev Implements
```bash
cd tree/feature/gallery-123/
@dev
*develop-story
# ... implement tasks, write tests ...
# ✅ All tasks complete, tests passing
```

### 4. Dev Opens PR
```bash
@dev
*finish-work
# ✅ PR #45 created, linked to issue #123
# ✅ Worktree kept active for potential fixes
# ✅ Ready for QA review
```

### 5. QA Reviews
```bash
@qa
*review docs/stories/epic-1.1-user-auth.md
# ✅ QA gate: PASS
```

### 6. QA Approves & Merges
```bash
@qa
*approve-and-merge docs/stories/epic-1.1-user-auth.md
# ✅ PR merged
# ✅ Issue #123 closed
# ✅ Worktree removed
# ✅ Story complete!
```

---

## Agent Responsibilities

| Agent | Creates | Opens PR | Merges | Closes Issue | Cleanup |
|-------|---------|----------|--------|--------------|---------|
| **SM** | Story, Issue | ❌ | ❌ | ❌ | ❌ |
| **Dev** | Worktree, Branch | ✅ | ❌ | ❌ | ❌ |
| **QA** | Gate Decision | ❌ | ✅ | ✅ | ✅ |

---

## Branch Naming Convention

### Format
```
{type}/{scope}-{issue-number}
```

**Examples:**
- `feature/gallery-123` - New gallery feature (issue #123)
- `bug/main-app-456` - Bug fix in main app (issue #456)
- `hotfix/api-789` - Urgent API fix (issue #789)
- `refactor/ui-234` - Refactor UI components (issue #234)

**Types:** feature, bug, hotfix, refactor, docs, test
**Scopes:** gallery, main-app, api, ui, logger, auth, payments, etc.

---

## Directory Structure

```
/
├── docs/
│   └── stories/
│       └── epic-1.1-user-auth.md          # Story file
├── qa/
│   └── gates/
│       └── epic-1.1-user-auth.yml         # QA gate
├── tree/                                   # Worktrees (organized by type)
│   ├── feature/
│   │   ├── gallery-123/                   # Feature worktree
│   │   └── auth-567/                      # Another feature
│   ├── bug/
│   │   └── main-app-456/                  # Bug fix worktree
│   └── hotfix/
│       └── api-789/                       # Hotfix worktree
├── .bmad-core/
│   ├── tasks/
│   │   ├── create-github-issue.md
│   │   ├── start-worktree-from-story.md
│   │   ├── finish-worktree-from-story.md
│   │   └── qa-approve-and-merge.md
│   └── data/
│       ├── github-worktree-workflow.md
│       └── github-worktree-workflow-diagram.md
└── .augment/
    └── commands/
        └── bmad/
            ├── sm.md                       # Updated with *create-issue
            ├── dev.md                      # Updated with *start-work, *finish-work
            └── qa.md                       # Updated with *approve-and-merge
```

---

## Next Steps

1. **Test the workflow** with a sample story
2. **Customize branch naming** if needed (in `start-worktree-from-story.md`)
3. **Configure PR templates** in your repo (optional)
4. **Set up branch protection** rules (optional)

---

## Documentation

For detailed information, see:
- **Workflow Guide**: `.bmad-core/data/github-worktree-workflow.md`
- **Visual Diagram**: `.bmad-core/data/github-worktree-workflow-diagram.md`

---

## Benefits

✅ **Parallel Development** - Multiple worktrees for multiple stories  
✅ **Clean Separation** - Each feature isolated in its own worktree  
✅ **QA Gates** - Proper review process before merge  
✅ **Traceability** - Complete chain from story to merge  
✅ **Fast Iteration** - Worktree stays active for QA fixes  
✅ **Automation** - Agents handle GitHub + Git operations  

---

**Ready to use!** 🚀

Start with: `@sm` → `*draft` → `*create-issue`

