---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-020

## Reality Context

### Baseline Status
- Loaded: **No** (no baseline reality file exists at plans/baselines/)
- Date: N/A
- Gaps: Missing baseline context for current reality. Proceeding with codebase scanning only.

### Relevant Existing Features
No baseline available. Based on codebase scanning:

| Feature | Location | Status |
|---------|----------|--------|
| GalleryCard base component | packages/core/gallery/src/components/GalleryCard.tsx | Exists (315 LOC) |
| InstructionCard | apps/web/app-instructions-gallery/src/components/InstructionCard | Uses GalleryCard |
| SetCard | apps/web/app-sets-gallery/src/components/SetCard.tsx | Uses GalleryCard |
| WishlistCard | apps/web/app-wishlist-gallery/src/components/WishlistCard | Uses GalleryCard (with wrapper) |
| InspirationCard | apps/web/app-inspiration-gallery/src/components/InspirationCard | Does NOT use GalleryCard |
| Column helper factories | packages/core/gallery/src/utils/column-helpers.tsx | Existing pattern |
| Storybook setup | packages/core/app-component-library/src/__stories__/ | Existing Storybook files |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| REPA-007 | Ready to Work | Depends - adds SortableGallery component |
| REPA-008 | Ready to Work | Low - keyboard hooks (already in index.ts) |
| REPA-009 | Ready to Work | **HIGH** - enhances GalleryCard with selection/drag |
| REPA-012 | In Progress | Low - auth hooks unrelated |
| REPA-013 | In Progress | Low - auth utils unrelated |

### Constraints to Respect
- **Dependency on REPA-009**: REPA-020 depends on REPA-009 which enhances GalleryCard with selection mode, drag handles, and hover overlays
- **No barrel files**: Project guideline - must import directly from source files
- **Zod-first types**: All types must be defined via Zod schemas with z.infer<>
- **Minimum 45% test coverage**: All new code must maintain or exceed this threshold
- **Storybook documentation**: Pattern established in app-component-library for component documentation

---

## Retrieved Context

### Related Components

**GalleryCard Base Component** (packages/core/gallery/src/components/GalleryCard.tsx):
- 315 LOC base component with image, title, subtitle, metadata, actions slots
- Already exported from @repo/gallery package
- Has GalleryCardPropsSchema and GalleryCardSkeletonPropsSchema
- Supports aspectRatio, selected, loading, onClick, href props

**Domain-Specific Cards Using GalleryCard**:

1. **InstructionCard** (apps/web/app-instructions-gallery/src/components/InstructionCard/index.tsx):
   - Uses GalleryCard ✓
   - Maps Instruction type to GalleryCard props
   - Adds favorite/edit actions in actions slot
   - Shows piece count badge and theme in metadata slot

2. **SetCard** (apps/web/app-sets-gallery/src/components/SetCard.tsx):
   - Uses GalleryCard ✓
   - Maps Set type to GalleryCard props
   - Shows build status, piece count, theme badges in metadata
   - Adds view/edit/delete actions

3. **WishlistCard** (apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx):
   - Uses GalleryCard via wrapper div ✓
   - Shows store badge, price, piece count, priority stars
   - Adds Got It button and delete action
   - Has extensive keyboard navigation and a11y support

4. **InspirationCard** (apps/web/app-inspiration-gallery/src/components/InspirationCard/index.tsx):
   - Does NOT use GalleryCard ✗
   - 220 LOC custom implementation using @repo/app-component-library Card
   - Has selection mode (checkbox overlay) and hover overlay
   - Shows album count, MOC count, tags in overlay
   - Will be refactored in REPA-009 to use enhanced GalleryCard

### Existing Factory Pattern

**Column Helpers** (packages/core/gallery/src/utils/column-helpers.tsx):
- Provides factory functions for creating table columns
- Pattern: `createTextColumn()`, `createNumberColumn()`, `createDateColumn()`, `createPriceColumn()`, `createBadgeColumn()`, `createImageColumn()`
- Returns ColumnDef<TItem> from @tanstack/react-table
- Shows established pattern of creating domain-specific helpers

### Reuse Candidates
- **Existing column-helpers pattern**: Can model card factories after this approach
- **Zod schemas from domain types**: Instruction, Set, WishlistItem types already exist in @repo/api-client
- **GalleryCard's slot system**: metadata and actions slots provide extensibility
- **Storybook stories structure**: Follow app-component-library/__stories__/ pattern

---

## Knowledge Context

### Lessons Learned
No lessons loaded (no knowledge base query performed per missing baseline).

### Blockers to Avoid (from past stories)
Not available without baseline/lessons context.

### Architecture Decisions (ADRs)
ADR log not loaded in this seed generation (missing baseline). Key relevant ADRs from project context:
- **Testing**: Minimum 45% coverage required for all code
- **Type Safety**: Zod-first approach - all types via schemas with z.infer<>
- **No Barrel Files**: Import directly from source files

### Patterns to Follow
Based on codebase analysis:
1. **Factory function pattern**: Similar to column-helpers.tsx approach
2. **Zod schemas for props**: All component props must have schemas
3. **Type inference**: Use z.infer<typeof Schema> for TypeScript types
4. **Slot-based composition**: Leverage GalleryCard's metadata and actions slots
5. **Storybook documentation**: Document usage patterns and variants

### Patterns to Avoid
Based on project guidelines:
1. **No barrel files**: Don't create index.ts re-exports for factories
2. **No TypeScript interfaces**: Use Zod schemas instead
3. **No hardcoded styles**: Use Tailwind classes and design system tokens
4. **No console.log**: Use @repo/logger

---

## Conflict Analysis

No conflicts detected.

**Dependency Note**: REPA-020 depends on REPA-009 (Enhance GalleryCard with Selection & Drag). However, REPA-009 is in "Ready to Work" status and not yet implemented. The card factories in REPA-020 can be built with the assumption that REPA-009 will be completed first, or the factories can initially target the current GalleryCard API and be enhanced after REPA-009 completes.

**Recommendation**: Implement REPA-020 factories targeting the current GalleryCard API first. Once REPA-009 is complete, update factories to support selection/drag props if needed. This avoids blocking on REPA-009's completion.

---

## Story Seed

### Title
Create Domain Card Factories for @repo/gallery

### Description

**Context**:
The @repo/gallery package provides GalleryCard as a base component with a slot-based architecture (image, title, subtitle, metadata, actions). Currently, each app creates domain-specific cards (InstructionCard, SetCard, WishlistCard, InspirationCard) by manually mapping domain types to GalleryCard props and composing metadata/actions slots.

Three of the four domain cards already use GalleryCard:
- InstructionCard (app-instructions-gallery) - maps Instruction → GalleryCard
- SetCard (app-sets-gallery) - maps Set → GalleryCard
- WishlistCard (app-wishlist-gallery) - maps WishlistItem → GalleryCard
- InspirationCard (app-inspiration-gallery) - custom implementation (will use GalleryCard after REPA-009)

These cards share common patterns:
1. Extract image URL (with thumbnail fallback)
2. Format title/subtitle from domain fields
3. Compose metadata badges (piece count, theme, store, price, etc.)
4. Add domain-specific actions (edit, delete, favorite, etc.)
5. Handle click/navigation

**Problem**:
While the cards work correctly, there's no standardized pattern for creating new domain-specific cards. Each implementation reinvents the mapping logic, leading to:
- Inconsistent patterns across apps
- Duplication of formatting logic (e.g., price formatting, piece count display)
- No clear guidance for future domain cards
- Difficulty discovering card creation patterns

The existing `column-helpers.tsx` in @repo/gallery demonstrates a successful factory pattern for creating table columns (`createTextColumn`, `createNumberColumn`, etc.). A similar pattern could be applied to card creation.

**Proposed Solution**:
Create factory functions in @repo/gallery that encapsulate the patterns for creating domain-specific cards:

```typescript
// packages/core/gallery/src/utils/card-factories.tsx

export function createInstructionCard(
  instruction: Instruction,
  options?: {
    onClick?: (id: string) => void
    onFavorite?: (id: string) => void
    onEdit?: (id: string) => void
  }
): GalleryCardProps

export function createSetCard(
  set: Set,
  options?: {
    onClick?: () => void
    onEdit?: () => void
    onDelete?: () => void
  }
): GalleryCardProps

export function createWishlistCard(
  item: WishlistItem,
  options?: {
    onClick?: () => void
    onGotIt?: () => void
    onDelete?: () => void
  }
): GalleryCardProps

export function createInspirationCard(
  inspiration: Inspiration,
  options?: {
    onClick?: () => void
    onSelect?: (selected: boolean) => void
    onMenuClick?: (event: React.MouseEvent) => void
    onSourceClick?: () => void
  }
): GalleryCardProps
```

These factories:
1. Accept domain data types from @repo/api-client
2. Return properly formatted GalleryCardProps
3. Handle image extraction and fallbacks
4. Format metadata badges consistently
5. Compose action buttons with proper event handlers
6. Provide a discoverable API for card creation

**Documentation**:
Create Storybook stories demonstrating:
- Basic usage of each factory
- Available options/customization
- Integration patterns with galleries
- Comparison of factories side-by-side

This provides a living reference for developers creating new domain cards.

### Initial Acceptance Criteria

**Factory Functions**:
- [ ] AC-1: createInstructionCard factory accepts Instruction from @repo/api-client and returns GalleryCardProps
- [ ] AC-2: createSetCard factory accepts Set from @repo/api-client and returns GalleryCardProps
- [ ] AC-3: createWishlistCard factory accepts WishlistItem from @repo/api-client and returns GalleryCardProps
- [ ] AC-4: createInspirationCard factory accepts Inspiration from @repo/api-client and returns GalleryCardProps

**Type Safety**:
- [ ] AC-5: All factory options have Zod schemas (CardFactoryOptionsSchema for each domain)
- [ ] AC-6: Factory return types inferred from GalleryCardPropsSchema
- [ ] AC-7: Type errors if domain data is missing required fields

**Functionality**:
- [ ] AC-8: Factories handle image extraction with thumbnail fallback logic
- [ ] AC-9: Factories format metadata badges (piece count, theme, store, price, priority, etc.)
- [ ] AC-10: Factories compose action buttons with proper click handlers and stop propagation
- [ ] AC-11: Factories provide accessible labels for actions (aria-label)

**Documentation**:
- [ ] AC-12: Storybook story for each factory showing basic usage
- [ ] AC-13: Storybook story showing all factories side-by-side for comparison
- [ ] AC-14: JSDoc comments on all factory functions with @example usage
- [ ] AC-15: README.md in card-factories directory explaining the pattern

**Testing**:
- [ ] AC-16: Unit tests for each factory verify correct GalleryCardProps returned
- [ ] AC-17: Unit tests verify metadata rendering for all domain fields
- [ ] AC-18: Unit tests verify action handlers are called with correct parameters
- [ ] AC-19: Minimum 45% test coverage maintained for @repo/gallery package

**Exports**:
- [ ] AC-20: Factories exported from @repo/gallery/index.ts
- [ ] AC-21: Factory option schemas exported for external validation

### Non-Goals

**No component wrappers**: This story creates factory functions that return GalleryCardProps, NOT new wrapper components. The existing InstructionCard, SetCard, WishlistCard components remain unchanged. They MAY be refactored later to use the factories internally, but that's not required for this story.

**No refactoring of existing cards**: The domain cards in apps/web/app-* continue to work as-is. This story establishes a new pattern; adopting it across existing cards is a future story (similar to how column-helpers exist alongside existing table implementations).

**No backend changes**: Factory functions are frontend-only utilities. No API or database changes.

**No new domain types**: Factories target the four existing domain types (Instruction, Set, WishlistItem, Inspiration). Additional domain factories are future work.

**No routing/navigation logic**: Factories accept onClick callbacks but don't implement navigation. Parent components handle navigation (consistent with current card implementations).

**No REPA-009 dependency**: Factories initially target the current GalleryCard API (without selection/drag support). After REPA-009 completes, factories can be extended to support new props. This avoids blocking on REPA-009.

### Reuse Plan

**Components**:
- GalleryCard (base component)
- Badge, Button components from @repo/app-component-library
- Lucide icons (Heart, Pencil, Trash2, Eye, Star, Puzzle, Blocks, etc.)

**Patterns**:
- column-helpers.tsx pattern (factory functions returning config objects)
- Zod schema + z.infer<> type inference
- GalleryCard slot composition (metadata, actions)

**Packages**:
- @repo/gallery (add card-factories.tsx)
- @repo/api-client (import domain type schemas)
- @repo/app-component-library (Badge, Button)
- lucide-react (icons)
- zod (schemas)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on factory output correctness (do they return valid GalleryCardProps?)
- Verify metadata badges appear for all domain fields (piece count, price, store, theme, etc.)
- Test action handler invocation (onClick, onEdit, onDelete, onFavorite, etc.)
- Test image extraction logic with missing thumbnails
- Consider edge cases: null fields, missing images, zero piece counts
- Storybook accessibility checks (axe-core if configured)

### For UI/UX Advisor
- Ensure metadata formatting is consistent across factories (e.g., piece count format)
- Verify action button placement matches existing card patterns
- Check that Storybook stories demonstrate real-world usage clearly
- Consider factory extensibility for future domain types
- Ensure examples show responsive behavior (grid layouts)
- Document best practices for when to use factories vs. custom implementations

### For Dev Feasibility
- Evaluate if factories should be functions or classes (functions recommended for simplicity)
- Consider performance: factories called on every render or memoized?
- Determine if factories should handle React.ReactNode generation (metadata/actions) or return raw data
  - Recommendation: Return GalleryCardProps with metadata/actions as React.ReactNode (matches GalleryCard API)
- Plan for future extensibility: how do factories evolve when REPA-009 adds selection/drag props?
- Consider if factories should support theming/variant overrides
- Evaluate Storybook setup: does @repo/gallery need Storybook config or should stories live in app-component-library?
  - Current observation: app-component-library has __stories__, gallery does not
  - Recommendation: Add Storybook to @repo/gallery or create stories in app-component-library that import from gallery

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warning 1**: No baseline reality file exists. Story seed generated from codebase scanning only. Context may be incomplete regarding in-progress work, deprecated patterns, and current constraints.
