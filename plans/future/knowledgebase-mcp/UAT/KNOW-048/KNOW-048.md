---
story_id: KNOW-048
title: Document Chunking
status: uat
epic: knowledgebase-mcp
created: 2026-01-31
updated: 2026-01-31
depends_on: [KNOW-006]
blocks: []
assignee: null
priority: P2
story_points: 3
tags: [chunking, RAG, document-processing, learning-story, CLI]
source: stories.index.md
---

# KNOW-048: Document Chunking (Learning Story)

## Context

Long-form content (READMEs, guides, design docs) cannot be effectively imported into the knowledge base as single documents. Large documents exceed token limits for embeddings and reduce retrieval precision since the entire document gets returned even when only a portion is relevant.

This story implements markdown-aware document chunking to split long documents into smaller, semantically meaningful chunks before importing to the KB. It also serves as a learning opportunity for understanding RAG chunking patterns and their trade-offs.

## Goal

Enable ingestion of long-form markdown content by implementing a chunking utility that:
- Splits documents on semantic boundaries (## headers)
- Respects token limits for embedding compatibility
- Preserves metadata for chunk traceability
- Integrates with existing bulk import workflow

## Non-Goals

- **Overlap/sliding window** - Don't implement chunk overlap initially. Add later only if retrieval quality suffers and overlap is proven to help.
- **Hierarchical parent-child retrieval** - No need to retrieve parent sections alongside child chunks.
- **DOCX/HTML/PDF support** - Markdown only. Other formats are out of scope.
- **Semantic boundary detection** - Use simple header + token limit splitting, not ML-based boundary detection.
- **Custom tokenization** - Use standard tokenizer (tiktoken or similar), don't build custom.

## Scope

### Packages Affected

**New files:**
- `apps/api/knowledge-base/src/chunking/index.ts` - Core chunking logic
- `apps/api/knowledge-base/src/chunking/__tests__/chunking.test.ts` - Unit tests
- `apps/api/knowledge-base/src/scripts/chunk-document.ts` - CLI entry point

**Modified files:**
- `apps/api/knowledge-base/package.json` - Add `kb:chunk` script

### Endpoints

**None** - This story adds a CLI utility only. No HTTP endpoints exposed.

### Infrastructure

**None** - No infrastructure changes required. Uses existing knowledge base infrastructure.

## Acceptance Criteria

### AC1: Core Chunking Function
- [ ] `chunkMarkdown(content: string, maxTokens: number): ChunkedDocument[]` implemented
- [ ] Function splits content on `##` headers (level-2 headings) only
- [ ] Level-3+ headers (`###`, `####`, etc.) are kept with their parent `##` section
- [ ] Each chunk includes the header as context prefix
- [ ] Chunks respect `maxTokens` limit (default: 500 tokens)
- [ ] Returns array of `ChunkedDocument` objects with: `content`, `sourceFile`, `chunkIndex`, `totalChunks`, `headerPath`

### AC1.5: Front Matter Handling
- [ ] YAML front matter (lines between leading `---` markers) is stripped from chunks
- [ ] Front matter is extracted and stored separately as metadata (title, date, etc.)
- [ ] All chunks receive the extracted front matter as metadata fields
- [ ] Front matter metadata is included in chunk output for bulk import integration

### AC2: Token-Limited Fallback
- [ ] If a section exceeds `maxTokens`, it is split further
- [ ] Fallback splitting occurs on paragraph boundaries (`\n\n`)
- [ ] Splitting stops at paragraph level (do not split on sentence boundaries)
- [ ] Each sub-chunk retains the original header as context

### AC3: Code Block Preservation
- [ ] Code blocks (``` fenced) are never split mid-block
- [ ] If a code block exceeds `maxTokens`, it becomes its own chunk (warning logged)
- [ ] Inline code (`code`) is not affected
- [ ] Tests verify code blocks remain intact across chunk boundaries

### AC4: Metadata Preservation
- [ ] Each chunk includes `sourceFile` (original file path)
- [ ] Each chunk includes `chunkIndex` (0-based)
- [ ] Each chunk includes `totalChunks` (total for source file)
- [ ] Each chunk includes `headerPath` (immediate header only, e.g., "## Installation" not hierarchical paths)
- [ ] Metadata is serializable to JSON

### AC5: CLI Interface
- [ ] `pnpm kb:chunk path/to/doc.md` reads file and outputs JSON array to stdout
- [ ] `--max-tokens=N` flag allows custom token limit (default: 500)
- [ ] Output can be redirected to file using shell redirection (e.g., `pnpm kb:chunk doc.md > output.json`)
- [ ] Exit code 0 on success, 1 on error (file not found, parse error)
- [ ] Error messages written to stderr, not stdout

### AC6: Bulk Import Integration
- [ ] Chunked documents can be passed directly to `kb_bulk_import` tool
- [ ] Chunk metadata is preserved as KB entry metadata
- [ ] Integration test: chunk → bulk_import → search returns relevant chunk
- [ ] Search for term in chunk returns that chunk, not entire document

### AC7: Test Coverage
- [ ] 80% test coverage for chunking module
- [ ] Unit tests for: header splitting, token fallback, code block preservation
- [ ] Edge case tests: empty document, no headers, single section, nested headers
- [ ] Integration test with real markdown files from codebase

## Reuse Plan

### Existing Code to Leverage

**Tokenization:**
- Use `tiktoken` package (OpenAI's tokenizer) for accurate token counting
- Or `gpt-tokenizer` as lighter alternative
- Import: `import { encode } from 'tiktoken'` or similar

**File I/O:**
- Use Node.js `fs/promises` for file reading
- Pattern: `await fs.readFile(path, 'utf-8')`

**JSON output:**
- Use `JSON.stringify(chunks, null, 2)` for pretty-printed output
- Use `JSON.stringify(chunks)` for compact output (when piped)

### Patterns to Follow

**CLI pattern from existing scripts:**
- Follow `apps/api/knowledge-base/src/scripts/` existing patterns
- Use `process.argv` or `commander` for argument parsing
- Output to stdout, errors to stderr

**Test patterns:**
- Follow existing test structure in `__tests__/` directories
- Use Vitest assertions
- Mock file system for unit tests, use real files for integration tests

## Architecture Notes

### Ports & Adapters

**Input Port:**
- `chunkMarkdown(content, options)` - Pure function, no side effects

**Output Adapter:**
- CLI writes to stdout/file
- Chunks compatible with `kb_bulk_import` input format

### Design Decisions

#### Splitting Strategy: Headers First, Then Token Limit
**Decision:** Split on `##` headers first, then apply token limit fallback.

**Rationale:**
- Headers provide semantic boundaries (sections are self-contained topics)
- Token limit ensures embedding compatibility
- Simple, predictable behavior (no ML complexity)
- Matches how humans mentally organize documents

**Trade-off:** May produce uneven chunk sizes. Accept this for simplicity.

#### Token Limit: 500 Tokens Default
**Decision:** Use 500 tokens as default maximum chunk size.

**Rationale:**
- OpenAI embeddings support up to 8191 tokens, but smaller chunks improve retrieval precision
- 500 tokens ≈ 375 words ≈ 1-2 paragraphs
- Matches common RAG chunking recommendations
- Configurable via CLI flag if needed

#### No Overlap Initially
**Decision:** Don't implement chunk overlap (sliding window) in MVP.

**Rationale:**
- Overlap adds complexity without proven benefit for this use case
- Can be added later if retrieval quality suffers
- YAGNI: Don't build features we might not need

**Future:** If retrieval returns wrong chunks, experiment with 50-100 token overlap.

#### Link Handling: Preserve Markdown Links
**Decision:** Keep markdown links as-is in chunks. Do not strip or convert them.

**Rationale:**
- Links provide context and reference information that may be relevant to embeddings
- Preserving links maintains document integrity and traceability
- Link format in chunks allows bulk import to process links for knowledge base indexing
- Simpler implementation than link stripping/conversion

**Trade-off:** Chunks include link syntax, which adds minimal overhead.

### ChunkedDocument Schema

```typescript
import { z } from 'zod'

const ChunkedDocumentSchema = z.object({
  content: z.string().min(1),
  sourceFile: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  totalChunks: z.number().int().positive(),
  headerPath: z.string().optional(),
  tokenCount: z.number().int().positive(),
})

type ChunkedDocument = z.infer<typeof ChunkedDocumentSchema>
```

## Test Plan

### Scope Summary

- **Endpoints touched:** None (CLI utility)
- **UI touched:** No
- **Data/storage touched:** No (read-only file processing)

### Happy Path Tests

#### Test 1: Basic Header Splitting
**Setup:** Markdown file with 3 `##` sections, each under 500 tokens

**Input:**
```markdown
# Title

## Section One
Content for section one.

## Section Two
Content for section two.

## Section Three
Content for section three.
```

**Expected:**
- Returns 3 chunks
- Each chunk includes its header as first line
- `totalChunks: 3` on all chunks
- `chunkIndex: 0, 1, 2` respectively

#### Test 2: Token Limit Fallback
**Setup:** Markdown file with one section exceeding 500 tokens

**Expected:**
- Section split into multiple chunks
- Each sub-chunk retains section header as context
- All chunks under 500 tokens

#### Test 3: CLI JSON Output
**Setup:** Run `pnpm kb:chunk test-doc.md`

**Expected:**
- Outputs valid JSON array to stdout
- Each element matches `ChunkedDocument` schema
- Exit code 0

### Edge Cases

#### Edge 1: Document with No Headers
**Input:** Plain text without `##` markers

**Expected:**
- Entire document treated as single section
- Split by token limit if exceeds 500 tokens
- `headerPath` is empty string or null

#### Edge 2: Empty Document
**Input:** Empty file or whitespace only

**Expected:**
- Returns empty array `[]`
- No error thrown
- Exit code 0

#### Edge 3: Code Block Exceeds Token Limit
**Input:** Code block with 1000+ tokens

**Expected:**
- Code block becomes single chunk (not split)
- Warning logged to stderr
- Chunk exceeds token limit (acceptable exception)

### Integration Test

#### Test: Chunk → Import → Search
**Setup:**
1. Chunk a real README from codebase
2. Import chunks via `kb_bulk_import`
3. Search for term that appears in one chunk

**Expected:**
- Search returns the specific chunk containing the term
- Chunk metadata (sourceFile, chunkIndex) preserved
- Does NOT return entire document or unrelated chunks

## Dev Feasibility Review

**Feasible:** Yes
**Confidence:** High

### Key Findings

**Likely change surface:**
- 1 new module (`chunking/`)
- 1 CLI script
- 1 package.json modification
- ~200-300 lines of code + tests

**Top risks:**
1. **Tokenization accuracy** - Different tokenizers produce different counts. Use `tiktoken` for OpenAI compatibility.
2. **Edge cases in markdown parsing** - Nested code blocks, HTML in markdown. Keep parser simple, handle common cases only.
3. **Large file memory usage** - Reading entire file into memory. Acceptable for typical markdown docs (<1MB).

**Scope tightening suggestions:**
- Skip `--output` flag initially (just use shell redirection)
- Skip hierarchical header paths (just use immediate header)
- Skip sentence-level splitting (stop at paragraph level)

### Missing Requirements (Clarify Before Implementation)

1. **Header level for splitting:** AC says `##`, but what about `###`? Recommendation: Split on `##` only, keep `###` with parent chunk.
2. **Front matter handling:** Should YAML front matter (`---`) be included in chunks? Recommendation: Strip front matter, use as metadata.
3. **Link handling:** Preserve markdown links or strip? Recommendation: Preserve links.

## Implementation Notes

### Implementation Order

1. **Define types** (15 min)
   - Create `ChunkedDocument` Zod schema
   - Export types for external use

2. **Core chunking function** (1 hour)
   - Implement `chunkMarkdown(content, options)`
   - Header splitting logic
   - Token counting with tiktoken

3. **Fallback splitting** (45 min)
   - Paragraph-level splitting for long sections
   - Code block detection and preservation

4. **CLI script** (30 min)
   - Argument parsing
   - File reading
   - JSON output

5. **Unit tests** (1 hour)
   - Test each AC scenario
   - Edge cases
   - Achieve 80% coverage

6. **Integration test** (30 min)
   - Chunk → bulk_import → search flow
   - Real markdown file from codebase

### Dependencies to Add

```json
{
  "dependencies": {
    "tiktoken": "^1.0.0"
  }
}
```

Or use lighter alternative:
```json
{
  "dependencies": {
    "gpt-tokenizer": "^2.0.0"
  }
}
```

---

## Related Stories

**Depends on:** KNOW-006 (Core KB MCP Server) - Provides `kb_bulk_import` tool

**Blocks:** None

**Related:**
- KNOW-003: Natural Language Search (chunks improve search precision)
- KNOW-007: CLI Tools (chunking is a CLI utility)
- Future: Chunk overlap if retrieval quality suffers

---

## Notes

- This is marked as a **Learning Story** - take time to understand RAG chunking trade-offs
- Try importing a long document WITHOUT chunking first to see the problem
- Measure retrieval quality before/after chunking to validate approach
- Document learnings for future reference (what chunk size worked best, etc.)

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| PM Generation | — | — | — |

(To be filled during implementation)

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-31_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Header level for splitting was ambiguous (## vs ###) | Added to AC1 | Split on `##` only, keep `###` with parent section. Explicit AC requirement prevents implementation ambiguity. |
| 2 | Front matter handling not specified | Added as AC1.5 | Strip YAML front matter and extract as metadata for all chunks. Metadata included in chunk output. |
| 3 | Link handling not specified | Added as design decision | Preserve markdown links as-is for context and traceability. Simplest implementation approach. |

### Scope Reduction Decisions

| # | Suggestion | Decision | Notes |
|---|-----------|----------|-------|
| 1 | Skip `--output` flag, use shell redirection | Implemented in AC5 | Removes CLI complexity, matches shell philosophy. Users pipe output: `pnpm kb:chunk doc.md > output.json` |
| 2 | Stop at paragraph splitting (no sentence level) | Implemented in AC2 | Simplifies token fallback logic, maintains readability. If chunks still too large, user can adjust `--max-tokens`. |
| 3 | Use immediate header path only (no hierarchy) | Implemented in AC4 | Reduces metadata complexity. Single header per chunk (e.g., "## Installation") instead of "## Installation > ### Prerequisites". |

### Items Marked Out-of-Scope

- **Sentence-level splitting**: Stopped at paragraph boundaries to keep fallback logic simple. Can be added in future story if needed.
- `--output` flag: Removed in favor of shell redirection. Standard Unix philosophy. Can be added later if users request file output method.
- Hierarchical header paths: Using immediate header only reduces complexity. Full hierarchy can be added in future story if chunk context proves insufficient.


