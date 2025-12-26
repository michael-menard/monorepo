# Task: Finish Development and Open PR

## Purpose
Complete development work on a story by opening a Pull Request for QA review.

## Prerequisites
- Worktree exists for the story
- All changes are committed
- All tests pass
- All acceptance criteria met
- Story is marked as "Ready for Review"

## Inputs Required
- Story file path (e.g., `docs/stories/epic-1.1-user-authentication.md`)

## Process

### Step 1: Read Story File
- Extract GitHub issue number
- Extract worktree path
- Extract branch name
- Verify story status is "Ready for Review" or "Done"

### Step 2: Verify Worktree State
```bash
# Navigate to worktree
cd tree/{branch_name}

# Check for uncommitted changes
git status --porcelain
```

If uncommitted changes exist:
```
❌ Uncommitted changes detected in worktree.
   Please commit or stash changes before finishing.
```

### Step 3: Determine Target Branch
Ask user:
```
What branch should this PR target?
1. main
2. develop
3. Other (specify)

Current base branch from story: {base_branch}
```

### Step 4: Run Final Checks
Verify:
```
Development completion checklist:
□ All tasks completed and checked off?
□ All tests passing?
□ All acceptance criteria met?
□ Documentation updated?
□ Story status set to "Ready for Review"?

Continue with PR creation? (y/n)
```

### Step 5: Push Feature Branch to Origin
```bash
# Navigate to worktree
cd tree/{branch_name}

# Push feature branch to origin
git push origin {branch_name}
```

### Step 6: Create Pull Request
Prepare PR body from story:
```markdown
## Story
[Copy story statement from story file]

## Acceptance Criteria
[Copy acceptance criteria - mark completed ones]

## Implementation Notes
[Copy from Dev Agent Record - Completion Notes]

## Testing
- All tests passing ✅
- Test coverage: [coverage %]

## Files Changed
[Copy from story File List]

## Related
- Story: `{story_file_path}`
- Issue: #{issue_number}

---
Ready for QA Review
```

Create PR:
```bash
gh pr create \
  --title "{story_title}" \
  --body "[PR body from above]" \
  --base {target_branch} \
  --head {branch_name} \
  --label "ready-for-review" \
  --label "bmad" \
  --assignee "@me"
```

### Step 7: Link PR to Issue
```bash
# Link PR to issue (will auto-close issue when PR merges)
gh pr edit --add-assignee @me
gh issue comment {issue_number} --body "PR created: [PR URL]"
```

### Step 8: Update Story File
Add PR information to story file:
```markdown
## Development Environment
- Worktree: `tree/{branch_name}` (active)
- Branch: `{branch_name}` (pushed to origin)
- Base Branch: `{base_branch}`
- Created: {timestamp}
- Development Completed: {timestamp}

## Pull Request
- PR: #{pr_number}
- URL: {pr_url}
- Status: Open - Ready for QA Review
- Target Branch: {target_branch}

## GitHub Issue
- Issue: #{issue_number}
- URL: {issue_url}
- Status: Open (linked to PR)
```

### Step 9: Confirm Success and Handoff
Display to user:
```
✅ Development Complete - Ready for QA Review!

Pull Request: #{pr_number}
PR URL: {pr_url}
GitHub Issue: #{issue_number}
Branch: {branch_name}
Worktree: tree/{branch_name} (kept for potential fixes)

Story Status: Ready for Review

Next Steps:
1. Hand off to QA Agent for review
2. QA will run review checklist
3. If approved: QA merges PR and cleans up
4. If rejected: Continue work in existing worktree

To hand off to QA:
  @qa
  *review {story_file_path}
```

## Error Handling

### Push Failed
```
❌ Failed to push to origin.

   Possible causes:
   - Network issue
   - Permission denied
   - Branch protection rules

   Please resolve and push manually:
   git push origin {branch_name}
```

### Tests Failing
```
❌ Tests are failing. Cannot create PR.

   Please fix tests before finishing:
   1. cd tree/{branch_name}
   2. Fix failing tests
   3. Commit fixes
   4. Re-run this task
```

### PR Creation Failed
```
❌ Failed to create Pull Request.
   Error: [error message]

   Branch has been pushed to origin.
   You can create PR manually:
   gh pr create --base {target_branch} --head {branch_name}
```

### Story Not Ready for Review
```
❌ Story status is not "Ready for Review"
   Current status: {current_status}

   Please ensure:
   - All tasks completed
   - All tests passing
   - Story status updated to "Ready for Review"
```

## Output
- Feature branch pushed to origin
- Pull Request created and linked to issue
- Story file updated with PR information
- Worktree kept active for potential QA-requested fixes

## Success Criteria
- All tests passing
- PR created successfully
- PR linked to GitHub issue
- Story marked "Ready for Review"
- QA can access PR for review

## Notes
- This task should be run by the Dev agent after all development is complete
- Worktree is NOT removed - kept for potential QA-requested fixes
- QA agent will handle merge and cleanup after approval
- If QA rejects, Dev can continue work in the same worktree

