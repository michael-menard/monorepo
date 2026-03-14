# Knowledgebase Database ERD

> **Last Updated:** 2026-03-13
> **Note:** Database was consolidated via CDBN-2025. Stories, tasks, and work_state tables are now in the `workflow` schema. Artifact tables are consolidated in the `artifacts` schema.

## Schema Overview

| Schema      | Tables | Purpose                                                   |
| ----------- | ------ | --------------------------------------------------------- |
| `public`    | 15     | Core KB tables (knowledge_entries, agents, context cache) |
| `workflow`  | 16     | Story/workflow tables (stories, plans, work_state)        |
| `artifacts` | 18     | Artifact storage (all artifact type tables)               |
| `analytics` | 4      | Telemetry (story*token_usage, change_telemetry, model*\*) |
| `drizzle`   | 1      | Migration tracking (\_\_drizzle_migrations)               |

## Documentation Structure

This ERD is split into separate schema documentation files:

| File                                               | Schema      | Description                                            |
| -------------------------------------------------- | ----------- | ------------------------------------------------------ |
| [01-public-schema.md](./01-public-schema.md)       | `public`    | Core knowledge entries, agent telemetry, context cache |
| [02-workflow-schema.md](./02-workflow-schema.md)   | `workflow`  | Stories, plans, work state, executions                 |
| [03-artifacts-schema.md](./03-artifacts-schema.md) | `artifacts` | Artifact storage tables                                |
| [04-analytics-schema.md](./04-analytics-schema.md) | `analytics` | Telemetry and metrics tables                           |

## Quick Reference

### Table Counts by Schema

```
analytics    │  4 tables
artifacts    │ 18 tables
drizzle      │  1 table
public       │ 15 tables
workflow     │ 16 tables
─────────────┼───────────
Total        │ 54 tables
```

### Key Tables

| Schema    | Table             | Purpose                 | Primary Key            |
| --------- | ----------------- | ----------------------- | ---------------------- |
| public    | knowledge_entries | Core knowledge storage  | uuid id                |
| public    | agent_invocations | Agent execution records | uuid id                |
| workflow  | stories           | Story metadata          | text story_id          |
| workflow  | plans             | Plan metadata           | uuid id (plan_slug UK) |
| workflow  | work_state        | Story work context      | uuid id (story_id UK)  |
| artifacts | story_artifacts   | Artifact metadata       | uuid id                |
| analytics | story_token_usage | Token usage tracking    | uuid id                |

## Database Connection

- **Host:** localhost
- **Port:** 5435 (direct) / 5433 (via PgBouncer)
- **Database:** knowledgebase
- **User:** kbuser

## Related Documentation

- [Database Schema SQL](./schema/) - DDL for all tables
- [Migrations](./migrations/) - Migration history
- [API Documentation](../apps/api/knowledge-base/) - Knowledge Base API
