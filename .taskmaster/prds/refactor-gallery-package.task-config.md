# Gallery Component Refactoring PRD - Developer Implementation Guide

## Overview  
Refactor the existing Gallery component system to improve maintainability, performance, and developer experience within our TypeScript monorepo. The component currently handles MOC instruction cards and inspiration gallery cards with a unique stacked visual effect, but needs architectural improvements for better scalability and shadcn/ui integration.

**Target**: Transform existing Gallery into a production-ready component system using shadcn/ui components from `packages/ui` directory, maintaining backward compatibility while adding modern React patterns.

## Current Implementation Context

```typescript
// EXISTING CODE - Current Gallery Implementation
import { z } from 'zod';
import React from 'react';

// Base GalleryCard schema
const GalleryCardSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string().min(1),
});

// MocInstructionCard extends GalleryCard
const MocInstructionCardSchema = GalleryCardSchema.extend({
  instructions: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  pieceCount: z.number().min(1),
});

// InspirationGalleryCard extends GalleryCard  
const InspirationGalleryCardSchema = GalleryCardSchema.extend({
  description: z.string(),
  tags: z.array(z.string()),
  author: z.string().optional(),
});

// Extract the TypeScript types
type GalleryCard = z.infer<typeof GalleryCardSchema>;
type MocInstructionCard = z.infer<typeof MocInstructionCardSchema>;
type InspirationGalleryCard = z.infer<typeof InspirationGalleryCardSchema>;

// Gallery component props with generic constraint
interface GalleryProps<T extends GalleryCard> {
  items: T | T[]; // Single item or array (album)
  renderItem: (item: T) => React.ReactNode;
  className?: string;
}

function Gallery<T extends GalleryCard>({ 
  items, 
  renderItem, 
  className 
}: GalleryProps<T>) {
  const isAlbum = Array.isArray(items);
  const displayItem = isAlbum ? items[0] : items;
  const previewItems = isAlbum ? items.slice(0, 3) : [items];
  const totalCount = isAlbum ? items.length : 1;
  
  return (
    <div className={`relative ${className}`}>
      <div className="relative mb-3 mr-3">
        {previewItems.map((item, index) => (
          <div
            key={index}
            className={`
              bg-white rounded-lg shadow-md overflow-hidden border border-gray-200
              ${index === 0 ? 'relative z-30' : 'absolute'}
              ${index === 1 ? 'z-20 translate-x-1 translate-y-1 w-[calc(100%-4px)]' : ''}
              ${index === 2 ? 'z-10 translate-x-2 translate-y-2 w-[calc(100%-8px)]' : ''}
            `}
          >
            <img 
              src={item.imageUrl} 
              alt={item.title}
              className="w-full h-48 object-cover"
            />
            {index === 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{displayItem.title}</h3>
                  {isAlbum && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {totalCount} items
                    </span>
                  )}
                </div>
                {renderItem(displayItem)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { 
  Gallery, 
  GalleryCardSchema, 
  MocInstructionCardSchema, 
  InspirationGalleryCardSchema,
  type GalleryCard,
  type MocInstructionCard, 
  type InspirationGalleryCard,
  type GalleryProps 
};
```

## Core Features  

### 1. Enhanced Component Architecture
**Implementation**: Create composable components using shadcn/ui primitives
- Use `Card`, `CardContent`, `CardHeader` from `packages/ui/card`
- Implement `Badge` from `packages/ui/badge` for difficulty/tags
- Utilize `Button` from `packages/ui/button` for interactions
- Apply `cn()` utility for className merging

### 2. Improved Type System with Zod
**Implementation**: Extend existing Zod schemas with enhanced validation
```typescript
// Enhanced schemas with better validation
const BaseGalleryCardSchema = z.object({
  id: z.string().uuid().optional(),
  imageUrl: z.string().url(),
  title: z.string().min(1).max(100),
  createdAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

const GalleryLayoutSchema = z.object({
  variant: z.enum(['stack', 'grid', 'masonry']).default('stack'),
  columns: z.number().min(1).max(6).default(3),
  gap: z.enum(['sm', 'md', 'lg']).default('md')
});

const GalleryPropsSchema = z.object({
  layout: GalleryLayoutSchema.optional(),
  virtualized: z.boolean().default(false),
  className: z.string().optional(),
  testId: z.string().optional(),
});

// Inferred types from Zod schemas
type BaseGalleryCard = z.infer<typeof BaseGalleryCardSchema>;
type GalleryLayout = z.infer<typeof GalleryLayoutSchema>;
type GalleryPropsConfig = z.infer<typeof GalleryPropsSchema>;
```

### 3. Layout Strategy Pattern
**Implementation**: Replace hardcoded stacking with configurable layouts
- Preserve existing stack layout as default
- Add grid layout using CSS Grid
- Implement masonry layout with CSS columns
- Use shadcn/ui spacing tokens consistently

### 4. Performance Optimizations
**Implementation**: Add React.memo, useMemo, and lazy loading
- Memoize expensive calculations (item filtering, layout calculations)
- Implement intersection observer for image lazy loading
- Add virtualization for large datasets using react-window
- Optimize re-renders with useCallback for event handlers

## User Experience  

### Developer-First API Design with Zod
```typescript
// Target API - Zod schema-based props
const EnhancedGalleryPropsSchema = <T extends z.ZodSchema>(itemSchema: T) => z.object({
  items: z.union([itemSchema, z.array(itemSchema)]),
  renderItem: z.function().args(itemSchema.output, z.number()).returns(z.any()),
  layout: GalleryLayoutSchema.optional(),
  onItemClick: z.function().args(itemSchema.output, z.number()).returns(z.void()).optional(),
  virtualized: z.boolean().default(false),
  className: z.string().optional(),
  testId: z.string().optional(),
});

// Usage type inference
type EnhancedGalleryProps<T extends z.ZodSchema> = z.infer<ReturnType<typeof EnhancedGalleryPropsSchema<T>>>;
```

### Component Composition Pattern
- Main `Gallery` component as container
- `GalleryItem` as individual card wrapper
- `GalleryStack` for stacked layout logic
- `GalleryGrid` for grid layout
- All using shadcn/ui components internally

## Technical Architecture  

### File Structure
```
packages/ui/
├── gallery/
│   ├── index.ts                 # Main exports
│   ├── gallery.tsx              # Main Gallery component
│   ├── gallery-item.tsx         # Individual item wrapper
│   ├── gallery-stack.tsx        # Stack layout implementation
│   ├── gallery-grid.tsx         # Grid layout implementation
│   ├── gallery-schemas.ts       # Zod schemas and types
│   └── __tests__/               # Test files
│       ├── gallery.test.tsx
│       ├── gallery-item.test.tsx
│       ├── gallery-layouts.test.tsx
│       └── gallery-integration.test.tsx
└── components.json              # shadcn/ui config
```

### shadcn/ui Component Dependencies
```typescript
// Required shadcn/ui components to install/use
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
```

### Data Flow Architecture
1. **Props Validation**: Zod schemas validate input data at runtime
2. **Layout Resolution**: Strategy pattern determines rendering approach
3. **Item Processing**: Memoized functions prepare items for rendering
4. **Render Optimization**: React.memo prevents unnecessary re-renders
5. **Event Handling**: Type-safe callbacks validated by Zod

## Development Roadmap  

### Phase 1: Foundation Migration (Sprint 1)
**Files to Create/Modify**:
- `packages/ui/gallery/gallery-schemas.ts` - Enhanced Zod schemas
- `packages/ui/gallery/gallery-item.tsx` - shadcn/ui Card-based item wrapper
- `packages/ui/gallery/gallery.tsx` - Refactored main component

**Implementation Tasks**:
1. Create enhanced Zod schemas extending current types
2. Migrate existing className logic to use `cn()` utility
3. Replace hardcoded styling with shadcn/ui Card components
4. Implement backward-compatible prop interface using Zod
5. Add comprehensive TypeScript tests

**Code Example - Gallery Item**:
```typescript
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { z } from "zod"

const GalleryItemPropsSchema = z.object({
  item: BaseGalleryCardSchema,
  index: z.number(),
  isStacked: z.boolean().default(false),
  onClick: z.function().args(BaseGalleryCardSchema.output, z.number()).returns(z.void()).optional(),
  className: z.string().optional(),
});

type GalleryItemProps = z.infer<typeof GalleryItemPropsSchema>;

export const GalleryItem = React.memo(({
  item,
  index,
  isStacked = false,
  onClick,
  className
}: GalleryItemProps) => {
  return (
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer transition-all hover:shadow-lg",
        isStacked && index > 0 && "absolute",
        isStacked && index === 1 && "z-20 translate-x-1 translate-y-1 w-[calc(100%-4px)]",
        isStacked && index === 2 && "z-10 translate-x-2 translate-y-2 w-[calc(100%-8px)]",
        className
      )}
      onClick={() => onClick?.(item, index)}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <img 
          src={item.imageUrl} 
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {index === 0 && (
        <CardContent className="p-4">
          <CardHeader className="p-0 mb-2">
            <h3 className="font-semibold text-lg">{item.title}</h3>
          </CardHeader>
        </CardContent>
      )}
    </Card>
  );
});
```

### Phase 2: Layout System (Sprint 2)
**Files to Create**:
- `packages/ui/gallery/gallery-stack.tsx` - Enhanced stack layout
- `packages/ui/gallery/gallery-grid.tsx` - Grid layout implementation
- `packages/ui/gallery/layouts/index.ts` - Layout strategy exports

### Phase 3: Performance & Developer Experience (Sprint 3)
**Files to Create/Modify**:
- `packages/ui/gallery/gallery-virtualized.tsx` - Virtualization wrapper
- `packages/ui/gallery/hooks/use-gallery-performance.ts` - Performance hooks
- `packages/ui/gallery/gallery.stories.tsx` - Storybook stories

### Phase 4: Advanced Features (Sprint 4)
**Files to Create**:
- `packages/ui/gallery/gallery-modal.tsx` - Lightbox implementation
- `packages/ui/gallery/gallery-controls.tsx` - Filter/search controls
- `packages/ui/gallery/hooks/use-gallery-state.ts` - State management

## Test Cases

### Unit Tests

#### Gallery Component Tests (`gallery.test.tsx`)
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Gallery } from '../gallery'
import { MocInstructionCardSchema } from '../gallery-schemas'

describe('Gallery Component', () => {
  const mockMocCard = {
    imageUrl: 'https://example.com/image.jpg',
    title: 'Test MOC',
    instructions: 'Build this amazing MOC',
    difficulty: 'intermediate' as const,
    pieceCount: 500
  }

  const mockRenderItem = (item: any) => (
    <div data-testid="rendered-item">
      <p>{item.instructions}</p>
      <span>{item.difficulty}</span>
    </div>
  )

  test('renders single item correctly', () => {
    render(
      <Gallery 
        items={mockMocCard}
        renderItem={mockRenderItem}
        testId="gallery-single"
      />
    )
    
    expect(screen.getByTestId('gallery-single')).toBeInTheDocument()
    expect(screen.getByText('Test MOC')).toBeInTheDocument()
    expect(screen.getByText('Build this amazing MOC')).toBeInTheDocument()
  })

  test('renders album with stack effect', () => {
    const mockAlbum = [mockMocCard, { ...mockMocCard, title: 'MOC 2' }]
    
    render(
      <Gallery 
        items={mockAlbum}
        renderItem={mockRenderItem}
        layout={{ variant: 'stack' }}
      />
    )
    
    expect(screen.getByText('2 items')).toBeInTheDocument()
    const stackedItems = screen.getAllByRole('img')
    expect(stackedItems).toHaveLength(2)
  })

  test('validates props with Zod schema', () => {
    const invalidItem = { title: '', imageUrl: 'invalid-url' }
    
    expect(() => {
      MocInstructionCardSchema.parse(invalidItem)
    }).toThrow()
  })

  test('handles click events correctly', () => {
    const mockOnClick = jest.fn()
    
    render(
      <Gallery 
        items={mockMocCard}
        renderItem={mockRenderItem}
        onItemClick={mockOnClick}
      />
    )
    
    fireEvent.click(screen.getByRole('img'))
    expect(mockOnClick).toHaveBeenCalledWith(mockMocCard, 0)
  })

  test('applies custom className', () => {
    render(
      <Gallery 
        items={mockMocCard}
        renderItem={mockRenderItem}
        className="custom-gallery"
        testId="gallery-custom"
      />
    )
    
    expect(screen.getByTestId('gallery-custom')).toHaveClass('custom-gallery')
  })
})
```

#### Gallery Item Tests (`gallery-item.test.tsx`)
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { GalleryItem } from '../gallery-item'

describe('GalleryItem Component', () => {
  const mockItem = {
    imageUrl: 'https://example.com/image.jpg',
    title: 'Test Item'
  }

  test('renders item with correct styling', () => {
    render(
      <GalleryItem 
        item={mockItem}
        index={0}
        renderContent={() => <div>Content</div>}
      />
    )
    
    expect(screen.getByRole('img')).toHaveAttribute('src', mockItem.imageUrl)
    expect(screen.getByRole('img')).toHaveAttribute('alt', mockItem.title)
    expect(screen.getByText(mockItem.title)).toBeInTheDocument()
  })

  test('applies stacked styling for index > 0', () => {
    const { container } = render(
      <GalleryItem 
        item={mockItem}
        index={1}
        isStacked={true}
        renderContent={() => <div>Content</div>}
      />
    )
    
    const card = container.firstChild
    expect(card).toHaveClass('absolute', 'z-20', 'translate-x-1', 'translate-y-1')
  })

  test('calls onClick when clicked', () => {
    const mockOnClick = jest.fn()
    
    render(
      <GalleryItem 
        item={mockItem}
        index={0}
        renderContent={() => <div>Content</div>}
        onClick={mockOnClick}
      />
    )
    
    fireEvent.click(screen.getByRole('img').closest('div')!)
    expect(mockOnClick).toHaveBeenCalledWith(mockItem, 0)
  })

  test('renders content only for index 0', () => {
    render(
      <GalleryItem 
        item={mockItem}
        index={1}
        renderContent={() => <div data-testid="item-content">Content</div>}
      />
    )
    
    expect(screen.queryByTestId('item-content')).not.toBeInTheDocument()
  })
})
```

#### Layout Tests (`gallery-layouts.test.tsx`)
```typescript
import { render, screen } from '@testing-library/react'
import { GalleryStack } from '../gallery-stack'
import { GalleryGrid } from '../gallery-grid'

describe('Gallery Layouts', () => {
  const mockItems = [
    { imageUrl: 'https://example.com/1.jpg', title: 'Item 1' },
    { imageUrl: 'https://example.com/2.jpg', title: 'Item 2' },
    { imageUrl: 'https://example.com/3.jpg', title: 'Item 3' }
  ]

  const mockRenderItem = (item: any) => <div>{item.title}</div>

  describe('GalleryStack', () => {
    test('renders items with stacked effect', () => {
      render(
        <GalleryStack 
          items={mockItems}
          renderItem={mockRenderItem}
        />
      )
      
      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(3)
      
      // Check stacking classes are applied
      expect(images[1].closest('div')).toHaveClass('absolute', 'z-20')
      expect(images[2].closest('div')).toHaveClass('absolute', 'z-10')
    })

    test('shows item count badge for multiple items', () => {
      render(
        <GalleryStack 
          items={mockItems}
          renderItem={mockRenderItem}
        />
      )
      
      expect(screen.getByText('3 items')).toBeInTheDocument()
    })
  })

  describe('GalleryGrid', () => {
    test('renders items in grid layout', () => {
      render(
        <GalleryGrid 
          items={mockItems}
          renderItem={mockRenderItem}
          columns={2}
        />
      )
      
      const container = screen.getByTestId('gallery-grid')
      expect(container).toHaveStyle('grid-template-columns: repeat(2, minmax(0, 1fr))')
    })

    test('applies responsive columns', () => {
      render(
        <GalleryGrid 
          items={mockItems}
          renderItem={mockRenderItem}
          columns={3}
          responsive={true}
        />
      )
      
      const container = screen.getByTestId('gallery-grid')
      expect(container).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3')
    })
  })
})
```

### Integration Tests (`gallery-integration.test.tsx`)
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Gallery } from '../gallery'
import { MocInstructionCardSchema, InspirationGalleryCardSchema } from '../gallery-schemas'

describe('Gallery Integration Tests', () => {
  test('works with MOC instruction cards', async () => {
    const mocCards = [
      {
        imageUrl: 'https://example.com/castle.jpg',
        title: 'Medieval Castle',
        instructions: 'Build this castle',
        difficulty: 'advanced' as const,
        pieceCount: 1000
      }
    ]

    const renderMocItem = (item: any) => (
      <div>
        <p>{item.instructions}</p>
        <span data-testid="difficulty">{item.difficulty}</span>
        <span data-testid="pieces">{item.pieceCount} pieces</span>
      </div>
    )

    render(
      <Gallery 
        items={mocCards}
        renderItem={renderMocItem}
      />
    )

    expect(screen.getByText('Medieval Castle')).toBeInTheDocument()
    expect(screen.getByText('Build this castle')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty')).toHaveTextContent('advanced')
    expect(screen.getByTestId('pieces')).toHaveTextContent('1000 pieces')
  })

  test('works with inspiration gallery cards', () => {
    const inspirationCards = [
      {
        imageUrl: 'https://example.com/spaceship.jpg',
        title: 'Custom Spaceship',
        description: 'Futuristic design',
        tags: ['spaceship', 'sci-fi'],
        author: 'BrickMaster'
      }
    ]

    const renderInspirationItem = (item: any) => (
      <div>
        <p>{item.description}</p>
        <div data-testid="tags">
          {item.tags.map((tag: string) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        {item.author && <p data-testid="author">by {item.author}</p>}
      </div>
    )

    render(
      <Gallery 
        items={inspirationCards}
        renderItem={renderInspirationItem}
      />
    )

    expect(screen.getByText('Custom Spaceship')).toBeInTheDocument()
    expect(screen.getByText('Futuristic design')).toBeInTheDocument()
    expect(screen.getByTestId('tags')).toHaveTextContent('#spaceship#sci-fi')
    expect(screen.getByTestId('author')).toHaveTextContent('by BrickMaster')
  })

  test('switches between layouts correctly', async () => {
    const items = [
      { imageUrl: 'https://example.com/1.jpg', title: 'Item 1' },
      { imageUrl: 'https://example.com/2.jpg', title: 'Item 2' }
    ]

    const { rerender } = render(
      <Gallery 
        items={items}
        renderItem={(item) => <div>{item.title}</div>}
        layout={{ variant: 'stack' }}
      />
    )

    // Check stack layout
    expect(screen.getByText('2 items')).toBeInTheDocument()

    // Switch to grid layout
    rerender(
      <Gallery 
        items={items}
        renderItem={(item) => <div>{item.title}</div>}
        layout={{ variant: 'grid', columns: 2 }}
      />
    )

    // Verify grid layout applied
    const gridContainer = screen.getByTestId('gallery-grid')
    expect(gridContainer).toBeInTheDocument()
  })

  test('handles large datasets with virtualization', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      imageUrl: `https://example.com/${i}.jpg`,
      title: `Item ${i}`
    }))

    render(
      <Gallery 
        items={largeDataset}
        renderItem={(item) => <div>{item.title}</div>}
        virtualized={true}
      />
    )

    // Only visible items should be rendered initially
    await waitFor(() => {
      const renderedItems = screen.getAllByText(/Item \d+/)
      expect(renderedItems.length).toBeLessThan(50) // Assuming viewport shows ~20-30 items
    })
  })
})
```

### Performance Tests
```typescript
import { render, screen } from '@testing-library/react'
import { Gallery } from '../gallery'

describe('Gallery Performance Tests', () => {
  test('renders 100 items within performance budget', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      imageUrl: `https://example.com/${i}.jpg`,
      title: `Item ${i}`
    }))

    const startTime = performance.now()
    
    render(
      <Gallery 
        items={items}
        renderItem={(item) => <div>{item.title}</div>}
      />
    )

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100)
  })

  test('memoization prevents unnecessary re-renders', () => {
    const mockRenderItem = jest.fn((item) => <div>{item.title}</div>)
    const items = [
      { imageUrl: 'https://example.com/1.jpg', title: 'Item 1' }
    ]

    const { rerender } = render(
      <Gallery 
        items={items}
        renderItem={mockRenderItem}
        className="test-class"
      />
    )

    // Clear mock calls from initial render
    mockRenderItem.mockClear()

    // Re-render with same props
    rerender(
      <Gallery 
        items={items}
        renderItem={mockRenderItem}
        className="test-class"
      />
    )

    // Should not call renderItem again due to memoization
    expect(mockRenderItem).not.toHaveBeenCalled()
  })
})
```

### Schema Validation Tests
```typescript
import { 
  GalleryCardSchema, 
  MocInstructionCardSchema, 
  InspirationGalleryCardSchema,
  GalleryLayoutSchema 
} from '../gallery-schemas'

describe('Schema Validation Tests', () => {
  describe('GalleryCardSchema', () => {
    test('validates correct gallery card', () => {
      const validCard = {
        imageUrl: 'https://example.com/image.jpg',
        title: 'Valid Title'
      }

      expect(() => GalleryCardSchema.parse(validCard)).not.toThrow()
    })

    test('rejects invalid URL', () => {
      const invalidCard = {
        imageUrl: 'not-a-url',
        title: 'Valid Title'
      }

      expect(() => GalleryCardSchema.parse(invalidCard)).toThrow()
    })

    test('rejects empty title', () => {
      const invalidCard = {
        imageUrl: 'https://example.com/image.jpg',
        title: ''
      }

      expect(() => GalleryCardSchema.parse(invalidCard)).toThrow()
    })
  })

  describe('MocInstructionCardSchema', () => {
    test('validates complete MOC card', () => {
      const validMoc = {
        imageUrl: 'https://example.com/castle.jpg',
        title: 'Medieval Castle',
        instructions: 'Build this castle step by step',
        difficulty: 'intermediate' as const,
        pieceCount: 500
      }

      expect(() => MocInstructionCardSchema.parse(validMoc)).not.toThrow()
    })

    test('rejects invalid difficulty', () => {
      const invalidMoc = {
        imageUrl: 'https://example.com/castle.jpg',
        title: 'Medieval Castle',
        instructions: 'Build this castle',
        difficulty: 'expert', // Invalid difficulty
        pieceCount: 500
      }

      expect(() => MocInstructionCardSchema.parse(invalidMoc)).toThrow()
    })

    test('rejects negative piece count', () => {
      const invalidMoc = {
        imageUrl: 'https://example.com/castle.jpg',
        title: 'Medieval Castle',
        instructions: 'Build this castle',
        difficulty: 'beginner' as const,
        pieceCount: -10
      }

      expect(() => MocInstructionCardSchema.parse(invalidMoc)).toThrow()
    })
  })

  describe('GalleryLayoutSchema', () => {
    test('applies default values', () => {
      const result = GalleryLayoutSchema.parse({})
      
      expect(result.variant).toBe('stack')
      expect(result.columns).toBe(3)
      expect(result.gap).toBe('md')
    })

    test('validates custom layout options', () => {
      const customLayout = {
        variant: 'grid' as const,
        columns: 4,
        gap: 'lg' as const
      }

      const result = GalleryLayoutSchema.parse(customLayout)
      expect(result).toEqual(customLayout)
    })

    test('rejects invalid variant', () => {
      const invalidLayout = {
        variant: 'carousel' // Not in enum
      }

      expect(() => GalleryLayoutSchema.parse(invalidLayout)).toThrow()
    })
  })
})
```

## Logical Dependency Chain

### Critical Path (Must be completed in order)
1. **Zod Schema Enhancement** → Foundation for all type safety
2. **shadcn/ui Integration** → Required for consistent styling
3. **Component Architecture** → Enables layout flexibility
4. **Backward Compatibility** → Ensures smooth migration

### Parallel Development Opportunities
- Layout implementations can be built simultaneously after architecture
- Performance optimizations can be added incrementally
- Advanced features can be developed independently

### Quick Wins (High impact, low effort)
1. Replace hardcoded styles with shadcn/ui components (Week 1)
2. Add Zod runtime validation (Week 1)
3. Implement basic grid layout (Week 2)
4. Add performance monitoring (Week 3)

## Risks and Mitigations  

### Technical Implementation Risks
**Risk**: Breaking changes in existing implementations
**Mitigation**: 
- Maintain exact API compatibility in v1
- Use Zod transforms for backward compatibility
- Create comprehensive migration guide
- Implement feature flags for new functionality

**Risk**: Performance regression with shadcn/ui overhead
**Mitigation**:
- Benchmark current vs new implementation
- Implement tree-shaking for unused components
- Add performance monitoring from day one

**Risk**: Complex Zod schema validation overhead
**Mitigation**:
- Use Zod transforms for performance optimization
- Implement development-only validation mode
- Cache parsed results where appropriate

## Appendix  

### shadcn/ui Component Mapping
```typescript
// Current → shadcn/ui replacement
"bg-white rounded-lg shadow-md border" → <Card>
"font-semibold text-lg" → <CardHeader><h3>
"text-xs bg-blue-100 px-2 py-1 rounded-full" → <Badge variant="secondary">
"p-4" → <CardContent>
"hover:shadow-lg transition-all" → Card with hover variant
```

### Performance Benchmarks (Target Metrics)
- Bundle size increase: <10kb gzipped
- First paint time: <16ms for 50 items
- Interaction latency: <100ms for all user actions
- Memory usage: <2MB for 1000 items
- Zod validation overhead: <1ms per item

### Migration Checklist
- [ ] All existing Zod schemas supported and enhanced
- [ ] Visual parity achieved with shadcn/ui components
- [ ] Performance meets or exceeds benchmarks
- [ ] TypeScript compilation passes with strict mode
- [ ] All test suites achieve 95%+ coverage
- [ ] Storybook documentation complete
- [ ] Runtime validation working correctly
- [ ] Accessibility audit complete
- [ ] Integration tests pass across all layouts
- [ ] Bundle size analysis completed

### Zod Schema Evolution Strategy
```typescript
// Phase 1: Enhance existing schemas
const GalleryCardSchemaV2 = GalleryCardSchema.extend({
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

// Phase 2: Add layout configuration
const GalleryConfigSchema = z.object({
  layout: GalleryLayoutSchema.optional(),
  performance: z.object({
    virtualized: z.boolean().default(false),
    lazyLoading: z.boolean().default(true),
    memoization: z.boolean().default(true)
  }).optional(),
  accessibility: z.object({
    announceChanges: z.boolean().default(true),
    keyboardNavigation: z.boolean().default(true)
  }).optional()
});

// Phase 3: Advanced features schema
const GalleryInteractionSchema = z.object({
  modal: z.object({
    enabled: z.boolean().default(false),
    variant: z.enum(['overlay', 'drawer', 'popover']).default('overlay')
  }).optional(),
  filtering: z.object({
    enabled: z.boolean().default(false),
    fields: z.array(z.string()).optional()
  }).optional(),
  sorting: z.object({
    enabled: z.boolean().default(false),
    defaultSort: z.string().optional(),
    options: z.array(z.object({
      field: z.string(),
      label: z.string(),
      direction: z.enum(['asc', 'desc']).default('asc')
    })).optional()
  }).optional()
});
```

### Testing Strategy
```typescript
// Test file structure with coverage targets
__tests__/
├── unit/
│   ├── gallery.test.tsx              # Core component (95% coverage)
│   ├── gallery-item.test.tsx         # Item component (95% coverage)
│   ├── gallery-layouts.test.tsx      # Layout system (90% coverage)
│   └── gallery-schemas.test.tsx      # Zod validation (100% coverage)
├── integration/
│   ├── gallery-integration.test.tsx  # Full workflows (85% coverage)
│   ├── gallery-performance.test.tsx  # Performance benchmarks
│   └── gallery-accessibility.test.tsx # A11y compliance
├── e2e/
│   ├── gallery-user-flows.spec.ts   # User interaction flows
│   └── gallery-responsive.spec.ts   # Cross-device testing
└── visual/
    ├── gallery-snapshots.test.tsx   # Visual regression
    └── gallery-storybook.test.tsx   # Storybook testing
```

### Development Environment Setup
```typescript
// Required dev dependencies
{
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "@storybook/react": "^6.5.16",
    "@storybook/addon-essentials": "^6.5.16",
    "jest": "^29.3.1",
    "jest-environment-jsdom": "^29.3.1",
    "react-window": "^1.8.8",
    "@types/react-window": "^1.8.5",
    "intersection-observer": "^0.12.2"
  },
  "dependencies": {
    "zod": "^3.20.2",
    "class-variance-authority": "^0.4.0",
    "clsx": "^1.2.1",
    "tailwind-merge": "^1.8.1"
  }
}
```

### Storybook Stories Structure
```typescript
// gallery.stories.tsx
export default {
  title: 'Components/Gallery',
  component: Gallery,
  parameters: {
    docs: {
      description: {
        component: 'A flexible gallery component supporting multiple layouts and item types.'
      }
    }
  },
  argTypes: {
    layout: {
      control: { type: 'select' },
      options: ['stack', 'grid', 'masonry']
    },
    items: {
      control: { type: 'object' }
    }
  }
} as Meta<typeof Gallery>;

// Story templates
export const SingleMocCard: Story = {
  args: {
    items: mockMocCard,
    renderItem: mockMocRenderItem
  }
};

export const MocCardAlbum: Story = {
  args: {
    items: mockMocAlbum,
    renderItem: mockMocRenderItem,
    layout: { variant: 'stack' }
  }
};

export const GridLayout: Story = {
  args: {
    items: mockMocAlbum,
    renderItem: mockMocRenderItem,
    layout: { variant: 'grid', columns: 3, gap: 'md' }
  }
};

export const VirtualizedGallery: Story = {
  args: {
    items: largeMockDataset,
    renderItem: mockMocRenderItem,
    virtualized: true,
    layout: { variant: 'grid', columns: 4 }
  }
};

export const InspirationGallery: Story = {
  args: {
    items: mockInspirationCards,
    renderItem: mockInspirationRenderItem
  }
};
```

### Error Handling Strategy
```typescript
// Error boundary for gallery components
const GalleryErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <Card className="p-6 text-center">
          <CardHeader>
            <h3 className="text-lg font-semibold text-destructive">Gallery Error</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Unable to render gallery items. Please try again.
            </p>
            <Button onClick={resetError} variant="outline" size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

// Zod error handling
const validateGalleryProps = <T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Gallery validation error:', error.errors);
      // Provide fallback or throw user-friendly error
      throw new Error(`Invalid gallery configuration: ${error.errors[0]?.message}`);
    }
    throw error;
  }
};
```

### Accessibility Requirements
```typescript
// WCAG 2.1 AA compliance checklist
const accessibilityRequirements = {
  keyboardNavigation: {
    // Tab through gallery items
    // Arrow keys for grid navigation
    // Enter/Space to activate items
    // Escape to close modals
  },
  screenReader: {
    // Proper ARIA labels and descriptions
    // Live regions for dynamic content
    // Role announcements for layout changes
  },
  colorContrast: {
    // 4.5:1 minimum for normal text
    // 3:1 minimum for large text
    // Non-color dependent state indicators
  },
  focusManagement: {
    // Visible focus indicators
    // Logical tab order
    // Focus restoration after modal close
  },
  responsiveDesign: {
    // Touch targets minimum 44px
    // Readable text at 200% zoom
    // Usable in landscape/portrait
  }
};

// Implementation example
const useAccessibility = () => {
  const [announceText, setAnnounceText] = useState('');
  
  const announceToScreenReader = useCallback((text: string) => {
    setAnnounceText(text);
    setTimeout(() => setAnnounceText(''), 1000);
  }, []);

  return {
    announceText,
    announceToScreenReader,
    ariaProps: {
      'aria-live': 'polite' as const,
      'aria-atomic': true
    }
  };
};
```

### Bundle Analysis Configuration
```typescript
// webpack-bundle-analyzer configuration
const bundleAnalyzerConfig = {
  analyzerMode: 'static',
  openAnalyzer: false,
  generateStatsFile: true,
  statsFilename: 'gallery-bundle-stats.json',
  reportFilename: 'gallery-bundle-report.html'
};

// Target bundle metrics
const bundleTargets = {
  galleryCore: '< 15kb gzipped',
  galleryWithVirtualization: '< 25kb gzipped',
  shadcnDependencies: '< 30kb gzipped',
  totalIncrease: '< 50kb gzipped'
};
```

### Deployment Checklist
- [ ] All unit tests passing (95%+ coverage)
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Bundle size analysis completed
- [ ] Accessibility audit passed
- [ ] Cross-browser testing completed
- [ ] Storybook documentation published
- [ ] Migration guide written
- [ ] Rollback plan documented
- [ ] Feature flags configured
- [ ] Monitoring and alerts set up
- [ ] Team training completed