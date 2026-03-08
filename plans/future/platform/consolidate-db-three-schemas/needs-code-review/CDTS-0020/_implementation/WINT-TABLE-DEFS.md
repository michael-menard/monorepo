# CDTS-0020 — Wint Schema Table Definitions

**Source**: Migration SQL files + live DB verification
**Date**: 2026-03-08
**References**: AC-7 | Resolves ENG-001

---

## Verification: No `wint` Schema in Live DB

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE catalog_name = 'knowledgebase'
ORDER BY schema_name;
```

**Result**: Only `public` and `drizzle` user-created schemas exist. **No `wint` schema.**

---

## Finding: Tables Were Defined But Never Applied

Three tables were authored in migration SQL files targeting `wint` schema but the migrations were **never run** against the live knowledgebase DB:

| Migration File | Table Targeted | Status |
|---------------|----------------|--------|
| `016_model_experiments.sql` | `wint.model_experiments` | Defined in SQL, never applied |
| `016_wint_model_assignments.sql` | `wint.model_assignments` | Defined in SQL, never applied |
| `017_change_telemetry_experiment_fk.sql` | `wint.change_telemetry` (add column) | No-op — parent table never created |

The `wint` schema itself (`CREATE SCHEMA wint`) does not appear in any migration file found in the migrations directory. The tables reference `wint.` but the schema creation step is missing — this is likely why the migrations were never applied.

---

## Table Definitions (from migration SQL)

### `wint.model_experiments` (016_model_experiments.sql)

Story: APIP-3060 — Bake-Off Engine for Model Experiments

```sql
CREATE TABLE IF NOT EXISTS wint.model_experiments (
  id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type             VARCHAR(64)     NOT NULL,
  file_type               VARCHAR(64)     NOT NULL,
  control_model           VARCHAR(128)    NOT NULL,
  challenger_model        VARCHAR(128)    NOT NULL,
  status                  wint.experiment_status NOT NULL DEFAULT 'active',
  started_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  concluded_at            TIMESTAMPTZ,
  control_sample_size     INTEGER,
  challenger_sample_size  INTEGER,
  control_success_rate    NUMERIC(5, 4),
  challenger_success_rate NUMERIC(5, 4),
  min_sample_per_arm      INTEGER         NOT NULL DEFAULT 50,
  max_window_rows         INTEGER,
  max_window_days         INTEGER,
  winner                  VARCHAR(128),
  notes                   TEXT,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
```

**Enum Type**: `wint.experiment_status AS ENUM ('active', 'concluded', 'expired')`

**Indexes**:
- `model_experiments_active_unique_idx` — UNIQUE partial on `(change_type, file_type)` WHERE `status = 'active'`
- `model_experiments_status_idx` — btree on `status`
- `model_experiments_started_at_idx` — btree on `started_at`

---

### `wint.model_assignments` (016_wint_model_assignments.sql)

Story: APIP-0040 — DB-backed model assignment overrides

```sql
CREATE TABLE IF NOT EXISTS wint.model_assignments (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_pattern   TEXT        NOT NULL,
  provider        TEXT        NOT NULL,
  model           TEXT        NOT NULL,
  tier            INTEGER     NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes**:
- `idx_model_assignments_agent_pattern` — btree on `agent_pattern`
- `idx_model_assignments_effective_from` — btree on `effective_from DESC`

---

### `wint.change_telemetry` (referenced in 017_change_telemetry_experiment_fk.sql)

The `change_telemetry` table itself is referenced but never defined in the migrations directory. Migration 017 only adds an `experiment_id` FK column to an existing `change_telemetry` table — but the base table definition is elsewhere (likely in a different migration that was never applied).

**017 adds (conditionally, if table exists)**:
```sql
ALTER TABLE wint.change_telemetry
  ADD COLUMN experiment_id UUID REFERENCES wint.model_experiments(id);

CREATE INDEX IF NOT EXISTS change_telemetry_experiment_id_idx
  ON wint.change_telemetry (experiment_id)
  WHERE experiment_id IS NOT NULL;
```

**Status**: Since `wint.change_telemetry` does not exist, this migration was a no-op.

---

## ENG-001 Resolution

The ENG-001 blocker stated: "bootstrap context lists model_experiments and model_assignments in public schema, but they may be in wint schema."

**Resolution**: Neither assumption was correct:
- The tables are NOT in `public` schema
- The tables are NOT in `wint` schema
- **The tables do not exist in the live DB at all**

The migration SQL files targeted `wint` schema, but the `wint` schema was never created and the migrations were never run. These three tables will be **created fresh** in the `analytics` schema in CDTS-1010 (no data migration required).

---

## Impact on CDTS-1010

Since no `wint` schema or tables exist:
1. No `ALTER TABLE ... SET SCHEMA analytics` is needed
2. No data migration is needed
3. CDTS-1010 must `CREATE SCHEMA analytics` and `CREATE TABLE analytics.model_experiments`, etc. from scratch
4. The enum type `experiment_status` must also be created in the `analytics` schema (not moved from `wint`)
5. No DROP SCHEMA wint is needed (schema doesn't exist)
