# Knowledge Base Entries Needed - REPA-020

These non-blocking findings should be logged to the knowledge base for future reference.

---

## Entry 1: Factory Memoization Documentation

**Type**: finding
**Category**: performance
**Tags**: optimization, future-work, performance
**Story**: REPA-020
**Stage**: elab

**Content**:
- **Finding**: Factory memoization not documented in factory JSDoc or README
- **Impact**: Low - Performance optimization for large galleries (100+ items)
- **Effort**: Low - Add useMemo example to JSDoc
- **Recommendation**: Add memoization example showing how callers can optimize re-renders:
  ```typescript
  const cardProps = useMemo(
    () => createInstructionCard(instruction, { onClick, onFavorite, onEdit }),
    [instruction, onClick, onFavorite, onEdit]
  )
  ```

---

## Entry 2: Price Formatting Utility Duplication

**Type**: finding
**Category**: future-opportunities
**Tags**: code-reuse, refactoring, future-work
**Story**: REPA-020
**Stage**: elab

**Content**:
- **Finding**: Price formatting utility not shared between WishlistCard and factory
- **Impact**: Medium - Duplication of formatting logic (currency symbol, decimal places)
- **Effort**: Low - Extract to @repo/app-component-library or shared utility
- **Recommendation**: Create `formatPrice(amount: number, currency?: string): string` utility and use in both WishlistCard component and createWishlistCard factory

---

## Entry 3: Image Fallback Logic Duplication

**Type**: finding
**Category**: future-opportunities
**Tags**: code-reuse, refactoring, future-work
**Story**: REPA-020
**Stage**: elab

**Content**:
- **Finding**: Image fallback logic (thumbnail → image → placeholder) duplicated in every factory
- **Impact**: Medium - Pattern repeated 4 times (once per factory)
- **Effort**: Low - Extract utility function
- **Recommendation**: Create `getCardImage(item: { thumbnailUrl?: string, imageUrl?: string }): string` utility function that encapsulates fallback logic. Use in all factories.

---

## Entry 4: Badge Variant Mapping Not Standardized

**Type**: finding
**Category**: ux-polish
**Tags**: ux-polish, consistency, future-work
**Story**: REPA-020
**Stage**: elab

**Content**:
- **Finding**: Badge variant mapping not standardized (build status, priority, theme badges use different variants)
- **Impact**: Low - Inconsistent badge colors across domains
- **Effort**: Medium - Create type-safe mapping and update all usages
- **Recommendation**: Create `BadgeVariantMap` type and standard mappings:
  ```typescript
  const statusVariantMap: Record<BuildStatus, BadgeVariant> = {
    built: 'default',
    'in-progress': 'secondary',
    'not-started': 'outline',
  }
  ```

---

## Entry 5: Storybook Accessibility Tests Not Mentioned

**Type**: finding
**Category**: quality
**Tags**: accessibility, testing, observability, future-work
**Story**: REPA-020
**Stage**: elab

**Content**:
- **Finding**: Storybook accessibility tests not mentioned in Test Plan
- **Impact**: Medium - Manual a11y verification only, no automated checks
- **Effort**: Medium - Add @storybook/addon-a11y and configure rules
- **Recommendation**: Add @storybook/addon-a11y to @repo/app-component-library Storybook config. Run axe-core checks on all factory stories. Catch a11y issues during development, not post-deployment.

---

## Notes

- KB writer tool not available during autonomous elaboration
- These entries should be created by orchestrator or manual process
- Each entry contributes to institutional knowledge about factory pattern evolution
- Entries enable future story creation (REPA-020.2, REPA-020.3, etc.)
