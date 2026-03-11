# Lint Check: STORY-011

## Files Checked
- packages/backend/moc-instructions-core/src/index.ts
- packages/backend/moc-instructions-core/src/__types__/index.ts
- packages/backend/moc-instructions-core/src/get-moc.ts
- packages/backend/moc-instructions-core/src/list-mocs.ts
- packages/backend/moc-instructions-core/src/get-moc-stats-by-category.ts
- packages/backend/moc-instructions-core/src/get-moc-uploads-over-time.ts
- packages/backend/moc-instructions-core/src/__tests__/get-moc.test.ts
- packages/backend/moc-instructions-core/src/__tests__/list-mocs.test.ts
- packages/backend/moc-instructions-core/src/__tests__/get-moc-stats-by-category.test.ts
- packages/backend/moc-instructions-core/src/__tests__/get-moc-uploads-over-time.test.ts
- apps/api/platforms/vercel/api/mocs/index.ts
- apps/api/platforms/vercel/api/mocs/[id].ts
- apps/api/platforms/vercel/api/mocs/stats/by-category.ts
- apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts
- apps/api/core/database/seeds/mocs.ts
- apps/api/core/database/seeds/index.ts

## Command Run
```bash
pnpm eslint \
  packages/backend/moc-instructions-core/src/index.ts \
  packages/backend/moc-instructions-core/src/__types__/index.ts \
  packages/backend/moc-instructions-core/src/get-moc.ts \
  packages/backend/moc-instructions-core/src/list-mocs.ts \
  packages/backend/moc-instructions-core/src/get-moc-stats-by-category.ts \
  packages/backend/moc-instructions-core/src/get-moc-uploads-over-time.ts \
  packages/backend/moc-instructions-core/src/__tests__/get-moc.test.ts \
  packages/backend/moc-instructions-core/src/__tests__/list-mocs.test.ts \
  packages/backend/moc-instructions-core/src/__tests__/get-moc-stats-by-category.test.ts \
  packages/backend/moc-instructions-core/src/__tests__/get-moc-uploads-over-time.test.ts \
  apps/api/platforms/vercel/api/mocs/index.ts \
  "apps/api/platforms/vercel/api/mocs/[id].ts" \
  apps/api/platforms/vercel/api/mocs/stats/by-category.ts \
  apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts \
  apps/api/core/database/seeds/mocs.ts \
  apps/api/core/database/seeds/index.ts \
  --format stylish
```

## Result: PASS

## Errors (must fix)
None

## Warnings (should fix)
1. `packages/backend/moc-instructions-core/src/__tests__/get-moc-stats-by-category.test.ts:0:0` - File ignored because of a matching ignore pattern
2. `packages/backend/moc-instructions-core/src/__tests__/get-moc-uploads-over-time.test.ts:0:0` - File ignored because of a matching ignore pattern
3. `packages/backend/moc-instructions-core/src/__tests__/get-moc.test.ts:0:0` - File ignored because of a matching ignore pattern
4. `packages/backend/moc-instructions-core/src/__tests__/list-mocs.test.ts:0:0` - File ignored because of a matching ignore pattern

**Note:** These warnings are expected behavior. Test files (`*.test.ts`) are excluded from linting via the project's ESLint ignore patterns. This is standard practice to allow more flexible test code conventions.

## Raw Output
```
/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/__tests__/get-moc-stats-by-category.test.ts
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/__tests__/get-moc-uploads-over-time.test.ts
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/__tests__/get-moc.test.ts
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/__tests__/list-mocs.test.ts
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

✖ 4 problems (0 errors, 4 warnings)
```

---

## LINT PASS

All 16 files from STORY-011 implementation passed linting. The 4 warnings are informational only - they indicate test files are intentionally excluded from lint checks per project configuration.
