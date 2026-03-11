# Future Risks: REPA-001

## Non-MVP Risks

### FR1: Storybook Integration
- **Risk**: Package created without Storybook configuration
- **Impact (if not addressed post-MVP)**: Component documentation and visual testing will need to be added in separate story
- **Recommended timeline**: After REPA-005 (when components are migrated)

### FR2: Package README Documentation
- **Risk**: Minimal README may not provide enough guidance for future contributors
- **Impact (if not addressed post-MVP)**: Developers may not understand package structure or migration plan
- **Recommended timeline**: Can be enhanced incrementally as each migration story (REPA-002-006) completes

### FR3: Monorepo Root Package.json Scripts
- **Risk**: No global scripts added to run @repo/upload tasks from monorepo root
- **Impact (if not addressed post-MVP)**: Developers need to use `--filter` flag for all operations
- **Recommended timeline**: Low priority, existing `--filter` pattern is acceptable

### FR4: CI Pipeline Optimization
- **Risk**: Package may be included in CI runs even when unchanged
- **Impact (if not addressed post-MVP)**: Slightly longer CI times, but Turborepo caching mitigates this
- **Recommended timeline**: Can be optimized if CI performance becomes an issue

### FR5: Version Management
- **Risk**: Package starts at 0.0.1 with no versioning strategy defined
- **Impact (if not addressed post-MVP)**: May need versioning plan when package reaches stability
- **Recommended timeline**: Before first production use (likely after REPA-006)

## Scope Tightening Suggestions

### ST1: Simplify Directory Structure
**Current scope**: 5 subdirectories (client/, hooks/, image/, components/, types/)

**Suggestion**: Could start with just `src/` and add subdirectories as migration stories progress.

**Trade-off**: Creating structure now provides clearer migration targets for REPA-002-006, avoiding restructuring later.

**Recommendation**: Keep current scope - structure is low-risk and aids planning.

### ST2: Defer Smoke Test
**Current scope**: Create basic smoke test to verify Vitest setup

**Suggestion**: Could defer testing until first real code is migrated (REPA-002)

**Trade-off**: Without smoke test, Vitest configuration issues may not be discovered until migration stories.

**Recommendation**: Keep smoke test - validates infrastructure early.

### ST3: Minimal Dependencies
**Current scope**: Include all dependencies needed for future migrations

**Suggestion**: Start with minimal dependencies, add as needed in each migration story

**Trade-off**:
- Minimal approach requires updating package.json in every migration story
- Full approach front-loads dependency installation but prevents per-story changes

**Recommendation**: Keep full dependency list - reduces churn in future stories and enables parallel migration work.

## Future Requirements

### Nice-to-Have Requirements

1. **Changeset Integration**: Add changesets for version tracking
   - Not needed until package is consumed outside monorepo
   - Can be added when package reaches v1.0.0

2. **Bundle Size Analysis**: Add bundle analyzer to track package size
   - Useful for performance monitoring
   - Can be added after components are migrated (REPA-005)

3. **GitHub Actions Workflow**: Create package-specific CI workflow
   - Current monorepo CI covers this package
   - Only needed if package is published externally

4. **ESM/CJS Dual Exports**: Configure for both module formats
   - Monorepo uses ESM exclusively
   - Only needed if published to npm

### Polish and Edge Case Handling

1. **TypeScript Strict Checks**: Consider enabling additional strict flags
   - Current `strict: true` is sufficient for MVP
   - Can enable `noUncheckedIndexedAccess` or `exactOptionalPropertyTypes` later

2. **ESLint Custom Rules**: Add package-specific linting rules
   - Standard monorepo rules are sufficient
   - Can add rules like `no-restricted-imports` to prevent circular dependencies

3. **Git Hooks**: Add package-level pre-commit hooks
   - Monorepo already has global hooks
   - Package-level hooks may be redundant

4. **Dependency Audit**: Regular security audits for dependencies
   - Covered by monorepo-wide `pnpm audit`
   - Package-specific audits not needed

## Out of Scope (For Later Stories)

The following are explicitly OUT OF SCOPE for REPA-001 and belong in subsequent stories:

1. **Code Migration** (REPA-002, REPA-004, REPA-006):
   - Moving actual functions from @repo/upload-client
   - Moving types from @repo/upload-types
   - Moving image processing from wishlist

2. **Hook Migration** (REPA-003):
   - Moving useUploadManager and useUploaderSession from apps
   - Deduplication of hook implementations

3. **Component Migration** (REPA-005):
   - Moving ThumbnailUpload, InstructionsUpload components
   - Consolidating Uploader sub-components

4. **Package Deprecation**:
   - Marking @repo/upload-client as deprecated
   - Marking @repo/upload-types as deprecated
   - These happen AFTER migration stories complete

5. **App Refactoring**:
   - Updating apps to import from new @repo/upload package
   - Removing old implementations from app directories
   - Testing integration with apps
