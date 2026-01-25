# Implementation Plan - wrkf-1000: Package Scaffolding

## Scope Surface

```yaml
backend/API: yes  # TypeScript package with LangGraphJS dependencies
frontend/UI: no   # No UI components
infra/config: yes # pnpm workspace, turborepo auto-discovery
```

**Notes:**
- Pure TypeScript library package
- No API endpoints, no database, no HTTP contracts
- Package location: `packages/backend/orchestrator/` (matches `packages/backend/*` glob in pnpm-workspace.yaml)
- pnpm workspace auto-discovery via existing glob - NO workspace config changes needed

---

## Acceptance Criteria Checklist

- [ ] **AC-1:** `packages/backend/orchestrator/` directory exists with valid structure
- [ ] **AC-2:** `package.json` defines name as `@repo/orchestrator` with version `0.0.1`
- [ ] **AC-3:** `tsconfig.json` extends repo patterns with `strict: true` and `declaration: true`
- [ ] **AC-4:** `@langchain/langgraph` and `@langchain/core` are listed in dependencies
- [ ] **AC-5:** `zod` is listed in dependencies
- [ ] **AC-6:** `pnpm install` succeeds from monorepo root
- [ ] **AC-7:** `pnpm build --filter @repo/orchestrator` succeeds and produces `dist/`
- [ ] **AC-8:** `pnpm test --filter @repo/orchestrator` runs at least one passing test
- [ ] **AC-9:** Package can be imported as `import { version } from '@repo/orchestrator'`
- [ ] **AC-10:** Package recognized by pnpm workspace (via `packages/backend/*` glob)

---

## Files To Touch (Expected)

| Path | Action | Purpose |
|------|--------|---------|
| `packages/backend/orchestrator/package.json` | CREATE | Package definition with LangGraphJS deps |
| `packages/backend/orchestrator/tsconfig.json` | CREATE | TypeScript config extending repo patterns |
| `packages/backend/orchestrator/vitest.config.ts` | CREATE | Test runner configuration |
| `packages/backend/orchestrator/src/index.ts` | CREATE | Main exports with `version` constant |
| `packages/backend/orchestrator/src/__tests__/index.test.ts` | CREATE | Smoke test for version export |
**Total:** 5 new files (no root package.json modification needed - glob auto-discovery)

---

## Reuse Targets

### Package Configuration Patterns

| Source | Usage |
|--------|-------|
| `packages/backend/moc-parts-lists-core/package.json` | Template for package.json structure |
| `packages/backend/moc-parts-lists-core/tsconfig.json` | Template for tsconfig.json structure |
| `packages/backend/moc-parts-lists-core/vitest.config.ts` | Template for vitest.config.ts |
| `packages/backend/lambda-utils/package.json` | Reference for ESM exports pattern |

### Dependencies

| Dependency | Source | Notes |
|------------|--------|-------|
| `zod` | Root package.json | Use `^3.22.4` (matches root) |
| `typescript` | Consistent across backend packages | Use `^5.8.0` |
| `vitest` | Consistent across backend packages | Use `^3.2.4` |

### Patterns from LESSONS-LEARNED.md

1. **Run lint after each file** - prevents Prettier errors accumulating
2. **Use `moc-parts-lists-core` as template** - recommended in STORY-010 lessons
3. **Tests alongside implementation** - per STORY-016 lessons

---

## Architecture Notes (Ports & Adapters)

### Package Placement

**Decision:** `packages/backend/orchestrator/` (top-level under packages)

**Rationale:**
- This is a cross-cutting orchestration package, not a "backend" package per se
- However, reviewing pnpm-workspace.yaml shows `packages/backend/*` is the only glob that covers non-feature packages
- The story specifies `packages/backend/orchestrator/` which does NOT match any existing glob
- **Resolution:** Root package.json workspaces array must explicitly add `packages/orchestrator`

### Future Structure (reference only)

```
packages/backend/orchestrator/
├── src/
│   ├── index.ts           # wrkf-1000: version export only
│   ├── state/             # wrkf-1010: GraphState schemas
│   ├── nodes/             # wrkf-1020: Node infrastructure
│   ├── adapters/          # wrkf-1110+: OpenCode, MCP
│   └── graphs/            # wrkf-1030+: Subgraph definitions
```

This story only creates the root structure with index.ts.

### Boundaries

- Core exports: Only `version` constant (placeholder for future exports)
- No adapters, no nodes, no graphs yet
- LangGraphJS dependencies installed but not imported in this story

---

## Step-by-Step Plan (Small Steps)

### Step 1: Create package directory and package.json

**Objective:** Establish package identity with correct dependencies

**Files involved:**
- `packages/backend/orchestrator/package.json` (CREATE)

**Actions:**
1. Create directory `packages/backend/orchestrator/`
2. Write `package.json` with:
   - name: `@repo/orchestrator`
   - version: `0.0.1`
   - type: `module`
   - ESM exports configuration
   - dependencies: `@langchain/langgraph`, `@langchain/core`, `zod`
   - devDependencies: `typescript`, `vitest`, `@vitest/coverage-v8`, `@types/node`
   - scripts: build, dev, clean, type-check, test, test:watch, test:coverage

**Verification:**
- File exists with correct JSON structure
- All required dependencies listed

---

### Step 2: Create tsconfig.json

**Objective:** TypeScript configuration matching repo patterns

**Files involved:**
- `packages/backend/orchestrator/tsconfig.json` (CREATE)

**Actions:**
1. Write `tsconfig.json` following `moc-parts-lists-core` pattern:
   - target: ES2022
   - module: NodeNext
   - moduleResolution: NodeNext
   - strict: true
   - declaration: true
   - declarationMap: true
   - outDir: ./dist
   - rootDir: ./src

**Verification:**
- `tsc --noEmit` succeeds (will fail until src/index.ts exists)

---

### Step 3: Create vitest.config.ts

**Objective:** Test runner configuration

**Files involved:**
- `packages/backend/orchestrator/vitest.config.ts` (CREATE)

**Actions:**
1. Write `vitest.config.ts` matching `moc-parts-lists-core` pattern:
   - globals: true
   - environment: node
   - include: `src/**/*.test.ts`
   - coverage configuration

**Verification:**
- File exists with valid vitest configuration

---

### Step 4: Create src/index.ts with version export

**Objective:** Main entry point with version constant

**Files involved:**
- `packages/backend/orchestrator/src/index.ts` (CREATE)

**Actions:**
1. Create `packages/backend/orchestrator/src/` directory
2. Write `src/index.ts` with:
   ```typescript
   /**
    * LangGraph Orchestrator Package
    *
    * Orchestration runtime, graph definitions, and adapters for agent workflows.
    */

   /** Package version - matches package.json */
   export const version = '0.0.1'
   ```

**Verification:**
- `pnpm eslint packages/backend/orchestrator/src/index.ts` passes

---

### Step 5: Create smoke test

**Objective:** At least one passing test (AC-8)

**Files involved:**
- `packages/backend/orchestrator/src/__tests__/index.test.ts` (CREATE)

**Actions:**
1. Create `packages/backend/orchestrator/src/__tests__/` directory
2. Write `index.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest'
   import { version } from '../index.js'

   describe('orchestrator package', () => {
     it('exports version constant', () => {
       expect(version).toBe('0.0.1')
     })

     it('version is a string', () => {
       expect(typeof version).toBe('string')
     })
   })
   ```

**Verification:**
- `pnpm eslint packages/backend/orchestrator/src/__tests__/index.test.ts` passes

---

### Step 6: Verify workspace recognition

**Objective:** Confirm pnpm recognizes package via existing glob

**Files involved:**
- None (no changes needed - `packages/backend/*` glob in pnpm-workspace.yaml already covers this)

**Actions:**
1. Run `pnpm list --filter @repo/orchestrator` to verify workspace recognition
2. The `packages/backend/*` glob in pnpm-workspace.yaml auto-discovers the package

**Verification:**
- `pnpm list --filter @repo/orchestrator` shows the package

---

### Step 7: Run pnpm install

**Objective:** Install all dependencies (AC-6)

**Actions:**
1. Run `pnpm install` from monorepo root
2. Verify LangGraphJS dependencies are installed

**Verification:**
- `pnpm install` succeeds without errors
- `pnpm list --filter @repo/orchestrator --depth 0` shows dependencies

---

### Step 8: Build package

**Objective:** Compile TypeScript and produce dist/ (AC-7)

**Actions:**
1. Run `pnpm build --filter @repo/orchestrator`
2. Verify `dist/` directory created with:
   - `index.js`
   - `index.d.ts`
   - `index.js.map`
   - `index.d.ts.map`

**Verification:**
- Build command succeeds
- `ls packages/backend/orchestrator/dist/` shows expected files

---

### Step 9: Run tests

**Objective:** Execute test suite (AC-8)

**Actions:**
1. Run `pnpm test --filter @repo/orchestrator`
2. Verify at least 1 test passes

**Verification:**
- Test command succeeds
- Output shows `2 passed` (or similar)

---

### Step 10: Verify import works

**Objective:** Confirm package is importable (AC-9)

**Actions:**
1. TypeScript resolution should allow:
   ```typescript
   import { version } from '@repo/orchestrator'
   ```
2. The build step (Step 8) already verifies type definitions are generated

**Verification:**
- Type definitions exist in `dist/index.d.ts`
- Export includes `version` constant

---

### Step 11: Final lint check

**Objective:** All files pass lint

**Actions:**
1. Run `pnpm eslint packages/backend/orchestrator/src/ --fix`
2. Fix any issues if present

**Verification:**
- Lint passes with no errors

---

## Test Plan

### Unit Tests

```bash
# Run package tests
pnpm test --filter @repo/orchestrator

# Run with coverage
pnpm test:coverage --filter @repo/orchestrator
```

### Type Check

```bash
# Package-scoped type check
pnpm --filter @repo/orchestrator type-check
```

### Lint

```bash
# Lint package files
pnpm eslint packages/backend/orchestrator/src/ --fix --max-warnings 0
```

### Build

```bash
# Build package
pnpm build --filter @repo/orchestrator
```

### Installation

```bash
# Verify dependencies installed
pnpm install
pnpm list --filter @repo/orchestrator --depth 0
```

### Playwright

**NOT APPLICABLE** - No UI changes

### HTTP Contract

**NOT APPLICABLE** - No API endpoints

---

## Stop Conditions / Blockers

### Potential Blockers

1. **LangGraphJS version compatibility**
   - Risk: `@langchain/langgraph ^1.1.0` may have peer dependency conflicts
   - Mitigation: If conflicts occur, adjust version constraint or add pnpm overrides
   - Status: **Not currently blocked**

2. **pnpm workspace glob mismatch**
   - Risk: `packages/orchestrator` not matching existing globs in pnpm-workspace.yaml
   - Mitigation: Explicitly add to root package.json workspaces array
   - Status: **Already addressed in plan**

### No Current Blockers

All prerequisites are available:
- Package patterns documented (moc-parts-lists-core, lambda-utils)
- LangGraphJS package names confirmed from story spec
- Zod dependency available at root
- pnpm workspace modification path clear

---

## Token Log (REQUIRED)

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: wrkf-1000.md | input | 9,870 | ~2,468 |
| Read: LESSONS-LEARNED.md | input | 18,300 | ~4,575 |
| Read: lambda-utils/package.json | input | 1,100 | ~275 |
| Read: lambda-utils/tsconfig.json | input | 700 | ~175 |
| Read: logger/package.json | input | 800 | ~200 |
| Read: logger/tsconfig.json | input | 440 | ~110 |
| Read: lambda-utils/vitest.config.ts | input | 350 | ~88 |
| Read: logger/src/index.ts | input | 1,800 | ~450 |
| Read: package.json (root) | input | 4,200 | ~1,050 |
| Read: moc-parts-lists-core/package.json | input | 1,050 | ~263 |
| Read: moc-parts-lists-core/tsconfig.json | input | 550 | ~138 |
| Read: moc-parts-lists-core/vitest.config.ts | input | 420 | ~105 |
| Read: moc-parts-lists-core/src/index.ts | input | 3,500 | ~875 |
| Read: tsconfig.json (root) | input | 900 | ~225 |
| Read: pnpm-workspace.yaml | input | 280 | ~70 |
| Read: SCOPE.md | input | 550 | ~138 |
| Read: get-parts-lists.test.ts (partial) | input | 1,600 | ~400 |
| Write: IMPLEMENTATION-PLAN.md | output | 9,500 | ~2,375 |
| **Total** | — | ~55,910 | **~13,978** |

---

*Generated by dev-implement-planner agent | 2026-01-23*
