# @repo/gallery

Gallery components for displaying collections of cards with advanced features like selection mode, drag handles, and hover overlays.

## Components

### GalleryCard

The `GalleryCard` component is a versatile card component for displaying gallery items with support for:

- **Selection mode** - Multi-select functionality with checkboxes
- **Drag handles** - Reorderable cards with drag-and-drop (requires integration with @dnd-kit)
- **Hover overlays** - Custom content displayed on hover (desktop) or always visible (mobile)
- **Responsive images** - Lazy loading with skeleton states
- **Accessibility** - WCAG 2.1 AA compliant with keyboard navigation and ARIA attributes

## Features

### Selection Mode

Enable multi-select functionality with a checkbox overlay.

```tsx
import { GalleryCard } from '@repo/gallery'
import { useState } from 'react'

function MyGallery() {
  const [selected, setSelected] = useState(false)
  const [selectionMode, setSelectionMode] = useState(true)

  return (
    <GalleryCard
      image={{ src: '/image.jpg', alt: 'My image' }}
      title="My Card"
      selectable={selectionMode}
      selected={selected}
      onSelect={setSelected}
      selectionPosition="top-left" // 'top-left' | 'top-right'
    />
  )
}
```

**Props:**
- `selectable?: boolean` - Enable selection mode
- `selected?: boolean` - Whether card is selected
- `onSelect?: (selected: boolean) => void` - Called when selection state changes
- `selectionPosition?: 'top-left' | 'top-right'` - Checkbox position (default: 'top-left')

**Notes:**
- Checkbox is 24x24px with rounded-full styling
- Selected state shows check icon with primary color
- When both `selectable` and `draggable` are enabled, checkbox is fixed to top-left (position prop ignored)

### Drag Handles

Add drag-and-drop reordering capability with built-in drag handles.

```tsx
import { GalleryCard } from '@repo/gallery'
import { useSortable } from '@dnd-kit/sortable'

function DraggableCard({ id, title, image }) {
  const { attributes, listeners, setNodeRef } = useSortable({ id })

  return (
    <div ref={setNodeRef}>
      <GalleryCard
        image={image}
        title={title}
        draggable={true}
        dragHandlePosition="top-right" // 'top-left' | 'top-right'
        renderDragHandle={(listeners, attributes) => (
          <button {...listeners} {...attributes} aria-label={`Drag to reorder ${title}`}>
            <GripVertical />
          </button>
        )}
      />
    </div>
  )
}
```

**Props:**
- `draggable?: boolean` - Enable drag handle
- `dragHandlePosition?: 'top-left' | 'top-right'` - Handle position (default: 'top-right')
- `renderDragHandle?: (listeners: any, attributes: any) => React.ReactNode` - Custom drag handle (optional)

**Default Drag Handle:**
- 44x44px touch target (WCAG 2.5.5 compliant)
- GripVertical icon from lucide-react
- Always visible on mobile, visible on hover on desktop
- Cursor changes to `grab` on hover, `grabbing` when active

**Notes:**
- When both `selectable` and `draggable` are enabled, drag handle is fixed to top-right (position prop ignored)
- The `renderDragHandle` prop allows custom icons/styling while maintaining accessibility

### Hover Overlays

Display custom content on hover (desktop) or always visible (mobile).

```tsx
import { GalleryCard } from '@repo/gallery'
import { MoreVertical, ExternalLink } from 'lucide-react'

function MyCard() {
  return (
    <GalleryCard
      image={{ src: '/image.jpg', alt: 'My image' }}
      title="My Card"
      hoverOverlay={
        <>
          {/* Top actions */}
          <div className="absolute top-2 right-2 flex gap-1 z-20">
            <button aria-label="Open link">
              <ExternalLink className="h-4 w-4" />
            </button>
            <button aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
            <h3 className="text-white font-medium">{title}</h3>
            <p className="text-white/70 text-sm">Description</p>
          </div>
        </>
      }
    />
  )
}
```

**Behavior:**
- **Mobile (<768px):** Overlay is always visible
- **Desktop (>=768px):** Overlay visible on hover only
- Gradient background: `bg-gradient-to-t from-black/60 via-transparent to-transparent`
- Smooth opacity transition (200ms)

## Breaking Changes

### v2.0.0 - Actions Overlay Removed

The built-in `actions` prop has been removed from `GalleryCard`. Use the `hoverOverlay` prop instead.

**Before:**
```tsx
<GalleryCard
  image={{ src: '/image.jpg', alt: 'My image' }}
  title="My Card"
  actions={[
    { icon: <Edit />, label: 'Edit', onClick: handleEdit },
    { icon: <Delete />, label: 'Delete', onClick: handleDelete },
  ]}
/>
```

**After:**
```tsx
<GalleryCard
  image={{ src: '/image.jpg', alt: 'My image' }}
  title="My Card"
  hoverOverlay={
    <div className="absolute top-2 right-2 flex gap-1 z-20">
      <button onClick={handleEdit} aria-label="Edit">
        <Edit className="h-4 w-4" />
      </button>
      <button onClick={handleDelete} aria-label="Delete">
        <Delete className="h-4 w-4" />
      </button>
    </div>
  }
/>
```

**Why?**
- More flexible - position content anywhere
- No z-index conflicts with selection/drag overlays
- Simpler API - one pattern for all overlay content
- Consumers have full control over styling and behavior

## Migration Guide

### From Card to GalleryCard

If you're migrating from a custom Card component to GalleryCard:

1. **Replace Card wrapper:**
   ```tsx
   // Before
   <Card onClick={onClick}>
     <CardContent>
       <img src={image} alt={title} />
       {/* ... */}
     </CardContent>
   </Card>

   // After
   <GalleryCard
     image={{ src: image, alt: title }}
     title={title}
     onClick={onClick}
   />
   ```

2. **Move selection checkbox to selectable prop:**
   ```tsx
   // Before
   {selectionMode && (
     <div className="absolute top-2 left-2">
       <Checkbox checked={isSelected} onChange={handleSelect} />
     </div>
   )}

   // After
   <GalleryCard
     selectable={selectionMode}
     selected={isSelected}
     onSelect={handleSelect}
   />
   ```

3. **Move hover content to hoverOverlay prop:**
   ```tsx
   // Before
   <div className="absolute inset-0 opacity-0 hover:opacity-100">
     <div className="absolute bottom-0 p-3">
       <h3>{title}</h3>
     </div>
   </div>

   // After
   <GalleryCard
     hoverOverlay={
       <div className="absolute bottom-0 left-0 right-0 p-3">
         <h3 className="text-white">{title}</h3>
       </div>
     }
   />
   ```

## Accessibility

GalleryCard follows WCAG 2.1 AA guidelines:

- **Keyboard Navigation:** Cards are focusable and activatable with Enter/Space
- **Touch Targets:** All interactive elements meet 44x44px minimum (WCAG 2.5.5)
- **ARIA Labels:** Proper `aria-label`, `aria-pressed`, and `role` attributes
- **Screen Readers:** Selection state and interactive elements are announced
- **Focus Management:** Visible focus indicators on all interactive elements

## TypeScript

All components are fully typed with Zod schemas:

```tsx
import { z } from 'zod'
import { GalleryCardPropsSchema } from '@repo/gallery'

type GalleryCardProps = z.infer<typeof GalleryCardPropsSchema>
```

## Examples

### Basic Gallery
```tsx
<GalleryCard
  image={{ src: '/lego-set.jpg', alt: 'LEGO Castle' }}
  title="Medieval Castle"
  subtitle="Set 10305"
/>
```

### Selectable Gallery
```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

<GalleryCard
  image={{ src: '/lego-set.jpg', alt: 'LEGO Castle' }}
  title="Medieval Castle"
  selectable={true}
  selected={selectedIds.has('castle-001')}
  onSelect={(selected) => {
    const newSet = new Set(selectedIds)
    selected ? newSet.add('castle-001') : newSet.delete('castle-001')
    setSelectedIds(newSet)
  }}
/>
```

### Draggable Gallery with SortableGallery
```tsx
import { SortableGallery } from '@repo/gallery'

<SortableGallery
  items={items}
  onReorder={setItems}
  renderItem={(item) => (
    <GalleryCard
      image={{ src: item.imageUrl, alt: item.title }}
      title={item.title}
      draggable={true}
    />
  )}
/>
```

## License

MIT
