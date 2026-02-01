# Future Opportunities - KNOW-048

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No chunk overlap (sliding window) | Medium | Medium | Story correctly defers this to Non-Goals. Add overlap (50-100 tokens) if retrieval quality suffers after real-world usage. Validate need first with metrics. |
| 2 | Sentence-level splitting fallback | Low | Low | AC2 includes sentence-level splitting (`. `) if paragraph too long. Dev Feasibility suggests skipping this. Consider removing sentence splitting from AC2 to reduce complexity in MVP. |
| 3 | No validation of bulk_import compatibility | Low | Medium | AC6 states "chunked documents can be passed directly to kb_bulk_import" but doesn't specify expected format. Integration test will validate, but consider documenting expected JSON schema in story or adding example to CLI output. |
| 4 | No CLI validation for max-tokens range | Low | Low | AC5 allows `--max-tokens=N` but doesn't specify valid range (e.g., min 100, max 8191). Consider adding validation to prevent unreasonable values. |
| 5 | No handling of nested code blocks or edge cases | Low | Medium | AC3 handles fenced code blocks (```) but doesn't mention inline code backticks or nested scenarios. Likely not an issue, but edge case testing should verify behavior. |
| 6 | No progress indication for large files | Low | Low | If processing very large files (1000+ chunks), user has no feedback. Consider adding progress logging to stderr for files exceeding threshold. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Hierarchical header paths | Medium | Medium | Story shows example `headerPath: "## Installation > ### Prerequisites"` but Dev Feasibility suggests "skip hierarchical header paths (just use immediate header)". If hierarchical paths are kept, they improve chunk context. If removed, simplifies implementation. |
| 2 | Compact JSON output detection | Low | Low | Story mentions `JSON.stringify(chunks)` for compact output when piped. Add automatic detection of TTY vs pipe to choose pretty vs compact output intelligently. |
| 3 | Multi-format support (DOCX, HTML, PDF) | High | High | Explicitly deferred in Non-Goals. If needed later, consider separate story for each format or use external conversion tools (pandoc) as preprocessor. |
| 4 | Semantic boundary detection (ML-based) | Medium | High | Explicitly deferred in Non-Goals. If header-based splitting proves insufficient, consider ML-based semantic chunking (e.g., LlamaIndex). Requires significant research and validation. |
| 5 | Configurable chunk overlap | Medium | Low | If overlap is needed (per Gap #1), make overlap percentage configurable via CLI flag: `--overlap=10` (10% of maxTokens). |
| 6 | Chunk quality metrics | Low | Medium | After chunking, report metrics: total chunks, avg tokens/chunk, std deviation, % of chunks exceeding limit (code blocks). Helps user validate chunking quality. |
| 7 | Dry-run mode | Low | Low | Add `--dry-run` flag to show chunk boundaries without outputting full JSON. Useful for experimenting with `--max-tokens` values. |
| 8 | Batch processing | Medium | Medium | Extend CLI to accept directory path or glob pattern: `pnpm kb:chunk docs/**/*.md`. Chunks all matching files and outputs combined JSON array. |

## Categories

- **Edge Cases**: Gaps #2-6 (sentence splitting, validation, nested code, progress indication)
- **UX Polish**: Enhancement #2, #6, #7 (output detection, metrics, dry-run)
- **Performance**: Gap #6 (progress indication for large files)
- **Observability**: Enhancement #6 (chunk quality metrics)
- **Integrations**: Enhancement #8 (batch processing for multiple files)
- **Future-Proofing**: Enhancement #1, #3, #4, #5 (hierarchical paths, multi-format, ML-based, overlap config)

## Notes

**Learning Story Context**: This story is tagged `learning-story` to understand RAG chunking patterns. After implementation, capture learnings about:
- Optimal chunk size for this codebase's documents (500 tokens vs alternatives)
- Whether header-based splitting suffices or if overlap is needed
- Retrieval quality improvements (measure before/after chunking)
- Edge cases encountered in real markdown documents

These learnings should be written to the Knowledge Base via `kb_add` with tags: `[lesson-learned, RAG, chunking, KNOW-048]`.

**Recommended Next Steps After MVP**:
1. Implement MVP with clarifications from ANALYSIS.md
2. Test with real codebase documents (READMEs, design docs)
3. Measure retrieval quality before/after chunking
4. Document learnings to KB
5. Revisit Gap #1 (overlap) if retrieval quality suffers
6. Consider Enhancement #8 (batch processing) if chunking many files becomes common
