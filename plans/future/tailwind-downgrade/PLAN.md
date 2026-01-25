# PRD: Tailwind CSS v4 to v3 Downgrade

## Overview

Downgrade Tailwind CSS from v4.1.11 to v3.4.x across the monorepo to avoid v4 bugs and ensure stability.

## Problem Statement

Tailwind CSS v4 is still relatively new and has bugs that are impacting development. The v3.x line is mature and battle-tested. This migration will provide a more stable foundation while v4 matures.

## Scope

### Affected Packages (9 total)

| Package | Path |
|---------|------|
| main-app | `apps/web/main-app` |
| app-dashboard | `apps/web/app-dashboard` |
| app-inspiration-gallery | `apps/web/app-inspiration-gallery` |
| app-sets-gallery | `apps/web/app-sets-gallery` |
| app-wishlist-gallery | `apps/web/app-wishlist-gallery` |
| user-settings | `apps/web/user-settings` |
| instuctions-gallery | `apps/web/instuctions-gallery` |
| reset-password | `apps/web/reset-password` |
| app-component-library | `packages/core/app-component-library` |

### Files Requiring Changes

#### 1. Package Dependencies (9 files)

All `package.json` files need:
- `tailwindcss`: `^4.1.11` → `^3.4.17`
- Remove: `@tailwindcss/vite`
- Add: `postcss` (if not present)
- Add: `autoprefixer`

#### 2. CSS Files (8 files)

Replace v4 import syntax with v3 directives:

```css
/* v4 (current) */
@import 'tailwindcss';

/* v3 (target) */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Files:
- `apps/web/main-app/src/styles/globals.css`
- `apps/web/app-dashboard/src/styles/globals.css`
- `apps/web/app-inspiration-gallery/src/styles/globals.css`
- `apps/web/app-sets-gallery/src/styles/globals.css`
- `apps/web/app-wishlist-gallery/src/styles/globals.css`
- `apps/web/user-settings/src/styles/globals.css`
- `apps/web/instuctions-gallery/src/styles/globals.css`
- `packages/core/app-component-library/src/globals.css`

#### 3. Vite Configs (8 files)

Remove `@tailwindcss/vite` plugin:

```typescript
// v4 (current)
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})

// v3 (target) - no tailwind plugin needed, uses PostCSS
export default defineConfig({
  plugins: [react()],
})
```

#### 4. PostCSS Config (8 new files)

Create `postcss.config.js` in each app:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

#### 5. Design Tokens (1 file - CRITICAL)

`packages/core/design-system/src/design-tokens.css`

The `@theme` block (lines ~128-149) is v4-only and must be refactored:

```css
/* v4 (current) - NOT SUPPORTED IN v3 */
@theme {
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-background: hsl(var(--background));
  /* ... */
}
```

**Options:**
1. Move these to the JS preset (`tailwind-preset.js`) as `theme.extend.colors`
2. Define as standard CSS custom properties in `:root`
3. Hybrid approach using both

## Implementation Tasks

### Phase 1: Dependencies & Build Setup
- [ ] Update all 9 `package.json` files with v3 dependencies
- [ ] Create 8 `postcss.config.js` files
- [ ] Update 8 `vite.config.ts` files to remove `@tailwindcss/vite`
- [ ] Run `pnpm install` to update lockfile

### Phase 2: CSS Syntax Migration
- [ ] Update 8 globals.css files (replace `@import 'tailwindcss'`)
- [ ] Verify `@apply` and `@layer` directives still work (they should)

### Phase 3: Design System Refactor
- [ ] Audit `@theme` block in design-tokens.css
- [ ] Migrate theme variables to JS config or CSS custom properties
- [ ] Update `tailwind-preset.js` if needed
- [ ] Test color rendering matches v4 output

### Phase 4: Verification
- [ ] Build all 9 packages successfully
- [ ] Run type checks (`pnpm check-types`)
- [ ] Run linting (`pnpm lint`)
- [ ] Visual regression check on main-app
- [ ] Verify dark mode still works
- [ ] Test responsive breakpoints

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Color rendering differences | Medium | Low | OKLab → sRGB is subtle; test visually |
| Build failures | Low | High | Incremental migration, test each package |
| Missing CSS classes | Low | Medium | v3 has same utility classes |
| Dark mode breaks | Low | High | Test thoroughly; same `darkMode: ['class']` config |

## Rollback Plan

1. Keep v4 branch as backup
2. Migration should be done in a feature branch
3. If issues found post-merge, revert to v4 branch

## Estimated Effort

| Phase | Time Estimate |
|-------|---------------|
| Phase 1: Dependencies | 30 minutes |
| Phase 2: CSS Syntax | 30 minutes |
| Phase 3: Design System | 1-2 hours |
| Phase 4: Verification | 1 hour |
| **Total** | **3-4 hours** |

## Success Criteria

- [ ] All packages build without errors
- [ ] No visual regressions in UI
- [ ] Dark mode functions correctly
- [ ] All existing Tailwind classes work
- [ ] Dev server hot reload works
- [ ] Production builds are correct size (no bloat)

## Dependencies

- Tailwind CSS v3.4.17 (latest v3)
- PostCSS v8.x
- Autoprefixer v10.x
- tailwindcss-animate (already compatible with v3)

## Notes

- The JS-based `tailwind.config.ts` files are already v3-compatible
- The preset system (`@repo/design-system/tailwind-preset`) works in both versions
- No changes needed to actual component code or Tailwind class names
