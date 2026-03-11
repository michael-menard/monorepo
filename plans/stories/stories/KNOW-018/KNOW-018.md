---
story_id: KNOW-018
title: Expose Story Dependency Graph as MCP Tools
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
---

# KNOW-018: Expose Story Dependency Graph as MCP Tools

## Context

The `story_dependencies` table is fully defined, indexed, and migrated but has zero MCP tools exposed. Agents currently have no programmatic way to ask "what is blocking WISH-2045?" or "what does completing WISH-2045 unblock?" — they must infer dependencies by reading story YAML files on disk.

This makes planning and next-work selection less reliable. The `next-work` skill and planning agents would be significantly smarter with direct dependency graph access.

## Goal

Expose the `story_dependencies` table through MCP tools so agents can query blockers, dependents, and resolve/satisfy dependency relationships programmatically.

## Non-goals

- Dependency cycle detection (defer to future; add constraint at DB level)
- Visualizing the dependency graph
- Auto-resolving dependencies based on story state changes (could be a follow-up trigger)

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add 3 new tool schemas
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handlers
- `apps/api/knowledge-base/src/crud-operations/` — new `story-dependency-operations.ts`
- `apps/api/knowledge-base/src/mcp-server/access-control.ts` — add tools to access matrix

### New MCP Tools

| Tool | Description |
|------|-------------|
| `kb_get_story_blockers` | Return all stories blocking the given story |
| `kb_get_story_dependents` | Return all stories that depend on (are unblocked by) the given story |
| `kb_resolve_dependency` | Mark a dependency as satisfied (set `resolved_at`) |

## Acceptance Criteria

### AC1: kb_get_story_blockers Returns Blocking Stories
**Given** story A depends_on story B
**When** `kb_get_story_blockers` is called with story A's ID
**Then** story B is returned in the results with its current state

### AC2: kb_get_story_dependents Returns Downstream Stories
**Given** story A depends_on story B
**When** `kb_get_story_dependents` is called with story B's ID
**Then** story A is returned in the results

### AC3: kb_resolve_dependency Marks Dependency Satisfied
**Given** an unresolved dependency between story A and story B
**When** `kb_resolve_dependency` is called
**Then** `resolved_at` is set to now on the dependency row
**And** story A no longer appears in story B's dependents list (or is marked resolved)

### AC4: Results Include Story State
**Given** blockers are returned
**When** agents receive the result
**Then** each blocking story includes its `state`, `title`, and `story_id` so agents can assess whether the blocker is nearly done

### AC5: Empty Results for Stories with No Dependencies
**Given** a story with no dependencies
**When** either tool is called
**Then** an empty array is returned without error

## Reuse Plan

- Existing `story-crud-operations.ts` patterns for DB queries
- Existing `kb_get_story` for fetching story details to enrich results
- Existing access control matrix pattern

## Test Plan

- Unit test: blockers query returns correct stories
- Unit test: dependents query returns correct stories
- Unit test: resolve_dependency sets resolved_at and removes from active blockers
- Unit test: empty results for story with no dependencies
- Integration test: create dependency → query → resolve cycle

## Risks

- **Stale dependencies**: Story YAML files may have dependencies not synced to DB. This is a data quality issue, not a blocker for this story — document it and address in a follow-up sync story.
