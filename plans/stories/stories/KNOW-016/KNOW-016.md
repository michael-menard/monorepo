---
story_id: KNOW-016
title: Implement Result Cache Backend for KB Search
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: tech-debt
priority: high
---

# KNOW-016: Implement Result Cache Backend for KB Search

## Context

The KB MCP server has a fully stubbed result cache layer in `mcp-server/access-control.ts` (KNOW-021 placeholder). Functions `cacheGet`, `cacheSet`, and `invalidateCache` exist but are no-ops — every `kb_search` call hits the database and calls the OpenAI embedding API regardless of whether the same query was made seconds ago.

Agents frequently run identical searches within a single story session (e.g. "find constraints for auth stories", "find lessons about review failures"). Without caching, this generates redundant OpenAI API calls and adds latency to every search.

## Goal

Replace the stub cache functions with a working in-memory LRU cache for `kb_search` results, reducing duplicate OpenAI embedding API calls and improving search response times for repeated queries within a session.

## Non-goals

- Redis or distributed cache (in-memory is sufficient for single-process MCP server)
- Caching other tools beyond `kb_search` and `kb_get_related` in v1
- Persistent cache across server restarts
- Cache warming or pre-population

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/access-control.ts` — replace stubs with real LRU implementation
- `apps/api/knowledge-base/src/mcp-server/server.ts` — wire cache invalidation on mutations
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — ensure mutation tools call invalidateCache

### Cache Design

- **Key**: hash of `(query, role, tags, entry_type, limit, min_confidence)`
- **TTL**: 5 minutes (configurable via `KB_CACHE_TTL_MS` env var)
- **Max entries**: 200 (configurable via `KB_CACHE_MAX_ENTRIES` env var)
- **Eviction**: LRU
- **Invalidation**: Any `kb_add`, `kb_update`, `kb_delete`, `kb_bulk_import` clears the cache

## Acceptance Criteria

### AC1: Cache Returns Results for Repeated Queries
**Given** `kb_search` is called with the same parameters twice within the TTL window
**When** the second call executes
**Then** the result is returned from cache (no OpenAI API call on second request)
**And** the response metadata includes `cache_hit: true`

### AC2: Cache Invalidation on Mutations
**Given** a cached search result exists
**When** `kb_add`, `kb_update`, or `kb_delete` is called
**Then** the cache is cleared
**And** the next search call hits the database and OpenAI API

### AC3: Cache Respects TTL
**Given** a cached result has exceeded the TTL window
**When** the same query is made
**Then** the cache miss triggers a fresh database + embedding query

### AC4: Cache is Bounded
**Given** more than `KB_CACHE_MAX_ENTRIES` unique queries have been cached
**When** a new query is cached
**Then** the least-recently-used entry is evicted

### AC5: Cache is Configurable
**Given** `KB_CACHE_TTL_MS` and `KB_CACHE_MAX_ENTRIES` environment variables are set
**When** the server starts
**Then** the cache uses those values instead of defaults

## Reuse Plan

- Use `lru-cache` npm package (already common in Node.js ecosystems, lightweight)
- Reuse existing `KB_SEARCH_TIMEOUT_MS` env var pattern for cache config vars
- Reuse correlation ID tracking already in tool-handlers for cache logging

## Test Plan

- Unit test: cache hit returns same result, no embedding call
- Unit test: cache invalidation on mutation
- Unit test: TTL expiry causes cache miss
- Unit test: LRU eviction when max entries exceeded
- Integration test: end-to-end search → mutation → search cycle

## Risks

- **Cache staleness**: If cache TTL is too long, agents may see stale results after bulk imports. Mitigation: default TTL of 5 minutes + clear on all mutations.
- **Memory pressure**: 200 cached search results (each ~10 entries × ~500 bytes) ≈ 1MB max. Acceptable.
