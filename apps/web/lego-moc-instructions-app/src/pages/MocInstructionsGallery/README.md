# MOC Instructions Gallery Page

## Overview

The MOC Instructions Gallery page has been refactored to use the `@repo/gallery` package component and RTK Query for data fetching. This provides better functionality, consistency, maintainability, and real API integration.

## Features

### Core Functionality
- **Gallery Display**: Uses the `@repo/gallery` package for consistent gallery rendering
- **Real Data Fetching**: Uses RTK Query to fetch data from the Lego API
- **Search**: Real-time search through instruction titles, descriptions, and authors
- **Filtering**: Tag-based filtering with AND logic for multiple tag selection
- **Navigation**: Seamless navigation to detail pages and create page
- **Responsive Design**: Works across mobile, tablet, and desktop viewports

### Enhanced Features
- **Advanced Search**: Case-insensitive search across multiple fields
- **Tag Filtering**: Dynamic tag generation from available instructions
- **Empty States**: Contextual empty states with appropriate actions
- **Performance**: Optimized rendering with proper memoization
- **Accessibility**: Full keyboard navigation and ARIA support
- **Loading States**: Proper loading and error state handling

## Component Structure

```
MocInstructionsGallery/
├── index.tsx                    # Main component
├── __tests__/
│   └── MocInstructionsGallery.test.tsx  # Vitest unit tests
└── README.md                    # This file
```

## Data Flow

### API Integration
The component uses RTK Query to fetch data from the Lego API:

```typescript
// Fetch instructions using RTK Query
const { data: instructions = [], isLoading, error } = useGetInstructionsQuery({
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
```

### Data Transformation
Instructions are transformed from `MockInstruction` to `GalleryImage` format:

```typescript
const transformToGalleryImage = (instruction: MockInstruction): GalleryImage => ({
  id: instruction.id,
  url: instruction.coverImageUrl || 'https://via.placeholder.com/300x200',
  title: instruction.title,
  description: instruction.description,
  author: instruction.author,
  tags: instruction.tags,
  createdAt: instruction.createdAt,
  updatedAt: instruction.updatedAt,
});
```

### State Management
- **Loading State**: Shows spinner while fetching data
- **Error State**: Shows error message with retry option
- **Empty State**: Shows appropriate message when no data or no search results
- **Filter State**: Manages search query and selected tags

## Data Structure

### MockInstruction (API Response)
```typescript
interface MockInstruction {
  id: string;
  title: string;
  description: string;
  author: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: Array<string>;
  coverImageUrl?: string;
  steps: Array<MockInstructionStep>;
  partsList: Array<Part>;
  isPublic: boolean;
  isPublished: boolean;
  rating?: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### GalleryImage (Gallery Component)
```typescript
interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
  author?: string;
  tags?: Array<string>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Search and Filtering

### Search Functionality
- Searches across title, description, and author fields
- Case-insensitive matching
- Real-time filtering as user types
- Supports partial matches

### Tag Filtering
- Dynamic tag generation from instruction data
- Multiple tag selection with AND logic
- Visual feedback for selected tags
- Clear filters functionality

## User Interactions

### Navigation
- **Create New**: Navigates to `/moc-instructions/create`
- **Instruction Click**: Navigates to `/moc-detail/$id`
- **Gallery Actions**: Like, share, download, delete (placeholder implementations)

### Search and Filter
- **Search Input**: Real-time filtering
- **Filter Toggle**: Shows/hides filter panel
- **Tag Selection**: Click to select/deselect tags
- **Clear Filters**: Resets all search and filter state

## Responsive Design

The component is fully responsive with:
- **Mobile**: Single column layout, stacked search/filter
- **Tablet**: Two-column layout, side-by-side search/filter
- **Desktop**: Multi-column layout, optimized spacing

## Testing

### Unit Tests (Vitest)

Comprehensive unit tests covering:

#### Rendering Tests
- Page title and description
- All UI elements presence
- Gallery component integration
- Results count display

#### API Integration Tests
- Loading state display
- Error state handling
- Data transformation
- RTK Query hook mocking

#### Search Functionality Tests
- Title-based filtering
- Author-based filtering
- Description-based filtering
- Case-insensitive search
- Search clearing

#### Filter Functionality Tests
- Filter panel toggle
- Tag rendering
- Single tag filtering
- Multiple tag filtering (AND logic)
- Clear filters functionality

#### Navigation Tests
- Create page navigation
- Detail page navigation
- Gallery item interactions

#### Empty State Tests
- No results state
- Contextual empty state messages
- Empty state navigation

#### Accessibility Tests
- ARIA attributes
- Keyboard navigation
- Screen reader support

#### Responsive Design Tests
- Mobile viewport
- Tablet viewport
- Desktop viewport

### E2E Tests (Playwright)

**Real Data Integration Tests** - These tests use actual API data and do not mock any responses:

#### Page Loading and Basic Elements
- Page load success with real API data
- URL validation
- Element presence and visibility
- Initial state verification with live data

#### Search Functionality with Real Data
- Title search filtering using actual instruction data
- Author search filtering using real author names
- Description search filtering using real descriptions
- Search clearing and restoration
- Case-insensitive search with real content

#### Filter Functionality with Real Data
- Filter panel interaction
- Real tag filtering based on actual instruction tags
- Multiple tag selection with real tag data
- Clear filters functionality

#### Navigation with Real Data
- Create page navigation
- Detail page navigation using real instruction IDs
- Gallery item interactions with actual data

#### Gallery Interactions with Real Data
- Item display verification with real content
- Real tag visibility from API data
- Clickable elements with actual instruction data

#### Empty State with Real Data
- No results display when search doesn't match real data
- Contextual messaging based on actual data state
- Empty state navigation

#### Responsive Design
- Mobile viewport testing
- Tablet viewport testing
- Desktop viewport testing

#### Accessibility
- Heading structure
- Form labels
- Keyboard navigation
- ARIA attributes

#### Performance and Loading
- Page load time with real API calls
- Layout stability
- Gallery rendering with actual data

#### Error Handling
- Invalid search handling
- Rapid input changes
- Edge case handling

#### Cross-browser Compatibility
- Multi-browser testing with real data
- Consistent functionality across browsers

#### Real Data Integration
- **Real API Data**: Tests use actual data from the Lego API
- **No Mocking**: No MSW or other mocking in E2E tests
- **Live Search**: Search functionality tested with real instruction data
- **Real Tags**: Tag filtering tested with actual tags from API
- **Authentic Content**: All content verification uses real instruction data

## Running Tests

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run specific test file
pnpm test MocInstructionsGallery.test.tsx

# Run with coverage
pnpm test:coverage
```

### E2E Tests
```bash
# Run all E2E tests (requires API to be running)
pnpm test:e2e

# Run specific test file
pnpm test:e2e moc-instructions-gallery.spec.ts

# Run in headed mode
pnpm test:e2e --headed

# Run with UI
pnpm test:e2e --ui
```

**Important**: E2E tests require the Lego API to be running and accessible. These tests use real data and make actual API calls.

## Dependencies

### Core Dependencies
- `@repo/gallery`: Gallery component package
- `@repo/moc-instructions`: MOC instructions API and types
- `@repo/ui`: UI component library
- `@tanstack/react-router`: Routing
- `lucide-react`: Icons

### Development Dependencies
- `@testing-library/react`: Unit testing
- `@playwright/test`: E2E testing
- `vitest`: Test runner

## API Integration

### RTK Query Setup
The component uses the `useGetInstructionsQuery` hook from `@repo/moc-instructions`:

```typescript
import { useGetInstructionsQuery } from '@repo/moc-instructions';

const { data: instructions = [], isLoading, error } = useGetInstructionsQuery({
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
```

### Error Handling
- **Network Errors**: Displayed with retry option
- **API Errors**: Proper error messages
- **Loading States**: Spinner during data fetching
- **Empty States**: Contextual messages for no data

## Future Enhancements

### Planned Features
- **Advanced Filtering**: Difficulty, piece count, date range filters
- **Sorting Options**: Sort by date, popularity, difficulty
- **Pagination**: Handle large datasets
- **Favorites**: User favorite functionality
- **Social Features**: Comments, ratings, sharing
- **Real-time Updates**: WebSocket integration for live updates

### Performance Optimizations
- **Virtualization**: For large instruction lists
- **Lazy Loading**: Image and content lazy loading
- **Caching**: Search and filter result caching
- **Debouncing**: Search input debouncing
- **Optimistic Updates**: Immediate UI feedback

### Accessibility Improvements
- **Screen Reader**: Enhanced screen reader support
- **Keyboard Shortcuts**: Power user keyboard shortcuts
- **High Contrast**: High contrast mode support
- **Focus Management**: Improved focus management

## Migration Notes

### From Previous Implementation
- Replaced custom gallery implementation with `@repo/gallery`
- Replaced mock data with RTK Query API integration
- Enhanced search functionality with multi-field support
- Added comprehensive tag filtering system
- Improved responsive design
- Added comprehensive test coverage
- Added loading and error state handling

### Breaking Changes
- Data structure changed to match `MockInstruction` schema
- Search behavior now includes description and author fields
- Filter system completely redesigned
- API integration replaces static mock data

### Benefits
- **Consistency**: Uses shared gallery component
- **Maintainability**: Reduced code duplication
- **Functionality**: Enhanced search and filtering
- **Testing**: Comprehensive test coverage
- **Performance**: Optimized rendering and interactions
- **Real Data**: Live API integration
- **Error Handling**: Robust error and loading states

## Contributing

When contributing to this component:

1. **Follow Testing**: Add tests for new features
2. **Maintain Coverage**: Keep test coverage above 90%
3. **Update Documentation**: Update this README for changes
4. **Follow Patterns**: Use existing patterns and conventions
5. **Accessibility**: Ensure accessibility compliance
6. **API Integration**: Test with real API endpoints

## Troubleshooting

### Common Issues

#### Gallery Not Rendering
- Check `@repo/gallery` package installation
- Verify data structure matches `GalleryImage` schema
- Check console for import errors
- Verify RTK Query setup in store

#### API Not Working
- Check API endpoint configuration
- Verify RTK Query store setup
- Check network connectivity
- Review API response format

#### Search Not Working
- Verify search input has correct `data-testid`
- Check filter logic in component
- Ensure API data has expected fields
- Verify data transformation function

#### Tests Failing
- Run `pnpm install` to ensure dependencies
- Check test environment setup
- Verify mock implementations match actual components
- Ensure RTK Query hooks are properly mocked

#### E2E Tests Failing
- **API Must Be Running**: Ensure Lego API is accessible
- **Real Data Required**: E2E tests need actual API data
- **Network Connectivity**: Check API endpoint accessibility
- **No Mocking**: E2E tests do not use MSW or other mocking

### Debug Mode
```bash
# Run tests in debug mode
pnpm test:e2e --debug

# Run with verbose logging
DEBUG=pw:api pnpm test:e2e

# Run unit tests with coverage
pnpm test:coverage
```

### Test Data Requirements

#### Unit Tests (Vitest)
- **Mocked Data**: Uses mock data in test files
- **Mocked API**: RTK Query hooks are mocked
- **Isolated Testing**: No external dependencies

#### E2E Tests (Playwright)
- **Real API**: Requires Lego API to be running
- **Real Data**: Uses actual instruction data
- **No Mocking**: No MSW or other mocking
- **Live Testing**: Tests real user workflows 