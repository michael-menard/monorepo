# Future Opportunities - LNGG-0010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No file locking mechanism - concurrent writes may cause last-write-wins behavior | Low | Medium | Add optional file locking using node-file-lock or similar, document behavior for MVP |
| 2 | No caching layer - repeated reads of same file hit disk every time | Low | Low | Add LRU cache for frequently accessed stories, invalidate on write |
| 3 | No schema migration utilities - manual migration required if schema changes | Medium | Medium | Add schema version detection and automatic migration between versions |
| 4 | No validation of file path injection - malicious paths could escape monorepo root | Medium | Low | Add path validation to ensure resolved paths stay within monorepo root |
| 5 | No metrics/telemetry - cannot track adapter performance in production | Low | Low | Add performance metrics using @repo/logger for read/write/validation times |
| 6 | No retry logic for transient failures - network drives may fail intermittently | Low | Medium | Add exponential backoff retry for ENOENT/EACCES errors |
| 7 | No backup/rollback mechanism - failed writes may leave corrupted files | Medium | Medium | Add automatic backup before write, restore on failure |
| 8 | No batch write support - writing 50 stories requires 50 individual calls | Low | Low | Add writeBatch() method with parallel writes |
| 9 | No diff/patch support - update() requires full object, cannot apply targeted changes | Low | Medium | Add patch-based updates using JSON Patch or similar |
| 10 | No watch mode - cannot detect external changes to story files | Low | High | Add file watcher integration for hot reload in dev mode |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add dry-run mode for write operations - preview changes without committing | Medium | Low | Add `dryRun: boolean` option to write/update methods |
| 2 | Add validation report mode - scan directory and report all invalid files | Medium | Low | Add validateBatch() method that returns validation errors without throwing |
| 3 | Add pretty-print option for YAML output - customize formatting/indentation | Low | Low | Expose js-yaml options for indent, lineWidth, etc. |
| 4 | Add JSON output mode - serialize stories as JSON instead of YAML | Low | Low | Add outputFormat parameter with 'yaml' | 'json' options |
| 5 | Add field filtering - read only specific fields instead of full story | Medium | Medium | Add fields parameter to read() method for projection |
| 6 | Add sorting/ordering for batch reads - deterministic result order | Low | Low | Add sortBy parameter to readBatch() method |
| 7 | Add compression support - gzip large story files automatically | Low | Medium | Add transparent gzip compression for files >100KB |
| 8 | Add checksum validation - detect silent file corruption | Medium | Low | Add SHA256 checksum to frontmatter, validate on read |
| 9 | Add YAML comment preservation - maintain human-added comments | High | High | Switch to yaml library that preserves comments (yaml-js or ruamel-like) |
| 10 | Add schema inference - auto-detect schema version from file contents | Medium | Medium | Add version detection logic before parsing |

## Categories

### Edge Cases
- File locking for concurrent access (Gap #1)
- Path injection security (Gap #4)
- Retry logic for transient failures (Gap #6)
- Backup/rollback for failed writes (Gap #7)
- Schema migration support (Gap #3)

### UX Polish
- Dry-run mode for preview (Enhancement #1)
- Validation reports without throwing (Enhancement #2)
- Pretty-print YAML formatting (Enhancement #3)
- JSON output option (Enhancement #4)
- Comment preservation in YAML (Enhancement #9)

### Performance
- Caching layer for repeated reads (Gap #2)
- Batch write support (Gap #8)
- Field filtering for selective reads (Enhancement #5)
- Compression for large files (Enhancement #7)

### Observability
- Performance metrics/telemetry (Gap #5)
- Checksum validation (Enhancement #8)
- Validation reports (Enhancement #2)

### Integrations
- File watching for hot reload (Gap #10)
- Schema version auto-detection (Enhancement #10)
- Diff/patch support (Gap #9)

## Priority Recommendations

**High-Impact, Low-Effort (Quick Wins):**
1. Add dry-run mode (Enhancement #1) - useful for debugging, 1-2 hours
2. Add validation reports (Enhancement #2) - helps with migration, 2-3 hours
3. Add caching layer (Gap #2) - significant performance boost, 3-4 hours
4. Add path validation (Gap #4) - security improvement, 1-2 hours
5. Add performance metrics (Gap #5) - production visibility, 2-3 hours

**High-Impact, High-Effort (Future Stories):**
1. Comment preservation (Enhancement #9) - critical for human-edited files, requires library change
2. File watching (Gap #10) - enables real-time sync, significant dev effort
3. Schema migration (Gap #3) - necessary for long-term maintainability
4. Backup/rollback (Gap #7) - safety net for production use

**Nice-to-Have:**
- Pretty-print options (Enhancement #3)
- JSON output (Enhancement #4)
- Sorting/ordering (Enhancement #6)
- Compression (Enhancement #7)
- Checksum validation (Enhancement #8)
