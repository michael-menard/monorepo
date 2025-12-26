---
name: develop
description: Smart story implementation launcher that accepts either a story number or file path and delegates to the /implement workflow. Automatically resolves story files from numbers and passes through all options.
---

# /develop - Smart Story Implementation Launcher

## Description

A convenience wrapper for the `/implement` workflow that accepts either:
- A story number (e.g., `1.2`, `1.15`, `3.1.5`)
- A file path (e.g., `docs/stories/1.2.dashboard-scaffolding.md`)

Automatically resolves the story file and delegates to `/implement` with all options preserved.

## Usage

```bash
# With story number
/develop 1.2
/develop 1.15 --parallel --deep-review
/develop 3.1.5 --parallel

# With file path
/develop docs/stories/1.2.dashboard-scaffolding.md
/develop docs/stories/1.15.auth-state-sync.md --parallel

# Multiple stories
/develop 1.1,1.2,1.3 --parallel

# Entire epic
/develop epic:3 --parallel --deep-review
/develop 3 --epic --parallel
```

## Parameters

- **story** - Either:
  - Story number (e.g., `1.2`, `1.15`)
  - File path (e.g., `docs/stories/1.2.dashboard.md`)
  - Multiple stories (e.g., `1.1,1.2,1.3`)
  - Epic reference (e.g., `epic:3`)
- **--parallel** - Use parallel sub-agent execution
- **--deep-review** - Use multi-specialist QA review
- **--quick-review** - Use fast single-agent QA review
- **--skip-review** - Skip QA review (not recommended)
- **--epic** - Treat number as epic number

## How It Works

1. **Accepts flexible input** - Story number or file path
2. **Resolves story file** - Finds the actual story file in `docs/stories/`
3. **Validates existence** - Confirms the story file exists
4. **Delegates to /implement** - Passes through all arguments
5. **Maintains context** - Preserves all flags and options

## Story File Resolution

When you provide a story number like `1.15`, the skill:

1. Searches `docs/stories/` for files matching pattern `1.15.*.md`
2. If multiple matches found, prompts you to choose
3. If one match found, uses that file
4. If no match found, provides helpful error message

## Examples

```bash
# Simple story by number
/develop 1.2
# Resolves to: docs/stories/1.2.dashboard-scaffolding.md
# Calls: /implement docs/stories/1.2.dashboard-scaffolding.md

# Complex story with parallel execution
/develop 1.15 --parallel --deep-review
# Resolves to: docs/stories/1.15.auth-state-sync.md
# Calls: /implement docs/stories/1.15.auth-state-sync.md --parallel --deep-review

# Direct file path (no resolution needed)
/develop docs/stories/1.2.dashboard-scaffolding.md
# Calls: /implement docs/stories/1.2.dashboard-scaffolding.md

# Multiple stories
/develop 1.1,1.2,1.3 --parallel
# Resolves each story number to file path
# Calls: /implement <resolved-paths> --parallel

# Entire epic
/develop epic:3 --parallel --deep-review
# Calls: /implement epic:3 --parallel --deep-review
```

## Benefits

✅ **Faster** - No need to remember or type full file paths
✅ **Flexible** - Accepts story numbers or file paths
✅ **Smart** - Automatically resolves files
✅ **Transparent** - Shows what it's doing
✅ **Compatible** - Passes through all /implement options
✅ **Safe** - Validates before delegating

## When to Use

Use `/develop` when:
- You want to quickly start implementing a story by number
- You don't want to type the full file path
- You're working with multiple stories
- You want a simpler command interface

Use `/implement` directly when:
- You already have the file path
- You're calling from a script
- You want explicit control

## Related Commands

- `/implement` - The underlying implementation workflow
- `/start-feature` - Start a new feature branch
- `/wt-new` - Create a new worktree for development
