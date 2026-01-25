# Lint Check: STORY-007

## Files Checked
- `packages/backend/gallery-core/src/__types__/index.ts`
- `packages/backend/gallery-core/src/get-image.ts`
- `packages/backend/gallery-core/src/list-images.ts`
- `packages/backend/gallery-core/src/search-images.ts`
- `packages/backend/gallery-core/src/flag-image.ts`
- `packages/backend/gallery-core/src/index.ts`
- `apps/api/platforms/vercel/api/gallery/images/[id].ts`
- `apps/api/platforms/vercel/api/gallery/images/index.ts`
- `apps/api/platforms/vercel/api/gallery/images/search.ts`
- `apps/api/platforms/vercel/api/gallery/images/flag.ts`
- `apps/api/core/database/seeds/gallery.ts`

## Command Run
```bash
pnpm eslint \
  packages/backend/gallery-core/src/__types__/index.ts \
  packages/backend/gallery-core/src/get-image.ts \
  packages/backend/gallery-core/src/list-images.ts \
  packages/backend/gallery-core/src/search-images.ts \
  packages/backend/gallery-core/src/flag-image.ts \
  packages/backend/gallery-core/src/index.ts \
  "apps/api/platforms/vercel/api/gallery/images/[id].ts" \
  apps/api/platforms/vercel/api/gallery/images/index.ts \
  apps/api/platforms/vercel/api/gallery/images/search.ts \
  apps/api/platforms/vercel/api/gallery/images/flag.ts \
  apps/api/core/database/seeds/gallery.ts \
  --format stylish
```

## Result: PASS

## Errors (must fix)
None

## Warnings (should fix)
None

## Raw Output
```
(no output - all files passed lint checks with exit code 0)
```

---

**LINT PASS**
