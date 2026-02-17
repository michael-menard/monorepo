# Dev Feasibility Review: LNGG-0060 - Checkpoint Adapter

## Feasibility Summary

**Feasible for MVP**: Yes, with dependency blocker

**Confidence**: High

**Why**: This story follows an established, proven pattern (StoryFileAdapter from LNGG-0010) and can directly reuse battle-tested file utilities. The CheckpointSchema already exists and matches real-world files. Primary risk is the blocking dependency on LNGG-0010, which is currently in fix phase with TypeScript compilation failures.

**Recommendation**: Generate PM artifacts now, but mark story as `ready-to-work` (not `backlog`) until LNGG-0010 completes successfully. Implementation should take 1-2 days once unblocked.

---

## Likely Change Surface (Core Only)

### Packages/Areas for Core Journey

| Package/Area | Change Type | Files Affected |
|--------------|-------------|----------------|
| `packages/backend/orchestrator/src/adapters/` | New adapter class | `checkpoint-adapter.ts` (new) |
| `packages/backend/orchestrator/src/adapters/__types__/` | Error types | `index.ts` (extend with CheckpointNotFoundError) |
| `packages/backend/orchestrator/src/adapters/__tests__/` | Unit tests | `checkpoint-adapter.test.ts` (new) |
| `packages/backend/orchestrator/src/adapters/__tests__/` | Integration tests | `checkpoint-adapter.integration.test.ts` (new) |
| `packages/backend/orchestrator/src/adapters/__tests__/__fixtures__/` | Test fixtures | `valid-checkpoint.yaml`, `invalid-checkpoint.yaml`, etc. (new) |
| `packages/backend/orchestrator/src/adapters/index.ts` | Exports | Add CheckpointAdapter export |
| `packages/backend/orchestrator/src/artifacts/checkpoint.ts` | Schema (review only) | Verify schema matches reality, no changes expected |

**Total Estimated Files**: 6-8 files (1 adapter, 1 type extension, 2 test files, 3-5 fixtures, 1 export update)

---

### Endpoints for Core Journey

**None** - This is a backend-only file adapter with no HTTP endpoints.

---

### Critical Deploy Touchpoints

| Touchpoint | Impact | Notes |
|------------|--------|-------|
| TypeScript compilation | Must pass | Adapter must compile with strict types |
| Unit test gate | Must pass | 85%+ coverage required (AC-7) |
| Integration test gate | Must pass | Real filesystem operations |
| Package exports | Low risk | Add to adapters/index.ts barrel export |

**No runtime deployment changes** - This is a library addition only, consumed by LangGraph nodes.

---

## MVP-Critical Risks (Max 5)

### Risk 1: LNGG-0010 Dependency Blocked

**Why it blocks MVP**: LNGG-0060 depends on shared utilities (file-utils, yaml-parser) and pattern reference from LNGG-0010. Cannot implement until LNGG-0010 completes.

**Current Status**: LNGG-0010 in "fix" phase with TypeScript compilation failures (logger API signature mismatch).

**Required Mitigation**:
- **Do not start LNGG-0060 implementation until LNGG-0010 reaches `completed` status**
- Mark LNGG-0060 as `ready-to-work` (not `backlog`) to indicate dependency blocker
- Once LNGG-0010 completes, LNGG-0060 can start immediately

---

### Risk 2: CheckpointSchema Mismatch with Reality

**Why it blocks MVP**: If existing CHECKPOINT.yaml files in production have fields not in CheckpointSchema (or vice versa), same blocker as LNGG-0010 will occur.

**Evidence**:
- Seed analysis found `e2e_gate` and `moved_to_uat` fields in existing checkpoints (BUGF-010, WISH-2000)
- Current CheckpointSchema v1 does NOT include these fields
- Schema has optional `gate` object, but `e2e_gate` is top-level string

**Required Mitigation**:
1. **Pre-implementation survey**: Scan 10+ existing CHECKPOINT.yaml files across plans/future/* to identify all fields in use
2. **Schema alignment decision**: Either:
   - Add missing fields to CheckpointSchema as optional (backward-compatible)
   - OR document that extra fields are ignored on read (Zod `.passthrough()` mode)
3. **Test coverage**: Add test fixtures for legacy formats with extra fields (Test Plan Edge 2)
4. **Update checkpoint.ts**: If schema changes needed, update CheckpointSchema before adapter implementation

**Blocker Threshold**: If >20% of existing checkpoints have schema mismatches, this becomes a migration project (out of scope for LNGG-0060).

---

### Risk 3: Atomic Write Pattern Not Tested Under Interruption

**Why it blocks MVP**: If atomic write pattern fails to clean up temp files on interruption, filesystem pollution will accumulate.

**Required Mitigation**:
- Verify file-utils.ts `writeFileAtomic()` implementation includes cleanup on error
- Add test case simulating write interruption (Test Plan Error 5)
- Document temp file naming convention for manual cleanup if needed
- Review StoryFileAdapter test suite for atomic write tests to copy

---

## Missing Requirements for MVP

### Requirement 1: Schema Survey Results

**Concrete Decision Text**:

```markdown
## Schema Compatibility Decision

Based on survey of 10+ existing CHECKPOINT.yaml files:

- **Fields in use but not in schema**: [list fields, e.g., e2e_gate, moved_to_uat]
- **Schema extension decision**: [Add as optional | Ignore via passthrough | Migration required]
- **Backward compatibility**: [Yes - all existing files read successfully | No - migration needed]

If migration required, LNGG-0060 is blocked until migration story completed.
```

**PM must include**: Results of schema survey in elaboration phase, with clear decision on how to handle extra fields.

---

### Requirement 2: Error Handling Specification

**Concrete Decision Text**:

```markdown
## Error Type Mapping

| Scenario | Error Class | Example Message |
|----------|-------------|-----------------|
| File not found | CheckpointNotFoundError | "Checkpoint not found at {path}" |
| Missing required field | ValidationError | "Validation failed: story_id is required" |
| Invalid YAML syntax | InvalidYAMLError | "Failed to parse YAML at {path}: {reason}" |
| Invalid phase value | ValidationError | "Invalid phase 'bad-phase', expected one of: setup, plan, ..." |
| Write permission denied | WriteError | "Failed to write checkpoint at {path}: {reason}" |
```

**PM must include**: Error handling contract in story file under "Error Handling" section.

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

| AC | Evidence Type | What to Capture |
|----|---------------|-----------------|
| AC-1 | Unit test | Read operation returns validated Checkpoint object |
| AC-2 | Integration test | Write operation creates file atomically (no .tmp files) |
| AC-3 | Unit test | Update merges partial data while preserving other fields |
| AC-4 | Unit test | advancePhase helper updates current_phase and last_successful_phase |
| AC-5 | Unit test | readBatch returns BatchReadResult with results and errors arrays |
| AC-6 | Unit test | Validation errors thrown for invalid data |
| AC-7 | Coverage report | 85%+ coverage for checkpoint-adapter.ts |
| AC-8 | Integration test | Read/write/update roundtrip with real filesystem |

**Critical Checkpoints**:
1. **Schema survey complete**: PM includes survey results in elaboration
2. **TypeScript compilation**: `pnpm check-types` passes
3. **Unit tests pass**: `pnpm test checkpoint-adapter` passes
4. **Coverage gate**: 85%+ coverage verified
5. **Integration tests pass**: Real file operations tested

---

## Implementation Notes

### Reuse Aggressively

**Copy-paste from StoryFileAdapter**:
- Class structure (read/write/update/exists/readBatch methods)
- Error handling patterns
- Test file structure
- Fixture organization

**Changes needed**:
- Replace `StoryArtifact` with `Checkpoint` type
- Replace `StoryArtifactSchema` with `CheckpointSchema`
- Adapt `serializeStory()` for checkpoint YAML format (no frontmatter/markdown, pure YAML)
- Create `CheckpointNotFoundError` extending base error class

**Estimated implementation time**: 4-6 hours for adapter + 4-6 hours for tests = 1-2 days total.

---

### Convenience Methods to Add

Per seed recommendations, consider these phase helper methods:

```typescript
class CheckpointAdapter {
  // Standard CRUD
  async read(filePath: string): Promise<Checkpoint>
  async write(filePath: string, checkpoint: Checkpoint): Promise<void>
  async update(filePath: string, updates: Partial<Checkpoint>): Promise<void>
  async exists(filePath: string): Promise<boolean>
  async readBatch(filePaths: string[]): Promise<BatchReadResult>

  // Convenience helpers (wrap update)
  async advancePhase(filePath: string, completedPhase: Phase, nextPhase: Phase): Promise<void>
  async markPhaseComplete(filePath: string, phase: Phase): Promise<void>
  async markPhaseBlocked(filePath: string, reason: string): Promise<void>
  async clearBlocked(filePath: string): Promise<void>
}
```

**Justification**: These helpers reduce boilerplate in workflow nodes and enforce consistent phase state transitions.

---

### LangGraph Integration Points

**Consumers**:
- Persistence nodes in `packages/backend/orchestrator/src/nodes/persistence/`
- Orchestrator resume logic in `packages/backend/orchestrator/src/utils/idempotency.ts`
- Phase leader agents (setup, plan, execute, etc.) for checkpointing

**Usage pattern**:
```typescript
// In LangGraph node
import { CheckpointAdapter } from '@repo/orchestrator/adapters'

const adapter = new CheckpointAdapter()
const checkpoint = await adapter.read(`${storyDir}/_implementation/CHECKPOINT.yaml`)

// Advance phase on success
await adapter.advancePhase(`${storyDir}/_implementation/CHECKPOINT.yaml`, 'plan', 'execute')

// Mark blocked on failure
await adapter.markPhaseBlocked(`${storyDir}/_implementation/CHECKPOINT.yaml`, 'Missing API key')
```

---

## Future Risks (See FUTURE-RISKS.md)

Non-MVP concerns tracked separately:
- Checkpoint rotation/cleanup logic
- Checkpoint history/audit trail
- Concurrent access locking at file level
- Checkpoint migration tooling for schema v2
