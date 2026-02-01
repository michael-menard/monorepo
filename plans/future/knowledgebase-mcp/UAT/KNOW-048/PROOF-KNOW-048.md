# Proof of Implementation - KNOW-048: Document Chunking

## Summary

This story implemented markdown-aware document chunking for the knowledge base, enabling ingestion of long-form content like READMEs, guides, and design docs by splitting them into smaller, semantically meaningful chunks.

## What Was Built

### Core Chunking Module

**Location:** `apps/api/knowledge-base/src/chunking/`

The chunking module provides:

1. **`chunkMarkdown(content, sourceFile, options)`** - Main function that:
   - Extracts YAML front matter and preserves as metadata
   - Splits documents on `##` headers (level-2 headings)
   - Keeps `###` and deeper headers with their parent section
   - Falls back to paragraph-level splitting for sections exceeding token limits
   - Preserves code blocks (never splits mid-block)
   - Returns array of `ChunkedDocument` objects with full metadata

2. **Token counting utilities** using tiktoken for accurate counts (with fallback estimation)

3. **CLI tool** (`pnpm kb:chunk`) for processing files from command line

### Key Design Decisions

1. **Header-first splitting** - Split on `##` headers to maintain semantic boundaries. Level-3+ headers stay with parent section.

2. **500 token default** - Balances retrieval precision with context preservation. Configurable via `--max-tokens`.

3. **No overlap** - Per story requirements, overlap/sliding window not implemented initially. Can be added if retrieval quality suffers.

4. **Code block preservation** - Code blocks are never split, even if they exceed token limits. A warning is logged instead.

5. **Front matter as metadata** - YAML front matter is extracted and attached to all chunks from the same file, enabling consistent categorization.

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/chunking/__types__/index.ts` | Zod schemas for ChunkedDocument, ChunkOptions, FrontMatter | ~85 |
| `src/chunking/token-utils.ts` | Token counting with tiktoken | ~85 |
| `src/chunking/index.ts` | Core chunking logic | ~230 |
| `src/scripts/chunk-document.ts` | CLI entry point | ~100 |
| `src/chunking/__tests__/chunking.test.ts` | Unit tests | ~420 |
| `src/chunking/__tests__/integration.test.ts` | Integration tests | ~170 |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `kb:chunk` script |

## Acceptance Criteria Results

| AC | Requirement | Result |
|----|-------------|--------|
| AC1 | Core chunking function with ## header splitting | PASS |
| AC1.5 | Front matter handling | PASS |
| AC2 | Token-limited fallback on paragraph boundaries | PASS |
| AC3 | Code block preservation | PASS |
| AC4 | Metadata preservation (sourceFile, chunkIndex, etc.) | PASS |
| AC5 | CLI interface (`pnpm kb:chunk`) | PASS |
| AC6 | Bulk import integration | PASS |
| AC7 | 80% test coverage | PASS (36 tests) |

## Test Coverage

- **28 unit tests** covering all chunking scenarios
- **8 integration tests** validating real file processing and bulk import compatibility
- Tests cover: header splitting, token fallback, code blocks, nested headers, front matter, edge cases

## Usage Examples

### CLI Usage

```bash
# Basic usage
pnpm --filter @repo/knowledge-base kb:chunk docs/guide.md

# With custom token limit
pnpm --filter @repo/knowledge-base kb:chunk docs/api.md --max-tokens=300

# Save to file
pnpm --filter @repo/knowledge-base kb:chunk README.md > chunks.json
```

### Programmatic Usage

```typescript
import { chunkMarkdown } from '@repo/knowledge-base/chunking'

const result = chunkMarkdown(markdownContent, 'path/to/file.md', {
  maxTokens: 500
})

// result.chunks - Array of ChunkedDocument
// result.frontMatter - Extracted YAML metadata (if any)
// result.warnings - Any warnings (e.g., oversized code blocks)
```

### Sample Output

```json
{
  "content": "## Installation\n\nRun npm install to get started...",
  "sourceFile": "README.md",
  "chunkIndex": 0,
  "totalChunks": 5,
  "headerPath": "## Installation",
  "tokenCount": 45,
  "frontMatter": {
    "title": "Project Guide",
    "tags": ["guide", "setup"]
  }
}
```

## Notes

- Uses tiktoken for accurate OpenAI-compatible token counting
- CLI outputs JSON to stdout for easy piping to other tools
- Chunk output is compatible with existing `kb_bulk_import` tool
- Learning story: documented RAG chunking patterns for future reference
