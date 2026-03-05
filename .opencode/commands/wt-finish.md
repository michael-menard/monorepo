---
description: Merge PR, delete branch, and remove worktree
---

# /wt-finish - Finish Feature

Squash-merge a GitHub PR, delete remote and local branches, and remove the local worktree.

## Usage

```
/wt-finish
```

## Process

1. Confirm PR is ready for merge (all checks pass)
2. Squash-merge PR to main
3. Delete remote branch
4. Delete local branch
5. Remove worktree directory

## Notes

- Use after QA verification passes
- Requires PR to be in mergeable state
- Cleans up workspace after feature is complete
