# /wt:finish - Finish Feature and Merge

## Description
Quick command to finish a feature, merge it back to the base branch, and clean up the worktree.

## Usage
```
/wt:finish
```

## What It Does

This slash command:
1. Activates the Git Worktree Manager skill (`@git-worktree`)
2. Automatically runs the `*finish-feature` command
3. Guides you through merging and cleanup

## Workflow

The command will:
1. **Verify clean state** - Ensure all changes are committed
2. **Ask for base branch** - Which branch to merge into (e.g., `main`)
3. **Run tests** - Optional: run tests before merging
4. **Checkout base branch** - Switch to the target branch
5. **Merge feature** - Merge your feature branch
6. **Push changes** - Push the merged changes
7. **Remove worktree** - Clean up the feature worktree
8. **Delete branch** - Optionally delete the feature branch

## Example Flow

```
User: /wt:finish

Agent: 🌳 Git Worktree Manager activated!
       
       Finishing feature worktree...
       
       Current worktree: tree/feature/gallery-123
       Current branch: feature/gallery-123
       
       ⚠️  You have uncommitted changes. Please commit them first.
       
       Would you like to commit now? (y/n)

User: y

Agent: Please provide a commit message:

User: feat: add gallery component with tests

Agent: [Executing]
       git add -A
       git commit -m "feat: add gallery component with tests"
       
       ✅ Changes committed!
       
       Would you like to run tests before merging? (y/n)

User: y

Agent: [Executing]
       pnpm test
       
       ✅ All tests passed!
       
       Which branch would you like to merge into?

User: main

Agent: [Executing]
       ✓ Switched to main branch
       ✓ Pulled latest changes
       ✓ Merged feature/gallery-123
       ✓ Pushed to origin/main
       ✓ Removed worktree tree/feature/gallery-123
       
       Would you like to delete the feature branch? (y/n)

User: y

Agent: [Executing]
       git branch -d feature/gallery-123
       git push origin --delete feature/gallery-123
       
       ✅ Feature complete!
       
       Summary:
       - Feature merged into main
       - Worktree removed
       - Branch deleted
       
       You are now on: main
```

## Benefits

✅ **Complete Workflow** - Handles entire merge process  
✅ **Safe Merging** - Verifies tests and clean state  
✅ **Automatic Cleanup** - Removes worktree and branch  
✅ **Guided Process** - Interactive prompts for all steps  

## Notes

- Ensures all changes are committed before merging
- Optionally runs tests before merging
- Cleans up both worktree and branch
- Returns you to the base branch

## Related Commands

- `/wt:new` - Create new worktree
- `/wt:status` - Check status before finishing
- `/wt:cleanup` - Clean up multiple worktrees

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`
- **Workflow Guide**: `.bmad-core/data/github-worktree-workflow.md`

