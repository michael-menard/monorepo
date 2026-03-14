# Database Architecture

This document explains the database structure for the monorepo.

## Two Databases

### 1. `monorepo` Database

**Purpose:** User-facing application data (gallery, wishlists, MOCs)

**Package:** `@repo/db`

| Schema   | Tables                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `public` | gallery_images, gallery_albums, gallery_flags, wishlist_items, moc_instructions, moc_files, moc_parts, upload_sessions, etc. |

### 2. `knowledgebase` Database

**Purpose:** Agent/workflow intelligence data (stories, plans, artifacts, ML telemetry)

**Package:** `@repo/knowledge-base`

| Schema      | Tables                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `public`    | knowledge_entries, rules, cohesion_rules, lessons_learned, adrs, etc.                                       |
| `workflow`  | stories, plans, agents, agent_invocations, hitl_decisions, context_sessions, context_packs, ml_models, etc. |
| `artifacts` | story_artifacts, artifact_reviews, artifact_evidence, artifact_checkpoints, etc.                            |
| `analytics` | story_token_usage, model_experiments, model_assignments, change_telemetry                                   |

---

## Quick Reference

| Database        | Package                | What it's for                                   |
| --------------- | ---------------------- | ----------------------------------------------- |
| `monorepo`      | `@repo/db`             | User data (images, wishlists, MOCs)             |
| `knowledgebase` | `@repo/knowledge-base` | Agent workflow data (stories, plans, telemetry) |

---

## Adding New Tables

- **User-facing tables** → Add to `@repo/db/src/schema.ts`
- **KB/Agent tables** → Add to `@repo/knowledge-base/src/db/schema.ts`
