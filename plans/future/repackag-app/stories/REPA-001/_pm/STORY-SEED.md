---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-001

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file exists. Context was gathered from codebase scanning and epic documentation.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| @repo/upload-client | packages/core/upload-client | Active - XHR upload client with progress tracking |
| @repo/upload-types | packages/core/upload-types | Active - Zod schemas for upload/session types |
| @repo/upload-config | packages/tools/upload-config | Active - Shared upload configuration |
| Upload hooks (main-app) | apps/web/main-app/src/hooks | Active - useUploadManager, useUploaderSession |
| Upload hooks (instructions) | apps/web/app-instructions-gallery/src/hooks | Active - duplicate implementations |
| Upload components (main-app) | apps/web/main-app/src/components/Uploader | Active - 7 sub-components |
| Upload components (instructions) | apps/web/app-instructions-gallery/src/components | Active - ThumbnailUpload, InstructionsUpload, duplicates |
| ImageUploadZone | apps/web/app-sets-gallery/src/components | Active - single-file uploader |
| useS3Upload hook | apps/web/app-wishlist-gallery/src/hooks | Active - image compression & upload |

### Active In-Progress Work

| Story | Status | Scope | Potential Overlap |
|-------|--------|-------|-------------------|
| None | N/A | N/A | No active stories detected that would conflict with package creation |

### Constraints to Respect

From PLAN.meta.md:
- Reuse First principle is non-negotiable
- Core logic goes in packages/core/*
- Package boundary rules must be respected
- Import policy: workspace package names only, no deep relative imports
- All stories must include Reuse Plan section

From CLAUDE.md:
- Use pnpm for package management
- Turborepo for orchestration
- Strict TypeScript mode enabled
- Zod-first types (REQUIRED) - no TypeScript interfaces
- Component directory structure: index.tsx, __tests__/, __types__/, utils/
- No barrel files for imports

---

## Retrieved Context

### Related Endpoints
Not applicable - this story is package structure creation only.

### Related Components

**Existing Upload Packages:**
- `/Users/michaelmenard/Development/monorepo/packages/core/upload-client` - XHR upload client (6 files)
- `/Users/michaelmenard/Development/monorepo/packages/core/upload-types` - Type definitions (5 files)
- `/Users/michaelmenard/Development/monorepo/packages/tools/upload-config` - Configuration schemas

**Components to be Migrated (Future Stories):**
- main-app/components/Uploader/* - 7 sub-components to consolidate
- app-instructions-gallery/components/Uploader/* - duplicates
- app-instructions-gallery/components/ThumbnailUpload
- app-instructions-gallery/components/InstructionsUpload
- app-sets-gallery/components/ImageUploadZone
- app-wishlist-gallery hooks/useS3Upload

### Reuse Candidates

**Package Template:**
- `/Users/michaelmenard/Development/monorepo/packages/.template/package.json` - Reference for package structure

**Existing Packages for Reference:**
- `/Users/michaelmenard/Development/monorepo/packages/core/app-component-library` - Component package pattern
- `/Users/michaelmenard/Development/monorepo/packages/core/gallery` - Similar consolidation package
- `/Users/michaelmenard/Development/monorepo/packages/core/logger` - Core utility package pattern

---

## Knowledge Context

### Lessons Learned
No lessons loaded (kb_search not available). Context based on ADRs and codebase patterns.

### Blockers to Avoid (from past stories)
- Missing TypeScript/ESLint configuration
- Missing test infrastructure
- Incomplete barrel exports causing import issues
- Missing package.json exports field causing module resolution failures

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable to package structure |
| ADR-002 | Infrastructure-as-Code | Not applicable to package structure |
| ADR-003 | Image Storage/CDN | Relevant to future image processing migration (REPA-004) |
| ADR-004 | Authentication | Not applicable to package structure |
| ADR-005 | Testing Strategy | All packages must have Vitest configured |
| ADR-006 | E2E Tests in Dev | Not applicable to package structure |

### Patterns to Follow
- Use Zod schemas for all type definitions (from CLAUDE.md)
- Component directory structure with __tests__/, __types__/, utils/ subdirs
- Use pnpm workspace:* for internal dependencies
- Configure TypeScript with strict mode
- Set up Vitest for testing
- Use ESLint with --max-warnings 0

### Patterns to Avoid
- DO NOT create barrel files (index.ts re-exports)
- DO NOT use TypeScript interfaces without Zod schemas
- DO NOT use console.log (use @repo/logger)
- DO NOT skip type errors
- DO NOT hardcode values that should be configurable

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create @repo/upload Package Structure

### Description

**Context:**
The monorepo currently has upload functionality scattered across three separate packages (@repo/upload-client, @repo/upload-types, @repo/upload-config) and duplicated implementations in multiple apps. The REPA epic aims to consolidate ~10,800 lines of duplicate code, starting with creating a unified @repo/upload package that will house all upload-related code.

**Problem:**
- Upload functionality is fragmented across 3 existing packages
- 7 Uploader sub-components are exact duplicates between main-app and app-instructions-gallery
- Upload hooks (useUploadManager, useUploaderSession) have duplicate implementations
- Image processing logic is isolated in app-wishlist-gallery
- No unified location for upload components, hooks, and utilities

**Proposed Solution:**
Create a new @repo/upload package with a structured directory layout to serve as the consolidation target for all future upload migration stories (REPA-002 through REPA-006). The package will include:
- Proper package.json with dependencies and scripts
- TypeScript configuration with strict mode
- ESLint configuration
- Vitest test infrastructure
- Directory structure: client/, hooks/, image/, components/, types/
- Barrel export file for public API

This foundational package enables the subsequent migration stories to proceed in parallel (REPA-002, REPA-004, REPA-006 can all work once REPA-001 is complete).

### Initial Acceptance Criteria

- [ ] AC-1: Package created at `/packages/core/upload/` with proper monorepo structure
- [ ] AC-2: package.json configured with name "@repo/upload", version "0.0.1", private: true
- [ ] AC-3: package.json includes all necessary dependencies (zod, react, react-dom, etc.)
- [ ] AC-4: package.json includes peerDependencies for react and react-dom
- [ ] AC-5: package.json scripts configured: build, dev, check-types, lint, test, test:watch
- [ ] AC-6: package.json exports field configured for ES modules
- [ ] AC-7: TypeScript configured with tsconfig.json (strict mode, React 19 support)
- [ ] AC-8: ESLint configured with monorepo standards
- [ ] AC-9: Vitest configured with React Testing Library support
- [ ] AC-10: Directory structure created:
  - src/client/ (for XHR upload client code)
  - src/hooks/ (for upload hooks)
  - src/image/ (for image processing utilities)
  - src/components/ (for upload UI components)
  - src/types/ (for Zod schemas and type definitions)
- [ ] AC-11: Main barrel export file created at src/index.ts
- [ ] AC-12: README.md created with package description and usage guidelines
- [ ] AC-13: Package builds successfully with `pnpm build`
- [ ] AC-14: Type checking passes with `pnpm check-types`
- [ ] AC-15: Linting passes with `pnpm lint`
- [ ] AC-16: Test infrastructure verified with a basic smoke test
- [ ] AC-17: Package added to Turborepo pipeline configuration

### Non-Goals

- Migrating any actual code from existing packages (reserved for REPA-002, REPA-004, REPA-006)
- Migrating hooks from apps (reserved for REPA-003)
- Migrating components from apps (reserved for REPA-005)
- Creating any functional upload code beyond directory placeholders
- Deprecating existing @repo/upload-client or @repo/upload-types packages (happens in later stories)
- Setting up Storybook stories (can be added incrementally as components are migrated)

### Reuse Plan

**Existing Packages to Reference:**
- `packages/.template/package.json` - Use as baseline for package.json structure
- `packages/core/app-component-library/package.json` - Reference for React component package configuration
- `packages/core/gallery/package.json` - Reference for consolidated package patterns
- `packages/core/logger/package.json` - Reference for core utility package setup

**Configuration Files to Reuse:**
- Copy and adapt tsconfig.json from packages/core/app-component-library
- Copy and adapt vitest.config.ts from packages/core/app-component-library
- Use standard monorepo ESLint configuration

**Dependencies to Include:**
- zod (^3.24.2) - For Zod-first types
- react (^19.1.0) - For component support
- react-dom (^19.1.0) - For component support
- framer-motion (^12.23.3) - For animations in upload components
- class-variance-authority (^0.7.0) - For component variants
- clsx (^2.1.1) - For className utilities
- tailwind-merge (^2.5.4) - For Tailwind class merging

**DevDependencies:**
- typescript (5.8.3)
- vitest (^3.2.4)
- @testing-library/react (^16.3.0)
- @testing-library/jest-dom (^6.6.3)
- @vitejs/plugin-react (^4.3.4)
- jsdom (^25.0.1)
- eslint (^9.30.0)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on package infrastructure verification tests (build, lint, type-check)
- Ensure smoke test validates that all directory structure is in place
- Verify that package can be imported by other packages in the monorepo
- No functional upload tests needed yet (those come in REPA-002+)

### For UI/UX Advisor
- Not applicable for this story (pure infrastructure)
- Future stories (REPA-005) will need UX review for migrated upload components

### For Dev Feasibility
- Verify that package name "@repo/upload" doesn't conflict with existing packages
- Confirm directory structure aligns with future migration plans (check REPA-002-006)
- Validate that the package structure supports both client-side (hooks, components) and shared logic (types, client functions)
- Consider whether additional directories are needed (e.g., utils/, validators/)
- Verify Turborepo configuration supports the new package location

---

STORY-SEED COMPLETE
