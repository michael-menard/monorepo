# Execute Phase Context - INST-1100

## Story
INST-1100: View MOC Gallery

## Phase
execute

## Implementation Plan Summary
Based on PLAN.yaml, the following steps need to be executed:

1. Update main-page.tsx to use GallerySkeleton for loading states
2. Verify InstructionCard displays thumbnail, title, piece count, theme
3. Fix schema alignment - access data.items instead of data.data.items
4. Verify responsive grid breakpoints match requirements
5. Add comprehensive unit tests for main-page.tsx
6. Add integration tests with MSW for API interaction
7. Add unit tests for InstructionCard component
8. Create E2E test feature file for gallery MVP
9. Verify /mocs route is wired in main-app router
10. Add accessibility attributes to gallery page

## Key Issues Identified
- Schema alignment: Current code accesses data.data.items, should be data.items
- Loading state uses text, not GallerySkeleton component
- Test coverage is minimal

## Files to Modify
- apps/web/app-instructions-gallery/src/pages/main-page.tsx
- apps/web/app-instructions-gallery/src/components/InstructionCard/index.tsx
- apps/web/main-app/src/routes/index.ts

## Files to Create
- apps/web/app-instructions-gallery/src/pages/__tests__/main-page.test.tsx
- apps/web/app-instructions-gallery/src/pages/__tests__/main-page.integration.test.tsx
- apps/web/app-instructions-gallery/src/components/InstructionCard/__tests__/InstructionCard.test.tsx
- apps/web/playwright/tests/instructions/inst-1100-gallery.spec.ts

## Quality Gates
- pnpm build --filter app-instructions-gallery
- pnpm check-types --filter app-instructions-gallery
- pnpm lint --filter app-instructions-gallery
- pnpm test --filter app-instructions-gallery
- pnpm test:e2e tests/instructions/inst-1100-gallery.spec.ts

