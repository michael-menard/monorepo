# Implementation Plan - KNOW-028

## Scope Surface

- backend/API: yes - Config module in apps/api/knowledge-base
- frontend/UI: no
- infra/config: yes - .env.example updates, .gitignore verification

**Notes:** This is a configuration-focused story. Existing implementation has partial coverage - need to add Zod-based validation module and integrate with existing code.

## Acceptance Criteria Checklist

- [ ] AC1: README.md documents all required environment variables (exists, verify/update)
- [ ] AC2: .env.example with all variables and instructions (exists, verify alignment with AC3 schema)
- [ ] AC3: Zod-based startup validation with clear error messages (NEW - create config/env.ts)
- [ ] AC4: .gitignore protection for .env files (exists, VERIFIED)
- [ ] AC5: Test configuration with mock environment values (partial - needs test setup file)

## Files To Touch (Expected)

### New Files
- `apps/api/knowledge-base/src/config/env.ts` - Zod schema and validation
- `apps/api/knowledge-base/src/config/index.ts` - Export validated config
- `apps/api/knowledge-base/src/config/__tests__/env.test.ts` - Unit tests for validation
- `apps/api/knowledge-base/src/test/setup.ts` - Global test setup with mock env

### Existing Files (Modify)
- `apps/api/knowledge-base/src/index.ts` - Import config module at top
- `apps/api/knowledge-base/.env.example` - Align with Zod schema (add EMBEDDING_BATCH_SIZE, LOG_LEVEL)
- `apps/api/knowledge-base/README.md` - Add/update Environment Setup section

## Reuse Targets

- Zod (already in project per CLAUDE.md)
- @repo/logger (for error output)
- Vitest (existing test infrastructure)
- dotenv (already used in db/client.ts)

## Architecture Notes (Ports & Adapters)

### Core (Transport-agnostic)
- `config/env.ts` - Pure Zod schema validation, no side effects
- Exposes: `EnvSchema`, `validateEnv()`, `type Env`

### Adapters
- `config/index.ts` - Loads .env, validates, exports singleton config
- Integration point: Import in `src/index.ts` before other modules

### Boundaries
- Config validation is independent of database/API
- Test setup can provide mock env without .env file
- Existing `db/client.ts` can migrate to use config module (optional)

## Step-by-Step Plan (Small Steps)

### Step 1: Create Zod Schema Module
**Objective:** Define the environment variable schema using Zod
**Files:** `apps/api/knowledge-base/src/config/env.ts`
**Verification:** TypeScript compiles without errors

### Step 2: Create Config Export Module
**Objective:** Load and validate environment, export typed config singleton
**Files:** `apps/api/knowledge-base/src/config/index.ts`
**Verification:** Import works, exports config object

### Step 3: Write Unit Tests for Validation
**Objective:** Test Zod schema with valid, invalid, and missing values
**Files:** `apps/api/knowledge-base/src/config/__tests__/env.test.ts`
**Verification:** `pnpm test -- env.test.ts` passes

### Step 4: Create Global Test Setup
**Objective:** Provide mock environment values for all tests
**Files:** `apps/api/knowledge-base/src/test/setup.ts`
**Verification:** Tests run without .env file requirement

### Step 5: Update Vitest Config
**Objective:** Add setupFiles for global test setup
**Files:** `apps/api/knowledge-base/vitest.config.ts`
**Verification:** `pnpm test` uses setup file

### Step 6: Integrate Config in Package Entry
**Objective:** Import config at top of index.ts for fail-fast validation
**Files:** `apps/api/knowledge-base/src/index.ts`
**Verification:** Package export includes config, fails fast on missing env

### Step 7: Update .env.example
**Objective:** Align with Zod schema - add EMBEDDING_BATCH_SIZE, LOG_LEVEL
**Files:** `apps/api/knowledge-base/.env.example`
**Verification:** All schema variables present

### Step 8: Update README Environment Section
**Objective:** Document the new env vars from story AC1 table
**Files:** `apps/api/knowledge-base/README.md`
**Verification:** All 5 variables documented with descriptions

### Step 9: Run Full Test Suite
**Objective:** Verify all tests pass with new setup
**Files:** All test files in package
**Verification:** `pnpm test` passes with >45% coverage

### Step 10: Type Check and Lint
**Objective:** Final verification of code quality
**Files:** All changed files
**Verification:** `pnpm check-types && pnpm lint` passes

## Test Plan

### Unit Tests
```bash
pnpm --filter @repo/knowledge-base test -- src/config/__tests__/env.test.ts
```

Tests:
- Valid environment parses correctly
- Missing required vars throws with all errors listed
- Invalid DATABASE_URL format rejects
- Invalid OPENAI_API_KEY format rejects
- Default values applied for optional vars
- Type coercion for EMBEDDING_BATCH_SIZE

### Integration Tests
```bash
pnpm --filter @repo/knowledge-base test
```

Tests:
- Existing tests still pass with new setup
- Test environment uses mock values

### Type Check & Lint
```bash
pnpm --filter @repo/knowledge-base check-types
pnpm --filter @repo/knowledge-base lint
```

## Stop Conditions / Blockers

None identified - story is self-contained with clear implementation path.

## Architectural Decisions

### Decision 1: Config Module Location (CONFIRMED)

**Question:** Where should the config module live?

**Context:** Story specifies `src/config/` but existing env validation is in `src/scripts/validate-env.ts`

**Decision:** Create new `src/config/` module as specified in story

**Rationale:**
- `scripts/validate-env.ts` is a CLI script for manual validation
- `config/` module provides programmatic validation at startup
- Both serve different purposes - keep both

### Decision 2: Env Variable Naming (CONFIRMED)

**Question:** Should we use DATABASE_URL or KB_DB_* variables?

**Context:** Story AC3 shows `DATABASE_URL`, existing code uses `KB_DB_*` pattern

**Decision:** Support BOTH patterns for backward compatibility
- `DATABASE_URL` takes precedence if set (matches story spec)
- Fall back to constructing from `KB_DB_*` variables
- This maintains compatibility with existing .env files

**Rationale:** Existing installations use KB_DB_* pattern; breaking change is unnecessary

### Decision 3: Test Setup Approach (CONFIRMED)

**Question:** How should test setup provide mock environment values?

**Context:** AC5 requires tests work without real .env file

**Decision:** Use Vitest setupFiles with mock values
- Create `src/test/setup.ts` that sets process.env before tests
- Configure in `vitest.config.ts` setupFiles array
- Mock values use test-specific patterns (e.g., `postgresql://test:test@localhost:5432/test`)

**Rationale:** Standard Vitest pattern; matches existing MSW setup approach

## Worker Token Summary

- Input: ~15,000 tokens (story file, existing files: validate-env.ts, .env.example, README.md, db/client.ts, vitest.config.ts, embedding-client/__tests__/setup.ts, index.ts)
- Output: ~3,000 tokens (IMPLEMENTATION-PLAN.md)
