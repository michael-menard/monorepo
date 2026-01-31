# Implementation Plan - KNOW-006: Parsers and Seeding

## Overview

This plan implements parsers for YAML and markdown knowledge sources, a bulk import MCP tool, and enhancements to the kb_stats tool. The implementation follows a phased approach to minimize risk and ensure testability.

---

## Phase 1: Parser Infrastructure (Priority: P1)

### 1.1 Create Parser Types (`apps/api/knowledge-base/src/parsers/__types__/index.ts`)

**Zod schemas for parsed data:**

```typescript
// ParsedEntry schema - common output format from all parsers
export const ParsedEntrySchema = z.object({
  content: z.string().min(1).max(30000),
  role: z.enum(['pm', 'dev', 'qa', 'all']),
  tags: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/).max(50)).max(50).optional(),
  source_file: z.string().optional(),
})

// YAML seed entry schema (raw format from seed-data.yaml)
export const YamlSeedEntrySchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1),
  entry_type: z.string().optional(),
  roles: z.array(z.enum(['pm', 'dev', 'qa', 'all'])),
  tags: z.array(z.string()).optional(),
  source_file: z.string().optional(),
  confidence: z.number().optional(),
})

// Parse result schemas
export const YamlParseResultSchema = z.object({
  entries: z.array(ParsedEntrySchema),
  warnings: z.array(z.string()),
})
```

**Key design decisions:**
- Tags validated with alphanumeric + hyphen/underscore pattern (AC: tag format validation)
- Max 50 tags per entry (AC18)
- Content max 30000 chars (aligns with existing MAX_CONTENT_LENGTH)

### 1.2 Implement parseSeedYaml (`apps/api/knowledge-base/src/parsers/parse-seed-yaml.ts`)

**Function signature:**
```typescript
export function parseSeedYaml(content: string, filePath?: string): ParsedEntry[]
```

**Implementation steps:**

1. **File size validation** (AC12): Check content.length < 1MB (1_048_576 chars)
2. **YAML parsing**: Use `js-yaml` with `safeLoad()` only (AC7: security)
3. **Content sanitization** (AC14): Strip control characters (0x00-0x1F except newline/tab)
4. **Structure validation**: Validate array of YamlSeedEntrySchema
5. **Duplicate ID detection** (AC8): Build Set of IDs, throw if duplicate found
6. **Entry transformation**:
   - For each role in `roles[]`, create separate ParsedEntry
   - Map `entry_type` to tag (e.g., `type:fact`)
   - Merge tags with source_file tag
   - Validate final tags with tag format regex

**Error handling:**
- YAMLParseError: Malformed YAML syntax (include line number)
- ValidationError: Missing required fields or invalid values
- DuplicateIdError: Duplicate entry IDs detected

### 1.3 Implement parseLessonsLearned (`apps/api/knowledge-base/src/parsers/parse-lessons-learned.ts`)

**Function signature:**
```typescript
export function parseLessonsLearned(content: string, filePath?: string): ParsedEntry[]
```

**Implementation steps:**

1. **File size validation** (AC12): Check content.length < 1MB
2. **Format version detection** (AC15): Check for `<!-- format: v1.0 -->` marker
3. **Section parsing**: Split on `## ` headings
4. **Role inference**:
   - "Backend Patterns" -> 'dev'
   - "Testing" -> 'qa'
   - "Documentation" -> 'all'
   - Default: 'all'
5. **Bullet extraction**: Parse `- ` lines as individual learnings
6. **Content sanitization** (AC14): Strip control characters
7. **Tag inference**: Extract keywords from section headers

**Expected markdown structure:**
```markdown
## KNOW-XXX - Story Title (date)

### What Went Well
- Learning point 1
- Learning point 2

### Patterns Established
- Pattern 1
- Pattern 2
```

---

## Phase 2: Bulk Import Implementation (Priority: P1)

### 2.1 Create Seed Types (`apps/api/knowledge-base/src/seed/__types__/index.ts`)

**Zod schemas for bulk import:**

```typescript
// Bulk import input schema
export const BulkImportInputSchema = z.object({
  entries: z.array(ParsedEntrySchema).max(1000),
  dry_run: z.boolean().optional().default(false),
  validate_only: z.boolean().optional().default(false),
})

// Import error schema
export const ImportErrorSchema = z.object({
  index: z.number().int().min(0),
  reason: z.string(),
  entry_id: z.string().optional(),
})

// Bulk import result schema
export const BulkImportResultSchema = z.object({
  total: z.number().int().min(0),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  errors: z.array(ImportErrorSchema),
  duration_ms: z.number().int().min(0),
  dry_run: z.boolean(),
  session_id: z.string().uuid().optional(),
})
```

### 2.2 Implement kb_bulk_import (`apps/api/knowledge-base/src/seed/kb-bulk-import.ts`)

**Function signature:**
```typescript
export async function kbBulkImport(
  input: BulkImportInput,
  deps: KbBulkImportDeps
): Promise<BulkImportResult>
```

**Dependencies interface:**
```typescript
export interface KbBulkImportDeps {
  db: DrizzleDb
  embeddingClient: EmbeddingClient
}
```

**Implementation steps:**

1. **Input validation**: Parse with BulkImportInputSchema
2. **Max entries check** (AC3): Throw if > 1000 entries
3. **Cost estimation**: Log estimated cost before starting
   - Formula: `(totalChars / 4 / 1000) * 0.00002`
4. **Generate session_id** (AC3 rollback support): UUID for tracking
5. **Dry-run mode** (AC16): If dry_run=true, validate only, no writes
6. **Validate-only mode** (AC19): Structure validation without embeddings
7. **Batch processing**:
   - Process in batches of 10 entries
   - For each entry, call kb_add with content, role, tags
   - EmbeddingClient handles embedding generation with caching
   - Log progress every 100 entries (AC3)
8. **Error collection** (AC4):
   - Catch errors per entry
   - Continue processing remaining entries
   - Collect all errors in result.errors array
9. **Structured logging** (AC20):
   - Log JSON event on completion with metrics

**Error handling:**
- OpenAI API failures: Retry via EmbeddingClient, then skip
- Validation failures: Skip entry, log error
- Database errors: Skip entry, log error

### 2.3 Update MCP Tool Schema (`tool-schemas.ts`)

**Updated kb_bulk_import schema:**
```typescript
export const KbBulkImportInputSchema = z.object({
  entries: z.array(z.object({
    content: z.string().min(1).max(30000),
    role: z.enum(['pm', 'dev', 'qa', 'all']),
    tags: z.array(z.string()).max(50).optional(),
  })).max(1000),
  dry_run: z.boolean().optional(),
  validate_only: z.boolean().optional(),
})
```

### 2.4 Update MCP Tool Handler (`tool-handlers.ts`)

**Replace handleKbBulkImport stub:**
- Remove NOT_IMPLEMENTED response
- Integrate with kbBulkImport function
- Add structured logging
- Return BulkImportResult JSON

---

## Phase 3: kb_stats Enhancements (Priority: P1)

### 3.1 Update kb_stats Response Schema

**Add fields per AC5:**
```typescript
{
  total_entries: number
  by_role: { pm: number, dev: number, qa: number, all: number }
  total_tags: number        // COUNT(DISTINCT tag)
  cache_entries: number     // COUNT(*) from embedding_cache
  database_size_mb: number  // pg_database_size / 1048576
}
```

### 3.2 Update handleKbStats Handler

**Add queries:**
1. Total unique tags: `SELECT COUNT(DISTINCT tag) FROM unnest(tags)`
2. Cache entries: `SELECT COUNT(*) FROM embedding_cache`
3. Database size: `SELECT pg_database_size(current_database())`

---

## Phase 4: Test Implementation (Priority: P1)

### 4.1 Parser Tests (`apps/api/knowledge-base/src/parsers/__tests__/`)

**parse-seed-yaml.test.ts:**
- Happy path: Valid YAML returns parsed entries
- Multi-role expansion: Entry with `roles: [dev, pm]` creates 2 entries
- Entry type mapping: `entry_type: fact` becomes tag `type:fact`
- Duplicate ID detection: Throws error with duplicate IDs
- Invalid YAML: Throws YAMLParseError with line number
- Missing content: Throws ValidationError
- Security: Rejects YAML with custom tags (!!python)
- File size limit: Rejects files > 1MB
- Control character sanitization: Strips 0x00-0x1F
- Large content: Handles 15k char content
- Special characters: Handles quotes, unicode, emoji

**parse-lessons-learned.test.ts:**
- Happy path: Parses markdown sections
- Role inference: Backend section -> 'dev' role
- Empty file: Returns empty array
- Format version: Warns on missing/mismatched version
- Code block handling: Preserves code blocks in content
- Nested lists: Flattens to top-level bullets

### 4.2 Bulk Import Tests (`apps/api/knowledge-base/src/seed/__tests__/`)

**kb-bulk-import.test.ts:**
- Happy path: Imports 10 entries successfully
- Dry run mode: No database writes, returns accurate counts
- Validate only mode: No embeddings generated
- Partial failure: Some entries fail, others succeed
- Max entries limit: Throws error for > 1000 entries
- Progress logging: Logs every 100 entries
- Cost estimation: Logs estimated cost before starting
- Concurrent imports: 2 parallel imports complete without deadlock (AC11)
- Performance: < 5s for 10 entries

### 4.3 Integration Tests

**mcp-integration.test.ts additions:**
- kb_bulk_import tool: End-to-end import flow
- kb_stats tool: Verify enhanced statistics fields

---

## Phase 5: Optional CLI Scripts (Priority: P3)

### 5.1 Create CLI Scripts (`apps/api/knowledge-base/scripts/`)

**seed-from-yaml.ts:**
```bash
pnpm seed:yaml --file=seed-data.yaml
```

**seed-from-lessons.ts:**
```bash
pnpm seed:lessons --file=LESSONS-LEARNED.md
```

**Implementation:** CLI wrappers that read file, call parser, call kb_bulk_import

---

## Implementation Order

| Order | Component | Files | Estimated LOC | Dependencies |
|-------|-----------|-------|---------------|--------------|
| 1 | Parser types | parsers/__types__/index.ts | 100 | - |
| 2 | parseSeedYaml | parsers/parse-seed-yaml.ts | 200 | js-yaml |
| 3 | parseLessonsLearned | parsers/parse-lessons-learned.ts | 150 | - |
| 4 | Parser tests | parsers/__tests__/*.test.ts | 500 | - |
| 5 | Seed types | seed/__types__/index.ts | 80 | Parser types |
| 6 | kbBulkImport | seed/kb-bulk-import.ts | 250 | CRUD ops, Embedding |
| 7 | Bulk import tests | seed/__tests__/*.test.ts | 400 | - |
| 8 | Update tool-schemas | mcp-server/tool-schemas.ts | 50 | - |
| 9 | Update tool-handlers | mcp-server/tool-handlers.ts | 150 | kbBulkImport |
| 10 | kb_stats enhancements | mcp-server/tool-handlers.ts | 50 | - |
| 11 | Integration tests | mcp-server/__tests__/*.test.ts | 200 | - |
| 12 | CLI scripts (optional) | scripts/*.ts | 100 | - |

**Total estimated: ~2000-2200 LOC**

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| YAML security vulnerabilities | Use js-yaml safeLoad only, Zod allowlist validation |
| Large file OOM | Enforce 1MB file size limit |
| API cost overrun | Log cost estimate, enforce 1000 entry limit |
| Partial import state | Session ID tracking, detailed error reporting |
| Test data pollution | Unique tags for test data, cleanup in afterEach |

---

## Validation Checklist

Before marking plan as complete, verify:
- [ ] All 10 core ACs addressed
- [ ] All 10 QA discovery ACs (AC11-AC20) addressed
- [ ] Performance targets documented
- [ ] Coverage targets documented
- [ ] Error handling strategy defined
- [ ] Security considerations addressed
- [ ] Test strategy complete

---

## Plan Status

**PLAN VALID**

All acceptance criteria from KNOW-006.md are addressed. Implementation order minimizes dependencies and enables incremental testing.
