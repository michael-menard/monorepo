---
id: REPA-020
title: "Create Domain Card Factories for @repo/gallery"
status: uat/completed
priority: P2
story_points: 3
epic: repackag-app
created_at: "2026-02-11"
elaborated_at: "2026-02-11"
qa_verified_at: "2026-02-11"
qa_verdict: PASS
depends_on: [REPA-009]
experiment_variant: control
story_type: feature
surfaces:
  frontend: true
  backend: false
  database: false
  infrastructure: false
elaboration_verdict: CONDITIONAL PASS
---

# REPA-020: Create Domain Card Factories for @repo/gallery

## Context

The @repo/gallery package provides `GalleryCard` as a base component with a slot-based architecture (image, title, subtitle, metadata, actions). Currently, each app creates domain-specific cards (InstructionCard, SetCard, WishlistCard, InspirationCard) by manually mapping domain types to GalleryCard props and composing metadata/actions slots.

Three of the four domain cards already use GalleryCard:
- **InstructionCard** (app-instructions-gallery) - maps Instruction → GalleryCard
- **SetCard** (app-sets-gallery) - maps Set → GalleryCard
- **WishlistCard** (app-wishlist-gallery) - maps WishlistItem → GalleryCard
- **InspirationCard** (app-inspiration-gallery) - custom implementation (will use GalleryCard after REPA-009)

These cards share common patterns:
1. Extract image URL (with thumbnail fallback)
2. Format title/subtitle from domain fields
3. Compose metadata badges (piece count, theme, store, price, etc.)
4. Add domain-specific actions (edit, delete, favorite, etc.)
5. Handle click/navigation

**Problem**: While the cards work correctly, there's no standardized pattern for creating new domain-specific cards. Each implementation reinvents the mapping logic, leading to:
- Inconsistent patterns across apps
- Duplication of formatting logic (e.g., price formatting, piece count display)
- No clear guidance for future domain cards
- Difficulty discovering card creation patterns

The existing `column-helpers.tsx` in @repo/gallery demonstrates a successful factory pattern for creating table columns (`createTextColumn`, `createNumberColumn`, etc.). A similar pattern can be applied to card creation.

## Goal

Create factory functions in @repo/gallery that encapsulate the patterns for creating domain-specific cards. Provide Storybook documentation demonstrating usage patterns. This creates a discoverable, reusable API for card creation that maintains consistency across the platform.

## Non-Goals

**No component wrappers**: This story creates factory functions that return `GalleryCardProps`, NOT new wrapper components. The existing InstructionCard, SetCard, WishlistCard components remain unchanged. They MAY be refactored later to use the factories internally, but that's not required for this story.

**No refactoring of existing cards**: The domain cards in `apps/web/app-*` continue to work as-is. This story establishes a new pattern; adopting it across existing cards is a future story (similar to how column-helpers exist alongside existing table implementations).

**No backend changes**: Factory functions are frontend-only utilities. No API or database changes.

**No new domain types**: Factories target the four existing domain types (Instruction, Set, WishlistItem, Inspiration). Additional domain factories are future work.

**No routing/navigation logic**: Factories accept onClick callbacks but don't implement navigation. Parent components handle navigation (consistent with current card implementations).

**No REPA-009 dependency**: Factories initially target the current GalleryCard API (without selection/drag support). After REPA-009 completes, factories can be extended to support new props. This avoids blocking on REPA-009.

## Scope

### Packages Modified
- `packages/core/gallery/` (add card-factories)
  - New file: `src/utils/card-factories.tsx`
  - Update: `src/index.ts` (export factories)

### Packages Imported
- `@repo/api-client` (domain type schemas: Instruction, Set, WishlistItem, Inspiration)
- `@repo/app-component-library` (Badge, Button components)
- `lucide-react` (icons: Heart, Pencil, Trash2, Eye, Star, Puzzle, Blocks, etc.)
- `zod` (schemas and validation)

### UI Surfaces
- Storybook stories in `packages/core/gallery/src/__stories__/` or `packages/core/app-component-library/src/__stories__/`
  - Story demonstrating each factory
  - Story showing all factories side-by-side

### No Backend Changes
This is a frontend-only story. No API endpoints, database schema, or infrastructure changes.

## Acceptance Criteria

### Factory Functions
- [ ] **AC-1**: `createInstructionCard` factory accepts `Instruction` from @repo/api-client and returns `GalleryCardProps`
  - Maps instruction.name → title
  - Maps instruction.description → subtitle
  - Extracts image URL with thumbnail fallback
  - Renders piece count and theme badges in metadata slot
  - Includes favorite/edit actions in actions slot

- [ ] **AC-2**: `createSetCard` factory accepts `Set` from @repo/api-client and returns `GalleryCardProps`
  - Maps set.name → title
  - Maps set.set_number → subtitle
  - Extracts image URL with thumbnail fallback
  - Renders build status, piece count, theme badges in metadata slot
  - Includes view/edit/delete actions in actions slot

- [ ] **AC-3**: `createWishlistCard` factory accepts `WishlistItem` from @repo/api-client and returns `GalleryCardProps`
  - Maps item.set_name → title
  - Maps item.set_number → subtitle
  - Extracts image URL with thumbnail fallback
  - Renders store badge, price, piece count, priority stars in metadata slot
  - Includes "Got It" button and delete action in actions slot

- [ ] **AC-4**: `createInspirationCard` factory accepts `Inspiration` from @repo/api-client and returns `GalleryCardProps`
  - Maps inspiration.title → title
  - Maps inspiration.description → subtitle
  - Extracts image URL with thumbnail fallback
  - Renders album count, MOC count, tags in metadata slot
  - Includes menu/source actions in actions slot

### Type Safety
- [ ] **AC-5**: All factory options have Zod schemas (e.g., `InstructionCardOptionsSchema`, `SetCardOptionsSchema`, etc.)
- [ ] **AC-6**: Factory return types inferred from `GalleryCardPropsSchema`
- [ ] **AC-7**: Type errors if domain data is missing required fields (enforced by Zod validation)

### Functionality
- [ ] **AC-8**: Factories handle image extraction with thumbnail fallback logic
  - Priority: thumbnail_url → image_url → default placeholder

- [ ] **AC-9**: Factories format metadata badges consistently
  - Piece count: "{count} pieces" format
  - Price: currency formatting (e.g., "$129.99")
  - Theme: badge with theme name
  - Priority: star icons for wishlist priority

- [ ] **AC-10**: Factories compose action buttons with proper click handlers
  - Click handlers receive domain-specific parameters (e.g., onEdit(id))
  - Event propagation stopped for action clicks (to prevent card click)

- [ ] **AC-11**: Factories provide accessible labels for actions
  - All buttons have aria-label or accessible text
  - Icons paired with sr-only text where appropriate

### Documentation
- [ ] **AC-12**: Storybook story for each factory showing basic usage
  - Example data (mocked domain objects)
  - All available options demonstrated

- [ ] **AC-13**: Storybook story showing all factories side-by-side for comparison
  - Grid layout with one card from each factory
  - Helps developers understand the pattern across domains

- [ ] **AC-14**: JSDoc comments on all factory functions with @example usage
  - Function signature documented
  - Parameters explained
  - Return type documented
  - Example code snippet showing typical usage

- [ ] **AC-15**: README.md in card-factories directory explaining the pattern
  - When to use factories vs. custom implementations
  - How to extend factories for new domains
  - Migration path from existing card implementations (if desired)

### Testing
- [ ] **AC-16**: Unit tests for each factory verify correct `GalleryCardProps` returned
  - Test with valid domain data
  - Verify all props mapped correctly

- [ ] **AC-17**: Unit tests verify metadata rendering for all domain fields
  - Test piece count formatting
  - Test price formatting
  - Test badge rendering

- [ ] **AC-18**: Unit tests verify action handlers are called with correct parameters
  - Mock callbacks
  - Trigger action clicks
  - Assert callbacks invoked with expected arguments

- [ ] **AC-19**: Minimum 45% test coverage maintained for @repo/gallery package
  - Run coverage report before/after
  - Ensure no coverage regression

### Exports
- [ ] **AC-20**: Factories exported from `@repo/gallery` package
  - Update package index.ts to export all factories
  - Verify imports work from external packages

- [ ] **AC-21**: Factory option schemas exported for external validation
  - Schemas available for apps that want to validate options before calling factory

### API Compliance (Added by autonomous elaboration)
- [ ] **AC-22**: Factories use `hoverOverlay` prop instead of removed `actions` prop
  - All factories return `GalleryCardProps` with `hoverOverlay` (not `actions`)
  - Follow pattern from GalleryCard.tsx lines 119-133 for hover overlay structure
  - Action buttons wrapped in absolute-positioned div with gradient background
  - Verify factories pass GalleryCardPropsSchema.parse() validation

- [ ] **AC-23**: Document baseline test coverage for @repo/gallery before implementation
  - Run `pnpm test --coverage` on @repo/gallery package
  - Record current coverage percentage in implementation notes
  - Enables verification of AC-19 (maintain 45% minimum coverage)

## Reuse Plan

### Existing Components
- **GalleryCard** (`packages/core/gallery/src/components/GalleryCard.tsx`)
  - Base component with slot-based architecture
  - Accepts metadata and actions slots

- **Badge, Button** (`@repo/app-component-library`)
  - Use Badge for metadata displays (piece count, theme, store, etc.)
  - Use Button for action handlers

- **Lucide Icons** (`lucide-react`)
  - Heart (favorite), Pencil (edit), Trash2 (delete), Eye (view)
  - Star (priority), Puzzle (piece count), Blocks (MOC count)

### Existing Patterns
- **column-helpers.tsx** (`packages/core/gallery/src/utils/column-helpers.tsx`)
  - Factory function pattern: accept data, return config object
  - Use as template for card-factories structure

- **Zod schema + z.infer<>** (project standard)
  - Define all types via Zod schemas
  - Use z.infer<typeof Schema> for TypeScript types

### Domain Type Schemas
Import existing schemas from `@repo/api-client`:
- `InstructionSchema`
- `SetSchema`
- `WishlistItemSchema`
- `InspirationSchema`

These schemas already define the domain data structure. Factories will accept instances of these types.

## Architecture Notes

### Factory Function Signature Pattern

```typescript
import { z } from 'zod'
import type { Instruction } from '@repo/api-client'
import type { GalleryCardProps } from '../components/GalleryCard'

// Options schema for type safety
export const InstructionCardOptionsSchema = z.object({
  onClick: z.function().args(z.string()).returns(z.void()).optional(),
  onFavorite: z.function().args(z.string()).returns(z.void()).optional(),
  onEdit: z.function().args(z.string()).returns(z.void()).optional(),
})

export type InstructionCardOptions = z.infer<typeof InstructionCardOptionsSchema>

/**
 * Creates GalleryCard props for an Instruction domain object.
 *
 * @param instruction - Instruction data from @repo/api-client
 * @param options - Optional callbacks for user interactions
 * @returns Props to pass to GalleryCard component
 *
 * @example
 * ```tsx
 * const cardProps = createInstructionCard(instruction, {
 *   onClick: (id) => navigate(`/instructions/${id}`),
 *   onFavorite: (id) => toggleFavorite(id),
 *   onEdit: (id) => navigate(`/instructions/${id}/edit`)
 * })
 *
 * return <GalleryCard {...cardProps} />
 * ```
 */
export function createInstructionCard(
  instruction: Instruction,
  options?: InstructionCardOptions
): GalleryCardProps {
  return {
    image: {
      src: instruction.thumbnail_url || instruction.image_url || '/placeholder.png',
      alt: instruction.name,
      aspectRatio: '4/3',
    },
    title: instruction.name,
    subtitle: instruction.description,
    metadata: (
      <div className="flex gap-2">
        <Badge variant="outline">{instruction.piece_count} pieces</Badge>
        <Badge>{instruction.theme}</Badge>
      </div>
    ),
    hoverOverlay: (
      <div className="absolute inset-0 flex items-end p-4">
        <div className="flex gap-2">
          {options?.onFavorite && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                options.onFavorite?.(instruction.id)
              }}
              aria-label="Favorite instruction"
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}
          {options?.onEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                options.onEdit?.(instruction.id)
              }}
              aria-label="Edit instruction"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    ),
    onClick: options?.onClick ? () => options.onClick?.(instruction.id) : undefined,
  }
}
```

### Memoization Consideration

Factories are called on every render unless wrapped in `useMemo` by the caller. For performance-sensitive use cases (large galleries), callers should memoize:

```typescript
const cardProps = useMemo(
  () => createInstructionCard(instruction, { onClick, onFavorite, onEdit }),
  [instruction, onClick, onFavorite, onEdit]
)
```

This keeps factories simple (pure functions) while allowing performance optimization at call sites.

### Extensibility for REPA-009

When REPA-009 adds selection/drag support to GalleryCard, factories can be updated to accept additional options:

```typescript
export const InstructionCardOptionsSchema = z.object({
  // Existing options...
  onClick: z.function().args(z.string()).returns(z.void()).optional(),
  onFavorite: z.function().args(z.string()).returns(z.void()).optional(),
  onEdit: z.function().args(z.string()).returns(z.void()).optional(),

  // New options after REPA-009
  selectable: z.boolean().optional(),
  selected: z.boolean().optional(),
  onSelect: z.function().args(z.boolean()).returns(z.void()).optional(),
  draggable: z.boolean().optional(),
})
```

This allows backward-compatible evolution without breaking existing usages.

### Storybook Configuration

Since `@repo/gallery` does not currently have Storybook configured, stories will be created in `packages/core/app-component-library/src/__stories__/` which already has Storybook setup. Stories will import factories from `@repo/gallery`:

```typescript
// packages/core/app-component-library/src/__stories__/CardFactories.stories.tsx

import type { Meta, StoryObj } from '@storybook/react'
import { GalleryCard } from '@repo/gallery'
import {
  createInstructionCard,
  createSetCard,
  createWishlistCard,
  createInspirationCard
} from '@repo/gallery/utils/card-factories'

// Mock data
const mockInstruction = { /* ... */ }
const mockSet = { /* ... */ }
// ... etc

export const InstructionCardExample: StoryObj = {
  render: () => {
    const props = createInstructionCard(mockInstruction, {
      onClick: (id) => console.log('Navigate to', id),
      onFavorite: (id) => console.log('Favorite', id),
    })
    return <GalleryCard {...props} />
  }
}
```

Future work can add full Storybook configuration to `@repo/gallery` if desired.

## Infrastructure Notes

None. This is a frontend-only story with no infrastructure changes.

## Implementation Notes

### REPA-009 Breaking Changes (Added by autonomous elaboration)

**CRITICAL**: REPA-009 has already been implemented in GalleryCard.tsx despite being marked "Ready to Work" in stories.index.md. The implementation removed the `actions` prop and replaced it with `hoverOverlay`.

**Impact on This Story**:
1. ✅ **Factories WILL use current API**: All factory functions in this story must use `hoverOverlay` prop (enforced by AC-22)
2. ⚠️ **Existing cards STILL use removed API**: InstructionCard (line 87) and SetCard (line 165) both use the removed `actions` prop
3. 📝 **Migration needed but NOT blocking**: Existing cards need migration to `hoverOverlay`, but this is NOT a dependency for factory implementation

**Factory Implementation Pattern** (from GalleryCard.tsx lines 119-133):
```typescript
// CORRECT - use hoverOverlay
return {
  // ... other props
  hoverOverlay: (
    <div className="absolute inset-0 flex items-end p-4">
      <div className="flex gap-2">
        <Button variant="ghost" size="icon"><Heart /></Button>
        <Button variant="ghost" size="icon"><Pencil /></Button>
      </div>
    </div>
  )
}

// WRONG - actions prop removed
return {
  // ... other props
  actions: (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon"><Heart /></Button>
    </div>
  )
}
```

**Future Work**: Consider creating REPA-019.5 or similar to migrate existing cards from `actions` to `hoverOverlay`. This is not a prerequisite for REPA-020.

## HTTP Contract Plan

None. This story does not interact with APIs. Factory functions accept domain data that has already been fetched by the calling application.

## Seed Requirements

None. No database seeding required for this story.

## Test Plan

### Scope Summary
- **Endpoints touched**: None (frontend-only)
- **UI touched**: Yes (GalleryCard rendering via factories)
- **Data/storage touched**: No

### Happy Path Tests

**Test 1: createInstructionCard returns valid GalleryCardProps**
- **Setup**: Create mock Instruction object with all required fields
- **Action**: Call `createInstructionCard(instruction, { onClick, onFavorite, onEdit })`
- **Expected outcome**: Returns object matching GalleryCardPropsSchema
- **Evidence**:
  - Props include title, subtitle, imageUrl
  - metadata slot contains Badge components for piece count and theme
  - actions slot contains Button components for favorite and edit
  - Verify with Zod validation: `GalleryCardPropsSchema.parse(result)`

**Test 2: createSetCard formats build status badge correctly**
- **Setup**: Create mock Set with build_status = "in_progress"
- **Action**: Call `createSetCard(set, options)`
- **Expected outcome**: metadata includes Badge with "In Progress" text and appropriate variant
- **Evidence**: Render metadata slot, query for badge with text matching formatted status

**Test 3: createWishlistCard formats price correctly**
- **Setup**: Create mock WishlistItem with price = 129.99
- **Action**: Call `createWishlistCard(item, options)`
- **Expected outcome**: metadata includes price formatted as "$129.99"
- **Evidence**: Render metadata slot, assert price display matches expected format

**Test 4: createInspirationCard handles missing thumbnail gracefully**
- **Setup**: Create mock Inspiration with thumbnail_url = null, image_url = "fallback.jpg"
- **Action**: Call `createInspirationCard(inspiration, options)`
- **Expected outcome**: Returns props with imageUrl = "fallback.jpg"
- **Evidence**: Assert returned props.imageUrl equals fallback image

**Test 5: Action handlers prevent event propagation**
- **Setup**: Create mock instruction, mount GalleryCard with props from factory
- **Action**: Click on edit button
- **Expected outcome**:
  - onEdit callback invoked with correct ID
  - onClick (card-level) NOT invoked
- **Evidence**: Mock both callbacks, assert only onEdit called

### Error Cases

**Test 6: Factory validates required fields with Zod**
- **Setup**: Create incomplete domain object (missing required fields)
- **Action**: Call factory function
- **Expected outcome**: Zod validation error thrown
- **Evidence**: Assert error message indicates missing field

**Test 7: Factory handles null/undefined options gracefully**
- **Setup**: Create valid domain object
- **Action**: Call factory with options = undefined
- **Expected outcome**: Returns valid props with no actions/callbacks
- **Evidence**: Verify actions slot is empty or hidden

**Test 8: Factory handles empty strings in domain data**
- **Setup**: Create domain object with empty string for optional fields (e.g., description = "")
- **Action**: Call factory function
- **Expected outcome**: subtitle is empty string (not "undefined" or "null")
- **Evidence**: Assert props.subtitle === ""

### Edge Cases

**Test 9: Zero piece count displays correctly**
- **Setup**: Create mock Set with piece_count = 0
- **Action**: Call `createSetCard(set, options)`
- **Expected outcome**: metadata includes "0 pieces" badge
- **Evidence**: Render metadata, assert badge text equals "0 pieces"

**Test 10: Very long titles are passed through (GalleryCard handles truncation)**
- **Setup**: Create mock with title = 200 character string
- **Action**: Call factory function
- **Expected outcome**: Full title passed in props (truncation is GalleryCard's responsibility)
- **Evidence**: Assert props.title.length === 200

**Test 11: Multiple actions render in correct order**
- **Setup**: Create mock with all optional actions provided
- **Action**: Call factory, render actions slot
- **Expected outcome**: Buttons appear in expected order (favorite, edit, delete, etc.)
- **Evidence**: Query buttons by aria-label, assert order matches spec

### Coverage Requirements

- [ ] All factory functions have unit tests
- [ ] All code paths covered (with/without options, with/without optional fields)
- [ ] Maintain minimum 45% coverage for @repo/gallery package

### Integration Testing Notes

While this story focuses on unit tests for factory functions, integration testing should verify factories work correctly when used with actual GalleryCard component. Consider adding integration tests in future stories that refactor existing cards to use factories.

## UI/UX Notes

### Component Architecture
- **MVP Components**:
  - Four factory functions (createInstructionCard, createSetCard, createWishlistCard, createInspirationCard)
  - No new React components (factories return props for existing GalleryCard)

- **Reuse Targets**:
  - GalleryCard (packages/core/gallery) - base component
  - Badge, Button (packages/core/app-component-library) - action/metadata UI
  - Lucide icons - visual indicators for actions

### Metadata Formatting Consistency

All factories must format metadata consistently:
- **Piece count**: "{count} pieces" format
- **Price**: Currency symbol + two decimal places (e.g., "$129.99")
- **Theme**: Badge with theme name
- **Priority**: Star icons for wishlist (1-5 stars)
- **Build status**: Human-readable labels ("In Progress", "Completed", "Not Started")

Example consistency check:
```typescript
// CORRECT - consistent formatting
<Badge variant="outline">{instruction.piece_count} pieces</Badge>

// WRONG - inconsistent formatting
<Badge variant="outline">{instruction.piece_count}</Badge>
```

### Action Button Patterns

Action buttons must match existing card implementations:
- **Icon-only buttons** with ghost variant
- **aria-label** on all icon buttons for accessibility
- **Stop propagation** on action clicks to prevent card click
- **Consistent icon choices** across domains (Heart = favorite, Pencil = edit, Trash2 = delete)

### Storybook Requirements

Stories must demonstrate:
1. **Basic usage** - Each factory with minimal options
2. **Full options** - All optional callbacks provided
3. **Responsive grid** - Multiple cards in grid layout to show responsive behavior
4. **Side-by-side comparison** - All four domain cards together to highlight pattern consistency

### Accessibility (MVP-Critical)

- [ ] All action buttons have accessible labels (aria-label or visible text)
- [ ] Icon-only buttons include sr-only text where appropriate
- [ ] Color is not the only indicator (e.g., priority stars also have aria-label)
- [ ] Keyboard navigation works (handled by Button and GalleryCard, but verify in Storybook)

### Future UX Enhancements (Non-MVP)

Tracked separately for future work:
- Dark mode variants for badges
- Skeleton loading states for lazy-loaded cards
- Animation on action button hover
- Tooltip on action buttons (in addition to aria-label)
- Advanced metadata slots (e.g., carousel for multiple images)

## Reality Baseline

### Existing Features Referenced

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| GalleryCard base component | packages/core/gallery/src/components/GalleryCard.tsx | Exists | 315 LOC with slot-based architecture |
| InstructionCard | apps/web/app-instructions-gallery/src/components/InstructionCard | Uses GalleryCard | Maps Instruction → GalleryCard |
| SetCard | apps/web/app-sets-gallery/src/components/SetCard.tsx | Uses GalleryCard | Maps Set → GalleryCard |
| WishlistCard | apps/web/app-wishlist-gallery/src/components/WishlistCard | Uses GalleryCard | Wrapper around GalleryCard |
| InspirationCard | apps/web/app-inspiration-gallery/src/components/InspirationCard | Custom implementation | Will use GalleryCard after REPA-009 |
| column-helpers | packages/core/gallery/src/utils/column-helpers.tsx | Exists | Factory pattern for table columns |
| Domain type schemas | packages/core/api-client/src/schemas/ | Exists | Instruction, Set, WishlistItem, Inspiration |
| Storybook setup | packages/core/app-component-library/src/__stories__/ | Exists | Configured for component documentation |

### Active In-Progress Work

| Story | Status | Overlap Risk | Mitigation |
|-------|--------|--------------|------------|
| REPA-007 | Ready to Work | Low | Adds SortableGallery (different component) |
| REPA-008 | Ready to Work | Low | Keyboard hooks (already exported from @repo/gallery) |
| REPA-009 | Ready to Work | **MEDIUM** | Enhances GalleryCard with selection/drag - factories target current API first, can extend after REPA-009 |
| REPA-012 | In Progress | None | Auth hooks (unrelated) |
| REPA-013 | In Progress | None | Auth utils (unrelated) |

### Constraints

- **Dependency on REPA-009**: Listed in index, but mitigated by targeting current GalleryCard API
- **No barrel files**: Must import directly from source files
- **Zod-first types**: All types via Zod schemas with z.infer<>
- **Minimum 45% test coverage**: Must maintain or exceed for @repo/gallery
- **Storybook documentation**: Required for all factory functions

### Baseline Date

Generated: 2026-02-11 (from STORY-SEED.md)

Note: No reality baseline file exists at `plans/baselines/`. Story seed generated from codebase scanning only. Context may be incomplete regarding in-progress work or deprecated patterns.

## Risk Predictions

### Split Risk
**Probability**: 0.15 (Low)

**Reasoning**: Story scope is focused (four factory functions + Storybook stories). Factories follow established pattern from column-helpers.tsx. No backend/database changes. Clear acceptance criteria.

**Risk Factors**:
- Multiple factories (4) increase surface area slightly
- Storybook setup ambiguity (gallery vs app-component-library)
- REPA-009 dependency creates potential rework if not mitigated

**Mitigation**: Target current GalleryCard API first. Storybook stories in app-component-library (already configured).

### Review Cycles
**Expected**: 2

**Reasoning**:
- Medium complexity (3 SP story with type safety and testing requirements)
- First review: Likely feedback on metadata formatting consistency and Storybook story structure
- Second review: Minor adjustments to JSDoc or test coverage
- Well-scoped story should avoid third review

### Token Estimate
**Total Predicted**: 45,000 tokens

**Breakdown**:
- Implementation: ~25,000 tokens (factories, schemas, Storybook stories)
- Testing: ~12,000 tokens (unit tests for all factories + edge cases)
- Documentation: ~5,000 tokens (JSDoc, README, Storybook documentation)
- Review cycles: ~3,000 tokens (addressing feedback)

### Confidence
**Level**: Medium

**Reasoning**: No historical data available (no baseline, no similar stories loaded). Estimate based on:
- Story point allocation (3 SP)
- AC count (21 ACs - medium complexity)
- Factory pattern precedent (column-helpers.tsx)
- Type safety requirements (Zod schemas)

**Data Gaps**:
- No similar completed stories for comparison
- No baseline reality for in-progress work context
- No past REPA epic stories with actuals

### Similar Stories
None available (knowledge base query not performed due to missing baseline).

---

**Story Status**: Ready for implementation after REPA-009 completes (or implement targeting current GalleryCard API to avoid blocking).

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Factory API targets removed `actions` prop | Add as AC: Enforce factories use `hoverOverlay` | AC-22 |
| 2 | Missing baseline test coverage data | Add as AC: Document current coverage before implementation | AC-23 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Factory memoization not documented | Performance | KB entry created |
| 2 | Price formatting utility not shared | Code Reuse | KB entry created |
| 3 | Image fallback logic duplicated | Code Reuse | KB entry created |
| 4 | Badge variant mapping not standardized | UX Consistency | KB entry created |
| 5 | Storybook accessibility tests not mentioned | Quality | KB entry created |

### Critical Implementation Notes

**REPA-009 Breaking Changes Already Implemented**: GalleryCard.tsx has been updated with REPA-009 features and removed the `actions` prop, replacing it with `hoverOverlay`. All factory functions in this story must use the `hoverOverlay` pattern (enforced by AC-22).

**Existing Cards Not Yet Migrated**: InstructionCard (app-instructions-gallery line 87) and SetCard (app-sets-gallery line 165) still use the removed `actions` prop. This is NOT blocking for factory implementation—factories will use the current GalleryCard API. These existing cards require migration in a separate story (recommend REPA-020.1 or earlier).

**Architecture Examples Corrected**: All factory architecture examples in this story have been updated to use `hoverOverlay` instead of `actions`, following the pattern from GalleryCard.tsx lines 119-133.

### Summary

- ACs added: 2 (AC-22 for API compliance, AC-23 for coverage baseline)
- KB entries created: 5 (non-blocking optimization and quality findings)
- Audit issues resolved: 3 (all critical issues corrected)
- Mode: autonomous
- Verdict: CONDITIONAL PASS
