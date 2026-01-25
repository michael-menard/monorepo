# Knowledgebase MCP Server - Implementation Plan

**Version:** 1.3.0
**Created:** 2026-01-24
**Updated:** 2026-01-24
**Status:** Ready for Implementation

---

## Overview

A pgvector-based MCP server that provides institutional memory to AI agents during the development workflow. Agents can query for relevant patterns, lessons learned, and architectural decisions based on their role and current context.

### Goals

1. **Learning from mistakes** - Agents avoid repeating errors documented in LESSONS-LEARNED
2. **Institutional memory** - Store decisions, patterns, and rationale across stories
3. **Context efficiency** - Reduce token usage by pre-loading relevant knowledge instead of re-reading large files

### Non-Goals

- Human-facing web UI (agents are the primary consumers)
- Real-time collaboration features
- Version control for knowledge entries (rely on git for history)

---

## What is MCP?

### The Model Context Protocol

MCP (Model Context Protocol) is an open standard that allows AI assistants like Claude to connect to external tools and data sources. Think of it as a **plugin system for AI**.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Claude Code   │ ──────▶ │   MCP Server    │ ──────▶ │  External Data  │
│   (AI Client)   │ ◀────── │   (Your Code)   │ ◀────── │  (Database, API)│
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │
        │  "Call kb_search with     │  Runs your code,
        │   query='vercel routes'"  │  queries PostgreSQL,
        │                           │  returns results
        ▼                           ▼
   Claude decides             Your server handles
   when to use tools          the actual work
```

### How It Works

1. **You build an MCP server** - A Node.js process that defines "tools" (functions Claude can call)
2. **You register it with Claude Code** - Add config to `~/.claude/mcp.json`
3. **Claude Code spawns your server** - When Claude starts, it launches your MCP server as a subprocess
4. **Claude calls your tools** - During conversations, Claude can invoke your tools like `kb_search({ query: "..." })`
5. **Your server responds** - Returns structured data that Claude incorporates into its response

### Why Use MCP?

| Without MCP | With MCP |
|-------------|----------|
| Claude reads files every time | Claude queries a database once |
| Context fills up with repeated content | Relevant snippets returned on-demand |
| No persistent memory across sessions | Knowledge persists in PostgreSQL |
| Manual copy-paste of learnings | Automated knowledge capture |

### MCP vs Other Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **CLAUDE.md file** | Simple, no infrastructure | Limited size, static, no search |
| **Reading files on-demand** | Accurate, fresh data | Expensive (tokens), slow |
| **MCP with database** | Fast, searchable, persistent | Requires setup, maintenance |
| **RAG via API** | Powerful, scalable | More complex, separate service |

MCP is the sweet spot for **project-specific knowledge** that needs to be:
- Searchable (semantic + keyword)
- Persistent across sessions
- Filterable by role/context
- Writable by agents

### The Tools Concept

An MCP tool is like a function signature that Claude understands:

```typescript
// You define this in your MCP server
{
  name: 'kb_search',
  description: 'Search the knowledge base for relevant entries',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural language search query' },
      role: { type: 'string', enum: ['pm', 'dev', 'qa', 'all'] },
      limit: { type: 'number', default: 10 }
    },
    required: ['query']
  }
}

// Claude sees this and can decide to call it:
// "I should search for vercel routing patterns before writing this config..."
// → Calls kb_search({ query: "vercel route ordering", role: "dev" })
```

### When Claude Uses Your Tools

Claude decides autonomously when to use MCP tools based on:
- The tool's description
- The current task context
- Instructions in agent files or CLAUDE.md

You can **nudge** Claude to use tools by:
- Adding instructions to agent files: "Before writing routes, query `kb_search` for routing patterns"
- Including examples in CLAUDE.md
- Mentioning it in prompts: "Check the knowledge base first"

---

## Design Decisions

This section documents the key decisions made during planning and the rationale behind each.

### Decision 1: Package Location

**Choice:** `apps/api/knowledge-base/`

**Options Considered:**
- `apps/api/knowledge-base/` - Near existing API code
- `packages/mcp/knowledgebase/` - New MCP directory
- `packages/backend/mcp-knowledgebase/` - Under existing backend packages

**Rationale:** Keeping it under `apps/api/` groups it with other API-related code. While MCP servers aren't traditional "apps," they are standalone processes that serve the API layer. This avoids creating a new top-level directory for a single package.

---

### Decision 2: Tool Set

**Choice:** All 10 tools (comprehensive feature set)

| Tool | Category | Purpose |
|------|----------|---------|
| `kb_search` | Query | Hybrid semantic + keyword search |
| `kb_get` | Query | Fetch single entry by ID |
| `kb_get_related` | Query | Find related entries via tags/parent |
| `kb_list` | Query | Paginated listing with filters |
| `kb_add` | Write | Create new entry |
| `kb_update` | Write | Modify existing entry |
| `kb_delete` | Write | Remove entry |
| `kb_bulk_import` | Admin | Mass import from YAML |
| `kb_rebuild_embeddings` | Admin | Re-embed after model upgrade |
| `kb_stats` | Admin | Usage statistics |

**Rationale:** Starting with a complete tool set avoids revisiting the MCP server repeatedly. The marginal cost of implementing all tools upfront is low compared to the overhead of multiple iterations.

---

### Decision 3: Embedding Model

**Choice:** `text-embedding-3-small` (OpenAI)

**Options Considered:**
- `text-embedding-ada-002` - Battle-tested but 5x more expensive
- `text-embedding-3-small` - Newer, same quality, 5x cheaper
- `all-MiniLM-L6-v2` - Free/local but lower quality

**Rationale:**
- Same 1536 dimensions as ada-002 (no schema changes)
- ~$0.02 per million tokens vs $0.10 for ada-002
- Quality benchmarks show parity with ada-002
- OpenAI reliability preferred over local model complexity

---

### Decision 4: Seed Strategy

**Choice:** Hybrid (Parsers → YAML → Seed Script)

**Options Considered:**
- Parser-first: Extract directly from markdown into DB
- YAML-first: Manually curate YAML, skip parsers
- Hybrid: Parsers output YAML, seed script imports YAML

**Rationale:**
- Decouples parsing from importing (can edit YAML manually)
- YAML files serve as version-controlled snapshots
- Parsers can be re-run when source files change
- Seed script is simple (just reads YAML, inserts rows)

---

### Decision 5: Embedding Cache

**Choice:** Content-hash cache in database

**Options Considered:**
- No cache - Always call OpenAI
- File-based cache - Store in `.cache/embeddings.json`
- Database cache - Store `hash(content) → embedding` in PostgreSQL

**Rationale:**
- Content hash (SHA-256) uniquely identifies text
- Same content = same embedding (deterministic)
- Database cache survives restarts, is queryable
- Re-seeding becomes fast (only new content hits OpenAI)
- Same hash column enables deduplication (two-for-one)

---

### Decision 6: Confidence Decay

**Choice:** No decay for v1

**Options Considered:**
- No decay - Confidence only changes via explicit updates
- Time-based decay - -0.1 per month if not accessed
- Usage-based - Boost on access, decay on neglect

**Rationale:**
- Adds complexity without proven value
- Better to observe real usage patterns first
- Can add decay logic later based on data
- Manual confidence updates via `kb_update` suffice for now

---

### Decision 7: Testing Strategy

**Choice:** Full test suite (unit + integration)

**Options Considered:**
- Manual testing only
- Critical path tests only
- Full test suite

**Rationale:**
- Project standard requires 45% coverage
- MCP servers are hard to debug once deployed
- Tests catch embedding/search regressions early
- Integration tests validate the full MCP → DB flow

---

### Decision 8: Error Handling

**Choice:** Retry 3x with exponential backoff + keyword fallback

**Options Considered:**
- No special handling - Let errors propagate
- Simple retry - Fixed delay, 3 attempts
- Retry + fallback - Retry, then degrade gracefully

**Rationale:**
- OpenAI API has transient failures (rate limits, timeouts)
- Exponential backoff (1s, 2s, 4s) prevents hammering
- Keyword-only fallback ensures search still works if OpenAI is down
- `fallback: true` in response metadata signals degraded mode

---

### Decision 9: Logging

**Choice:** Use `@repo/logger`

**Options Considered:**
- Console wrapper (standalone)
- Pino (production logger)
- `@repo/logger` (project standard)

**Rationale:**
- Consistency with rest of codebase
- Structured logging already configured
- Log levels, formatting handled centrally

---

### Decision 10: Deduplication

**Choice:** Content-hash based (reject exact duplicates)

**Options Considered:**
- No deduplication - Allow duplicates
- Content-hash - Reject if exact content exists
- Semantic dedup - Warn if similar (cosine > 0.95)

**Rationale:**
- Exact duplicates waste storage and confuse search
- Content hash is already computed for embedding cache
- Unique index on `content_hash` enforces at DB level
- Semantic dedup adds complexity; near-duplicates may be intentional (different sources)

---

### Decision 11: Batch Embedding

**Choice:** Batch up to 100 texts per API call

**Options Considered:**
- Sequential - One API call per entry
- Parallel with limit - 10 concurrent single calls
- Batch by 100 - Single call with array of texts

**Rationale:**
- OpenAI's embedding API accepts arrays of up to 2048 texts
- Batching reduces API calls by 100x for bulk imports
- Lower latency than sequential (1 round-trip vs 100)
- Simpler than managing concurrent connections

---

### Decision 12: Workflow Integration

**Choice:** Direct KB writes from learnings agent (no LESSONS-LEARNED.md)

**Options Considered:**
- Modify learnings agent to write both markdown and KB
- Create separate KB sync phase after learnings
- Keep markdown, add parser to extract to KB (hybrid with re-parsing)
- Direct KB writes only, YAML artifact for local evidence

**Rationale:**
- Learnings agent already has structured data before writing
- No need for intermediate markdown if KB is the source of truth
- LEARNINGS.yaml provides git-tracked local evidence for each story
- Graceful degradation: if KB unavailable, YAML stores pending entries
- Migration path: existing LESSONS-LEARNED.md imported once, then archived
- Reduces duplication (no markdown + KB sync keeping them in sync)

---

## Architecture

### Location

```
apps/api/knowledge-base/
```

### Storage: PostgreSQL + pgvector

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL + pgvector                     │
├─────────────────────────────────────────────────────────────┤
│  knowledge_entries                                           │
│  ├── id (uuid)                                               │
│  ├── content (text)           -- The actual knowledge        │
│  ├── content_hash (text)      -- SHA-256 for dedup/cache     │
│  ├── embedding (vector(1536)) -- text-embedding-3-small      │
│  ├── entry_type (enum)        -- 'fact' | 'summary' | 'template' │
│  ├── source_file (text)       -- Origin file path            │
│  ├── source_story (text)      -- Story ID if applicable      │
│  ├── roles (text[])           -- ['pm', 'dev', 'qa', 'all']  │
│  ├── tags (text[])            -- Searchable tags             │
│  ├── parent_id (uuid)         -- Links facts to summaries    │
│  ├── confidence (float)       -- 0.0-1.0 for learned entries │
│  ├── created_at (timestamp)                                  │
│  ├── updated_at (timestamp)                                  │
│  └── metadata (jsonb)         -- Flexible additional data    │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Entry types enum
CREATE TYPE entry_type AS ENUM ('fact', 'summary', 'template');

-- Main knowledge entries table
CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,  -- SHA-256 hash for dedup and embedding cache
  embedding vector(1536),      -- text-embedding-3-small dimensions
  entry_type entry_type NOT NULL DEFAULT 'fact',
  source_file TEXT,
  source_story TEXT,
  roles TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  parent_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  confidence FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for search
CREATE UNIQUE INDEX idx_entries_content_hash ON knowledge_entries (content_hash);
CREATE INDEX idx_entries_roles ON knowledge_entries USING GIN (roles);
CREATE INDEX idx_entries_tags ON knowledge_entries USING GIN (tags);
CREATE INDEX idx_entries_type ON knowledge_entries (entry_type);
CREATE INDEX idx_entries_confidence ON knowledge_entries (confidence);
CREATE INDEX idx_entries_embedding ON knowledge_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_entries_parent ON knowledge_entries (parent_id);

-- Full-text search index
CREATE INDEX idx_entries_content_fts ON knowledge_entries USING GIN (to_tsvector('english', content));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Embedding cache table (stores hash → embedding mapping)
CREATE TABLE embedding_cache (
  content_hash TEXT PRIMARY KEY,
  embedding vector(1536) NOT NULL,
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Package Structure

```
apps/api/knowledge-base/
├── package.json
├── tsconfig.json
├── docker-compose.yaml
├── vitest.config.ts
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server.ts             # MCP tool definitions
│   ├── db/
│   │   ├── client.ts         # PostgreSQL connection
│   │   ├── migrations/       # Schema migrations
│   │   │   └── 001_initial.sql
│   │   └── queries.ts        # SQL query builders
│   ├── embeddings/
│   │   ├── client.ts         # OpenAI embedding client
│   │   ├── cache.ts          # Content-hash based cache
│   │   └── batch.ts          # Batch embedding (up to 100)
│   ├── search/
│   │   ├── hybrid.ts         # Hybrid search logic
│   │   ├── semantic.ts       # Vector similarity search
│   │   └── keyword.ts        # Full-text search
│   ├── parsers/
│   │   ├── lessons-learned.ts   # Parse LESSONS-LEARNED.md
│   │   ├── templates.ts         # Parse template files
│   │   └── markdown.ts          # Generic markdown parser
│   ├── __types__/
│   │   └── index.ts          # Zod schemas
│   └── __tests__/
│       ├── db/
│       │   └── queries.test.ts
│       ├── embeddings/
│       │   ├── client.test.ts
│       │   └── cache.test.ts
│       ├── search/
│       │   └── hybrid.test.ts
│       ├── parsers/
│       │   └── lessons-learned.test.ts
│       └── integration/
│           └── mcp-tools.test.ts
├── scripts/
│   ├── seed.ts               # Seed from YAML
│   ├── migrate.ts            # Run migrations
│   ├── parse-lessons.ts      # Parse LESSONS-LEARNED.md → YAML
│   └── rebuild-embeddings.ts # Re-embed all entries
└── seed-data/
    ├── lessons-learned.yaml  # Parsed from LESSONS-LEARNED.md
    └── templates.yaml        # Parsed from template files
```

---

## MCP Tools

### Query Tools

#### `kb_search`
Primary search tool for agents. Hybrid semantic + keyword search.

```typescript
kb_search({
  query: string,           // Natural language query
  role?: 'pm' | 'dev' | 'qa' | 'all',  // Filter by role
  tags?: string[],         // Filter by tags
  entry_type?: 'fact' | 'summary' | 'template',
  limit?: number,          // Default 10, max 50
  min_confidence?: number, // Default 0.5
})
// Returns: KnowledgeEntry[]
```

**Algorithm:**
1. Generate embedding for query using text-embedding-3-small
2. If OpenAI fails after 3 retries, fall back to keyword-only search
3. Run semantic search: `SELECT *, 1 - (embedding <=> $1) as semantic_score`
4. Run keyword search: `SELECT *, ts_rank(...) as keyword_score`
5. Merge with Reciprocal Rank Fusion (RRF): `score = 0.7 * semantic + 0.3 * keyword`
6. Return top N results

#### `kb_get`
Get a single entry by ID.

```typescript
kb_get({
  id: string,              // UUID of the entry
})
// Returns: KnowledgeEntry | null
```

#### `kb_get_related`
Get entries related to a specific entry (via parent_id or tag overlap).

```typescript
kb_get_related({
  entry_id: string,
  limit?: number,          // Default 5
})
// Returns: KnowledgeEntry[]
```

**Algorithm:**
1. Find entries with same parent_id (siblings)
2. Find entries that share 2+ tags
3. Rank by tag overlap count
4. Return top N

#### `kb_list`
List entries with filtering (no search).

```typescript
kb_list({
  role?: string,           // Filter by role
  tags?: string[],         // Filter by tags (AND)
  entry_type?: 'fact' | 'summary' | 'template',
  limit?: number,          // Default 20, max 100
  offset?: number,         // For pagination
  order_by?: 'created_at' | 'updated_at' | 'confidence',
  order?: 'asc' | 'desc',
})
// Returns: { entries: KnowledgeEntry[], total: number }
```

### Write Tools

#### `kb_add`
Add new knowledge entry. Generates embedding automatically.

```typescript
kb_add({
  content: string,
  entry_type: 'fact' | 'summary' | 'template',
  roles: string[],
  tags: string[],
  source_file?: string,
  source_story?: string,
  parent_id?: string,      // Link to parent summary
  confidence?: number,     // Default 1.0 for manual entries
  metadata?: object,
})
// Returns: { id: string, success: boolean, duplicate?: boolean }
```

**Flow:**
1. Compute content_hash (SHA-256)
2. Check for duplicate (reject if hash exists)
3. Check embedding cache for this hash
4. If not cached, generate embedding (batch if multiple pending)
5. Store in embedding_cache
6. Insert entry with embedding
7. Return new ID

#### `kb_update`
Update existing entry. Re-generates embedding if content changes.

```typescript
kb_update({
  id: string,
  content?: string,        // Re-embeds if changed
  roles?: string[],
  tags?: string[],
  confidence?: number,
  metadata?: object,
})
// Returns: { success: boolean, re_embedded?: boolean }
```

#### `kb_delete`
Delete entry by ID.

```typescript
kb_delete({
  id: string,
})
// Returns: { success: boolean }
```

### Admin Tools

#### `kb_bulk_import`
Import multiple entries from YAML. Uses batch embedding.

```typescript
kb_bulk_import({
  entries: CreateEntryInput[],
  skip_existing?: boolean,  // Default true - skip duplicates by hash
})
// Returns: { imported: number, skipped: number, errors: string[] }
```

**Flow:**
1. Compute hashes for all entries
2. Filter out duplicates (if skip_existing)
3. Check embedding cache for existing hashes
4. Batch embed remaining content (up to 100 per API call)
5. Store new embeddings in cache
6. Bulk insert entries
7. Return summary

#### `kb_rebuild_embeddings`
Re-generate embeddings for all entries (after model upgrade).

```typescript
kb_rebuild_embeddings({
  batch_size?: number,     // Default 100
  clear_cache?: boolean,   // Default true - clear embedding_cache first
})
// Returns: { total: number, processed: number, status: 'complete' | 'in_progress' }
```

#### `kb_stats`
Get knowledgebase statistics.

```typescript
kb_stats()
// Returns: {
//   total_entries: number,
//   by_type: Record<string, number>,
//   by_role: Record<string, number>,
//   avg_confidence: number,
//   last_updated: string,
//   cache_size: number
// }
```

---

## Knowledge Entry Types

### 1. Facts (Atomic)
Small, specific learnings that can be retrieved individually.

**Examples from LESSONS-LEARNED.md:**
```yaml
- content: "Route ordering in vercel.json: specific routes must come before parameterized routes. Place /api/mocs/stats/by-category before /api/mocs/:id."
  entry_type: fact
  roles: [dev]
  tags: [vercel, routing, api, pattern]
  source_story: STORY-007
  confidence: 1.0

- content: "When deleting an entity referenced by another FK (e.g., coverImageId on albums), clear those references BEFORE deleting to prevent FK constraint violations."
  entry_type: fact
  roles: [dev]
  tags: [database, foreign-key, delete, pattern]
  source_story: STORY-008
  confidence: 1.0
```

### 2. Summaries (Story-level)
Aggregated learnings per story, linking to related facts.

```yaml
- content: "STORY-016 (MOC File Upload Management): 57 ACs was too large - split into smaller stories. 141 tests written in fix phase because tests were skipped during implementation. Write tests alongside code, not after."
  entry_type: summary
  roles: [pm, dev, qa]
  tags: [story-sizing, testing, process]
  source_story: STORY-016
```

### 3. Templates
Reusable document templates.

```yaml
- content: "<full PROOF-TEMPLATE.md content>"
  entry_type: template
  roles: [dev]
  tags: [proof, documentation, template]
  source_file: plans/stories/UAT/WRKF-000/_templates/PROOF-TEMPLATE.md
```

---

## Seed Strategy

### Hybrid Approach: Parsers → YAML → Seed Script

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Source Files    │ ──▶ │  Parser Script  │ ──▶ │  YAML Files     │
│ (markdown)      │     │                 │     │  (seed-data/)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Seed Script    │
                                                │  (imports YAML) │
                                                └─────────────────┘
```

### Parser: LESSONS-LEARNED.md

```typescript
// parsers/lessons-learned.ts

interface ParsedStory {
  storyId: string
  date: string
  sections: {
    reuseDiscoveries: string[]
    blockersHit: string[]
    timeSinks: string[]
    verificationNotes: string[]
    recommendations: string[]
  }
}

// Extract:
// - Each "Reuse Discoveries" bullet → fact, tags: [reuse, pattern]
// - Each "Recommendations" bullet → fact, tags: [recommendation]
// - Story header → summary entry
```

### Parser: Templates

```typescript
// parsers/templates.ts

// For each template file:
// - Read full content
// - Extract title from first heading
// - Infer tags from path (e.g., "operations/RUNBOOK" → [operations, runbook])
// - Set roles based on template type
```

### Files to Seed

| File | Entry Type | Roles | Priority |
|------|------------|-------|----------|
| `plans/stories/LESSONS-LEARNED.md` | facts + summaries | all | High |
| `plans/stories/UAT/WRKF-000/_templates/*.md` | templates | dev, qa | High |
| `docs/architecture/ADR-TEMPLATE.md` | template | dev, pm | Medium |
| `CLAUDE.md` | facts | dev | High |

### Seed Commands

```bash
# Parse sources to YAML (run when source files change)
pnpm parse:lessons    # LESSONS-LEARNED.md → seed-data/lessons-learned.yaml
pnpm parse:templates  # Templates → seed-data/templates.yaml

# Seed database from YAML
pnpm seed             # Import all YAML files
pnpm seed --file=lessons-learned.yaml  # Import specific file
```

---

## Embedding Strategy

### Model

- **Model:** `text-embedding-3-small`
- **Dimensions:** 1536
- **Provider:** OpenAI

### Caching

Content-hash based caching prevents redundant API calls:

1. Compute `SHA-256(content)` → `content_hash`
2. Check `embedding_cache` table for this hash
3. If found, use cached embedding
4. If not found, call OpenAI, store in cache

This means:
- Identical content is never re-embedded
- Re-seeding is fast (most content unchanged)
- `kb_rebuild_embeddings` clears cache and re-embeds all

### Batch Embedding

For bulk operations (import, rebuild):

1. Collect up to 100 texts
2. Single API call: `embeddings.create({ input: texts[], model: '...' })`
3. Store all embeddings in cache
4. Continue with next batch

### Deduplication

Before adding an entry:

1. Compute content_hash
2. Check if hash exists in `knowledge_entries`
3. If exists, reject with `duplicate: true`
4. If not, proceed with insert

---

## Error Handling & Resilience

### OpenAI API Failures

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,  // 1s, 2s, 4s
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await sleep(RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt))
      }
    }
  }
  throw lastError
}
```

### Fallback Behavior

If OpenAI is unavailable for `kb_search`:

1. Log warning via `@repo/logger`
2. Skip semantic search
3. Run keyword-only search
4. Add `fallback: true` to response metadata

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `db/queries.ts` | SQL generation, parameter binding |
| `embeddings/client.ts` | API call structure, error handling |
| `embeddings/cache.ts` | Hash computation, cache hit/miss |
| `search/hybrid.ts` | RRF algorithm, score merging |
| `parsers/*.ts` | Markdown parsing, entry extraction |

### Integration Tests

| Test | Description |
|------|-------------|
| `mcp-tools.test.ts` | Full MCP tool invocation with test DB |
| `search-flow.test.ts` | Add → Search → Get flow |
| `bulk-import.test.ts` | Large import with batching |

### Test Database

Use Docker Compose to spin up a test PostgreSQL:

```yaml
# docker-compose.test.yaml
services:
  kb-postgres-test:
    image: pgvector/pgvector:pg16
    ports:
      - "5434:5432"
    environment:
      POSTGRES_DB: knowledgebase_test
      POSTGRES_USER: kb_user
      POSTGRES_PASSWORD: kb_password
```

---

## Role-Based Knowledge Views

### PM Agent Knowledge
- Story sizing patterns (when to split)
- Feature prioritization learnings
- Acceptance criteria patterns
- Token budget expectations per story type

### Dev Agent Knowledge
- Code patterns (DI, Zod-first, etc.)
- Route ordering rules
- Package templates
- Common pitfalls and fixes
- Architecture decisions (ADRs)

### QA Agent Knowledge
- Test coverage expectations
- Verification patterns
- Common failure modes
- QA gate criteria

---

## Workflow Integration

This section describes how the knowledgebase integrates with the story lifecycle defined in `docs/FULL_WORKFLOW.md`.

### Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORY LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ PM      │───▶│ Elab    │───▶│ Dev     │───▶│ Review  │───▶│ QA      │  │
│  │         │    │         │    │         │    │         │    │         │  │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘  │
│       │              │              │              │              │        │
│       ▼              ▼              ▼              ▼              ▼        │
│   kb_search      kb_search     kb_search      kb_search      kb_search    │
│   (patterns)     (audit)       (impl)         (review)       (verify)     │
│                                     │                                      │
│                                     ▼                                      │
│                                 kb_add                                     │
│                              (learnings)                                   │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │   Knowledgebase     │
                          │   (PostgreSQL +     │
                          │    pgvector)        │
                          └─────────────────────┘
```

### Read Integration: Phase Startup

Each phase's **setup leader** queries the knowledgebase for relevant context before starting work.

#### Agents to Modify

| Agent File | Query Focus |
|------------|-------------|
| `pm-bootstrap-setup-leader.agent.md` | Story sizing patterns, epic structure |
| `elab-setup-leader.agent.md` | Audit patterns, common story issues |
| `dev-setup-leader.agent.md` | Implementation patterns, reuse discoveries |
| `dev-implement-planning-leader.agent.md` | Package templates, architecture patterns |
| `code-review-*.agent.md` | Code review patterns, common issues |
| `qa-verify-setup-leader.agent.md` | Verification patterns, test coverage |

#### Query Pattern

Add to each setup leader's initialization:

```markdown
## Initialization

Before starting work, query the knowledgebase for relevant patterns:

\`\`\`
kb_search({
  query: "common patterns and mistakes for <phase-name>",
  role: "<pm|dev|qa>",
  tags: ["<phase-tag>"],
  limit: 10,
  min_confidence: 0.7
})
\`\`\`

Incorporate relevant findings into your approach. If KB is unavailable, proceed without - this is non-blocking.
```

#### Graceful Degradation

If the knowledgebase is unavailable:
1. Log warning: `logger.warn('Knowledgebase unavailable, proceeding without context')`
2. Continue with phase execution (non-blocking)
3. Do not fail the phase due to KB issues

### Write Integration: Learnings Capture

The **learnings agent** (`dev-implement-learnings.agent.md`) writes directly to the knowledgebase instead of LESSONS-LEARNED.md.

#### Current Flow (Before)

```
dev-implement-learnings.agent.md
    └─→ Append to plans/stories/LESSONS-LEARNED.md
```

#### New Flow (After)

```
dev-implement-learnings.agent.md
    │
    ├─→ Build structured learnings (existing logic)
    │
    ├─→ kb_add: Story Summary
    │     {
    │       content: "WRKF-1021: Node Execution Metrics - Clean implementation...",
    │       entry_type: "summary",
    │       source_story: "WRKF-1021",
    │       roles: ["pm", "dev", "qa"],
    │       tags: ["wrkf", "orchestrator", "metrics"],
    │       confidence: 1.0
    │     }
    │     → Returns: summary_id
    │
    ├─→ kb_add: Each Recommendation (as child facts)
    │     {
    │       content: "Check for naming conflicts before creating new types...",
    │       entry_type: "fact",
    │       source_story: "WRKF-1021",
    │       roles: ["dev"],
    │       tags: ["recommendation", "naming", "types"],
    │       parent_id: summary_id,
    │       confidence: 1.0
    │     }
    │
    ├─→ kb_add: Each Reuse Discovery (as child facts)
    │     {
    │       content: "RetryMetrics pattern from @repo/api-client...",
    │       entry_type: "fact",
    │       source_story: "WRKF-1021",
    │       roles: ["dev"],
    │       tags: ["reuse", "pattern", "api-client"],
    │       parent_id: summary_id,
    │       confidence: 1.0
    │     }
    │
    ├─→ kb_add: High-Cost Operations (if any)
    │     {
    │       content: "Reading LESSONS-LEARNED.md costs ~4,575 tokens...",
    │       entry_type: "fact",
    │       roles: ["dev", "qa"],
    │       tags: ["tokens", "optimization", "high-cost"],
    │       confidence: 1.0
    │     }
    │
    └─→ Write _implementation/LEARNINGS.yaml
          - Local artifact recording what was synced
          - For debugging and recovery
          - Git-tracked evidence
```

#### LEARNINGS.yaml Structure

```yaml
# _implementation/LEARNINGS.yaml
story_id: WRKF-1021
synced_at: 2026-01-24T15:30:00Z
kb_available: true

entries:
  - id: <uuid-from-kb>
    type: summary
    content: "WRKF-1021: Node Execution Metrics..."

  - id: <uuid-from-kb>
    type: fact
    category: recommendation
    content: "Check for naming conflicts..."
    parent_id: <summary-uuid>

  - id: <uuid-from-kb>
    type: fact
    category: reuse
    content: "RetryMetrics pattern from @repo/api-client..."
    parent_id: <summary-uuid>

# If KB was unavailable:
# kb_available: false
# pending_sync: true
# entries: [...] (stored for later sync)
```

#### Graceful Degradation for Writes

If knowledgebase is unavailable during learnings capture:
1. Log warning: `logger.warn('Knowledgebase unavailable, storing locally for later sync')`
2. Write LEARNINGS.yaml with `kb_available: false` and `pending_sync: true`
3. Continue (do not fail the phase)
4. Later: Run `pnpm kb:sync-pending` to sync pending entries

### On-Demand Queries

Beyond phase startup, agents can query contextually:

| Trigger | Query Example |
|---------|---------------|
| Creating new package | `kb_search({ query: "package scaffolding template", tags: ["package"] })` |
| Writing vercel.json | `kb_search({ query: "vercel route ordering", tags: ["vercel", "routing"] })` |
| Encountering lint error | `kb_search({ query: "<error-pattern>", tags: ["lint", "fix"] })` |
| Planning implementation | `kb_search({ query: "similar story patterns", entry_type: "summary" })` |

### Failure Capture (Future Enhancement)

When a phase fails and retries, capture the pattern:

```typescript
kb_add({
  content: "Failure in verification: unused import in handler. Fix: run eslint --fix after each file.",
  entry_type: "fact",
  source_story: "WRKF-1021",
  roles: ["dev"],
  tags: ["failure", "verification", "lint"],
  confidence: 0.8  // Lower until validated by QA gate
})
```

On QA Gate PASS, boost confidence:

```typescript
kb_update({
  id: "<fact-id>",
  confidence: 1.0,
  metadata: { validated_at: "2026-01-24", gate_result: "PASS" }
})
```

*Note: Failure capture is a future enhancement, not required for v1.*

### Migration Strategy

#### One-Time Import of Existing Content

The existing `plans/stories/LESSONS-LEARNED.md` contains valuable learnings from 15+ stories. Import this content before switching to direct KB writes.

```bash
# 1. Parse existing LESSONS-LEARNED.md to YAML
pnpm parse:lessons

# 2. Review/edit seed-data/lessons-learned.yaml if needed

# 3. Import to knowledgebase
pnpm seed --file=lessons-learned.yaml

# 4. Verify import
pnpm kb:stats
```

#### Post-Migration

After migration:
1. LESSONS-LEARNED.md becomes **archived** (read-only historical reference)
2. New learnings go directly to KB via the learnings agent
3. LEARNINGS.yaml in each story provides local git-tracked evidence

### Agent Modification Checklist

| Agent | Modification | Priority |
|-------|--------------|----------|
| `dev-implement-learnings.agent.md` | Replace markdown append with `kb_add` calls | **Required for v1** |
| `*-setup-leader.agent.md` (all) | Add `kb_search` at initialization | **Required for v1** |
| `dev-implement-planning-leader.agent.md` | Query for similar story patterns | Nice-to-have |
| `code-review-*.agent.md` | Query for review patterns | Nice-to-have |
| Phase failure handlers | Add `kb_add` for failure patterns | Future enhancement |

---

## Configuration

### Environment Variables

```bash
# .env
KB_DATABASE_URL=postgresql://kb_user:kb_password@localhost:5433/knowledgebase
OPENAI_API_KEY=sk-...
KB_EMBEDDING_MODEL=text-embedding-3-small
KB_DEFAULT_SEARCH_LIMIT=10
KB_MIN_CONFIDENCE=0.5
KB_BATCH_SIZE=100
```

### Docker Compose

```yaml
# docker-compose.yaml
services:
  kb-postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5433:5432"
    environment:
      POSTGRES_DB: knowledgebase
      POSTGRES_USER: kb_user
      POSTGRES_PASSWORD: kb_password
    volumes:
      - kb_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kb_user -d knowledgebase"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  kb_postgres_data:
```

### Claude Code MCP Config

```json
// ~/.claude/mcp.json
{
  "mcpServers": {
    "knowledgebase": {
      "command": "node",
      "args": ["/path/to/apps/api/knowledge-base/dist/index.js"],
      "env": {
        "KB_DATABASE_URL": "${KB_DATABASE_URL}",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Infrastructure
- [ ] Create `apps/api/knowledge-base/` package structure
- [ ] Set up docker-compose.yaml with pgvector
- [ ] Create database schema with migrations
- [ ] Configure vitest and basic test setup
- [ ] Add package.json with dependencies

**Deliverable:** `pnpm migrate` creates schema in Docker postgres

### Phase 2: Embedding Client
- [ ] Implement OpenAI embedding client (text-embedding-3-small)
- [ ] Implement content-hash caching in DB
- [ ] Add retry logic with exponential backoff
- [ ] Implement batch embedding (up to 100 per call)
- [ ] Unit tests for embedding module

**Deliverable:** `embeddings.generate(content)` works with caching

### Phase 3: Core CRUD
- [ ] Implement `kb_add` with deduplication
- [ ] Implement `kb_get` by ID
- [ ] Implement `kb_update` with re-embedding
- [ ] Implement `kb_delete`
- [ ] Implement `kb_list` with filtering
- [ ] Unit tests for all CRUD operations

**Deliverable:** All CRUD tools work against test DB

### Phase 4: Search
- [ ] Implement semantic search (pgvector cosine)
- [ ] Implement keyword search (PostgreSQL FTS)
- [ ] Implement hybrid search with RRF merging
- [ ] Add keyword-only fallback for API failures
- [ ] Implement `kb_get_related`
- [ ] Integration tests for search

**Deliverable:** `kb_search` returns ranked results

### Phase 5: MCP Server
- [ ] Set up MCP server with @modelcontextprotocol/sdk
- [ ] Register all 10 tools with schemas
- [ ] Implement tool handlers
- [ ] Add `@repo/logger` integration
- [ ] Test with Claude Code

**Deliverable:** MCP server runs and tools appear in Claude Code

### Phase 6: Parsers & Seeding
- [ ] Implement LESSONS-LEARNED.md parser
- [ ] Implement template parser
- [ ] Create seed script (YAML → DB)
- [ ] Run initial seed
- [ ] Implement `kb_bulk_import` tool
- [ ] Implement `kb_stats` tool

**Deliverable:** Knowledge base seeded with existing content

### Phase 7: Admin & Polish
- [ ] Implement `kb_rebuild_embeddings`
- [ ] Add comprehensive logging
- [ ] Performance testing with realistic data
- [ ] Documentation (README, usage examples)

**Deliverable:** Production-ready MCP server

### Phase 8: Workflow Integration
- [ ] Migrate existing LESSONS-LEARNED.md content to KB
- [ ] Modify `dev-implement-learnings.agent.md` to write to KB
- [ ] Add LEARNINGS.yaml output for local artifact
- [ ] Add `kb_search` to setup leader agents (start with 2-3 key agents)
- [ ] Add `kb:sync-pending` script for recovery
- [ ] Test full story lifecycle with KB integration
- [ ] Archive LESSONS-LEARNED.md (mark as historical)

**Deliverable:** Story lifecycle uses KB for learnings capture and context retrieval

---

## Success Metrics

1. **Token reduction** - Measure average token usage per story before/after integration
2. **Error recurrence** - Track if documented errors recur in subsequent stories
3. **Query relevance** - Sample search results and rate relevance (0-5 scale)
4. **Agent adoption** - Count knowledgebase queries per story lifecycle

---

## Changelog

### [1.3.0] - 2026-01-24
- Added Decision 12: Workflow Integration (direct KB writes, no markdown)
- Replaced "Agent Integration" with comprehensive "Workflow Integration" section
- Added direct KB write strategy (replaces LESSONS-LEARNED.md)
- Added LEARNINGS.yaml local artifact for git-tracked evidence
- Added read integration for phase startup (setup leaders query KB)
- Added graceful degradation for both reads and writes
- Added migration strategy for existing LESSONS-LEARNED.md content
- Added agent modification checklist
- Added Phase 8: Workflow Integration to implementation phases

### [1.2.0] - 2026-01-24
- Added "What is MCP?" section explaining the Model Context Protocol
- Added "Design Decisions" section documenting all 11 decisions with rationale

### [1.1.0] - 2026-01-24
- Resolved all open questions
- Updated location to `apps/api/knowledge-base/`
- Added all 10 MCP tools (including kb_get, kb_list, kb_get_related, kb_rebuild_embeddings)
- Updated embedding model to text-embedding-3-small
- Added content_hash for deduplication and embedding cache
- Added hybrid seed strategy (parsers → YAML → seed)
- Added resilience (retry + keyword fallback)
- Added full test suite requirement
- Added batch embedding for bulk operations
- Defined 7 implementation phases

### [1.0.0] - 2026-01-24
- Initial plan draft
