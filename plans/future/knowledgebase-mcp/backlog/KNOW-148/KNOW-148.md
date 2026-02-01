---
story_id: KNOW-148
title: Post-Migration Quality Review
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
tags: [knowledge-base, quality, migration, cleanup, lessons-learned]
---

# KNOW-148: Post-Migration Quality Review

## Follow-up Context

**Parent Story:** KNOW-043 (Lessons Learned Migration)
**Source:** QA Discovery Notes - Follow-up Story #3
**Original Finding:** "KNOW-046 - Post-Migration Quality Review (Validate migrated content quality and searchability)"
**Category:** Enhancement Opportunity
**Impact:** Medium - Improves KB content quality and search effectiveness
**Effort:** Low - Post-migration review and cleanup task

## Context

After migrating LESSONS-LEARNED.md content to the Knowledge Base (KNOW-043), a quality review is needed to identify and address issues that may have arisen during migration:

1. **Low-value entries**: Short content with minimal context, duplicated information across entries
2. **Outdated lessons**: Information that is no longer relevant to current codebase or practices
3. **Consolidation opportunities**: Multiple related lessons that could be merged into comprehensive entries
4. **Search effectiveness**: Validate that migrated lessons are discoverable via semantic search

This story focuses on post-migration cleanup to ensure the KB contains high-quality, relevant, and searchable institutional knowledge.

## Goal

Review migrated lessons learned content and improve KB quality by:

1. **Identify low-value entries** and either enhance or remove them
2. **Detect outdated lessons** that no longer apply to current practices
3. **Find consolidation opportunities** for related lessons
4. **Validate search effectiveness** for common queries
5. **Generate quality report** with recommended actions

## Non-Goals

- **Re-implementing functionality from KNOW-043** - This is quality review only, not re-migration
- **Automated quality scoring** - Manual review with tooling assistance is sufficient for MVP
- **Continuous monitoring** - One-time review; ongoing monitoring is a separate concern (KNOW-048)
- **Lesson versioning** - Not implementing version control; that's out of scope
- **AI-based auto-tagging** - Manual tag improvement only

## Scope

### Endpoints/Surfaces

**N/A** - Review tooling and reports only, no user-facing endpoints

### Packages/Apps Affected

- `apps/api/knowledge-base` - May add review script utilities
- Root `scripts/` - Quality review scripts

## Acceptance Criteria

### AC1: Low-Value Entry Detection
- [ ] Script identifies lessons with minimal content (< 100 characters)
- [ ] Script detects entries with generic/vague content
- [ ] Report lists low-value candidates with recommendations (enhance or remove)
- [ ] Low-value threshold is configurable

### AC2: Duplicate Detection
- [ ] Script finds lessons with high content similarity (> 80% overlap)
- [ ] Report lists duplicate candidates for consolidation
- [ ] Similarity comparison uses semantic embeddings or simple text comparison

### AC3: Outdated Lesson Identification
- [ ] Script identifies lessons with old timestamps (> 1 year old)
- [ ] Manual review process for assessing relevance
- [ ] Report includes age-based review candidates with metadata

### AC4: Consolidation Opportunities
- [ ] Script clusters related lessons by semantic similarity
- [ ] Report suggests consolidation candidates (grouped by topic)
- [ ] Consolidation includes merge recommendations

### AC5: Search Effectiveness Validation
- [ ] Test common queries against migrated lessons (e.g., "drizzle migration", "testing patterns")
- [ ] Report includes search hit rate and relevance score
- [ ] Identify lessons with poor discoverability (low embedding quality)

### AC6: Quality Report
- [ ] Report includes counts: total lessons reviewed, low-value, duplicates, outdated
- [ ] Report provides actionable recommendations (remove, enhance, consolidate)
- [ ] Report saved to `docs/knowledge-base/quality-review-YYYY-MM-DD.md`

### AC7: Cleanup Actions
- [ ] Script supports `--apply` flag to execute recommended removals/consolidations
- [ ] Preview mode shows actions before applying (dry-run)
- [ ] Audit log of cleanup actions (what was removed/merged)

## Reuse Plan

**Builds on work from KNOW-043:**
- Uses `kb_search` for semantic similarity detection
- Uses `kb_list` for retrieving all migrated lessons
- Uses `kb_delete` for removing low-value entries (with approval)
- Uses `kb_update` for enhancing entries with better tags/content

**Leverages existing KB infrastructure:**
- Embedding similarity for duplicate detection
- Metadata (tags, timestamps) for outdated lesson identification
- Search API for effectiveness validation

## Architecture Notes

### Quality Review Flow

```
KB Entries → Quality Review Script → Analysis Report
                                          ↓
                            Recommendations (remove, enhance, merge)
                                          ↓
                            Cleanup Actions (with --apply flag)
```

### Review Script Utilities

```typescript
// Quality review utilities
const QualityReviewSchema = z.object({
  low_value: z.array(z.object({
    id: z.string(),
    content: z.string(),
    reason: z.string(), // "too short", "generic", "duplicated"
    recommendation: z.enum(['remove', 'enhance', 'consolidate']),
  })),
  outdated: z.array(z.object({
    id: z.string(),
    content: z.string(),
    age_days: z.number(),
    recommendation: z.string(),
  })),
  duplicates: z.array(z.object({
    ids: z.array(z.string()),
    similarity: z.number(),
    recommendation: z.string(), // merge suggestion
  })),
  search_effectiveness: z.object({
    queries_tested: z.number(),
    hit_rate: z.number(), // % of queries that returned relevant results
    avg_relevance_score: z.number(),
  }),
})
```

## Test Plan

### Happy Path Tests

#### Test 1: Low-Value Entry Detection
**Setup:** KB contains lessons with varying content lengths

**Action:** Run quality review script

**Expected:**
- Script identifies entries < 100 characters
- Report lists low-value candidates with reasons
- Recommendations provided for each entry

#### Test 2: Duplicate Detection
**Setup:** KB contains lessons with similar content

**Action:** Run duplicate detection

**Expected:**
- Script identifies entries with > 80% similarity
- Report lists duplicate groups
- Consolidation suggestions provided

#### Test 3: Search Effectiveness Validation
**Setup:** KB contains migrated lessons, common query list prepared

**Action:** Run search effectiveness tests

**Expected:**
- Common queries tested against KB
- Hit rate and relevance scores calculated
- Report identifies lessons with poor discoverability

#### Test 4: Cleanup Actions (Dry-Run)
**Setup:** Quality review completed, recommendations generated

**Action:** Run script with `--apply --dry-run`

**Expected:**
- Actions previewed (remove, update, merge)
- No actual changes applied
- Summary of pending actions displayed

#### Test 5: Cleanup Actions (Apply)
**Setup:** Quality review completed, user approves actions

**Action:** Run script with `--apply`

**Expected:**
- Low-value entries removed
- Duplicates consolidated
- Audit log created
- KB entry count updated

### Error Cases

#### Error 1: No Lessons Found
**Setup:** KB empty or no migrated lessons

**Expected:** Script reports "No lessons found for review", exits gracefully

#### Error 2: KB Connection Failure
**Setup:** KB unavailable during review

**Expected:** Script reports connection error, provides retry instructions

## Risks / Edge Cases

1. **Subjectivity in quality assessment:** "Low-value" and "outdated" are subjective; script provides candidates, human reviews for final decision
2. **Over-consolidation:** Merging too aggressively may lose context; consolidation should preserve distinct insights
3. **False positive duplicates:** Similar content may represent different contexts (e.g., same pattern in different domains); manual review required
4. **Search test bias:** Query list must represent actual agent usage patterns; biased queries produce misleading effectiveness scores

## Open Questions

_None - This is a well-defined post-migration cleanup task_

---

## Related Stories

**Depends on:** KNOW-043 (Lessons Learned Migration) - Provides migrated content to review
**Related:** KNOW-047 (Lesson Lifecycle Management) - May provide expiration strategies for outdated lessons
**Related:** KNOW-048 (KB Usage Monitoring) - May provide analytics for identifying low-value lessons

---

## Notes

- This story should be done **after KNOW-043 completes** and migration has been validated
- Manual review is expected for subjective decisions (enhance vs. remove)
- Quality review report serves as input for future KB curation efforts
- Consider scheduling periodic quality reviews (e.g., quarterly)

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Elaboration | — | — | — |
| Implementation | — | — | — |

(To be filled during execution)
