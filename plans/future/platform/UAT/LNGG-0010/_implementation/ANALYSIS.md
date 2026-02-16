# Elaboration Analysis - LNGG-0010

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story scope does NOT match index exactly - story uses fields not in StoryArtifactSchema |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, decisions, and ACs are consistent |
| 3 | Reuse-First | PASS | — | Properly reuses StoryArtifactSchema, Zod patterns, existing file structure |
| 4 | Ports & Adapters | PASS | — | Pure file I/O adapter, no business logic, transport-agnostic by design |
| 5 | Local Testability | PASS | — | Comprehensive test plan with .test.ts files and fixtures |
| 6 | Decision Completeness | PASS | — | All 4 missing requirements addressed in DEV-FEASIBILITY.md |
| 7 | Risk Disclosure | PASS | — | All 5 MVP-critical risks documented with concrete mitigations |
| 8 | Story Sizing | PASS | — | 6 ACs, file I/O only, backend-only, appropriate for 5-point story |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Schema mismatch: story.yaml uses fields not in StoryArtifactSchema v1 | Critical | Survey existing files BEFORE implementation, document ALL field mismatches, add backward compatibility via .passthrough() |
| 2 | Story goal/title includes "YAML Read/Write" but schema has no `experiment_variant` field | High | Update StoryArtifactSchema to include `experiment_variant: z.string().nullable()` OR document as "extra field" |
| 3 | Index shows "LNGG-0010" but story uses "LNGG-001" naming in PLAN.md | Medium | Clarify story ID format: LNGG-0010 (with zero padding) is correct per index |

## Split Recommendation

Not applicable - story is appropriately sized for a 5-point story.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story is well-structured, thoroughly analyzed, and ready for implementation **AFTER** critical Issue #1 is resolved. The schema mismatch between existing story YAML files and `StoryArtifactSchema` v1 blocks implementation.

**Required Actions Before Implementation:**
1. Survey 10-20 existing story.yaml files from `plans/future/*/UAT/*/story.yaml`
2. Document ALL field mismatches (extra fields, missing fields, type differences)
3. Update `StoryArtifactSchema` to use `.passthrough()` for backward compatibility
4. Add migration notes for fields that exist in files but not in schema
5. Update story.yaml frontmatter in LNGG-0010 to match final schema

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Schema incompatibility between story.yaml files and StoryArtifactSchema v1 | Entire adapter cannot parse existing files | Add survey script to check existing files, update schema to support actual file format with .passthrough() |

**Explanation:**

The existing story file `WKFL-001/story.yaml` uses fields that do not match `StoryArtifactSchema` v1:

**Fields in WKFL-001 NOT in schema:**
- `status` (story uses this, schema has `state`)
- `phase` (not in schema)
- `epic` (story has this separately, schema calls it `feature`)
- `prefix` (not in schema)
- `blocks` (not in schema, schema has `blocked_by` for single blocker)
- `owner` (not in schema)
- `estimated_tokens` (not in schema)
- `tags` (not in schema)
- `summary` (not in schema)
- `acceptance_criteria` (story uses this field name, schema calls it `acs`)
- `scope.in` and `scope.out` (story uses nested structure, schema uses `scope.packages` and `scope.surfaces`)
- `technical_notes` (not in schema)
- `reuse_plan` (not in schema)
- `local_testing` (not in schema)
- `token_budget` (not in schema)

**Fields in schema NOT in WKFL-001:**
- `schema` (literal 1)
- `type` (schema requires this, story doesn't have it)
- `points` (schema has this, story doesn't use it)
- `depends_on` (schema has this, story has `dependencies`)
- `follow_up_from` (not in story)
- `acs` (story calls it `acceptance_criteria`)
- `risks` (not in story)

This is a **critical blocker** because the adapter will fail Zod validation on every existing file, making it unusable for its primary purpose (reading existing story files).

**Required Fix:**
1. Update `StoryArtifactSchema` to use `.passthrough()` to allow extra fields
2. Add optional/nullable fields for common story file fields not in current schema
3. Create a survey script that reads 20 existing files and documents all unique fields
4. Update adapter to log warnings for deprecated fields
5. Consider adding a migration mode to normalize files to schema v1

---

## Worker Token Summary

- Input: ~52,000 tokens (files read: story.yaml, index, PLAN.md, schema, TEST-PLAN.md, DEV-FEASIBILITY.md, WKFL-001 sample)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
