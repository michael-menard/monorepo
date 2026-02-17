---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: LNGG-0060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found, no KB access for lessons learned

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Checkpoint Schema | `packages/backend/orchestrator/src/artifacts/checkpoint.ts` | Deployed | Zod schema with 13 fields, tracks phase progression |
| Story File Adapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | In-Progress (LNGG-0010) | Provides read/write/update for story YAML files |
| Orchestrator Adapters | `packages/backend/orchestrator/src/adapters/` | Partial | decision-callbacks, kb-writer exist; pattern established |
| Checkpoint CLI Skill | `.claude/commands/checkpoint.md` | Deployed | Documents expected checkpoint format and phase mappings |
| Idempotency Utils | `packages/backend/orchestrator/src/utils/idempotency.ts` | Deployed | Phase locking, resume logic, idempotency modes |
| Persistence Nodes | `packages/backend/orchestrator/src/nodes/persistence/` | Deployed | Load/save to PostgreSQL for checkpointing |

### Active In-Progress Work

| Story | Status | Area | Potential Overlap |
|-------|--------|------|-------------------|
| LNGG-0010 | in-progress (fix phase) | Story File Adapter - YAML Read/Write | **BLOCKING** - LNGG-0060 depends on this |
| WINT-7010 | in-progress | Audit Agent Directory References | Low - different area |

### Constraints to Respect

1. **Schema Alignment Issue (LNGG-0010)**: Story File Adapter has critical schema mismatch between existing story.yaml files and StoryArtifactSchema v1 (14+ field mismatches). This blocker affects LNGG-0060's ability to read/write checkpoint data if it needs story metadata.

2. **Checkpoint Schema v1**: Current checkpoint schema is schema version 1 with established fields. Any changes must be backward-compatible or require migration.

3. **Zod-First Types**: All schemas must use Zod with `z.infer<>` - no TypeScript interfaces (per CLAUDE.md).

4. **Adapter Pattern**: Must follow established pattern in `packages/backend/orchestrator/src/adapters/` - pure I/O, no business logic, transport-agnostic.

5. **Atomic Writes**: Must use atomic write pattern (temp file + rename) to prevent corruption, following StoryFileAdapter pattern.

---

## Retrieved Context

### Related Endpoints
- N/A - Backend-only file adapter, no HTTP endpoints

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| CheckpointSchema | `packages/backend/orchestrator/src/artifacts/checkpoint.ts` | Current Zod schema for checkpoint YAML |
| StoryFileAdapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | Reference pattern for file adapter implementation |
| file-utils | `packages/backend/orchestrator/src/adapters/utils/file-utils.ts` | Atomic write utilities |
| yaml-parser | `packages/backend/orchestrator/src/adapters/utils/yaml-parser.ts` | YAML parsing with frontmatter support |
| idempotency utils | `packages/backend/orchestrator/src/utils/idempotency.ts` | Resume logic and phase locking |

### Reuse Candidates

1. **File Utils** (`packages/backend/orchestrator/src/adapters/utils/file-utils.ts`)
   - `writeFileAtomic()` - temp file + rename pattern
   - `readFileSafe()` - error handling wrapper
   - `fileExists()` - existence check

2. **YAML Parser** (`packages/backend/orchestrator/src/adapters/utils/yaml-parser.ts`)
   - `parseFrontmatter()` - parse YAML with markdown content
   - `serializeStory()` - serialize to YAML format
   - `mergeFrontmatter()` - merge partial updates

3. **Error Types** (`packages/backend/orchestrator/src/adapters/__types__/index.ts`)
   - `StoryNotFoundError` - can be reused/adapted for CheckpointNotFoundError
   - `ValidationError` - Zod validation failure wrapper
   - `ReadError`, `WriteError` - file operation errors

4. **CheckpointSchema** (`packages/backend/orchestrator/src/artifacts/checkpoint.ts`)
   - `createCheckpoint()` - factory function
   - `advanceCheckpoint()` - phase progression logic

---

## Knowledge Context

### Lessons Learned

**No KB access available** - lessons loaded: false

Manual scan of LNGG-0010 elaboration revealed:
- **[LNGG-0010]** Schema mismatch between existing files and artifact schema caused critical blocker (category: blocker)
  - *Applies because*: LNGG-0060 must ensure CheckpointSchema matches what is actually written to CHECKPOINT.yaml files in the wild

### Blockers to Avoid (from past stories)
- Schema misalignment between code schema and actual file format (LNGG-0010)
- Missing validation before write operations
- No atomic write protection leading to corruption risk
- Hardcoding file paths instead of using dynamic discovery

### Architecture Decisions (ADRs)

**No ADR-LOG.md found** - adrs_loaded: false

From codebase analysis:
- **Adapter Pattern**: Pure file I/O adapters, no business logic, follows existing pattern in `src/adapters/`
- **Atomic Writes**: Use temp file + rename pattern to prevent corruption
- **Zod Validation**: All schemas must use Zod with runtime validation

### Patterns to Follow
- Atomic write pattern from StoryFileAdapter (temp file + rename)
- Zod schema validation on read and write operations
- Typed error handling with custom error classes
- Batch operations for performance (readBatch pattern)
- Factory functions for object creation (createCheckpoint pattern)

### Patterns to Avoid
- Direct file writes without atomic protection
- Schema definitions without Zod validation
- Barrel file exports (import directly from source)
- console.log (use @repo/logger)

---

## Conflict Analysis

### Conflict: Blocking Dependency
- **Severity**: blocking
- **Description**: LNGG-0010 (Story File Adapter) is the direct dependency for LNGG-0060 and is currently in "fix" phase with TypeScript compilation failures (logger API signature mismatch). LNGG-0010's checkpoint shows: `current_phase: fix`, `quality_gates.typescript_compilation: FAIL`, `qa_verification.verdict: FAIL`.
- **Resolution Hint**: LNGG-0060 cannot start implementation until LNGG-0010 completes successfully and is merged. The Story File Adapter provides the reference pattern and shared utilities (file-utils, yaml-parser) that the Checkpoint Adapter will reuse. Recommendation: Generate story seed and PM artifacts for LNGG-0060 now, but mark as `ready-to-work` only after LNGG-0010 reaches `completed` status.

---

## Story Seed

### Title
Checkpoint Adapter - Type-safe read/write for CHECKPOINT.yaml workflow state

### Description

**Context**: The orchestrator workflow system uses CHECKPOINT.yaml files to track phase progression and enable deterministic resume after interruption. These files are currently managed manually by agents, leading to schema drift and inconsistent format across 100+ existing checkpoint files.

**Current State**:
- Checkpoint schema defined in `packages/backend/orchestrator/src/artifacts/checkpoint.ts` with 13 fields
- 100+ CHECKPOINT.yaml files exist across `plans/future/*/` directories
- Manual YAML writes by agents lack validation and atomic write protection
- No type-safe read/update operations available
- Resume logic in `idempotency.ts` expects consistent checkpoint format

**Problem**: Without a type-safe adapter, agents can write invalid checkpoint data, leading to:
- Resume failures (workflow cannot determine where to continue)
- Schema drift (different agents write different field structures)
- Corruption risk (non-atomic writes during interruption)
- No validation feedback (malformed checkpoints discovered at resume time, not write time)

**Proposed Solution**: Create a CheckpointAdapter class following the established StoryFileAdapter pattern that provides:
- Type-safe read/write/update operations with Zod validation
- Atomic writes using temp file + rename pattern to prevent corruption
- Phase advancement helpers (updatePhase, advanceToNextPhase)
- Batch read operations for workflow dashboard/metrics
- Backward-compatible with existing CHECKPOINT.yaml files

**LangGraph Integration**: This adapter will be consumed by LangGraph nodes in the persistence layer, enabling workflow state to be checkpointed to both filesystem (CHECKPOINT.yaml) and PostgreSQL database (via persistence nodes) for redundancy and querying.

### Initial Acceptance Criteria

- [ ] AC-1: CheckpointAdapter class implements read(filePath) that returns validated Checkpoint object
- [ ] AC-2: CheckpointAdapter.write(filePath, checkpoint) uses atomic write pattern (temp file + rename)
- [ ] AC-3: CheckpointAdapter.update(filePath, updates) merges partial updates while preserving other fields
- [ ] AC-4: CheckpointAdapter.advancePhase(filePath, completedPhase, nextPhase) updates checkpoint after phase completion
- [ ] AC-5: CheckpointAdapter.readBatch(filePaths[]) returns BatchReadResult with successes and errors
- [ ] AC-6: All operations validate against CheckpointSchema and throw ValidationError on mismatch
- [ ] AC-7: Unit tests achieve 85%+ coverage with fixtures for valid/invalid/legacy checkpoint formats
- [ ] AC-8: Integration tests verify read/write operations with real filesystem operations

### Non-Goals

- Migrating existing checkpoint files to a new format (out of scope - future story if needed)
- Adding new fields to CheckpointSchema (use existing schema as-is)
- Database persistence (handled by separate persistence nodes in `src/nodes/persistence/`)
- Checkpoint rotation/cleanup logic (future enhancement)
- Concurrent access locking (phase locking already handled by idempotency.ts)
- GraphQL/REST API endpoints (adapter is internal utility only)

### Reuse Plan

**Components**:
- File utils: `writeFileAtomic()`, `readFileSafe()`, `fileExists()` from `utils/file-utils.ts`
- YAML parser: `parseFrontmatter()`, `serializeStory()` (adapt for checkpoint format) from `utils/yaml-parser.ts`
- Error types: Extend `StoryNotFoundError` → `CheckpointNotFoundError`, reuse `ValidationError`, `ReadError`, `WriteError`

**Patterns**:
- Follow StoryFileAdapter structure: class with read/write/update/exists/readBatch methods
- Use CheckpointSchema from `artifacts/checkpoint.ts` for validation
- Apply atomic write pattern consistently
- Export via `adapters/index.ts` (not a barrel file - direct exports)

**Packages**:
- `@repo/logger` for logging (not console.log)
- `zod` for schema validation
- `yaml` for YAML parsing (already in orchestrator dependencies)
- `fs/promises` for file operations

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context**:
- 100+ existing CHECKPOINT.yaml files in the wild with varying formats
- Critical dependency on LNGG-0010's file utils and patterns

**Recommendations**:
1. Scan 5-10 existing CHECKPOINT.yaml files to identify format variations (legacy vs current schema)
2. Create test fixtures for:
   - Minimal valid checkpoint (just required fields)
   - Full checkpoint (all optional fields populated)
   - Legacy checkpoint (if different from current schema)
   - Malformed checkpoint (missing required fields)
   - Invalid YAML syntax
3. Test atomic write behavior: simulate interruption during write to verify temp file cleanup
4. Test batch operations with mix of valid/invalid/missing files
5. Integration test: verify read → update → write roundtrip preserves all fields

### For UI/UX Advisor

**Context**: Backend-only adapter, no UI surface

**Recommendations**:
- Not applicable - this is an internal utility adapter with no user-facing components
- Developer experience consideration: Error messages should be clear and actionable (e.g., "Checkpoint at {path} missing required field 'story_id'")

### For Dev Feasibility

**Context**:
- LNGG-0010 (dependency) currently in fix phase with TypeScript compilation errors
- Checkpoint adapter will follow identical pattern to Story File Adapter

**Recommendations**:
1. **Blocking Dependency**: Mark as ready-to-work ONLY after LNGG-0010 reaches completed status
2. **Schema Survey**: Before implementation, scan 10+ existing CHECKPOINT.yaml files to verify CheckpointSchema matches reality (avoid LNGG-0010's schema mismatch blocker)
3. **Reuse Aggressively**: Copy StoryFileAdapter structure and adapt for checkpoint format to minimize reimplementation
4. **Phase Helpers**: Consider adding convenience methods like `markPhaseComplete()`, `markPhaseBlocked()` that wrap common update patterns
5. **Error Handling**: Ensure CheckpointNotFoundError vs ValidationError vs ReadError are distinct for clear debugging

**Risk Flags**:
- Medium Risk: If CheckpointSchema doesn't match existing files, same blocker as LNGG-0010 will occur
- Low Risk: File system race conditions (mitigated by atomic writes)
- Low Risk: YAML parsing edge cases (mitigated by reusing yaml-parser utils)
