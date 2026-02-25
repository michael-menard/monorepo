---
story_id: KNOW-038
title: Migrate ADR-LOG.md to Knowledge Base as Single Source of Truth
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: tech-debt
priority: critical
---

# KNOW-038: Migrate ADR-LOG.md to Knowledge Base as Single Source of Truth

## Context

Architecture Decision Records (ADRs) currently live in `plans/stories/ADR-LOG.md` — a markdown file on disk. The KB has a fully functional `kb_add_decision` MCP tool and stores decisions in `knowledge_entries` with `entry_type='decision'`, but the `knowledge-context-loader` agent reads the file, not the DB.

This creates several immediate problems:

1. **Worktree divergence**: Four divergent copies of `ADR-LOG.md` already exist across active worktrees (`WINT-1120`, `WINT-2100`, `WINT-1070`, `KBAR-0050`). Developers in different worktrees are operating under different architectural constraints.
2. **No visibility**: A developer who hasn't read the file doesn't know ADR-001 exists. If it's not in the DB, it doesn't exist.
3. **No lifecycle tracking**: The file has no mechanism for marking an ADR as superseded, deprecated, or under review. Status is prose-only.
4. **No semantic search**: ADRs in a file cannot be retrieved by embedding similarity — "what ADRs apply to authentication?" requires human knowledge of the file structure.

The `kb_add_decision` tool exists precisely to solve this. The gap is that it's not being used as the authoritative write path, and the read path still goes to disk.

## Goal

Migrate all 6 existing ADRs from `ADR-LOG.md` into `knowledge_entries`, update the `knowledge-context-loader` to read from the DB, add ADR lifecycle status tracking, and deprecate `ADR-LOG.md` as the source of truth.

## Non-goals

- Deleting `ADR-LOG.md` immediately (keep as read-only archive, add deprecation notice)
- Changing the `kb_add_decision` tool schema
- Building a UI for ADR management

## Scope

### ADR Lifecycle Status

Add `adr_status` to the `knowledge_entries` tags convention, plus a structured `status` field via the decision content schema:

```typescript
// Extend KbAddDecisionInputSchema with:
status: z.enum(['proposed', 'active', 'deprecated', 'superseded']).default('active'),
superseded_by: z.string().optional(),   // ADR ID that supersedes this one
effective_date: z.string().optional(),  // ISO date when decision took effect
```

Store as structured frontmatter in the content field:
```markdown
---
status: active
effective_date: 2025-06-01
---
# Decision: API Endpoint Path Schema
...
```

### Migration

One-time migration script that:
1. Reads each ADR from `ADR-LOG.md`
2. Calls `kb_add_decision` with extracted title, context, decision, consequences
3. Tags with `['adr', 'decision', 'adr-001']` etc. for reference stability
4. Sets `status: active` for all current ADRs

### `knowledge-context-loader` Update

Update `knowledge-context-loader.agent.md` to:
1. Replace file read of `ADR-LOG.md` with `kb_search({ entry_type: 'decision', tags: ['adr'], limit: 20 })`
2. Filter to `status: active` decisions only
3. Remove hardcoded ADR-001 through ADR-005 references — load dynamically from DB

### ADR-LOG.md Deprecation

Add to top of `ADR-LOG.md`:
```
> ⚠️ DEPRECATED: This file is no longer the source of truth for ADRs.
> All ADRs have been migrated to the Knowledge Base DB.
> Query via: kb_search({ entry_type: 'decision', tags: ['adr'] })
```

### When New ADRs Are Created

Update agent instructions so new ADRs are always written via `kb_add_decision`, never appended to the file.

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — extend decision schema with status fields
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — handle status in content formatting
- `apps/api/knowledge-base/src/scripts/migrate-adrs.ts` — one-time migration script
- `.claude/agents/knowledge-context-loader.agent.md` — replace file read with DB query
- `plans/stories/ADR-LOG.md` — add deprecation notice

## Acceptance Criteria

- [ ] All 6 existing ADRs are present in `knowledge_entries` with `entry_type='decision'`
- [ ] Each ADR has `status: active` and is tagged with `adr`, `decision`, and its specific ID (`adr-001` etc.)
- [ ] `knowledge-context-loader` loads ADRs from DB, not from `ADR-LOG.md`
- [ ] `knowledge-context-loader` filters to `status: active` ADRs only
- [ ] `ADR-LOG.md` has a deprecation notice at the top
- [ ] `kb_add_decision` accepts and stores `status`, `superseded_by`, and `effective_date` fields
- [ ] `kb_search({ entry_type: 'decision', tags: ['adr'] })` returns all active ADRs
- [ ] Developers in any worktree querying the KB see the same ADRs (no divergence)
- [ ] Running the migration twice does not create duplicate entries (idempotent)
