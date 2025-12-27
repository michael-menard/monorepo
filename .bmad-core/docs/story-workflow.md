# BMAD Story Workflow

## Overview

This document describes the complete story lifecycle from selection through completion, orchestrating the Dev and QA agents to deliver production-ready features.

## Workflow Stages

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SELECT NEXT STORY                                         │
│    @dev *next                                                │
│    → Auto-selects lowest numbered story from Todo           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DEVELOPMENT (Dev Agent)                                   │
│    @dev *next (continues automatically)                      │
│    → Creates feature branch                                  │
│    → Sets status to "In Progress"                            │
│    → Implements all tasks                                    │
│    → Writes unit tests                                       │
│    → Writes Playwright E2E tests                             │
│    → Runs validations (lint, type-check, tests)              │
│    → Updates story file                                      │
│    → Sets status to "Ready for Review"                       │
│    → HALTS and waits for you                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CREATE PULL REQUEST (You)                                │
│    git push origin <branch-name>                             │
│    gh pr create --title "Story X.Y.Z: Title" \               │
│                 --body "Closes #XXX"                         │
│    → PR created and linked to issue                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. QA REVIEW (QA Agent)                                      │
│    @qa *review-pr                                            │
│    → Checks out PR branch                                    │
│    → Reviews code quality                                    │
│    → Runs full test suite                                    │
│    → Runs Playwright E2E tests                               │
│    → Validates accessibility                                 │
│    → Checks performance                                      │
│    → Reviews against acceptance criteria                     │
│    → Posts review comments on PR                             │
│    → Approves or requests changes                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5A. IF CHANGES REQUESTED                                     │
│     @dev *apply-qa-fixes                                     │
│     → Dev agent reads QA feedback                            │
│     → Applies requested changes                              │
│     → Re-runs validations                                    │
│     → Pushes updates to PR                                   │
│     → Return to step 4 (QA review)                           │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5B. IF APPROVED                                              │
│     gh pr merge --squash                                     │
│     → PR merged to main                                      │
│     → GitHub Actions sets status to "Done"                   │
│     → Story file updated to "Status: Done"                   │
│     → Issue moved to "Done" column                           │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Steps

### Step 1: Select Next Story

**Command:**
```bash
@dev
*next
```

**What happens:**
- Dev agent runs `get-next-story.sh`
- Finds lowest numbered open story with `user-story` label
- Displays story information (issue #, title, acceptance criteria)
- Automatically proceeds to development

**Output:**
```
=== Next Story to Develop ===
Issue: #228
Story: 3.1.1
File: docs/stories/3.1.1.instructions-gallery-scaffolding.md

--- Story ---
**As a** developer,
**I want** the Instructions Gallery page scaffolded,
**so that** users can browse their MOC instruction collection.

🚀 Starting development...
```

---

### Step 2: Development (Dev Agent)

**Automatic workflow - no additional commands needed**

**Dev agent executes:**

1. **Create Branch**
   ```bash
   git checkout -b feature/3.1.1-instructions-gallery-scaffolding
   ```

2. **Update Status**
   ```bash
   bash .bmad-core/scripts/set-issue-status.sh 228 InProgress
   ```
   - GitHub issue → "In Progress"
   - Story file → "Status: In Progress"

3. **Implement Tasks**
   - Reads each task from story file
   - Implements code
   - Writes unit tests
   - Writes Playwright E2E tests (Gherkin `.feature` files)
   - Runs validations after each task
   - Marks task complete `[x]`

4. **Final Validations**
   ```bash
   pnpm lint
   pnpm check-types
   pnpm test
   pnpm test:e2e
   ```

5. **Update Story File**
   - Marks all tasks complete
   - Updates File List section
   - Sets status to "Ready for Review"

6. **HALT**
   - Dev agent stops and waits for you
   - Story is ready for PR creation

**Dev agent output:**
```
✅ All tasks complete
✅ All validations pass
✅ Story status set to "Ready for Review"

🛑 HALT - Ready for PR creation
```

---

### Step 3: Create Pull Request (You)

**Commands:**
```bash
# Push branch
git push origin feature/3.1.1-instructions-gallery-scaffolding

# Create PR
gh pr create \
  --title "Story 3.1.1: Instructions Gallery Scaffolding" \
  --body "Closes #228

## Changes
- Created InstructionsModule route
- Scaffolded InstructionsGalleryPage component
- Configured lazy loading

## Testing
- ✅ Unit tests pass
- ✅ E2E tests pass (Playwright)
- ✅ Linting passes
- ✅ Type checking passes

## Acceptance Criteria
All acceptance criteria met - see story file for details."
```

**Important:**
- Include `Closes #228` in PR body to link issue
- Or include issue number in title: `Story 3.1.1: Title (#228)`

---

### Step 4: QA Review (QA Agent)

**Command:**
```bash
@qa
*review-pr
```

**What happens:**

1. **Checkout PR Branch**
   ```bash
   gh pr checkout <pr-number>
   ```

2. **Code Quality Review**
   - Reviews code against coding standards
   - Checks for anti-patterns
   - Validates TypeScript usage
   - Checks Zod schema usage

3. **Run Test Suite**
   ```bash
   pnpm test
   pnpm test:e2e
   ```

4. **Accessibility Validation**
   - Runs axe-core checks
   - Validates ARIA labels
   - Checks keyboard navigation

5. **Performance Check**
   - Validates bundle size
   - Checks for performance regressions

6. **Acceptance Criteria Validation**
   - Reads story file
   - Validates each AC is met
   - Tests user flows

7. **Post Review**
   - Comments on PR with findings
   - Approves or requests changes

**QA agent output:**
```
✅ Code quality: PASS
✅ Tests: PASS (coverage: 92%)
✅ E2E tests: PASS (all scenarios)
✅ Accessibility: PASS (no violations)
✅ Performance: PASS
✅ Acceptance criteria: ALL MET

📝 Posted review on PR #123
✅ APPROVED - Ready to merge
```

---

### Step 5A: If Changes Requested

**Command:**
```bash
@dev
*apply-qa-fixes
```

**What happens:**

1. **Read QA Feedback**
   - Dev agent reads PR comments
   - Extracts requested changes

2. **Apply Fixes**
   - Implements requested changes
   - Updates tests if needed

3. **Re-validate**
   ```bash
   pnpm lint
   pnpm check-types
   pnpm test
   ```

4. **Push Updates**
   ```bash
   git push origin <branch-name>
   ```

5. **Return to QA**
   - QA agent re-reviews
   - Repeat until approved

---

### Step 5B: If Approved - Merge PR

**Command:**
```bash
gh pr merge --squash
```

**What happens:**

1. **PR Merged**
   - Code merged to main branch
   - Feature branch deleted

2. **GitHub Actions Triggered**
   - Workflow: `.github/workflows/update-issue-status.yml`
   - Extracts issue number from PR
   - Updates project status to "Done"
   - Updates story file status to "Done"

3. **Issue Closed**
   - GitHub automatically closes issue (via "Closes #228")
   - Issue moved to "Done" column in project

**Result:**
```
✅ PR merged
✅ Issue #228 closed
✅ Status set to "Done"
✅ Story complete!
```

---

## Quick Reference

### Complete Story in 5 Commands

```bash
# 1. Start next story
@dev
*next

# 2. Wait for dev agent to complete...
# (Dev agent halts when ready)

# 3. Create PR
git push origin <branch-name>
gh pr create --title "Story X.Y.Z: Title" --body "Closes #XXX"

# 4. QA review
@qa
*review-pr

# 5. Merge (if approved)
gh pr merge --squash
```

**Done!** ✅

---

## Agent Commands Reference

### Dev Agent Commands

- `*next` - Auto-select and start next story
- `*develop-story` - Manually select story to develop
- `*apply-qa-fixes` - Apply QA feedback and fix issues
- `*help` - Show all available commands

### QA Agent Commands

- `*review-pr` - Review pull request
- `*review-story` - Review story file
- `*run-e2e` - Run E2E tests only
- `*help` - Show all available commands

---

## Status Transitions

```
Todo → In Progress → Ready for Review → Done
  ↑         ↑              ↑              ↑
  SM       Dev            Dev          GitHub
agent     agent          agent        Actions
```

**Status meanings:**
- **Todo:** Story created, ready to be worked on
- **In Progress:** Dev agent actively working on story
- **Ready for Review:** Dev complete, waiting for QA/PR review
- **Done:** PR merged, story complete

---

## Best Practices

### 1. One Story at a Time
- Complete one story before starting the next
- Avoid context switching
- Maintain focus and quality

### 2. Always Run QA Review
- Never merge without QA approval
- QA catches issues dev agent might miss
- Ensures quality standards

### 3. Address QA Feedback Promptly
- Use `*apply-qa-fixes` immediately
- Don't let PRs go stale
- Keep momentum going

### 4. Use Conventional Commits
- `feat:` for new features
- `fix:` for bug fixes
- `test:` for test updates
- `refactor:` for code improvements

### 5. Keep PRs Focused
- One story = one PR
- Don't mix multiple stories
- Easier to review and merge

---

## Troubleshooting

### Dev Agent Gets Stuck
```bash
# Provide guidance
"Please focus on task 1 first"
"Skip task 2 for now, we'll handle it separately"
```

### QA Finds Critical Issues
```bash
@dev
*apply-qa-fixes
# Dev agent will read QA comments and fix
```

### Need to Switch Stories Mid-Development
```bash
# Commit current work
git add .
git commit -m "WIP: Story X.Y.Z"
git push origin <branch-name>

# Start new story
@dev
*next
```

### PR Conflicts
```bash
# Update branch with main
git checkout <branch-name>
git pull origin main
git push origin <branch-name>

# Re-run QA
@qa
*review-pr
```

---

## Next Steps

Ready to start your first story?

```bash
@dev
*next
```

The workflow will guide you through the rest! 🚀

