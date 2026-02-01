# Agent Context - KNOW-048

## Story Context

```yaml
story_id: KNOW-048
feature_dir: plans/future/knowledgebase-mcp
command: qa-verify-story
mode: qa-verification
base_path: plans/future/knowledgebase-mcp/UAT/KNOW-048/
artifacts_path: plans/future/knowledgebase-mcp/UAT/KNOW-048/_implementation/
story_file: plans/future/knowledgebase-mcp/UAT/KNOW-048/KNOW-048.md
proof_file: plans/future/knowledgebase-mcp/UAT/KNOW-048/PROOF-KNOW-048.md
verification_file: plans/future/knowledgebase-mcp/UAT/KNOW-048/_implementation/VERIFICATION.yaml
```

## Story Summary

**Title:** Document Chunking (Learning Story)

**Goal:** Enable ingestion of long-form markdown content by implementing a chunking utility that:
- Splits documents on semantic boundaries (## headers)
- Respects token limits for embedding compatibility
- Preserves metadata for chunk traceability
- Integrates with existing bulk import workflow

## Scope

**Backend impacted:** true
**Frontend impacted:** false
**Infra impacted:** false

## Key Files to Create/Modify

### New Files
- `apps/api/knowledge-base/src/chunking/index.ts` - Core chunking logic
- `apps/api/knowledge-base/src/chunking/__tests__/chunking.test.ts` - Unit tests
- `apps/api/knowledge-base/src/scripts/chunk-document.ts` - CLI entry point

### Modified Files
- `apps/api/knowledge-base/package.json` - Add `kb:chunk` script

## Dependencies

- Story depends on: KNOW-006 (Core KB MCP Server) - Provides `kb_bulk_import` tool
- New package dependency: `tiktoken` or `gpt-tokenizer` for token counting

## Acceptance Criteria Summary

1. **AC1:** Core `chunkMarkdown()` function with header splitting on `##`
2. **AC1.5:** Front matter handling - strip and extract as metadata
3. **AC2:** Token-limited fallback splitting on paragraph boundaries
4. **AC3:** Code block preservation - never split mid-block
5. **AC4:** Metadata preservation - sourceFile, chunkIndex, totalChunks, headerPath
6. **AC5:** CLI interface with `pnpm kb:chunk` command
7. **AC6:** Bulk import integration compatibility
8. **AC7:** 80% test coverage with unit and integration tests
