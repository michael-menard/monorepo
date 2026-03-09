---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-014

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file exists. Only template at plans/baselines/TEMPLATE-BASELINE-REALITY.md. Proceeding with codebase scanning for context.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| useLocalStorage | apps/web/app-instructions-gallery/src/hooks/ | Duplicate | Identical implementation in app-wishlist-gallery |
| useLocalStorage | apps/web/app-wishlist-gallery/src/hooks/ | Duplicate | Identical implementation in app-instructions-gallery |
| useUnsavedChangesPrompt | apps/web/app-instructions-gallery/src/hooks/ | Duplicate | Identical implementation in main-app |
| useUnsavedChangesPrompt | apps/web/main-app/src/hooks/ | Duplicate | Identical implementation in app-instructions-gallery |
| useDelayedShow | apps/web/main-app/src/hooks/ | Unique | Single implementation, no duplicates found |
| useMultiSelect | apps/web/app-inspiration-gallery/src/hooks/ | Unique | Single implementation, no duplicates found |

### Active In-Progress Work

| Story ID | Feature | Potential Overlap |
|----------|---------|-------------------|
| REPA-001 | Create @repo/upload Package Structure | Completed - no conflict |
| REPA-002 | Migrate Upload Client Functions | Ready to Work - no conflict |
| REPA-003 | Migrate Upload Hooks | Ready to Work - upload-specific, no conflict |
| REPA-004 | Migrate Image Processing | Ready to Work - upload-specific, no conflict |

### Constraints to Respect

| Constraint | Source | Description |
|------------|--------|-------------|
| Zod-first types | CLAUDE.md | Always use Zod schemas for types, never TypeScript interfaces |
| Named exports | CLAUDE.md | Use named exports, not default exports |
| No barrel files | CLAUDE.md | Import directly from source files |
| Component directory structure | CLAUDE.md | Follow __tests__/, __types__/, utils/ structure |
| Package management | CLAUDE.md | Use pnpm commands, workspace:* for internal dependencies |
| Test coverage | CLAUDE.md | Minimum 45% global coverage |

---

## Retrieved Context

### Related Endpoints
None - this story is purely frontend/hook consolidation with no backend changes.

### Related Components

**useLocalStorage consumers (5 usages across 21 files):**
- apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx
- apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx
- apps/web/app-wishlist-gallery/src/hooks/useWishlistSortPersistence.ts
- apps/web/app-instructions-gallery/src/pages/CreateMocPage.tsx

**useUnsavedChangesPrompt consumers (2 usages):**
- apps/web/main-app/src/components/Uploader/SessionProvider/index.tsx
- apps/web/app-instructions-gallery/src/components/Uploader/SessionProvider/index.tsx

**useDelayedShow consumers (2 usages):**
- apps/web/main-app/src/components/PageTransitionSpinner/PageTransitionSpinner.tsx

**useMultiSelect consumers (3 usages):**
- apps/web/app-inspiration-gallery/src/pages/main-page.tsx
- apps/web/app-inspiration-gallery/src/hooks/index.ts

### Reuse Candidates

**Test files to migrate:**
- apps/web/app-wishlist-gallery/src/hooks/__tests__/useLocalStorage.test.ts (comprehensive, 239 lines)
- apps/web/main-app/src/hooks/__tests__/useDelayedShow.test.ts (comprehensive, 233 lines)
- apps/web/app-inspiration-gallery/src/hooks/__tests__/useMultiSelect.test.ts (comprehensive, 343 lines)

**Existing package structure patterns:**
- packages/core/accessibility/ - recently created accessibility hooks package
- packages/core/gallery/ - gallery-specific hooks package
- packages/core/upload/ - upload hooks package (REPA-001)

---

## Knowledge Context

### Lessons Learned
No lessons learned retrieved (knowledge base search not performed - not available in current context).

### Blockers to Avoid (from past stories)
- None identified from ADR review

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | N/A - no API changes in this story |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks (applies if UAT required) |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story during dev phase |

### Patterns to Follow
- **Zod-first types** (CLAUDE.md): All types must be inferred from Zod schemas
- **Named exports** (CLAUDE.md): No default exports
- **Direct imports** (CLAUDE.md): No barrel files (index.ts re-exports)
- **Component directory structure** (CLAUDE.md): __tests__/, __types__/ subdirectories
- **Workspace dependencies** (CLAUDE.md): Use workspace:* for internal package references
- **Package structure from REPA-001**: Follow established package structure (src/, __tests__/, exports in package.json)

### Patterns to Avoid
- **Don't create barrel files** (CLAUDE.md): No index.ts re-exports
- **Don't use TypeScript interfaces** (CLAUDE.md): Use Zod schemas instead
- **Don't use console.log** (CLAUDE.md): Use @repo/logger
- **Don't import shadcn components from individual paths** (CLAUDE.md): Use @repo/ui

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create @repo/hooks Package for Common React Hooks

### Description

**Context:**
The codebase currently has duplicate implementations of common React hooks scattered across multiple web apps. Specifically:
- `useLocalStorage` exists identically in app-instructions-gallery and app-wishlist-gallery
- `useUnsavedChangesPrompt` exists identically in app-instructions-gallery and main-app
- `useDelayedShow` exists only in main-app but is generally useful
- `useMultiSelect` exists only in app-inspiration-gallery but is generally useful

These duplicates create maintenance burden, increase bundle size, and lead to drift when fixes/enhancements are applied to only one copy. There are 101 total import references to these hooks across 21 files.

**Problem:**
We need a single source of truth for general-purpose React hooks that can be shared across all web applications. The hooks are not domain-specific (like gallery or upload hooks) but are generic utilities for localStorage persistence, navigation guards, delayed UI rendering, and multi-selection state management.

**Proposed Solution:**
Create a new `@repo/hooks` package in `packages/core/hooks/` following the established package structure pattern from REPA-001 (@repo/upload). Consolidate the four hooks into this package with their existing tests, then update all consumer apps to import from the centralized package. After verification, remove the duplicate implementations.

### Initial Acceptance Criteria

- [ ] AC-1: Create @repo/hooks package structure in packages/core/hooks/ with proper package.json, tsconfig.json, and build configuration
- [ ] AC-2: Migrate useLocalStorage hook to @repo/hooks/src/useLocalStorage.ts with existing implementation and full JSDoc
- [ ] AC-3: Migrate useLocalStorage tests to @repo/hooks/src/__tests__/useLocalStorage.test.ts (all 239 lines from app-wishlist-gallery version)
- [ ] AC-4: Migrate useUnsavedChangesPrompt hook to @repo/hooks/src/useUnsavedChangesPrompt.ts with existing implementation
- [ ] AC-5: Migrate useDelayedShow hook to @repo/hooks/src/useDelayedShow.ts with existing implementation
- [ ] AC-6: Migrate useDelayedShow tests to @repo/hooks/src/__tests__/useDelayedShow.test.ts (all 233 lines)
- [ ] AC-7: Migrate useMultiSelect hook to @repo/hooks/src/useMultiSelect.ts with existing implementation
- [ ] AC-8: Migrate useMultiSelect tests to @repo/hooks/src/__tests__/useMultiSelect.test.ts (all 343 lines)
- [ ] AC-9: Update all 21 consumer files to import hooks from @repo/hooks instead of local paths
- [ ] AC-10: Remove duplicate hook files from app-instructions-gallery, app-wishlist-gallery, main-app, and app-inspiration-gallery after successful migration
- [ ] AC-11: All migrated tests pass in the new package location
- [ ] AC-12: Package exports are properly configured in package.json with named exports for all four hooks
- [ ] AC-13: pnpm build succeeds for @repo/hooks and all consuming apps
- [ ] AC-14: Type checking (pnpm check-types) passes for all consuming apps with new imports

### Non-Goals
- Modifying hook functionality or API (migration only, preserve existing behavior)
- Adding new hooks beyond the four identified (useLocalStorage, useUnsavedChangesPrompt, useDelayedShow, useMultiSelect)
- Creating domain-specific hooks (those belong in @repo/gallery, @repo/upload, etc.)
- E2E or UAT testing (no user-facing changes, internal refactor only)
- Migrating hooks that are domain-specific or tightly coupled to a single app

### Reuse Plan

**Components:**
- REPA-001 package structure as template for @repo/hooks
- packages/core/accessibility/ as reference for core package patterns

**Patterns:**
- Package.json setup from @repo/upload (REPA-001)
- Named exports pattern from existing core packages
- Test migration pattern: preserve all test cases, only update imports

**Packages:**
- @repo/logger (already used by useLocalStorage and useUnsavedChangesPrompt)
- @tanstack/react-router (dependency for useUnsavedChangesPrompt)
- zod (used by useLocalStorage for optional schema validation)

**Existing Test Coverage:**
- useLocalStorage: 239 lines, comprehensive unit tests
- useDelayedShow: 233 lines, comprehensive unit tests including timer mocking
- useMultiSelect: 343 lines, comprehensive tests including shift-click range selection
- Total: 815 lines of existing tests to migrate

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- This is purely an internal refactor with no user-facing changes - UAT is not applicable
- Focus test plan on verifying all existing unit tests pass in new location
- Verify all 21 consumer files still work with new import paths
- Consider integration smoke test: build all apps that consume these hooks
- Test coverage should remain at 100% for migrated hooks (preserve all existing tests)

### For UI/UX Advisor
- No UI/UX changes - this is an internal code organization refactor
- No design review needed
- Skip UI/UX phase

### For Dev Feasibility
- Verify no circular dependencies introduced by creating @repo/hooks
- Check that @tanstack/react-router is an acceptable dependency for a core hooks package
- Consider if useUnsavedChangesPrompt should be in a separate router-specific package due to TanStack dependency
- Validate that all consuming apps already have necessary peer dependencies (React, zod, @repo/logger)
- Assess impact of removing hooks from apps - ensure no other internal imports reference the to-be-deleted files
- Consider deprecation strategy: create @repo/hooks first, update consumers, then remove duplicates (3-step approach vs 2-step)

---

STORY-SEED COMPLETE
