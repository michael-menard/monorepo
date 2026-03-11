# Test Plan: LNGG-0060 - Checkpoint Adapter

## Scope Summary

**Endpoints touched**: None (backend-only file adapter)

**UI touched**: No

**Data/storage touched**: Yes - filesystem CHECKPOINT.yaml files across `plans/future/*/` directories

**Surfaces**:
- Backend: `packages/backend/orchestrator/src/adapters/checkpoint-adapter.ts`
- Utilities: Reuses `file-utils.ts` and `yaml-parser.ts`
- Schema: `packages/backend/orchestrator/src/artifacts/checkpoint.ts`

---

## Happy Path Tests

### Test 1: Read Valid Checkpoint File

**Setup**:
- Create test fixture: `test/fixtures/valid-checkpoint.yaml` with complete Checkpoint schema fields
- Use CheckpointSchema v1 with all required and optional fields populated

**Action**:
```typescript
const adapter = new CheckpointAdapter()
const checkpoint = await adapter.read('/path/to/valid-checkpoint.yaml')
```

**Expected**:
- Returns Checkpoint object matching CheckpointSchema type
- All fields parsed correctly (schema: 1, story_id, feature_dir, current_phase, etc.)
- `gate` and `resume_hints` optional fields parsed when present

**Evidence**:
- Vitest assertion: `expect(checkpoint.story_id).toBe('TEST-001')`
- Zod validation passed: `CheckpointSchema.safeParse(checkpoint).success === true`

---

### Test 2: Write New Checkpoint File (Atomic Write)

**Setup**:
- Create temporary test directory
- Generate Checkpoint object via `createCheckpoint('TEST-002', 'plans/test', 'setup')`

**Action**:
```typescript
const checkpoint = createCheckpoint('TEST-002', 'plans/test', 'setup')
await adapter.write('/tmp/test-checkpoint.yaml', checkpoint)
```

**Expected**:
- CHECKPOINT.yaml created with correct YAML structure
- File contains all required fields (schema, story_id, feature_dir, etc.)
- Atomic write pattern used (temp file + rename)

**Evidence**:
- File exists: `fs.existsSync('/tmp/test-checkpoint.yaml') === true`
- YAML parseable: `yaml.parse(fs.readFileSync(...))` succeeds
- Matches schema: `CheckpointSchema.safeParse(parsed).success === true`
- No temp files remaining: `fs.readdirSync('/tmp').filter(f => f.includes('.tmp')).length === 0`

---

### Test 3: Update Existing Checkpoint (Partial Merge)

**Setup**:
- Write initial checkpoint with `current_phase: 'setup'`
- Prepare partial update: `{ current_phase: 'execute', last_successful_phase: 'plan' }`

**Action**:
```typescript
await adapter.update('/tmp/checkpoint.yaml', {
  current_phase: 'execute',
  last_successful_phase: 'plan',
  timestamp: new Date().toISOString()
})
```

**Expected**:
- Only specified fields updated
- Other fields preserved (story_id, feature_dir, blocked, etc.)
- Timestamp updated to reflect change

**Evidence**:
- Re-read checkpoint: `const updated = await adapter.read('/tmp/checkpoint.yaml')`
- Phase updated: `expect(updated.current_phase).toBe('execute')`
- Other fields unchanged: `expect(updated.story_id).toBe('TEST-002')`

---

### Test 4: Advance Phase Helper

**Setup**:
- Create checkpoint in 'plan' phase
- Call advancePhase with completion data

**Action**:
```typescript
await adapter.advancePhase('/tmp/checkpoint.yaml', 'plan', 'execute')
```

**Expected**:
- `current_phase` set to 'execute'
- `last_successful_phase` set to 'plan'
- Timestamp updated

**Evidence**:
- Read checkpoint: `const checkpoint = await adapter.read('/tmp/checkpoint.yaml')`
- Assert phases: `expect(checkpoint.current_phase).toBe('execute')`
- Assert success tracking: `expect(checkpoint.last_successful_phase).toBe('plan')`

---

### Test 5: Batch Read Operation

**Setup**:
- Create 5 valid checkpoint files in test directory
- Collect file paths in array

**Action**:
```typescript
const result = await adapter.readBatch([
  '/tmp/checkpoint-1.yaml',
  '/tmp/checkpoint-2.yaml',
  '/tmp/checkpoint-3.yaml',
  '/tmp/checkpoint-4.yaml',
  '/tmp/checkpoint-5.yaml'
])
```

**Expected**:
- Returns BatchReadResult with `results` and `errors` arrays
- All 5 checkpoints in `results` array
- Empty `errors` array

**Evidence**:
- Assert count: `expect(result.results.length).toBe(5)`
- Assert no errors: `expect(result.errors.length).toBe(0)`
- Each result valid: `result.results.forEach(c => expect(c.story_id).toBeDefined())`

---

## Error Cases

### Error 1: File Not Found

**Setup**:
- Ensure `/tmp/nonexistent.yaml` does not exist

**Action**:
```typescript
await adapter.read('/tmp/nonexistent.yaml')
```

**Expected**:
- Throws `CheckpointNotFoundError` (custom error class)
- Error message includes file path

**Evidence**:
- `expect(() => adapter.read('/tmp/nonexistent.yaml')).rejects.toThrow(CheckpointNotFoundError)`
- Error message: `error.message.includes('/tmp/nonexistent.yaml')`

---

### Error 2: Validation Error (Missing Required Field)

**Setup**:
- Create malformed YAML file missing `story_id` field
```yaml
schema: 1
feature_dir: "plans/test"
current_phase: setup
```

**Action**:
```typescript
await adapter.read('/tmp/invalid-checkpoint.yaml')
```

**Expected**:
- Throws `ValidationError`
- Error message specifies missing field: "story_id"

**Evidence**:
- `expect(() => adapter.read('/tmp/invalid-checkpoint.yaml')).rejects.toThrow(ValidationError)`
- Error details: `error.errors.some(e => e.path.includes('story_id'))`

---

### Error 3: Invalid YAML Syntax

**Setup**:
- Create file with malformed YAML syntax
```yaml
schema: 1
story_id: "TEST-001
feature_dir: unclosed quote
```

**Action**:
```typescript
await adapter.read('/tmp/malformed.yaml')
```

**Expected**:
- Throws `InvalidYAMLError`
- Error indicates parse failure

**Evidence**:
- `expect(() => adapter.read('/tmp/malformed.yaml')).rejects.toThrow(InvalidYAMLError)`

---

### Error 4: Invalid Phase Value

**Setup**:
- Create checkpoint with invalid phase name
```yaml
schema: 1
story_id: "TEST-001"
feature_dir: "plans/test"
current_phase: "invalid-phase"
```

**Action**:
```typescript
await adapter.read('/tmp/bad-phase.yaml')
```

**Expected**:
- Throws `ValidationError` due to Zod enum validation
- Error message lists valid phase values

**Evidence**:
- `expect(() => adapter.read('/tmp/bad-phase.yaml')).rejects.toThrow(ValidationError)`
- Error includes valid phases: `error.message.includes('setup')`

---

### Error 5: Write Permission Denied

**Setup**:
- Create read-only directory: `chmod 444 /tmp/readonly`

**Action**:
```typescript
await adapter.write('/tmp/readonly/checkpoint.yaml', checkpoint)
```

**Expected**:
- Throws `WriteError`
- Error message indicates permission issue

**Evidence**:
- `expect(() => adapter.write('/tmp/readonly/checkpoint.yaml', checkpoint)).rejects.toThrow(WriteError)`

---

## Edge Cases (Reasonable)

### Edge 1: Empty Optional Fields

**Setup**:
- Create checkpoint with minimal required fields only (no `gate`, `resume_hints`, `completed_at`)

**Action**:
```typescript
const minimal = {
  schema: 1,
  story_id: 'TEST-003',
  feature_dir: 'plans/test',
  timestamp: new Date().toISOString(),
  current_phase: 'setup',
  last_successful_phase: null,
  iteration: 0,
  max_iterations: 3,
  blocked: false,
  forced: false,
  warnings: []
}
await adapter.write('/tmp/minimal.yaml', minimal)
const read = await adapter.read('/tmp/minimal.yaml')
```

**Expected**:
- Write succeeds
- Read succeeds
- Optional fields are `undefined` or default values

**Evidence**:
- No errors thrown
- `expect(read.gate).toBeUndefined()`
- `expect(read.completed_at).toBeUndefined()`

---

### Edge 2: Legacy Checkpoint Format (Schema Drift)

**Setup**:
- Create checkpoint file from older format (e.g., missing `e2e_gate` field seen in BUGF-010)
```yaml
schema: 1
story_id: "LEGACY-001"
feature_dir: "plans/test"
current_phase: done
last_successful_phase: review
iteration: 1
max_iterations: 3
blocked: false
forced: false
warnings: []
e2e_gate: exempt
```

**Action**:
```typescript
await adapter.read('/tmp/legacy.yaml')
```

**Expected**:
- Read succeeds if field is not in schema (ignored)
- OR throws ValidationError if field conflicts with schema

**Evidence**:
- Document behavior in test: either graceful ignore or explicit error
- If ignored: `expect(read.story_id).toBe('LEGACY-001')`
- If error: `expect(() => adapter.read('/tmp/legacy.yaml')).rejects.toThrow(ValidationError)`

**Note**: This test depends on CheckpointSchema backward-compatibility decisions. Check if `e2e_gate` should be added to schema.

---

### Edge 3: Concurrent Write Attempts (Race Condition)

**Setup**:
- Same checkpoint file
- Two parallel write operations with different data

**Action**:
```typescript
await Promise.all([
  adapter.update('/tmp/checkpoint.yaml', { current_phase: 'execute' }),
  adapter.update('/tmp/checkpoint.yaml', { current_phase: 'fix' })
])
const final = await adapter.read('/tmp/checkpoint.yaml')
```

**Expected**:
- One write wins (last-write-wins semantics)
- No file corruption
- Final state is either 'execute' or 'fix' (deterministic result)

**Evidence**:
- File is valid: `expect(() => adapter.read('/tmp/checkpoint.yaml')).resolves.toBeDefined()`
- Phase is one of the two: `expect(['execute', 'fix']).toContain(final.current_phase)`
- No temp files: `fs.readdirSync('/tmp').filter(f => f.includes('.tmp')).length === 0`

**Risk**: Document that concurrent writes are not locked - caller must coordinate (idempotency.ts handles locking at workflow level).

---

### Edge 4: Large Warnings Array

**Setup**:
- Create checkpoint with 100+ warning strings

**Action**:
```typescript
const checkpoint = createCheckpoint('TEST-004', 'plans/test', 'setup')
checkpoint.warnings = Array(150).fill('Warning message')
await adapter.write('/tmp/large-warnings.yaml', checkpoint)
const read = await adapter.read('/tmp/large-warnings.yaml')
```

**Expected**:
- Write and read succeed
- All 150 warnings preserved

**Evidence**:
- `expect(read.warnings.length).toBe(150)`

---

### Edge 5: Batch Read with Mixed Results

**Setup**:
- Create 3 valid checkpoint files
- Create 1 invalid checkpoint (missing required field)
- Reference 1 nonexistent file

**Action**:
```typescript
const result = await adapter.readBatch([
  '/tmp/valid-1.yaml',
  '/tmp/valid-2.yaml',
  '/tmp/invalid.yaml',
  '/tmp/nonexistent.yaml',
  '/tmp/valid-3.yaml'
])
```

**Expected**:
- Returns 3 checkpoints in `results` array
- Returns 2 errors in `errors` array
- Errors include file path and error type

**Evidence**:
- `expect(result.results.length).toBe(3)`
- `expect(result.errors.length).toBe(2)`
- `expect(result.errors[0].filePath).toBe('/tmp/invalid.yaml')`
- `expect(result.errors[1].filePath).toBe('/tmp/nonexistent.yaml')`

---

## Required Tooling Evidence

### Backend Testing

**Unit Tests** (Vitest):
- Test file: `packages/backend/orchestrator/src/adapters/__tests__/checkpoint-adapter.test.ts`
- Coverage target: **85%+** (per AC-7)
- Run command: `pnpm test checkpoint-adapter`

**Fixtures Required**:
- `__fixtures__/valid-checkpoint.yaml` - Complete valid checkpoint
- `__fixtures__/minimal-checkpoint.yaml` - Required fields only
- `__fixtures__/invalid-missing-field.yaml` - Missing story_id
- `__fixtures__/invalid-yaml-syntax.yaml` - Malformed YAML
- `__fixtures__/legacy-checkpoint.yaml` - Legacy format with extra fields

**Integration Tests** (Vitest):
- Test file: `packages/backend/orchestrator/src/adapters/__tests__/checkpoint-adapter.integration.test.ts`
- Real filesystem operations in `/tmp` test directory
- Run command: `pnpm test checkpoint-adapter.integration`

**Assertions to verify**:
- Schema validation: `CheckpointSchema.safeParse(result).success === true`
- File existence: `fs.existsSync(filePath)`
- Atomic writes: No `.tmp` files after write
- Error types: `error instanceof CheckpointNotFoundError`
- Batch results: `result.results.length + result.errors.length === input.length`

**Required CI Gates**:
- TypeScript compilation: `pnpm check-types`
- Unit tests pass: `pnpm test checkpoint-adapter`
- Integration tests pass: `pnpm test checkpoint-adapter.integration`
- Coverage: 85%+ for checkpoint-adapter.ts

---

## Risks to Call Out

### Risk 1: Schema Drift Between Code and Files

**Description**: 100+ existing CHECKPOINT.yaml files may not match CheckpointSchema exactly (same blocker as LNGG-0010).

**Mitigation**:
- Scan 10+ existing checkpoint files before implementation
- Add test for legacy format compatibility (Edge 2)
- Document any schema extensions needed (e.g., `e2e_gate`, `moved_to_uat`)

---

### Risk 2: Atomic Write Cleanup on Failure

**Description**: If write operation interrupted, temp files may remain.

**Mitigation**:
- Test atomic write failure scenarios
- Add cleanup logic in file-utils.ts if not already present
- Document temp file naming convention for manual cleanup

---

### Risk 3: Concurrent Access Without Locking

**Description**: Multiple processes writing same checkpoint file simultaneously may cause corruption.

**Mitigation**:
- Document that locking is handled by idempotency.ts at workflow level
- Atomic writes mitigate corruption risk (last-write-wins)
- Add integration test for concurrent writes (Edge 3)

---

### Risk 4: YAML Parser Edge Cases

**Description**: Complex nested objects (gate, resume_hints) may have parsing edge cases.

**Mitigation**:
- Reuse yaml-parser.ts which is battle-tested from StoryFileAdapter
- Add test fixtures for fully-populated checkpoints with all optional fields
- Validate against real checkpoint files from production

---

### Risk 5: Missing Coverage for `advancePhase` Helper

**Description**: Convenience method may not be tested thoroughly.

**Mitigation**:
- Dedicated test for advancePhase (Test 4)
- Verify it wraps update() correctly
- Test phase progression sequence: setup → plan → execute → proof → review → fix → qa-verify → done
