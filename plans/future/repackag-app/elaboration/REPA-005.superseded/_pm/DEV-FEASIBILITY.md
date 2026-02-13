# Dev Feasibility: REPA-005 - Migrate Upload Components

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: Medium

**Why**:
- Component migration is technically straightforward (move files, update imports)
- All components already exist and are well-tested
- SessionProvider dependency on REPA-003 is the primary risk
- Large scope (9 components + 2 apps) increases risk of mid-implementation split
- Auth injection pattern for SessionProvider requires careful implementation
- Component duplication verification is critical (assumes exact duplicates, but divergence may exist)

---

## Likely Change Surface (Core Only)

### Packages for Core Journey

**Primary package**:
- `packages/core/upload/src/components/` - All 9 components migrated here
- `packages/core/upload/src/components/index.ts` - Component exports (NOT a barrel file per CLAUDE.md, must be explicit exports)

**Consuming packages** (import updates only):
- `apps/web/main-app/` - Replace `@/components/Uploader/*` imports
- `apps/web/app-instructions-gallery/` - Replace `@/components/Uploader/*` and domain-specific component imports

### Endpoints for Core Journey

**None** - This story does not touch backend APIs. Components use existing hooks (REPA-003) and client functions (REPA-002).

### Critical Deploy Touchpoints

**Frontend deployments**:
- main-app deploy (Vercel/Amplify) - Import path changes
- app-instructions-gallery deploy (Vercel/Amplify) - Import path changes

**No backend deploy required** - No API changes

**Package publish**:
- @repo/upload package version bump (components added)
- No deprecated packages in this story (upload-client and upload-types deprecated in REPA-002 and REPA-006)

---

## MVP-Critical Risks (Max 5)

### Risk 1: REPA-003 Dependency Not Complete
**Why it blocks MVP**: SessionProvider component (AC-7) depends on useUploaderSession hook from REPA-003. If REPA-003 is not completed, SessionProvider cannot be migrated without breaking apps.

**Required mitigation**:
- Verify REPA-003 status BEFORE starting REPA-005
- If REPA-003 is delayed, split SessionProvider migration to separate follow-up story (REPA-005b)
- Alternative: Mock useUploaderSession in @repo/upload temporarily, then replace when REPA-003 completes (NOT RECOMMENDED, violates no-mocks rule)

**Confidence**: High impact if not addressed

### Risk 2: Component Divergence Not Documented
**Why it blocks MVP**: Seed assumes ConflictModal, RateLimitBanner, and other Uploader sub-components are EXACT duplicates across main-app and app-instructions-gallery. If implementations have diverged (app-specific logic, bug fixes applied to only one app), consolidation will lose functionality.

**Required mitigation**:
- Run file diffs on all 7 Uploader sub-components BEFORE migration:
  ```bash
  diff apps/web/main-app/src/components/Uploader/ConflictModal/index.tsx \
       apps/web/app-instructions-gallery/src/components/Uploader/ConflictModal/index.tsx
  ```
- Document ANY differences in _implementation/DIVERGENCE-NOTES.md
- If significant divergence found (>10% LOC difference), add reconciliation ACs to story
- Choose "more complete" implementation as migration source (prefer version with more tests, better error handling, or more features)

**Confidence**: Medium-high impact, easy to mitigate with due diligence

### Risk 3: Auth Injection Pattern Fragility
**Why it blocks MVP**: SessionProvider has divergent implementations (Redux in main-app, no Redux in app-instructions-gallery). Dependency injection pattern must work for BOTH apps without breaking existing auth flows.

**Required mitigation**:
- Design SessionProvider API to accept optional auth props:
  ```tsx
  type SessionProviderProps = {
    isAuthenticated?: boolean
    userId?: string
    children: React.ReactNode
  }
  ```
- Unit test BOTH auth modes:
  - With auth props (main-app Redux scenario)
  - Without auth props (app-instructions-gallery anonymous scenario)
- Integration test in main-app verifying Redux state flows correctly to SessionProvider
- Integration test in app-instructions-gallery verifying anonymous mode works

**Confidence**: Medium impact, requires careful testing

### Risk 4: Test Migration Breaking CI
**Why it blocks MVP**: Migrating tests from apps to @repo/upload package requires moving MSW handlers and test setup. If package test setup is incomplete, tests will pass locally but fail in CI (different env, missing mocks).

**Required mitigation**:
- Create `packages/core/upload/src/test/setup.ts` with all necessary MSW handlers BEFORE migrating tests
- Run package tests in isolation: `pnpm test --filter=@repo/upload` before app migration
- Ensure no imports from `apps/web/*` in package test files (violates package boundary)
- If MSW handlers depend on app-specific API base URLs, use dependency injection (pass base URL as test prop)

**Confidence**: Medium impact, standard package test setup pattern

### Risk 5: Import Path Churn Across Apps
**Why it blocks MVP**: Updating imports in main-app and app-instructions-gallery affects many files (estimated 20-30 files per app). If imports are updated incorrectly or incompletely, apps will not build or runtime errors will occur.

**Required mitigation**:
- Use find-and-replace carefully (not manual updates):
  ```bash
  # Example for ConflictModal
  find apps/web/main-app/src -type f -name "*.tsx" -o -name "*.ts" \
    | xargs sed -i '' 's|@/components/Uploader/ConflictModal|@repo/upload/components/ConflictModal|g'
  ```
- Run TypeScript compilation after each batch of import updates: `pnpm check-types --filter=main-app`
- Run app tests after import updates: `pnpm test --filter=main-app`
- Use IDE "Find All References" to verify all import sites updated

**Confidence**: Medium impact, mitigated with systematic approach

---

## Missing Requirements for MVP

### 1. Component Duplication Verification Report
**Requirement**: Before migration starts, verify that all 7 Uploader sub-components are truly duplicates (or document differences).

**PM must include**: Add to story under "Implementation Prerequisites":
```markdown
## Implementation Prerequisites

Before starting migration:
1. Run file diffs on all 7 Uploader sub-components
2. Document findings in _implementation/DIVERGENCE-NOTES.md
3. If divergence >10% LOC, add reconciliation ACs
4. Choose canonical implementation source (prefer more complete version)
```

### 2. SessionProvider API Design Decision
**Requirement**: Explicit decision on SessionProvider prop API for auth injection.

**PM must include**: Add to story under "SessionProvider Migration (AC-7)":
```markdown
### SessionProvider API Design

Accepts optional auth props for dependency injection:
- `isAuthenticated?: boolean` - User auth state (Redux in main-app, undefined in app-instructions-gallery)
- `userId?: string` - User ID for session association (Redux in main-app, undefined in app-instructions-gallery)

Apps must pass props explicitly:
- main-app: `<SessionProvider isAuthenticated={user.isAuthenticated} userId={user.id}>`
- app-instructions-gallery: `<SessionProvider>` (no props, anonymous mode)

Zod schema validation required for props.
```

### 3. Test Coverage Target for Package
**Requirement**: Explicit coverage target for @repo/upload package after component migration.

**PM must include**: Add to AC-14:
```markdown
- [ ] **AC-14:** All migrated components have tests with 80%+ coverage
  - Package-level coverage target: 80% (exceeds global 45% minimum)
  - Run `pnpm test --filter=@repo/upload --coverage` to verify
  - No component below 75% coverage
```

### 4. REPA-003 Completion Gate
**Requirement**: Explicit gate preventing SessionProvider migration until REPA-003 complete.

**PM must include**: Add to story under "Dependencies":
```markdown
## Dependencies

**BLOCKING**: REPA-003 (useUploaderSession hook) MUST be completed before AC-7 (SessionProvider migration).

**Verification**:
- Check `plans/future/repackag-app/stories.index.md` for REPA-003 status
- Status must be "completed" or "ready-for-qa" (merged to main)
- If REPA-003 is delayed, SPLIT story:
  - REPA-005a: AC-1 to AC-6 + AC-8 to AC-16 (all except SessionProvider)
  - REPA-005b: AC-7 only (SessionProvider after REPA-003 completes)
```

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

**1. Package builds and tests in isolation**:
```bash
pnpm build --filter=@repo/upload
pnpm test --filter=@repo/upload --coverage
pnpm check-types --filter=@repo/upload
```
- All commands exit 0 (success)
- No imports from `apps/web/*` in package code
- Coverage report shows 80%+ for all components

**2. Apps build and test after migration**:
```bash
pnpm build --filter=main-app
pnpm test --filter=main-app
pnpm build --filter=app-instructions-gallery
pnpm test --filter=app-instructions-gallery
```
- All commands exit 0 (success)
- No import errors
- All existing upload tests pass

**3. E2E upload flows pass**:
```bash
pnpm playwright test --grep="upload"
```
- Instruction upload flow passes (main-app and app-instructions-gallery)
- Thumbnail upload flow passes (app-instructions-gallery)
- Rate limit error handling passes
- Conflict error handling passes
- Video recordings show no visual regressions

### Critical CI/Deploy Checkpoints

**Pre-merge gates**:
1. ✅ All Vitest tests pass (`pnpm test:all`)
2. ✅ All TypeScript checks pass (`pnpm check-types:all`)
3. ✅ All ESLint checks pass (`pnpm lint:all`)
4. ✅ All Playwright E2E tests pass
5. ✅ No new console errors in apps after import updates

**Post-merge verification** (production deploy):
1. ✅ Vercel/Amplify build succeeds for main-app
2. ✅ Vercel/Amplify build succeeds for app-instructions-gallery
3. ✅ Smoke test: Upload instruction in production (manual or automated)
4. ✅ Smoke test: Upload thumbnail in production (manual or automated)
5. ✅ No Sentry errors for upload components in first 24 hours

---

## Component Migration Order (Recommended)

To minimize risk and enable incremental progress:

### Phase 1: Simple Uploader Sub-Components (Low Risk)
1. UnsavedChangesDialog (has tests, no complex logic)
2. SessionExpiredBanner (similar to RateLimitBanner)
3. UploaderList (container component, minimal logic)

### Phase 2: Medium Complexity Uploader Sub-Components
4. RateLimitBanner (countdown timer, existing tests to migrate)
5. ConflictModal (focus management, existing tests to migrate)
6. UploaderFileItem (progress tracking, status management)

### Phase 3: SessionProvider (HIGH RISK - depends on REPA-003)
7. SessionProvider (auth injection, wait for REPA-003 completion)

### Phase 4: Domain-Specific Components
8. ThumbnailUpload (drag-and-drop, validation, existing tests)
9. InstructionsUpload (multi-file, sequential upload, existing tests)

**Rationale**:
- Start with low-risk components to establish migration pattern
- Build confidence before tackling high-risk SessionProvider
- Domain-specific components last (app-instructions-gallery only, lower blast radius)

---

## Reuse Verification

### Packages Already Available (No New Dependencies)

- ✅ @repo/app-component-library (Dialog, Alert, Button, Progress, Card, Badge, Input, Label)
- ✅ @repo/upload/types (UploaderFileItem, UploadStatus) - REPA-002 completed
- ✅ @repo/upload/hooks (useUploadManager, useUploaderSession) - REPA-003 dependency
- ✅ @repo/hooks (useUnsavedChangesPrompt) - REPA-014 completed
- ✅ lucide-react (icons)

### No New Package Dependencies Required

All upload components use existing packages. No new pnpm installs needed.

**Verification**:
```bash
# After migration, check package.json for @repo/upload
cat packages/core/upload/package.json | grep dependencies
# Should NOT include any new external dependencies beyond existing
```

---

## Architecture Boundary Verification

### Package Boundary Rules (MUST ENFORCE)

**@repo/upload package CANNOT import from**:
- ❌ `apps/web/main-app/*` (violates package boundary)
- ❌ `apps/web/app-instructions-gallery/*` (violates package boundary)
- ❌ `@reduxjs/toolkit` or `react-redux` (use dependency injection instead)
- ❌ App-specific API clients (use @repo/api-client only)

**@repo/upload package CAN import from**:
- ✅ `@repo/app-component-library` (UI primitives)
- ✅ `@repo/upload/types` (own package types)
- ✅ `@repo/upload/hooks` (own package hooks, after REPA-003)
- ✅ `@repo/hooks` (shared hooks like useUnsavedChangesPrompt)
- ✅ `lucide-react` (icons)
- ✅ `react`, `react-dom` (framework)
- ✅ `zod` (schema validation)

**Verification**:
```bash
# Check for illegal imports in package
grep -r "from.*apps/web" packages/core/upload/src/components/
grep -r "from.*react-redux" packages/core/upload/src/components/
# Both should return NO results
```

---

## Split Recommendation

Given large scope (9 components, 2 apps, ~1945 LOC), story may exceed 8 SP estimate. Consider split if:

- REPA-003 completion is delayed → Split SessionProvider to REPA-005b
- Mid-implementation progress is slow → Split domain-specific components (ThumbnailUpload, InstructionsUpload) to REPA-005c
- Significant component divergence discovered → Add reconciliation story REPA-005d

**Proposed split structure**:
- **REPA-005a** (Core Uploader Sub-Components): AC-1 to AC-6, AC-11 to AC-16 (6 components + 2 app migrations)
- **REPA-005b** (SessionProvider): AC-7 only (after REPA-003 completes)
- **REPA-005c** (Domain-Specific Components): AC-8 to AC-10 (ThumbnailUpload, InstructionsUpload)

**Do NOT split preemptively** - attempt full story first, split only if blocked or mid-implementation challenges arise.

---

## Non-MVP Concerns (Out of Scope)

The following are important but NOT required for core migration MVP:

- Storybook documentation for upload components → Future work
- Component API improvements or refactoring → Keep APIs backward-compatible for now
- New upload features (pause/resume, resumable uploads) → Future stories
- Performance optimizations (lazy loading, code splitting) → Profile first, optimize later
- Upload analytics or telemetry → Future instrumentation work
- Component-level schema consolidation (FileValidationResult duplication) → Deferred to REPA-017

These can be tracked in `_pm/FUTURE-RISKS.md` (see below).
