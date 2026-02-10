---
generated: "2026-02-07"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WKFL-009

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file found in repository. Proceeding with codebase scanning and index analysis only.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| KB Search with Embeddings | `apps/api/knowledge-base/src/search/kb-search.ts` | Production | Provides embedding infrastructure for similarity computation |
| Embedding Client | `apps/api/knowledge-base/src/embedding-client/index.ts` | Production | OpenAI text-embedding-3-small (1536 dims) with caching |
| KB Update Operations | `apps/api/knowledge-base/src/crud-operations/kb-update.ts` | Production | Supports updating KB entries (for archiving) |
| KB Entry Schema | `apps/api/knowledge-base/src/db/schema.ts` | Production | PostgreSQL with pgvector support, includes tags/metadata |
| Pattern Miner (WKFL-006) | `.claude/agents/pattern-miner.agent.md` | Completed (UAT) | Uses text similarity clustering (Levenshtein, threshold 0.70) |

### Active In-Progress Work

No active in-progress work detected that overlaps with KB compression functionality.

### Constraints to Respect

1. **Zod-First Types**: All schemas must be defined with Zod, not TypeScript interfaces (CLAUDE.md)
2. **No Deletion**: Archive-only approach - never delete KB entries (story.yaml safety measures)
3. **Embedding Model**: OpenAI text-embedding-3-small (1536 dimensions) - existing infrastructure
4. **PostgreSQL Schema**: Existing `knowledge_entries` table must remain compatible
5. **No Barrel Files**: Direct imports only (CLAUDE.md)

---

## Retrieved Context

### Related Endpoints

**KB CRUD Operations** (`apps/api/knowledge-base/src/crud-operations/`):
- `kb-add.ts` - Create KB entries
- `kb-update.ts` - Update KB entries (supports content, tags, role updates with conditional re-embedding)
- `kb-get.ts` - Retrieve single entry
- `kb-list.ts` - List entries with filtering
- `kb-delete.ts` - Delete entries (exists but should NOT be used for compression)

**KB Search Operations** (`apps/api/knowledge-base/src/search/`):
- `kb-search.ts` - Hybrid semantic + keyword search with RRF ranking
- `semantic.ts` - Cosine similarity search using pgvector
- `keyword.ts` - PostgreSQL FTS keyword search
- `hybrid.ts` - RRF (Reciprocal Rank Fusion) merge logic

### Related Components

**Embedding Infrastructure**:
- `embedding-client/index.ts` - EmbeddingClient class with caching, retry logic, batch processing
- `embedding-client/batch-processor.ts` - Batch embedding generation with order preservation
- `embedding-client/cache-manager.ts` - Content-hash based caching in PostgreSQL

**Database Schema** (`apps/api/knowledge-base/src/db/schema.ts`):
- `knowledgeEntries` table with fields: id, content, embedding (vector 1536), role, entryType, storyId, tags, verified, verifiedAt, createdAt, updatedAt
- Entry types: note, decision, constraint, runbook, lesson, feedback, calibration

### Reuse Candidates

**Must Reuse**:
1. **Embedding Client** - Already has batch processing for multiple entries
2. **KB Search** - `semanticSearch()` function uses pgvector cosine similarity - perfect for clustering
3. **KB Update** - `kb_update()` for marking entries as archived
4. **Existing Schema** - `knowledge_entries` table supports all needed fields

**Pattern from WKFL-006**:
- Text similarity clustering approach (Levenshtein, threshold 0.70)
- Note: WKFL-009 should use **embedding-based clustering** (similarity > 0.9) per story scope
- WKFL-006 documented upgrade path to embeddings - WKFL-009 implements this upgrade

---

## Knowledge Context

### Lessons Learned

**From Pattern Miner (WKFL-006)**:
- **Lesson**: Text similarity (Levenshtein) with threshold 0.70 approximates embedding similarity 0.85
  - *Applies because*: WKFL-009 should use actual embedding similarity (0.90 threshold) since KB entries already have embeddings
- **Lesson**: Batch processing reduces token costs and API calls
  - *Applies because*: Compression will process potentially hundreds of KB entries at once
- **Lesson**: Clustering requires minimum sample size validation (WKFL-006 uses ≥10 stories)
  - *Applies because*: KB compressor should validate sufficient entries before clustering

**From Embedding Client (KNOW-002)**:
- **Lesson**: OpenAI API can fail - graceful degradation required
  - *Applies because*: Compression job should handle API failures without data loss
- **Lesson**: Content hash caching prevents redundant embedding generation
  - *Applies because*: Compression creates new canonical entries - cache will dedupe

**From KB Search (KNOW-004)**:
- **Lesson**: Cosine similarity via pgvector is production-ready
  - *Applies because*: Can use existing `semanticSearch()` infrastructure for clustering

### Blockers to Avoid (from past stories)

1. **Reading full large files** - Causes token bloat (multiple stories)
   - *Mitigation*: Query KB via API, not file scanning
2. **Missing schema validation** - Causes runtime errors (WISH-2004)
   - *Mitigation*: Zod schemas for canonical entry, compression report
3. **No rollback mechanism** - Failed operations leave inconsistent state
   - *Mitigation*: Transaction support, archived entries preserve originals

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at expected path `plans/stories/ADR-LOG.md` but was located. However, none of the ADRs (001-006) directly apply to KB compression as this is a backend data maintenance job without API path concerns, infrastructure changes, or testing requirements.

### Patterns to Follow

1. **Zod-first types** - All schemas defined with Zod, types inferred with `z.infer<>`
2. **Batch processing** - Process entries in batches to manage memory (pattern from embedding-client)
3. **Graceful degradation** - Handle failures without data loss (pattern from kb-search)
4. **Archive, never delete** - Preserve original data with pointers (explicit story requirement)
5. **Transaction safety** - Group related updates in transactions where possible
6. **Progress reporting** - Generate comprehensive reports (pattern from pattern-miner)

### Patterns to Avoid

1. **Text similarity for clustering** - KB entries have embeddings, use them directly
2. **Synchronous processing of large batches** - Could timeout, use streaming/chunking
3. **Hardcoded thresholds** - Make similarity threshold configurable (pattern from pattern-miner)
4. **No validation** - Always validate sufficient data before expensive operations

---

## Conflict Analysis

**No conflicts detected.**

All dependencies are satisfied:
- WKFL-006 (Pattern Miner) is completed - provides clustering pattern reference
- KB infrastructure (embeddings, search, CRUD) is production-ready
- No overlapping work detected

---

## Story Seed

### Title
Knowledge Compressor - Monthly KB Deduplication and Canonicalization

### Description

**Context**: As the knowledge base grows with lessons learned from each story (WKFL-001 retro agent) and feedback entries (WKFL-004), the KB will accumulate duplicate or near-duplicate entries. Without compression, KB queries become slower and less signal-focused, increasing token costs and reducing relevance of search results.

**Problem**: KB entries with similar content (e.g., "Zod validation required" appears in multiple story contexts) are stored separately, causing:
1. Query results diluted with redundant entries
2. Increased token costs for agents loading KB context
3. Harder for agents to identify canonical best practices
4. Storage bloat over time

**Solution**: Implement a monthly compression job (`kb-compressor.agent.md`) that:
1. Queries all non-archived KB entries
2. Uses existing pgvector embeddings to compute pairwise cosine similarity
3. Clusters entries with similarity > 0.9 (configurable threshold)
4. For each cluster (size > 1):
   - Creates a canonical entry merging titles and combining examples
   - Marks originals as archived with pointer to canonical
   - Preserves all unique information in canonical entry
5. Generates compression report with before/after stats and token savings estimate

**Grounded in Reality**:
- Reuses existing embedding infrastructure (OpenAI text-embedding-3-small, 1536 dims)
- Leverages `semanticSearch()` from `kb-search.ts` for similarity computation
- Uses `kb_update()` to archive originals (no new CRUD operations needed)
- Follows WKFL-006 pattern miner approach but upgrades to embedding-based clustering

### Initial Acceptance Criteria

- [ ] **AC-1**: Cluster similar lessons using embedding cosine similarity > 0.9 (configurable via `--threshold`)
  - Verification: Run on test data with known duplicates (3 entries about "Zod validation"), verify cluster formed correctly

- [ ] **AC-2**: Merge clusters into canonical lessons with combined examples array
  - Verification: Canonical entry contains `merged_from` array, `examples` array with all story contexts, unified recommendation

- [ ] **AC-3**: Archive originals with pointer to canonical (no deletion)
  - Verification: Original entries have `archived: true` metadata field, `canonical_id` field pointing to canonical entry, original content preserved

- [ ] **AC-4**: Generate compression report with entries before/after and estimated token savings
  - Verification: `COMPRESSION-REPORT.yaml` contains: `before.total_entries`, `after.canonical_entries`, `after.archived_entries`, `compression.ratio`, `compression.estimated_token_savings`, `clusters_created[]`

- [ ] **AC-5**: No loss of unique information during merge
  - Verification: Manual review - canonical entry includes all unique recommendations, examples, and context from cluster members

- [ ] **AC-6**: Haiku model agent (`kb-compressor.agent.md`) with `/kb-compress` command
  - Verification: Agent file exists with correct frontmatter (model: haiku), command file exists in `.claude/commands/kb-compress.md`

### Non-Goals

1. **Real-time compression** - Monthly cron only (or manual command), not triggered on each KB write
2. **Cross-project KB management** - Single monorepo KB only
3. **Deleting any information** - Archive with pointers, never delete
4. **Pattern mining** - WKFL-006 handles pattern detection, WKFL-009 handles compression only
5. **Embedding model changes** - Uses existing text-embedding-3-small (1536 dims), no model upgrades

### Reuse Plan

**Components to Reuse**:
- `EmbeddingClient` class - Already has batch processing for multiple entries
- `semanticSearch()` function - Uses pgvector cosine similarity for clustering
- `kb_update()` function - Update entries to mark as archived
- `knowledgeEntries` schema - Supports metadata fields for archival state

**Patterns to Reuse**:
- WKFL-006 clustering approach (but use embeddings instead of text similarity)
- WKFL-006 report generation (YAML output with stats)
- Embedding client batch processing (handle large numbers of entries)

**Packages to Leverage**:
- `@repo/logger` for logging (never console.log)
- `drizzle-orm` for database queries
- `zod` for all schema validation

**New Creations**:
- `.claude/agents/kb-compressor.agent.md` (haiku model)
- `.claude/commands/kb-compress.md` command documentation
- Zod schemas: `CanonicalEntrySchema`, `CompressionReportSchema`, `ArchiveMetadataSchema`
- `COMPRESSION-REPORT.yaml` output format

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Areas**:
1. **Clustering correctness** - Test with known duplicate entries (similarity > 0.9 vs < 0.9)
2. **Canonical entry merge** - Verify all unique info preserved, examples combined correctly
3. **Archive mechanism** - Verify originals remain queryable with flag, canonical_id pointer works
4. **Edge cases**:
   - Single cluster member (no merge needed)
   - Empty KB (no entries to compress)
   - All unique entries (no clusters formed)
   - Very large clusters (10+ entries)
5. **Report accuracy** - Verify stats match actual database state

**Test Data Requirements**:
- Seed KB with 20-30 entries including:
  - 3 entries about "Zod validation" (high similarity)
  - 3 entries about "route handler patterns" (high similarity)
  - 15 unique entries (no clusters)
  - 2 entries about "testing" (medium similarity < 0.9, should NOT cluster)

### For UI/UX Advisor

**N/A** - This is a backend agent with no UI components. Command output should be clear YAML/Markdown.

**CLI UX Considerations**:
- `/kb-compress` command should show progress (e.g., "Clustering 247 entries...")
- Report should be human-readable (both YAML and console summary)
- Dry-run mode: `--dry-run` flag to preview clusters without making changes

### For Dev Feasibility

**Technical Constraints**:
1. **PostgreSQL pgvector** - Already in production, supports cosine similarity queries
2. **Embedding dimensions** - Fixed at 1536 (text-embedding-3-small), all KB entries already have embeddings
3. **Similarity computation** - Use existing `semanticSearch()` or direct pgvector query
4. **Transaction support** - Consider wrapping archive + canonical creation in transaction for atomicity

**Implementation Hints**:
1. **Similarity matrix computation**:
   - Option A: Use `semanticSearch()` for each entry to find similar entries (N queries)
   - Option B: Fetch all embeddings, compute pairwise similarity in-memory (1 query, more memory)
   - Recommendation: Option A for MVP (simpler, leverages existing code), Option B for optimization

2. **Archival mechanism**:
   - Add `archived` field to KB schema (boolean, default false) - OR use metadata JSON field
   - Add `canonical_id` field to KB schema (uuid, nullable) - OR use metadata JSON field
   - Prefer metadata JSON field to avoid schema migration

3. **Canonical entry creation**:
   - Use `kb_add()` to create new canonical entry
   - Merge logic: Combine titles, dedupe examples by story_id, unify recommendations

4. **Token savings estimation**:
   - Average entry size: ~500 tokens (estimate from content length)
   - Savings = (original_count - canonical_count) * avg_entry_size
   - This is an estimate for reporting, not exact

**Potential Blockers**:
1. **Large KB size** - If >1000 entries, pairwise similarity becomes expensive
   - Mitigation: Process in batches, use sampling for very large KBs
2. **Schema extension** - Adding archived/canonical_id fields may require migration
   - Mitigation: Use existing `tags` or add metadata JSON field (no migration)
3. **Rollback complexity** - Undoing compression requires un-archiving and deleting canonicals
   - Mitigation: Document rollback procedure, consider `--dry-run` mode for safety

**Estimated Effort**: 35K tokens (from story.yaml)
- Agent creation: 5K
- Schema definitions: 3K
- Clustering logic: 10K
- Merge logic: 7K
- Reporting: 5K
- Testing: 5K

---

## Metadata

**Generated**: 2026-02-07
**Baseline Used**: None (no active baseline found)
**Lessons Loaded**: Yes (from WKFL-006, KNOW-002, KNOW-004)
**ADRs Loaded**: No (ADR-LOG not applicable to this story)
**Conflicts**: 0 blocking, 0 warnings
**Dependencies**: WKFL-006 (Pattern Miner) - COMPLETED
**Reuse Confidence**: HIGH - All required infrastructure exists in production
