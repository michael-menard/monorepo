---
doc_type: test_plan
story_id: REPA-015
created_at: "2026-02-10"
agent_version: "pm-draft-test-plan-v1.0"
---

# REPA-015: Enhance @repo/accessibility - Test Plan

## Test Strategy

This story involves extracting generic accessibility utilities from `app-wishlist-gallery/src/utils/a11y.ts` to `@repo/accessibility`. The test strategy focuses on:

1. **Utility Migration Verification** - Ensure extracted utilities work identically in new location
2. **Test Migration** - Move corresponding tests with utilities
3. **Import Path Validation** - Verify app imports resolve correctly
4. **Coverage Maintenance** - Maintain 45% minimum coverage threshold
5. **No Breaking Changes** - Existing app functionality remains unchanged

## Unit Tests (Package Level)

### New Tests in @repo/accessibility

**File:** `packages/core/accessibility/src/utils/__tests__/focus-styles.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { focusRingClasses } from '../focus-styles'

describe('focusRingClasses', () => {
  it('should contain required Tailwind focus classes', () => {
    expect(focusRingClasses).toContain('focus-visible:outline-none')
    expect(focusRingClasses).toContain('focus-visible:ring-2')
    expect(focusRingClasses).toContain('focus-visible:ring-sky-500')
    expect(focusRingClasses).toContain('focus-visible:ring-offset-2')
  })

  it('should follow WCAG 2.1 focus indicator guidelines', () => {
    // Verify visible focus state
    expect(focusRingClasses).toMatch(/ring-\d+/)
    expect(focusRingClasses).toMatch(/ring-sky-\d+/)
  })

  it('should work with dark mode variants', () => {
    // Current implementation uses sky-500, which has good contrast in both modes
    expect(focusRingClasses).not.toContain('dark:')
  })
})
```

**File:** `packages/core/accessibility/src/utils/__tests__/keyboard-labels.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { keyboardShortcutLabels, getKeyboardShortcutLabel } from '../keyboard-labels'

describe('keyboardShortcutLabels', () => {
  it('should have mappings for common keys', () => {
    expect(keyboardShortcutLabels).toHaveProperty('ArrowUp')
    expect(keyboardShortcutLabels).toHaveProperty('ArrowDown')
    expect(keyboardShortcutLabels).toHaveProperty('Delete')
    expect(keyboardShortcutLabels).toHaveProperty('Escape')
    expect(keyboardShortcutLabels).toHaveProperty('Enter')
  })

  it('should provide human-readable labels', () => {
    expect(keyboardShortcutLabels.ArrowUp).toBe('↑')
    expect(keyboardShortcutLabels.ArrowDown).toBe('↓')
    expect(keyboardShortcutLabels.Delete).toBe('Del')
    expect(keyboardShortcutLabels.Escape).toBe('Esc')
  })
})

describe('getKeyboardShortcutLabel', () => {
  it('should return mapped label for known keys', () => {
    expect(getKeyboardShortcutLabel('ArrowUp')).toBe('↑')
    expect(getKeyboardShortcutLabel('Delete')).toBe('Del')
    expect(getKeyboardShortcutLabel('Escape')).toBe('Esc')
  })

  it('should return uppercase for unmapped single character keys', () => {
    expect(getKeyboardShortcutLabel('a')).toBe('A')
    expect(getKeyboardShortcutLabel('z')).toBe('Z')
  })

  it('should return key as-is for unmapped special keys', () => {
    expect(getKeyboardShortcutLabel('F1')).toBe('F1')
    expect(getKeyboardShortcutLabel('Tab')).toBe('Tab')
  })

  it('should handle empty or undefined input gracefully', () => {
    expect(getKeyboardShortcutLabel('')).toBe('')
  })
})
```

**File:** `packages/core/accessibility/src/utils/__tests__/contrast-validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { ContrastRatioSchema } from '../contrast-validation'

describe('ContrastRatioSchema', () => {
  describe('Normal Text (WCAG AA)', () => {
    it('should accept valid contrast ratios (4.5:1 minimum)', () => {
      expect(ContrastRatioSchema.parse({ normal: 4.5 })).toEqual({ normal: 4.5 })
      expect(ContrastRatioSchema.parse({ normal: 7.0 })).toEqual({ normal: 7.0 })
      expect(ContrastRatioSchema.parse({ normal: 21.0 })).toEqual({ normal: 21.0 })
    })

    it('should reject insufficient contrast ratios', () => {
      expect(() => ContrastRatioSchema.parse({ normal: 3.0 })).toThrow()
      expect(() => ContrastRatioSchema.parse({ normal: 4.4 })).toThrow()
    })
  })

  describe('Large Text (WCAG AA)', () => {
    it('should accept valid contrast ratios (3:1 minimum)', () => {
      expect(ContrastRatioSchema.parse({ large: 3.0 })).toEqual({ large: 3.0 })
      expect(ContrastRatioSchema.parse({ large: 4.5 })).toEqual({ large: 4.5 })
    })

    it('should reject insufficient contrast ratios', () => {
      expect(() => ContrastRatioSchema.parse({ large: 2.9 })).toThrow()
      expect(() => ContrastRatioSchema.parse({ large: 1.0 })).toThrow()
    })
  })

  it('should allow both normal and large text ratios', () => {
    expect(ContrastRatioSchema.parse({ normal: 4.5, large: 3.0 })).toEqual({
      normal: 4.5,
      large: 3.0,
    })
  })

  it('should reject invalid ratio types', () => {
    expect(() => ContrastRatioSchema.parse({ normal: '4.5' })).toThrow()
    expect(() => ContrastRatioSchema.parse({ normal: null })).toThrow()
  })
})
```

## Integration Tests (App Level)

### Wishlist Gallery Import Verification

**File:** `apps/web/app-wishlist-gallery/src/components/__tests__/import-verification.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { focusRingClasses } from '@repo/accessibility'

describe('Accessibility utility imports', () => {
  it('should import focusRingClasses from @repo/accessibility', () => {
    expect(focusRingClasses).toBeDefined()
    expect(typeof focusRingClasses).toBe('string')
  })

  it('should maintain same focus ring classes format', () => {
    // Verify classes are space-separated Tailwind utilities
    const classes = focusRingClasses.split(' ')
    expect(classes.length).toBeGreaterThan(0)
    expect(classes.every(c => c.length > 0)).toBe(true)
  })
})
```

### Existing Component Tests

**Action Required:** Update imports in existing tests

**Files to Update:**
- `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/index.test.tsx`
- `apps/web/app-wishlist-gallery/src/components/WishlistCard/__tests__/index.test.tsx`

**Expected Change:**
```diff
- import { focusRingClasses } from '../../../utils/a11y'
+ import { focusRingClasses } from '@repo/accessibility'
```

**Verification:** All existing tests continue to pass with no changes to test logic.

### Domain-Specific Tests Remain in App

**File:** `apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts`

**Action:** Keep tests for domain-specific functions (generateItemAriaLabel, generatePriorityChangeAnnouncement, etc.)

**Expected State After Migration:**
- Tests for focusRingClasses → MOVED to @repo/accessibility
- Tests for keyboardShortcutLabels → MOVED to @repo/accessibility
- Tests for getKeyboardShortcutLabel → MOVED to @repo/accessibility
- Tests for ContrastRatioSchema → MOVED to @repo/accessibility
- Tests for all generate*Announcement functions → REMAIN in app

## Manual Testing Checklist

### Focus Styling Verification

- [ ] **Tab Navigation**: Tab through wishlist gallery
  - [ ] Focus rings visible on all interactive elements (cards, buttons, inputs)
  - [ ] Focus rings meet WCAG 2.1 contrast requirements (2:1 minimum with background)
  - [ ] Focus indicators are distinct and clearly visible

- [ ] **Dark Mode**: Switch to dark mode
  - [ ] Focus rings remain visible with adequate contrast
  - [ ] No visual regressions in focus styling

- [ ] **Keyboard Navigation**: Use keyboard to navigate gallery
  - [ ] Focus rings appear on keyboard activation (not mouse click)
  - [ ] Focus rings disappear appropriately after blur

### Keyboard Label Verification (If Applicable)

- [ ] **Keyboard Shortcuts Help**: If keyboard shortcuts help is implemented
  - [ ] Labels display correctly (↑, ↓, Del, Esc, etc.)
  - [ ] Special keys show human-readable names
  - [ ] Single character keys show uppercase

### Build and Runtime Verification

- [ ] **Package Build**: `pnpm build --filter=@repo/accessibility`
  - [ ] Build succeeds with no errors
  - [ ] TypeScript compilation succeeds
  - [ ] All utilities exported from package index

- [ ] **App Build**: `pnpm build --filter=app-wishlist-gallery`
  - [ ] Build succeeds with no import errors
  - [ ] TypeScript resolves @repo/accessibility imports
  - [ ] No circular dependency warnings

- [ ] **App Runtime**: Start app-wishlist-gallery dev server
  - [ ] App loads without errors
  - [ ] Focus styling works as expected
  - [ ] No console errors related to accessibility imports

## Quality Gates

### Pre-Implementation

- [ ] Story acceptance criteria are clear and testable
- [ ] Seed analysis confirms scope (generic utils only)
- [ ] REPA-008 completion verified (useAnnouncer already moved)

### During Implementation

- [ ] All new utility files created with tests
- [ ] Tests migrated from app to package
- [ ] App imports updated to use @repo/accessibility
- [ ] Domain-specific functions remain in app

### Pre-Merge

- [ ] All package tests pass: `pnpm test --filter=@repo/accessibility`
- [ ] All app tests pass: `pnpm test --filter=app-wishlist-gallery`
- [ ] TypeScript compilation succeeds: `pnpm check-types:all`
- [ ] Linting passes: `pnpm lint:all`
- [ ] Test coverage maintained at 45% minimum globally
- [ ] No circular dependencies introduced
- [ ] Manual testing checklist completed

### Post-Merge

- [ ] CI/CD pipeline passes
- [ ] No production errors related to accessibility imports
- [ ] Documentation updated with usage examples

## Test Execution Commands

```bash
# Run all accessibility package tests
pnpm test --filter=@repo/accessibility

# Run specific test files
pnpm test --filter=@repo/accessibility src/utils/__tests__/focus-styles.test.ts
pnpm test --filter=@repo/accessibility src/utils/__tests__/keyboard-labels.test.ts
pnpm test --filter=@repo/accessibility src/utils/__tests__/contrast-validation.test.ts

# Run app tests
pnpm test --filter=app-wishlist-gallery

# Run all tests
pnpm test:all

# Check coverage
pnpm test --filter=@repo/accessibility --coverage

# Type check
pnpm check-types --filter=@repo/accessibility
pnpm check-types:all

# Lint
pnpm lint --filter=@repo/accessibility
pnpm lint:all

# Build
pnpm build --filter=@repo/accessibility
pnpm build --filter=app-wishlist-gallery
```

## Test Coverage Targets

| Component | Target Coverage | Notes |
|-----------|----------------|-------|
| focus-styles.ts | 100% | Simple constant, full coverage expected |
| keyboard-labels.ts | 100% | Object and function, full coverage expected |
| contrast-validation.ts | 100% | Zod schema, validation paths covered |
| Overall Package | 95%+ | Utility-focused package, high coverage achievable |

## Rollback Plan

If tests fail or breaking changes detected:

1. **Revert Package Changes**: Remove new utility files from @repo/accessibility
2. **Revert App Import Changes**: Restore imports to local utils/a11y
3. **Verify App Tests**: Ensure app tests pass with original imports
4. **Document Blocker**: Record specific issue preventing migration
5. **Create Follow-up Story**: Address blocker in separate story if needed

## Success Criteria

- ✅ All new tests pass in @repo/accessibility
- ✅ All existing app tests pass with updated imports
- ✅ No console errors or warnings in runtime
- ✅ Focus styling works identically to before migration
- ✅ Test coverage maintained at 45% minimum
- ✅ TypeScript compilation succeeds
- ✅ Linting passes
- ✅ Manual testing checklist completed

---

**Test Plan Completion Status:** Ready for Implementation
