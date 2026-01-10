# Story glry-1004: View Mode State Infrastructure

## Status

Completed

## Story

**As a** developer building the gallery datatable feature,
**I want** view mode state management infrastructure in place,
**so that** I can build the toggle UI and datatable components on a solid foundation.

## Acceptance Criteria

1. ViewMode type defined as `'grid' | 'datatable'` with Zod schema
2. View mode state added to gallery state management (extensible for future `'masonry'` mode)
3. localStorage persistence implemented per gallery type (e.g., `gallery_view_mode_wishlist`, `gallery_view_mode_sets`, `gallery_view_mode_mocs`)
4. Preference fallback order: localStorage → URL param → default `'grid'`
5. TypeScript strict mode compatibility - no `any` types
6. Works with existing gallery hooks and state management
7. No UI components in this story - pure state infrastructure
8. Exports all types and utilities from `@repo/gallery` package

## Tasks / Subtasks

### Task 1: Create ViewMode Zod Schema and Types (AC: 1, 5)

- [ ] Create `packages/core/gallery/src/types/view-mode.ts`
- [ ] Define `ViewModeSchema` using Zod: `z.enum(['grid', 'datatable'])`
- [ ] Infer `ViewMode` type from schema: `type ViewMode = z.infer<typeof ViewModeSchema>`
- [ ] Export schema and type from `packages/core/gallery/src/types/index.ts`
- [ ] Add JSDoc comments explaining extensibility for future `'masonry'` mode

### Task 2: Create View Mode Persistence Utility (AC: 3, 4)

- [ ] Create `packages/core/gallery/src/utils/view-mode-storage.ts`
- [ ] Implement `getViewModeStorageKey(galleryType: string)` function
  - Returns `gallery_view_mode_{galleryType}` (e.g., `gallery_view_mode_wishlist`)
- [ ] Implement `getViewModeFromStorage(galleryType: string)` function
  - Reads from localStorage using storage key
  - Returns `ViewMode | null`
  - Handles invalid values gracefully (returns `null`)
- [ ] Implement `saveViewModeToStorage(galleryType: string, mode: ViewMode)` function
  - Writes to localStorage using storage key
  - Handles storage quota errors gracefully
- [ ] Add try-catch for `localStorage` unavailability (private browsing mode)
- [ ] Export utilities from `packages/core/gallery/src/utils/index.ts`

### Task 3: Update Gallery State with View Mode (AC: 2, 6)

- [ ] Update existing gallery state interface to include `viewMode: ViewMode`
- [ ] Set default `viewMode` to `'grid'` in initial state
- [ ] Add view mode to URL state management if applicable
- [ ] Ensure view mode works with existing `useGalleryState` hook
- [ ] Update gallery state types to include view mode field

### Task 4: Create useViewMode Custom Hook (AC: 4, 6, 7)

- [ ] Create `packages/core/gallery/src/hooks/useViewMode.ts`
- [ ] Implement `useViewMode(galleryType: string)` hook
  - Reads view mode from localStorage on mount
  - Falls back to URL param if localStorage empty
  - Falls back to `'grid'` if both empty
  - Returns `[viewMode, setViewMode]` tuple (similar to `useState`)
- [ ] Implement `setViewMode` function
  - Updates local state
  - Persists to localStorage
  - Optionally syncs to URL state
- [ ] Add TypeScript generics for type safety
- [ ] Export hook from `packages/core/gallery/src/hooks/index.ts`

### Task 5: Write Comprehensive Tests (AC: 1-6)

- [ ] Create `packages/core/gallery/src/__tests__/view-mode.test.ts`
- [ ] Test ViewModeSchema validates `'grid'` and `'datatable'`
- [ ] Test ViewModeSchema rejects invalid values
- [ ] Test `getViewModeStorageKey` generates correct keys
- [ ] Test `getViewModeFromStorage` reads from localStorage
- [ ] Test `getViewModeFromStorage` handles invalid values gracefully
- [ ] Test `saveViewModeToStorage` writes to localStorage
- [ ] Test `saveViewModeToStorage` handles storage quota errors
- [ ] Test `useViewMode` hook reads from localStorage on mount
- [ ] Test `useViewMode` hook falls back to default when localStorage empty
- [ ] Test `useViewMode` hook persists changes to localStorage
- [ ] Mock localStorage for all tests (avoid actual storage usage)
- [ ] Achieve minimum 80% coverage

### Task 6: Update Package Exports (AC: 8)

- [ ] Export ViewMode types from `packages/core/gallery/src/index.ts`
- [ ] Export view mode utilities from package root
- [ ] Export `useViewMode` hook from package root
- [ ] Verify exports work correctly with `import { ViewMode, useViewMode } from '@repo/gallery'`
- [ ] Update package README if it exists

## Dev Notes

### Technology Stack

[Source: docs/architecture/tech-stack.md]

- **React**: 19.0.0 - Functional components with hooks
- **TypeScript**: Strict mode enabled, no `any` types
- **Zod**: Latest - Schema validation and type inference (REQUIRED for all types)
- **Vitest**: 3.0.5 - Unit testing framework
- **React Testing Library**: Latest - Component testing

### Coding Standards

[Source: docs/architecture/coding-standards.md]

**CRITICAL: This codebase follows functional programming with modern ES7+ syntax**

- **NO CLASSES**: Use pure functions, closures, factory functions
- **Arrow Functions**: Preferred for all non-component functions
- **NO Barrel Files**: Import directly from source files
- **Zod-First Types**: ALWAYS use Zod schemas with `z.infer<>`, never use `interface` without Zod
- **NO console.log**: Use `@repo/logger` for all logging
- **Immutability**: Never mutate state directly

**Example - Correct Functional Approach:**
```typescript
// ✅ REQUIRED - Functional approach
const createViewModeStorage = () => {
  const getStorageKey = (galleryType: string) => `gallery_view_mode_${galleryType}`

  return {
    get: (galleryType: string): ViewMode | null => {
      // Implementation
    },
    save: (galleryType: string, mode: ViewMode): void => {
      // Implementation
    },
  }
}

// ❌ PROHIBITED - Class-based approach
class ViewModeStorage {
  getStorageKey(galleryType: string) { /* ... */ }
  get(galleryType: string) { /* ... */ }
}
```

### File Locations

[Source: docs/architecture/source-tree.md]

**Gallery Package Structure:**
```
packages/core/gallery/
├── src/
│   ├── components/          # React components (existing)
│   ├── hooks/               # Custom React hooks
│   │   └── useViewMode.ts   # NEW - View mode hook
│   ├── types/               # Type definitions
│   │   ├── index.ts         # Existing exports
│   │   └── view-mode.ts     # NEW - ViewMode schema and type
│   ├── utils/               # Utility functions
│   │   ├── index.ts         # Existing exports
│   │   └── view-mode-storage.ts  # NEW - localStorage utilities
│   ├── __tests__/           # Test files
│   │   └── view-mode.test.ts     # NEW - View mode tests
│   └── index.ts             # Package exports
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Zod Schema Pattern

[Source: docs/architecture/coding-standards.md#zod-schemas--inferred-types]

**REQUIRED Pattern for All Types:**
```typescript
import { z } from 'zod'

// ✅ Zod schema with inferred type
export const ViewModeSchema = z.enum(['grid', 'datatable'])
export type ViewMode = z.infer<typeof ViewModeSchema>

// Validation at boundaries
const viewMode = ViewModeSchema.parse(storageValue)

// ❌ NEVER use interface without Zod
interface ViewMode {
  // This is prohibited in this codebase
}
```

### localStorage Best Practices

**Storage Key Pattern:**
- Use descriptive, prefixed keys: `gallery_view_mode_{galleryType}`
- Avoid collisions with other app features
- Make keys easily searchable in DevTools

**Error Handling:**
```typescript
const getViewMode = (galleryType: string): ViewMode | null => {
  try {
    const key = `gallery_view_mode_${galleryType}`
    const stored = localStorage.getItem(key)
    if (!stored) return null

    // Validate with Zod before returning
    return ViewModeSchema.parse(stored)
  } catch (error) {
    // Handle localStorage unavailable (private mode)
    // Handle invalid stored values
    logger.warn('Failed to read view mode from storage', { error, galleryType })
    return null
  }
}
```

### React Hooks Pattern

[Source: docs/architecture/coding-standards.md#react-hooks-best-practices]

**Custom Hook Requirements:**
- Name starts with `use`
- Extract complex logic from components
- Return tuple for state-like hooks: `[value, setValue]`
- Use descriptive parameter names
- Add TypeScript types

**Example Pattern:**
```typescript
export const useViewMode = (galleryType: string): [ViewMode, (mode: ViewMode) => void] => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Initialize from localStorage
    return getViewModeFromStorage(galleryType) ?? 'grid'
  })

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    saveViewModeToStorage(galleryType, mode)
  }, [galleryType])

  return [viewMode, setViewMode]
}
```

### Integration with Existing Gallery Code

The gallery package already has:
- `GalleryGrid` component
- `GalleryCard` component
- `GalleryFilterBar` component
- Various filter and state management utilities

This story adds **only the state infrastructure**. The UI toggle component comes in the next story (glry-1005).

**Do NOT modify existing components in this story** - only add new files for view mode state management.

### Previous Story Context

**No previous story** - this is the first story in the datatable epic. The gallery package exists from previous work (Epic 3.0), but view mode functionality is entirely new.

## Testing

[Source: docs/architecture/testing-strategy.md]

### Test Framework

- **Vitest** with React Testing Library
- Test files: `__tests__/view-mode.test.ts`
- Minimum coverage: 80% for new code
- Use `vi.mock()` for localStorage

### Test Patterns Required

**Unit Test Structure:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ViewModeSchema, getViewModeFromStorage, saveViewModeToStorage } from '../'

describe('ViewMode Infrastructure', () => {
  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorage.clear()
  })

  describe('ViewModeSchema', () => {
    it('validates grid mode', () => {
      expect(ViewModeSchema.parse('grid')).toBe('grid')
    })

    it('validates datatable mode', () => {
      expect(ViewModeSchema.parse('datatable')).toBe('datatable')
    })

    it('rejects invalid modes', () => {
      expect(() => ViewModeSchema.parse('invalid')).toThrow()
    })
  })

  describe('localStorage utilities', () => {
    it('reads view mode from storage', () => {
      localStorage.setItem('gallery_view_mode_wishlist', 'datatable')
      const result = getViewModeFromStorage('wishlist')
      expect(result).toBe('datatable')
    })

    it('handles missing storage gracefully', () => {
      const result = getViewModeFromStorage('wishlist')
      expect(result).toBeNull()
    })

    it('handles invalid storage values', () => {
      localStorage.setItem('gallery_view_mode_wishlist', 'invalid')
      const result = getViewModeFromStorage('wishlist')
      expect(result).toBeNull()
    })
  })
})
```

**Hook Test Pattern:**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useViewMode } from '../hooks/useViewMode'

describe('useViewMode hook', () => {
  it('initializes from localStorage', () => {
    localStorage.setItem('gallery_view_mode_wishlist', 'datatable')
    const { result } = renderHook(() => useViewMode('wishlist'))
    expect(result.current[0]).toBe('datatable')
  })

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useViewMode('wishlist'))

    act(() => {
      result.current[1]('datatable')
    })

    expect(localStorage.getItem('gallery_view_mode_wishlist')).toBe('datatable')
  })

  it('falls back to grid when localStorage empty', () => {
    const { result } = renderHook(() => useViewMode('wishlist'))
    expect(result.current[0]).toBe('grid')
  })
})
```

### localStorage Mock Setup

```typescript
// src/__tests__/setup.ts
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] ViewMode Zod schema created and exported
- [ ] localStorage utilities created and tested
- [ ] `useViewMode` custom hook implemented
- [ ] All tests passing (minimum 80% coverage)
- [ ] TypeScript compilation succeeds with no errors
- [ ] No console.log statements (use @repo/logger if logging needed)
- [ ] Exports verified from `@repo/gallery` package
- [ ] Code follows functional programming paradigm (no classes)
- [ ] All imports are direct (no barrel files)

---

## Change Log

|| Date       | Version | Description                       | Author |
|| ---------- | ------- | --------------------------------- | ------ |
|| 2025-12-28 | 0.1     | Initial draft for glry-1004 story | Bob (SM) |
|| 2026-01-10 | 0.2     | Implemented ViewMode schema, view-mode storage utilities, useViewMode hook, tests, and exports; marked story as Completed | Dev Agent |
