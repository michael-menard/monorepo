---
description: Switch to different worktree
---

# /wt-switch - Switch Worktree

Switch development context to a different git worktree.

## Usage

```
/wt-switch [WORKTREE_PATH]
```

## Examples

```
/wt-switch                                # show available worktrees
/wt-switch tree/story/WINT-1012          # switch to specific worktree
```

## Notes

- Shows all available worktrees with their status
- Allows navigation between features/stories
- Displays uncommitted changes warning if applicable
