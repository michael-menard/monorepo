# Dev Feasibility Review: LNGG-0010 — Story File Adapter

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This is a straightforward file I/O adapter with well-defined requirements. The `StoryArtifactSchema` already exists, YAML libraries are mature, and the atomic write pattern is well-established. No external service dependencies, no complex business logic, no security/auth concerns for file I/O.

## Likely Change Surface (Core Only)

### Packages Affected
- `packages/backend/orchestrator/` — new adapter code
  - `src/adapters/story-file-adapter.ts` — main adapter class (NEW)
  - `src/adapters/__types__/index.ts` — type re-exports (NEW)
  - `src/adapters/__tests__/story-file-adapter.test.ts` — unit tests (NEW)
  - `src/adapters/__tests__/story-file-adapter.integration.test.ts` — integration tests (NEW)
  - `src/adapters/utils/yaml-parser.ts` — YAML parsing utilities (NEW)
  - `src/adapters/utils/file-utils.ts` — atomic write utilities (NEW)
  - `src/adapters/utils/__tests__/yaml-parser.test.ts` — utility tests (NEW)
  - `src/adapters/utils/__tests__/file-utils.test.ts` — utility tests (NEW)

### Dependencies Added
- `gray-matter@^4.0.3` — YAML frontmatter parsing (to `packages/backend/orchestrator/package.json`)
- `js-yaml@^4.1.0` — YAML serialization (to `packages/backend/orchestrator/package.json`)
- `@types/js-yaml` — TypeScript types for js-yaml (devDependency)

### Existing Code Reused
- `packages/backend/orchestrator/src/artifacts/story.ts` — `StoryArtifactSchema` (no changes needed)
- `packages/backend/orchestrator/src/state/enums/story-state.ts` — `StoryStateSchema` (no changes needed)

### Critical Deploy Touchpoints
- None — this is a library package, not a deployed service
- CI pipeline must run new tests (already configured for orchestrator package)

## MVP-Critical Risks

### Risk 1: Schema Mismatch with Existing Files
- **Why it blocks MVP:** If existing story YAML files (50+ files in `plans/future/*/`) don't match `StoryArtifactSchema` v1, the adapter will fail to parse them, breaking all downstream adapters (LNGG-0020, LNGG-0040, LNGG-0060, LNGG-0070).
- **Required mitigation:**
  1. Survey 10-20 existing story files BEFORE implementation
  2. Document any field mismatches (extra fields, missing fields, type differences)
  3. If mismatches found, decide:
     - Option A: Update schema to accept existing format (backward compatibility)
     - Option B: Migrate existing files to new format (one-time script)
     - Option C: Add schema version detection and support multiple versions
  4. Include compatibility validation in integration tests

### Risk 2: Atomic Write Failure Leaves Corrupted Files
- **Why it blocks MVP:** If atomic write pattern fails (e.g., `fs.rename()` throws after temp file created), it could leave partial `.tmp` files or corrupt the target file, breaking the story workflow.
- **Required mitigation:**
  1. Implement try-catch-finally block in write method
  2. Always clean up `.tmp` file in finally block
  3. Verify target file unchanged on error
  4. Add explicit error test: mock `fs.rename()` failure, verify no corruption
  5. Document behavior in error scenarios

### Risk 3: YAML Library Round-Trip Fidelity
- **Why it blocks MVP:** If `gray-matter` + `js-yaml` don't round-trip perfectly (e.g., lose array order, change formatting, corrupt special characters), it will break the update flow (AC-3).
- **Required mitigation:**
  1. Create round-trip test with all field types (strings, numbers, booleans, arrays, objects, nulls)
  2. Test special characters: quotes, newlines, Unicode, emojis
  3. Test edge cases: empty arrays, null vs undefined, large values
  4. If round-trip fails, switch libraries or add normalization layer
  5. Document any known limitations

### Risk 4: Performance Bottleneck on Large File Sets
- **Why it blocks MVP:** If reading 50+ story files takes >5 seconds (AC-5 requirement), it will make LangGraph workflows unacceptably slow for batch operations.
- **Required mitigation:**
  1. Implement parallel reads using `Promise.all()`
  2. Add performance test: read 50 files, assert <5s total
  3. Profile bottlenecks (I/O vs parsing vs validation)
  4. If needed, add caching layer for frequently accessed stories
  5. Document performance characteristics

### Risk 5: Cross-Platform Path Issues
- **Why it blocks MVP:** If path resolution breaks on Windows (backslashes vs forward slashes, drive letters), the adapter will fail on Windows development environments.
- **Required mitigation:**
  1. Use `path.join()` for ALL path operations (never string concatenation)
  2. Accept monorepo root as constructor param, resolve all paths from root
  3. Test with paths containing spaces, special characters
  4. If Windows testing unavailable, add CI job on Windows runner
  5. Document platform testing status

## Missing Requirements for MVP

### Missing Requirement 1: Error Class Hierarchy
- **Decision needed:** Define custom error class hierarchy for adapter errors
- **Concrete text for PM:**
  ```
  Error Classes (Required):
  - StoryNotFoundError extends Error — file does not exist
  - InvalidYAMLError extends Error — YAML parsing failed
  - StoryValidationError extends Error — Zod validation failed
  - FilePermissionError extends Error — cannot read/write file
  - AtomicWriteError extends Error — write operation failed mid-operation

  All error classes must include:
  - message: human-readable description
  - code: machine-readable error code
  - context: relevant data (file path, validation errors, etc.)
  ```

### Missing Requirement 2: Monorepo Root Resolution
- **Decision needed:** How does adapter locate monorepo root?
- **Concrete text for PM:**
  ```
  Monorepo Root Resolution:
  - Constructor accepts `monorepoRoot: string` parameter (absolute path)
  - All file paths resolved relative to this root
  - Example: `new StoryFileAdapter('/Users/user/monorepo')`
  - Caller (LangGraph workflows) responsible for providing correct root
  - No auto-detection of root (explicit is better than implicit)
  ```

### Missing Requirement 3: Logging Strategy
- **Decision needed:** What should be logged during file operations?
- **Concrete text for PM:**
  ```
  Logging Requirements:
  - Use @repo/logger (never console.log)
  - Log level INFO: file read/write success, performance metrics
  - Log level WARN: schema validation warnings (non-fatal), deprecated fields
  - Log level ERROR: all errors with full context
  - Include in logs: file path, operation type, duration, error details
  - Do NOT log file contents (may be large)
  ```

### Missing Requirement 4: Handling Extra Fields in YAML
- **Decision needed:** What happens if YAML file has fields not in schema?
- **Concrete text for PM:**
  ```
  Extra Fields Handling:
  - Zod schema uses .strict() by default (rejects extra fields)
  - For backward compatibility, use .passthrough() to allow extra fields
  - Extra fields preserved on read, included in write
  - Log warning if extra fields found (may indicate schema drift)
  - Option: Add migration mode to strip extra fields
  ```

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Unit Test Coverage Report**
   - Run: `pnpm test story-file-adapter --coverage`
   - Assert: >80% coverage for adapter class
   - Evidence file: `coverage/lcov-report/index.html`

2. **Integration Test Success**
   - Run: `pnpm test:integration story-file-adapter`
   - Assert: All tests pass, including real file I/O
   - Evidence: Test output showing all tests green

3. **Performance Benchmark Results**
   - Run: `pnpm test:perf story-file-adapter`
   - Assert: Batch read <5s, single write <100ms
   - Evidence: Log file with timing data

4. **Existing File Compatibility Report**
   - Run: Manual script to parse 20 existing story files
   - Assert: All parse successfully OR migration plan documented
   - Evidence: Markdown report listing files and parse results

5. **Round-Trip Fidelity Validation**
   - Run: Test with all field types and edge cases
   - Assert: Deep equality check passes
   - Evidence: Test output showing successful round-trips

### Critical CI/Deploy Checkpoints

- ✅ TypeScript compilation passes (`pnpm check-types`)
- ✅ ESLint passes (`pnpm lint`)
- ✅ Unit tests pass (`pnpm test`)
- ✅ Integration tests pass (`pnpm test:integration`)
- ✅ No new vulnerabilities (`pnpm audit`)

## Implementation Notes

### File Structure (Component Directory Pattern)
```
packages/backend/orchestrator/src/adapters/
├── story-file-adapter.ts          # Main adapter class
├── __types__/
│   └── index.ts                   # Type re-exports (StoryArtifact, etc.)
├── __tests__/
│   ├── story-file-adapter.test.ts # Unit tests
│   ├── story-file-adapter.integration.test.ts
│   └── fixtures/
│       ├── minimal-story.yaml
│       ├── full-story.yaml
│       ├── invalid-missing-id.yaml
│       └── ...
└── utils/
    ├── yaml-parser.ts             # YAML parsing utilities
    ├── file-utils.ts              # Atomic write utilities
    └── __tests__/
        ├── yaml-parser.test.ts
        └── file-utils.test.ts
```

### Adapter Class Signature (Proposed)
```typescript
import { z } from 'zod'
import { StoryArtifactSchema, type StoryArtifact } from '../artifacts/story.js'

export class StoryFileAdapter {
  constructor(private monorepoRoot: string) {}

  async read(relativePath: string): Promise<StoryArtifact>
  async write(relativePath: string, artifact: StoryArtifact): Promise<void>
  async update(relativePath: string, updates: Partial<StoryArtifact>): Promise<void>
  async readBatch(relativePaths: string[]): Promise<StoryArtifact[]>
  async exists(relativePath: string): Promise<boolean>
}
```

### Dependencies to Add (package.json)
```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5"
  }
}
```

### Performance Targets
- Single read: <50ms (target), <100ms (max)
- Single write: <100ms (target), <200ms (max)
- Batch read (50 files): <5s (requirement)
- Validation overhead: <10ms per file

### Testing Pyramid
- **Unit tests:** 20-30 tests, fast (<1s total)
- **Integration tests:** 10-15 tests, real I/O (~5s total)
- **Performance tests:** 5 tests, benchmarks (~10s total)
- **Compatibility tests:** 1 test suite, real files (~3s total)

## Recommended Implementation Order

1. **Phase 1: Core Read/Write (1-2 days)**
   - Implement YAML parsing utilities
   - Implement basic read() method
   - Implement basic write() method with atomic pattern
   - Add error classes
   - Unit tests for happy path

2. **Phase 2: Validation & Error Handling (1 day)**
   - Add Zod validation to read()
   - Implement all error paths
   - Add error handling tests
   - Test edge cases (special chars, empty arrays, nulls)

3. **Phase 3: Update & Batch Operations (1 day)**
   - Implement update() method
   - Implement readBatch() with parallel reads
   - Add performance tests
   - Verify performance targets met

4. **Phase 4: Integration & Compatibility (1 day)**
   - Survey existing story files
   - Create integration tests with real files
   - Document any schema mismatches
   - Add migration logic if needed

5. **Phase 5: Polish & Documentation (0.5 days)**
   - Add logging
   - Document API in JSDoc comments
   - Create usage examples
   - Final code review

**Total Estimate:** 4.5-5.5 days for MVP implementation

## Dependencies on Other Stories

- **No blockers** — this is Wave 1, Story #5 (no dependencies)
- **Blocks:**
  - LNGG-0020 (Index Management Adapter)
  - LNGG-0040 (Stage Movement Adapter)
  - LNGG-0060 (Checkpoint Adapter)
  - LNGG-0070 (Integration Test Suite)

## Confidence Assessment

**Overall confidence: HIGH**

Reasons:
- ✅ Clear requirements with acceptance criteria
- ✅ Existing schema to reuse (StoryArtifactSchema)
- ✅ Mature libraries available (gray-matter, js-yaml)
- ✅ Well-understood patterns (atomic writes, Zod validation)
- ✅ No external service dependencies
- ✅ Testable in isolation
- ✅ Established codebase patterns to follow

Risks managed:
- ⚠️ Schema compatibility (mitigated by survey + migration plan)
- ⚠️ Round-trip fidelity (mitigated by thorough testing)
- ⚠️ Performance (mitigated by parallel reads + benchmarks)
- ⚠️ Cross-platform paths (mitigated by path.join() usage)

This story is ready to implement once missing requirements are clarified.
