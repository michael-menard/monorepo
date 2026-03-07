---
created: 2026-03-07
version: 1.0.0
type: shared
---

# Shared: Context Cache Integration

This document defines the standard Context Cache Integration pattern used by leader agents.

## Overview

Leader agents **MUST query Context Cache at workflow start** to retrieve pre-distilled project conventions and known blockers. This reduces token consumption by avoiding repeated full-document reads.

## Standard Query Pattern

### Available Pack Types

| packType | packKey | Purpose |
|----------|---------|---------|
| `architecture` | `project-conventions` | Project conventions, coding standards, patterns |
| `lessons_learned` | `blockers-known` | Known blockers to avoid repeating previous mistakes |

### Call Pattern

```javascript
context_cache_get({ packType: 'architecture', packKey: 'project-conventions' })
  → if null: log warning via @repo/logger, continue without cache context
  → if hit: inject content.conventions (first 5 entries) and content.summary into agent context

context_cache_get({ packType: 'lessons_learned', packKey: 'blockers-known' })
  → if null: log warning via @repo/logger, continue without blockers cache
  → if hit: inject content.blockers (first 5 entries) into prioritization context
```

### Content Injection Limits

- Inject: `summary`, `conventions` (first 5 entries), `blockers` (first 5 entries)
- Skip: `raw_content`, `full_text`, verbose examples (unbounded size)
- Max injection: ~2000 tokens total across all packs

### Fallback Behavior

- Cache miss (null): Log `"Cache miss for {packType}/{packKey} — proceeding without cache context"` via `@repo/logger`. Continue execution.
- Tool error (exception): Catch, log warning via `@repo/logger`, continue. Never block execution.

## Per-Agent Configuration

Each agent specifies **which packs to query** in their Context Cache section. Not all agents query all packs — query only what is relevant to the agent's purpose.

### Setup/Bootstrap Agents

Query: `architecture/project-conventions` only (no blockers needed at validation time).

### Implementation/Fix Agents

Query both: `architecture/project-conventions` and `lessons_learned/blockers-known`.

## When to Query

Query **before** the first substantive action of the workflow (before validation, before file reads, before spawning workers). This ensures conventions are available for the entire execution.
