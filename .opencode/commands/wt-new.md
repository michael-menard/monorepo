---
description: Create new worktree and branch for feature development
---

# /wt-new - Create New Worktree

Create a new git worktree with a new branch for isolated feature development.

## Usage

```
/wt-new [BRANCH_NAME] [BASE_BRANCH]
```

## Parameters

| Parameter   | Required | Default    | Description                                   |
| ----------- | -------- | ---------- | --------------------------------------------- |
| BRANCH_NAME | No       | (prompted) | Feature branch name (e.g., `story/WINT-1012`) |
| BASE_BRANCH | No       | main       | Branch to base off                            |

## Examples

```
/wt-new                                  # fully interactive
/wt-new story/WINT-1012                  # uses main as base
/wt-new story/WINT-1012 main            # fully automated
```

## Notes

- Creates worktree in `tree/` directory
- Creates new branch from base
- Automatically tracks in database
