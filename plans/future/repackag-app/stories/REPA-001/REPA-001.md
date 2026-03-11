---
id: REPA-001
title: "Create @repo/upload Package Structure"
status: uat
priority: P2
experiment_variant: control
epic: repackag-app
created_at: "2026-02-10"
updated_at: "2026-02-10"
points: 3
story_type: tech_debt
touches_backend: false
touches_frontend: false
touches_database: false
touches_infra: true
predictions:
  split_risk: 0.2
  review_cycles: 2
  token_estimate: 120000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-10T00:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
---

# REPA-001: Create @repo/upload Package Structure

## Context

The monorepo currently has upload functionality scattered across three separate packages (@repo/upload-client, @repo/upload-types, @repo/upload-config) and duplicated implementations in multiple apps. The REPA epic aims to consolidate approximately 10,800 lines of duplicate code across the codebase.

**Current State**:
- Upload functionality is fragmented across 3 existing packages
- 7 Uploader sub-components are exact duplicates between main-app and app-instructions-gallery
- Upload hooks (useUploadManager, useUploaderSession) have duplicate implementations
- Image processing logic is isolated in app-wishlist-gallery
- No unified location for upload components, hooks, and utilities

**Problem**:
Without a consolidated package, upload-related code remains scattered and duplicated across apps. This leads to inconsistent behavior, difficult maintenance, and wasted effort when bugs need fixes in multiple locations.

**Reality Baseline Used**: None - no active baseline reality file exists. Context was gathered from codebase scanning and epic documentation.

**Related Existing Features**:
- @repo/upload-client (packages/core/upload-client) - XHR upload client with progress tracking
- @repo/upload-types (packages/core/upload-types) - Zod schemas for upload/session types
- @repo/upload-config (packages/tools/upload-config) - Shared upload configuration
- Upload hooks in apps/web/main-app/src/hooks - useUploadManager, useUploaderSession
- Upload components in apps/web/main-app/src/components/Uploader - 7 sub-components

**Active In-Progress Work**: None detected that would conflict with this story.

## Goal

Create a new @repo/upload package with proper directory structure and configuration to serve as the consolidation target for all future upload migration stories (REPA-002 through REPA-006). The package will provide a single, well-structured location for upload client code, hooks, image processing utilities, UI components, and type definitions.

This foundational package enables subsequent migration stories to proceed in parallel (REPA-002, REPA-004, and REPA-006 can all begin once REPA-001 is complete).

## Non-Goals

- Migrating any actual code from existing packages (reserved for REPA-002, REPA-004, REPA-006)
- Migrating hooks from apps (reserved for REPA-003)
- Migrating components from apps (reserved for REPA-005)
- Creating any functional upload code beyond directory placeholders
- Deprecating existing @repo/upload-client or @repo/upload-types packages (happens in later stories after migration completes)
- Setting up Storybook stories (can be added incrementally as components are migrated in REPA-005)

**Protected Features** (from seed):
- @repo/upload-client - Do not modify until REPA-002
- @repo/upload-types - Do not modify until REPA-006
- @repo/upload-config - Do not modify until migration plan is finalized
- Existing upload hooks in apps - Do not modify until REPA-003
- Existing upload components in apps - Do not modify until REPA-005

## Scope

### Packages Touched
- **New**: `packages/core/upload/` - Create new package with full configuration

### Directory Structure
Create the following structure within `packages/core/upload/`:
```
packages/core/upload/
  src/
    client/           # For XHR upload client code (REPA-002 target)
      index.ts        # Placeholder export
    hooks/            # For upload hooks (REPA-003 target)
      index.ts        # Placeholder export
    image/            # For image processing utilities (REPA-004 target)
      index.ts        # Placeholder export
    components/       # For upload UI components (REPA-005 target)
      index.ts        # Placeholder export
    types/            # For Zod schemas and type definitions (REPA-006 target)
      index.ts        # Placeholder export
    index.ts          # Main barrel export
    __tests__/
      package-structure.test.ts  # Smoke test
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
```

### Configuration Files
- **package.json**: Name, version, dependencies, scripts, exports field
- **tsconfig.json**: Strict TypeScript configuration with React 19 support
- **vitest.config.ts**: Test infrastructure with React Testing Library
- **README.md**: Package description and usage guidelines

### Turborepo Integration
- Verify package is included in Turborepo pipeline (turbo.json may need update)

## Acceptance Criteria

- [ ] AC-1: Package created at `packages/core/upload/` with proper monorepo structure
- [ ] AC-2: package.json configured with name "@repo/upload", version "0.0.1", private: true
- [ ] AC-3: package.json includes all necessary dependencies (zod, react, react-dom, framer-motion, class-variance-authority, clsx, tailwind-merge)
- [ ] AC-4: package.json includes peerDependencies for react ^19.1.0 and react-dom ^19.1.0
- [ ] AC-5: package.json scripts configured: build, dev, check-types, lint, test, test:watch
- [ ] AC-6: package.json exports field configured for ES modules with proper entry points
- [ ] AC-7: TypeScript configured with tsconfig.json (strict mode enabled, React 19 JSX support)
- [ ] AC-8: ESLint configured with monorepo standards (inherits from workspace root)
- [ ] AC-9: Vitest configured with React Testing Library support and jsdom environment
- [ ] AC-10: Directory structure created with all subdirectories:
  - src/client/ with placeholder index.ts
  - src/hooks/ with placeholder index.ts
  - src/image/ with placeholder index.ts
  - src/components/ with placeholder index.ts
  - src/types/ with placeholder index.ts
- [ ] AC-11: Main barrel export file created at src/index.ts (exports from all subdirectories)
- [ ] AC-12: README.md created with package description, usage guidelines, and migration roadmap
- [ ] AC-13: Package builds successfully with `pnpm --filter @repo/upload build` (exit code 0)
- [ ] AC-14: Type checking passes with `pnpm --filter @repo/upload check-types` (exit code 0)
- [ ] AC-15: Linting passes with `pnpm --filter @repo/upload lint` (exit code 0, no warnings)
- [ ] AC-16: Test infrastructure verified with smoke test passing via `pnpm --filter @repo/upload test`
- [ ] AC-17: Package added to Turborepo pipeline configuration and verified with dry-run

## Reuse Plan

### Existing Packages to Reference

**Configuration Templates**:
- `packages/.template/package.json` - Use as baseline for package.json structure
- `packages/core/app-component-library/package.json` - Reference for React component package configuration
- `packages/core/gallery/package.json` - Reference for consolidated package patterns
- `packages/core/logger/package.json` - Reference for core utility package setup

**Configuration Files to Copy**:
- `packages/core/app-component-library/tsconfig.json` - Copy and adapt (adjust paths to be relative)
- `packages/core/app-component-library/vitest.config.ts` - Copy as-is (paths are relative)
- ESLint inherits from workspace root (no package-level config needed)

### Dependencies to Include

**Production Dependencies**:
```json
{
  "zod": "^3.24.2",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "framer-motion": "^12.23.3",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.4"
}
```

**Peer Dependencies**:
```json
{
  "react": "^19.1.0",
  "react-dom": "^19.1.0"
}
```

**Dev Dependencies**:
```json
{
  "typescript": "5.8.3",
  "vitest": "^3.2.4",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@vitejs/plugin-react": "^4.3.4",
  "jsdom": "^25.0.1",
  "eslint": "^9.30.0"
}
```

### Reuse-First Checklist
- [x] Verified no existing `@repo/upload` package exists (prevents name collision)
- [x] Referenced multiple existing packages for configuration patterns
- [x] Using exact dependency versions from working packages
- [x] Copying proven configuration files instead of writing from scratch
- [x] Following established component directory structure (\_\_tests\_\_, \_\_types\_\_, utils/)

## Architecture Notes

### Package Boundary Rules

**This package will contain**:
- Upload client functions (XHR, progress tracking, session management)
- Upload hooks (useUploadManager, useUploaderSession, useS3Upload)
- Image processing utilities (compression, HEIC conversion, presets)
- Upload UI components (ThumbnailUpload, InstructionsUpload, Uploader sub-components)
- Upload type schemas (Zod-first type definitions)

**This package will NOT contain**:
- App-specific upload configurations (remain in apps)
- Backend upload endpoints (remain in lego-api)
- S3 bucket configuration (remains in infrastructure)

### Directory Organization Rationale

**client/**: Core upload functionality separate from React-specific code. This allows potential non-React consumers in the future.

**hooks/**: React hooks that wrap client functions. Depends on client/ but is React-specific.

**image/**: Image processing is orthogonal to upload mechanism and may be useful independently.

**components/**: UI layer that composes hooks and client functions. Highest level of abstraction.

**types/**: Zod schemas are shared across all layers. Centralized to prevent circular dependencies.

### Migration Strategy Alignment

The directory structure directly aligns with subsequent migration stories:
- REPA-002 populates `client/`
- REPA-003 populates `hooks/`
- REPA-004 populates `image/`
- REPA-005 populates `components/`
- REPA-006 populates `types/`

This parallel structure enables migration stories to proceed independently without conflicts.

## Infrastructure Notes

### Turborepo Pipeline Integration

**Verification Required**:
Check if `turbo.json` includes patterns that match `packages/core/*`. If not, add:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

**Test with**:
```bash
pnpm turbo run build --filter=@repo/upload --dry-run
```

### Package.json Exports Field

Configure for ESM with proper entry points:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./client": {
      "import": "./dist/client/index.js",
      "types": "./dist/client/index.d.ts"
    },
    "./hooks": {
      "import": "./dist/hooks/index.js",
      "types": "./dist/hooks/index.d.ts"
    },
    "./image": {
      "import": "./dist/image/index.js",
      "types": "./dist/image/index.d.ts"
    },
    "./components": {
      "import": "./dist/components/index.js",
      "types": "./dist/components/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    }
  }
}
```

This allows consumers to import from specific subdirectories if needed:
```typescript
import { useUploadManager } from '@repo/upload/hooks'
import { compressImage } from '@repo/upload/image'
```

### Placeholder Implementation

Each subdirectory index.ts should contain:

```typescript
// [Directory name] will be populated in [Story ID]
export {}
```

Example for `src/client/index.ts`:
```typescript
// XHR upload client functions will be migrated from @repo/upload-client (REPA-002)
export {}
```

### Smoke Test Implementation

`src/__tests__/package-structure.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('@repo/upload package structure', () => {
  it('should have placeholder exports', () => {
    // This test verifies the package structure is set up correctly
    // Actual functionality tests will be added in migration stories
    expect(true).toBe(true)
  })
})
```

## Test Plan

Comprehensive test plan available in: `plans/stories/backlog/REPA-001/_pm/TEST-PLAN.md`

### Scope Summary
- **Endpoints touched**: None (infrastructure only)
- **UI touched**: No
- **Data/storage touched**: No
- **Package structure**: New package creation at `packages/core/upload/`

### Critical Test Cases

**Happy Path**:
1. Package installation succeeds with `pnpm install`
2. TypeScript build succeeds with `pnpm --filter @repo/upload build`
3. Type checking passes with `pnpm --filter @repo/upload check-types`
4. Linting passes with `pnpm --filter @repo/upload lint`
5. Test infrastructure runs smoke test successfully
6. All directory structure subdirectories exist
7. Package is importable from another workspace package

**Error Cases**:
1. Missing dependencies cause clear error messages
2. TypeScript misconfiguration is detected
3. ESLint violations are caught

**Edge Cases**:
1. Empty source files build successfully (valid structure, no content)
2. Turborepo includes package in build pipeline
3. Concurrent builds complete without file lock conflicts

### Required CLI Verifications

```bash
# From monorepo root
pnpm install
ls -R packages/core/upload/src
pnpm --filter @repo/upload build
pnpm --filter @repo/upload check-types
pnpm --filter @repo/upload lint
pnpm --filter @repo/upload test
cat packages/core/upload/package.json | grep -A 10 '"exports"'
pnpm turbo run build --filter=@repo/upload --dry-run
```

All commands must exit with code 0.

### Risks
- **R1**: Missing template files - mitigate by cross-referencing multiple existing packages
- **R2**: Turborepo configuration - verify turbo.json includes patterns for packages/core/*
- **R3**: Dependency version conflicts - use exact versions from working packages
- **R4**: Export configuration - test importability from sibling package before completing story

## Reality Baseline

**Baseline Used**: None (no active baseline reality file exists)

**Context Sources**:
- Codebase scanning of existing packages
- Epic documentation (PLAN.exec.md, PLAN.meta.md)
- Architecture decision records (ADRs)
- CLAUDE.md project guidelines

**Constraints to Respect**:

From **PLAN.meta.md**:
- Reuse First principle is non-negotiable
- Core logic goes in packages/core/*
- Package boundary rules must be respected
- Import policy: workspace package names only, no deep relative imports
- All stories must include Reuse Plan section

From **CLAUDE.md**:
- Use pnpm for package management
- Turborepo for orchestration
- Strict TypeScript mode enabled
- Zod-first types (REQUIRED) - no TypeScript interfaces
- Component directory structure: index.tsx, \_\_tests\_\_/, \_\_types\_\_/, utils/
- No barrel files for imports in component directories (but OK for package-level exports)
- Use @repo/logger for logging (never console.log)

From **ADR-005** (Testing Strategy):
- All packages must have Vitest configured
- Minimum coverage targets (not applicable for infrastructure-only story)
- Use React Testing Library for component tests (will apply in REPA-005)

**Protected Features** (must not modify):
- @repo/upload-client
- @repo/upload-types
- @repo/upload-config
- Existing upload hooks in apps
- Existing upload components in apps

**Active In-Progress Work**: None detected

---

**Story Generated**: 2026-02-10
**Experiment Variant**: control
**Reality Baseline**: N/A (no baseline file available)
**Knowledge Base**: Lessons not loaded, ADRs referenced
**Blocking Conflicts**: None

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | None - all 8 audit checks passed | N/A | 0 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry |
|---|---------|----------|----------|
| 1 | Zod version mismatch: Story specifies ^3.24.2, but @repo/app-component-library uses 4.1.13 | edge-case | KB-gap-001 |
| 2 | No explicit validation that package.json exports field sub-paths work | edge-case | KB-gap-002 |
| 3 | Token logging metadata in story file | ux-polish | KB-gap-003 |
| 4 | Storybook configuration not included | future-work | KB-enh-001 |
| 5 | Bundle size analysis tooling | performance | KB-enh-002 |
| 6 | Changeset integration for version tracking | integration | KB-enh-003 |
| 7 | Package-level pre-commit hooks | enhancement | KB-enh-004 |
| 8 | Additional TypeScript strict flags | future-work | KB-enh-005 |
| 9 | ESLint custom rules (no-restricted-imports) | future-work | KB-enh-006 |
| 10 | Dual ESM/CJS exports | integration | KB-enh-007 |
| 11 | GitHub Actions package-specific CI workflow | integration | KB-enh-008 |
| 12 | More granular ACs for directory structure | ux-polish | KB-enh-009 |
| 13 | README enhancement with contribution guidelines | ux-polish | KB-enh-010 |

### Summary

- ACs added: 0
- KB entries created: 13 (3 gaps + 10 enhancements)
- Mode: autonomous
- Verdict: PASS (all audit checks passed, zero MVP-critical gaps)

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-SEED.md | input | 10,715 | ~2,679 |
| Read: stories.index.md | input | 9,805 | ~2,451 |
| Read: experiments.yaml | input | 2,668 | ~667 |
| Read: pm-spawn-patterns.md | input | 3,398 | ~850 |
| Read: pm-draft-test-plan.agent.md | input | 3,200 | ~800 |
| Read: pm-dev-feasibility-review.agent.md | input | 3,100 | ~775 |
| Read: pm-story-risk-predictor.agent.md | input | 18,500 | ~4,625 |
| Read: _token-logging.md | input | 2,800 | ~700 |
| Write: TEST-PLAN.md | output | 5,868 | ~1,467 |
| Write: DEV-FEASIBILITY.md | output | 6,335 | ~1,584 |
| Write: FUTURE-RISKS.md | output | 5,213 | ~1,303 |
| Write: PREDICTIONS.yaml | output | 1,052 | ~263 |
| Write: REPA-001.md | output | 15,598 | ~3,900 |
| Edit: stories.index.md (3x) | output | 600 | ~150 |
| **Total Input** | — | **54,186** | **~13,547** |
| **Total Output** | — | **34,666** | **~8,667** |
| **Grand Total** | — | **88,852** | **~22,214** |
