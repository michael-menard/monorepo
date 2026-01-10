---
name: elab
description: Smart story draft review launcher that accepts story numbers, file paths, or epic directories and delegates to the /review-draft-story workflow. Automatically resolves targets and passes through all options.
---

# /elab - Smart Story Draft Review Launcher

## Description

A convenience wrapper for the `/review-draft-story` workflow that accepts:
- A story number (e.g., `2002`, `3.1.5`)
- A story file path (e.g., `docs/stories/epic-6-wishlist/wish-2002-add-item-flow.md`)
- An epic directory (e.g., `epic-6-wishlist`, `docs/stories/epic-3-shared-gallery/`)

Automatically resolves the target and delegates to `/review-draft-story` with all options preserved.

## Usage

```bash
# Review single story by number
/elab 2002
/elab 3.1.5

# Review story by file path (absolute or relative)
/elab docs/stories/epic-6-wishlist/wish-2002-add-item-flow.md
/elab epic-6-wishlist/wish-2002-add-item-flow.md

# Review all stories in an epic
/elab epic-6-wishlist
/elab docs/stories/epic-6-wishlist/

# Review epic with status filter
/elab epic-6-wishlist --status=Draft
/elab epic-3-shared-gallery --status="In Progress"
```

## Parameters

- **target** - Either:
  - Story number (e.g., `2002`, `3.1.5`)
  - Story file path (e.g., `docs/stories/epic-6-wishlist/wish-2002-add-item-flow.md`)
  - Epic directory name (e.g., `epic-6-wishlist`)
  - Full directory path (e.g., `docs/stories/epic-6-wishlist/`)
- **--status** - Filter stories by status (directory review only, e.g., "Draft", "In Progress")

## Execution

When this skill is invoked:

1. **Parse input** - Determine if target is a story number, file path, or directory
2. **Resolve target**:
   - If story number: Search `docs/stories/` for matching story file
   - If epic name (e.g., `epic-6-wishlist`): Resolve to `docs/stories/epic-6-wishlist/`
   - If file/directory path: Use as-is
3. **Validate existence** - Confirm the target exists
4. **Invoke /review-draft-story** - Call the `/review-draft-story` skill with the resolved target and all flags

The `/review-draft-story` skill will then:
- For single stories: Spawn PM, UX, and SM sub-agents to review from multiple perspectives
- Auto-approve story (Draft → Approved) if no blocking concerns found
- For directories: Review each story sequentially and generate epic summary

---

## How It Works

1. **Accepts flexible input** - Story number, file path, or directory
2. **Auto-detects mode** - Single story vs. directory review
3. **Resolves paths** - Finds actual files/directories
4. **Delegates to /review-draft-story** - Passes through all arguments
5. **Maintains context** - Preserves all flags and options

## Target Resolution

### Story Number (e.g., `2002`)
1. Searches `docs/stories/**/` for files matching pattern `*2002*.md`
2. If multiple matches found, prompts you to choose
3. If one match found, uses that file
4. If no match found, provides helpful error message

### Epic Directory Name (e.g., `epic-6-wishlist`)
1. Prepends `docs/stories/` → `docs/stories/epic-6-wishlist/`
2. Verifies directory exists
3. Scans for all story files (excludes `_legacy/`, `IMPLEMENTATION_ORDER.md`, etc.)

### Full Path
1. Validates path exists
2. Determines if it's a file or directory
3. Uses as-is

## Examples

```bash
# Single story by number
/elab 2002
# Resolves to: docs/stories/epic-6-wishlist/wish-2002-add-item-flow.md
# Calls: /review-draft-story docs/stories/epic-6-wishlist/wish-2002-add-item-flow.md

# Epic directory shorthand
/elab epic-6-wishlist
# Resolves to: docs/stories/epic-6-wishlist/
# Reviews all draft stories in directory sequentially

# Epic with status filter
/elab epic-6-wishlist --status=Draft
# Reviews only stories with status=Draft in epic-6-wishlist
# Auto-approves each story if no blocking concerns
```

## Benefits

✅ **Faster** - Type `elab` instead of `review-draft-story`, use story numbers instead of paths
✅ **Flexible** - Accepts story numbers, file paths, or epic directories
✅ **Smart** - Automatically resolves files and directories
✅ **Transparent** - Shows what it's doing
✅ **Compatible** - Passes through all /review-draft-story options
✅ **Batch-capable** - Review entire epics with one command

## When to Use

Use `/elab` when:
- You want to quickly review a draft story by number
- You want to review all draft stories in an epic
- You don't want to type full file paths
- You want a simpler command interface

Use `/review-draft-story` directly when:
- You already have the exact file/directory path
- You're calling from a script
- You want explicit control

## Review Output

### Single Story
- Concerns appended to story file if blocking/should-fix issues found
- Auto-approve (Draft → Approved) if no blocking concerns
- Terminal summary with PM, UX, and SM perspectives

### Directory/Epic
- Each story file updated with concerns if issues found
- Aggregate summary report showing:
  - Stories approved vs. needs work
  - Concerns by story
  - Common issues across epic
  - Next steps

## Related Commands

- `/review-draft-story` - The underlying story draft review workflow
- `/review` - Review implemented code (not for drafts)
- `/qa-gate` - Quick pass/fail gate decision for code
- `/implement` - Implement a story after review approval
