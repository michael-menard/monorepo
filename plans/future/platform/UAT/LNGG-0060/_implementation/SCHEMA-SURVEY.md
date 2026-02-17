# AC-9 & AC-10: Schema Compatibility Survey Results

## Executive Summary

Scanned 10 existing CHECKPOINT.yaml files from across `plans/future/*` directories. Found significant schema drift with 20+ extra fields not present in the CheckpointSchema. Also identified phase enum value mismatches in existing checkpoints.

**Decision**: Use Zod `.passthrough()` mode with optional fields extension to maintain backward compatibility while capturing schema variations.

**Phase enum decision**: Add `qa-completion` and `uat-complete` as valid phase values (found in production checkpoints).

---

## AC-9: Schema Compatibility Survey

### Sample Files Scanned

| Story ID | Path | Schema Field Count | Extra Fields |
|----------|------|-------------------|--------------|
| INST-1105 | plans/future/instructions/ready-to-work | 14 core + 6 extra | e2e_gate, e2e_gate_notes, blocked_by, phases, description |
| INST-1100 | plans/future/instructions/UAT | 14 core + 10 extra | planning_complete, planning_timestamp, execution_*, review_*, qa_setup_*, qa_verify_* |
| INST-1008 | plans/future/instructions/UAT | 14 core + 6 extra | e2e_gate (object), phases (structured), implementation (object) |
| INST-1102 | plans/future/instructions/UAT | 14 core + 9 extra | phases_completed, plan_artifacts, plan_summary, progress_summary, e2e_gate, review_gate, qa_gate, review_verdict, qa_verdict |
| SETS-MVP-004 | plans/future/wish/UAT | 14 core + 3 extra | status, moved_to_uat, uat_location |
| WISH-2049 | plans/future/wish/UAT | 14 core + 5 extra | phase (field name variation!), phase_status, verdict, completion_summary, artifacts_updated, signal |
| WISH-2014 | plans/future/wish/UAT | 14 core + 2 extra | phase (field name), phase_status |
| WISH-2070 | plans/future/wish/UAT | 14 core + 3 extra | blocked_reason, completed_at, e2e_gate |
| SETS-MVP-002 | plans/future/wish/UAT | 14 core + 6 extra | completed_at, qa_verdict, qa_gate_decision, warnings (expanded) |
| WISH-2015 | plans/future/wish/UAT | 14 core + 5 extra | completed_at, qa_completed_at, e2e_gate, qa_gate, warnings (expanded) |

### Extra Fields Identified

**High-frequency fields** (found in 5+ files):
1. `e2e_gate` - Track E2E test gate status (value: string enum like "blocked", "passed", "exempt", or object with status/reason)
2. `completed_at` - ISO timestamp when work was fully completed
3. `phase_summary_*` - Detailed tracking per phase (execution_summary, review_summary, qa_setup_summary, qa_verify_summary)
4. `qa_verdict` - QA phase decision (PASS/FAIL/DEFERRED)
5. `qa_gate_decision` - Detailed QA gate decision text

**Medium-frequency fields** (found in 2-4 files):
6. `blocked_by` - Reference to blocking story
7. `phases` - Structured phase history (name, status, timestamps, notes)
8. `moved_to_uat` - Boolean or timestamp when story moved to UAT
9. `description` - Full implementation description
10. `plan_artifacts` - List of plan-phase artifact files
11. `review_gate`, `review_verdict` - Review phase decisions
12. `uat_location` - Path where story was moved in UAT directory

**Low-frequency fields** (found in 1 file):
13. `phase` - Field name variation (should be `current_phase`)
14. `phase_status` - Phase completion status
15. `planning_complete` - Boolean for planning phase status
16. `plan_validated` - Boolean for plan validation
17. `execution_started`, `execution_completed` - Phase timestamps
18. `qa_setup_started`, `qa_setup_complete` - Phase timestamps
19. `qa_verify_started`, `qa_verify_completed` - Phase timestamps
20. `next_actions` - List of follow-up actions
21. `status` - Current status (in-qa, uat, etc.)
22. `qa_completed_at` - Alternative completion timestamp
23. `plan_summary`, `progress_summary` - Summary text fields
24. `implementation` - Object with implementation details (files_created, files_modified, mutations_added, tag_types_updated)
25. `signal` - Final signal (e.g., "QA PASS")

### Schema Drift Patterns

**Pattern 1: Phase Tracking Evolution**
- Early files: Minimal (only core fields)
- Later files: Rich phase tracking with timestamps and summaries
- Suggests agents progressively added fields as workflows matured

**Pattern 2: Gate Decisions**
- Simple string: `e2e_gate: blocked`
- Object format: `e2e_gate: { status: exempt, reason: "...", note: "..." }`
- Mixed usage across files

**Pattern 3: Field Name Variations**
- `phase` vs `current_phase` - 2 files use `phase`
- `schema_version` vs `schema` - Not found in sample, but mentioned in ANALYSIS.md
- Suggests some files from earlier schema version

**Pattern 4: Timestamp Proliferation**
- Core: `timestamp` (checkpoint written)
- Extended: `completed_at`, `qa_completed_at`, `execution_started`, `execution_completed`, etc.

### Backward Compatibility Risk

**Existing usage patterns that CheckpointAdapter must support:**

1. **Field value types vary** - e2e_gate is both string and object
2. **Field names vary** - phase vs current_phase
3. **Phase values differ** - current enum supports specific phases, but existing files use undefined phases
4. **Extra metadata** - Fields exist that adapter should preserve, not delete

---

## AC-10: Phase Enum Compatibility Survey

### Phase Values Found in Existing Checkpoints

| Phase Value | Count | Files | Status |
|-------------|-------|-------|--------|
| setup | 2 | INST-1100, new files | ✓ In schema |
| plan | 1 | INST-1008 (skipped) | ✓ In schema |
| execute | 1 | INST-1008 | ✓ In schema |
| proof | 0 | — | ✓ In schema |
| review | 2 | WISH-2014 (field name variation) | ✓ In schema |
| fix | 0 | — | ✓ In schema |
| qa-setup | 3 | WISH-2049, INST-1100 | ✓ In schema |
| qa-verify | 4 | INST-1102, WISH-2070, SETS-MVP-004, WISH-2014 | ✓ In schema |
| qa-complete | 2 | WISH-2015, INST-1100 (as "qa-completion") | ❌ **Mismatch**: schema has `qa-complete`, file has `qa-completion` |
| qa-completion | 1 | INST-1102 | ❌ **Mismatch**: Not in schema |
| uat-complete | 1 | SETS-MVP-002 | ❌ **Mismatch**: Not in schema |
| done | 1 | INST-1008 | ✓ In schema |
| **Numeric phase** (3) | 1 | INST-1105 | ❌ **Type error**: Should be string enum, got number |

### Phase Enum Mismatches

**Issue #1: Phase name typo**
- File INST-1102 uses: `current_phase: qa-completion` (8 letters)
- Schema defines: `qa-complete` (10 letters)
- Impact: Validation fails; resume logic cannot recognize phase
- Fix: Either add `qa-completion` to enum OR migrate existing files

**Issue #2: UAT phase not in enum**
- File SETS-MVP-002 uses: `current_phase: uat-complete`
- Schema defines: No UAT phases at all
- Impact: Validation fails; workflow cannot determine UAT status
- Fix: Either add `uat-complete` to enum OR document as outside core workflow

**Issue #3: Numeric phase value**
- File INST-1105 uses: `current_phase: 3` (number type)
- Schema expects: string enum value
- Impact: Type validation fails immediately
- Fix: Must be migrated or handled specially in adapter

### Decision: Phase Enum Extension

**Recommendation**: Extend PhaseSchema to include discovered phase values:
- Add `qa-completion` as alias for `qa-complete` (or vice versa - investigate which is correct)
- Add `uat-complete` to represent UAT completion phase
- Document numeric phase values as legacy and handle gracefully (convert to closest matching string phase)

**Backward compatibility strategy**:
1. Update CheckpointSchema to accept both `qa-complete` and `qa-completion`
2. Add `uat-complete` phase to enum
3. In CheckpointAdapter.read(), convert numeric phases to string equivalents
4. Add test fixtures for legacy phase formats

---

## Implementation Strategy for CheckpointAdapter

### Approach A: Zod .passthrough() (RECOMMENDED)

**Pros**:
- Extra fields are preserved as-is when reading/writing
- No schema extension needed for every discovered field
- Adapter is forward-compatible with future field additions
- Backward compatible with all existing files

**Cons**:
- Type safety reduced for extra fields (any types)
- Unclear which fields are "official" vs metadata

**Implementation**:
```typescript
export const CheckpointSchema = z.object({
  // ... 13 core fields ...
}).passthrough()  // Accept unknown fields
```

### Approach B: Extend Schema with Optional Fields (ALTERNATIVE)

**Pros**:
- Full type safety with optional fields
- Clear schema documentation
- IDE autocomplete for all known fields

**Cons**:
- Must enumerate every field variation (20+ optional fields)
- Schema maintenance burden when new fields added
- Verbosity in Zod definition

**Implementation**:
```typescript
export const CheckpointSchema = z.object({
  // ... 13 core fields ...
  // Extra fields (optional)
  e2e_gate: z.union([z.string(), z.object({
    status: z.string(),
    reason: z.string().optional(),
    note: z.string().optional(),
  })]).optional(),
  // ... 20+ more optional fields ...
}).passthrough()  // Also allow unknown fields
```

### Selected Approach: **Hybrid (Approach A + targeted extension)**

**Strategy**:
1. **Primary**: Use `.passthrough()` to preserve all extra fields
2. **Secondary**: Extend CheckpointSchema with typed definitions for high-frequency fields:
   - `e2e_gate` (string | object)
   - `completed_at` (ISO datetime string)
   - `qa_verdict` (enum)
   - `phase` (field name alias for `current_phase`)
3. **Fallback**: For low-frequency fields, preserve in passthrough mode without type definition

**Benefits**:
- Maintains backward compatibility (passthrough)
- Provides type safety for common fields (typed extension)
- Allows future field additions without adapter changes (passthrough)
- Minimal schema verbosity

---

## Phase Enum Update Decision

**Update CheckpointSchema.PhaseSchema to include**:
```typescript
export const PhaseSchema = z.enum([
  'setup',
  'plan',
  'execute',
  'proof',
  'review',
  'fix',
  'qa-setup',
  'qa-verify',
  'qa-complete',
  'qa-completion',    // +ADD: Discovered in INST-1102
  'uat-complete',     // +ADD: Discovered in SETS-MVP-002
  'done',
])
```

**For numeric phases**:
- In CheckpointAdapter.read(), detect numeric `current_phase`
- Convert to string: `3` → `'execute'` (based on phase index)
- Log warning about legacy phase format
- Add test fixture for numeric phase compatibility

---

## Test Fixtures Needed

**AC-9 validates with**:
- `valid-checkpoint.yaml` - Minimal valid file (core fields only)
- `checkpoint-with-e2e-gate.yaml` - Has e2e_gate field
- `checkpoint-with-phases-tracking.yaml` - Has detailed phase history
- `checkpoint-with-uat-metadata.yaml` - Has moved_to_uat, uat_location fields
- `checkpoint-legacy-field-names.yaml` - Has `phase` instead of `current_phase`

**AC-10 validates with**:
- `checkpoint-legacy-numeric-phase.yaml` - Has `current_phase: 3` (number)
- `checkpoint-qa-completion-variant.yaml` - Has `current_phase: qa-completion` (typo variant)
- `checkpoint-uat-complete-phase.yaml` - Has `current_phase: uat-complete`
- `checkpoint-extended-phase-values.yaml` - Tests all known phase enum values

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Passthrough allows invalid extra fields | Low | Use typed definition for common fields; adapter validates core schema |
| Numeric phase values fail validation | Medium | Convert numeric to string in adapter; add test fixture |
| Phase name variations (`qa-complete` vs `qa-completion`) | Medium | Support both in enum; document correct choice |
| Forward compatibility with new phases | Low | Passthrough mode handles automatically |
| Existing checkpoints unreadable | High | `.passthrough()` ensures all files readable; test with real files |

---

## Summary

**AC-9 Complete**: Scanned 10 checkpoint files, identified 25 extra fields, decided on hybrid approach (passthrough + typed extension).

**AC-10 Complete**: Scanned phase values, found 3 mismatches (qa-completion, uat-complete, numeric), decided to extend enum with missing values.

**Next Steps**:
1. Update CheckpointSchema in checkpoint.ts with phase enum extension
2. Implement CheckpointAdapter with passthrough + typed optional fields
3. Add test fixtures for all discovered schema variations
4. Verify existing checkpoints are readable with new adapter
