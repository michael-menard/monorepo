# Dev Feasibility: REPA-004 - Migrate Image Processing

## Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Code extraction with no behavior changes, well-defined scope, existing test coverage to validate migration, clear reuse candidates

## Likely Change Surface (Core Only)

### Packages (Core Journey)
- `packages/core/upload/` - NEW package structure
  - `src/image/compression/` - extract from wishlist
  - `src/image/heic/` - extract from wishlist
  - `src/image/presets/` - extract from wishlist
  - `src/hooks/` - generalized useUpload
  - `src/__types__/` - Zod schemas
- `apps/web/app-wishlist-gallery/` - UPDATE imports
  - `src/utils/imageCompression.ts` - DELETE after extraction
  - `src/hooks/useS3Upload.ts` - DELETE after extraction
  - `src/components/*` - UPDATE imports to @repo/upload

### Endpoints (Core Journey)
- No endpoint changes
- Presigned URL endpoint behavior unchanged (RTK Query mutation remains in wishlist app)

### Critical Deploy Touchpoints
- **Build order**: `@repo/upload` must build before wishlist app (Turborepo dependency)
- **Type checking**: Wishlist app type-checks with new imports
- **Bundle size**: Monitor for duplicate dependencies (browser-image-compression, heic2any)
- **Test pipeline**: All wishlist E2E tests pass

## MVP-Critical Risks

### Risk 1: TypeScript circular dependency
**Why it blocks MVP**: If `@repo/upload` types reference wishlist-specific types (e.g., RTK Query mutation shape), package won't build

**Required mitigation**:
- Define presigned URL response shape as standalone Zod schema in `@repo/upload/types`
- Wishlist app adapts its RTK mutation to match schema
- Hook accepts generic `getPresignedUrl: (file: File) => Promise<PresignedUrlResponse>`

### Risk 2: Dependency duplication in bundle
**Why it blocks MVP**: If `browser-image-compression` and `heic2any` are bundled twice (package + app), bundle size increases significantly (~500KB gzipped)

**Required mitigation**:
- Use pnpm workspace deduplication
- Ensure wishlist app's package.json removes local dependencies after migration
- Add build script to check for duplicate dependencies: `pnpm dedupe`

### Risk 3: Progress callback contract mismatch
**Why it blocks MVP**: If generalized hook changes progress callback signature, wishlist UI breaks (no compile error if `any` used)

**Required mitigation**:
- Define strict Zod schema for `ProgressCallback` type
- Preserve exact signature from existing useS3Upload
- Add integration test that verifies callback payload matches UI expectations

### Risk 4: Missing runtime dependencies
**Why it blocks MVP**: If package.json doesn't include `browser-image-compression` or `heic2any` as dependencies, runtime errors in production

**Required mitigation**:
- Copy exact dependency versions from wishlist app
- Add package smoke test that imports and executes compression
- CI job that builds and tests package in isolation

## Missing Requirements for MVP

### Requirement 1: Presigned URL response schema
**Decision needed**: Define exact shape of presigned URL response that all apps must conform to

**Concrete text for PM**:
```
The hook expects presigned URL providers to return:
{
  url: string (S3 upload URL),
  fields?: Record<string, string> (optional S3 form fields)
}

Apps using @repo/upload must adapt their backend responses to match this schema.
```

### Requirement 2: Error handling strategy
**Decision needed**: Should hook throw errors or return error states? How should apps display errors?

**Concrete text for PM**:
```
The hook returns error states (no thrown errors). Consuming apps are responsible for:
- Displaying error messages to users
- Logging errors via @repo/logger
- Retry logic (if applicable)

Hook provides: { status: 'error', error: Error, retry: () => void }
```

### Requirement 3: WebP fallback behavior
**Decision needed**: What happens when browser doesn't support WebP and preset requests it?

**Concrete text for PM**:
```
If preset specifies WebP conversion but browser doesn't support it:
- Hook logs warning via @repo/logger
- Falls back to JPEG output
- Does NOT error or block upload
```

## MVP Evidence Expectations

### Proof Needed for Core Journey
1. **Migration completeness**:
   - All wishlist upload tests pass with zero failures
   - No console errors in browser during upload flow
   - Visual regression test passes (screenshot comparison)

2. **Package isolation**:
   - `pnpm build --filter=@repo/upload` succeeds
   - `pnpm test --filter=@repo/upload` passes with 80%+ coverage
   - No imports from apps/web/* in package code

3. **Type safety**:
   - `pnpm check-types --filter=@repo/upload` passes
   - `pnpm check-types --filter=app-wishlist-gallery` passes
   - No `any` types in public API (Zod-inferred only)

### Critical CI/Deploy Checkpoints
1. **Turborepo build order**: `@repo/upload` builds before all apps
2. **Bundle size check**: Wishlist app bundle size does not increase (or <5% increase acceptable)
3. **E2E suite**: Full wishlist Playwright suite passes (all existing tests green)
4. **Dependency audit**: `pnpm list browser-image-compression heic2any` shows single version
