# Implementation Plan - KNOW-048: Document Chunking

## Overview

This plan implements markdown-aware document chunking for the knowledge base. The chunking utility splits long documents on semantic boundaries (## headers) while respecting token limits, enabling ingestion of long-form content.

## Implementation Chunks

### Chunk 1: Define Types and Schemas

**Files to create:**
- `apps/api/knowledge-base/src/chunking/__types__/index.ts`

**Implementation:**
```typescript
// Define Zod schemas for:
// - ChunkedDocumentSchema (content, sourceFile, chunkIndex, totalChunks, headerPath, tokenCount)
// - ChunkOptionsSchema (maxTokens with default 500)
// - FrontMatterSchema for extracted metadata
// Export types via z.infer<>
```

**Acceptance Criteria Covered:** AC1, AC4

**Estimated tokens:** ~100 lines

---

### Chunk 2: Implement Token Counting Utility

**Files to create:**
- `apps/api/knowledge-base/src/chunking/token-utils.ts`

**Implementation:**
- Use existing tiktoken pattern from `embedding-client/retry-handler.ts`
- Export `countTokens(text: string): number` function
- Use `encoding_for_model('text-embedding-3-small')` for consistency
- Include fallback to 4 chars/token estimation

**Acceptance Criteria Covered:** AC1, AC2

**Estimated tokens:** ~50 lines

---

### Chunk 3: Implement Core Chunking Logic

**Files to create:**
- `apps/api/knowledge-base/src/chunking/index.ts`

**Implementation:**
1. **Front Matter Extraction**
   - Parse YAML between leading `---` markers
   - Strip from content, store as metadata

2. **Header Splitting**
   - Split content on `## ` headers (level-2 only)
   - Keep `###`, `####` etc. with parent `##` section
   - Handle content before first `##` as intro section

3. **Token Limit Fallback**
   - If section exceeds `maxTokens`, split on `\n\n` (paragraphs)
   - Preserve header as context prefix for sub-chunks

4. **Code Block Preservation**
   - Track fenced code blocks (```)
   - Never split within code blocks
   - If code block exceeds limit, log warning and keep as single chunk

5. **Metadata Assembly**
   - Set sourceFile, chunkIndex, totalChunks, headerPath, tokenCount
   - Include extracted front matter metadata

**Export:**
```typescript
export function chunkMarkdown(
  content: string,
  sourceFile: string,
  options?: ChunkOptions
): ChunkedDocument[]
```

**Acceptance Criteria Covered:** AC1, AC1.5, AC2, AC3, AC4

**Estimated tokens:** ~200 lines

---

### Chunk 4: Implement CLI Script

**Files to create:**
- `apps/api/knowledge-base/src/scripts/chunk-document.ts`

**Implementation:**
- Parse CLI arguments: `pnpm kb:chunk <file> [--max-tokens=N]`
- Read file with `fs/promises`
- Call `chunkMarkdown()` with file path as sourceFile
- Output JSON array to stdout
- Errors to stderr
- Exit code 0 on success, 1 on error

**Package.json update:**
- Add script: `"kb:chunk": "tsx src/scripts/chunk-document.ts"`

**Acceptance Criteria Covered:** AC5

**Estimated tokens:** ~80 lines

---

### Chunk 5: Unit Tests

**Files to create:**
- `apps/api/knowledge-base/src/chunking/__tests__/chunking.test.ts`

**Test Cases:**

1. **Basic Header Splitting**
   - Input: 3 `##` sections under 500 tokens each
   - Expected: 3 chunks with correct metadata

2. **Token Limit Fallback**
   - Input: Single section exceeding 500 tokens
   - Expected: Multiple chunks, each under limit, header preserved

3. **Code Block Preservation**
   - Input: Section with fenced code block
   - Expected: Code block intact, not split

4. **No Headers Document**
   - Input: Plain text without `##` markers
   - Expected: Single section, split by token limit

5. **Empty Document**
   - Input: Empty string
   - Expected: Empty array

6. **Front Matter Handling**
   - Input: Document with YAML front matter
   - Expected: Front matter stripped, metadata preserved

7. **Nested Headers**
   - Input: `##` with `###` subsections
   - Expected: `###` stays with parent `##`

8. **Large Code Block Warning**
   - Input: Code block exceeding 1000 tokens
   - Expected: Single chunk, warning logged

**Acceptance Criteria Covered:** AC7

**Estimated tokens:** ~300 lines

---

### Chunk 6: Integration Test

**Files to create:**
- `apps/api/knowledge-base/src/chunking/__tests__/integration.test.ts`

**Test Case:**
1. Chunk a real markdown file (e.g., `apps/api/knowledge-base/README.md`)
2. Verify output can be passed to bulk import schema
3. Verify chunk metadata is correct

**Acceptance Criteria Covered:** AC6, AC7

**Estimated tokens:** ~100 lines

---

## File Structure

```
apps/api/knowledge-base/src/chunking/
  __types__/
    index.ts          # Zod schemas and types
  __tests__/
    chunking.test.ts  # Unit tests
    integration.test.ts # Integration tests
  index.ts            # Core chunking logic
  token-utils.ts      # Token counting utilities

apps/api/knowledge-base/src/scripts/
  chunk-document.ts   # CLI entry point

apps/api/knowledge-base/package.json  # Add kb:chunk script
```

## Dependencies

- `tiktoken` (already in package.json)
- `js-yaml` (already in package.json)

No new dependencies required.

## Verification Commands

```bash
# Type check
pnpm --filter @repo/knowledge-base check-types

# Run tests
pnpm --filter @repo/knowledge-base test

# Lint
pnpm --filter @repo/knowledge-base lint

# Test CLI manually
pnpm --filter @repo/knowledge-base kb:chunk README.md
```

## Risk Mitigation

1. **Token counting accuracy** - Using same tiktoken pattern as existing embedding-client
2. **Large file memory** - Acceptable for markdown docs (<1MB typical)
3. **Edge cases** - Comprehensive unit tests for header parsing edge cases

## Estimated Total

- **New code:** ~500-600 lines
- **Tests:** ~400-500 lines
- **Implementation time:** 2-3 hours
