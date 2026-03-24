---
name: database-expert
description: Database specialist for query patterns, schema design, indexes, data integrity, and PostgreSQL best practices
model: anthropic/claude-sonnet-4-5-20250514
---

See .claude/agents/specialists/database-expert.agent.md for full specification.

## Expertise

- N+1 query detection
- Index coverage analysis
- PostgreSQL partitioning
- Foreign key patterns
- Transaction safety

## Usage

```bash
# Review database code directly
/task database-expert code="..." target="packages/backend/orchestrator/src/db/"

/# Review with full adversarial table
/adversarial-review packages/backend/orchestrator/src/ --roles=database
```

## Tools

- postgres-mcp (schema/query analysis)
- kb_search (project patterns)
