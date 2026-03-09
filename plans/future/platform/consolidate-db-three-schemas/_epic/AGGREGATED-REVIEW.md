# CDTS Epic Aggregated Review

**Date**: 2026-03-07
**Updated**: 2026-03-07 (redesigned to two-schema graph DB architecture)
**Status**: AGGREGATION COMPLETE
**Focus**: MVP-Critical Findings Only

## Overall Verdict: CONCERNS

Migration plan is structurally sound. All **7 MVP blockers** now have explicit resolution stories in Phase 0 and Phase 1.

## Architecture Change

The epic was redesigned from three schemas (public + workflow) to **two schemas (public + analytics)**:
- **No `workflow` schema** — graph traversal is the primary query pattern; schema boundaries add friction
- **`public` schema** — all traversable data (KB entries, plans, stories, tasks, artifacts, graph edges)
- **`analytics` schema** — append-only telemetry only (token usage, model experiments)
- **New graph infrastructure** — story_knowledge_links edge table, story embeddings, composite context tool

## Perspective Verdicts

| Perspective | Verdict | MVP Blockers | Status |
|-------------|---------|--------------|--------|
| Engineering | CONCERNS | 3 | Resolved by CDTS-0020, CDTS-1010, CDTS-1040/1050 |
| QA | CONCERNS | 2 | Resolved by CDTS-0020, CDTS-1020/1050 |
| Platform | CONCERNS | 2 | Resolved by CDTS-0010 |
| Product | READY | 0 | No blockers |
| UX | READY | 0 | Pure backend migration |
| Security | READY | 0 | Future hardening only |

## MVP Blockers (Deduplicated & Prioritized)

### PLAT-001: Migration Runner Strategy Missing
**Source**: Platform
**Resolved by**: CDTS-0010
**Issue**: No strategy defined for running migrations on KB database (port 5433).
**Resolution**: CDTS-0010 creates schema_migrations tracking table, RUNNER.md with canonical psql command, and proof-of-concept migration.

### PLAT-002: Missing Database Safety Guardrails
**Source**: Platform
**Resolved by**: CDTS-0010
**Issue**: No safeguard prevents targeting the wrong database.
**Resolution**: CDTS-0010 establishes safety preamble pattern:
```sql
DO $$ BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'Wrong database: expected knowledgebase, got %', current_database();
  END IF;
END $$;
```
All subsequent migrations inherit this pattern.

### ENG-001: Table Inventory Mismatch
**Source**: Engineering
**Resolved by**: CDTS-0020
**Issue**: Bootstrap context shows model_experiments and model_assignments in public schema, but they actually live in wint schema.
**Resolution**: CDTS-0020 runs live information_schema.tables query for ground truth, produces MANIFEST.md.

### ENG-002: Wint Schema Dependencies
**Source**: Engineering
**Resolved by**: CDTS-1010
**Issue**: wint.change_telemetry has FK to wint.model_experiments. Phase 3 drop would break these.
**Resolution**: CDTS-1010 moves all wint tables to analytics schema and re-creates FKs within analytics.

### ENG-003: Atomic Deployment Required
**Source**: Engineering
**Resolved by**: CDTS-1040/1050
**Issue**: Drizzle schema.ts must match database state. If migration runs but code hasn't deployed, queries fail.
**Resolution**: CDTS-1050 enforces deployment sequence: code deploys first, then migrations run.

### QA-001: No Test Strategy Across Epic
**Source**: QA
**Resolved by**: CDTS-0020 (template) + CDTS-1050 (execution)
**Issue**: No test strategy defined. Cannot verify migration quality.
**Resolution**: CDTS-0020 defines test template requiring: (a) idempotency test, (b) FK count before/after, (c) Drizzle query smoke test.

### QA-002: No FK Verification Acceptance Criteria
**Source**: QA
**Resolved by**: CDTS-1020 + CDTS-1050
**Issue**: No acceptance criteria for FK verification.
**Resolution**: CDTS-1020 defines FK count AC. CDTS-1050 captures before/after counts and verifies exact delta.

## Stories Affected by MVP Blockers

| Story | Blockers Resolved | Resolution |
|-------|-------------------|------------|
| CDTS-0010 | PLAT-001, PLAT-002 | Creates infrastructure |
| CDTS-0020 | ENG-001, QA-001 | Creates audit + test template |
| CDTS-1010 | ENG-002 | Moves wint tables to analytics |
| CDTS-1020 | QA-002 | Defines FK count AC |
| CDTS-1030 | ENG-003 | Drizzle matches target schema |
| CDTS-1040 | ENG-003 | Code ready before migration |
| CDTS-1050 | ENG-003, QA-001, QA-002, PLAT-001, PLAT-002 | Proves everything works |

## Non-MVP Suggestions (Deferred to FUTURE-ROADMAP)

- Schema-specific RBAC grants for kbuser
- Post-migration pg_hba.conf verification
- Migration execution logging infrastructure
- Post-migration health check suite
- MCP server response latency baselines

## Metrics

- **Total MVP blockers**: 7 (all resolved)
- **Stories**: 11 (all required for core journey)
- **Phases**: 4 (0, 1, 2, 3)
- **Perspectives with concerns**: 3/6 (Engineering, QA, Platform)
- **Perspectives ready**: 3/6 (Product, UX, Security)
- **Max parallel tracks**: 2 (Phase 2 + Phase 3 after CDTS-1050)
