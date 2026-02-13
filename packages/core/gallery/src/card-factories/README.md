# Card Factory Functions

Domain-specific factory functions for creating `GalleryCard` configurations from different domain objects.

## Overview

Card factories provide a consistent, type-safe way to transform domain data (Instructions, Sets, Wishlist Items, Inspiration) into `GalleryCardProps` for rendering with the `GalleryCard` component.

## Features

- **Type-safe**: All factories accept typed domain objects and return validated `GalleryCardProps`
- **Consistent API**: All factories follow the same pattern (data + options → props)
- **Customizable**: Control which metadata badges are displayed via options
- **Action support**: Easily add hover overlay action buttons
- **Image fallbacks**: Automatic fallback logic for missing images

## Available Factories

### `createInstructionCard`

Maps MOC Instructions to gallery cards.

```tsx
import { createInstructionCard } from '@repo/gallery'
import type { MocInstructions } from '@repo/api-client'

const instruction: MocInstructions = {
  id: '123',
  title: 'Medieval Castle',
  author: 'Builder Bob',
  partsCount: 1500,
  theme: 'Castle',
  status: 'published',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  // ... other fields
}

const cardProps = createInstructionCard(instruction, {
  onClick: () => navigate(`/instructions/${instruction.id}`),
  showPieceCount: true,
  showTheme: true,
  showStatus: true,
})

return <GalleryCard {...cardProps} />
```

**Metadata Badges**:
- Piece count (e.g., "1,500 pieces")
- Theme (e.g., "Castle")
- Status (e.g., "published")

### `createSetCard`

Maps LEGO Sets to gallery cards.

```tsx
import { createSetCard } from '@repo/gallery'
import type { Set } from '@repo/api-client'

const set: Set = {
  id: '456',
  title: 'Fire Station',
  setNumber: '60320',
  pieceCount: 540,
  theme: 'City',
  isBuilt: true,
  images: [{ imageUrl: '...', thumbnailUrl: '...', position: 0 }],
  // ... other fields
}

const cardProps = createSetCard(set, {
  onClick: () => navigate(`/sets/${set.id}`),
  showPieceCount: true,
  showBuildStatus: true,
  showTheme: true,
})

return <GalleryCard {...cardProps} />
```

**Metadata Badges**:
- Piece count (e.g., "540 pieces")
- Theme (e.g., "City")
- Build status (e.g., "Built" / "Unbuilt")

### `createWishlistCard`

Maps Wishlist Items to gallery cards.

```tsx
import { createWishlistCard } from '@repo/gallery'
import type { WishlistItem } from '@repo/api-client'

const item: WishlistItem = {
  id: '789',
  title: 'Modular Building',
  store: 'amazon',
  price: '249.99',
  currency: 'USD',
  pieceCount: 2807,
  priority: 4,
  imageUrl: 'https://example.com/image.jpg',
  // ... other fields
}

const cardProps = createWishlistCard(item, {
  onClick: () => navigate(`/wishlist/${item.id}`),
  showPrice: true,
  showPriority: true,
  showPieceCount: true,
})

return <GalleryCard {...cardProps} />
```

**Metadata Badges**:
- Piece count (e.g., "2,807 pieces")
- Price (e.g., "$249.99")
- Priority (e.g., "High Priority")

**Priority Levels**:
- 0-1: Low Priority (outline variant)
- 2-3: Medium Priority (secondary variant)
- 4-5: High Priority (default variant)

### `createInspirationCard`

Maps Inspiration items to gallery cards.

```tsx
import { createInspirationCard } from '@repo/gallery'
import type { Inspiration} from '@repo/api-client'

const inspiration: Inspiration = {
  id: '101',
  title: 'Cool MOC Design',
  description: 'An inspiring build idea',
  tags: ['space', 'starship', 'sci-fi', 'detailed'],
  thumbnailUrl: 'https://example.com/thumb.jpg',
  // ... other fields
}

const cardProps = createInspirationCard(inspiration, {
  onClick: () => navigate(`/inspiration/${inspiration.id}`),
  showTags: true,
  maxTags: 3,
})

return <GalleryCard {...cardProps} />
```

**Metadata Badges**:
- Tags (up to `maxTags` displayed)
- "+N more" indicator for additional tags

## Common Options

All factories accept these base options:

```typescript
{
  onClick?: (data: DomainType) => void
  href?: string
  selected?: boolean
  loading?: boolean
  className?: string
  'data-testid'?: string
  selectable?: boolean
  onSelect?: (selected: boolean) => void
  draggable?: boolean
  actions?: React.ReactNode[]  // For hover overlay buttons
}
```

## Adding Action Buttons

All factories support custom action buttons via the `actions` option:

```tsx
import { Button } from '@repo/app-component-library'
import { Edit, Trash2, Share } from 'lucide-react'

const cardProps = createWishlistCard(item, {
  actions: [
    <Button key="edit" variant="ghost" size="icon" onClick={(e) => {
      e.stopPropagation()
      handleEdit(item)
    }}>
      <Edit className="h-4 w-4" />
    </Button>,
    <Button key="delete" variant="ghost" size="icon" onClick={(e) => {
      e.stopPropagation()
      handleDelete(item)
    }}>
      <Trash2 className="h-4 w-4" />
    </Button>,
  ],
})
```

**Important**: Always call `e.stopPropagation()` in action button handlers to prevent triggering the card's `onClick` handler.

## Image Handling

Each factory implements smart image fallback logic:

| Factory | Primary | Fallback | Final |
|---------|---------|----------|-------|
| Instruction | `thumbnailUrl` | `coverImageUrl` | None (muted placeholder) |
| Set | `images[0].thumbnailUrl` | `images[0].imageUrl` | None |
| Wishlist | `imageVariants.thumbnail` | `imageVariants.medium` → `imageUrl` | None |
| Inspiration | `thumbnailUrl` | `imageUrl` | None |

## Migration Path

### From Existing Cards

If you're migrating from custom card implementations:

**Before:**
```tsx
<GalleryCard
  image={{ src: instruction.thumbnailUrl, alt: instruction.title }}
  title={instruction.title}
  subtitle={instruction.author}
  metadata={
    <div className="flex gap-1.5">
      <Badge>{instruction.partsCount} pieces</Badge>
      <Badge>{instruction.theme}</Badge>
    </div>
  }
  onClick={() => navigate(`/instructions/${instruction.id}`)}
/>
```

**After:**
```tsx
const cardProps = createInstructionCard(instruction, {
  onClick: () => navigate(`/instructions/${instruction.id}`),
})
return <GalleryCard {...cardProps} />
```

## Testing

All factories are fully tested with unit tests covering:
- Correct prop mapping
- Image fallback logic
- Metadata badge rendering
- Option handling
- Action button integration

See `__tests__/` directory for examples.

## Type Safety

All factories use Zod schemas for option validation:

```typescript
import { InstructionCardOptionsSchema } from '@repo/gallery'

// Runtime validation
const options = InstructionCardOptionsSchema.parse({
  showPieceCount: true,
  showTheme: false,
})
```

## Pattern

Factories follow the column-helpers.tsx pattern:
1. Accept domain data + options
2. Return configuration object
3. Pure functions (no React hooks)
4. Consistent naming: `create<Domain>Card`

## Related

- `GalleryCard` component: `packages/core/gallery/src/components/GalleryCard.tsx`
- Column helpers: `packages/core/gallery/src/utils/column-helpers.tsx`
- Domain schemas: `@repo/api-client`
