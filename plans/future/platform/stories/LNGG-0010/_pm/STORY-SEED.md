---
generated: "2026-02-13"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: LNGG-0010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No lessons learned KB available (knowledge base exists but no LNGG-specific lessons)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Orchestrator Artifact Schemas | `packages/backend/orchestrator/src/artifacts/` | Deployed | Story file schema exists (`story.ts`) with Zod validation |
| YAML Story Files | `plans/future/*/UAT/*/story.yaml` | Deployed | ~50+ story files exist using YAML frontmatter format |
| Docker Compose Dev Infra | `infra/compose.lego-app.yaml` | Deployed | Persistent volumes, service orchestration patterns |
| Zod-First Type System | Entire codebase | Deployed | All schemas use Zod (REQUIRED pattern) |

### Active In-Progress Work

| Story ID | Title | Stage | Overlap Risk |
|----------|-------|-------|--------------|
| MODL-0010 | Provider Adapters (OpenRouter/Ollama/Anthropic) | ready-to-work | None - different domain |

### Constraints to Respect

1. **Zod-First Types (REQUIRED)** - All types MUST be defined using Zod schemas with `z.infer<>`, never TypeScript interfaces
2. **No Barrel Files** - Import directly from source files, no index.ts re-exports
3. **Functional Components Only** - Named exports preferred
4. **@repo/logger for Logging** - Never use console.log
5. **Story YAML Format** - Frontmatter + Markdown content structure is established
6. **File System Structure** - `plans/future/{feature}/{stage}/{storyId}/story.yaml` pattern is rigid

---

## Retrieved Context

### Related Endpoints
None - this is a file I/O adapter, not an API endpoint story.

### Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| StoryArtifactSchema | `packages/backend/orchestrator/src/artifacts/story.ts` | Existing Zod schema for story structure (schema version 1) |
| Orchestrator Graphs | `packages/backend/orchestrator/src/graphs/` | LangGraph workflows that will consume this adapter |
| Story YAML Files | `plans/future/*/UAT/*/story.yaml` | 50+ existing story files to test compatibility |

### Reuse Candidates

**MUST Reuse:**
1. **StoryArtifactSchema** - Already exists with complete Zod validation (`packages/backend/orchestrator/src/artifacts/story.ts`)
2. **Zod validation patterns** - Established in all artifact schemas
3. **pnpm workspace structure** - Package is in monorepo under `packages/backend/orchestrator`

**May Create:**
1. Story File Adapter class (new)
2. YAML parsing utilities (new)
3. Atomic write utilities (new)
4. Test fixtures for story files (new)

---

## Knowledge Context

### Lessons Learned

No LNGG-specific lessons found in knowledge base. This is the first story in the LangGraph adapter epic.

### Blockers to Avoid (from past stories)

None specific to this story domain. General workflow patterns apply.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable (file I/O, not HTTP) |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks - applies to test fixtures |

### Patterns to Follow

**From Codebase:**
1. **Zod-First Validation** - All schemas defined with Zod, types inferred with `z.infer<>`
2. **Atomic Operations** - Database schemas use transactions; file writes should be atomic
3. **Error Handling** - Custom error classes with context (see database-schema patterns)
4. **Component Directory Structure** - `__types__/`, `__tests__/`, `utils/` subdirectories

**From Existing Story Files:**
1. YAML frontmatter with `---` delimiters
2. Markdown content following frontmatter
3. Story IDs in format `{PREFIX}-{NUMBER}` (e.g., LNGG-0010)
4. Stage directories: backlog, elaboration, ready-to-work, in-progress, ready-for-qa, UAT, completed

### Patterns to Avoid

1. **TypeScript interfaces** - Use Zod schemas instead
2. **Barrel files** - No index.ts re-exports
3. **console.log** - Use @repo/logger
4. **Hardcoded paths** - Resolve from monorepo root
5. **Non-atomic writes** - Prevent partial file corruption

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Story File Adapter — YAML Read/Write

### Description

**Context:**
LangGraph workflows need to interact with story files stored in the file system, but currently have no I/O capabilities. Story files are YAML frontmatter + Markdown content, stored in a rigid directory structure (`plans/future/{feature}/{stage}/{storyId}/story.yaml`). The orchestrator already has a `StoryArtifactSchema` (Zod-validated) but no adapter to serialize/deserialize these files to/from disk.

**Problem:**
Without a file adapter, LangGraph workflows cannot:
- Read existing story files for elaboration
- Write newly created story files
- Update story metadata (status, dates, tags)
- Validate story structure before persistence

This blocks all downstream adapter stories (LNGG-0020, LNGG-0040, LNGG-0060, LNGG-0070) that depend on story file I/O.

**Solution:**
Create a type-safe Story File Adapter that:
1. Reads story YAML files from disk and parses into `StoryArtifact` objects
2. Writes `StoryArtifact` objects to disk with proper YAML frontmatter formatting
3. Validates all I/O operations using existing `StoryArtifactSchema`
4. Handles errors gracefully (missing files, corrupted YAML, permissions)
5. Uses atomic writes to prevent partial file corruption
6. Works cross-platform (macOS, Linux, Windows)

### Initial Acceptance Criteria

- [ ] **AC-1:** Adapter reads existing story YAML files and parses into typed `StoryArtifact` objects using Zod validation
  - **Test:** Read `/plans/future/platform/workflow-learning/UAT/WKFL-001/story.yaml` and verify frontmatter fields match schema

- [ ] **AC-2:** Adapter writes `StoryArtifact` objects to disk with valid YAML frontmatter + Markdown content
  - **Test:** Write a test story, re-read it, and verify round-trip fidelity

- [ ] **AC-3:** Adapter updates existing story files (merges frontmatter changes, preserves content)
  - **Test:** Update `status` field, verify only `status` and `updated_at` changed

- [ ] **AC-4:** Adapter validates story structure before read/write operations
  - **Test:** Attempt to write invalid story (missing required field), verify validation error thrown

- [ ] **AC-5:** Adapter uses atomic writes (temp file + rename) to prevent partial corruption
  - **Test:** Simulate write failure mid-operation, verify no partial file left on disk

- [ ] **AC-6:** Adapter handles error conditions gracefully with typed errors
  - **Test:** Read missing file → `StoryNotFoundError`, read corrupted YAML → `InvalidYAMLError`

### Non-Goals

1. **Story creation logic** - Adapter is I/O only, not workflow orchestration
2. **Index file updates** - That's LNGG-0020 (Index Management Adapter)
3. **Stage movement** - That's LNGG-0040 (Stage Movement Adapter)
4. **Checkpoint management** - That's LNGG-0060 (Checkpoint Adapter)
5. **Decision prompts** - That's LNGG-0030 (Decision Callback System)
6. **Knowledge base writes** - That's LNGG-0050 (KB Writing Adapter)
7. **File watching/hot reload** - Future enhancement
8. **Concurrent write locking** - Assume single-writer for MVP

### Reuse Plan

**Components to Reuse:**
- `StoryArtifactSchema` from `packages/backend/orchestrator/src/artifacts/story.ts` (MUST use existing schema)
- Zod validation patterns from artifact schemas
- Error handling patterns from database-schema package

**Patterns to Follow:**
- Zod-first type definitions (use `z.infer<>` for all types)
- Component directory structure: `__types__/`, `__tests__/`, `utils/`
- Atomic write pattern (temp file + rename)
- Custom error classes with context

**Packages to Leverage:**
- `gray-matter` (YAML frontmatter parsing) - add as dependency
- `js-yaml` (YAML serialization) - add as dependency
- `zod` (already installed in orchestrator package)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Priorities:**
1. **Unit tests** for read/write/update/validate operations (>80% coverage target)
2. **Integration tests** with real story files from `plans/future/platform/workflow-learning/UAT/`
3. **Performance tests** - Read 50+ story files, verify <5s total, <100ms per write
4. **Cross-platform tests** - Verify Windows path handling (if applicable)
5. **Error handling tests** - Missing files, corrupted YAML, permission errors

**Test Fixtures:**
- Use real story files as fixtures (WKFL-001, WKFL-004, WKFL-005)
- Create minimal valid story fixture
- Create invalid story fixtures (missing fields, wrong types, corrupted YAML)

### For UI/UX Advisor

Not applicable - this is a backend file I/O adapter with no UI surface.

### For Dev Feasibility

**Implementation Considerations:**

1. **Existing Schema Alignment:**
   - `StoryArtifactSchema` exists but may not match all YAML file formats in the wild
   - Survey existing story YAML files to identify field mismatches
   - Consider schema migration strategy if mismatches found

2. **YAML Library Selection:**
   - `gray-matter` for frontmatter parsing (preserves formatting)
   - `js-yaml` for serialization (clean output)
   - Verify these work together for round-trip fidelity

3. **Path Resolution:**
   - Adapter should accept monorepo root as constructor param
   - All file paths should be absolute, resolved from root
   - Use `path.join()` for cross-platform compatibility

4. **Atomic Write Pattern:**
   - Write to `.tmp` file first
   - Use `fs.rename()` for atomic operation
   - Clean up `.tmp` file on error

5. **Performance:**
   - Parallel reads for batch operations (`Promise.all()`)
   - Cache parsed schemas if called repeatedly
   - Target: <50ms per read, <100ms per write

6. **Dependencies to Add:**
   ```json
   {
     "gray-matter": "^4.0.3",
     "js-yaml": "^4.1.0"
   }
   ```

7. **Files to Create:**
   - `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` (main class)
   - `packages/backend/orchestrator/src/adapters/__types__/index.ts` (re-export existing StoryArtifact types)
   - `packages/backend/orchestrator/src/adapters/__tests__/story-file-adapter.test.ts` (unit tests)
   - `packages/backend/orchestrator/src/adapters/utils/yaml-parser.ts` (parsing utilities)
   - `packages/backend/orchestrator/src/adapters/utils/file-utils.ts` (atomic write)

8. **Risk Mitigations:**
   - **Risk:** Existing YAML files don't match schema → Survey files first, handle migration
   - **Risk:** Partial writes corrupt files → Use atomic writes (temp + rename)
   - **Risk:** Performance bottleneck on large file sets → Implement parallel reads
   - **Risk:** Cross-platform path issues → Use `path.join()`, test on multiple OSes if possible
