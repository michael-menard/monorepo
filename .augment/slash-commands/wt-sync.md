# /wt:sync - Sync Worktree with Upstream

## Description
Quick command to sync the current worktree with upstream changes from the remote repository.

## Usage
```
/wt:sync
```

## What It Does

This slash command:
1. Activates the Git Worktree Manager skill (`@git-worktree`)
2. Automatically runs the `*sync` command
3. Syncs your worktree with the remote branch

## Workflow

The command will:
1. **Check working directory** - Verify it's clean (or offer to stash)
2. **Fetch from origin** - Get latest remote changes
3. **Ask merge preference** - Rebase or merge?
4. **Sync the branch** - Apply the chosen strategy
5. **Show results** - Display what changed

## Example Flow

```
User: /wt:sync

Agent: 🌳 Git Worktree Manager activated!
       
       Syncing current worktree...
       
       ⚠️  You have uncommitted changes. What would you like to do?
       1. Stash changes and sync
       2. Commit changes first
       3. Cancel

User: 1

Agent: [Executing]
       git stash push -m "Auto-stash before sync"
       git fetch origin
       
       Your branch is behind 'origin/feature/gallery-123' by 3 commits.
       
       How would you like to sync?
       1. Rebase (recommended for cleaner history)
       2. Merge (preserves all commits)

User: 1

Agent: [Executing]
       git rebase origin/feature/gallery-123
       
       ✅ Sync complete!
       
       Changes applied:
       - 3 commits from origin
       - Fast-forwarded to abc1234
       
       Restoring stashed changes...
       git stash pop
       
       ✅ Your stashed changes have been restored!
```

## Benefits

✅ **Stay Updated** - Keep worktree in sync with remote  
✅ **Safe Process** - Handles uncommitted changes  
✅ **Flexible** - Choose rebase or merge  
✅ **Automatic Stash** - Stashes and restores changes  

## Notes

- If you have uncommitted changes, they'll be stashed and restored
- You can choose between rebase (cleaner) or merge (safer)
- The command will show you what changed after syncing

## Related Commands

- `/wt:status` - Check sync status before syncing
- `/wt:new` - Create new worktree
- `/wt:finish` - Finish and merge feature

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`

