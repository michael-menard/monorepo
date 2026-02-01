---
story_id: KNOW-178
title: Lesson Quality Metrics
status: backlog
epic: knowledgebase-mcp
created: 2026-01-31
updated: 2026-01-31
depends_on: [KNOW-043]
follow_up_from: KNOW-043
blocks: []
assignee: null
priority: P3
story_points: 2
tags: [knowledge-base, metrics, analytics, lessons-learned, data-driven]
---

# KNOW-178: Lesson Quality Metrics

## Follow-up Context

**Parent Story:** KNOW-043 (Lessons Learned Migration)
**Source:** QA Discovery Notes - Follow-up Story #6
**Original Finding:** Lesson Quality Metrics - Capture metrics to measure lesson value: search hits per lesson, agent citations, last accessed date. Enable data-driven decisions about which lessons are valuable.
**Category:** Enhancement Opportunity
**Impact:** Medium - Enables data-driven decisions about lesson quality and value
**Effort:** Low - Metrics tracking with minimal schema changes

## Context

After migrating lessons learned to the Knowledge Base (KNOW-043), we need visibility into which lessons are actually valuable to agents. Currently, there's no way to determine:

- Which lessons are frequently searched and retrieved
- Which lessons agents reference in their work
- Which lessons are stale and unused
- Which topics have the most valuable institutional knowledge

This story captures metrics to measure lesson value, enabling data-driven decisions about:
1. Which lessons to keep, update, or archive
2. Which knowledge areas need more documentation
3. Whether lessons are being discovered and used effectively
4. ROI of the lessons learned migration

## Goal

1. **Track lesson usage metrics** in the Knowledge Base schema
2. **Capture search hit counts** when lessons are retrieved via `kb_search`
3. **Record last accessed timestamps** for each lesson
4. **Provide metrics query capability** via new tool `kb_lesson_metrics`
5. **Enable filtering and ranking** by usage to identify valuable vs. stale lessons

## Non-Goals

- **Agent citation extraction** - Tracking which agent used which lesson requires deep integration; deferred
- **Lesson quality scoring** - Automated quality assessment (combining multiple signals) is future work
- **Real-time analytics dashboard** - Metrics stored in DB; visualization tools deferred
- **User-facing analytics UI** - KB is agent-facing only; no web UI needed
- **Cross-lesson correlation** - Analyzing which lessons are used together is future work
- **Performance impact analysis** - Metrics collection should be lightweight; no complex performance testing

## Scope

### Endpoints/Surfaces

**Modified Tools:**
- `kb_search` - Increment search hit counter for returned lessons
- `kb_get` - Update last accessed timestamp when lesson is retrieved

**New Tools:**
- `kb_lesson_metrics` - Query lesson usage metrics (top N by search hits, least accessed, stale lessons)

### Packages/Apps Affected

- `apps/api/knowledge-base` - Database schema migration, service layer updates, new MCP tool

## Acceptance Criteria

### AC1: Schema Migration
- [ ] Add `search_hit_count` (integer, default 0) to knowledge base entries
- [ ] Add `last_accessed_at` (timestamp, nullable) to knowledge base entries
- [ ] Add `first_accessed_at` (timestamp, nullable) to knowledge base entries
- [ ] Migration is reversible (down migration exists)
- [ ] Existing entries have counters initialized to 0

### AC2: Search Hit Tracking
- [ ] `kb_search` increments `search_hit_count` for each lesson in results
- [ ] Increment happens asynchronously (doesn't slow down search response)
- [ ] Updates `last_accessed_at` timestamp to current time
- [ ] Sets `first_accessed_at` if null (first time accessed)

### AC3: Direct Access Tracking
- [ ] `kb_get` updates `last_accessed_at` timestamp
- [ ] Sets `first_accessed_at` if null
- [ ] No search hit count increment (distinguishes search vs. direct access)

### AC4: Metrics Query Tool
- [ ] New tool `kb_lesson_metrics` returns usage statistics
- [ ] Supports filters: top N by search hits, least accessed, stale (not accessed in X days)
- [ ] Returns: lesson ID, title snippet, search hit count, last accessed timestamp, first accessed timestamp
- [ ] Response includes metadata: total lessons, average search hits, median last access age

### AC5: Performance
- [ ] Metrics updates are asynchronous (non-blocking)
- [ ] Search response time increase < 5ms (p95)
- [ ] Database indexes support efficient metrics queries

### AC6: Testing
- [ ] Unit tests for metrics tracking in search/get operations
- [ ] Integration tests for `kb_lesson_metrics` tool
- [ ] Test coverage > 80% for new code
- [ ] Test metrics persistence across service restarts

### AC7: Documentation
- [ ] Update README with metrics tracking explanation
- [ ] Document `kb_lesson_metrics` tool usage and response format
- [ ] Provide example queries for common metrics analysis scenarios

## Reuse Plan

**Builds on work from parent story:**
- Uses same Knowledge Base schema and infrastructure from KNOW-043
- Extends existing `kb_search` and `kb_get` tools without breaking changes
- Leverages existing MCP server framework for new metrics tool

**Reusable components:**
- Metrics tracking pattern can be applied to other KB entry types (not just lessons)
- Timestamp tracking pattern useful for future analytics features
- Asynchronous update pattern applicable to other non-critical operations

## Architecture Notes

### Metrics Schema Extension

```typescript
// Extended knowledge base entry schema
const KnowledgeBaseEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  tags: z.array(z.string()),
  // ... existing fields ...

  // New metrics fields
  search_hit_count: z.number().int().nonnegative().default(0),
  last_accessed_at: z.date().nullable().default(null),
  first_accessed_at: z.date().nullable().default(null),
})
```

### Metrics Tool Response

```typescript
const LessonMetricsResponseSchema = z.object({
  lessons: z.array(z.object({
    id: z.string().uuid(),
    title_snippet: z.string(),  // First 100 chars of content
    search_hit_count: z.number(),
    last_accessed_at: z.date().nullable(),
    first_accessed_at: z.date().nullable(),
    days_since_last_access: z.number().nullable(),
  })),
  metadata: z.object({
    total_lessons: z.number(),
    avg_search_hits: z.number(),
    median_last_access_age_days: z.number().nullable(),
  }),
})
```

### Asynchronous Update Strategy

Use PostgreSQL's transactional safety to update metrics in the same transaction as the main operation, but return response immediately without waiting for metrics update confirmation. If metrics update fails, main operation still succeeds.

```typescript
// Pseudocode
async function kb_search(query: string) {
  const results = await searchService.search(query)

  // Fire-and-forget metrics update
  metricsService.updateSearchHits(results.map(r => r.id)).catch(logger.error)

  return results  // Don't wait for metrics
}
```

## Test Plan

### Happy Path Tests

#### Test 1: Search Hit Tracking
**Setup:** Knowledge Base with 5 lessons, all with search_hit_count = 0

**Action:** Execute `kb_search` that returns 3 lessons

**Expected:**
- 3 lessons have search_hit_count = 1
- 3 lessons have last_accessed_at = current timestamp
- 3 lessons have first_accessed_at = current timestamp
- 2 lessons remain at search_hit_count = 0

#### Test 2: Repeated Search Increments
**Setup:** Lesson with search_hit_count = 5, last_accessed_at = yesterday

**Action:** Execute `kb_search` that returns this lesson

**Expected:**
- search_hit_count = 6
- last_accessed_at = current timestamp
- first_accessed_at = unchanged (yesterday)

#### Test 3: Metrics Query - Top Lessons
**Setup:** 10 lessons with varying search hit counts (0, 1, 2, 5, 10, 15, 20, 25, 30, 50)

**Action:** `kb_lesson_metrics({ filter: "top", limit: 5 })`

**Expected:**
- Returns 5 lessons with highest search hit counts (50, 30, 25, 20, 15)
- Metadata includes total_lessons = 10, avg_search_hits = calculated average

#### Test 4: Metrics Query - Stale Lessons
**Setup:** 5 lessons with last_accessed_at ranging from 1 day ago to 90 days ago

**Action:** `kb_lesson_metrics({ filter: "stale", stale_days: 30 })`

**Expected:**
- Returns lessons with last_accessed_at > 30 days ago
- Includes days_since_last_access calculation

### Error Cases

#### Error 1: Metrics Update Failure Doesn't Block Search
**Setup:** Database connection issue for metrics update

**Action:** Execute `kb_search`

**Expected:**
- Search results still returned successfully
- Metrics update failure logged as warning
- No error thrown to user

#### Error 2: Null Last Accessed Handling
**Setup:** Newly migrated lessons with null last_accessed_at

**Action:** `kb_lesson_metrics({ filter: "stale", stale_days: 30 })`

**Expected:**
- Null timestamps treated as "never accessed"
- Included in stale results
- days_since_last_access = null (not calculated)

### Edge Cases

#### Edge 1: Concurrent Search Updates
**Setup:** 2 concurrent `kb_search` requests return the same lesson

**Action:** Both searches complete simultaneously

**Expected:**
- search_hit_count increments by 2 (no lost updates)
- PostgreSQL row-level locking prevents race condition

#### Edge 2: Large Result Set Metrics Update
**Setup:** `kb_search` returns 50 lessons

**Action:** Execute search

**Expected:**
- All 50 lessons have metrics updated
- Update completes within performance budget (< 5ms added latency)

## Risks / Edge Cases

1. **Performance impact on search:** Metrics updates must be asynchronous to avoid slowing down searches; test with large result sets
2. **Database write amplification:** High search volume could cause many small writes; consider batching if performance degrades
3. **Metric accuracy trade-offs:** Async updates may lose counts if service crashes; acceptable for analytics use case
4. **Stale lesson false positives:** Lessons accessed via `kb_get` (not search) won't increment search hits; last_accessed_at still tracks access
5. **Migration of existing data:** Existing lessons will have 0 counts and null timestamps; may skew "stale" calculations initially

## Open Questions

_All questions should be resolved before moving to ready-to-work_

None - Story is scoped for independent implementation after KNOW-043 completes.

---

## Related Stories

**Depends on:** KNOW-043 (Lessons Learned Migration) - Provides lessons to track metrics for
**Blocks:** None
**Related:** KNOW-048 (KB Usage Monitoring) - Broader analytics story; this is lesson-specific subset

---

## Notes

- This story focuses on **lesson-specific** metrics; broader KB analytics (all entry types) is future work
- Metrics enable data-driven decisions about lesson quality and ROI of lessons learned migration
- Asynchronous update strategy balances metrics accuracy with search performance
- Consider follow-up story for metrics visualization dashboard after collecting baseline data

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| PM Followup | — | — | — |
| Elaboration | — | — | — |
| Implementation | — | — | — |

(To be filled during execution)
