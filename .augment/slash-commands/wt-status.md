# /wt:status - Show Worktree Status

## Description
Quick command to show comprehensive status of the current worktree and all worktrees.

## Usage
```
/wt:status
```

## What It Does

This slash command:
1. Activates the Git Worktree Manager skill (`@git-worktree`)
2. Automatically runs the `*status` command
3. Shows detailed status information

## Information Displayed

The command shows:
- **Current worktree location** - Where you are now
- **All worktrees and their states** - Overview of all worktrees
- **Uncommitted changes** - Files modified, staged, untracked
- **Branches ahead/behind origin** - Sync status with remote

## Example Output

```
User: /wt:status

Agent: 🌳 Git Worktree Manager activated!
       
       === Current Worktree ===
       Location: /Users/user/Monorepo/tree/feature/gallery-123
       Branch: feature/gallery-123
       
       Uncommitted Changes:
       - Modified: 3 files
         • src/components/Gallery.tsx
         • src/components/Gallery.test.tsx
         • src/styles/gallery.css
       - Staged: 0 files
       - Untracked: 1 file
         • src/components/GalleryItem.tsx
       
       Sync Status:
       - Ahead of origin/feature/gallery-123 by 2 commits
       - Behind by 0 commits
       
       === All Worktrees ===
       
       1. /Users/user/Monorepo (main)
          Status: Clean
          Sync: Up to date with origin/main
       
       2. /Users/user/Monorepo/tree/feature/gallery-123 ← current
          Status: Modified (3 files)
          Sync: Ahead by 2 commits
       
       3. /Users/user/Monorepo/tree/bugfix/main-app-456
          Status: Clean
          Sync: Behind by 1 commit
       
       Total: 3 worktrees
```

## Benefits

✅ **Complete Overview** - See everything at a glance  
✅ **Sync Awareness** - Know what needs pushing/pulling  
✅ **Change Tracking** - See all uncommitted work  
✅ **Multi-Worktree View** - Status of all worktrees  

## Related Commands

- `/wt:list` - Simple list of worktrees
- `/wt:sync` - Sync current worktree with upstream
- `/wt:switch` - Switch to another worktree

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`

