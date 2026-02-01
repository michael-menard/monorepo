# Scope - WISH-2006

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | Frontend-only accessibility story - no API changes |
| frontend | true | Creates accessibility hooks, enhances WishlistGallery/WishlistCard with keyboard navigation and ARIA support |
| infra | false | No infrastructure changes required |

## Scope Summary

This story adds comprehensive keyboard navigation and screen reader support to the wishlist gallery. The implementation creates three new React hooks (useRovingTabIndex, useKeyboardShortcuts, useAnnouncer), accessibility utilities, and enhances existing gallery components with ARIA labels and focus management - all within the app-wishlist-gallery package with no backend or infrastructure changes.

## Key Implementation Areas

### New Files to Create

1. **Accessibility Hooks** (`apps/web/app-wishlist-gallery/src/hooks/`):
   - `useRovingTabIndex.ts` - 2D grid keyboard navigation with arrow keys
   - `useKeyboardShortcuts.ts` - Gallery-scoped keyboard shortcut manager
   - `useAnnouncer.ts` - Screen reader live region manager

2. **Accessibility Utilities** (`apps/web/app-wishlist-gallery/src/utils/`):
   - `a11y.ts` - ARIA label generators and accessibility helpers

3. **Unit Tests** (`apps/web/app-wishlist-gallery/src/hooks/__tests__/`):
   - `useRovingTabIndex.test.ts`
   - `useKeyboardShortcuts.test.ts`
   - `useAnnouncer.test.ts`

### Existing Files to Enhance

1. **Components**:
   - `WishlistCard/index.tsx` - Add tabIndex props, focus styles, ARIA labels
   - `DraggableWishlistGallery/index.tsx` - Integrate roving tabindex and keyboard shortcuts
   - `GotItModal/index.tsx` - Verify focus trap (already uses Radix Dialog)
   - `DeleteConfirmModal/index.tsx` - Verify focus trap (already uses Radix AlertDialog)

2. **Pages**:
   - `main-page.tsx` - Add keyboard shortcut integration, screen reader announcements

## Dependencies

- Uses existing Radix UI Dialog/AlertDialog primitives (focus trap built-in)
- Uses existing keyboard test utilities in `src/test/a11y/keyboard.ts`
- Uses existing axe test infrastructure in `src/test/a11y/axe.ts`
