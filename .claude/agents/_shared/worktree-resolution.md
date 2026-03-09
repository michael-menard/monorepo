# Worktree Resolution Protocol

> **See also:** `_shared/git-operations.md` — canonical source for all git conventions (branch naming, commit format, PR strategy, command reference, error handling principles).

When stories are developed in git worktrees (e.g., `tree/story/WINT-1160/`), agents spawned via the Task tool run in the main repo root and cannot find story artifacts unless given the worktree path explicitly.

---

## Resolution Algorithm

Orchestrator commands resolve the worktree root at startup (Step 0.5) using this algorithm:

```bash
# 1. Query git for a worktree matching the story
worktree_line=$(git worktree list | grep "story/{STORY_ID}")
if [ -n "$worktree_line" ]; then
    worktree_root=$(echo "$worktree_line" | awk '{print $1}')
else
    # 2. Check conventional path as fallback
    repo_root=$(git rev-parse --show-toplevel)
    conventional_path="${repo_root}/tree/story/${STORY_ID}"
    if [ -d "$conventional_path" ]; then
        worktree_root="$conventional_path"
    else
        # 3. No worktree found — story is in main repo
        worktree_root=null
    fi
fi
```

---

## Context Variable

| Variable | Type | Description |
|----------|------|-------------|
| `worktree_root` | Absolute path or `null` | Worktree root directory for the story, or `null` when running in the main repo |

Orchestrator commands MUST pass `worktree_root` to ALL spawned agents in their context block.

---

## Agent Path Rule

When `worktree_root` is provided (not null), agents MUST prefix all file paths with it:

```
# Instead of:
{FEATURE_DIR}/stories/{STORY_ID}/_implementation/EVIDENCE.yaml

# Use:
{worktree_root}/{FEATURE_DIR}/stories/{STORY_ID}/_implementation/EVIDENCE.yaml
```

When running shell commands (`pnpm test`, `pnpm build`, `git`), `cd {worktree_root}` first.

---

## Backward Compatibility

When `worktree_root` is `null` or absent:
- All paths resolve relative to the current working directory (main repo root)
- Behavior is identical to pre-worktree workflows
- No code changes required for agents that don't receive it
