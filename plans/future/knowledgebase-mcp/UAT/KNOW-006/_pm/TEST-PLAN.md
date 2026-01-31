# Test Plan - KNOW-006: Parsers and Seeding

## Scope Summary

**Endpoints touched:** None (internal seeding functionality)

**UI touched:** No

**Data/storage touched:** Yes
- `knowledge_entries` table (via kb_add bulk operations)
- `embedding_cache` table (via EmbeddingClient)

**Packages affected:**
- `apps/api/knowledge-base/src/parsers/` (new)
- `apps/api/knowledge-base/src/seed/` (new)
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (kb_bulk_import, kb_stats)

---

## Happy Path Tests

### Test 1: Parse LESSONS-LEARNED.md
**Setup:**
- Copy actual `plans/future/knowledgebase-mcp/LESSONS-LEARNED.md` to test fixtures
- Empty knowledge_entries table

**Action:**
- Run parser: `parseLessonsLearned(fileContent)`

**Expected outcome:**
- Returns array of structured entries with:
  - content (string, non-empty)
  - role (['dev'] | ['pm'] | ['qa'] | ['all'])
  - tags (array of strings)
  - source_file: "LESSONS-LEARNED.md"
  - confidence: 1.0

**Evidence:**
- Log output showing number of entries parsed
- Sample entry inspection (first 3 entries)
- Validate no duplicate content
- Validate all entries have required fields

---

### Test 2: Parse YAML Seed Data
**Setup:**
- Copy actual `seed-data.yaml` to test fixtures
- Empty knowledge_entries table

**Action:**
- Run parser: `parseSeedYaml(fileContent)`

**Expected outcome:**
- Returns array of structured entries matching YAML schema
- All `tok-*` entries have tags including 'tokens'
- All `be-*` entries have tags including 'backend'
- All entries have valid role values

**Evidence:**
- Log count of parsed entries
- Validate YAML structure matches expected schema
- Check all required fields present
- No YAML parsing errors

---

### Test 3: Bulk Import with kb_bulk_import
**Setup:**
- Parse seed-data.yaml to get entries
- Empty knowledge_entries table
- Valid OpenAI API key configured

**Action:**
- Call `kb_bulk_import({ entries: parsedEntries })`

**Expected outcome:**
- All entries successfully added to database
- Returns summary: { total: N, succeeded: N, failed: 0, errors: [] }
- Embeddings generated for unique content
- No duplicate entries created for identical content hashes

**Evidence:**
- Query database for count: `SELECT COUNT(*) FROM knowledge_entries`
- Verify count matches total succeeded
- Check embedding_cache table for cached embeddings
- Log batch processing time
- Validate performance: <5 seconds per 10 entries (including embedding generation)

---

### Test 4: Incremental Import (Idempotency)
**Setup:**
- Database already contains 50 entries from previous seed
- Run same seed again with identical YAML content

**Action:**
- Call `kb_bulk_import({ entries: parsedEntries })`

**Expected outcome:**
- Detects duplicate content via content hash
- Skips re-adding existing entries (or adds with different UUID if deduplication is cache-only)
- Returns summary with appropriate duplicate handling
- Embedding cache hit rate near 100%

**Evidence:**
- Database count increases by 0 (if true deduplication) or by N (if cache-only)
- Log shows cache hit metrics
- No redundant OpenAI API calls

---

### Test 5: kb_stats Tool
**Setup:**
- Database contains 100 seeded entries
- Mix of roles: 40 dev, 30 pm, 20 qa, 10 all
- Mix of tags

**Action:**
- Call `kb_stats({})`

**Expected outcome:**
- Returns statistics:
  ```json
  {
    "total_entries": 100,
    "by_role": { "dev": 40, "pm": 30, "qa": 20, "all": 10 },
    "total_tags": <count of unique tags>,
    "cache_entries": <count>,
    "cache_hit_rate": <percentage>
  }
  ```

**Evidence:**
- JSON response matches expected structure
- Counts are accurate (verify with direct SQL query)
- Performance: <500ms

---

## Error Cases

### Error 1: Invalid YAML Syntax
**Setup:**
- Create malformed YAML file (invalid indentation, missing colons)

**Action:**
- Call `parseSeedYaml(malformedYaml)`

**Expected:**
- Throws YAMLParseError with descriptive message
- Error includes line number of syntax error
- No database writes occur

**Evidence:**
- Error log with YAML parse error
- Database unchanged (count before = count after)

---

### Error 2: Missing Required Fields in YAML
**Setup:**
- YAML entry missing `content` field:
  ```yaml
  - id: missing-content
    roles: [dev]
    tags: [test]
  ```

**Action:**
- Call `parseSeedYaml(yamlWithMissingFields)`

**Expected:**
- Throws ValidationError for missing content field
- Error references entry id: "missing-content"
- Zod validation error with clear message

**Evidence:**
- ZodError thrown
- Error message includes field name: "content"
- No database writes

---

### Error 3: OpenAI API Failure During Bulk Import
**Setup:**
- Valid seed data with 10 entries
- Mock OpenAI API to fail on 5th entry (rate limit error)

**Action:**
- Call `kb_bulk_import({ entries: parsedEntries })`

**Expected:**
- First 4 entries succeed
- 5th entry retries 3 times (via EmbeddingClient retry logic)
- If retry exhausted, returns partial success:
  ```json
  {
    "total": 10,
    "succeeded": 4,
    "failed": 6,
    "errors": [{ "index": 4, "reason": "OpenAI API rate limit" }]
  }
  ```
- Database contains only successfully imported entries

**Evidence:**
- Partial import success logged
- Database count = 4
- Error log shows retry attempts
- No partially-written entries (transaction rollback or atomic operations)

---

### Error 4: Invalid Role Value in Seed Data
**Setup:**
- YAML entry with invalid role:
  ```yaml
  - id: invalid-role
    content: "Test content"
    roles: [admin]  # Invalid: only pm/dev/qa/all allowed
    tags: [test]
  ```

**Action:**
- Call `parseSeedYaml(yamlWithInvalidRole)`

**Expected:**
- Throws ValidationError
- Error message: "Invalid role: admin. Must be one of: pm, dev, qa, all"
- References entry id: "invalid-role"

**Evidence:**
- ZodError thrown
- Error includes allowed values
- No database writes

---

### Error 5: File Not Found (LESSONS-LEARNED.md Missing)
**Setup:**
- Delete or move LESSONS-LEARNED.md
- Run seed script

**Action:**
- Seed script attempts to read file

**Expected:**
- Throws FileNotFoundError
- Error message includes file path
- Seed script exits with non-zero code

**Evidence:**
- Error log: "File not found: plans/future/knowledgebase-mcp/LESSONS-LEARNED.md"
- Database unchanged

---

## Edge Cases (Reasonable)

### Edge 1: Empty YAML File
**Setup:**
- YAML file contains valid syntax but zero entries:
  ```yaml
  # Empty seed file
  ```

**Action:**
- Call `parseSeedYaml(emptyYaml)`

**Expected:**
- Returns empty array: `[]`
- No errors thrown
- No database operations

**Evidence:**
- Parser returns `[]`
- Log: "Parsed 0 entries from YAML"
- No OpenAI API calls

---

### Edge 2: Extremely Large Content Entry (10k+ characters)
**Setup:**
- YAML entry with 15,000 character content (near OpenAI token limit)

**Action:**
- Call `kb_bulk_import({ entries: [largeEntry] })`

**Expected:**
- Entry successfully imported
- Embedding generation takes longer (2-5 seconds)
- No truncation of content
- OR throws error if exceeds OpenAI token limit (~30k chars)

**Evidence:**
- Database entry has full 15k character content
- Performance log shows >2s embedding time
- No errors if within token limit

---

### Edge 3: Special Characters in YAML Content
**Setup:**
- YAML entry with special chars: quotes, newlines, unicode, emoji
  ```yaml
  - id: special-chars
    content: "Code example:\n  const x = \"hello\";\n  // Comment with 🚀 emoji"
    roles: [dev]
    tags: [test]
  ```

**Action:**
- Parse and import entry

**Expected:**
- Content preserved exactly as written
- Newlines and quotes properly escaped
- Emoji preserved in database

**Evidence:**
- Query database and verify content matches exactly
- No encoding issues
- Embedding generation succeeds

---

### Edge 4: Bulk Import with 1000+ Entries
**Setup:**
- Generate YAML file with 1000 synthetic entries
- Empty database

**Action:**
- Call `kb_bulk_import({ entries: 1000Entries })`

**Expected:**
- All entries imported successfully
- Batch processing in chunks (e.g., 10-20 per batch)
- Total time: <5 minutes (assuming 0.3s per entry)
- No memory issues
- Progress logging every 100 entries

**Evidence:**
- Database count = 1000
- Performance log shows batch processing
- Memory usage stays reasonable (<500MB)
- No timeout errors

---

### Edge 5: Concurrent Bulk Imports
**Setup:**
- Two processes attempt to import different seed files simultaneously

**Action:**
- Start two `kb_bulk_import` calls in parallel

**Expected:**
- Both imports succeed without deadlock
- No duplicate entries created
- Last-write-wins semantics acceptable
- PostgreSQL row-level locking prevents corruption

**Evidence:**
- Both processes complete successfully
- Database count = sum of both imports
- No database errors
- No duplicate UUIDs

---

### Edge 6: Null/Missing Tags in YAML
**Setup:**
- YAML entries with various tag scenarios:
  ```yaml
  - id: no-tags
    content: "Test"
    roles: [dev]
    # tags omitted

  - id: null-tags
    content: "Test"
    roles: [dev]
    tags: null

  - id: empty-tags
    content: "Test"
    roles: [dev]
    tags: []
  ```

**Action:**
- Parse and import all three entries

**Expected:**
- `no-tags`: stored as NULL in database
- `null-tags`: stored as NULL in database
- `empty-tags`: stored as empty array []

**Evidence:**
- Query database and verify tag values
- kb_list returns all three entries when no tag filter specified

---

### Edge 7: Duplicate IDs in YAML
**Setup:**
- YAML file has two entries with same ID:
  ```yaml
  - id: dup-001
    content: "First entry"
    roles: [dev]
    tags: [test]

  - id: dup-001
    content: "Second entry"
    roles: [dev]
    tags: [test]
  ```

**Action:**
- Parse YAML

**Expected:**
- Parser detects duplicate IDs
- Throws ValidationError: "Duplicate entry ID: dup-001"
- No database writes

**Evidence:**
- Error thrown before any imports
- Clear error message with duplicate ID

---

## Required Tooling Evidence

### Backend
**Required `.http` requests:**
None - internal seeding functionality (no HTTP endpoints)

**Required direct function calls:**
- `parseLessonsLearned(content: string): ParsedEntry[]`
- `parseSeedYaml(content: string): ParsedEntry[]`
- `kb_bulk_import(input: { entries: ParsedEntry[] }): ImportSummary`
- `kb_stats(input: {}): StatsResponse`

**Required Vitest test files:**
- `parsers/__tests__/parse-lessons-learned.test.ts`
- `parsers/__tests__/parse-seed-yaml.test.ts`
- `seed/__tests__/kb-bulk-import.test.ts`
- `mcp-server/__tests__/kb-stats.test.ts`

**Required assertions:**
- Parser output structure matches Zod schema
- Database counts match expected after import
- Error types match expected (ZodError, FileNotFoundError, etc.)
- Performance targets met (<5s per 10 entries)
- Cache hit rates logged and reasonable (>80% on re-import)

### Frontend
**N/A** - No UI components in this story

---

## Risks to Call Out

### Risk 1: YAML Parsing Ambiguity
**Issue:** YAML allows multiple syntaxes for same data (flow vs block style, multi-line strings). Parser may behave unexpectedly with certain formats.

**Mitigation:**
- Use well-tested YAML library (`js-yaml` or `yaml`)
- Document expected YAML format with examples
- Add validation tests for common YAML edge cases
- Provide seed-data.yaml as canonical example

---

### Risk 2: Embedding Generation Cost
**Issue:** Bulk import of 1000+ entries could cost significant OpenAI API credits ($0.00002 per 1k tokens × 500 chars × 1000 entries = ~$10).

**Mitigation:**
- Log total estimated cost before starting import
- Require confirmation flag for large imports: `--confirm-cost`
- Implement batch size limits (max 100 entries per import by default)
- Document cost estimation in README

---

### Risk 3: Content Hash Collision in Deduplication
**Issue:** SHA-256 collision (unlikely) could cause incorrect cache hits or duplicate prevention.

**Mitigation:**
- Accept risk (probability negligible)
- Document limitation
- Consider adding content equality check in addition to hash check (future enhancement)

---

### Risk 4: Large File Memory Usage
**Issue:** Reading and parsing large YAML/markdown files (>10MB) may cause memory issues.

**Mitigation:**
- Test with realistic file sizes (LESSONS-LEARNED.md ~18KB, seed-data.yaml ~50KB)
- Consider streaming parser for very large files (out of scope for MVP)
- Document file size limits (recommend <1MB per file)

---

### Risk 5: Transaction Boundaries for Bulk Import
**Issue:** If bulk import fails midway, database may be left in partially-imported state.

**Mitigation:**
- Implement batch-level transactions (commit every N entries)
- OR accept partial import with detailed error reporting
- Provide `--rollback-on-error` flag for all-or-nothing import
- Log exactly which entries succeeded vs failed

---

### Risk 6: Seed Data Validation Completeness
**Issue:** Parser may accept invalid data that causes issues downstream (e.g., tags with SQL injection, content with control characters).

**Mitigation:**
- Use Zod validation for all parsed data before import
- Sanitize content strings (strip control characters, validate UTF-8)
- Add test cases with malicious input (SQL injection in tags, XSS in content)
- Document security considerations in seed data creation guide

---

### Risk 7: Performance Degradation with Large Imports
**Issue:** Importing 10k+ entries may take hours and block other operations.

**Mitigation:**
- Implement progress logging (every 100 entries)
- Support resumable imports (skip already-imported IDs)
- Add timeout handling (fail gracefully if import takes >30 minutes)
- Document expected performance: ~0.3s per entry (including embedding)

---

## Test Coverage Expectations

- **Parsers:** 90%+ coverage (critical path, lots of edge cases)
- **Bulk Import:** 85%+ coverage (integration with database and EmbeddingClient)
- **kb_stats:** 80%+ coverage (straightforward aggregation queries)

**Total test count estimate:** 60-80 tests
- Parser tests: 30-40 tests (format variations, edge cases, errors)
- Bulk import tests: 20-30 tests (happy path, errors, performance)
- kb_stats tests: 10 tests (aggregations, edge cases)
