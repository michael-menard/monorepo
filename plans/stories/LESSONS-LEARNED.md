# Lessons Learned

> **DEPRECATED**: This file is deprecated as of KNOW-043 (2026-01-31).
> Lessons are now stored in the Knowledge Base and accessed via `kb_search`.
>
> **To query lessons:**
> ```javascript
> kb_search({ query: "lesson topic category", tags: ["lesson-learned"], limit: 5 })
> ```
>
> **To add new lessons:**
> ```javascript
> kb_add({
>   content: "**[STORY-XXX] Category**\n\n- Lesson content here",
>   role: "dev",
>   tags: ["lesson-learned", "story:story-xxx", "category:category-name"]
> })
> ```
>
> This file is preserved for historical reference. Do NOT add new entries here.

---

This file captures implementation learnings from completed stories to improve future planning and execution.

---

## Token Usage Summary

### Story Token Costs (Cumulative)

| Story | Total Tokens | Input | Output | Most Expensive Phase | Notes |
|-------|--------------|-------|--------|---------------------|-------|
| STORY-007 | — | — | — | — | Pre-token tracking |
| STORY-008 | — | — | — | — | Pre-token tracking |
| STORY-009 | — | — | — | — | Pre-token tracking |
| STORY-010 | — | — | — | — | Pre-token tracking |
| STORY-011 | — | — | — | — | Pre-token tracking |
| STORY-012 | — | — | — | — | Pre-token tracking |
| STORY-013 | — | — | — | — | Pre-token tracking |
| STORY-014 | — | — | — | — | Pre-token tracking |
| STORY-015 | — | — | — | — | Pre-token tracking |
| STORY-016 | ~97k | ~48k | ~50k | Dev: Backend Impl + Fix | 57 ACs, 141 tests added in fix phase |
| WRKF-1000 | ~41.5k | ~34.9k | ~6.6k | Planner (~16k) | Pure scaffolding, 10 ACs, 2 tests |
| WRKF-1010 | ~70.5k | ~53.1k | ~17.5k | Backend Coder (~17.3k) | 24 ACs, 86 tests, 100% coverage |
| WRKF-1020 | ~118k | ~80.6k | ~37.4k | Backend Coder (~44.6k) | 24 ACs, 220 tests, 96.91% coverage |
| WRKF-1021 | ~99.8k | ~78.6k | ~21.2k | Backend Coder (~32.5k) | 17 ACs, 57 new tests, 97.64% coverage |

### High-Cost Operations Registry

Operations that consistently consume >10k tokens. Avoid or optimize these.

| Operation | Typical Tokens | Stories Affected | Mitigation |
|-----------|----------------|------------------|------------|
| Read serverless.yml (70KB) | ~17,500 | — | Extract relevant section only |
| Full codebase Explore | ~25,000+ | — | Use targeted Grep instead |
| Reading all story docs | ~10,000 | Every story | Cache in conversation |
| code-reviewer agent | ~30,000+ | — | Review smaller changesets |

### Token Optimization Patterns

**Patterns that reduce token usage:**
1. **Targeted file reads** - Read specific line ranges instead of full files
2. **Grep before Read** - Find relevant files first, then read only those
3. **Batch related operations** - Multiple edits in fewer conversation turns
4. **Reference by line number** - Instead of re-reading, cite "lines 45-60"
5. **Skip redundant context** - Don't re-read files already in conversation

**Anti-patterns that waste tokens:**
1. Reading serverless.yml when only one resource needed
2. Multiple agents reading the same story file
3. Explore agent for simple file searches
4. Re-reading implementation plan in every sub-agent

---

## STORY-007: Gallery - Images Read
Date: 2026-01-19

### Reuse Discoveries
- **DI pattern for core functions**: The dependency injection pattern (`GetImageDbClient`, etc.) from album functions was highly reusable for all 4 new image functions. Future stories extending any `*-core` package should expect to create similar interfaces.
- **Discriminated union result types**: The `{ success: true, data } | { success: false, error, message }` pattern from album functions worked seamlessly for image operations. This should be the default pattern for all core functions.
- **Seed upsert pattern**: The ON CONFLICT DO UPDATE pattern in `gallery.ts` allowed idempotent seeding across story iterations without data conflicts.

### Blockers Hit
- **None**: This was a smooth implementation with no blockers. The well-defined story specification and established codebase patterns enabled straightforward execution.

### Plan vs Reality
- Files planned: **17** (10 gallery-core + 4 handlers + vercel.json + seed + http)
- Files actually touched: **18** (14 created + 4 modified)
- Surprise files: **None** - all files matched the plan

### Time Sinks
- **Lint auto-fix**: 2 Prettier formatting issues in `flag-image.ts` and `index.ts` required auto-fix. Minor but recurring pattern - long import/export lines need manual line breaks or rely on auto-fix.
- **Tags search implementation**: The ILIKE search across JSONB tags field required `tags::text ILIKE` approach. This pattern should be documented for future search implementations.

### Verification Notes
- Fast-fail caught: TypeScript compilation caught no issues (clean implementation following existing patterns)
- Final verification caught: Lint formatting issues (auto-fixed, no manual changes needed)
- Pre-existing issues noted: Other packages (`file-validator`, `mock-data`, `sets-core`) have unrelated type errors that pre-date STORY-007

### Recommendations for Future Stories
1. **Extend existing packages first**: The decision to extend `gallery-core` rather than create `gallery-images-core` was validated. Reuse-first principle saves significant setup time.
2. **Specify exact seed UUIDs in story**: The deterministic UUIDs (`11111111-...`, `22222222-...`, etc.) in the story spec enabled consistent HTTP contract test design.
3. **Route order matters in vercel.json**: Document that specific routes (`/search`, `/flag`) must come before parameterized routes (`/:id`) to avoid routing conflicts.
4. **DI interfaces per function**: Each core function needs its own `*DbClient` interface for unit testing. Plan for this overhead when estimating story complexity.
5. **Backend-only stories skip Playwright**: When a story has no UI changes, explicitly note "Playwright: NOT APPLICABLE" in verification to avoid confusion.

---

## STORY-008: Gallery - Images Write (No Upload)
Date: 2026-01-19

### Reuse Discoveries
- **S3 cleanup belongs in adapter, not core**: The decision to return `imageUrl`/`thumbnailUrl` from the core function and handle S3 deletion in the Vercel handler (adapter) was correct. Core stays infrastructure-agnostic; adapters handle AWS-specific concerns.
- **Album validation pattern for cross-entity references**: When updating an entity with a foreign key to another entity (`albumId`), the pattern is: (1) check existence (400), (2) check ownership (403). This two-step validation is now established for future cross-entity updates.
- **Discriminated union with data payload**: For delete operations that need post-delete cleanup (like S3), returning `{ success: true, data: { imageUrl, thumbnailUrl } }` allows the adapter to handle cleanup without the core function knowing about S3.

### Blockers Hit
- **None**: Smooth implementation following established patterns from STORY-007 (images read) and STORY-006 (album CRUD).

### Plan vs Reality
- Files planned: **9** (4 modify, 5 create)
- Files actually touched: **9** (4 modify, 5 create)
- Surprise files: **None** - exact match to implementation plan

### Time Sinks
- **Prettier formatting on multiline Zod schemas**: Line 259 of `__types__/index.ts` required auto-fix for the `UpdateImageInputSchema.description` field chain. This is a recurring pattern - long Zod method chains trigger Prettier reformatting. Consider preemptively splitting onto multiple lines.
- **Pre-existing monorepo failures obscure verification**: Full `pnpm build` and `pnpm check-types` fail due to unrelated issues in `@repo/app-sets-gallery`, `@repo/main-app`, and `lego-api-serverless`. Scoped verification (`--filter gallery-core`) is required.

### Verification Notes
- Fast-fail caught: **Nothing** - TypeScript compilation clean throughout
- Final verification caught: **1 Prettier error** in `__types__/index.ts` (multiline Zod chain)
- Pre-existing issues noted: @repo/app-sets-gallery build fails (Tailwind/design-system), @repo/main-app type errors, 216 lint errors in lego-api-serverless

### Recommendations for Future Stories
1. **Best-effort cleanup pattern established**: For any operation requiring post-DB infrastructure cleanup (S3, external APIs, etc.), follow the pattern: core returns data needed for cleanup, adapter handles cleanup with try/catch, never fail the request on cleanup failure.
2. **CoverImageId clearing before delete**: When deleting an entity that can be referenced by another entity's FK (like `coverImageId` on albums), clear those references BEFORE deleting. This prevents FK constraint violations even when cascade isn't configured.
3. **Empty body PATCH semantics**: Document that PATCH with `{}` should return 200 and update `lastUpdatedAt`. This is now an established pattern for "touch" operations.
4. **24 new tests validates test-per-behavior**: The 16 update + 8 delete tests cover all code paths. Future write operation stories should expect ~8-16 tests per function depending on validation complexity.
5. **HTTP contract completeness**: The 22 HTTP requests (16 PATCH, 6 DELETE) covered all happy path and error cases. Future stories should plan for ~2-3x HTTP requests vs acceptance criteria line items.

---

## STORY-010: MOC Parts Lists Management
Date: 2026-01-19

### Reuse Discoveries
- **@repo/gallery-core pattern fully portable**: The DI pattern, discriminated union result types, and Zod schema structure from gallery-core translated directly to moc-parts-lists-core with minimal adaptation. This validates the approach for all future `*-core` packages.
- **Handler patterns reusable across domains**: The Vercel handler patterns (auth bypass, DB singleton, method validation, error response format) copied directly from gallery handlers. Future backend stories should reference these as templates.
- **CSV parsing belongs in core**: Moving CSV parsing logic to the core package (not handlers) followed ports-and-adapters correctly and enabled isolated unit testing of parsing logic.

### Blockers Hit
- **None**: The well-defined story specification, existing AWS Lambda reference implementation, and established patterns from STORY-007 enabled smooth execution without blockers.

### Plan vs Reality
- Files planned: **24** (17 core package + 5 handlers + vercel.json + seed)
- Files actually touched: **24** (17 created in core package + 5 handlers + 2 config/seed)
- Surprise files: **None** - all files matched the implementation plan exactly

### Time Sinks
- **Lint formatting issues**: 3 lint errors (2 Prettier, 1 unused import) required post-verification fixes. These were minor but recurring - multiline Zod schemas get flagged by Prettier. Consider running `pnpm lint --fix` earlier in the workflow.
- **Pre-existing monorepo issues**: Monorepo-wide `pnpm build` and `pnpm check-types` fail due to issues in other packages (@repo/app-dashboard, @repo/file-validator, @repo/gallery-core, @repo/sets-core). This required scoping verification commands to STORY-010 specific packages only.

### Verification Notes
- Fast-fail caught: **Nothing** - clean implementation following established patterns
- Final verification caught: **3 lint errors** - 2 Prettier formatting issues (multiline schemas), 1 unused import (`sql` in summary.ts)
- Pre-existing issues noted: Dashboard build fails (design-system export missing), multiple packages have type errors that predate STORY-010

### Recommendations for Future Stories
1. **Run scoped lint early**: Execute `pnpm eslint <new-files> --fix` after each implementation chunk rather than waiting for final verification. Catches Prettier issues before they accumulate.
2. **Document pre-existing failures**: When monorepo-wide checks fail, document which packages have pre-existing issues so future stories don't waste time investigating unrelated failures.
3. **CSV parsing pattern established**: For any future file parsing (XML, JSON uploads, etc.), follow the same pattern - parsing logic in core package, handlers only extract content and delegate.
4. **Batch insert pattern for bulk operations**: The 1,000 row batch insert pattern for CSV parsing is now a reusable reference for any bulk data import stories.
5. **New packages follow template**: Future `*-core` packages should copy `@repo/moc-parts-lists-core` structure: package.json, tsconfig.json, vitest.config.ts, src/index.ts, src/__types__/index.ts, then function files with matching test files.

---

## STORY-011: MOC Instructions - Read Operations
Date: 2026-01-19

### Reuse Discoveries
- **moc-parts-lists-core as package template**: The package scaffold (package.json, tsconfig.json, vitest.config.ts) copied directly from `@repo/moc-parts-lists-core`, validating STORY-010's recommendation that this package serves as the template for future `*-core` packages.
- **Gallery handler patterns for MOC endpoints**: The Vercel handler pattern (auth bypass, DB singleton, method validation) from gallery handlers translated directly to MOC handlers with minimal adaptation. The ownership-aware access pattern (returning 404 instead of 403 to prevent existence leak) is now established for any entity with visibility states.
- **vercel.json route ordering pattern**: Specific routes (`/api/mocs/stats/by-category`, `/api/mocs/stats/uploads-over-time`) placed before parameterized routes (`/api/mocs/:id`) confirms the STORY-007 recommendation about route ordering. This is now a documented pattern for any endpoints with both specific and parameterized routes.

### Blockers Hit
- **None**: Smooth implementation with no blockers. The well-defined story specification, AWS Lambda reference implementation, and established patterns from STORY-007 and STORY-010 enabled straightforward execution.

### Plan vs Reality
- Files planned: **24** (13 core package + 4 handlers + vercel.json + seed index + seed file + http)
- Files actually touched: **19** (17 new + 2 modified per PROOF)
- Surprise files: **None** - Plan listed more files than needed; actual implementation was more efficient due to consolidation (e.g., fewer test helper files)

### Time Sinks
- **Lint formatting in test files**: The 4 warnings in eslint output for test file ignore patterns is expected behavior but initially caused verification confusion. Future stories should expect these warnings for `__tests__/` files and not treat them as failures.
- **Pre-existing monorepo failures**: Full repository `pnpm build` and `pnpm check-types` fail due to issues in other packages (file-validator, mock-data, pii-sanitizer, sets-core). Required scoping verification to STORY-011 specific packages. This is now a recurring pattern across stories.

### Verification Notes
- Fast-fail caught: **Nothing** - TypeScript compilation clean throughout (following established patterns)
- Final verification caught: **0 errors** - All files passed lint cleanly (no Prettier fixes needed, unlike previous stories)
- Pre-existing issues documented: Other packages have type errors that predate STORY-011 (file-validator, mock-data, pii-sanitizer, sets-core, gallery, upload-client)

### Recommendations for Future Stories
1. **Stats routes as sub-directory pattern established**: For any domain with stats/analytics endpoints, create a `stats/` subdirectory under the main domain folder (e.g., `api/mocs/stats/by-category.ts`). Add routes to vercel.json BEFORE the parameterized routes.
2. **60 tests validates comprehensive coverage**: The 18+15+15+12 test split across 4 functions (get, list, stats-category, stats-time) provides the right balance. Plan for ~15 tests per core function for read operations.
3. **HTTP contract as integration spec**: The 17 HTTP requests in mocs.http (7 list, 7 get, 2 stats, 1 error) provides complete coverage. Future backend-only stories should aim for 15-20 HTTP requests covering all AC scenarios.
4. **No blockers validates process maturity**: STORY-011 had no blockers because prior stories (007, 008, 010) established all necessary patterns. The "lessons learned" process is working - later stories benefit from earlier documentation.
5. **Backend-only story estimation**: 60 tests + 4 handlers + seed + http contract completed in single session. Similar backend-only read operation stories can be estimated at this complexity level.

---

## STORY-012: MOC Instructions - Gallery Linking
Date: 2026-01-20

### Reuse Discoveries
- **Inline handler pattern validated for simple CRUD**: The STORY-011 decision to keep business logic inline in Vercel handlers (rather than extracting to `*-core` packages) was validated again. For join table operations (link/unlink), the logic is simple enough that core package extraction adds overhead without benefit. The threshold for core extraction should be: multiple handlers sharing the same business logic, or complex validation rules.
- **Combined GET+POST handler pattern**: A single handler file (`index.ts`) supporting both GET and POST methods via method checking reduces file count and keeps related operations together. This pattern works well for collection endpoints (`/gallery-images`) where GET lists and POST creates.
- **Nested route structure for sub-resources**: The directory structure `mocs/[id]/gallery-images/` cleanly expresses the resource hierarchy. Future sub-resource endpoints (e.g., MOC comments, MOC versions) should follow this pattern.

### Blockers Hit
- **None**: This was the cleanest implementation in the recent story sequence. No blockers, no workarounds needed for STORY-012 code itself. Pre-existing monorepo issues (seed failure, build failure) were documented and did not block the story.

### Plan vs Reality
- Files planned: **5** (2 new handlers + 3 modify)
- Files actually touched: **5** (2 new + 3 modified)
- Surprise files: **None** - exact match to implementation plan

### Time Sinks
- **Seed data ID mismatch workaround**: The seed file specifies UUIDs (`dddddddd-*`) that differ from actual database MOC IDs (`88888888-*`). This is a pre-existing inconsistency that required manual database inspection for HTTP testing. Future stories should document actual database IDs in the seed file comments.
- **Pre-existing seed failure**: Full `pnpm seed` fails in `seedSets()` due to tags column type mismatch (`text[]` vs `jsonb`). Manual workaround (direct database insert) was required. This is now the 3rd consecutive story hitting this blocker - it should be prioritized for fixing.

### Verification Notes
- Fast-fail caught: **Nothing** - TypeScript compilation clean throughout
- Final verification caught: **0 errors** - All STORY-012 files passed lint cleanly
- Pre-existing issues: Build fails (@repo/app-wishlist-gallery), type errors in unrelated packages, seed execution failure (seedSets schema mismatch)

### Recommendations for Future Stories
1. **Fix seedSets schema mismatch urgently**: This is the 3rd story blocked by the `tags: text[] vs jsonb` mismatch. Create a tech debt story to align the seed data with the actual schema.
2. **Document actual database IDs in seed comments**: When seed files use deterministic UUIDs for documentation, add inline comments noting what IDs actually exist in the development database if they differ.
3. **Join table operations stay inline**: For simple join table CRUD (link/unlink), keep logic in handlers. Only extract to core when: (a) multiple handlers share the logic, or (b) validation rules become complex (e.g., permission checks beyond ownership).
4. **20 HTTP requests for 3 endpoints**: The ratio of ~6-7 HTTP requests per endpoint (covering happy path + all error cases) is the right level of contract documentation for API verification.
5. **Backend-only story simplicity**: With established patterns from STORY-011, this simpler story (5 files vs 24 files) completed quickly. Backend-only join table stories can be estimated at ~1/4 the complexity of full CRUD with core packages.

---

## STORY-013: MOC Instructions - Edit (No Files)
Date: 2026-01-20

### Reuse Discoveries
- **`findAvailableSlug` from @repo/upload-types**: The utility function for generating slug suggestions (e.g., `slug-2`, `slug-3`) was already available in `@repo/upload-types` and worked perfectly for the 409 CONFLICT scenario. Future stories with slug/name conflict handling should check this package first.
- **Inline handler pattern continues to scale**: The fourth consecutive story (STORY-011, 012, 013) using inline handlers for Vercel serverless functions confirms this approach works well for endpoint migration. The overhead of extracting to `*-core` packages is only warranted when business logic is shared across multiple handlers or becomes complex.
- **LESSONS-LEARNED.md as implementation guide**: The implementation plan explicitly referenced lessons from prior stories (route ordering from STORY-007, scoped lint from STORY-010, handler patterns from STORY-011/012). This "lessons learned" system is actively reducing implementation friction.

### Blockers Hit
- **None**: The implementation was found to be already complete upon inspection. All code, route configuration, and HTTP contract documentation were in place. This is the smoothest story in the series, validating that the established patterns and documentation are enabling efficient execution.

### Plan vs Reality
- Files planned: **3** (1 new handler + 2 modify)
- Files actually touched: **3** (1 new + 2 modified)
- Surprise files: **None** - exact match to implementation plan

### Time Sinks
- **Pre-existing monorepo failures**: Build fails (`@repo/app-dashboard`, `@repo/app-wishlist-gallery` design-system exports), type check fails (file-validator, mock-data, pii-sanitizer, sets-core, gallery-core), and test infrastructure fails (missing `apps/api/__tests__/setup.ts`). These are now the 4th+ consecutive stories documenting these issues. Scoped verification (`pnpm eslint <specific-file>`) remains the necessary workaround.
- **No actual time sinks in STORY-013 code**: The implementation followed established patterns so closely that no debugging or rework was required.

### Verification Notes
- Fast-fail caught: **Nothing** - Code was clean on first pass
- Final verification caught: **0 errors** - ESLint passed cleanly for edit.ts
- Pre-existing issues documented: 9 packages with pre-existing failures (file-validator, mock-data, pii-sanitizer, sets-core, gallery-core, upload-client, app-dashboard, app-wishlist-gallery, apps/api test setup)

### Recommendations for Future Stories
1. **Pre-existing monorepo issues need dedicated tech debt story**: The same 9 packages have failed across STORY-010, 011, 012, and 013. A dedicated cleanup story would improve developer experience and reduce verification noise.
2. **12 HTTP requests for 1 PATCH endpoint**: The ratio of ~12 HTTP requests for a single endpoint (covering all happy path, error, and edge cases) provides comprehensive API verification. Future single-endpoint stories should plan for 10-15 HTTP contract requests.
3. **Strict Zod schemas with `.strict()` prevent API drift**: Using `.strict()` on request validation schemas catches unknown fields early, preventing clients from sending unsupported data. This should be the default for all PATCH/POST schemas.
4. **404 for invalid UUID prevents existence leak**: Returning 404 (not 400) for malformed UUIDs is now a confirmed security pattern. This prevents attackers from distinguishing "invalid input" from "resource doesn't exist".
5. **Route ordering established and documented**: The pattern of placing specific routes (e.g., `/api/mocs/:id/edit`) before parameterized routes (e.g., `/api/mocs/:id`) in vercel.json is now referenced in 3+ stories. This is institutional knowledge that should be captured in project documentation.

---

## STORY-009: Image Uploads - Phase 1 (Simple Presign Pattern)
Date: 2026-01-20

### Reuse Discoveries
- **Lambda multipart parser pattern adapted for Vercel**: The Busboy parsing logic from `@repo/lambda-utils/multipart-parser.ts` translated to `@repo/vercel-multipart` with key adaptation: Lambda uses `Buffer.from(event.body)` while Vercel uses `req.pipe()` for `IncomingMessage`. This confirms that parsing patterns are reusable even when transport mechanisms differ.
- **Pre-existing handlers reduce implementation scope**: 4 of 5 planned handlers (Sets presign, Sets register, Sets delete, Wishlist upload) already existed in the codebase. Future implementation plans should audit existing handlers first to avoid planning for work already done.
- **OpenSearch fetch approach for Vercel**: Lambda handlers use `@opensearch-project/opensearch` client with IAM auth, but Vercel handlers use simpler `fetch` API for compatibility. This is a justified adapter-layer difference that maintains the same core behavior.
- **Best-effort patterns from gallery handlers**: The S3 cleanup pattern (try/catch around delete, log failure, return success) and OpenSearch indexing pattern (non-blocking, wrapped in try/catch) were directly reusable from existing gallery/images handlers.

### Blockers Hit
- **None**: The story executed smoothly with no blockers. Pre-existing handlers and well-defined patterns from STORY-007/008 enabled efficient implementation.

### Plan vs Reality
- Files planned: **15** (package scaffold + handlers + seed + http)
- Files actually touched: **14** (7 new package files + 1 new handler + 6 modified/verified)
- Surprise files: **None** - but plan overestimated new handler files
- Key deviation: Plan expected 5 new handlers; reality was 4 pre-existed, only 1 new (Gallery upload)

### Time Sinks
- **Handler audit required verification instead of creation**: Discovering that most handlers already existed meant the implementation phase shifted from "create" to "verify". This is not a problem but changes the nature of the work. Future stories should explicitly distinguish "new endpoints" from "verify existing endpoints meet AC" in the implementation plan.
- **Pre-existing monorepo failures continue**: Same packages failing build/type-check as STORY-010 through STORY-013 (file-validator, mock-data, pii-sanitizer, sets-core, gallery-core, app-dashboard, app-wishlist-gallery). Scoped verification remains the workaround.

### Verification Notes
- Fast-fail caught: **Nothing** - @repo/vercel-multipart compiled and tested cleanly
- Final verification caught: **0 errors** - All 10 package tests passed, all handler files passed lint
- Package tests validated: parseVercelMultipart function, file/field helpers, MIME type restrictions, error handling

### Recommendations for Future Stories
1. **Audit existing handlers before planning**: When migrating endpoints, first check if Vercel handlers already exist. STORY-009 planned 5 new handlers but 4 were pre-existing. Add an "Existing Handler Audit" step to implementation planning for migration stories.
2. **vercel-multipart as multipart template**: The `@repo/vercel-multipart` package pattern (package.json, tsconfig.json, vitest.config.ts, Zod types, implementation, tests) is now the template for any Vercel-specific infrastructure packages.
3. **10 unit tests for infrastructure packages**: The test coverage for @repo/vercel-multipart (file parsing, field parsing, content-type validation, MIME restrictions, helpers) provides the right balance for infrastructure packages. Aim for ~10 tests covering happy path, error cases, and helpers.
4. **OpenSearch indexing approach documented**: Vercel handlers use `fetch` to OpenSearch endpoint rather than the SDK. This is a justified adapter difference. Document which approach to use when adding new OpenSearch indexing.
5. **Pre-existing handler pattern compliance check**: When handlers pre-exist, verification should confirm they meet story ACs rather than assuming they do. The BACKEND-LOG "Files verified" pattern (vs "Files changed") documents this distinction clearly.

---

## STORY-014: MOC Instructions - Import from URL
Date: 2026-01-21

### Reuse Discoveries
- **AWS Lambda parsers reusable from Vercel handlers**: The parsers (`parseRebrickableMoc`, `parseRebrickableSet`, `parseBrickLinkStudio`) and types (`ImportFromUrlRequestSchema`, `detectPlatform`) from AWS Lambda handlers can be imported directly into Vercel handlers via relative paths. No need to extract to shared packages when the logic is already platform-agnostic.
- **In-memory rate limiting/caching pattern for stateless endpoints**: For MVP endpoints that don't persist data, in-memory rate limiting and caching (module-level Maps) are acceptable. The pattern uses sliding window for rate limits (10/min/user) and TTL-based cache (1 hour). This avoids Redis dependency for simple use cases, with documented caveats about multi-instance behavior.

### Blockers Hit
- **None**: The implementation followed established patterns with no blockers.

### Plan vs Reality
- Files planned: **3** (1 new handler + 2 modify)
- Files actually touched: **3** (1 new + 2 modified)
- Surprise files: **None** - exact match to implementation plan

### Time Sinks
- **Import path calculation error**: The implementation plan specified `../../aws/...` (2 levels up) but the correct path was `../../../aws/...` (3 levels up). This was caught during TypeScript verification and fixed. Future plans should double-check relative path depth when crossing from `vercel/api/mocs/` to `aws/endpoints/`.

### Verification Notes
- Fast-fail caught: **Import path bug** - TypeScript compilation failed with "Cannot find module '../../aws/...'" error. Fixed by correcting to `../../../aws/...`
- Final verification caught: **Nothing additional** - After the import path fix, all checks passed

### Recommendations for Future Stories
1. **Route ordering remains critical**: The pattern of placing specific routes (`/api/mocs/import-from-url`) BEFORE parameterized routes (`/api/mocs/:id`) in vercel.json continues to be essential. This is now documented in 4+ stories (STORY-007, 011, 013, 014).
2. **Relative import path verification**: When importing from AWS Lambda to Vercel handlers, count the directory levels carefully: `vercel/api/mocs/` to `aws/endpoints/...` is 3 levels up (`../../../`), not 2. Add a verification step in plan validation to confirm import paths.
3. **In-memory caching/rate limiting template established**: The `rateLimitMap` and `cacheMap` patterns with `checkRateLimit(userId)`, `getCached(url)`, and `setCache(url, data)` functions are now reusable templates for any stateless endpoints needing these features.
4. **Extended function timeout for external fetches**: When a handler fetches external URLs, configure `maxDuration: 15` in vercel.json function config to allow for network latency.
5. **14 HTTP requests for complete coverage**: The ratio of ~14 HTTP requests for a single endpoint with 10 ACs (covering happy paths, error cases, and edge cases) provides thorough API verification. Plan for 1-2 HTTP requests per AC.

---

## STORY-015: MOC Instructions - Initialization & Finalization
Date: 2026-01-21

### Reuse Discoveries
- **DI pattern with injected functions for S3 operations**: Injecting S3 operations (`generatePresignedUrl`, `headObject`, `getObject`) as functions in the deps interface allows the core package to remain platform-agnostic while enabling easy mocking in unit tests. This pattern is now validated across initialize and finalize operations and should be the default for any core function needing external service calls.
- **Discriminated union result types with error codes**: The pattern `{ success: true, data } | { success: false, error: ErrorCode, message }` works well for operations with multiple failure modes. Using a Zod enum for error codes enables exhaustive pattern matching in handlers.
- **Two-phase lock pattern for concurrent operations**: The `finalizingAt` timestamp lock with `finalizeLockTtlMinutes` TTL for stale lock rescue is a reusable pattern for any multi-step operation that shouldn't run concurrently. Store transient lock (finalizingAt) separately from permanent state (finalizedAt).
- **Optional deps for progressive enhancement**: Making `validatePartsFile` optional in `FinalizeWithFilesDeps` allows deployments without parts validation to use the core function. This pattern of optional capabilities via DI is useful for features that may not be available in all environments.
- **sanitizeFilenameForS3 utility from core utils**: The filename sanitization utility in `apps/api/core/utils/filename-sanitizer.ts` handles path traversal, unicode, and special chars. Future file handling stories should reuse this.

### Blockers Hit
- **None**: The implementation followed established patterns with no blockers. Pre-existing monorepo issues (seed failure, build failures in other packages) were documented but did not block STORY-015 work.

### Plan vs Reality
- Files planned: **11** (6 new + 5 modified)
- Files actually touched: **11** (6 new + 5 modified)
- Surprise files: **None** - exact match to implementation plan

### Time Sinks
- **Lint fixes on multiline Zod schemas**: Recurring pattern - long Zod method chains trigger Prettier reformatting. Running `pnpm eslint --fix` early in each chunk prevents accumulation.
- **UUID validation in test mocks**: Test UUIDs must be valid format (e.g., `00000000-0000-0000-0000-000000000001`) because Zod validates them. Invalid UUIDs cause unexpected test failures. Use valid UUID patterns in all mock data.

### Verification Notes
- Fast-fail caught: **Nothing** - TypeScript compilation clean throughout (following established patterns)
- Final verification caught: **1 unused variable** - `let moc =` assignment was unused after refactoring; removed during lint
- Pre-existing issues: Same packages failing as STORY-010 through STORY-014 (file-validator, mock-data, pii-sanitizer, sets-core, gallery-core, app-dashboard, app-wishlist-gallery). Scoped verification continues as workaround.

### Recommendations for Future Stories
1. **51 tests for 2 complex core functions is appropriate**: 25 tests for initialize + 26 tests for finalize covered all ACs, edge cases, and error paths. Plan for ~20-30 tests per core function that has multiple validation stages and error modes.
2. **Extend MocRowSchema for new state fields**: When adding lock/status tracking to an entity, extend the existing row schema (e.g., adding `finalizedAt`, `finalizingAt`) rather than creating new schemas. Keeps type compatibility with existing code.
3. **20 HTTP test requests for 2-endpoint stories**: The ratio of ~10 HTTP requests per endpoint covering happy paths and all error cases provides comprehensive contract documentation. STORY-015's 20 requests (12 initialize, 8 finalize) is the right level.
4. **Route ordering confirmed again**: Specific routes (`/api/mocs/with-files/initialize`, `/api/mocs/:mocId/finalize`) placed before parameterized routes (`/api/mocs/:id`) in vercel.json. This is now documented in 5+ stories and should be considered established project convention.
5. **Skip OpenSearch in MVP, document clearly**: Per story Non-goals, OpenSearch indexing was skipped for the Vercel implementation. This is a valid MVP approach - the core function can be extended later. Document this explicitly in story, plan, and proof files.

---

## STORY-016: MOC File Upload Management
Date: 2026-01-21

### Reuse Discoveries
- **Parts list parser extraction pattern**: The CSV/XML parsing logic from the AWS handler (`apps/api/platforms/aws/endpoints/moc-instructions/_shared/parts-list-parser.ts`) was successfully extracted to the core package. This validates that complex domain logic from AWS handlers can be migrated to platform-agnostic core packages for reuse across Vercel and AWS.
- **STORY-015 DI patterns fully reusable**: The dependency injection interfaces from STORY-015 (`InitializeWithFilesDeps`, `FinalizeWithFilesDeps`) provided exact templates for the new functions. The patterns for S3 operations (`generatePresignedUrl`, `headObject`, `copyObject`, `deleteObject`), rate limiting, and DB operations were copied directly.
- **Optimistic locking with `expectedUpdatedAt`**: The two-phase edit pattern (presign -> finalize) with optimistic locking via `expectedUpdatedAt` prevents concurrent edit conflicts. This is now a validated pattern for any multi-step mutation operation on shared resources.

### Blockers Hit
- **Missing unit tests caught late in verification**: Initial implementation completed backend code but omitted all unit tests (141 tests eventually needed). The verification phase caught this as AC-57 failure. **How to avoid:** Run `pnpm test --filter <package>` after each implementation chunk, not just at final verification.
- **Unused import caused lint failure**: An unused `ParsedFile` import in `files/index.ts` failed eslint. **How to avoid:** Run scoped lint (`pnpm eslint <new-file>`) immediately after writing each handler file, before moving to next file.

### Plan vs Reality
- Files planned: **18** (13 new, 5 modified per IMPLEMENTATION-PLAN.md)
- Files actually touched: **18** (16 new + 2 modified per PROOF)
  - Core package: 5 new source files + 5 new test files + 2 modified
  - Vercel handlers: 5 new
  - Config/HTTP: 1 new
- Surprise files: **5 test files** - Plan listed test files but they were omitted during initial implementation; had to be added in fix phase

### Time Sinks
- **141 tests written in fix phase**: The initial backend implementation completed all source code but skipped tests entirely. The verification phase caught this, requiring a substantial fix phase to write 141 unit tests (delete: 16, upload-parts-list: 27, edit-presign: 27, edit-finalize: 30, parts-list-parser: 41). Tests should be written alongside implementation, not deferred.
- **Parts list parser complexity**: Extracting the CSV/XML parser from AWS handler to core package required understanding the `@xmldom/xmldom` typing differences (Element vs DOM Element) and adapting the code. Using `any[]` for compatibility with xmldom types was a pragmatic workaround.
- **Prettier formatting accumulation**: 12 auto-fixable Prettier errors accumulated across multiple files. Running `pnpm eslint --fix` after each chunk would have prevented this buildup.

### Verification Notes
- Fast-fail caught: **1 critical issue** - All unit tests missing (AC-57 not met). 111 existing tests passed but 0 tests existed for STORY-016 functions.
- Final verification caught: **13 lint errors** - 12 Prettier formatting (auto-fixable) + 1 unused import (manual removal)
- Post-fix verification: **PASS** - 252 tests (141 new), all lint clean

### Recommendations for Future Stories
1. **Write tests alongside implementation, not after**: The 141-test fix phase could have been avoided by writing tests for each function immediately after implementation. Add explicit "Run tests for chunk" step to each implementation chunk.
2. **Run lint after each file, not each chunk**: The unused `ParsedFile` import would have been caught immediately with per-file lint checks. Add `pnpm eslint <file>` as a step after each new file creation.
3. **57 ACs is too large**: STORY-016 had 57 acceptance criteria covering 5 endpoints. This made the story complex to implement and verify. Future stories should aim for 15-25 ACs maximum. Consider splitting file management into: (a) delete/upload files, (b) parts list upload, (c) edit presign/finalize.
4. **Parts list parser as reuse reference**: The extraction of complex parsing logic (CSV headers detection, XML traversal, quantity calculation) from AWS to core package is now a template for any future domain logic migrations.
5. **Test file count expectation**: 5 core functions required 5 test files with 141 total tests (~28 tests per function average). This is the expected test density for functions with multiple code paths, error conditions, and edge cases.

---

## WRKF-000: Story Workflow Harness
Date: 2026-01-22

### Purpose
WRKF-000 is the first **workflow harness story** - a meta-story designed to validate the story lifecycle process machinery itself. Unlike feature stories, harness stories make trivial code changes while exercising the full workflow (PM -> Elab -> Dev -> Code Review -> QA Verify -> QA Gate).

### What Was Validated
- **7-phase lifecycle execution**: All phases from PM artifact creation through QA Gate can execute in sequence
- **Artifact generation patterns**: Each phase produces substantive artifacts (not placeholders)
- **Template extraction**: Reusable templates can be abstracted from completed story artifacts
- **Lessons learned capture**: Workflow observations can be documented for process improvement

### Template Patterns Established
Three reusable templates were created in `plans/stories/WRKF-000/_templates/`:

1. **PROOF-TEMPLATE.md** - For documenting implementation evidence
   - Abstracted from STORY-016's PROOF file
   - Sections: Summary, AC Evidence tables, Reuse/Architecture, Verification, Files Changed, Token Log

2. **QA-VERIFY-TEMPLATE.md** - For QA verification
   - Abstracted from STORY-016's QA-VERIFY file
   - Sections: Verdict, AC Verification tables, Test Execution, Architecture Compliance, Reality Checks, Summary

3. **ELAB-TEMPLATE.md** - For story elaboration
   - Abstracted from WRKF-000's ELAB file
   - Sections: Verdict, Audit Checklist, Issues Found, Acceptable As-Is, Discovery Findings, Token Log

### Workflow Friction Observed

1. **Documentation overhead is high**: Even a trivial code change (one comment) required substantial documentation across 6+ files. This is intentional for process validation but would be excessive for simple fixes.

2. **Template sources inconsistent**: STORY-016 had both PROOF and QA-VERIFY files to reference, but ELAB template came from WRKF-000 itself. Future harness stories should use the established templates.

3. **No automated artifact validation**: Currently relies on human judgment to verify artifact content structure. WRKF-001 (suggested follow-up) could add automated validation.

4. **Token tracking is manual**: Token estimates are calculated by hand. Consider automated token counting in future tooling.

### Recommendations

1. **Use WRKF-000 templates for all future stories**: The `_templates/` directory provides standardized structures
2. **Harness stories for major workflow changes**: When modifying the lifecycle process, create a new WRKF-XXX story to validate
3. **Consider WRKF-001**: Automated artifact validation script to reduce manual verification burden
4. **Consider WRKF-002**: Workflow metrics capture (wall-clock time per phase, not just tokens)

### Files Created
- `plans/stories/WRKF-000/_templates/PROOF-TEMPLATE.md`
- `plans/stories/WRKF-000/_templates/QA-VERIFY-TEMPLATE.md`
- `plans/stories/WRKF-000/_templates/ELAB-TEMPLATE.md`
- `plans/stories/WRKF-000/_implementation/IMPLEMENTATION-LOG.md`

### Files Modified
- `CLAUDE.md` - Added trivial validation comment

---

## WRKF-1000: Package Scaffolding
Date: 2026-01-23

### Reuse Discoveries
- **`@repo/moc-parts-lists-core` as definitive package template**: The package.json, tsconfig.json, and vitest.config.ts files from this package were directly reusable with minimal modification. Future backend packages should clone this structure rather than lambda-utils or logger.
- **pnpm workspace glob auto-discovery**: Placing packages under `packages/backend/*` eliminates the need to modify root package.json or pnpm-workspace.yaml. This was discovered during plan validation and avoided an unnecessary config change.
- **ESM exports pattern standardized**: The `"type": "module"` with `"exports": { ".": "./dist/index.js" }` pattern is now validated across multiple packages and should be the default for all new TypeScript packages.

### Blockers Hit
- **Plan path mismatch (self-resolved)**: Story spec said `packages/orchestrator/` but this didn't match existing pnpm-workspace.yaml globs. PLAN-VALIDATION.md caught this and resolved by using `packages/backend/orchestrator/` instead. **Prevention for future:** Always verify proposed package paths match existing workspace globs before finalizing story specification.

### Plan vs Reality
- Files planned: **6** (5 new + 1 root package.json modify)
- Files actually touched: **5** (5 new, 0 root changes)
- Surprise files: **None** - Plan predicted root package.json change but workspace glob made it unnecessary (improvement, not regression)

### Time Sinks
- **No significant time sinks**: This was the cleanest implementation in the story sequence. Pure scaffolding with well-defined templates completed quickly.
- **Plan validation overhead justified**: The extra step of validating the plan caught the workspace path issue before implementation began, saving potential rework.

### Verification Notes
- Fast-fail caught: **Nothing** - clean implementation following established patterns
- Final verification caught: **0 errors** - all lint, type-check, build, and tests passed cleanly
- Turborepo cache: Verified `FULL TURBO` on second build (204ms), confirming proper cache integration

### Token Usage Analysis
- **Total tokens:** ~41,472 (input: ~34,908, output: ~6,564)
- **Most expensive phase:** Planner (~16,353 tokens) - read LESSONS-LEARNED.md (18.3KB, ~4,575 tokens) plus multiple template files for reuse patterns
- **Most expensive sub-agent:** Planner (~16,353 tokens)
- **High-cost operations:**
  - Read LESSONS-LEARNED.md: ~4,575 tokens - Could be avoided if recent entries were summarized in a smaller index
  - Read multiple template files (6 files): ~1,200 tokens - Unavoidable for reuse compliance
- **Redundant reads:** Story file read by all 4 agents (~2,468 tokens x4 = ~9,872 tokens) - could cache in shared context
- **Optimization opportunities:**
  - Create a LESSONS-LEARNED-RECENT.md with only last 3 stories (~3,000 tokens vs ~4,575)
  - Story context could be passed to sub-agents instead of re-reading

### Recommendations for Future Stories
1. **Package scaffolding stories should use `moc-parts-lists-core` as template**: This is now the canonical backend package template, confirmed by successful WRKF-1000 execution.
2. **Verify workspace glob match in story spec**: Before writing a story that creates a new package, check that the proposed location matches existing pnpm-workspace.yaml globs.
3. **Pure scaffolding stories are low-risk**: 10 ACs, 5 files, 2 tests, ~41k tokens. Use this as a baseline for estimating similar package scaffolding work.
4. **Plan validation prevents rework**: The PLAN-VALIDATION.md step caught a path issue that would have caused workspace recognition failure. Keep this step for all implementation plans.
5. **LangGraphJS version flexibility**: Story spec said `^1.1.0` but actual installed version was `0.2.74`. The `^` caret allowed pnpm to resolve compatible versions. Future dependency specs should use caret ranges for flexibility.

---

## WRKF-1020: Node Runner Infrastructure
Date: 2026-01-24

### Reuse Discoveries
- **`@repo/api-client` retry and circuit breaker patterns**: The `calculateRetryDelay()`, `CircuitBreaker` class, and jitter patterns from `packages/core/api-client/src/retry/retry-logic.ts` were directly adaptable for node execution. The retry patterns required minimal modification - mainly changing error types from HTTP-specific to node-specific.
- **`@repo/api-client` error classification pattern**: The `isRetryableError()` approach from error-handling.ts provided the template for `isRetryableNodeError()`. The key difference: ZodError must be non-retryable for graph nodes (validation failures).
- **`@repo/logger` createLogger() pattern**: Integrated smoothly with `createNodeLogger()` wrapper that adds node-specific context (name, storyId, duration).
- **WRKF-1010 state module immediately useful**: The freshly created GraphState schemas from WRKF-1010 were imported without issues. Sequencing scaffolding -> schema -> runner stories proved effective.

### Blockers Hit
- **None**: This was a clean implementation with no blockers. The well-defined story spec, established patterns from `@repo/api-client`, and freshly validated state module from WRKF-1010 enabled smooth execution.

### Plan vs Reality
- Files planned: **24** (11 source + 11 test + 2 modify per IMPLEMENTATION-PLAN.md)
- Files actually touched: **22** (11 source + 10 test + 1 modify per PROOF - context.ts was merged into types.ts)
- Surprise files: **types.ts** - Plan had separate `context.ts` but execution context was integrated into `types.ts` for cohesion

### Time Sinks
- **Lint fixes for unused imports/variables**: 5 unused imports accumulated across files (e.g., `NodeExecutionError` in error-classification.ts, `createNodeError`/`mergeStateUpdates`/`NodeConfig` in node-factory.ts). These were caught in verification and required post-implementation cleanup.
- **Prettier formatting on multiline patterns**: 10 Prettier errors for import groupings and Zod schema chains. Running `eslint --fix` resolved all automatically. This is a recurring pattern across WRKF stories.

### Verification Notes
- Fast-fail caught: **Nothing** - TypeScript compilation clean throughout
- Final verification caught: **15 lint errors** - 5 unused variables + 10 Prettier formatting
- Orchestrator fixed all lint errors and re-verified before completion
- **Key observation**: The orchestrator-level fix phase worked well - catching and fixing lint issues without requiring a separate "fix story"

### Token Usage Analysis
- **Total tokens:** ~117,961 (input: ~80,573, output: ~37,388)
- **Most expensive phase:** Backend Coder (~44,563 tokens) - largest output volume due to 11 source files + 10 test files with 220 tests
- **Most expensive sub-agent:** Backend Coder (~44,563 tokens)
- **High-cost operations:**
  - Writing test files: ~12,000+ tokens (10 test files with 220 tests) - necessary, cannot be avoided
  - Writing source files: ~14,000+ tokens (11 source files with complex logic) - necessary, cannot be avoided
  - Reading story + plan files per agent: ~10,000+ tokens - could cache between agents
- **Redundant reads:** Story file (wrkf-1020.md) read by 5 agents (~7,000 tokens x5 = ~35,000 tokens) - significant optimization opportunity
- **Optimization opportunities:**
  - Story context passing between agents instead of re-reading (~35k tokens potential savings)
  - Implementation plan caching for subsequent agents (~10k tokens potential savings)
  - Combined type-check + lint step instead of separate runs

### Recommendations for Future Stories
1. **Run scoped lint after each file creation**: The 5 unused import/variable errors could have been caught incrementally. Add `pnpm eslint <file>` after each new file is created, not just at verification.
2. **Larger stories benefit from orchestrator fix phase**: With 24 ACs and 220 tests, having the orchestrator catch and fix lint issues worked better than stopping for human intervention.
3. **Pattern adaptation stories are efficient**: Adapting existing patterns (`@repo/api-client`) rather than inventing new ones reduced both tokens and errors. Future infrastructure stories should identify reuse targets early.
4. **Test count scales with complexity**: 220 tests for 11 source files (~20 tests per file) is appropriate for infrastructure with multiple code paths. Plan for this density in complex library stories.
5. **Sequential WRKF stories benefit from proximity**: WRKF-1000 (scaffolding) -> WRKF-1010 (schemas) -> WRKF-1020 (runner) executed smoothly because each built directly on the previous. Continue this pattern for remaining WRKF stories.

---

## WRKF-1010: GraphState Schema
Date: 2026-01-23

### Reuse Discoveries
- **`@repo/moc-parts-lists-core/__types__/` pattern for Zod schema organization**: The pattern of organizing Zod schemas in dedicated directories with index exports was directly reusable for the new state schemas. The nested structure (enums/, refs/) follows this established convention.
- **ESM exports pattern from WRKF-1000**: The freshly created orchestrator package from WRKF-1000 provided the exact package structure needed. The `"type": "module"` with proper exports configuration was immediately validated by this story.
- **Vitest configuration reuse**: The vitest.config.ts from the scaffolding story required zero modifications for the new test files.

### Blockers Hit
- **None**: This was a clean implementation with no blockers. The story benefited from WRKF-1000 having just established the package structure, eliminating any workspace or configuration issues.

### Plan vs Reality
- Files planned: **16** (15 new + 1 modify)
- Files actually touched: **16** (15 new + 1 modify)
- Surprise files: **None** - exact match to implementation plan

### Time Sinks
- **StateSnapshot circular reference handling**: Initial attempt used `z.lazy()` for recursive state history which caused TypeScript strict mode errors. Fixed by creating separate `StateSnapshotStateSchema` that excludes `stateHistory` field. This is a documented pattern for self-referential types in Zod.
- **One lint fix (unused import)**: A single unused import required removal during lint verification. This is the now-standard minor cleanup step.

### Verification Notes
- Fast-fail caught: **Nothing** - clean implementation following established patterns
- Final verification caught: **1 unused import** - removed during lint phase
- Coverage achieved: **100% lines, 97.56% branches** - significantly exceeded 80% requirement

### Token Usage Analysis
- **Total tokens:** ~70,552 (input: ~53,089, output: ~17,463)
- **Most expensive phase:** Backend Coder (~17,306 tokens) - largest output volume due to 15 new source files + 3 test files with 86 tests
- **Most expensive sub-agent:** Backend Coder (~17,306 tokens)
- **High-cost operations:**
  - Writing test files: ~4,873 tokens (3 test files with 86 tests) - necessary, cannot be avoided
  - Writing source files: ~5,265 tokens (12 schema + utility files) - necessary, cannot be avoided
  - Reading story + plan files: ~6,460 tokens - could cache between agents
- **Redundant reads:** Story file (wrkf-1010.md) read by all 5 agents (~4,335 tokens x5 = ~21,675 tokens) - significant optimization opportunity
- **Optimization opportunities:**
  - Pass story context as summarized input rather than full file reads per agent
  - Consider streaming story context through sub-agent chain instead of re-reading
  - Implementation plan read by 3 subsequent agents (~2,125 tokens x3 = ~6,375 tokens)

### Recommendations for Future Stories
1. **Pure schema stories are efficient**: 24 ACs, 86 tests, 100% coverage in ~70k tokens. Schema-only stories with no I/O operations complete faster than handler stories of similar scope.
2. **Circular reference in Zod solved by separation**: When a schema field references its parent type (like stateHistory containing state snapshots), create a separate "inner" schema without the recursive field. This is now a documented pattern.
3. **Test-driven coverage works**: Writing tests alongside each chunk (per STORY-016 lesson) was followed here - 86 tests across 3 test files with no fix phase needed. The pattern of "write chunk, test chunk" prevented the deferred-test problem.
4. **Fresh package scaffolding accelerates follow-on stories**: WRKF-1010 benefited from WRKF-1000 running immediately before. When planning epics, sequence scaffolding stories first, then schema/model stories, then handler stories.
5. **Story file caching could save ~40% tokens**: Story file was read 5 times across agents (~21,675 tokens). A mechanism to pass story context through the agent chain would be a significant optimization.

---

## WRKF-1021: Node Execution Metrics
Date: 2026-01-24

### Reuse Discoveries
- **`RetryMetrics` pattern from `@repo/api-client`**: The metrics structure (counters, percentiles, reset) from `retry-logic.ts` provided the exact template for `NodeMetricsCollector`. The adaptation was straightforward - changing HTTP-specific concepts to node-specific ones.
- **`NodeCircuitBreaker` class pattern**: The class-based collector with internal state management from `circuit-breaker.ts` was directly reusable for the metrics collector class structure.
- **`getErrorCategory()` from error-classification**: The existing error classification function enabled seamless mapping from node errors to metrics error categories without creating new classification logic.
- **RollingWindow percentile pattern**: While the RollingWindow class was newly created (no existing implementation), the sorted-array percentile algorithm is a standard approach that was implemented based on well-known statistical patterns.

### Blockers Hit
- **None**: This was the cleanest implementation in the WRKF-10XX sequence. No blockers, no workarounds needed. The well-defined story spec following QA elaboration, established patterns from WRKF-1020 (node factory), and the `RetryMetrics` reference implementation enabled smooth execution.

### Plan vs Reality
- Files planned: **6** (2 create + 4 modify per IMPLEMENTATION-PLAN.md)
- Files actually touched: **7** (2 create + 5 modify per PROOF - added node-factory.test.ts)
- Surprise files: **node-factory.test.ts** - Integration tests for metrics with node factory were added to existing test file, not documented in original plan's file list

### Time Sinks
- **ErrorCategory naming conflict**: Initial attempt to export `ErrorCategory` from metrics.ts conflicted with existing `ErrorCategory` in `error-classification.ts`. Resolved by renaming to `MetricsErrorCategory` and `MetricsErrorCategorySchema`. This is a minor naming collision pattern that should be checked before creating new enum types.
- **Latency threshold test edge case**: Initial test for `onLatencyThreshold` failed because with a single sample, p99 equals that sample value. Test expectation had to be adjusted to account for this edge case. When testing threshold callbacks with percentiles, remember that early samples will trigger thresholds more easily.

### Verification Notes
- Fast-fail caught: **Nothing** - TypeScript compilation clean throughout
- Final verification caught: **0 errors** - All 390 tests passed, 97.64% coverage, no lint errors
- **Best implementation of WRKF sequence**: Zero post-implementation fixes required. The pattern of writing tests alongside code (learned from STORY-016) was followed correctly.

### Token Usage Analysis
- **Total tokens:** ~99,825 (input: ~78,625, output: ~21,200)
- **Most expensive phase:** Backend Coder (~32,525 tokens) - wrote 14.8KB metrics.ts + 18.5KB metrics.test.ts
- **Most expensive sub-agent:** Backend Coder (~32,525 tokens)
- **High-cost operations:**
  - Writing metrics.test.ts: ~4,625 tokens (57 comprehensive tests) - necessary for coverage
  - Writing metrics.ts: ~3,700 tokens (full collector implementation) - necessary for functionality
  - Reading reference files (retry-logic.ts, circuit-breaker.ts, node-factory.ts): ~7,494 tokens - necessary for reuse compliance
- **Redundant reads:** Story file read by 5 agents (~3,050 tokens x5 = ~15,250 tokens) - consistent with prior WRKF stories
- **Optimization opportunities:**
  - Story context passing between agents (~15k tokens potential savings)
  - LESSONS-LEARNED.md trimming to recent entries (~3k tokens savings on planner reads)
  - Implementation plan could be summarized rather than re-read by each agent

### Recommendations for Future Stories
1. **Check for naming conflicts before creating new types**: The `ErrorCategory` conflict could have been avoided by checking existing exports in the package. Run `grep -r "export.*type.*Error" src/` before creating error-related types.
2. **Follow-up stories benefit from parent story proximity**: WRKF-1021 (metrics) executing immediately after WRKF-1020 (node factory) enabled seamless integration. The node factory patterns were fresh and the metricsCollector integration point was clear.
3. **17 ACs is manageable scope**: Compared to STORY-016's 57 ACs, this story's 17 ACs completed cleanly with no fix phase. The QA elaboration that added 6 ACs (AC-12 through AC-17) kept scope reasonable while ensuring thoroughness.
4. **57 tests for a metrics module is appropriate**: The test density (~57 tests for ~200 lines of code) provided 97.64% coverage. Metrics modules need comprehensive edge case testing for percentile calculations, threshold triggers, and error category tracking.
5. **RollingWindow class pattern is reusable**: The internal `RollingWindow` class with `add(value)`, `getPercentile(p)`, and `clear()` methods can be extracted to a utility package if needed for other statistical calculations (e.g., rate limiting windows, performance monitoring).

---
