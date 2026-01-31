# Dev Feasibility Review - KNOW-006: Parsers and Seeding

## Feasibility Summary

**Feasible:** Yes

**Confidence:** High

**Why:**
- Well-defined scope: parsers + bulk import + stats tool
- Clear source files to parse (LESSONS-LEARNED.md, seed-data.yaml already exist)
- Existing primitives available (kb_add from KNOW-003, EmbeddingClient from KNOW-002)
- Standard YAML/markdown parsing libraries available (`js-yaml`, `marked` or custom regex)
- MCP tool pattern already established in KNOW-0051
- No complex architectural changes required

## Likely Change Surface

### Packages/Directories Impacted

**New directories:**
- `apps/api/knowledge-base/src/parsers/` (new)
  - `parse-lessons-learned.ts`
  - `parse-seed-yaml.ts`
  - `__types__/index.ts` (Zod schemas for parsed data)
  - `__tests__/parse-lessons-learned.test.ts`
  - `__tests__/parse-seed-yaml.test.ts`
  - `index.ts` (exports)

- `apps/api/knowledge-base/src/seed/` (new)
  - `kb-bulk-import.ts`
  - `__types__/index.ts` (Zod schemas for import results)
  - `__tests__/kb-bulk-import.test.ts`
  - `index.ts`

**Modified files:**
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (add kb_bulk_import, kb_stats schemas)
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (add handler implementations)
- `apps/api/knowledge-base/src/__types__/index.ts` (possibly add shared types)

**New script files:**
- `apps/api/knowledge-base/scripts/seed-from-yaml.ts` (optional CLI wrapper for bulk import)
- `apps/api/knowledge-base/scripts/seed-from-lessons.ts` (optional CLI for LESSONS-LEARNED)

### Endpoints Impacted

**None** - This story adds MCP tools, not HTTP endpoints.

MCP tools added:
- `kb_bulk_import` (tool name)
- `kb_stats` (tool name)

### Migration/Deploy Touchpoints

**Database:**
- No schema changes required
- Uses existing `knowledge_entries` and `embedding_cache` tables

**Deployment:**
- No infrastructure changes
- MCP server auto-discovers new tools via tool-schemas.ts registration
- Seed scripts are optional one-time operations (not part of server runtime)

**Configuration:**
- No new environment variables required
- Uses existing OpenAI API key and database connection

## Risk Register (Top 10)

### Risk 1: YAML Parsing Edge Cases
**Why risky:**
YAML spec is complex with many edge cases (multi-line strings, special chars, flow vs block style). The existing seed-data.yaml may use features that are hard to parse correctly.

**Mitigation:**
- Use well-tested library: `js-yaml` (600k weekly downloads, mature)
- Add comprehensive test suite with edge cases from actual seed-data.yaml
- Validate parsed output with Zod schemas immediately after parsing
- Include test for malformed YAML with expected error handling

---

### Risk 2: LESSONS-LEARNED.md Structure Assumptions
**Why risky:**
LESSONS-LEARNED.md is free-form markdown. Parser will need to make assumptions about structure (headings, bullet points, etc.). If format changes, parser breaks.

**Mitigation:**
- Document exact expected markdown format in parser code comments
- Add validation step: fail fast if unexpected structure detected
- Consider making parser lenient: extract what's possible, log warnings for unparseable sections
- Add test with actual LESSONS-LEARNED.md file (not just synthetic test data)
- PM should define canonical format in AC or reference doc

---

### Risk 3: Bulk Import Performance at Scale
**Why risky:**
Importing 1000+ entries requires:
- 1000 OpenAI API calls (even with caching, first import is expensive)
- Each call ~300ms (optimistic) = 5 minutes minimum
- Potential rate limiting from OpenAI
- Database insert batching required to avoid overwhelming PostgreSQL

**Mitigation:**
- Leverage EmbeddingClient batch processing (already supports batching from KNOW-002)
- Implement progress logging every N entries
- Add timeout handling and resume capability
- Document expected performance in story: ~0.3-0.5s per entry
- Consider adding `--max-batch-size` flag to limit concurrent operations
- Test with realistic dataset (100-200 entries, not full 1000+)

---

### Risk 4: Duplicate Entry Handling Ambiguity
**Why risky:**
Spec says "no duplicate entries created for identical content hashes" but doesn't specify desired behavior:
- Skip silently?
- Return warning?
- Increment counter?
- Update existing entry?

**Mitigation:**
- PM must clarify desired behavior in AC
- Recommend: kb_bulk_import returns summary with `{ duplicates_skipped: N }`
- Log each duplicate detected with entry ID and content hash
- Add test for duplicate handling explicitly

---

### Risk 5: Transaction Boundaries Unclear
**Why risky:**
If bulk import fails midway (OpenAI API error, DB connection lost), are already-imported entries rolled back or kept?
- All-or-nothing semantics require transaction wrapping
- Partial success semantics require detailed error reporting

**Mitigation:**
- PM must specify desired behavior in AC
- Recommend: Accept partial success, return detailed error report:
  ```typescript
  {
    total: 100,
    succeeded: 47,
    failed: 53,
    errors: [{ index: 47, reason: "OpenAI API rate limit" }, ...]
  }
  ```
- Document that entries 0-46 are committed, 47+ not imported
- Add `--rollback-on-error` flag for all-or-nothing semantics (future enhancement)

---

### Risk 6: YAML Security Considerations
**Why risky:**
YAML parsers can be vulnerable to:
- Arbitrary code execution (via `!!python/object` tags in PyYAML, less common in JS)
- Denial of service (deeply nested structures, billion laughs attack)
- Prototype pollution (if merging parsed YAML into objects unsafely)

**Mitigation:**
- Use `js-yaml` with `safeLoad` (not `load`)
- Validate parsed structure immediately with Zod schema (allowlist approach)
- Reject any YAML with custom tags or unexpected structure
- Add test case with malicious YAML (nested objects, prototype pollution attempt)
- Document security considerations in seed data creation guide

---

### Risk 7: kb_stats Implementation Scope Creep
**Why risky:**
"Stats" is vague. Could expand to:
- Simple counts (total entries, by role)
- Cache hit rates (requires tracking)
- Query analytics (out of scope)
- Performance metrics (latency percentiles)

**Mitigation:**
- PM must define exact stats to return in AC
- Recommend minimal MVP:
  ```typescript
  {
    total_entries: number,
    by_role: { pm: number, dev: number, qa: number, all: number },
    total_tags: number,  // count of unique tags
    cache_entries: number
  }
  ```
- Defer advanced analytics to KNOW-019
- Add performance target: <500ms for stats query

---

### Risk 8: Embedding Cost Estimation Accuracy
**Why risky:**
Test plan mentions "log total estimated cost before import" but:
- Content length != token count (tiktoken tokenizer is complex)
- OpenAI pricing may change
- Embedding model may be upgraded (text-embedding-3-small vs 3-large)

**Mitigation:**
- Use conservative estimate: `chars / 4 = tokens` (OpenAI rule of thumb)
- Hardcode current pricing: $0.00002 per 1k tokens (text-embedding-3-small)
- Display estimate as "approximately $X.XX (based on current pricing)"
- Add warning: "Actual cost may vary. Confirm before large imports."
- Log actual cost after completion (if OpenAI API returns usage stats)

---

### Risk 9: LESSONS-LEARNED.md Is Living Document
**Why risky:**
LESSONS-LEARNED.md will grow over time. Parser built today may break with future entries if format assumptions change.

**Mitigation:**
- Design parser to be lenient: extract what matches expected format, skip unrecognized sections
- Add version detection: check for known heading patterns, fail gracefully if not found
- Document expected format in parser code and in SEED-STRATEGY.md
- Add integration test that runs against actual LESSONS-LEARNED.md (not fixture)
- Consider adding format version marker to markdown (e.g., `<!-- format: v1.0 -->`)

---

### Risk 10: Test Data Cleanup for Bulk Import Tests
**Why risky:**
Bulk import tests will create dozens/hundreds of database entries. If cleanup fails, subsequent test runs are polluted.

**Mitigation:**
- Use unique tag for test entries: `__test_bulk_import__`
- Cleanup in `afterEach`: `DELETE FROM knowledge_entries WHERE '__test_bulk_import__' = ANY(tags)`
- Add `beforeAll` validation: ensure test database is empty or warn if not
- Consider using database transactions for test isolation (rollback after each test)
- Document cleanup strategy in test-helpers.ts

---

## Scope Tightening Suggestions (Non-breaking)

### Suggestion 1: Clarify "No Duplicate Entries"
**Current AC wording:** "No duplicate entries created for identical content hashes"

**Problem:** Ambiguous behavior (skip? warn? error?)

**Recommended clarification:**
- Add AC: "kb_bulk_import detects duplicates via content hash and skips them. Returns `{ duplicates_skipped: N }` in summary."
- OR if deduplication is cache-only: "Multiple entries with identical content are allowed. Embedding cache prevents redundant API calls."

---

### Suggestion 2: Define kb_stats Output Schema Exactly
**Current index entry:** "implement kb_stats tool"

**Problem:** Vague scope, potential for scope creep

**Recommended AC:**
- AC: "kb_stats returns JSON with total_entries, by_role counts, total_tags count, cache_entries count"
- Include exact TypeScript type or Zod schema in AC
- Defer advanced stats (query analytics, performance metrics) to KNOW-019

---

### Suggestion 3: Limit Initial Bulk Import Size
**Current scope:** "Bulk import operations"

**Problem:** No upper bound, could attempt 10k+ entry import

**Recommended constraint:**
- Add constraint: "kb_bulk_import enforces max 1000 entries per call. For larger imports, split into batches."
- Add `--max-entries` validation with clear error message
- Prevents accidental runaway API costs

---

### Suggestion 4: Define LESSONS-LEARNED.md Format Explicitly
**Current scope:** "Parse LESSONS-LEARNED.md"

**Problem:** Parser must guess structure

**Recommended constraint:**
- Add AC: "Parser expects LESSONS-LEARNED.md sections with level-2 headings (`## Story XXX`) and bullet points. Fails fast if structure not found."
- Reference SEED-STRATEGY.md for canonical format
- Include example section in AC

---

### Suggestion 5: Add Explicit OUT OF SCOPE
**Recommended additions to Non-Goals:**
- ❌ Automatic format detection (only support documented YAML and markdown formats)
- ❌ Incremental parsing (parse entire file, not streaming)
- ❌ Content transformation or cleanup (import as-is)
- ❌ Duplicate content merging (keep all entries, rely on cache for embeddings)
- ❌ CLI progress bars or interactive prompts (log output only)
- ❌ Resume capability for interrupted imports (manual retry)

---

## Missing Requirements / Ambiguities

### Ambiguity 1: Duplicate Detection Scope
**What's unclear:**
Does "no duplicate entries for identical content hashes" mean:
a) Detect duplicates within single import batch and skip them?
b) Detect duplicates against existing database entries and skip them?
c) Allow duplicates but use cached embeddings?

**Recommended decision:**
PM should clarify with explicit AC. Recommend option (b) for data quality.

---

### Ambiguity 2: YAML Field Mapping
**What's unclear:**
seed-data.yaml has fields like:
```yaml
- id: tok-001
  content: "..."
  entry_type: fact
  roles: [dev]
  tags: [tokens, optimization]
  source_file: "..."
  confidence: 1.0
```

But kb_add expects:
```typescript
{ content: string, role: 'pm' | 'dev' | 'qa' | 'all', tags?: string[] }
```

Questions:
- Is `id` field used or ignored?
- Is `entry_type` stored somewhere?
- Is `source_file` stored as a tag or discarded?
- Is `confidence` stored or discarded?
- How is `roles: [dev, pm]` (array) mapped to `role: 'dev'` (single value)?

**Recommended decision:**
PM should define explicit mapping:
- `id` → ignored (UUID auto-generated)
- `entry_type` → stored as tag (e.g., tags: ['fact', 'tokens', 'optimization'])
- `source_file` → stored as tag (e.g., tags: ['source:LESSONS-LEARNED.md'])
- `confidence` → ignored for MVP (future: store as metadata field)
- `roles: [dev, pm]` → create two entries (one per role) OR take first role only

---

### Ambiguity 3: Error Handling for Partial Import Failures
**What's unclear:**
If importing 100 entries and entry 50 fails (OpenAI API error), should:
a) Rollback all 100 entries (all-or-nothing)?
b) Commit first 49, stop at 50, report error?
c) Commit first 49, skip 50, continue with 51-100?

**Recommended decision:**
PM should specify behavior explicitly. Recommend option (c) with detailed error report for best UX.

---

### Ambiguity 4: kb_stats Cache Hit Rate Calculation
**What's unclear:**
Test plan expects `cache_hit_rate` in kb_stats output, but:
- EmbeddingClient doesn't currently track cache hits globally (only per-operation)
- No database table tracks hit/miss counts
- Calculating hit rate requires historical data

**Recommended decision:**
- Option A: Remove cache_hit_rate from MVP kb_stats (defer to KNOW-021)
- Option B: Add simple counter: track hits/misses in memory (resets on server restart)
- Option C: Add `cache_stats` table to track cumulative hits/misses

Recommend Option A for MVP simplicity.

---

### Ambiguity 5: CLI Script vs MCP Tool Only
**What's unclear:**
Index mentions "create seed script for YAML import" but also "implement kb_bulk_import tool". Are both needed?

**Recommended decision:**
PM should clarify:
- kb_bulk_import MCP tool (required for Claude Code access)
- Optional CLI wrapper script: `pnpm seed --file=seed-data.yaml` (convenience)
  - Can call kb_bulk_import internally
  - Or directly use parsers + kb_add in loop

Recommend both: MCP tool for programmatic access, CLI for one-time seeding.

---

## Evidence Expectations

### What Proof/Dev Should Capture

**Functional Evidence:**
1. Parser output samples:
   - Show parsed YAML entries (first 5)
   - Show parsed LESSONS-LEARNED entries (first 3)
   - Demonstrate Zod validation success

2. Bulk import execution:
   - Log output showing progress (e.g., "Imported 47/100 entries...")
   - Final summary JSON
   - Database query showing imported count matches

3. kb_stats output:
   - JSON response with all required fields
   - Comparison with direct SQL query to verify accuracy

4. Error handling:
   - Log output for malformed YAML error
   - Partial import error report (showing succeeded/failed counts)
   - Invalid role error message

**Test Evidence:**
1. Vitest test output:
   - All tests passing
   - Coverage report showing >85% for parsers and bulk import

2. Performance benchmarks:
   - Bulk import of 50 entries: total time
   - kb_stats execution time: <500ms

**Code Quality Evidence:**
1. TypeScript compilation: no errors
2. ESLint: no errors on new files
3. Zod schemas: all parser outputs validated

### What Might Fail in CI/Deploy

**Likely CI Failures:**
1. **Missing OpenAI API key in CI environment**
   - Tests calling kb_bulk_import need API key
   - Mitigation: Mock EmbeddingClient in tests OR use real API key secret

2. **Database connection in CI**
   - Tests need Docker PostgreSQL with pgvector
   - Mitigation: Ensure CI has database setup step

3. **YAML parsing library not installed**
   - `js-yaml` may not be in dependencies
   - Mitigation: Add to package.json before testing

4. **Large import timeout in CI**
   - Importing 1000 entries may exceed CI timeout (e.g., 10 min limit)
   - Mitigation: Limit test imports to <100 entries

5. **File path issues**
   - Seed scripts reference relative paths (e.g., `../../plans/...`)
   - Mitigation: Use `__dirname` or absolute paths, or pass file path as argument

**Unlikely But Possible:**
1. Memory limit exceeded during bulk import (1000+ entries)
2. Rate limiting from OpenAI API during test execution
3. Docker PostgreSQL pgvector extension not installed in CI

---

## Recommended Implementation Order

1. **Phase 1: Parsers (lowest risk)**
   - Implement `parseSeedYaml()`
   - Add Zod validation schemas
   - Write parser tests (no DB, no API calls)

2. **Phase 2: LESSONS-LEARNED Parser (medium risk)**
   - Implement `parseLessonsLearned()`
   - Handle markdown edge cases
   - Test with actual LESSONS-LEARNED.md

3. **Phase 3: Bulk Import (higher risk)**
   - Implement `kb_bulk_import()` wrapping kb_add in loop
   - Add batch processing and progress logging
   - Handle errors and partial failures
   - Write integration tests (DB + EmbeddingClient)

4. **Phase 4: kb_stats (low risk)**
   - Implement aggregation queries
   - Register as MCP tool
   - Write tests

5. **Phase 5: CLI Wrapper (optional)**
   - Create seed script for one-time YAML import
   - Add help text and error handling

---

## Final Recommendation

**Proceed with implementation** once PM clarifies:
1. Duplicate entry handling behavior
2. YAML field mapping (especially multi-role entries)
3. kb_stats exact output schema
4. Error handling for partial import failures
5. Whether CLI wrapper script is required or optional

Story is well-scoped and feasible with existing infrastructure. Main risks are around edge cases and performance at scale, both of which can be mitigated with good test coverage and clear requirements.
