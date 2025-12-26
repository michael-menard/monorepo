# Task: QA Approve and Merge PR

## Purpose
After QA review passes, merge the Pull Request, close the issue, and cleanup the worktree.

## Prerequisites
- QA review checklist completed and passed
- PR exists and is ready to merge
- Story status is "QA Approved" or "Done"
- All CI/CD checks passing (if applicable)

## Inputs Required
- Story file path (e.g., `docs/stories/epic-1.1-user-authentication.md`)

## Process

### Step 1: Read Story File
- Extract PR number
- Extract GitHub issue number
- Extract branch name
- Extract worktree path
- Verify story status is approved

### Step 2: Verify PR Status
```bash
# Check PR status
gh pr view {pr_number}

# Check if PR is mergeable
gh pr checks {pr_number}
```

If checks failing:
```
⚠️  PR checks are failing!
   Cannot merge until all checks pass.
   
   View checks: gh pr checks {pr_number}
```

### Step 3: Confirm Merge
Ask user:
```
Ready to merge PR and cleanup?

PR: #{pr_number}
Issue: #{issue_number}
Branch: {branch_name}
Worktree: tree/{branch_name}

This will:
1. Merge the PR
2. Close the GitHub issue
3. Remove the worktree
4. Delete the feature branch

Continue? (y/n)
```

### Step 4: Merge Pull Request
Ask user for merge strategy:
```
How should I merge?
1. Squash and merge (recommended - single commit)
2. Merge commit (preserves all commits)
3. Rebase and merge (linear history)
```

Execute chosen strategy:
```bash
# Option 1: Squash and merge
gh pr merge {pr_number} --squash --delete-branch

# Option 2: Merge commit
gh pr merge {pr_number} --merge --delete-branch

# Option 3: Rebase and merge
gh pr merge {pr_number} --rebase --delete-branch
```

### Step 5: Verify Issue Closure
```bash
# Check if issue was auto-closed by PR merge
gh issue view {issue_number}
```

If issue still open:
```bash
# Close issue manually
gh issue close {issue_number} --comment "Merged via PR #{pr_number}. QA approved."
```

### Step 6: Remove Worktree
```bash
# Remove the worktree
git worktree remove tree/{branch_name} --force

# Prune worktree references
git worktree prune
```

### Step 7: Update Story File
Update story file with completion info:
```markdown
## Development Environment
- Worktree: `tree/{branch_name}` (removed)
- Branch: `{branch_name}` (merged and deleted)
- Base Branch: `{base_branch}`
- Created: {dev_start_timestamp}
- Development Completed: {dev_complete_timestamp}
- QA Approved: {qa_timestamp}
- Merged: {merge_timestamp}

## Pull Request
- PR: #{pr_number}
- URL: {pr_url}
- Status: Merged
- Target Branch: {target_branch}
- Merge Commit: {merge_commit_hash}

## GitHub Issue
- Issue: #{issue_number}
- URL: {issue_url}
- Status: Closed
- Closed: {close_timestamp}
```

### Step 8: Confirm Success
Display to user:
```
✅ Story Complete - PR Merged and Cleaned Up!

PR: #{pr_number} (Merged)
Issue: #{issue_number} (Closed)
Branch: {branch_name} (Deleted)
Worktree: Removed
Merge Commit: {merge_commit_hash}

Story Status: Done

The feature has been successfully merged to {target_branch}.
All resources have been cleaned up.
```

## Error Handling

### PR Not Mergeable
```
❌ PR cannot be merged.
   
   Possible issues:
   - Merge conflicts
   - Failing checks
   - Branch protection rules
   
   Please resolve issues and try again:
   gh pr view {pr_number}
```

### Worktree Removal Failed
```
⚠️  Could not remove worktree automatically.
   
   Worktree may have uncommitted changes or be in use.
   
   To remove manually:
   git worktree remove tree/{branch_name} --force
```

### Issue Not Closed
```
⚠️  GitHub issue did not auto-close.
   
   Closing manually...
   gh issue close {issue_number}
```

## Output
- PR merged to target branch
- GitHub issue closed
- Worktree removed
- Feature branch deleted
- Story file updated with completion info

## Success Criteria
- PR successfully merged
- Issue closed
- Worktree and branch cleaned up
- Story file reflects completion
- No orphaned resources

## Notes
- This task should ONLY be run by QA agent after review passes
- If QA review fails, use the normal QA rejection workflow instead
- Worktree removal is final - ensure all work is committed and merged
- The --delete-branch flag in gh pr merge handles remote branch cleanup

