---
created: 2026-03-07
version: 1.0.0
type: shared
---

# Shared: Collision Detection Pattern

This document defines the standard collision detection pattern used during bootstrap to prevent duplicate story creation.

## Purpose

Before creating stories for a plan, agents must verify no stories already exist for that plan. This prevents double-bootstrapping the same feature.

## Standard KB Collision Check

```javascript
kb_list_stories({ feature: "{project_name}", limit: 1 })
```

### Decision Table

| Result | Action |
|--------|--------|
| One or more stories returned | BLOCKED: "Stories already exist in KB for plan '{project_name}' — bootstrap already run" |
| Zero stories returned | Proceed to next step |
| Tool unavailable (error/timeout) | Log warning, fall back to filesystem check (see below) |

## Filesystem Fallback

If `kb_list_stories` is unavailable (tool not found, connection error, timeout):

1. Log warning: `"KB collision check unavailable — falling back to filesystem check"` via `@repo/logger`
2. Check if `{feature_dir}/stories.index.md` exists on disk
3. If file exists: BLOCKED: "stories.index.md already exists in {feature_dir} — bootstrap already run (filesystem fallback)"
4. If file does not exist: proceed to next step

## Error Table

| Condition | Action |
|-----------|--------|
| KB stories exist for plan | BLOCKED: "Stories already exist in KB for plan '{project_name}' — bootstrap already run" |
| `kb_list_stories` unavailable | Warning + filesystem fallback |
| `stories.index.md` exists (fallback) | BLOCKED: "stories.index.md already exists in {feature_dir} — bootstrap already run (filesystem fallback)" |
| No collision detected (either path) | Proceed |
