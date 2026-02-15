# Future Opportunities - WINT-1020

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No performance optimization for large epics (100+ stories) | Low | Medium | WINT-1020.1: Add parallel processing with Promise.all() for independent stories, progress bar, incremental migration with checkpoints |
| 2 | Symlink/hardlink edge cases not thoroughly handled | Low | Low | WINT-1020.2: Add symlink detection and logging, test with symlinked artifacts, document behavior in runbook |
| 3 | Git history tracking obscured by migration commit | Low | Low | Document `git log --follow` usage for tracking history across moves, add to migration runbook |
| 4 | Concurrent story creation during migration could cause conflicts | Low | Medium | Add file lock or migration-in-progress flag (defer to WINT-1030 when DB-driven) |
| 5 | File timestamps not explicitly preserved | Low | Low | WINT-1020.3: Use `fs.utimes()` to preserve original timestamps after move, log original/new timestamps |
| 6 | No automated integration test suite | Medium | Medium | WINT-1020.7: Create Vitest-based test suite that creates temp test epics, runs migration, validates outcomes in CI |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | HTML migration report would improve transparency | Medium | Medium | WINT-1020.4: Generate human-readable HTML report showing migration summary, duplicate resolutions, before/after comparison |
| 2 | Progressive migration with checkpoint support | Low | High | WINT-1020.5: Allow pause/resume with checkpoints per epic/story for very large migrations |
| 3 | Dry-run diff visualization | Medium | Medium | WINT-1020.6: Generate side-by-side diff showing before/after directory structure for non-technical reviewers |
| 4 | Colored console output for better UX | Low | Low | WINT-1020.8: Use `chalk` or similar for green (success), yellow (warnings), red (errors) |
| 5 | Interactive confirmation prompt | Low | Low | WINT-1020.9: Add "Are you sure?" prompt with story count before executing migration |
| 6 | Email/Slack notification on completion | Low | Medium | WINT-1020.10: Send notification for long-running migrations (enterprise feature) |
| 7 | Migration metrics and analytics | Low | Medium | Track migration duration, success rate, common failure patterns for future optimizations |
| 8 | Automated rollback on partial failure | Medium | Medium | Detect mid-migration failures automatically and trigger rollback without manual intervention |

## Categories

### Edge Cases
- **Symlinks/hardlinks**: Test 14 covers basic case, but comprehensive symlink strategy deferred
- **Unicode/special chars in story IDs**: Validate IDs match `[A-Z]+-[0-9]+` pattern during scan
- **Very long file paths**: Log warning if path length exceeds OS limits (260 chars Windows, 4096 Linux)
- **Case-insensitive filesystems**: Normalize story IDs to uppercase to detect case-only duplicates on macOS

### UX Polish
- **Colored output**: Green/yellow/red for success/warning/error messages
- **Interactive prompts**: Confirmation before destructive operations
- **Progress indicators**: Real-time feedback for long-running migrations
- **Rich HTML reports**: Visual before/after comparison, duplicate resolution summary

### Performance
- **Parallel processing**: Process independent stories concurrently with `Promise.all()`
- **Incremental migration**: Checkpoint support for pause/resume on very large migrations
- **Streaming operations**: For epics with 100+ stories, stream file operations to reduce memory footprint

### Observability
- **Migration metrics**: Track duration, success rate, failure patterns
- **Completion notifications**: Email/Slack alerts for long-running operations
- **Audit trail enhancement**: More detailed logging of file operations with timestamps
- **Health checks**: Pre-flight validation (disk space, permissions, concurrent access)

### Integrations
- **CI/CD integration**: Automated test suite in GitHub Actions
- **Git integration**: Preserve authorship metadata, generate blame-friendly commits
- **Documentation generation**: Auto-generate migration runbook from test results

## Deferred to Downstream Stories

The following are explicitly out of scope per Non-Goals:

1. **WINT-1030**: Database population from migrated stories
2. **WINT-1040**: Update `/story-status` to use database
3. **WINT-1050**: Update `/story-update` to use database
4. **WINT-1060**: Update `/story-move` to use database
5. **WINT-1070**: Deprecate stories.index.md

## Scope Tightening Applied

The following tightening suggestions from FUTURE-RISKS.md were appropriate:

1. ✅ **Lifecycle directory cleanup deferred**: Leave empty lifecycle directories for WINT-1030 to clean up
2. ✅ **Test epic only**: First delivery should only migrate test epics, not production epics
3. ✅ **Manual conflict resolution**: Script halts on conflicts, no auto-merge logic
4. ✅ **Defer status enum validation**: Accept any string value for status field in MVP

These tightening decisions reduce MVP risk while preserving core functionality.

## Notes on Test Coverage

The test plan includes 14 tests covering:
- **Happy path** (Tests 1-4): Single story, duplicates, nested epics, all lifecycle directories
- **Error cases** (Tests 5-8): No frontmatter, malformed YAML, collisions, missing subdirectories
- **Edge cases** (Tests 9-14): Empty epics, UAT priority, large epics, rollback, concurrent access, symlinks

Test coverage is comprehensive for MVP. Additional automated tests (WINT-1020.7) would improve regression prevention but are not critical for initial delivery.

## Risk Mitigation Summary

All 5 MVP-critical risks from DEV-FEASIBILITY.md have concrete mitigations in the ACs:
1. **Data loss** → Backup tarball (AC-8), dry-run (AC-9), rollback (AC-8)
2. **Frontmatter corruption** → StoryFileAdapter + Zod validation (Reuse Plan)
3. **Duplicate conflicts** → Priority hierarchy (AC-3), comprehensive logging
4. **Incomplete migration** → Transaction-like approach (AC-3), rollback on failure (AC-8)
5. **Breaking commands** → Test epic only (AC-5), production block (AC-10)

Future opportunities listed above are enhancements that improve UX, performance, and observability, but are not required for safe migration.
