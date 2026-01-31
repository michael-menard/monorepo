# Future Opportunities - WISH-2057

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Existing documentation overlap | Low | Low | Clarify relationship between existing `docs/WISHLIST-SCHEMA-EVOLUTION.md` (155 lines, WISH-2007 follow-up) and 4 new comprehensive docs. Options: (a) Consolidate into new structure, (b) Keep existing as wishlist-specific reference with cross-links to general policies, (c) Archive existing and migrate content. |
| 2 | Drizzle `db:version` command not specified | Low | Low | Story mentions "Implement `db:version` command to show current schema version" in Architecture Notes but no AC requires it. Add as follow-up story for CLI tooling. |
| 3 | Multi-developer migration collision handling | Low | Medium | Edge Case #3 mentions "migration numbering collision handling" but no documentation requirement in ACs. Add runbook section for resolving merge conflicts in `_journal.json` and migration files. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Automated policy enforcement CI job | Medium | Medium | Story notes this as "Future Enhancement Note" - CI job to validate schema changes against documented policy. Prevents human error in code review. |
| 2 | Schema drift detection tool | Medium | Medium | Story notes `db:check` command from WISH-2007 Enhancement #3. Automated comparison of staging vs production schemas to detect drift. |
| 3 | Automated rollback script generation | Medium | High | Generate rollback SQL from migration metadata automatically instead of manual creation. Complex for data migrations but valuable for safety. |
| 4 | Schema change impact analysis tool | High | High | Tool to analyze which services/endpoints are affected by a schema change (e.g., "which routes use this column?"). Reduces risk of breaking changes. |
| 5 | Visual schema version timeline | Low | Low | Dashboard or CLI tool showing schema version history, applied migrations, and rollback compatibility. Improves operational visibility. |
| 6 | Migration testing sandbox | Medium | Medium | Automated sandbox environment creation for testing migrations against production-like data before staging deployment. |
| 7 | Cross-environment migration state dashboard | Medium | Medium | Real-time view of which migrations are applied in dev/staging/production. Prevents environment drift and deployment confusion. |

## Categories

- **Edge Cases**: Migration numbering collisions, multi-environment state drift, high-traffic table modifications
- **UX Polish**: Visual schema timeline, migration state dashboard
- **Performance**: N/A (documentation story)
- **Observability**: Schema drift detection, migration state tracking, impact analysis tooling
- **Integrations**: CI/CD policy enforcement, automated rollback generation, sandbox provisioning

## Implementation Notes

### Existing Documentation Analysis

The `packages/backend/database-schema/docs/WISHLIST-SCHEMA-EVOLUTION.md` file (created during WISH-2007) covers:
- Schema change process (pre-change requirements, change categories, Drizzle workflow)
- Backward compatibility guidelines (adding columns, adding constraints, modifying column types)
- Rollback procedures (before migration, rollback steps, rollback SQL template)
- Version history table

This overlaps significantly with WISH-2057's scope but is **wishlist-specific** rather than **general database policy**. Recommendation during implementation:

1. **Option A (Recommended)**: Keep existing doc as **wishlist domain reference** with cross-links to general policies in new docs. New docs become authoritative for **all schema changes** (not just wishlist).
2. **Option B**: Consolidate existing doc content into `SCHEMA-CHANGE-SCENARIOS.md` as concrete examples, archive original.
3. **Option C**: Create `docs/examples/WISHLIST-SCHEMA-EVOLUTION-EXAMPLE.md` to preserve domain-specific context.

### Governance Scope Clarification

Story AC 19-20 require approval process and risk assessment template but don't specify **how** to enforce (manual PR review vs automated gates). Consider adding a "Governance Enforcement" section to `SCHEMA-EVOLUTION-POLICY.md` that addresses:
- PR template with schema change checklist
- Code review requirements (who must approve?)
- CI job validation (optional, future enhancement)

### Documentation Structure

Proposed hierarchy for clarity:

```
packages/backend/database-schema/docs/
├── SCHEMA-EVOLUTION-POLICY.md       (AC 1-5, AC 19-20: Governance & approval)
├── SCHEMA-VERSIONING.md             (AC 10-13: Version numbering & metadata)
├── SCHEMA-CHANGE-SCENARIOS.md       (AC 14-18: Common patterns & examples)
├── ENUM-MODIFICATION-RUNBOOK.md     (AC 6-9: Enum-specific procedures)
└── examples/
    └── WISHLIST-SCHEMA-EVOLUTION.md (Existing doc, domain-specific reference)
```

This preserves existing work while establishing general-purpose policies for all future schema changes across all domains (gallery, wishlist, sets, instructions, etc.).
