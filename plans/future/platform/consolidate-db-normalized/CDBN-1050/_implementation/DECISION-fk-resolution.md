# DECISION: Cross-Schema FK Resolution Strategy for workflow.story_dependencies

**Story**: CDBN-1050
**AC**: AC-11
**Date**: 2026-03-12
**Decided by**: User (conservative autonomy escalation)

---

## Context

The `workflow.story_dependencies` table requires two self-referential foreign keys:

- `story_id` → `workflow.stories.story_id`
- `depends_on_story_id` → `workflow.stories.story_id`

Two valid PostgreSQL strategies exist for self-referential FKs:

1. **Simple ordering** — Standard non-deferred FK constraints; DDL ordering (parent table
   created first) satisfies the constraint. Insert ordering must be respected at runtime.

2. **DEFERRABLE INITIALLY DEFERRED** — FK constraint is checked at transaction commit
   boundary rather than at each statement. Allows bulk inserts without ordering constraints.

Additionally, the CDBN-0020 MANIFEST identified 13 cross-schema FK violations in existing
`wint.*` and `analytics.*` schemas that reference `public.stories`. These are pre-existing
issues — not introduced by this story — and are out of scope for CDBN-1050.

---

## Decision

**Self-referential FKs on `workflow.story_dependencies` use DEFERRABLE INITIALLY DEFERRED.**

DDL for the affected constraints:

```sql
CONSTRAINT fk_story_deps_story_id
    FOREIGN KEY (story_id)
    REFERENCES workflow.stories(story_id)
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,

CONSTRAINT fk_story_deps_depends_on
    FOREIGN KEY (depends_on_story_id)
    REFERENCES workflow.stories(story_id)
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
```

---

## Rationale

1. **Phase 2 data migration compatibility**: CDBN-1050 is split_part "1 of 2". The companion
   story (CDBN-1060) and downstream Phase 2 stories will migrate existing story data into
   `workflow.stories` and `workflow.story_dependencies`. Deferred constraints allow bulk
   inserts of dependency rows within a single transaction without requiring topological sort
   order of inserts.

2. **Circular dependency support**: Story dependency graphs can contain cycles (A blocks B,
   B blocks A is valid in the workflow model). Non-deferred FKs cannot represent circular
   dependencies even within a transaction. DEFERRABLE INITIALLY DEFERRED handles this
   correctly.

3. **Constraint enforcement preserved**: Deferring to commit boundary does not weaken
   integrity — the constraint is still enforced. Any insert that would violate referential
   integrity will fail at transaction commit.

4. **Precedent**: PostgreSQL officially recommends DEFERRABLE for self-referential FKs when
   bulk data operations are expected (PostgreSQL docs §5.4.5).

---

## Scope Boundary: Cross-Schema FK Violations from CDBN-0020

The CDBN-0020 MANIFEST documented 13 cross-schema FK violations in existing schemas
(`wint.*`, `analytics.*`) that reference `public.stories`. These violations:

- Are **pre-existing** — they exist in migrations 001–032, not introduced by CDBN-1050
- Are **not self-referential** — they cross schema boundaries (wint → public, analytics → public)
- Are **out of scope** for CDBN-1050, which only creates the `workflow` schema (DDL-only, no
  data migration, no modification of existing schemas)

**Disposition**: These 13 cross-schema FK violations are inherited by downstream Phase 1
stories CDBN-1020, CDBN-1030, and CDBN-1040. Each of those stories must address the FKs
relevant to their respective schema migrations. The drop-and-recreate vs. deferred strategy
for those cross-schema FKs is deferred to those stories and is explicitly out of scope here.

---

## story_state_history Column Design (AC-4)

The `workflow.story_state_history` table consolidates 6 source tables:
- `story_states`
- `story_transitions`
- `story_phase_history`
- `story_assignments`
- `story_blockers`
- `story_metadata_versions`

**Column design decisions**:

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid PK | NOT NULL | Generated default |
| `story_id` | text | NOT NULL | FK → workflow.stories.story_id RESTRICT |
| `event_type` | text | NOT NULL | Discriminator — see CHECK constraint below |
| `from_state` | text | NULL | Populated for: state_change, transition |
| `to_state` | text | NULL | Populated for: state_change, transition |
| `from_phase` | text | NULL | Populated for: phase_change |
| `to_phase` | text | NULL | Populated for: phase_change |
| `assigned_to` | text | NULL | Populated for: assignment |
| `assigned_by` | text | NULL | Populated for: assignment |
| `blocker_description` | text | NULL | Populated for: blocker |
| `blocker_resolved_at` | timestamptz | NULL | Populated for: blocker |
| `metadata_key` | text | NULL | Populated for: metadata_version |
| `metadata_value` | jsonb | NULL | Populated for: metadata_version |
| `notes` | text | NULL | Free-form notes for any event type |
| `created_by` | text | NULL | Agent or user that triggered event |
| `created_at` | timestamptz | NOT NULL | Default now() |

**event_type CHECK constraint** (enumerated values):

```sql
CONSTRAINT chk_story_state_history_event_type
    CHECK (event_type IN (
        'state_change',
        'transition',
        'phase_change',
        'assignment',
        'blocker',
        'metadata_version'
    ))
```

**Indexes**:
- `(story_id, event_type)` composite — supports per-story event type queries
- `(event_type, created_at)` composite — supports time-ordered audit queries by type
- `(story_id, created_at)` composite — supports full story timeline queries

NULL constraints: All columns except `id`, `story_id`, `event_type`, `created_at` are
nullable. The event_type discriminator determines which subset of columns is populated for
any given row. This is the standard sparse-column pattern for consolidated event tables.

---

## Summary

| Concern | Strategy | Scope |
|---------|----------|-------|
| Self-referential FKs on story_dependencies | DEFERRABLE INITIALLY DEFERRED | This story (CDBN-1050) |
| story_state_history column design | Sparse-column with CHECK constraint on event_type | This story (CDBN-1050) |
| 13 cross-schema FK violations (wint/analytics → public) | Out of scope — deferred to CDBN-1020/1030/1040 | Downstream stories |
