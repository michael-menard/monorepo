# Database Architecture

This monorepo uses three PostgreSQL databases. Each has its own package, connection pool, and credentials.

## Quick reference

| What you need                                 | Database    | Package                | Env vars                          |
| --------------------------------------------- | ----------- | ---------------------- | --------------------------------- |
| MOCs, gallery, wishlist, telemetry            | App DB      | `@repo/db`             | `DB_*` / Aurora connection string |
| Stories, plans, agents, artifacts, embeddings | KB DB       | `@repo/knowledge-base` | `KB_DB_*`                         |
| LangGraph agent graph state                   | Pipeline DB | `apps/api/pipeline`    | `PIPELINE_DB_*`                   |

---

## App DB (Aurora PostgreSQL)

**Package:** `packages/backend/db` → `@repo/db`
**Local port:** Aurora (prod/staging only — no local instance)
**Schema file:** `src/schema.ts`

The production application database. Contains user-facing data.

| pg schema   | Tables                                                                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public`    | `gallery_images`, `gallery_albums`, `gallery_flags`, `moc_instructions`, `moc_files`, `moc_gallery_images`, `moc_gallery_albums`, `moc_parts_lists`, `moc_parts`, `wishlist_items` |
| `telemetry` | `workflow_events`                                                                                                                                                                  |

---

## KB DB (Knowledge Base PostgreSQL + pgvector)

**Package:** `apps/api/knowledge-base` → `@repo/knowledge-base`
**Local port:** `5433`
**Schema files:** `src/db/schema/` (split by pg schema)

The agent infrastructure database. Stores workflow state, semantic embeddings, and all pipeline artifacts.

| pg schema   | File                  | Purpose                                                                                                     |
| ----------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `public`    | `schema/kb.ts`        | Knowledge entries, embeddings, audit_log, ADRs, code standards, cohesion rules, lessons learned             |
| `workflow`  | `schema/workflow.ts`  | Stories (canonical, with embedding), plans, agents, invocations, sessions, context packs, ML model registry |
| `artifacts` | `schema/artifacts.ts` | Per-story pipeline artifacts (reviews, evidence, QA gates, checkpoints, etc.)                               |
| `analytics` | `schema/analytics.ts` | Token usage, A/B model experiments, model assignments                                                       |

> **Note (CDBN-2024):** `public.stories` was the legacy stories table. It has been dropped by migration
> `1011_cdbn2024_cleanup_public_stories.sql`. `workflow.stories` is now the sole canonical stories table
> and includes the `embedding vector(1536)` column for semantic similarity search.

Import tables from `@repo/knowledge-base/db`:

```ts
import { stories, plans, agentInvocations } from '@repo/knowledge-base/db'
```

---

## Pipeline DB (LangGraph Checkpoints) — DEPRECATED

**Package:** `apps/api/pipeline` (no `src/` directory remains)
**Local port:** `5434`

> **Deprecated** as of commit d25a40e4d. BullMQ pipeline has been replaced by the LangGraph supervisor
> architecture. This database is no longer actively used.

Previously stored LangGraph agent graph state between steps.

| Table                   | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| `checkpoints`           | Point-in-time graph state snapshots         |
| `checkpoint_blobs`      | Binary state data referenced by checkpoints |
| `checkpoint_writes`     | Pending writes before checkpoint commit     |
| `checkpoint_migrations` | Schema migration tracking                   |

---

## Local development ports

```
5432  — reserved (docker default, avoid conflicts)
5433  — KB DB
5434  — Pipeline DB (deprecated)
Aurora — App DB (no local instance; use RDS in dev or a local pg for integration tests)
```

---

## Migration strategies

| Database | Tool                                      | Location                                                  |
| -------- | ----------------------------------------- | --------------------------------------------------------- |
| KB DB    | Raw SQL migrations (sequential numbering) | `apps/api/knowledge-base/src/db/migrations/`              |
| App DB   | Drizzle Kit                               | `packages/backend/db/drizzle.config.ts` + `src/schema.ts` |

---

## Notable schema notes

- **`public.audit_log`** (KB DB): Columns are `action`, `old_content`, `new_content`, `changed_by` (all jsonb except `action` which is text). Drizzle schema aligned to match DB column names in migration 1174.
- **`workflow.stories`**: `phase` and `iteration` columns were intentionally removed per APRS-5040. Phase/iteration data is handled in `analytics-operations.ts`.
