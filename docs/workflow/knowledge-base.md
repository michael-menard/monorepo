---
title: "Knowledge Base Integration"
version: "1.0.0"
created_at: "2026-02-07T12:00:00-07:00"
updated_at: "2026-02-07T12:00:00-07:00"
status: active
tags:
  - workflow
  - knowledge-base
  - documentation
---

# Knowledge Base Integration

This document describes how workflow documentation is stored in the Knowledge Base for semantic search and agent context retrieval.

## Overview

Workflow documentation is automatically chunked and stored in the Knowledge Base with vector embeddings. This enables:

- **Semantic search** - Find relevant workflow info by meaning, not just keywords
- **Agent context** - Agents can query for workflow procedures during execution
- **Version tracking** - Updates preserve history and enable rollback
- **Efficient updates** - Replace mode ensures clean updates when docs change

## Architecture

```
docs/workflow/*.md
       │
       ▼ (chunk on ## headers)
┌─────────────────────────────────┐
│  migrate-docs-to-kb.ts          │
│  - Chunks markdown by sections  │
│  - Extracts front matter        │
│  - Generates embeddings         │
│  - Applies source/version tags  │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Knowledge Base (PostgreSQL)    │
│  - knowledge_entries table      │
│  - pgvector for embeddings      │
│  - Tags for filtering           │
└─────────────────────────────────┘
```

## Stored Documents

| Document | Chunks | Description |
|----------|--------|-------------|
| README.md | ~15 | Overview, commands, state diagrams |
| phases.md | ~29 | Detailed phase documentation |
| agent-system.md | ~9 | Agent architecture |
| orchestration.md | ~13 | Error handling, parallel workers |
| autonomous-decisions.md | ~10 | Decision classification |
| context-caching.md | ~9 | Cache architecture |
| extending.md | ~20 | Extension guide |
| changelog.md | ~33 | Version history |

## Tagging Strategy

Each chunk receives these tags for filtering and updates:

| Tag Pattern | Example | Purpose |
|-------------|---------|---------|
| `source:<path>` | `source:docs-workflow-phases-md` | Identify source file for updates |
| `version:<ver>` | `version:3-0-0` | Track document version |
| `type:<type>` | `type:runbook` | Entry type classification |
| `chunk:<n>-of-<total>` | `chunk:5-of-29` | Position tracking |
| `section:<header>` | `section:phase-1-bootstrap` | Section filtering |
| `workflow` | `workflow` | Base tag for all workflow docs |

## Commands

### Initial Import

```bash
pnpm --filter knowledge-base kb:migrate-docs \
  --source docs/workflow/ \
  --entry-type runbook \
  --base-tag workflow
```

### Update After Changes

```bash
pnpm --filter knowledge-base kb:migrate-docs \
  --source docs/workflow/ \
  --entry-type runbook \
  --base-tag workflow \
  --replace
```

The `--replace` flag:
1. Finds all entries with matching `source:` tag
2. Deletes them
3. Re-chunks and re-imports with fresh embeddings

This ensures clean updates even when section boundaries change.

### Dry Run (Preview)

```bash
pnpm --filter knowledge-base kb:migrate-docs \
  --source docs/workflow/ \
  --dry-run \
  --verbose
```

### Single File Update

```bash
pnpm --filter knowledge-base kb:migrate-docs \
  --source docs/workflow/phases.md \
  --entry-type runbook \
  --base-tag workflow \
  --replace
```

## Script Options

| Option | Default | Description |
|--------|---------|-------------|
| `--source <path>` | (required) | Directory or file to import |
| `--entry-type <type>` | `runbook` | Entry type: note, decision, constraint, runbook, lesson |
| `--role <role>` | `all` | Role: pm, dev, qa, all |
| `--base-tag <tag>` | (none) | Base tag for all entries |
| `--max-tokens <n>` | `500` | Max tokens per chunk |
| `--replace` | `false` | Delete existing before import |
| `--dry-run` | `false` | Preview without writing |
| `--verbose` | `false` | Show detailed output |

## Chunking Strategy

Documents are split on `##` (level-2) headers:

1. **Header-based splitting** - Each `##` section becomes a potential chunk
2. **Token limit** - Sections exceeding `--max-tokens` are split on paragraphs
3. **Code block preservation** - Code blocks are never split mid-block
4. **Front matter extraction** - YAML front matter becomes metadata on all chunks

### Example Chunk

```markdown
## Phase 1: Bootstrap (One-Time per Epic)

Bootstrap consists of two steps that run once per epic/project:

### Step 1a: Bootstrap Workflow

**Command:** `/pm-bootstrap-workflow`
**When:** Once per epic/project, before any stories are generated
...
```

This section would become one chunk with tags:
- `source:docs-workflow-phases-md`
- `version:3-0-0`
- `type:runbook`
- `chunk:2-of-29`
- `workflow`
- `section:phase-1-bootstrap-one-time-per-epic`

## Querying the KB

### Via MCP Server

The Knowledge Base MCP server provides search tools:

```typescript
// Semantic search
kb_search({
  query: "how do I start a new story",
  role: "dev",
  tags: ["workflow"],
  limit: 5
})

// Filter by source
kb_list({
  tags: ["source:docs-workflow-phases-md"],
  limit: 100
})
```

### Via SQL

```sql
-- Find workflow entries about QA
SELECT content, tags
FROM knowledge_entries
WHERE 'workflow' = ANY(tags)
  AND content ILIKE '%qa%'
LIMIT 10;

-- Count entries per source file
WITH source_tags AS (
  SELECT
    id,
    (SELECT t FROM unnest(tags) t WHERE t LIKE 'source:%' LIMIT 1) as source_tag
  FROM knowledge_entries
  WHERE 'workflow' = ANY(tags)
)
SELECT source_tag, COUNT(*) as chunks
FROM source_tags
GROUP BY source_tag;
```

## Update Workflow

When you modify workflow documentation:

1. **Edit the markdown file** in `docs/workflow/`
2. **Update the version** in YAML front matter (if significant change)
3. **Run the migration** with `--replace`:

```bash
pnpm --filter knowledge-base kb:migrate-docs \
  --source docs/workflow/ \
  --entry-type runbook \
  --base-tag workflow \
  --replace
```

4. **Verify the import**:

```sql
SELECT COUNT(*) FROM knowledge_entries WHERE 'workflow' = ANY(tags);
```

## Maintenance

### View Current Stats

```sql
SELECT
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE 'workflow' = ANY(tags)) as workflow_entries
FROM knowledge_entries;
```

### List Source Files

```sql
SELECT DISTINCT
  (SELECT t FROM unnest(tags) t WHERE t LIKE 'source:%' LIMIT 1) as source
FROM knowledge_entries
WHERE 'workflow' = ANY(tags);
```

### Delete All Workflow Entries

```sql
DELETE FROM knowledge_entries WHERE 'workflow' = ANY(tags);
```

## Troubleshooting

### Tag Validation Errors

Tags must match pattern `[a-zA-Z0-9_:-]+` and be ≤50 characters. The script sanitizes paths and headers automatically:
- `/` → `-`
- `.` → `-`
- Long tags truncated to 42 characters (+ 8 char prefix)

### Large Chunks

Chunks exceeding `--max-tokens` are logged as warnings. This typically happens with:
- Large code blocks
- Long tables

These are kept as single chunks rather than split mid-content.

### Duplicate Detection

The script uses content hashing to detect duplicates. If you see "skipped" entries, they already exist with identical content.

## Related

- [context-caching.md](./context-caching.md) - Three-tier cache architecture
- [agent-system.md](./agent-system.md) - How agents use KB context
- `apps/api/knowledge-base/` - KB implementation
