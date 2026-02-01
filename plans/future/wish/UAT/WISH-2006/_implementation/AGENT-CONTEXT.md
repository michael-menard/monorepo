# Agent Context - WISH-2006

## Story Context

```yaml
story_id: WISH-2006
feature_dir: plans/future/wish
mode: qa-verify
phase: setup
command: qa-verify-story
base_path: plans/future/wish/UAT/WISH-2006/
artifacts_path: plans/future/wish/UAT/WISH-2006/_implementation/
story_file: plans/future/wish/UAT/WISH-2006/WISH-2006.md
elaboration_file: plans/future/wish/UAT/WISH-2006/ELAB-WISH-2006.md
proof_file: plans/future/wish/UAT/WISH-2006/_implementation/PROOF-WISH-2006.md
verification_file: plans/future/wish/UAT/WISH-2006/_implementation/VERIFICATION.yaml
created_at: "2026-01-31T22:45:00Z"
```

## Scope Flags

```yaml
backend_impacted: false
frontend_impacted: true
infra_impacted: false
```

## Key Paths

### Source Files
- **App Root**: `apps/web/app-wishlist-gallery/`
- **Hooks Directory**: `apps/web/app-wishlist-gallery/src/hooks/`
- **Utils Directory**: `apps/web/app-wishlist-gallery/src/utils/`
- **Components**: `apps/web/app-wishlist-gallery/src/components/`
- **Pages**: `apps/web/app-wishlist-gallery/src/pages/`

### Test Files
- **Unit Tests**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/`
- **A11y Test Utils**: `apps/web/app-wishlist-gallery/src/test/a11y/`
- **Playwright E2E**: `apps/web/playwright/`

### Existing Components to Enhance
- `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
- `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
- `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/index.tsx`
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

## Implementation Phases

1. **Phase 0 (Setup)**: Create SCOPE.md, AGENT-CONTEXT.md (current)
2. **Phase 1 (Planning)**: Create IMPLEMENTATION-PLAN.md
3. **Phase 2 (Implementation)**: Create hooks, utilities, enhance components
4. **Phase 3 (Verification)**: Run tests, validate accessibility
5. **Phase 4 (Documentation)**: Create PROOF, write CHECKPOINT.md

## Architecture Decisions

Per ELAB-WISH-2006.md:

1. **Grid Column Detection**: Use CSS Grid `auto-fill` with ResizeObserver for responsive column detection
2. **Keyboard Shortcut Scope**: Gallery-scoped activation (shortcuts only active when gallery container has focus)
3. **Package Reuse**: Existing @repo/accessibility exports are drag-and-drop specific. New hooks will be created app-local first in `src/hooks/`

## Acceptance Criteria Summary

### Keyboard Navigation
- Arrow keys (Up/Down/Left/Right) navigate 2D gallery grid
- Tab enters gallery, Home/End jump to first/last item
- Only one item has tabindex="0" (roving tabindex pattern)
- Visible focus indicator with design system token

### Keyboard Shortcuts (Gallery-scoped)
- `A` - Add Item modal
- `Enter` - Detail view
- `G` - Got It modal
- `Delete` - Delete confirmation
- `Escape` - Close modal

### Screen Reader Support
- aria-live regions for state change announcements
- ARIA labels on all interactive elements
- Modal focus trap and focus return

### WCAG AA Compliance
- 4.5:1 contrast ratio for normal text
- 3:1 contrast ratio for large text
- axe-core automated scan passes
