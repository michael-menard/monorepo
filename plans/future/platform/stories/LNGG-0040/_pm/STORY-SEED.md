---
generated: "2026-02-14"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: LNGG-0040

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline exists for platform epic at the expected path. This story seed is generated from index context and codebase analysis only.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Story File Adapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | In-Progress (LNGG-0010) | **Critical dependency** - provides read/write for story files |
| Path Resolver | `packages/backend/orchestrator/src/persistence/path-resolver.ts` | Deployed | Handles stage directory name mapping and path construction |
| Directory Structure Flattening | `docs/workflow/story-directory-structure.md` | Deployed (WINT-1020) | **Critical context** - stories no longer in lifecycle directories |
| Story Command: story-move | `.claude/commands/story-move.md` | Deployed | Current stage movement implementation (file-based) |

### Active In-Progress Work

| Story ID | Title | Stage | Overlap Risk |
|----------|-------|-------|--------------|
| LNGG-0010 | Story File Adapter — YAML Read/Write | in-progress | **BLOCKING DEPENDENCY** - must complete first |
| WINT-7010 | Audit Agent Directory References | in-progress | Low risk - different domain |

### Constraints to Respect

1. **CRITICAL: Story Directory Flattening (WINT-1020)** - As of WINT-1020, stories are NO LONGER organized in lifecycle directories (backlog/, elaboration/, in-progress/, UAT/, etc.). All stories exist in flat epic-level directories with status tracked in YAML frontmatter.
2. **CRITICAL: Status Field in Frontmatter** - Story status is stored in the `status` field (not `state`) in YAML frontmatter as the single source of truth.
3. **Story Command Compatibility Gap** - Between WINT-1020 (migration) and WINT-1030 (database population), story commands will NOT work. LNGG-0040 must decide whether to support lifecycle directories (legacy) or flat structure (future).
4. **Zod-First Types (REQUIRED)** - All types MUST be defined using Zod schemas with `z.infer<>`, never TypeScript interfaces
5. **No Barrel Files** - Import directly from source files, no index.ts re-exports
6. **@repo/logger for Logging** - Never use console.log

---

## Retrieved Context

### Related Endpoints
None - this is a file system adapter, not an API endpoint story.

### Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| StoryFileAdapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | **DEPENDENCY** - Provides read/write operations for story files |
| PathResolver | `packages/backend/orchestrator/src/persistence/path-resolver.ts` | Resolves stage directory names, artifact paths, provides stage enumeration |
| story-move command | `.claude/commands/story-move.md` | Current stage movement implementation - shows file system move pattern |

### Reuse Candidates

**MUST Reuse:**
1. **StoryFileAdapter** (LNGG-0010) - For reading/writing story YAML files
2. **PathResolver** - For stage directory name resolution and path construction
3. **StoryArtifactSchema** - Already includes `status` field for frontmatter updates
4. **Zod validation patterns** - Established in all adapter schemas

**May Create:**
1. Stage Movement Adapter class (new)
2. Stage transition validation logic (new)
3. Status synchronization utilities (new)

---

## Knowledge Context

### Lessons Learned

No LNGG-specific lessons found in knowledge base. This is the second adapter story in the LangGraph epic.

### Blockers to Avoid (from past stories)

From LNGG-0010 discovery:
- **Schema mismatches** - LNGG-0010 faced a critical schema mismatch issue that blocked implementation. Resolved by creating backward-compatible schema.
- **Filesystem operations** - Ensure atomic operations to prevent partial state corruption.

### Architecture Decisions (ADRs)

No ADRs directly applicable to this story (file system operations, not HTTP or testing).

### Patterns to Follow

**From LNGG-0010:**
1. **Adapter pattern** - Pure I/O adapter, no business logic, transport-agnostic by design
2. **Atomic operations** - Use atomic file operations to prevent corruption
3. **Typed error handling** - Custom error classes with context
4. **Batch operations** - Support moving multiple stories in parallel for performance

**From PathResolver:**
1. **Stage directory mapping** - Use `STATE_TO_STAGE_DIRECTORY` for stage name resolution
2. **Cross-platform paths** - Use `path.join()` for all path operations

**From story-move command:**
1. **Search pattern** - Search all stage directories to find story before moving
2. **Validation** - Check target doesn't already exist before moving
3. **Status update** - Optionally update YAML frontmatter status field after move

### Patterns to Avoid

1. **TypeScript interfaces** - Use Zod schemas instead
2. **Barrel files** - No index.ts re-exports
3. **console.log** - Use @repo/logger
4. **Hardcoded paths** - Resolve from monorepo root
5. **Non-atomic operations** - Prevent partial state corruption

---

## Conflict Analysis

### Conflict: CRITICAL - Story Directory Structure Change

- **Severity**: blocking
- **Source**: WINT-1020 (Story Directory Flattening)
- **Description**: WINT-1020 has fundamentally changed the story directory structure from lifecycle-based (backlog/, in-progress/, UAT/) to flat (all stories at epic level with status in frontmatter). The story-move command and PathResolver still reference lifecycle directories. LNGG-0040 must decide whether to:
  - **Option A**: Support legacy lifecycle directories for backward compatibility (interim solution until WINT-1030)
  - **Option B**: Support only flat structure with status updates (future-proof but breaks existing workflows)
  - **Option C**: Support both structures with auto-detection (complex but maximally compatible)
- **Resolution Hint**: PM must clarify target directory structure before implementation can proceed. Check with WINT-1020 completion status and WINT-1030 timeline. If WINT-1030 is near completion, Option B (flat structure only) may be viable. Otherwise, Option C (dual support) may be necessary.
- **Impact on ACs**: This affects ALL acceptance criteria because the fundamental operation (moving story directories vs updating frontmatter status) depends on which structure is supported.

---

## Story Seed

### Title
Stage Movement Adapter

### Description

**Context:**
LangGraph workflows need to transition stories between lifecycle stages (backlog → elaboration → ready-to-work → in-progress → ready-for-qa → UAT). Currently, the `/story-move` command performs this by moving story directories between stage folders. However, **WINT-1020 has fundamentally changed the directory structure** - stories are now flat (all at epic level) with status tracked in YAML frontmatter, not directory location.

**Problem:**
Without a stage movement adapter, LangGraph workflows cannot:
- Transition stories between stages in an automated workflow
- Update story status in frontmatter as stories progress
- Validate stage transitions (prevent invalid moves like UAT → backlog)
- Maintain consistency between story location and status field

The current `/story-move` command is file-based and relies on lifecycle directories, which are being phased out by WINT-1020.

**Critical Decision Required:**
PM must clarify which directory structure LNGG-0040 should target:
- **Legacy (lifecycle directories)**: backlog/, in-progress/, UAT/ structure
- **Future (flat + frontmatter)**: flat structure with status field updates only
- **Both (dual support)**: Auto-detect structure and support both approaches

This decision is BLOCKING for implementation.

**Solution Direction (pending PM decision):**
Create a type-safe Stage Movement Adapter that:
1. Uses StoryFileAdapter (LNGG-0010) for reading/writing story files
2. Updates story status in YAML frontmatter (required for flat structure)
3. Optionally moves directories (if supporting legacy structure)
4. Validates stage transitions (prevent invalid moves)
5. Handles errors gracefully (story not found, invalid stage, permission errors)
6. Works cross-platform (macOS, Linux, Windows)

### Initial Acceptance Criteria

**WARNING**: These ACs assume Option B (flat structure with status updates). If PM chooses Option A or C, ACs must be revised.

- [ ] **AC-1:** Adapter updates story status field in YAML frontmatter when moving stages
  - **Test:** Move story from backlog to in-progress, verify `status: in-progress` in frontmatter

- [ ] **AC-2:** Adapter validates stage transitions to prevent invalid moves
  - **Test:** Attempt to move from UAT to backlog, verify transition rejected

- [ ] **AC-3:** Adapter handles missing stories gracefully
  - **Test:** Attempt to move non-existent story, verify `StoryNotFoundError` thrown

- [ ] **AC-4:** Adapter searches all possible stage directories to locate story
  - **Test:** Move story without specifying current stage, verify adapter finds it

- [ ] **AC-5:** Adapter supports batch stage movements for parallel processing
  - **Test:** Move 10 stories from ready-to-work to in-progress, verify all complete <2s

- [ ] **AC-6:** Adapter logs all stage transitions with structured logging
  - **Test:** Verify stage movement logged with story ID, from/to stages, timestamp

### Non-Goals

1. **Story creation** - That's workflow orchestration, not stage movement
2. **Index file updates** - That's LNGG-0020 (Index Management Adapter)
3. **Checkpoint management** - That's LNGG-0060 (Checkpoint Adapter)
4. **Knowledge base writes** - That's LNGG-0050 (KB Writing Adapter)
5. **Decision prompts** - That's LNGG-0030 (Decision Callback System)
6. **Story validation** - Assume StoryFileAdapter (LNGG-0010) handles validation
7. **Rollback mechanism** - File operations are atomic, rollback is manual
8. **Workflow state tracking** - Assume stories track their own state in frontmatter

### Reuse Plan

**Components to Reuse:**
- `StoryFileAdapter` from LNGG-0010 (MUST use for file I/O)
- `PathResolver` from `packages/backend/orchestrator/src/persistence/path-resolver.ts`
- `StoryArtifactSchema` (already includes `status` field)
- Stage directory mapping from PathResolver (`STATE_TO_STAGE_DIRECTORY`, `DIRECTORY_TO_STAGE`)

**Patterns to Follow:**
- Adapter pattern (pure stage movement logic, no workflow orchestration)
- Atomic operations (via StoryFileAdapter)
- Typed error handling (custom error classes)
- Component directory structure: `__types__/`, `__tests__/`, `utils/`

**Packages to Leverage:**
- `@repo/logger` (already installed)
- `zod` (already installed in orchestrator package)
- `path` (Node.js built-in)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Priorities:**
1. **Unit tests** for stage transition validation logic (>80% coverage target)
2. **Integration tests** with real story files from `plans/future/platform/` (test on WINT-1020 flattened structure)
3. **Transition validation tests** - Test all valid and invalid stage transitions
4. **Error handling tests** - Missing stories, permission errors, invalid stages
5. **Batch operation tests** - Move 10 stories in parallel, verify performance <2s

**Critical Testing Context:**
- **WINT-1020 impact**: Test on flattened directory structure, not lifecycle directories
- **Backward compatibility**: If PM chooses Option C (dual support), test both structures

**Test Fixtures:**
- Create test stories in various stages (backlog, in-progress, UAT)
- Test invalid transition attempts (UAT → backlog)
- Test batch movements (10+ stories)

### For UI/UX Advisor

Not applicable - this is a backend file system adapter with no UI surface.

### For Dev Feasibility

**Implementation Considerations:**

1. **CRITICAL: Directory Structure Decision:**
   - PM must clarify target structure before implementation can begin
   - Survey WINT-1020 migration status across all epics
   - Check WINT-1030 timeline (database population story)
   - Determine if interim solution (legacy support) is needed

2. **Dependency on LNGG-0010:**
   - LNGG-0010 (Story File Adapter) is currently in-progress
   - LNGG-0040 CANNOT start until LNGG-0010 is complete
   - Verify StoryFileAdapter has `update()` method for status field changes

3. **Stage Transition Validation:**
   - Define valid stage transition graph (DAG)
   - Prevent backward transitions (e.g., UAT → backlog)
   - Allow lateral transitions (e.g., in-progress → ready-for-qa)
   - Consider "return to in-progress" use case (UAT → in-progress on failure)

4. **Path Resolution:**
   - Use PathResolver for stage directory name mapping
   - Handle case-sensitivity (UAT vs uat)
   - Support both absolute and relative paths

5. **Error Handling:**
   - `StoryNotFoundError` - Story doesn't exist in any stage
   - `InvalidStageError` - Target stage is invalid
   - `InvalidTransitionError` - Transition not allowed by DAG
   - `StageConflictError` - Story already in target stage
   - `FileOperationError` - Permission denied or filesystem error

6. **Performance:**
   - Target: <100ms per single move
   - Target: <2s for batch move of 10 stories
   - Use StoryFileAdapter's batch operations if available

7. **Files to Create:**
   - `packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts` (main class)
   - `packages/backend/orchestrator/src/adapters/__types__/stage-types.ts` (stage transition graph)
   - `packages/backend/orchestrator/src/adapters/__tests__/stage-movement-adapter.test.ts` (unit tests)
   - `packages/backend/orchestrator/src/adapters/__tests__/stage-movement-adapter.integration.test.ts` (integration tests)
   - `packages/backend/orchestrator/src/adapters/utils/stage-validator.ts` (transition validation)

8. **Risk Mitigations:**
   - **Risk:** Directory structure assumption breaks → Survey WINT-1020 status, get PM clarification
   - **Risk:** StoryFileAdapter incomplete → Wait for LNGG-0010 completion, verify API contract
   - **Risk:** Invalid transitions corrupt story state → Implement strict DAG validation
   - **Risk:** Performance bottleneck on batch moves → Use parallel operations, benchmark

---

## BLOCKING ISSUES

### 1. Dependency on LNGG-0010
**Status**: BLOCKING
**Description**: LNGG-0010 (Story File Adapter) is in-progress. LNGG-0040 cannot begin implementation until LNGG-0010 is complete and StoryFileAdapter is available.
**Resolution**: Wait for LNGG-0010 completion. Monitor LNGG-0010 progress.

### 2. Directory Structure Ambiguity
**Status**: BLOCKING
**Description**: WINT-1020 changed directory structure from lifecycle-based to flat, but story index and story-move command still reference lifecycle directories. PM must clarify which structure LNGG-0040 should target.
**Resolution**: PM must choose Option A (legacy), Option B (flat), or Option C (dual support) before implementation can proceed.

---

STORY-SEED BLOCKED: Two critical issues prevent seed completion:
1. Dependency on LNGG-0010 (Story File Adapter) which is in-progress
2. Directory structure ambiguity (lifecycle vs flat) requires PM decision
