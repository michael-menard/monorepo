---
generated: "2026-02-14"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: LNGG-0020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No lesson-learned KB entries found for index management patterns

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| Orchestrator YAML Artifacts | Deployed | Location: `packages/backend/orchestrator/src/artifacts/` with Zod validation |
| StoryFileAdapter | In Progress (LNGG-0010) | Provides pattern for atomic file operations, YAML parsing, Zod validation |
| Story v2 Compatible Schema | Deployed | Backward-compatible schema at `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` |
| YAML Parser Utils | Deployed | Gray-matter parsing at `packages/backend/orchestrator/src/adapters/utils/yaml-parser.ts` |
| File Utils | Deployed | Atomic write pattern at `packages/backend/orchestrator/src/adapters/utils/file-utils.ts` |
| Docker Compose Infrastructure | Deployed | PostgreSQL, Redis, Prometheus available for future DB-backed index |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| LNGG-0010 | In Progress (Elaboration) | **BLOCKS THIS STORY** - Schema resolution complete, adapter implementation underway |
| WINT-7010 | In Progress | None - Different scope (agent directory references) |

### Constraints to Respect

1. **Zod-First Types (REQUIRED)** - All schemas must use Zod with `z.infer<>`, never TypeScript interfaces
2. **No Barrel Files** - Import directly from source files
3. **Functional Components** - Function declarations, named exports
4. **@repo/logger for Logging** - Never use console.log
5. **Atomic File Operations** - Use temp file + rename pattern from file-utils
6. **Orchestrator Artifact Schemas** - Must follow established YAML artifact patterns
7. **Protected Features** - Do not modify `@repo/db` client package or production DB schemas

---

## Retrieved Context

### Related Endpoints
None - This is a file system adapter, not an API story.

### Related Components

| Component | Location | Reuse Opportunity |
|-----------|----------|-------------------|
| StoryFileAdapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | **Pattern reference** for atomic operations, error handling, batch reads |
| YAML Parser | `packages/backend/orchestrator/src/adapters/utils/yaml-parser.ts` | **Reuse** for frontmatter parsing (gray-matter) |
| File Utils | `packages/backend/orchestrator/src/adapters/utils/file-utils.ts` | **Reuse** for atomic writes, directory creation, file existence checks |
| Error Types | `packages/backend/orchestrator/src/adapters/__types__/index.ts` | **Extend** for index-specific errors |
| Decision Callbacks | `packages/backend/orchestrator/src/adapters/decision-callbacks/` | **Reference** for registry pattern if needed |

### Reuse Candidates

**High-Priority Reuse:**
- `writeFileAtomic()` - Prevents partial file corruption
- `readFileSafe()` - Safe file reading with error handling
- `ensureDirectory()` - Ensures parent directories exist
- `parseFrontmatter()` - Handles YAML frontmatter extraction
- `InvalidYAMLError`, `ReadError`, `WriteError` - Existing error classes

**Pattern Reuse:**
- Batch operations pattern from `StoryFileAdapter.readBatch()`
- Zod validation pattern from `story-v2-compatible.ts`
- Class structure with public async methods
- JSDoc comments with `@example` blocks

---

## Knowledge Context

### Lessons Learned

**Note:** No KB entries found for index management or markdown table parsing. This is a greenfield implementation.

### Blockers to Avoid (from past stories)

Based on analysis of existing adapter implementations:

1. **Avoid reading entire files into memory** - Current platform index has 235 stories. Must use streaming or chunked reads for large indexes.
2. **Avoid regex-only markdown parsing** - Use structured parsing libraries where possible to prevent edge cases.
3. **Avoid tight coupling to file format** - Abstract parsing logic to allow future migration to YAML/JSON index.
4. **Avoid synchronous file operations** - All file I/O must be async to prevent blocking LangGraph nodes.

### Architecture Decisions (ADRs)

**Note:** No ADR-LOG.md found in platform directory. No active ADRs apply to this story.

### Patterns to Follow

From existing codebase:
- **Atomic writes** via temp file + rename (StoryFileAdapter pattern)
- **Zod validation** before all writes (story-v2-compatible pattern)
- **Batch operations** for performance (StoryFileAdapter.readBatch pattern)
- **Typed errors** with context (Error classes in `__types__/index.ts`)
- **JSDoc examples** in every public method

### Patterns to Avoid

From codebase conventions:
- **Barrel files** (index.ts re-exports) - Import directly
- **console.log** - Use @repo/logger
- **TypeScript interfaces** - Use Zod schemas with z.infer<>
- **Hardcoded paths** - Accept paths as parameters, use path.resolve()
- **Mutable state** - Prefer immutable data structures in transactions

---

## Conflict Analysis

**No conflicts detected.**

---

## Story Seed

### Title
Index Management Adapter — stories.index.md Updates

### Description

**Context:**
The platform stories index (`platform.stories.index.md`) is a **markdown table format** tracking 235 stories across 11 epics. The file uses:
- YAML frontmatter for metadata (doc_type, status, dates)
- Markdown headers for wave organization
- Markdown tables with columns: `#`, `Story`, `Title`, `← Depends On`, `Epic`, `Priority`
- Inline status markers like `[x]`, `[~]`, `[ ]` in the Title column
- Special symbols (⚡ for critical, 🎯 for milestones, ✨ for LangGraph work)

**Current State:**
- LNGG-0010 (Story File Adapter) is in-progress with schema resolution complete
- StoryFileAdapter provides atomic file operations and Zod validation patterns
- YAML parser utils (gray-matter) exist for frontmatter parsing
- No programmatic way to update the markdown table portion of index files

**Problem:**
LangGraph workflows need to:
1. Add new stories to index tables (append row to appropriate wave table)
2. Update story status in tables (change inline markers like `[ ]` → `[~]` → `[x]`)
3. Update story metadata (dependencies, priority, epic)
4. Recalculate wave/epic metrics (count stories by status)
5. Preserve markdown formatting and manual annotations
6. Handle concurrent updates safely (transaction support)

**Solution Direction:**
Build an `IndexAdapter` class that:
- Parses markdown table format (not YAML frontmatter per-story as LNGG-002 spec assumed)
- Updates table rows by story ID
- Recalculates metrics from table data
- Validates table structure (story ID uniqueness, dependency references)
- Supports atomic updates (read → modify → validate → write)
- Preserves formatting and manual edits outside tables

**Key Difference from Original Spec:**
The original LNGG-002 spec assumed YAML-based index format. The **actual format is markdown tables**, so the adapter must:
- Parse markdown tables (not YAML story entries)
- Update table cells (not YAML fields)
- Preserve markdown structure (headers, wave sections, legends)
- Handle inline status markers (not YAML status fields)

### Initial Acceptance Criteria

- [ ] **AC-1: Parse Index File**
  - Given a `platform.stories.index.md` file
  - When `IndexAdapter.readIndex(indexPath)` is called
  - Then it returns a structured object with:
    - Frontmatter metadata (from YAML)
    - Array of wave sections
    - Array of story entries parsed from tables
    - Metrics calculated from table data
  - Validation: Parses all 235 stories from actual platform index

- [ ] **AC-2: Update Story Status in Table**
  - Given a story ID and new status
  - When `IndexAdapter.updateStoryStatus(storyId, status, indexPath)` is called
  - Then it:
    - Finds the story row in the markdown table
    - Updates the inline status marker (`[ ]` → `[~]` → `[x]`)
    - Preserves all other table data
    - Writes atomically using temp file + rename
  - Validation: Update LNGG-0020 from pending to ready-to-work

- [ ] **AC-3: Add Story to Index Table**
  - Given a new story entry
  - When `IndexAdapter.addStory(entry, waveSection, indexPath)` is called
  - Then it:
    - Appends a new row to the specified wave table
    - Formats the row to match existing format
    - Assigns next sequential `#` number
    - Validates story ID uniqueness before add
  - Validation: Add a test story LNGG-9999 to Wave 2

- [ ] **AC-4: Validate Index Structure**
  - Given an index file or parsed object
  - When `IndexAdapter.validate(index)` is called
  - Then it:
    - Validates story ID uniqueness across all waves
    - Validates dependency references exist (← Depends On column)
    - Detects circular dependencies
    - Returns ValidationResult with errors array
  - Validation: Detect circular dependency if LNGG-0020 ← LNGG-0030 and LNGG-0030 ← LNGG-0020

- [ ] **AC-5: Preserve Formatting and Manual Edits**
  - Given an index with manual annotations (emojis, bold, etc.)
  - When any update operation is performed
  - Then it:
    - Preserves markdown formatting outside tables
    - Preserves emojis (⚡, 🎯, ✨)
    - Preserves bold/italic markers
    - Preserves legend and header sections
  - Validation: Update a story and verify emojis/bold are unchanged

- [ ] **AC-6: Calculate Metrics from Table Data**
  - Given a parsed index
  - When `IndexAdapter.recalculateMetrics(index)` is called
  - Then it:
    - Counts stories by status (pending, ready-to-work, in-progress, completed)
    - Counts stories by epic (LNGG, WINT, INFR, etc.)
    - Calculates completion percentage
    - Returns metrics object
  - Validation: Verify 235 total stories, count by wave matches table

### Non-Goals

**Explicit Out of Scope:**
1. **UI/UX changes** - This is a backend adapter, no user interface
2. **Database persistence** - File-based only, no DB writes (WINT-0020 handles DB)
3. **Real-time collaboration** - No conflict resolution for concurrent edits
4. **Version control integration** - No git operations, just file writes
5. **Index format migration** - Keep markdown table format, don't migrate to YAML/JSON
6. **Legacy index format support** - Only support current markdown table format
7. **Cross-epic validation** - Only validate within single index file
8. **Dependency graph visualization** - Only detect cycles, don't render graphs

**Protected Areas (Do Not Touch):**
- `@repo/db` client package
- Production database schemas
- Orchestrator artifact schemas (read-only reference)
- Existing story files (those are StoryFileAdapter's responsibility)

### Reuse Plan

**Components to Reuse:**
- `writeFileAtomic()` from `packages/backend/orchestrator/src/adapters/utils/file-utils.ts`
- `readFileSafe()` from `packages/backend/orchestrator/src/adapters/utils/file-utils.ts`
- `ensureDirectory()` from `packages/backend/orchestrator/src/adapters/utils/file-utils.ts`
- `parseFrontmatter()` from `packages/backend/orchestrator/src/adapters/utils/yaml-parser.ts`
- `serializeStory()` pattern (adapt for index format) from yaml-parser
- Error classes (`ReadError`, `WriteError`, etc.) from `packages/backend/orchestrator/src/adapters/__types__/index.ts`

**Patterns to Reuse:**
- Class structure from `StoryFileAdapter` (public async methods, private helpers)
- Batch operations pattern from `StoryFileAdapter.readBatch()`
- Zod validation pattern from `story-v2-compatible.ts`
- JSDoc with `@example` blocks
- Test structure from `packages/backend/orchestrator/src/adapters/__tests__/story-file-adapter.test.ts`

**Packages to Leverage:**
- `@repo/logger` for logging
- `zod` for schema validation
- `gray-matter` for YAML frontmatter parsing (already used in yaml-parser)
- Consider `remark` or `unified` for markdown table parsing (evaluate if needed)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Test Complexity:**
- **Medium complexity** - Markdown table parsing is more complex than YAML parsing
- Need fixtures for various table formats (with/without priority column, different wave structures)
- Need edge case tests (malformed tables, missing columns, duplicate IDs)
- Need performance tests (parsing 235+ story tables)

**Test Data:**
- Use actual `platform.stories.index.md` for integration tests
- Create minimal fixtures for unit tests (single wave, 3-5 stories)
- Test concurrent updates with temp file race conditions

**Test Priorities:**
1. **Critical:** Parse actual platform index without errors
2. **Critical:** Update story status preserves all other data
3. **High:** Validate circular dependency detection
4. **High:** Atomic writes prevent corruption
5. **Medium:** Performance on large indexes (1000+ stories)

### For UI/UX Advisor

**Note:** This is a backend adapter with no UI component. Skip UI/UX phase.

### For Dev Feasibility

**Implementation Risks:**

1. **Markdown Table Parsing Complexity**
   - Risk: Regex-based parsing is fragile with edge cases
   - Mitigation: Consider `remark`/`unified` markdown AST parser
   - Fallback: Well-tested regex with comprehensive test coverage

2. **Format Preservation**
   - Risk: Hard to preserve formatting after table modifications
   - Mitigation: Only modify specific table cells, not entire table
   - Fallback: Regenerate table rows but preserve headers/footers

3. **Concurrent Updates**
   - Risk: Two workflows updating same index simultaneously
   - Mitigation: Atomic write pattern (temp file + rename)
   - Future: File locking mechanism if needed

4. **Dependency on LNGG-0010**
   - Risk: LNGG-0010 not complete yet
   - Mitigation: Can start with utils/error classes, defer integration
   - Timeline: LNGG-0010 schema complete, implementation in progress

**Technical Decisions Needed:**
1. **Markdown Parser:** Regex vs. remark/unified library
   - Recommendation: Start with regex for MVP, upgrade to remark if fragile
2. **Transaction Support:** In-memory vs. file-based rollback
   - Recommendation: In-memory (clone object, modify, validate, write)
3. **Metrics Storage:** Calculated on-demand vs. cached in frontmatter
   - Recommendation: Calculated on-demand (always accurate)

**Estimated Effort Validation:**
- Original estimate: 6 hours
- Adjusted for markdown parsing: **8 hours**
  - 2 hours: Markdown table parsing logic
  - 2 hours: Update operations (status, add, remove)
  - 2 hours: Validation (uniqueness, cycles, refs)
  - 1 hour: Metrics calculation
  - 1 hour: Integration tests with real index

**Dependencies Timeline:**
- LNGG-0010: In progress, utils available now, integration in ~3-5 days
- Can start immediately with: error classes, parsing logic, validation
- Defer until LNGG-0010 complete: Integration tests, batch operations

---

**STORY-SEED COMPLETE**
