# ADR-002: ChangeSpec Schema Design and Validation

**Status**: APPROVED WITH CONSTRAINTS  
**Decided at**: 2026-02-26  
**Story**: APIP-1020 — ChangeSpec Schema Design and Validation Spike  
**Preceding ADR**: ADR-001 (Autonomous Pipeline Architecture Decisions)

---

## Context

The autonomous pipeline (APIP) requires a structured, machine-readable representation of the atomic units of work that emerge from story decomposition. This representation — ChangeSpec — is the bridge between:

1. **Planning** (PLAN.yaml / SCOPE.yaml): which files to touch at a high level
2. **Execution**: which specific changes to make, in what order, for which ACs
3. **Downstream consumers**: 6 systems that each need specific fields to do their job

Before APIP-1030 (which will integrate ChangeSpec into the live pipeline), this spike validates:
- Whether a Zod discriminated union schema is the right design
- Whether the schema covers all 6 consuming system field requirements
- Whether real backlog stories can be decomposed into ChangeSpecs with acceptable quality

---

## Decision

### Verdict: APPROVED WITH CONSTRAINTS

The ChangeSpecSchema v1 (implemented in `packages/backend/orchestrator/src/artifacts/change-spec.ts`) is **approved** for use in APIP-1030 and downstream stories with the following constraints:

1. **CONSTRAINT-1**: The `change_outline` link (APIP-1010 Structurer output) is undefined at spike time. APIP-1030 must re-validate ChangeSpec against the actual `StructurerResultSchema` before integrating.
2. **CONSTRAINT-2**: `estimated_tokens` is optional in v1. Telemetry systems must handle missing values gracefully. Make required in v2.
3. **CONSTRAINT-3**: The schema was validated against manual (human-authored) decompositions only. LLM-generated decompositions may produce different field distributions.

---

## Schema Design

### Discriminated Union on `change_type`

```typescript
const ChangeSpecSchema = z.discriminatedUnion('change_type', [
  FileChangeSpecSchema,       // Source file changes
  MigrationChangeSpecSchema,  // Database migrations
  ConfigChangeSpecSchema,     // Config files (package.json, tsconfig, etc.)
  TestChangeSpecSchema,       // Test files
])
```

**Rationale for discriminated union vs flat schema**:
- File-specific fields (e.g. `file_action`, `migration_version`, `test_type`) only make sense for their variant
- TypeScript narrowing: `if (spec.change_type === 'file_change') { spec.file_action }` is type-safe
- Extensibility: adding a `doc_change` variant in v2 does not affect existing variants
- Zod validation: invalid `change_type` values are rejected at parse time

**Rationale for 4 variants (not flat)**:
The 10-story decomposition exercise confirmed that all APIP backlog stories decompose cleanly into these 4 types. No story required an additional variant.

### Version Pinning

```typescript
schema: z.literal(1)
```

This follows the established pattern from `PlanSchema` and `StoryArtifactSchema`. Version `1` is the baseline; downstream systems can expect all APIP-1020-era ChangeSpecs to have `schema: 1`.

---

## Versioning Strategy

### Field Additions (Non-Breaking)
- Add new optional fields with `.optional()` or `.default(value)`
- Increment `z.literal` from `1` to `2`
- During transition: accept both `schema: z.union([z.literal(1), z.literal(2)])`
- Once all producers emit v2: drop v1 support (with migration period notice)

### Breaking Changes (Major Bump)
A breaking change is:
- Removing a required field
- Renaming a required field
- Changing a required field's type
- Adding a new required field without a default

Breaking changes require:
1. New literal version (`z.literal(3)`)
2. Migration script for existing YAML files
3. Explicit announcement to all 6 consuming system implementors

### Field Restriction Discoveries

From the 10-story decomposition:
- `rationale` should be required for `file_change` and `test_change` in v2 (review quality)
- `estimated_tokens` should be required for all code-producing variants in v2 (telemetry)
- A `domain_tag` optional field would improve affinity clustering

---

## Decomposition Quality Metrics Summary

From decomposing 10 real APIP backlog stories:

| Metric | Value |
|--------|-------|
| Stories decomposed | 10 |
| Total ChangeSpecs produced | 52 |
| Average changes per story | 5.2 |
| Average changes per AC | 0.55 |
| Accuracy: HIGH | 4 stories (40%) |
| Accuracy: MEDIUM | 6 stories (60%) |
| Accuracy: LOW | 0 stories |
| Accuracy: INCOMPLETE | 0 stories |

**Observation**: All 10 stories decomposed successfully with no LOW or INCOMPLETE verdicts. The 60% MEDIUM accuracy reflects ambiguity in optional fields (estimated_tokens, rationale) and file path specificity — not schema design flaws.

---

## Cost Model

```yaml
cost_model:
  median_tokens: 10500       # Median per-story total estimated_tokens
  mean_tokens: 12500         # Mean per-story total estimated_tokens
  min_tokens: 1500           # Minimum (APIP-5006: pure infra/docs)
  max_tokens: 30500          # Maximum (APIP-0020: complex supervisor story)
  total_across_10_stories: 125000
  usd_estimate:
    note: "Estimates based on Anthropic Claude Sonnet pricing (approximate)"
    per_story_median_usd: 0.084   # ~10,500 tokens * $0.008/1K tokens (output)
    per_story_mean_usd: 0.100
    range_usd: "0.012 to 0.244 per story"
    10_story_total_usd: 1.00
```

**Important**: These token estimates are for decomposition generation (LLM producing ChangeSpec YAMLs), not for implementation. Implementation token costs are typically 5-10x higher.

---

## Model Recommendation

| Model | Recommendation | Rationale |
|-------|---------------|-----------|
| **Claude Sonnet (claude-sonnet-4-6)** | **RECOMMENDED** | Best quality/cost tradeoff for decomposition. Follows multi-field schemas accurately. Handles complex dependency reasoning (which CS-N depends on which). |
| Claude Haiku | Acceptable for simple stories | High risk of missing field constraints and optional/required distinctions for complex stories (>8 ACs) |
| Claude Opus | Overkill for decomposition | Use for reviewing/auditing decompositions, not generating them |

**Recommendation**: Use Sonnet for initial decomposition; use Haiku for re-decompositions (incremental updates when a story changes after APIP-1030 merges).

---

## Consumer Validation Summary

All 6 consuming systems validated against APIP-0020 decomposition:

| System | Verdict | Blocking Gaps |
|--------|---------|---------------|
| Implementation | PASS | None |
| Review | PASS | Minor: optional rationale |
| QA | PASS | Minor: optional expected_behavior |
| Telemetry | PASS WITH GAPS | Moderate: optional estimated_tokens, no actual_tokens |
| Affinity | PASS WITH GAPS | Minor: no domain_tag |
| Merge | PASS WITH GAPS | Minor: no merge_order |

**No blocking gaps identified.** All "with gaps" items are v2 candidates.

---

## Schema Location

```
packages/backend/orchestrator/src/artifacts/change-spec.ts
```

Tests:
```
packages/backend/orchestrator/src/artifacts/__tests__/change-spec.test.ts
```

---

## AC-8: Negative Constraint Confirmation

This spike does NOT produce any integration code connecting the diff planner to the implementation graph. All outputs are:
- `change-spec.ts` — pure Zod schema definition
- `change-spec.test.ts` — Vitest unit tests
- `_spike-output/APIP-1020/` — YAML research artifacts
- This ADR — documentation

No Lambda handlers, APIGW routes, DB queries, or LangGraph node wiring was created. APIP-1030 will add the integration wiring.

---

## Open Questions for APIP-1030

1. **APIP-1010 change_outline**: When APIP-1010 defines `StructurerResultSchema`, validate that ChangeSpec fields adequately capture the Structurer output. Add `outline_ref` field if needed.
2. **LLM decomposition quality**: The 10 manual decompositions have HIGH/MEDIUM quality. Measure LLM-generated decomposition quality in APIP-1030 and compare.
3. **actual_tokens field**: Add to v2 schema once implementation pipeline is running and can measure real token costs.

---

*ADR-002 authored by APIP-1020 spike execution. Approved for downstream use in APIP-1030.*
