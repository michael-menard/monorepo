---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-006

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists at the expected path. Context gathered from codebase scanning, git status, and related stories.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| @repo/upload-types package | packages/core/upload-types/ | Active | Contains 817 LOC across 5 modules (session, upload, slug, edit, index) + 559 LOC tests |
| @repo/upload package | packages/core/upload/ | Created (REPA-001) | Created with placeholder types/index.ts awaiting migration from @repo/upload-types |
| Deprecated wrapper files | apps/web/main-app/src/types/uploader-*.ts | Active (deprecated) | 2 wrapper files re-exporting from @repo/upload-types with deprecation warnings |

### Active In-Progress Work

| Story | Status | Scope | Potential Overlap |
|-------|--------|-------|------------------|
| REPA-002 | In Progress | Migrate Upload Client Functions | May use types from @repo/upload-types, will need to update imports when REPA-006 completes |
| REPA-004 | In Progress | Migrate Image Processing | May use types from @repo/upload-types, will need to update imports when REPA-006 completes |
| REPA-012 | In Progress | Create @repo/auth-hooks Package | No overlap with upload types |
| REPA-013 | In Progress | Create @repo/auth-utils Package | No overlap with upload types |
| REPA-018 | In Progress | Create @repo/auth-services Package | No overlap with upload types |

**Coordination Note:** REPA-002 and REPA-004 are in progress and may be importing from @repo/upload-types. This story should coordinate with those efforts to ensure import paths are updated.

### Constraints to Respect

- **Monorepo structure**: All packages follow the established workspace:* dependency pattern
- **TypeScript strict mode**: All code must pass strict type checking
- **Zod-first types**: All types must be defined via Zod schemas with z.infer<> type extraction
- **No breaking changes**: Migration must maintain backward compatibility during deprecation period
- **Test coverage**: Minimum 45% coverage required, existing test suite has 559 LOC across 3 test files

---

## Retrieved Context

### Related Packages

| Package | Path | Dependencies | Purpose |
|---------|------|--------------|---------|
| @repo/upload-types | packages/core/upload-types/ | zod ^3.23.8 | Current location of all upload type definitions (817 LOC) |
| @repo/upload | packages/core/upload/ | zod 4.1.13, @repo/logger, react, etc. | Target package with prepared types/ directory (placeholder file exists) |

### Current Package Structure

**@repo/upload-types (source):**
```
packages/core/upload-types/src/
  index.ts              # 72 LOC - Barrel exports
  session.ts            # 170 LOC - Session types and utilities
  upload.ts             # 279 LOC - Upload file items and batch state
  slug.ts               # 111 LOC - Slug generation utilities
  edit.ts               # 185 LOC - MOC edit form types
  __tests__/
    session.test.ts     # 177 LOC
    upload.test.ts      # 249 LOC
    slug.test.ts        # 133 LOC
```

**@repo/upload (destination):**
```
packages/core/upload/src/
  types/
    index.ts            # 2 LOC - Placeholder comment awaiting migration
```

### Import Usage Analysis

**Direct imports from @repo/upload-types:**
- 17 files across the monorepo import from @repo/upload-types
- 23 total import occurrences detected
- Main consumers: main-app (8 files), app-instructions-gallery (9 files)

**Deprecated wrapper files:**
- apps/web/main-app/src/types/uploader-upload.ts (28 LOC wrapper)
- apps/web/main-app/src/types/uploader-session.ts (25 LOC wrapper)
- Both marked as @deprecated with migration instructions pointing to @repo/upload-types

### Related Components and Hooks

**Hooks using types:**
- apps/web/main-app/src/hooks/useUploadManager.ts
- apps/web/main-app/src/hooks/useUploaderSession.ts
- apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts
- apps/web/app-instructions-gallery/src/hooks/useUploaderSession.ts

**Components using types:**
- apps/web/main-app/src/components/Uploader/UploaderFileItem/index.tsx
- apps/web/main-app/src/components/Uploader/UploaderList/index.tsx
- apps/web/main-app/src/components/MocEdit/EditForm.tsx
- apps/web/main-app/src/components/MocEdit/SlugField.tsx
- (and corresponding files in app-instructions-gallery)

**Pages using types:**
- apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx
- apps/web/app-instructions-gallery/src/pages/upload-page.tsx

### Reuse Candidates

**Migration patterns from similar stories:**
- REPA-001 established the @repo/upload package structure with types/ subdirectory
- REPA-016 (completed 2026-02-11) consolidated MOC schemas into @repo/api-client with restructured subdirectories
- REPA-014 (completed 2026-02-10) created @repo/hooks for general-purpose hooks
- REPA-015 (completed 2026-02-10) extracted generic utilities to @repo/accessibility

**Established patterns:**
- Use subdirectories within types/ for logical grouping (form.ts, api.ts, utils.ts pattern from REPA-016)
- Maintain comprehensive test coverage during migration
- Use barrel exports at types/index.ts level
- Update package.json exports field to expose types subpath

---

## Knowledge Context

### Lessons Learned

No lesson-learned KB was queried (not available in current setup), but analysis of completed stories reveals:

**From REPA-001 (Create @repo/upload Package Structure):**
- Lesson: Create package structure with proper exports field configuration first
- Applies because: REPA-006 will populate the types/ directory created by REPA-001

**From REPA-016 (Consolidate MOC Schemas):**
- Lesson: Restructure schemas into logical subdirectories (form.ts, api.ts, utils.ts)
- Applies because: upload.ts (279 LOC) and edit.ts (185 LOC) could benefit from similar subdivision

**From REPA-014 and REPA-015 (Extract Generic Utilities):**
- Lesson: Migrate tests alongside code to maintain coverage
- Applies because: REPA-006 must migrate 559 LOC of tests from @repo/upload-types

### Blockers to Avoid (from past stories)

- **Import path mismatches**: Ensure all 17 consuming files update imports from `@repo/upload-types` to `@repo/upload/types`
- **Missing test coverage**: Migrate all tests (session.test.ts, upload.test.ts, slug.test.ts) to maintain 45%+ coverage
- **Breaking changes during deprecation**: Deprecated wrapper files must remain functional until all consumers migrate

### Architecture Decisions (ADRs)

| ADR | Title | Constraint | Applies to REPA-006 |
|-----|-------|------------|---------------------|
| ADR-001 | API Path Schema | Frontend: /api/v2/{domain}, Backend: /{domain} | No (types only, no API changes) |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks | Yes (test migration must maintain real service patterns) |

### Patterns to Follow

1. **Zod-first types (CLAUDE.md):** All types defined via Zod schemas with z.infer<> inference
2. **Workspace dependencies (CLAUDE.md):** Use workspace:* for internal dependencies
3. **Barrel exports (established pattern):** Re-export all types through types/index.ts
4. **Package exports field (REPA-001 pattern):** Configure exports field with types subpath
5. **Test migration (REPA-014/015 pattern):** Move tests to package __tests__ directory

### Patterns to Avoid

1. **Manual type definitions:** Never use TypeScript interfaces or types without Zod schemas (CLAUDE.md violation)
2. **Deep imports:** Don't allow imports like `@repo/upload/types/session` - force barrel import `@repo/upload/types`
3. **Incomplete migration:** Don't leave old package partially functional (creates confusion)
4. **Missing deprecation period:** Don't delete @repo/upload-types immediately (needs coordination with REPA-002/004)

---

## Conflict Analysis

No blocking conflicts detected.

### Non-Blocking Coordination Requirements

**Coordination with REPA-002 (In Progress - Upload Client Functions):**
- **Severity**: warning
- **Description**: REPA-002 is migrating upload client functions that import from @repo/upload-types. If REPA-006 completes first, REPA-002 will need to update imports from `@repo/upload-types` to `@repo/upload/types`.
- **Resolution Hint**: Either (a) complete REPA-006 first and update REPA-002 imports as part of that work, or (b) complete REPA-002 first and have REPA-006 update those imports during migration.

**Coordination with REPA-004 (In Progress - Image Processing):**
- **Severity**: warning
- **Description**: REPA-004 is migrating image processing utilities that may import from @repo/upload-types. Similar coordination needed as REPA-002.
- **Resolution Hint**: Same as REPA-002 - coordinate import path updates based on completion order.

**Deprecation Period for @repo/upload-types:**
- **Severity**: warning
- **Description**: Story index notes "Deprecated packages need deprecation period". Cannot immediately delete @repo/upload-types after migration - must allow time for all consumers to migrate.
- **Resolution Hint**: Add deprecation warnings to package.json, update README with migration instructions, keep package functional for 1-2 sprint cycles before removal.

---

## Story Seed

### Title
Migrate Upload Types to @repo/upload/types

### Description

**Context:**
The monorepo currently maintains upload type definitions in a standalone `@repo/upload-types` package (817 lines of code, 559 lines of tests) separate from the new consolidated `@repo/upload` package. This separation creates confusion and violates the single-source-of-truth principle for upload-related code.

The `@repo/upload` package was created in REPA-001 with a prepared `types/` directory containing only a placeholder file. Meanwhile, 17 files across 2 apps (main-app and app-instructions-gallery) continue importing from `@repo/upload-types`, and 2 deprecated wrapper files in main-app re-export these types with deprecation warnings.

**Problem:**
1. Upload types are maintained separately from other upload functionality (client, hooks, image processing, components)
2. Consumers must import from `@repo/upload-types` instead of the unified `@repo/upload` package
3. Deprecated wrapper files exist in apps but still point to the old package location
4. New code may incorrectly import from the deprecated package instead of the new consolidated location
5. Package fragmentation makes it harder to understand and maintain upload-related code

**Solution:**
Migrate all type definitions from `@repo/upload-types` to `@repo/upload/types`, update all 17 consuming files to use the new import path, delete deprecated wrapper files, and deprecate the old package with a grace period. This completes the type consolidation for the upload domain and enables future stories (REPA-003, REPA-005) to work with a fully consolidated package.

### Initial Acceptance Criteria

**Migration:**
- [ ] AC-1: Move session.ts (170 LOC) from @repo/upload-types to @repo/upload/types/session.ts
- [ ] AC-2: Move upload.ts (279 LOC) from @repo/upload-types to @repo/upload/types/upload.ts
- [ ] AC-3: Move slug.ts (111 LOC) from @repo/upload-types to @repo/upload/types/slug.ts
- [ ] AC-4: Move edit.ts (185 LOC) from @repo/upload-types to @repo/upload/types/edit.ts
- [ ] AC-5: Create barrel export at @repo/upload/types/index.ts re-exporting all types from subdirectories

**Test Migration:**
- [ ] AC-6: Move session.test.ts (177 LOC) to @repo/upload/types/__tests__/session.test.ts
- [ ] AC-7: Move upload.test.ts (249 LOC) to @repo/upload/types/__tests__/upload.test.ts
- [ ] AC-8: Move slug.test.ts (133 LOC) to @repo/upload/types/__tests__/slug.test.ts
- [ ] AC-9: All migrated tests pass with `pnpm --filter @repo/upload test`
- [ ] AC-10: Test coverage for @repo/upload/types meets or exceeds 45% minimum

**Import Updates (17 files):**
- [ ] AC-11: Update 8 files in apps/web/main-app to import from @repo/upload/types
- [ ] AC-12: Update 9 files in apps/web/app-instructions-gallery to import from @repo/upload/types
- [ ] AC-13: Delete apps/web/main-app/src/types/uploader-upload.ts (deprecated wrapper)
- [ ] AC-14: Delete apps/web/main-app/src/types/uploader-session.ts (deprecated wrapper)
- [ ] AC-15: Delete apps/web/main-app/src/types/__tests__/uploader-upload.test.ts (wrapper test)

**Package Configuration:**
- [ ] AC-16: Update @repo/upload package.json to include types exports with proper entry point
- [ ] AC-17: Update @repo/upload tsconfig.json if needed for types/ subdirectory
- [ ] AC-18: Verify @repo/upload builds successfully with `pnpm --filter @repo/upload build`

**Deprecation:**
- [ ] AC-19: Add deprecation notice to @repo/upload-types package.json
- [ ] AC-20: Update @repo/upload-types README.md with migration instructions pointing to @repo/upload/types
- [ ] AC-21: Add console.warn() deprecation message to @repo/upload-types/src/index.ts
- [ ] AC-22: Document deprecation timeline (suggest 2 sprint cycles before removal)

**Verification:**
- [ ] AC-23: All apps build successfully with `pnpm build` (no import errors)
- [ ] AC-24: All apps pass type checking with `pnpm check-types:all`
- [ ] AC-25: All apps pass linting with `pnpm lint:all`
- [ ] AC-26: All tests pass with `pnpm test:all`
- [ ] AC-27: No remaining references to @repo/upload-types in app source code (only in deprecated package itself)

### Non-Goals

**Explicitly Out of Scope:**
- **Immediate deletion of @repo/upload-types:** Package should be deprecated but remain functional for 1-2 sprint cycles to allow gradual migration
- **Restructuring type schemas:** Maintain current file structure (session.ts, upload.ts, slug.ts, edit.ts) - don't split into subdirectories like form/api/utils (that could be a future refactor)
- **Adding new types or utilities:** This is a pure migration story, no new functionality
- **Migrating upload client code:** That's handled by REPA-002 (in progress)
- **Migrating upload hooks:** That's handled by REPA-003 (blocked on REPA-002)
- **Migrating upload components:** That's handled by REPA-005 (blocked on REPA-003)
- **Backend API changes:** Upload types are shared by frontend and backend but no API contract changes

### Reuse Plan

**Components:**
- @repo/upload package structure (created by REPA-001)
- @repo/upload/types/index.ts placeholder (created by REPA-001)

**Patterns:**
- Zod schema definitions from existing @repo/upload-types modules
- Barrel export pattern from @repo/upload/types/index.ts
- Test migration pattern from REPA-014 (Create @repo/hooks Package)
- Package deprecation pattern from REPA-016 (Consolidate MOC Schemas)
- Exports field configuration from REPA-001 (Create @repo/upload Package Structure)

**Packages:**
- zod (already dependency of both @repo/upload-types and @repo/upload)
- vitest (already configured in @repo/upload via REPA-001)
- @repo/logger (if needed for deprecation warnings)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context:**
- 559 lines of existing tests across 3 test files (session.test.ts, upload.test.ts, slug.test.ts)
- All tests are comprehensive unit tests of Zod schemas and utility functions
- Tests use vitest framework with describe/it/expect pattern
- No React component testing needed (pure utility/schema tests)

**Specific Constraints:**
- Tests must maintain coverage at or above 45% minimum
- Test files should move to @repo/upload/types/__tests__/ directory
- Update test imports to use new package path (@repo/upload/types)
- Ensure tests run successfully in new location with `pnpm --filter @repo/upload test`
- Consider adding integration test for deprecation warning in old package

**Test Phases:**
1. Unit tests for migrated types (already exist, just need relocation)
2. Build verification across all apps
3. Import path verification (grep for old paths)
4. Deprecation warning verification in old package

### For UI/UX Advisor

**Not applicable** - This is a pure backend/types migration story with no user-facing UI changes.

### For Dev Feasibility

**Context:**
- 817 LOC of type definitions to migrate across 4 files
- 559 LOC of tests to migrate across 3 files
- 17 consuming files need import path updates
- 2 deprecated wrapper files need deletion (apps/web/main-app/src/types/)
- Package already exists with prepared directory structure (from REPA-001)

**Specific Constraints:**
- REPA-002 and REPA-004 are currently in progress and may be importing from @repo/upload-types
- Coordinate import path updates with those in-progress stories
- Deprecated package must remain functional with warnings for 1-2 sprint cycles
- All Zod schemas use zod ^3.23.8 in old package but zod 4.1.13 in new package - verify compatibility
- TypeScript strict mode enabled in both packages
- Exports field must be configured for @repo/upload/types subpath

**Risk Areas:**
1. **Zod version mismatch:** Old package uses zod ^3.23.8, new package uses zod 4.1.13 - may need schema updates
2. **Import coordination:** 17 files across 2 apps need synchronized updates to avoid build breaks
3. **In-progress story coordination:** REPA-002 and REPA-004 may have uncommitted changes importing from old package
4. **Deprecation timing:** Need clear communication about when old package will be removed

**Technical Notes:**
- @repo/upload/types export path already configured in REPA-001's package.json exports field
- Vitest configuration already exists in @repo/upload (from REPA-001)
- No circular dependency risks - types are leaf dependencies (nothing imports from them except consumers)
- Barrel export pattern is standard across monorepo - straightforward implementation

---

STORY-SEED COMPLETE WITH WARNINGS: 2 warnings (coordination with REPA-002/004, deprecation period timing)
