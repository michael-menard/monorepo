# UI Package Reorganization Plan

## Status

Draft

## Overview

Reorganize `packages/core/ui` to separate base shadcn components from customized app-specific components and establish a clear directory structure.

## Current Issues

1. **Duplicate `src/ui/` subdirectory** - Contains copies of alert, badge, button, card, tabs
2. **Flat structure with 227 files** - No organization by category
3. **Mixed naming conventions** - PascalCase vs kebab-case
4. **Examples/demos in production code** - 7+ example files exported from index.ts
5. **19 Storybook files in root src/** - Should be colocated or in separate folder

## Design Principles

1. **Keep `.d.ts` files** - Useful for IDE support during development
2. **All app-components must extend base** - Composition over duplication (no copying shadcn code)
3. **Clear separation** - `base/` for shadcn, `app-components/` for customized

## Component Extension Requirements

All components in `app-components/` **MUST** extend or compose base shadcn components from `base/`. This ensures:
- Consistent styling through shadcn's variant system
- Single source of truth for base component behavior
- Easier maintenance when updating shadcn

### Extension Patterns

```typescript
// CORRECT: AppInput extends base Input
import { Input, type InputProps } from '../base/primitives/input'

export interface AppInputProps extends InputProps {
  sanitize?: boolean
}

export function AppInput({ sanitize = true, ...props }: AppInputProps) {
  // Add app-specific logic, then delegate to base
  return <Input {...props} />
}

// CORRECT: AppCard composes base Card
import { Card, CardHeader, CardContent } from '../base/layout/card'

export function AppCard({ children, ...props }: AppCardProps) {
  return (
    <Card {...props}>
      <CardHeader>...</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// WRONG: Duplicating shadcn component code
export function AppButton({ ... }) {
  // Don't copy Button implementation here
}
```

### Current Extension Audit

| Component | Extends | Status |
| --------- | ------- | ------ |
| AppInput | Input | OK |
| AppTextarea | Textarea | OK |
| AppLabel | Label | OK |
| AppSelect | Select | OK |
| AppCard | Card | OK |
| AppAvatar | Avatar | OK |
| custom-button | Button | OK |
| skeleton | Skeleton | OK |
| error-boundary-specialized | ErrorBoundary | OK |
| AppForm | native form | **REVIEW** - should extend form.tsx |

## Proposed Directory Structure

```
packages/core/ui/src/
├── base/                          # Base shadcn components (Radix wrappers)
│   ├── primitives/                # Core building blocks
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── switch.tsx
│   │   ├── slider.tsx
│   │   ├── toggle.tsx
│   │   ├── toggle-group.tsx
│   │   └── separator.tsx
│   │
│   ├── layout/                    # Layout components
│   │   ├── card.tsx
│   │   ├── scroll-area.tsx
│   │   └── collapsible.tsx
│   │
│   ├── overlay/                   # Overlay/modal components
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── popover.tsx
│   │   ├── tooltip.tsx
│   │   ├── hover-card.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── context-menu.tsx
│   │
│   ├── navigation/                # Navigation components
│   │   ├── tabs.tsx
│   │   ├── accordion.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   └── command.tsx
│   │
│   ├── data-display/              # Data display components
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   ├── progress.tsx
│   │   └── alert.tsx
│   │
│   ├── form/                      # Form infrastructure
│   │   ├── form.tsx               # react-hook-form integration
│   │   └── select.tsx
│   │
│   └── index.ts                   # Base component exports
│
├── app-components/                # Customized app-specific components
│   ├── inputs/                    # Sanitized input components
│   │   ├── app-input.tsx
│   │   ├── app-textarea.tsx
│   │   ├── app-label.tsx
│   │   ├── app-select.tsx
│   │   └── index.ts
│   │
│   ├── forms/                     # Enhanced form components
│   │   ├── app-form.tsx
│   │   ├── form-error-message.tsx
│   │   ├── form-section.tsx
│   │   ├── validation-messages.ts
│   │   └── index.ts
│   │
│   ├── cards/                     # Card variants
│   │   ├── app-card.tsx
│   │   ├── stats-cards.tsx
│   │   └── index.ts
│   │
│   ├── avatars/                   # Avatar with features
│   │   ├── app-avatar.tsx
│   │   └── index.ts
│   │
│   ├── content/                   # Content display
│   │   ├── app-safe-content.tsx
│   │   ├── page-header.tsx
│   │   └── index.ts
│   │
│   ├── buttons/                   # Button variants
│   │   ├── custom-button.tsx
│   │   └── index.ts
│   │
│   ├── feedback/                  # Loading & progress
│   │   ├── skeleton.tsx
│   │   ├── progress-indicator.tsx
│   │   ├── loading-spinner.tsx
│   │   └── index.ts
│   │
│   ├── errors/                    # Error handling
│   │   ├── error-boundary.tsx
│   │   ├── error-boundary-specialized.tsx
│   │   └── index.ts
│   │
│   ├── notifications/             # Toast/notifications
│   │   ├── toaster.tsx            # renamed from sonner.tsx
│   │   ├── toast-utils.ts
│   │   └── index.ts
│   │
│   ├── selects/                   # Advanced select components
│   │   ├── multi-select.tsx
│   │   └── index.ts
│   │
│   ├── dialogs/                   # Dialog variants
│   │   ├── confirmation-dialog.tsx
│   │   └── index.ts
│   │
│   ├── data/                      # Data display
│   │   ├── app-data-table.tsx
│   │   ├── tab-panel.tsx
│   │   └── index.ts
│   │
│   ├── tour/                      # Onboarding
│   │   ├── guided-tour.tsx
│   │   └── index.ts
│   │
│   └── index.ts                   # App component exports
│
├── providers/                     # Context providers
│   ├── theme-provider.tsx
│   ├── keyboard-navigation-provider.tsx
│   └── index.ts
│
├── hooks/                         # Custom hooks
│   ├── use-loading-states.ts
│   ├── use-toast.ts
│   └── index.ts
│
├── lib/                           # Utilities
│   ├── utils.ts                   # cn() and helpers
│   ├── sanitization.ts            # DOMPurify integration
│   └── keyboard-navigation.ts     # ARIA helpers
│
├── components/                    # Standalone components (ThemeToggle)
│   └── theme-toggle.tsx
│
├── __tests__/                     # Test files
│   └── *.test.tsx
│
├── __stories__/                   # Storybook files (optional, can stay colocated)
│   └── *.stories.tsx
│
├── __examples__/                  # Example files (not exported)
│   └── *.example.tsx
│
└── index.ts                       # Main barrel export
```

## Naming Convention

- **kebab-case for all files**: `app-input.tsx`, `error-boundary.tsx`
- **PascalCase for exports**: `AppInput`, `ErrorBoundary`
- **Prefix custom components with `App`**: Clearly distinguishes from base

## Export Strategy

### Main `index.ts`
```typescript
// Re-export everything from base and app-components
export * from './base'
export * from './app-components'
export * from './providers'
export * from './hooks'
export { cn } from './lib/utils'

// DO NOT export examples, demos, or stories
```

### `base/index.ts`
```typescript
// Primitives
export { Button, buttonVariants } from './primitives/button'
export { Input } from './primitives/input'
// ... etc

// Layout
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './layout/card'
// ... etc
```

### `app-components/index.ts`
```typescript
// Inputs
export { AppInput } from './inputs/app-input'
export type { AppInputProps } from './inputs/app-input'
// ... etc

// Cards
export { AppCard } from './cards/app-card'
export { StatsCards } from './cards/stats-cards'
export type { StatsCardsProps, StatItem } from './cards/stats-cards'
// ... etc
```

## Package.json Exports Update

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./base": {
      "import": "./dist/base/index.js",
      "types": "./dist/base/index.d.ts"
    },
    "./app-components": {
      "import": "./dist/app-components/index.js",
      "types": "./dist/app-components/index.d.ts"
    },
    "./providers": {
      "import": "./dist/providers/index.js",
      "types": "./dist/providers/index.d.ts"
    },
    "./hooks": {
      "import": "./dist/hooks/index.js",
      "types": "./dist/hooks/index.d.ts"
    },
    "./globals.css": "./src/globals.css"
  }
}
```

## Migration Tasks

### Phase 1: Cleanup
- [ ] Delete duplicate `src/ui/` subdirectory
- [ ] Remove any stale `.js` build artifacts from `src/`
- [ ] Keep `.d.ts` files (useful for IDE support)

### Phase 2: Create Directory Structure
- [ ] Create `base/` subdirectories (primitives, layout, overlay, navigation, data-display, form)
- [ ] Create `app-components/` subdirectories
- [ ] Create `__stories__/` and `__examples__/` directories

### Phase 3: Move Base Components
- [ ] Move shadcn components to appropriate `base/` subdirectories
- [ ] Rename files to kebab-case where needed
- [ ] Create `base/index.ts` with proper exports

### Phase 4: Move App Components
- [ ] Move App* components to appropriate `app-components/` subdirectories
- [ ] Rename files to kebab-case (AppInput.tsx -> app-input.tsx)
- [ ] Update imports within moved files to reference `../base/`
- [ ] Verify each component extends its base counterpart
- [ ] Create `app-components/index.ts` with proper exports

### Phase 5: Move Supporting Files
- [ ] Move stories to `__stories__/` or keep colocated (decide)
- [ ] Move examples to `__examples__/`
- [ ] Move hooks to `hooks/`
- [ ] Move providers to `providers/`

### Phase 6: Update Exports
- [ ] Update main `index.ts`
- [ ] Update `package.json` exports
- [ ] Remove example exports from main index

### Phase 7: Update Consumers
- [ ] Update imports in `apps/web/main-app`
- [ ] Update imports in `apps/web/app-dashboard`
- [ ] Update test mocks in consumer apps
- [ ] Run full test suite

### Phase 8: Validation
- [ ] Build package successfully
- [ ] All tests pass
- [ ] Storybook works
- [ ] Consumer apps build and run

## Files to Delete

```
# Duplicate ui/ subdirectory
src/ui/

# .js files in src (if any build artifacts)
src/loading-spinner/index.js
```

## Files to Keep

```
# .d.ts files - useful for IDE support during development
src/*.d.ts
src/**/*.d.ts
```

## Breaking Changes

This reorganization maintains backward compatibility:
- All exports remain available from main `@repo/ui` import
- New subpath exports (`@repo/ui/base`, `@repo/ui/app-components`) are additive
- No component APIs change

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial plan  | Dev Agent |
| 2025-11-30 | 0.2     | Renamed custom/ to app-components/, keep .d.ts files, added extension requirements | Dev Agent |
