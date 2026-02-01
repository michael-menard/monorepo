---
story_id: KNOW-158
title: Lesson Lifecycle Management
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
tags: [knowledge-base, lifecycle, lessons-learned, maintenance, metadata]
---

# KNOW-158: Lesson Lifecycle Management

## Follow-up Context

**Parent Story:** KNOW-043 (Lessons Learned Migration)
**Source:** QA Discovery Notes (Open Question #3 deferred)
**Original Finding:** "Should lessons have an expiration or review date?"
**Category:** Enhancement Opportunity
**Impact:** Medium - Prevents knowledge decay and ensures lessons remain relevant
**Effort:** Low - Metadata additions and cleanup script

## Context

After migrating lessons learned from markdown files to the Knowledge Base (KNOW-043), the KB will contain institutional knowledge that may become stale over time. Technologies change, patterns evolve, and previously captured lessons may no longer apply to current practices.

Without lifecycle management, the KB could accumulate outdated or irrelevant lessons that mislead agents or clutter search results. This story defines and implements a strategy for identifying stale lessons, marking them for review, and cleaning up obsolete entries.

## Goal

1. **Define lesson expiration policy** - Determine if/when lessons should expire or require review
2. **Add review metadata** - Extend lesson entries with review dates and freshness indicators
3. **Implement cleanup process** - Create tooling to identify and handle stale lessons
4. **Document lifecycle workflow** - Guide agents and maintainers on lesson lifecycle management

## Non-Goals

- **Automatic content updates** - No AI-powered rewriting of stale lessons; manual review only
- **Version control for lessons** - KB timestamps sufficient; full versioning system deferred
- **Lesson approval workflows** - All agents can still add lessons freely; review is post-hoc
- **Lesson metrics/analytics** - Usage tracking deferred to separate story (KNOW-048)
- **Hard deletion on expiration** - Prefer archival tags over deletion for historical reference

## Scope

### Endpoints/Surfaces

**Modified:**
- KB schema - Add `review_date`, `last_reviewed`, `is_stale` fields to knowledge entries
- `kb_add` tool - Support optional review metadata during lesson creation
- `kb_update` tool - Support updating review status

**New:**
- `kb_mark_for_review` tool - Flag lessons as needing review
- `scripts/review-stale-lessons.ts` - Identify lessons approaching review dates
- `docs/knowledge-base/lesson-lifecycle.md` - Lifecycle policy and procedures

### Packages Affected

- `apps/api/knowledge-base` - Schema changes, new tools, cleanup scripts

## Acceptance Criteria

### AC1: Review Metadata Schema
- [ ] KB schema includes `review_date` (optional datetime) field
- [ ] KB schema includes `last_reviewed` (optional datetime) field
- [ ] KB schema includes `is_stale` (boolean, default false) field
- [ ] Migration script updates existing lessons with default values

### AC2: Review Date Configuration
- [ ] Default review interval defined (e.g., 6 months for lessons, 12 months for architectural decisions)
- [ ] Configuration supports different intervals by tag/category
- [ ] `kb_add` tool accepts optional `review_date` parameter
- [ ] Auto-calculated review date if not provided (current date + default interval)

### AC3: Stale Lesson Identification
- [ ] Script identifies lessons past review date
- [ ] Script marks lessons as stale (`is_stale = true`) after review date passes
- [ ] Script generates report of stale lessons (count, categories, oldest entries)
- [ ] Script supports dry-run mode (no updates, report only)

### AC4: Review Workflow Tools
- [ ] `kb_mark_for_review` tool flags specific lessons for manual review
- [ ] `kb_update` tool can update `last_reviewed` timestamp and clear `is_stale` flag
- [ ] Agents can extend review dates for still-relevant lessons
- [ ] Archival process tags obsolete lessons with `archived` tag (soft delete)

### AC5: Search Filtering
- [ ] `kb_search` excludes stale lessons by default (configurable)
- [ ] `kb_search` supports `include_stale: true` parameter to include stale results
- [ ] Search results include staleness indicators in metadata

### AC6: Documentation
- [ ] Lifecycle policy documented (review intervals, expiration rules)
- [ ] Review workflow guide for maintainers (how to review, update, or archive)
- [ ] Agent instructions updated to handle stale lesson warnings
- [ ] Example queries and review commands documented

## Architecture Notes

### Lifecycle State Machine

```
Created → Active → Approaching Review → Needs Review → (Refreshed|Archived)
                                             ↓
                                        is_stale=true
```

### Review Interval Recommendations

| Lesson Type | Default Review Interval | Rationale |
|-------------|------------------------|-----------|
| Debugging patterns | 6 months | Technologies/bugs evolve quickly |
| Architectural decisions | 12 months | Foundational patterns change slowly |
| Testing strategies | 9 months | Testing tools evolve moderately |
| Deployment procedures | 6 months | Infrastructure changes frequently |

### Cleanup Script Flow

```
1. Query all lessons with review_date < NOW()
2. Group by category/tags
3. Mark as is_stale=true
4. Generate report (CSV or JSON)
5. Notify maintainers via output/email
6. Manual review: Update last_reviewed OR tag as archived
```

## Test Plan

### Happy Path Tests

#### Test 1: Add Lesson with Review Date
**Setup:** KB running, agent writes lesson

**Action:**
```typescript
kb_add({
  content: "Always validate input schemas before processing",
  tags: ["lesson-learned", "validation", "backend"],
  review_date: "2026-07-31"
})
```

**Expected:**
- Lesson added with `review_date = 2026-07-31`
- `is_stale = false`
- `last_reviewed = null`

#### Test 2: Identify Stale Lessons
**Setup:** Lessons in KB with review_date in the past

**Action:** Run `pnpm kb:review-stale --dry-run`

**Expected:**
- Script identifies all lessons past review date
- Report shows count, categories, oldest entry
- No updates occur (dry-run mode)

#### Test 3: Refresh Lesson After Review
**Setup:** Lesson marked `is_stale = true`

**Action:**
```typescript
kb_update({
  id: "lesson-123",
  last_reviewed: "2026-01-31",
  review_date: "2026-07-31",
  is_stale: false
})
```

**Expected:**
- `is_stale` cleared
- `last_reviewed` updated
- New `review_date` set

#### Test 4: Search Excludes Stale Lessons
**Setup:** KB contains mix of active and stale lessons

**Action:**
```typescript
kb_search({ query: "validation patterns" })
```

**Expected:**
- Results exclude lessons with `is_stale = true`
- Only active lessons returned

### Error Cases

#### Error 1: Invalid Review Date
**Setup:** Agent provides past date for new lesson

**Expected:** Accept date (lesson immediately marked for review), log warning

#### Error 2: Missing Review Metadata on Update
**Setup:** Attempt to clear `is_stale` without updating `last_reviewed`

**Expected:** Validation error - `last_reviewed` required when clearing staleness

## Risks / Edge Cases

1. **Over-aggressive expiration:** Too-short review intervals create maintenance burden
2. **Ignored stale lessons:** No automated enforcement; maintainers must act on reports
3. **Category-specific intervals:** Different lesson types may need different rules; start simple
4. **Search result staleness:** Stale lessons still in embeddings; reranking needed?

## Open Questions

1. **How to handle archived lessons?** Tag-based archival vs. separate table?
   - **Resolution:** Tag-based (`archived` tag) for simplicity; keeps data for historical reference
2. **Should stale lessons appear in kb_get?**
   - **Resolution:** Yes, `kb_get` by ID always returns entry regardless of staleness
3. **Who reviews stale lessons?**
   - **Resolution:** PM/architect role; document in lifecycle guide

---

## Related Stories

**Depends on:** KNOW-043 (Lessons Learned Migration) - Provides lesson content to manage
**Related:** KNOW-048 (KB Usage Monitoring) - May inform which lessons are actively used
**Related:** KNOW-049 (Lesson Quality Metrics) - Complements lifecycle with quality scoring

---

## Notes

- Start with conservative review intervals (6-12 months) to avoid excessive churn
- Focus on identification and reporting; manual review workflow keeps humans in loop
- Consider future automation (ML-based relevance scoring) after observing usage patterns
- Archival tags preserve knowledge for historical analysis without cluttering active searches

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Elaboration | — | — | — |
| Implementation | — | — | — |

(To be filled during execution)
