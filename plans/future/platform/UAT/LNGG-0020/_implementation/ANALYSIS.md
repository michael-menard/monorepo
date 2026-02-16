# Elaboration Analysis - LNGG-0020

**Story**: Index Management Adapter — stories.index.md Updates
**Analyzed**: 2026-02-14
**Analyst**: elab-analyst (autonomous mode)

---

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index entry exactly. Focus on markdown table parsing and update operations. |
| 2 | Internal Consistency | PASS | — | Goals, ACs, Non-Goals, and Technical Design are all aligned. Clear boundary between index adapter and story file adapter. |
| 3 | Reuse-First | PASS | — | Excellent reuse strategy: file-utils, yaml-parser, error classes from LNGG-0010. No new utilities needed. |
| 4 | Ports & Adapters | PASS | — | Well-isolated adapter class with clear boundaries. File I/O abstracted via utils. No business logic in adapter. |
| 5 | Local Testability | PASS | — | Comprehensive test plan with unit tests (fixtures) and integration tests (real platform index). No external dependencies. |
| 6 | Decision Completeness | CONDITIONAL | Medium | One open decision: Regex vs. remark/unified for markdown parsing. Recommendation provided but needs confirmation. |
| 7 | Risk Disclosure | PASS | — | All risks disclosed: parsing complexity, format preservation, concurrent updates, LNGG-0010 dependency. |
| 8 | Story Sizing | PASS | — | 6 ACs, single adapter class, clear scope. Estimated 8 hours is reasonable. Not oversized. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Markdown parsing library decision needed | Medium | Confirm regex MVP approach vs. remark/unified. Story suggests regex first, upgrade later if needed. **Recommendation: Proceed with regex MVP as stated.** |
| 2 | Status marker mapping incomplete | Low | Story mentions `[ ]`, `[~]`, `[x]` but doesn't map these to StoryStatus enum values. Need explicit mapping table. |
| 3 | Missing Zod schema for ValidationResult | Low | AC-4 mentions ValidationResult but no schema defined. Need to add this to schemas section. |
| 4 | Wave section parsing strategy unclear | Medium | How to identify wave boundaries in markdown? Regex for `## Wave N` headers? Needs clarification in implementation notes. |
| 5 | Table column order assumptions | Low | Story assumes fixed column order (`#, Story, Title, ← Depends On, Epic, Priority`). Should validate column headers on read. |

---

## Split Recommendation

Not applicable. Story is appropriately sized.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Rationale**: Story is well-structured and ready for implementation with minor clarifications needed:

1. **Markdown parsing decision**: Story provides clear guidance (regex MVP, upgrade later). No blocker.
2. **Status marker mapping**: Simple addition to schemas section. Not blocking.
3. **ValidationResult schema**: Missing but easily inferred from AC-4 example. Can be added during implementation.
4. **Wave parsing strategy**: Minor implementation detail. Can be clarified in code comments.
5. **Column validation**: Enhancement, not blocker. Can be added in validation logic.

**Recommendation**: Proceed to implementation with these clarifications addressed in code/comments.

---

## MVP-Critical Gaps

### Gap 1: Status Marker to Enum Mapping

**Blocks**: AC-2 (Update Story Status in Table)

**Required Fix**: Add explicit mapping table in schemas section:

```typescript
export const StatusMarkerMap: Record<StoryStatus, string> = {
  'backlog': '[ ]',
  'ready-to-work': '[~]',
  'in-progress': '[▶]',
  'ready-for-qa': '[?]',
  'UAT': '[U]',
  'done': '[x]',
}
```

**Impact**: Without this, status updates cannot correctly map between enum values and markdown markers. This is core functionality blocking AC-2.

---

### Gap 2: ValidationResult Schema Definition

**Blocks**: AC-4 (Validate Index Structure)

**Required Fix**: Add to schemas section:

```typescript
export const ValidationErrorSchema = z.object({
  type: z.enum(['duplicate_id', 'circular_dependency', 'missing_reference', 'invalid_format']),
  message: z.string(),
  stories: z.array(z.string()).optional(), // Story IDs involved
  location: z.string().optional(), // Wave or line number
})

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>
```

**Impact**: Without this schema, validation logic cannot return type-safe results. This blocks AC-4 implementation.

---

### Gap 3: Wave Section Parsing Strategy

**Blocks**: AC-1 (Parse Index File), AC-3 (Add Story to Index Table)

**Required Fix**: Add to Architecture Notes section:

**Wave Section Detection**:
```typescript
// Regex pattern for wave headers
const WAVE_HEADER_REGEX = /^## (Wave \d+) — (.+?) \((\d+) stories\)$/

// Parse wave sections:
// 1. Split content by wave headers
// 2. Extract wave name, description, story count
// 3. Parse markdown table in each section
// 4. Associate stories with wave
```

**Impact**: Without clear wave parsing logic, cannot correctly associate stories with waves (AC-1) or add stories to correct wave section (AC-3).

---

## Worker Token Summary

- **Input**: ~15,000 tokens (story file, index file, adapters, schemas, agent instructions)
- **Output**: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- **Total**: ~17,500 tokens
