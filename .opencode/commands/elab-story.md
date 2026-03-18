---
description: Elaborate a story - analyze and define scope, acceptance criteria, and implementation approach
---

# /elab-story - Elaborate a Story

Perform story elaboration - analysis, scope definition, and acceptance criteria.

## Usage

```
/elab-story {STORY_ID} [flags]
```

## Flags

| Flag           | Purpose                  |
| -------------- | ------------------------ |
| `--autonomous` | Run without user prompts |

## Elaboration Steps

1. **Setup** - Update story state to elaboration in KB
2. **Analysis** - Run elab-analyst for 8-point audit
3. **UI/UX Review** - If story touches UI, run UI/UX review
4. **Completion** - Write ELAB report to KB, update status

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
/elab-story WISH-001
/elab-story WISH-001 --autonomous
```
