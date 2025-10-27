# MocInstructionsGallery

A comprehensive gallery component for displaying MOC instructions with advanced filtering, sorting, and search capabilities. This component leverages the existing gallery package infrastructure but adapts it specifically for MOC instructions.

## Features

- **Responsive Grid Layout**: Adapts to different screen sizes with configurable columns
- **Advanced Search**: Search across title, description, author, and tags
- **Filtering**: Filter by category, difficulty, author, tags, and publication status
- **Sorting**: Sort by title, creation date, update date, rating, or download count
- **Selection**: Multi-select instructions for batch operations
- **Infinite Scroll**: Load more instructions as needed
- **Editable Mode**: Show edit/delete buttons when in editable mode
- **Animations**: Smooth animations using Framer Motion

## Usage

```tsx
import { MocInstructionsGallery } from '@repo/moc-instructions'

const MyComponent = () => {
  const [instructions, setInstructions] = useState<MockInstruction[]>([])
  const [filters, setFilters] = useState<MockInstructionFilter>({})
  const [sortBy, setSortBy] = useState<MockInstructionSortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  return (
    <MocInstructionsGallery
      instructions={instructions}
      filters={filters}
      onFiltersChange={setFilters}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy)
        setSortOrder(newSortOrder)
      }}
      onInstructionClick={instruction => {
        // Handle instruction click
      }}
      onInstructionDelete={instructionId => {
        // Handle instruction deletion
      }}
      isEditable={true}
      hasMore={true}
      onLoadMore={async () => {
        // Load more instructions
      }}
    />
  )
}
```

## Props

### Required Props

- `instructions`: Array of MOC instructions to display

### Optional Props

- `className`: Additional CSS classes
- `onInstructionClick`: Callback when an instruction is clicked
- `onInstructionLike`: Callback when an instruction is liked
- `onInstructionShare`: Callback when an instruction is shared
- `onInstructionDelete`: Callback when an instruction is deleted
- `onInstructionDownload`: Callback when an instruction is downloaded
- `onInstructionsSelected`: Callback when instructions are selected
- `selectedInstructions`: Array of selected instruction IDs
- `onLoadMore`: Callback to load more instructions
- `hasMore`: Whether there are more instructions to load
- `loading`: Whether currently loading more instructions
- `layout`: Layout type ('grid' | 'list')
- `columns`: Responsive column configuration
- `gap`: Gap between items
- `filters`: Current filter state
- `onFiltersChange`: Callback when filters change
- `sortBy`: Current sort field
- `sortOrder`: Current sort order
- `onSortChange`: Callback when sort changes
- `isEditable`: Whether to show edit/delete buttons

## Layout Configuration

The component supports responsive grid layouts with configurable columns:

```tsx
const columns = {
  sm: 1, // 1 column on small screens
  md: 2, // 2 columns on medium screens
  lg: 3, // 3 columns on large screens
  xl: 4, // 4 columns on extra large screens
}
```

## Filtering

The component supports comprehensive filtering:

- **Search**: Text search across title, description, author, and tags
- **Category**: Filter by instruction category (vehicles, buildings, etc.)
- **Difficulty**: Filter by difficulty level (beginner, intermediate, etc.)
- **Author**: Filter by author name
- **Tags**: Filter by specific tags
- **Publication Status**: Filter by public/private and published/draft status

## Sorting

Instructions can be sorted by:

- **Title**: Alphabetical order
- **Created Date**: When the instruction was created
- **Updated Date**: When the instruction was last updated
- **Rating**: Average rating (if available)
- **Download Count**: Number of downloads

## Integration with Gallery Package

This component is designed to work alongside the existing gallery package infrastructure:

- **Reuses Gallery Patterns**: Leverages proven gallery layout and interaction patterns
- **MOC-Specific Adaptations**: Customized for MOC instruction data structure
- **Consistent UX**: Maintains consistency with other gallery components
- **Extensible**: Can be easily extended with additional MOC-specific features

## Dependencies

- `@repo/ui`: UI components (Button)
- `framer-motion`: Animations
- `lucide-react`: Icons
- `@repo/moc-instructions`: Internal schemas and types

## Testing

The component includes comprehensive tests covering:

- Rendering with and without instructions
- Search functionality
- Filter interactions
- Sort functionality
- Instruction interactions (click, edit, delete)
- Selection behavior
- Load more functionality
- Responsive behavior

Run tests with:

```bash
pnpm test:run
```
