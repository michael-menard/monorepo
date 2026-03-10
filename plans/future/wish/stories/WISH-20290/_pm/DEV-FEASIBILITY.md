# Dev Feasibility: WISH-20290

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** Straightforward Vitest configuration change leveraging existing infrastructure. No code changes, no new dependencies, minimal technical risk. Vitest 3.0.5 fully supports per-directory coverage thresholds, and test utilities already exceed the proposed 80% threshold.

---

## Likely Change Surface (Core Only)

### Configuration Files

| File | Change Type | Rationale |
|------|-------------|-----------|
| `apps/web/app-wishlist-gallery/vitest.config.ts` | Modified | Add `thresholds` object with glob pattern for `src/test/utils/**/*.ts` |

### Documentation Files

| File | Change Type | Rationale |
|------|-------------|-----------|
| `apps/web/app-wishlist-gallery/src/test/utils/README.md` | Created | Document 80% coverage requirement, commands, and guidance |

### No Changes Required

- **Test utilities:** Already complete from WISH-2120 (no code changes)
- **Test scripts:** Existing `test:coverage` command works unchanged
- **Coverage provider:** v8 already configured (no provider changes)
- **CI configuration:** Uses existing test commands (no CI file changes)
- **Package dependencies:** No new dependencies required

---

## MVP-Critical Risks

**No MVP-critical risks identified.**

This is a low-risk configuration change with the following safety characteristics:

1. **No code logic changes:** Only configuration and documentation
2. **Existing infrastructure:** Vitest 3.0.5 and v8 provider already installed
3. **Conservative threshold:** 80% allows uncovered edge cases (not 100%)
4. **Current baseline high:** Test utilities already at 100% coverage (from WISH-2120)
5. **No runtime impact:** Coverage enforcement is development-time only

---

## Missing Requirements for MVP

**None.** All requirements clearly specified:

- Threshold percentage: 80%
- Target files: `src/test/utils/**/*.ts`
- Metrics: lines, functions, branches, statements
- Documentation requirements: README with commands and guidance
- Validation approach: Terminal output and HTML reports

---

## MVP Evidence Expectations

### Configuration Evidence

**Expected artifacts:**
- `vitest.config.ts` diff showing `thresholds` object added
- Configuration syntax validated (no Vitest errors on load)

**Validation command:**
```bash
pnpm --filter app-wishlist-gallery vitest --version
# Should load config without errors
```

---

### Coverage Evidence

**Expected artifacts:**
- Terminal output showing per-directory thresholds applied
- Coverage summary with test utilities at ≥80%
- HTML coverage report at `coverage/index.html`

**Validation commands:**
```bash
# Generate coverage report
pnpm --filter app-wishlist-gallery vitest run src/test/utils --coverage

# View HTML report
open apps/web/app-wishlist-gallery/coverage/index.html
```

---

### Documentation Evidence

**Expected artifacts:**
- `README.md` created at `src/test/utils/README.md`
- Content includes all required sections:
  - 80% coverage requirement explanation
  - Local coverage commands (copy-pasteable)
  - HTML report location and viewing instructions
  - Guidance on adding new utilities while maintaining coverage

---

### CI Evidence

**Expected artifacts:**
- CI logs showing coverage enforcement
- PR status check reflecting coverage state
- Clear error messages when thresholds violated

**Validation approach:**
- Create test PR with coverage below 80%
- Verify CI fails with clear error message
- Verify PR status check marked as failed

---

## Implementation Notes

### Vitest Version Compatibility

**Current version:** `vitest@3.0.5`

**Feature support:**
- ✅ Per-directory coverage thresholds (added in Vitest 0.30.0)
- ✅ Glob pattern matching for thresholds
- ✅ v8 coverage provider with HTML/text/json reporters

**Reference:** [Vitest coverage configuration docs](https://vitest.dev/config/#coverage-thresholds)

---

### Configuration Syntax

**Minimal example:**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        // Per-directory threshold for test utilities
        'src/test/utils/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
})
```

**Key points:**
- `thresholds` is an object at same level as `provider`, `reporter`, `exclude`
- Keys are glob patterns (string)
- Values are objects with metric percentages (number)
- Supported metrics: `lines`, `functions`, `branches`, `statements`

---

### Test Script Integration

**Existing scripts (no changes needed):**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**How thresholds are applied:**
- `pnpm test:coverage` automatically applies thresholds from `vitest.config.ts`
- No additional flags or configuration needed
- Exit code 0 if all thresholds pass, exit code 1 if any fail

---

### README Structure

**Recommended sections:**

```markdown
# Test Utilities

This directory contains shared test utilities used across the test suite.

## Coverage Requirements

Test utilities must maintain **80% coverage** (lines, functions, branches, statements).

This higher bar ensures reliability of test infrastructure.

## Running Coverage Locally

### Full coverage report:
pnpm test:coverage

### Test utilities only:
pnpm vitest run src/test/utils --coverage

## Viewing Coverage Reports

HTML reports are generated at `coverage/index.html`.

### macOS:
open coverage/index.html

### Linux:
xdg-open coverage/index.html

## Adding New Utilities

When adding a new test utility:

1. Create the utility file in `src/test/utils/`
2. Create corresponding test file in `src/test/utils/__tests__/`
3. Aim for 80%+ coverage before committing
4. Run coverage locally: `pnpm vitest run src/test/utils --coverage`
5. Verify HTML report shows passing thresholds

## Current Utilities

- `createMockFile.ts` - Factory for File/Blob test objects
- `mockS3Upload.ts` - S3 upload scenario mocking
```

---

## Reuse Patterns

### Similar Configuration Patterns

**Pattern source:** Vitest documentation and community examples

**Reuse candidates:**
- Per-directory thresholds for critical paths
- Two-tier coverage strategy (global vs critical)
- Glob pattern matching for file selection

**Future applications:**
- `src/hooks/**/*.ts` - React hooks (consider 80% threshold)
- `src/utils/**/*.ts` - Shared utilities (consider 70% threshold)
- `src/lib/**/*.ts` - Core library code (consider 80% threshold)

---

### Documentation Patterns

**Pattern source:** `apps/web/app-wishlist-gallery/README.md`

**Reuse from existing README:**
- Section structure (clear headings)
- Command formatting (code blocks)
- Platform-specific instructions (macOS/Linux/Windows)

---

## No New Dependencies

All required functionality is already available:

| Dependency | Version | Purpose | Status |
|------------|---------|---------|--------|
| `vitest` | 3.0.5 | Test runner and coverage | ✅ Installed |
| `@vitest/coverage-v8` | 3.0.5 | Coverage provider | ✅ Installed |
| Node.js | ≥18 | Runtime | ✅ Available |

**Verification:**
```bash
cd apps/web/app-wishlist-gallery
pnpm list vitest @vitest/coverage-v8
```

Expected output:
```
vitest 3.0.5
@vitest/coverage-v8 3.0.5
```

---

## Deployment Touchpoints

**None.** This is a development-time change only:

- Coverage enforcement runs during local development
- Coverage enforcement runs during CI (PR validation)
- No runtime impact on deployed application
- No database migrations
- No infrastructure changes
- No environment variable changes

---

## Validation Checklist

Before marking story as complete:

- [ ] `vitest.config.ts` modified with `thresholds` object
- [ ] Configuration loads without errors (`pnpm vitest --version`)
- [ ] Coverage passes for test utilities (`pnpm test:coverage`)
- [ ] Coverage report shows per-directory breakdown
- [ ] HTML report generated at `coverage/index.html`
- [ ] `README.md` created with all required sections
- [ ] README includes copy-pasteable commands
- [ ] Test failure scenario verified (error messages clear)
- [ ] CI enforcement verified (test PR failed correctly)
- [ ] Global coverage thresholds unchanged (45%)
- [ ] All 12 acceptance criteria met

---

## Risks Summary

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Configuration syntax error | High | Low | Test locally before commit |
| Glob pattern mismatch | Medium | Low | Verify with test scenarios |
| CI integration issues | Medium | Low | Test with PR |
| False positive failures | Low | Low | 80% threshold allows edge cases |

**Overall risk rating:** **Low**

This is one of the lowest-risk stories in the backlog:
- Configuration only (no code)
- Existing infrastructure (no new tools)
- High baseline (100% current coverage)
- Clear requirements (no ambiguity)
- Independent (no cross-team dependencies)
