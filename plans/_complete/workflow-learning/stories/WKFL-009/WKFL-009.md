# WKFL-009: Knowledge Compressor - Monthly KB Deduplication and Canonicalization

**Status**: `elaboration`
**Priority**: P2 (Adaptation)
**Epic**: workflow-learning
**Dependencies**: WKFL-006 (Pattern Miner - COMPLETED)
**Estimated Tokens**: 35,000
**Created**: 2026-02-06
**Tags**: adaptation, kb, compression, maintenance

---

## Context

As the knowledge base grows with lessons learned from each story (WKFL-001 retro agent) and feedback entries (WKFL-004), the KB will accumulate duplicate or near-duplicate entries. Without compression, KB queries become slower and less signal-focused, increasing token costs and reducing relevance of search results.

**Problem**: KB entries with similar content (e.g., "Zod validation required" appears in multiple story contexts) are stored separately, causing:
1. Query results diluted with redundant entries
2. Increased token costs for agents loading KB context
3. Harder for agents to identify canonical best practices
4. Storage bloat over time

**Grounded in Reality**:
- **Existing Infrastructure**: KB already has embeddings (OpenAI text-embedding-3-small, 1536 dims), pgvector support, and semantic search capability
- **Related Work**: WKFL-006 (Pattern Miner) demonstrated text similarity clustering with threshold 0.70; WKFL-009 upgrades to embedding-based clustering with threshold 0.90
- **Production-Ready Components**: `EmbeddingClient`, `semanticSearch()`, `kb_update()`, and `knowledgeEntries` schema all in production

---

## Goal

Keep the KB lean and high-signal by implementing a monthly compression job that:

1. **Clusters similar KB entries** using existing pgvector embeddings (cosine similarity > 0.9, configurable threshold)
2. **Merges clusters into canonical entries** that preserve all unique information with combined examples
3. **Archives original entries** with pointers to canonical (never deletes)
4. **Generates compression reports** with before/after stats and token savings estimates

**Success Metrics**:
- Compression ratio: 30-40% of original entry count (based on typical duplication patterns)
- Token savings: ~40-50% reduction in KB query token costs
- Zero information loss: All unique details preserved in canonical entries

---

## Non-Goals

1. **Real-time compression** - Monthly cron only (or manual `/kb-compress` command), not triggered on each KB write
2. **Cross-project KB management** - Single monorepo KB only
3. **Deleting any information** - Archive with pointers, never delete
4. **Pattern mining** - WKFL-006 handles pattern detection, WKFL-009 handles compression only
5. **Embedding model changes** - Uses existing text-embedding-3-small (1536 dims), no model upgrades
6. **Protected features** (from baseline):
   - Existing KB schema structure
   - Embedding infrastructure (OpenAI integration)
   - Search functionality

---

## Scope

### In Scope

**Agent & Command**:
- `.claude/agents/kb-compressor.agent.md` (haiku model)
- `.claude/commands/kb-compress.md` command documentation
- Command flags: `--threshold` (default 0.9), `--dry-run`, `--days` (look-back window)

**Core Functionality**:
- Query all non-archived KB entries via existing CRUD operations
- Compute pairwise similarity using existing `semanticSearch()` infrastructure
- Cluster entries with similarity > threshold (default 0.9)
- Create canonical entries via `kb_add()` with merged content
- Archive originals via `kb_update()` with metadata pointers

**Schemas (Zod-first)**:
- `CanonicalEntrySchema` - Structure for merged entries
- `ArchiveMetadataSchema` - Metadata for archived entries
- `CompressionReportSchema` - Report output format

**Outputs**:
- `COMPRESSION-REPORT.yaml` - Stats, clusters, token savings

### Out of Scope

- Deleting KB entries (use archive mechanism only)
- Real-time compression triggers
- Cross-repository KB management
- Pattern detection (handled by WKFL-006)
- Embedding model upgrades

---

## Acceptance Criteria

### AC-1: Cluster similar lessons using embedding cosine similarity > 0.9
**Verification**: Run on test data with known duplicates (3 entries about "Zod validation"), verify cluster formed correctly with similarity scores logged.

**Test Data**:
```yaml
entries:
  - id: kb-lesson-015
    content: "Always use Zod validation in route handlers"
    story: WISH-031
  - id: kb-lesson-089
    content: "Require Zod schema validation at API boundaries"
    story: AUTH-015
  - id: kb-lesson-123
    content: "Add Zod validation to all POST/PUT endpoints"
    story: SET-042
```

**Expected**: Cluster formed with 3 members, similarity > 0.9 between each pair.

---

### AC-2: Merge clusters into canonical lessons with combined examples
**Verification**: Canonical entry contains `merged_from` array, `examples` array with all story contexts, unified recommendation.

**Expected Canonical Entry**:
```yaml
type: lesson
id: kb-canonical-042
canonical: true
merged_from: [kb-lesson-015, kb-lesson-089, kb-lesson-123]
title: "Zod validation required at API boundaries"
recommendation: "Always add Zod schema validation in route handlers for POST/PUT endpoints"
examples:
  - story: WISH-031
    context: "Missing validation on POST /wishlist"
  - story: AUTH-015
    context: "Missing validation on POST /login"
  - story: SET-042
    context: "Missing validation on PUT /sets/:id"
tags: [canonical, validation, api, zod]
```

---

### AC-3: Archive originals with pointer to canonical (no deletion)
**Verification**: Original entries have `archived: true` metadata field, `canonical_id` field pointing to canonical entry, original content preserved.

**Expected Archived Entry**:
```yaml
id: kb-lesson-015
archived: true
archived_at: 2026-02-28T10:00:00Z
canonical_id: kb-canonical-042
# Original content preserved below:
title: "Always use Zod validation in route handlers"
content: "..."
story: WISH-031
```

**Test**: Query for archived entries with `WHERE metadata->>'archived' = 'true'`, verify all have `canonical_id`.

---

### AC-4: Generate compression report with entries before/after and estimated token savings
**Verification**: `COMPRESSION-REPORT.yaml` contains: `before.total_entries`, `after.canonical_entries`, `after.archived_entries`, `compression.ratio`, `compression.estimated_token_savings`, `clusters_created[]`.

**Expected Report Structure**:
```yaml
run_date: 2026-02-28
threshold: 0.90

before:
  total_entries: 847
  lessons: 623
  decisions: 142
  feedback: 82

after:
  total_entries: 312
  canonical_entries: 312
  archived_entries: 535

compression:
  ratio: 0.37  # 37% of original count
  estimated_token_savings: 245000  # (847 - 312) * 500 avg tokens

clusters_created:
  - id: kb-canonical-042
    size: 3
    topic: "Zod validation at boundaries"
    members: [kb-lesson-015, kb-lesson-089, kb-lesson-123]

  - id: kb-canonical-043
    size: 5
    topic: "Route handler length limits"
    members: [...]

no_cluster:
  count: 178
  reason: "Unique entries, no similar content"
```

**Test**: Verify counts match database state, token savings = (before - after) * avg_entry_size.

---

### AC-5: No loss of unique information during merge
**Verification**: Automated test with manual spot-check fallback. Canonical entry includes all unique recommendations, examples, and context from cluster members.

**Process**:
1. **Automated verification** (primary):
   - Extract unique content elements from cluster members: recommendations, examples, contexts, tags
   - Parse canonical entry content and verify ALL unique elements present
   - Use content similarity matching (threshold > 0.85) or exact string matching
   - FAIL if any unique recommendation, example, or tag missing from canonical
2. **Manual spot-check** (secondary):
   - QA agent reviews 5 random canonical entries per compression run
   - Uses checklist: All recommendations present? All examples present? All tags present? Content coherent?
   - FAIL if >20% of spot-checks find missing information

**Pass/Fail Criteria**:
- PASS: Automated test shows 100% unique content preservation AND manual spot-check <20% issues
- FAIL: Any unique recommendation/example/tag missing OR manual spot-check >20% issues

**Test Cases**:
- Cluster with identical content → single recommendation (PASS: no unique content lost)
- Cluster with varying examples → all examples in canonical (PASS: all examples present)
- Cluster with different tags → union of all tags in canonical (PASS: all tags present)
- Cluster with different recommendations → merged recommendation covering all cases (PASS: all recommendations addressed)

_Updated by autonomous elaboration to add concrete verification criteria_

---

### AC-6: Haiku model agent with `/kb-compress` command
**Verification**: Agent file exists with correct frontmatter (model: haiku), command file exists in `.claude/commands/kb-compress.md`.

**Agent Frontmatter Requirements**:
```yaml
model: haiku
type: worker
permission_level: kb-write
spawned_by: [manual, cron]
```

**Command Usage**:
```bash
/kb-compress                    # Run with defaults (threshold 0.9, no dry-run)
/kb-compress --threshold 0.85   # Lower threshold for more aggressive clustering
/kb-compress --dry-run          # Preview clusters without making changes
/kb-compress --days 90          # Only consider entries from last 90 days
```

**Test**: Run `/kb-compress --help` to verify command registered.

---

### AC-7: Schema migration adds archival columns
**Verification**: Database schema updated with archival support columns, migration SQL executed successfully.

**Required Schema Changes** (apps/api/knowledge-base/src/db/schema.ts):
- Add `archived: boolean('archived').default(false).notNull()`
- Add `archivedAt: timestamp('archived_at')`
- Add `canonicalId: uuid('canonical_id').references(() => knowledgeEntries.id)`
- Add `isCanonical: boolean('is_canonical').default(false).notNull()`

**Migration Verification**:
```sql
-- Test schema exists
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'knowledge_entries'
  AND column_name IN ('archived', 'archived_at', 'canonical_id', 'is_canonical');

-- Expected: 4 rows returned
```

**CRUD Integration**:
- `kb_update` function accepts archived, archivedAt, canonicalId, isCanonical parameters
- `KbUpdateInputSchema` includes optional fields for archival columns

**Test Cases**:
- Insert entry with `is_canonical = true` → succeeds
- Update entry to `archived = true, archived_at = NOW(), canonical_id = <uuid>` → succeeds
- Query `WHERE archived = false` → returns only non-archived entries
- Query `WHERE is_canonical = true` → returns only canonical entries

_Added by autonomous elaboration to resolve MVP-critical schema gap_

---

## Reuse Plan

### Must Reuse (Existing Infrastructure)

**Embedding Infrastructure**:
- `apps/api/knowledge-base/src/embedding-client/index.ts` - `EmbeddingClient` class
  - Already has batch processing for multiple entries
  - Content-hash based caching in PostgreSQL
  - Handles OpenAI API failures gracefully

**Search Infrastructure**:
- `apps/api/knowledge-base/src/search/semantic.ts` - `semanticSearch()` function
  - Uses pgvector cosine similarity (exactly what we need for clustering)
  - Returns similarity scores with results
  - Production-tested with 1536-dim embeddings

**CRUD Operations**:
- `apps/api/knowledge-base/src/crud-operations/kb-update.ts` - `kb_update()` function
  - Supports metadata updates for archival state
  - Conditional re-embedding (skip for archived entries)
- `apps/api/knowledge-base/src/crud-operations/kb-add.ts` - `kb_add()` function
  - Create canonical entries with proper schema

**Database Schema**:
- `apps/api/knowledge-base/src/db/schema.ts` - `knowledgeEntries` table
  - Already supports `tags` (string[]) for metadata
  - Has `metadata` JSONB field for additional fields (archived, canonical_id)
  - No schema migration needed

### Patterns to Reuse

**From WKFL-006 (Pattern Miner)**:
- Clustering approach (upgrade text similarity to embeddings)
- Report generation (YAML output with stats)
- Configurable thresholds (--threshold flag)
- Minimum sample size validation (skip if < 10 entries)

**From Embedding Client**:
- Batch processing to handle large numbers of entries
- Graceful degradation on API failures
- Content hash caching

**From KB Search**:
- Cosine similarity computation via pgvector
- Result ranking by similarity score

### New Creations

**Agent & Command**:
- `.claude/agents/kb-compressor.agent.md` (haiku model, ~500 lines)
- `.claude/commands/kb-compress.md` (command documentation)

**Zod Schemas** (in agent file or shared types):
- `CanonicalEntrySchema` - Merged entry structure with `merged_from`, `examples`, unified recommendation
- `ArchiveMetadataSchema` - Metadata for archived entries (archived: true, canonical_id, archived_at)
- `CompressionReportSchema` - Report output format (before, after, compression stats, clusters)

**Compression Logic**:
- Pairwise similarity computation (Option A: N queries via semanticSearch, Option B: in-memory matrix)
- Clustering algorithm (union-find or simple grouping)
- Merge logic (combine titles, dedupe examples by story_id, unify recommendations)
- Token savings estimation (entries_removed * avg_entry_size)

---

## Architecture Notes

### Compression Algorithm

**Phase 1: Query Entries**
```typescript
// Query all non-archived KB entries
const entries = await db
  .select()
  .from(knowledgeEntries)
  .where(sql`metadata->>'archived' IS NULL OR metadata->>'archived' = 'false'`)
```

**Phase 2: Compute Similarity**

**AUTONOMOUS DECISION - Similarity Computation: Option A (MVP)**

**Option A (MVP)** - SELECTED: Use existing `semanticSearch()` for each entry
```typescript
// For each entry, find similar entries
for (const entry of entries) {
  const similar = await semanticSearch({
    query: entry.content,
    threshold: 0.9,
    limit: 100
  })
  // Build similarity matrix
}
```

**Option B (Future Optimization)**: Fetch all embeddings, compute in-memory
```typescript
// Fetch all embeddings
const embeddings = entries.map(e => e.embedding)
// Compute pairwise cosine similarity
const similarityMatrix = computeCosineSimilarity(embeddings)
// Cluster using threshold
const clusters = clusterBySimilarity(similarityMatrix, threshold)
```

**Rationale for Option A**:
- Leverages existing, tested semanticSearch infrastructure
- Simpler implementation (no new vector math library)
- Sufficient for MVP KB size (<500 entries expected)
- Option B deferred to future optimization (logged as KB finding)

_Updated by autonomous elaboration to commit to MVP approach_

**Phase 3: Cluster Entries**

Use union-find or simple grouping:
```typescript
// Group entries by similarity
const clusters: Map<string, Set<string>> = new Map()
for (const [entryA, entryB, similarity] of similarityPairs) {
  if (similarity > threshold) {
    // Add to same cluster
  }
}
```

**Phase 4: Create Canonical Entries**

For each cluster with size > 1:
```typescript
const canonical = {
  type: 'lesson',
  isCanonical: true,  // Using dedicated column
  merged_from: cluster.map(e => e.id),  // Store as JSON array in content metadata
  title: mergeTitle(cluster),
  recommendation: mergeRecommendations(cluster),
  examples: cluster.flatMap(e => ({
    story: e.storyId,
    context: e.context
  })),
  tags: Array.from(new Set(cluster.flatMap(e => e.tags)))
}

await kb_add(canonical)
```

**AUTONOMOUS DECISION - Canonical Entry ID Format: UUID (Default)**

Canonical entry IDs will use standard UUID generation (existing kb_add behavior).
- Example: `550e8400-e29b-41d4-a716-446655440000`
- NOT custom format like `kb-canonical-042` (requires sequence tracking)
- Rationale: Simpler, leverages existing ID generation, no sequence management needed
- Custom IDs logged as future enhancement if human-readable IDs become requirement

_Updated by autonomous elaboration to commit to ID format_

**Phase 5: Archive Originals**

```typescript
for (const entry of cluster) {
  await kb_update({
    id: entry.id,
    archived: true,  // Using dedicated column
    archivedAt: new Date(),
    canonicalId: canonical.id  // UUID reference
  })
}
```

_Updated to use dedicated columns instead of metadata field_

**Phase 6: Generate Report**

```typescript
const report = {
  run_date: new Date().toISOString(),
  threshold,
  before: { total_entries, lessons, decisions, feedback },
  after: { total_entries, canonical_entries, archived_entries },
  compression: {
    ratio: canonical_entries / total_entries,
    estimated_token_savings: (total_entries - canonical_entries) * 500
  },
  clusters_created: clusters.map(c => ({
    id: c.canonical.id,
    size: c.members.length,
    topic: extractTopic(c),
    members: c.members.map(e => e.id)
  }))
}
```

### Database Schema Extensions

**AUTONOMOUS DECISION - Archival Mechanism: Option C (Dedicated Columns)**

Analysis identified that `knowledge_entries` table lacks metadata JSONB field referenced in story. Three options evaluated:
- Option A: Add metadata JSONB column (requires schema migration)
- Option B: Use existing tags array (lose type safety, complex queries)
- **Option C: Add dedicated columns** (SELECTED - best type safety and queryability)

**Schema Migration Required** (apps/api/knowledge-base/src/db/schema.ts):
```typescript
// Add to knowledgeEntries table
export const knowledgeEntries = pgTable('knowledge_entries', {
  // ... existing fields ...
  archived: boolean('archived').default(false).notNull(),
  archivedAt: timestamp('archived_at'),
  canonicalId: uuid('canonical_id').references(() => knowledgeEntries.id),
  isCanonical: boolean('is_canonical').default(false).notNull(),
})
```

**Migration SQL**:
```sql
-- Add archival columns
ALTER TABLE knowledge_entries
  ADD COLUMN archived BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN archived_at TIMESTAMP,
  ADD COLUMN canonical_id UUID REFERENCES knowledge_entries(id),
  ADD COLUMN is_canonical BOOLEAN DEFAULT false NOT NULL;

-- Create index for compression queries
CREATE INDEX idx_entries_archived ON knowledge_entries(archived) WHERE archived = false;
CREATE INDEX idx_entries_canonical ON knowledge_entries(is_canonical) WHERE is_canonical = true;
```

**Rationale**:
- Type-safe: Boolean/UUID types instead of JSONB strings
- Queryable: Direct column filtering (faster than JSONB extraction)
- No metadata field dependency: Works with current schema structure
- Rollback-friendly: Can drop columns if needed

**Query Patterns**:
```sql
-- Find all archived entries
SELECT * FROM knowledge_entries WHERE archived = true;

-- Find canonical entry for archived entry
SELECT * FROM knowledge_entries WHERE id = (
  SELECT canonical_id FROM knowledge_entries WHERE id = 'kb-lesson-015'
);

-- Find all non-archived entries for compression
SELECT * FROM knowledge_entries WHERE archived = false;

-- Find all canonical entries
SELECT * FROM knowledge_entries WHERE is_canonical = true;
```

**kb_update Schema Extension Required**:
```typescript
// Update KbUpdateInputSchema in crud-operations/schemas.ts
export const KbUpdateInputSchema = z.object({
  // ... existing fields ...
  archived: z.boolean().optional(),
  archivedAt: z.date().optional(),
  canonicalId: z.string().uuid().optional(),
  isCanonical: z.boolean().optional(),
})
```

_Added by autonomous elaboration to resolve schema field missing and archive mechanism decision_

### Merge Logic Details

**Title Merging**:
```typescript
function mergeTitle(cluster: Entry[]): string {
  // Find longest common substring or most frequent terms
  // Example: ["Zod validation required", "Add Zod validation", "Use Zod validation"]
  // Result: "Zod validation required at API boundaries"
  const titles = cluster.map(e => e.title)
  return extractCanonicalTitle(titles)
}
```

**Recommendation Merging**:
```typescript
function mergeRecommendations(cluster: Entry[]): string {
  // Combine unique recommendations, preserving all details
  // If recommendations identical → use one
  // If recommendations differ → create comprehensive version
  const recommendations = cluster.map(e => e.recommendation)
  return unifyRecommendations(recommendations)
}
```

**Examples Deduplication**:
```typescript
function dedupeExamples(cluster: Entry[]): Example[] {
  const seen = new Set<string>()
  return cluster.flatMap(e => e.examples || [e]).filter(ex => {
    const key = `${ex.story}-${ex.context}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

### Token Savings Estimation

```typescript
// Average entry size based on typical KB entries
const AVG_ENTRY_SIZE = 500 // tokens

// Estimate savings
const entriesRemoved = before.total_entries - after.canonical_entries
const estimatedTokenSavings = entriesRemoved * AVG_ENTRY_SIZE

// Conservative estimate (40-50% of theoretical max)
const conservativeSavings = estimatedTokenSavings * 0.45
```

### Error Handling & Safety

**Transaction Safety**:
```typescript
// Wrap canonical creation + archival in transaction
await db.transaction(async tx => {
  const canonical = await kb_add(canonicalEntry, { tx })
  for (const entry of cluster) {
    await kb_update({
      id: entry.id,
      metadata: { archived: true, canonical_id: canonical.id }
    }, { tx })
  }
})
```

**Rollback Procedure**:
```typescript
// To rollback compression run:
// 1. Unarchive all entries from run
UPDATE knowledge_entries
SET metadata = metadata - 'archived' - 'archived_at' - 'canonical_id'
WHERE metadata->>'archived_at' BETWEEN '2026-02-28' AND '2026-03-01';

// 2. Delete canonical entries created in run
DELETE FROM knowledge_entries
WHERE metadata->>'canonical' = 'true'
  AND created_at BETWEEN '2026-02-28' AND '2026-03-01';
```

**Graceful Degradation**:
```typescript
// If semanticSearch fails, fall back to basic deduplication
try {
  clusters = await clusterBySimilarity(entries, threshold)
} catch (error) {
  logger.warn('Semantic clustering failed, falling back to exact match deduplication')
  clusters = await clusterByExactMatch(entries)
}
```

---

## Infrastructure Notes

### PostgreSQL pgvector

**Already in Production**:
- Extension installed and configured
- `knowledge_entries.embedding` column is `vector(1536)`
- Cosine similarity operator `<=>` available

**Query Performance**:
- For ~1000 entries: pairwise similarity = 1M comparisons
- Option A (N queries): ~1000 queries, each returns top 100 similar
- Option B (fetch all + compute): 1 query, in-memory computation

**Optimization Path**:
- MVP: Option A with rate limiting to avoid overwhelming DB
- Future: Option B with efficient vector library (e.g., FAISS)

### OpenAI Embedding API

**Not Needed for Compression** (entries already have embeddings):
- Canonical entries will need new embeddings (via EmbeddingClient)
- Original entries already embedded (no re-embedding)

**Canonical Entry Embedding**:
```typescript
const canonical = {
  content: mergedContent,
  // ... other fields
}

// EmbeddingClient automatically generates embedding via kb_add
await kb_add(canonical)
```

### Cron Job Configuration (Future)

**Monthly Schedule** (outside scope, documented for reference):
```yaml
# .github/workflows/kb-compress.yml
name: KB Compression
on:
  schedule:
    - cron: '0 2 1 * *'  # 2 AM on 1st of each month
jobs:
  compress:
    runs-on: ubuntu-latest
    steps:
      - run: claude-cli /kb-compress
```

**Manual Trigger** (MVP):
```bash
/kb-compress
```

---

## Test Plan

### Unit Tests

**Test Suite 1: Clustering Algorithm**

1. **Test: Identical entries cluster together**
   - Input: 2 entries with identical content
   - Expected: 1 cluster with 2 members, similarity = 1.0

2. **Test: Similar entries cluster (similarity > threshold)**
   - Input: 3 entries about Zod validation (similarity ~0.92)
   - Threshold: 0.9
   - Expected: 1 cluster with 3 members

3. **Test: Dissimilar entries do not cluster (similarity < threshold)**
   - Input: 2 entries, one about Zod, one about testing (similarity ~0.3)
   - Threshold: 0.9
   - Expected: 2 clusters, each with 1 member (no merge)

4. **Test: Edge case - all entries unique**
   - Input: 20 unique entries (all similarity < 0.5)
   - Expected: 20 clusters, no merges, report shows "no_cluster: count: 20"

5. **Test: Edge case - empty KB**
   - Input: 0 entries
   - Expected: Early return, report shows "No entries to compress"

6. **Test: Edge case - insufficient entries**
   - Input: 5 entries (below min threshold of 10)
   - Expected: Early return, report shows "Insufficient entries (min 10)"

**Test Suite 2: Canonical Entry Merge**

7. **Test: Merge titles correctly**
   - Input: ["Zod validation required", "Use Zod validation", "Add Zod validation"]
   - Expected: "Zod validation required at API boundaries" (or similar canonical form)

8. **Test: Merge recommendations (identical)**
   - Input: 3 entries with identical recommendation text
   - Expected: Single recommendation in canonical

9. **Test: Merge recommendations (different)**
   - Input: 3 entries with varying recommendations
   - Expected: Unified recommendation covering all cases

10. **Test: Combine examples without duplication**
    - Input: 3 entries, 2 from same story with similar context
    - Expected: Examples array with unique story-context pairs only

11. **Test: Merge tags (union)**
    - Input: Entry A tags: [validation, api], Entry B tags: [api, zod]
    - Expected: Canonical tags: [validation, api, zod]

**Test Suite 3: Archive Mechanism**

12. **Test: Original entries marked as archived**
    - Action: Create cluster, run compression
    - Expected: Original entries have `metadata.archived = true`

13. **Test: Archived entries have canonical_id pointer**
    - Action: Create cluster, run compression
    - Expected: `metadata.canonical_id` points to canonical entry ID

14. **Test: Archived entries preserve original content**
    - Action: Archive entry
    - Expected: All fields (title, content, story, tags) unchanged except metadata

15. **Test: Archived entries excluded from future compression runs**
    - Action: Run compression twice
    - Expected: Second run skips entries archived in first run

**Test Suite 4: Report Generation**

16. **Test: Report shows correct before/after counts**
    - Setup: 100 entries, 30 cluster into 10 canonical
    - Expected: before.total = 100, after.canonical = 80 (70 unique + 10 canonical), after.archived = 30

17. **Test: Compression ratio calculated correctly**
    - Setup: 100 → 80 entries
    - Expected: ratio = 0.80

18. **Test: Token savings estimated**
    - Setup: 20 entries removed (100 → 80)
    - Expected: estimated_token_savings = 20 * 500 = 10,000

19. **Test: Clusters listed with details**
    - Setup: 2 clusters created
    - Expected: `clusters_created` array with id, size, topic, members for each

20. **Test: No-cluster entries counted**
    - Setup: 70 unique entries (no clusters)
    - Expected: `no_cluster.count = 70`

### Integration Tests

**Test Suite 5: End-to-End Compression**

21. **Test: Full compression run (happy path)**
    - Setup: Seed KB with 30 entries (10 clusters of 3 each)
    - Action: Run `/kb-compress`
    - Expected:
      - 10 canonical entries created
      - 30 original entries archived
      - Report generated with correct stats
      - All canonical entries have embeddings

22. **Test: Dry-run mode (no changes)**
    - Setup: Seed KB with 10 entries
    - Action: Run `/kb-compress --dry-run`
    - Expected:
      - Report shows predicted clusters
      - No entries created or archived
      - KB state unchanged

23. **Test: Custom threshold**
    - Setup: Seed KB with entries of varying similarity
    - Action: Run `/kb-compress --threshold 0.85`
    - Expected: More aggressive clustering (lower threshold = more clusters)

24. **Test: Time window filter**
    - Setup: Seed KB with entries from last 30 days and 90 days ago
    - Action: Run `/kb-compress --days 60`
    - Expected: Only entries from last 60 days considered

**Test Suite 6: Error Handling**

25. **Test: Graceful handling of DB connection failure**
    - Setup: Disconnect DB mid-run
    - Expected: Error logged, transaction rolled back, no partial state

26. **Test: Graceful handling of embedding API failure (canonical creation)**
    - Setup: Mock OpenAI API to fail
    - Expected: Canonical entry creation fails, transaction rolled back, originals not archived

27. **Test: Rollback mechanism**
    - Setup: Run compression, then rollback
    - Action: Unarchive entries, delete canonicals
    - Expected: KB state restored to pre-compression

### Manual Verification Tests

**Test Suite 7: Information Preservation**

28. **Test: No unique information lost**
    - Setup: Create cluster with varying examples and recommendations
    - Action: Run compression
    - Verification: Manual diff of cluster members vs canonical entry
    - Expected: All unique recommendations, examples, contexts present in canonical

29. **Test: Canonical entry is semantically correct**
    - Setup: Run compression on real KB data
    - Verification: Human review of 5 random canonical entries
    - Expected: Merged content makes sense, no conflicting information

### Performance Tests

**Test Suite 8: Scalability**

30. **Test: Large KB (1000 entries)**
    - Setup: Seed KB with 1000 entries
    - Action: Run `/kb-compress`
    - Expected: Completes in < 5 minutes, no timeout

31. **Test: Very large cluster (10+ members)**
    - Setup: Create cluster with 15 similar entries
    - Action: Run compression
    - Expected: Canonical entry created correctly, all members archived

### Test Data Requirements

**Seed Data for Tests**:
```yaml
# High similarity cluster (Zod validation)
- id: kb-lesson-001
  content: "Always use Zod validation in route handlers"
  story: WISH-031
  tags: [validation, api]

- id: kb-lesson-002
  content: "Require Zod schema validation at API boundaries"
  story: AUTH-015
  tags: [validation, zod]

- id: kb-lesson-003
  content: "Add Zod validation to all POST/PUT endpoints"
  story: SET-042
  tags: [api, zod]

# High similarity cluster (Route handler patterns)
- id: kb-lesson-004
  content: "Keep route handlers under 50 lines"
  story: WISH-040
  tags: [patterns, refactoring]

- id: kb-lesson-005
  content: "Route handlers should be max 50 LOC"
  story: AUTH-020
  tags: [patterns, api]

- id: kb-lesson-006
  content: "Limit route handler length to 50 lines"
  story: SET-050
  tags: [refactoring, api]

# Unique entries (no clusters)
- id: kb-lesson-007
  content: "Use Playwright for E2E tests"
  story: TEST-001
  tags: [testing, e2e]

- id: kb-lesson-008
  content: "Logger package for all logging"
  story: LOG-002
  tags: [logging, infrastructure]

# ... 12 more unique entries
```

---

## Reality Baseline

### Existing Features Referenced

**KB Infrastructure**:
- Location: `apps/api/knowledge-base/src/`
- Status: Production
- Components:
  - `search/kb-search.ts` - Hybrid semantic + keyword search
  - `search/semantic.ts` - Cosine similarity via pgvector
  - `embedding-client/index.ts` - OpenAI embedding generation with caching
  - `crud-operations/kb-update.ts` - Update KB entries
  - `crud-operations/kb-add.ts` - Create KB entries
  - `db/schema.ts` - knowledgeEntries table schema

**Related Stories**:
- WKFL-006 (Pattern Miner) - COMPLETED - Text similarity clustering with threshold 0.70
- WKFL-001 (Retro Agent) - COMPLETED - Generates KB lessons after story completion
- WKFL-004 (Feedback Capture) - COMPLETED - Generates KB feedback entries

### Constraints to Respect

**From CLAUDE.md**:
- Zod-first types (no TypeScript interfaces)
- No barrel files (direct imports)
- Use `@repo/logger` (never console.log)
- Functional components only

**From Story Scope**:
- Archive-only (never delete KB entries)
- Existing PostgreSQL schema must remain compatible
- OpenAI text-embedding-3-small (1536 dims) - no model changes

**From Infrastructure**:
- pgvector cosine similarity operator: `<=>` (not `<->` dot product)
- Metadata JSONB field for archival state (avoid schema migration)

### Dependencies

**Required (Completed)**:
- WKFL-006 (Pattern Miner) - Provides clustering pattern reference

**Optional**:
- WKFL-001 (Retro Agent) - Generates KB lessons (compression input source)
- WKFL-004 (Feedback) - Generates KB feedback entries (compression input source)

### Risk Assessment

**Technical Risks**:
- **Large KB size** (>1000 entries) → Pairwise similarity expensive
  - Mitigation: Start with Option A (N queries), batch processing
- **Schema extension** (archived/canonical_id fields) → Migration complexity
  - Mitigation: Use existing metadata JSONB field (no migration)
- **Rollback complexity** → Undoing compression requires multi-step process
  - Mitigation: Document rollback procedure, add `--dry-run` mode

**Data Risks**:
- **Information loss during merge** → Canonical entry missing unique details
  - Mitigation: AC-5 requires manual verification, comprehensive test suite
- **Incorrect clustering** → Dissimilar entries grouped together
  - Mitigation: High threshold (0.9), dry-run mode for preview

**Operational Risks**:
- **Monthly cron failure** → Compression doesn't run
  - Mitigation: Manual fallback `/kb-compress`, monitoring alerts (future)

---

## Estimated Effort Breakdown

**Agent Creation**: 5,000 tokens
- Agent file structure and frontmatter
- Command documentation
- Integration with existing KB tools

**Schema Definitions**: 3,000 tokens
- CanonicalEntrySchema (Zod)
- ArchiveMetadataSchema (Zod)
- CompressionReportSchema (Zod)

**Clustering Logic**: 10,000 tokens
- Similarity computation (Option A: semanticSearch wrapper)
- Clustering algorithm (union-find or grouping)
- Edge case handling (empty KB, insufficient entries, all unique)

**Merge Logic**: 7,000 tokens
- Title merging (longest common substring)
- Recommendation unification
- Examples deduplication
- Tags union

**Reporting**: 5,000 tokens
- Stats collection (before/after counts)
- Token savings estimation
- YAML report generation
- Cluster details formatting

**Testing**: 5,000 tokens
- Unit tests (clustering, merge, archive)
- Integration tests (end-to-end compression)
- Test data seeding

**Total**: 35,000 tokens

---

## Next Steps

1. **Create Agent File**: `.claude/agents/kb-compressor.agent.md` with haiku model
2. **Create Command Docs**: `.claude/commands/kb-compress.md` with usage examples
3. **Define Zod Schemas**: In agent file or shared types location
4. **Implement Compression Logic**: Start with Option A (semanticSearch per entry)
5. **Add Tests**: Unit tests for clustering, merge, archive; integration tests for E2E
6. **Manual Validation**: Run on test KB, verify information preservation (AC-5)
7. **Documentation**: Update FULL_WORKFLOW.md to include KB compression workflow

---

**Generated by**: pm-story-generation-leader
**Seed File**: `/Users/michaelmenard/Development/monorepo/plans/future/workflow-learning/backlog/WKFL-009/_pm/STORY-SEED.md`
**Reality Baseline**: Codebase scan + index analysis (no baseline file found)
**Lessons Loaded**: Yes (WKFL-006, KNOW-002, KNOW-004)
**Conflicts**: 0 blocking, 0 warnings

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-07_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Missing Database Schema Field - knowledge_entries table lacks metadata JSONB | Add schema migration with 4 dedicated columns (archived, archived_at, canonical_id, is_canonical) | AC-7 |
| 2 | Archive Mechanism Unspecified - 3 options presented but none committed | Selected Option C (dedicated columns) with type-safe Boolean/UUID types | AC-7 |
| 3 | AC-5 Verification Process Unclear - "manual review" vague | Updated AC-5 with automated test (primary) + manual spot-check (secondary) | AC-5 updated |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Similarity Computation Optimization (in-memory approach faster for large KBs) | Performance | Deferred to gap-1 |
| 2 | Weekly/Monthly Cron Automation | Infrastructure | Deferred to gap-2 |
| 3 | Automated Rollback Command | Infrastructure | Deferred to gap-3 |
| 4 | Cluster Size Upper Bound (large clusters 50+) | Edge case | Deferred to gap-4 |
| 5 | Dry-Run Detail Preview | UX | Deferred to gap-5 |
| 6 | Archive Entry Queryability in kb_search | Observability | Deferred to gap-6 |
| 7 | Embedding Model Upgrade Path | Infrastructure | Deferred to gap-7 |
| 8 | Incremental Compression (only new entries) | Performance | Deferred to enhancement-1 |
| 9 | LLM-Based Canonical Refinement | Quality | Deferred to enhancement-2 |
| 10 | Compression Analytics Dashboard | Observability | Deferred to enhancement-3 |
| 11 | Smart Threshold Tuning per Entry Type | Quality | Deferred to enhancement-4 |
| 12 | Canonical Entry Versioning | Quality | Deferred to enhancement-5 |
| 13 | Cross-Entry-Type Clustering | Scope | Deferred to enhancement-6 |
| 14 | User Feedback Integration | Quality | Deferred to enhancement-7 |

### Summary

- **ACs added**: 1 (AC-7: Schema migration)
- **ACs updated**: 1 (AC-5: Verification criteria)
- **Architectural decisions made**: 3 (Option C archival, Option A similarity, UUID format)
- **KB entries deferred**: 14 (all non-blocking findings)
- **Mode**: Autonomous (no interactive user input required)
- **Verdict**: CONDITIONAL PASS - Ready for implementation with schema migration as first task
