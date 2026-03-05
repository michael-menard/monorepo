---
description: Elaborate a story - analyze and define scope, acceptance criteria, and implementation approach
---

# /elab-story - Elaborate a Story

Perform story elaboration - analysis, scope definition, and acceptance criteria.

## Usage

```
/elab-story {FEATURE_DIR} {STORY_ID} [flags]
```

## Flags

| Flag           | Purpose                  |
| -------------- | ------------------------ |
| `--autonomous` | Run without user prompts |

## Elaboration Steps

1. **Setup** - Move story from backlog to elaboration directory
2. **Analysis** - Run elab-analyst for 8-point audit
3. **UI/UX Review** - If story touches UI, run UI/UX review
4. **Completion** - Write ELAB report, update status, move directory

## 8-Point Analysis

1. Scope clarity
2. Technical feasibility
3. Dependencies
4. Edge cases
5. Testing approach
6. Performance considerations
7. Security implications
8. User acceptance criteria

## Example

```
/elab-story plans/future/wishlist WISH-001
/elab-story plans/future/wishlist WISH-001 --autonomous
```
