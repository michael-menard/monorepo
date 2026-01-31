---
doc_type: stories_index
title: "KNOW Stories Index"
status: active
story_prefix: "KNOW"
created_at: "2026-01-24T23:55:00Z"
updated_at: "2026-01-25T14:00:00Z"
---

# KNOW Stories Index

A focused knowledge base MCP server for capturing and retrieving institutional knowledge.

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 9 |
| ready-for-qa | 2 |
| backlog | 3 |

**Goal:** Get to a working, usable KB. Then iterate based on real experience.

**Archived:** 35 stories moved to `stories-future.index.md` - premature optimizations and scope creep.

---

## What's Next

**Immediate:** QA and ship KNOW-006 and KNOW-007. Then you have a working KB.

**After that:** Use it for 2-3 real stories. Then decide what's missing.

---

## Ready for QA

### KNOW-006: Parsers and Seeding

**Status:** ready-for-qa
**Feature:** Parsers for YAML/markdown, seed script, kb_bulk_import tool

**Why it matters:** Without this, you can't import your existing knowledge.

**Story Document:** plans/future/knowledgebase-mcp/ready-for-qa/KNOW-006/KNOW-006.md

---

### KNOW-007: Admin Tools and Polish

**Status:** ready-for-qa
**Depends On:** KNOW-006
**Feature:** kb_rebuild_embeddings, comprehensive logging, performance testing

**Why it matters:** Lets you rebuild embeddings when models change, plus production polish.

---

## Backlog (Do After Using the KB)

### KNOW-048: Document Chunking (Learning Story)

**Status:** backlog
**Priority:** P2 (learning opportunity)
**Depends On:** KNOW-006
**Feature:** Split long documents into chunks before importing to KB

**Why it matters:** Enables ingestion of long-form content (READMEs, guides, design docs). Also a learning opportunity for RAG chunking patterns.

**Scope (MVP):**
- Markdown-aware splitting on `##` headers
- Token-limited fallback (max 500 tokens per chunk)
- Metadata: source file, chunk index, total chunks
- CLI: `pnpm kb:chunk path/to/doc.md` → outputs JSON array
- Integration with `kb_bulk_import`

**Non-Goals (avoid over-engineering):**
- No overlap/sliding window (add later if retrieval quality suffers)
- No hierarchical parent-child retrieval
- No DOCX/HTML/PDF support (markdown only)
- No semantic boundary detection (just headers + token limit)

**Acceptance Criteria:**
1. `chunkMarkdown(content, maxTokens)` returns `ChunkedDocument[]`
2. Splits on `##` headers, keeps header as context
3. Falls back to token limit if section too long
4. Preserves code blocks (don't split mid-block)
5. CLI outputs JSON to stdout
6. Integration test: chunk → bulk_import → search returns chunk
7. 80% test coverage

**Story Points:** 3

**When to do:** After KNOW-006 passes QA and you've done a basic import. Then try importing a long doc and see if chunking helps retrieval.

---

### KNOW-040: Agent Instruction Integration

**Status:** backlog
**Feature:** Add KB search instructions to agent files

**Why it matters:** Makes agents automatically query the KB before tasks.

**When to do:** After you've manually used the KB for a few stories and understand the query patterns that work.

---

### KNOW-043: Lessons Learned Migration

**Status:** backlog
**Depends On:** KNOW-006
**Feature:** Migrate LESSONS-LEARNED.md to KB, transition agents to write to KB

**Why it matters:** Makes the KB the canonical source of institutional knowledge.

**When to do:** After KNOW-040, when you're confident the KB is useful.

---

## Completed

### KNOW-001: Package Infrastructure Setup ✓

Database schema, Docker setup, test configuration.

---

### KNOW-002: Embedding Client Implementation ✓

OpenAI embedding client with caching, retry logic, batch processing.

---

### KNOW-003: Core CRUD Operations ✓

kb_add, kb_get, kb_update, kb_delete, kb_list with deduplication.

---

### KNOW-004: Search Implementation ✓

Semantic search (pgvector), keyword search (FTS), hybrid search with RRF.

---

### KNOW-0051: MCP Server Foundation + CRUD Tools ✓

MCP server setup, 5 CRUD tools, error handling, logging.

---

### KNOW-0052: MCP Search Tools + Deployment Topology ✓

kb_search, kb_get_related tools, performance logging, deployment docs.

---

### KNOW-0053: MCP Admin Tool Stubs ✓

kb_stats, kb_health, stubs for bulk_import and rebuild_embeddings.

---

### KNOW-015: Disaster Recovery ✓

Backup/restore procedures, RTO/RPO targets, runbooks.

---

### KNOW-028: Environment Variable Documentation ✓

.env.example, Zod-based startup validation, git protection.

---

### KNOW-039: MCP Registration and Claude Integration ✓

Setup guide, config generator, connection validator.

---

## Archived Stories

35 stories have been moved to `stories-future.index.md`. These include:

- **Production hardening** (auth, rate limiting, encryption) - not needed for local dev
- **Performance optimization** (quantization, reranking) - premature for 50 entries
- **Analytics & dashboards** - no users to analyze yet
- **Advanced document processing** - your content is already simple
- **Scope creep** (story management database, user flows) - separate projects

Revisit after using the KB for 5-10 real stories.

---

## Quick Reference

```
# Start the KB
cd apps/api/knowledge-base
docker-compose up -d
pnpm dev

# Register with Claude
pnpm kb:generate-config
pnpm kb:validate-connection

# Import seed data (after KNOW-006)
pnpm kb:seed

# Use it
kb_search({ query: "drizzle migration patterns", limit: 5 })
kb_add({ content: "...", tags: ["pattern"], role: "dev" })
```
