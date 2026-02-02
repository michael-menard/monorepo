# Implementation Plan - WISH-2057

## Overview

Create 4 comprehensive schema evolution policy documents for `packages/backend/database-schema/docs/`.

## Documentation Architecture

```
packages/backend/database-schema/docs/
├── SCHEMA-EVOLUTION-POLICY.md     (NEW - AC 1-5, 19-20)
├── ENUM-MODIFICATION-RUNBOOK.md   (NEW - AC 6-9, replaces enum-evolution-guide.md)
├── SCHEMA-VERSIONING.md           (NEW - AC 10-13)
├── SCHEMA-CHANGE-SCENARIOS.md     (NEW - AC 14-18)
├── CI-SCHEMA-VALIDATION.md        (KEEP - existing CI automation doc)
├── wishlist-authorization-policy.md (KEEP - unrelated security doc)
├── WISHLIST-SCHEMA-EVOLUTION.md   (DEPRECATE - add notice, keep for history)
└── enum-evolution-guide.md        (DEPRECATE - superseded by ENUM-MODIFICATION-RUNBOOK)
```

## Implementation Steps

### Step 1: Create SCHEMA-EVOLUTION-POLICY.md

**Acceptance Criteria Coverage:**
- AC 1: Document approval process (who reviews, gates)
- AC 2: Define breaking vs non-breaking changes with examples
- AC 3: Require migration testing on fresh database
- AC 4: Specify backward compatibility window (N-1)
- AC 5: Document migration file naming convention
- AC 19: Specify approval authorities (Tech Lead + DBA)
- AC 20: Define risk assessment template

**Content Structure:**
1. Overview and Purpose
2. Change Classification (Breaking vs Non-Breaking)
3. Approval Process
4. Testing Requirements
5. Backward Compatibility Policy
6. Migration File Standards
7. Risk Assessment Template
8. Governance Matrix

### Step 2: Create ENUM-MODIFICATION-RUNBOOK.md

**Acceptance Criteria Coverage:**
- AC 6: Step-by-step enum value addition (ALTER TYPE... ADD VALUE)
- AC 7: Code deployment order (database first, then app)
- AC 8: Rollback procedure for failed additions
- AC 9: Enum value removal risks and multi-phase migration

**Content Structure:**
1. PostgreSQL Enum Constraints
2. Adding Enum Values (Procedure)
3. Deployment Order
4. Rollback Strategies
5. Deprecating Enum Values
6. Migration to Lookup Tables
7. Troubleshooting

**Note:** This consolidates and extends existing `enum-evolution-guide.md` content.

### Step 3: Create SCHEMA-VERSIONING.md

**Acceptance Criteria Coverage:**
- AC 10: Version numbering (MAJOR.MINOR.PATCH)
- AC 11: Metadata table design (schema_versions)
- AC 12: Migration state tracking (Drizzle journal + custom)
- AC 13: Rollback compatibility rules

**Content Structure:**
1. Version Numbering Scheme
2. Schema Versions Metadata Table
3. Drizzle Journal Integration
4. Migration State Tracking
5. Rollback Compatibility Matrix
6. Version History Tracking

### Step 4: Create SCHEMA-CHANGE-SCENARIOS.md

**Acceptance Criteria Coverage:**
- AC 14: Adding optional columns (ALTER TABLE... ADD COLUMN)
- AC 15: Adding required columns with default/backfill
- AC 16: Adding indexes (CREATE INDEX CONCURRENTLY)
- AC 17: Column type changes (data migration + compatibility)
- AC 18: Dropping columns (deprecation period + tombstone)

**Content Structure:**
1. Overview
2. Scenario: Adding Optional Columns
3. Scenario: Adding Required Columns
4. Scenario: Adding Indexes
5. Scenario: Changing Column Types
6. Scenario: Dropping Columns
7. Scenario: Adding Constraints
8. Decision Matrix

### Step 5: Deprecate Existing Documentation

Update existing files with deprecation notices:
- `WISHLIST-SCHEMA-EVOLUTION.md` - Point to SCHEMA-EVOLUTION-POLICY.md
- `enum-evolution-guide.md` - Point to ENUM-MODIFICATION-RUNBOOK.md

## Cross-Reference Strategy

Each new document will:
1. Reference related documents in a "Related Documentation" section
2. Link to CI-SCHEMA-VALIDATION.md for automation
3. Reference Drizzle documentation for tooling specifics
4. Include story references (WISH-2057, WISH-2007, WISH-2000)

## Quality Checklist

Before marking implementation complete:
- [ ] All 20 ACs addressed (verified by grep/manual review)
- [ ] Proper PostgreSQL syntax in code examples
- [ ] Cross-references between documents
- [ ] Deprecation notices on old docs
- [ ] No orphan references to removed sections

## Token Estimate

| Document | Estimated Size | Effort |
|----------|---------------|--------|
| SCHEMA-EVOLUTION-POLICY.md | ~400 lines | Medium |
| ENUM-MODIFICATION-RUNBOOK.md | ~350 lines | Medium (consolidation) |
| SCHEMA-VERSIONING.md | ~250 lines | Low |
| SCHEMA-CHANGE-SCENARIOS.md | ~400 lines | Medium |
| Deprecation updates | ~20 lines | Low |
| **Total** | ~1,420 lines | — |
