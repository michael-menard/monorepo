---
story_id: KNOW-045
title: Knowledge Freshness Scoring and Staleness Review Pipeline
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-029  # retrieval feedback (citation_count, retrieval_count) needed for usage signal
  - KNOW-038  # ADRs in DB required for contradiction detection between decisions
---

# KNOW-045: Knowledge Freshness Scoring and Staleness Review Pipeline

## Context

The Knowledge Base only grows. Lessons, decisions, and constraints are added but rarely removed or updated. As the project evolves, this creates a silent quality problem:

- A lesson written 12 months ago about "always mock the S3 client in tests" may now be wrong — a local S3 emulator exists
- An ADR about "use DynamoDB for session data" may have been superseded by a new decision — but the old one is still `status: active` in search results
- A `deprecated-pattern` entry may describe a problem that was fixed 6 months ago — agents are still avoiding a pattern that's now correct

Agents retrieving stale knowledge don't know it's stale. They treat a 2-year-old lesson with the same weight as one written last week. The result is subtle misdirection: agents confidently follow guidance that's no longer valid.

The existing schema has the right hooks: `verified`, `verified_at`, `archived`, `archived_at`. Nothing drives them.

## Goal

Add a staleness scoring system that assigns a `freshness_score` to every knowledge entry based on age, retrieval-without-citation patterns, and contradiction signals. Entries below a freshness threshold are queued for review. A scheduled `kb-freshness-reviewer` agent sweeps the queue and either reaffirms, updates, or archives stale entries.

## Non-goals

- Automatically archiving entries without review (human or agent confirms before archiving)
- Changing the embedding or search algorithm
- Freshness scoring for `story_artifacts` (only `knowledge_entries`)

## Scope

### Freshness Score Model

Add to `knowledge_entries`:

```sql
ALTER TABLE knowledge_entries
  ADD COLUMN freshness_score FLOAT NOT NULL DEFAULT 1.0,
  ADD COLUMN freshness_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN review_requested_at TIMESTAMPTZ,
  ADD COLUMN review_reason TEXT;

CREATE INDEX ON knowledge_entries (freshness_score) WHERE archived = false;
```

**Staleness signals (each reduces freshness_score):**

| Signal | Weight | Condition |
|---|---|---|
| **Age** | -0.01/week | Linear decay after 12 weeks for `lesson`, `finding`; 26 weeks for `decision` |
| **No age decay** | 0 | `entry_type='constraint'` — constraints don't decay by age alone |
| **Retrieval without citation** | -0.05/occurrence | From KNOW-029: `retrieval_count` > 5 and `citation_count / retrieval_count < 0.1` |
| **False positive feedback** | -0.15/occurrence | From WKFL-016: feedback `type:false_positive` linked to this entry |
| **Superseded ADR** | -0.8 (immediate) | A newer `decision` entry references this entry's ID as `superseded_by` |
| **Contradicting new entry** | -0.3 | A newer entry with same tags and similar embedding but different recommendation |

**Freshness score thresholds:**
- `1.0 - 0.7` → Fresh — retrieved normally
- `0.7 - 0.4` → Aging — retrieved with a staleness note in results
- `0.4 - 0.2` → Stale — queued for review, still retrieved but deprioritized
- `< 0.2` → Critical stale — flagged in dashboard, still retrieved but lowest rank

### Freshness Score Integration with `kb_search`

When `freshness_score < 0.4`, append a staleness warning to the retrieved entry's content:

```
⚠️ POTENTIALLY STALE (freshness: 0.31, last verified: 2025-08-14)
This entry has not been cited recently and may no longer be accurate.
Treat with caution and verify against current codebase.
```

This gives agents a signal without suppressing the entry entirely — a stale lesson about auth may still be partially relevant.

### Scheduled Freshness Sweep

Add to `scheduled_jobs` (from WKFL-013):

```sql
INSERT INTO scheduled_jobs (job_type, schedule_cron, config) VALUES
('freshness-sweep', '0 10 * * 1', '{"min_age_weeks": 12, "freshness_threshold": 0.4, "batch_size": 50}');
```

Weekly sweep: Monday 10am. Reviews entries with `freshness_score < 0.4` that haven't been reviewed in 30 days.

### `kb-freshness-reviewer.agent.md`

A focused agent (model: haiku for routine, escalates to sonnet for decisions/ADRs) that:

**For each stale entry in the batch:**

1. Read the entry content
2. Query the current codebase for references to the pattern described
3. Query recent KB entries with similar embeddings for contradictions
4. Query feedback entries for this entry's ID
5. Make one of three decisions:

| Decision | Action | When |
|---|---|---|
| `reaffirm` | Set `verified=true`, `verified_at=NOW()`, boost `freshness_score` to 0.8 | Entry is still accurate |
| `update` | Write updated content via `kb_update`, reset freshness | Entry needs minor correction |
| `archive` | Set `archived=true`, write `review_reason` | Entry is obsolete or superseded |

6. For `decision` entry type (`entry_type='decision'`): escalate to sonnet, require explicit `superseded_by` reference if archiving

**Non-negotiables:**
- Never archive a `decision` entry without writing a `review_reason` explaining the supersession
- Never archive an entry that was cited in the last 30 days without a human-readable note
- `update` decisions write to audit_log with `before` and `after` content

### `kb_request_review` MCP Tool

Agents and humans can manually request review of a specific entry:

```typescript
kb_request_review({
  entry_id: string,
  reason: string,   // e.g. "This lesson contradicts the new S3 emulator setup"
  urgency: 'low' | 'medium' | 'high'
})
// Sets review_requested_at and review_reason on the entry
// High urgency entries are included in the next sweep regardless of schedule
```

### Dashboard Integration (extends KNOW-043)

Add to `kb_dashboard_summary` response:

```typescript
knowledge_health: {
  total_entries: number
  fresh: number         // freshness_score >= 0.7
  aging: number         // 0.4-0.7
  stale: number         // 0.2-0.4
  critical_stale: number  // < 0.2
  pending_review: number  // review_requested_at IS NOT NULL and not yet reviewed
  last_sweep_at: string | null
}
```

### Contradiction Detection on Write

When a new `knowledge_entries` row is inserted, run a lightweight contradiction check:

```typescript
// On kb_add / kb_add_lesson / kb_add_decision:
const similar = await kb_search({
  query: newContent,
  entry_type: newEntryType,
  limit: 3,
  min_similarity: 0.85
})

for (const match of similar) {
  if (recommendationContradict(newContent, match.content)) {
    // Flag existing entry for review
    await kb_request_review({
      entry_id: match.id,
      reason: `New entry ${newId} may contradict this. Review for potential staleness.`,
      urgency: 'medium'
    })
  }
}
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — add freshness columns, index, scheduled_jobs seed
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — `kb_request_review`; extend `kb_search` to include staleness warnings
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement freshness scoring, contradiction check on write
- `apps/api/knowledge-base/src/crud-operations/freshness-operations.ts` — new file
- `.claude/agents/kb-freshness-reviewer.agent.md` — new agent
- `.claude/commands/kb-freshness.md` — manual trigger command

## Acceptance Criteria

- [ ] `freshness_score` column exists and is initialized to `1.0` for all existing entries
- [ ] Age decay reduces `freshness_score` by 0.01/week for `lesson` and `finding` entries after 12 weeks
- [ ] `decision` entries do not decay by age alone — only by contradiction or supersession signals
- [ ] `kb_search` returns a staleness warning in entry content when `freshness_score < 0.4`
- [ ] Weekly freshness sweep runs via `scheduled_jobs` and processes up to 50 stale entries
- [ ] `kb-freshness-reviewer` reaffirms, updates, or archives each reviewed entry
- [ ] Archiving a `decision` entry requires a written `review_reason`
- [ ] `kb_request_review` allows manual staleness flagging with urgency level
- [ ] New entries trigger contradiction detection against semantically similar existing entries
- [ ] Dashboard `knowledge_health` section shows counts by freshness tier
- [ ] After one sweep cycle, at least one entry from the existing KB corpus has been reviewed and its freshness score updated
