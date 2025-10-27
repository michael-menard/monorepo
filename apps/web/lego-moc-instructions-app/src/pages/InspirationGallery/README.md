# Inspiration Gallery Page

A comprehensive inspiration gallery that allows users to browse, search, filter, and interact with LEGO inspiration content. Built with RTK Query for efficient data fetching and state management.

## 🎯 Features

### Core Functionality

- **Browse Inspiration Items** - View a grid of inspiration items with images, titles, descriptions, and metadata
- **Real-time Search** - Search through inspiration content with instant results
- **Category Filtering** - Filter by categories: Space, Vehicles, Architecture, Nature
- **Sorting Options** - Sort by: Newest First, Oldest First, Most Liked, A-Z, Z-A
- **Like/Unlike** - Interactive like functionality with optimistic updates
- **Share** - Share inspiration items (placeholder for future implementation)
- **Responsive Design** - Mobile-friendly grid layout that adapts to screen sizes

### User Experience

- **Loading States** - Skeleton loading indicators while data is being fetched
- **Error Handling** - Graceful error states with retry functionality
- **Empty States** - Helpful messages when no results are found
- **Image Fallbacks** - Placeholder images when image loading fails
- **Accessibility** - Full ARIA support and keyboard navigation

## 🏗️ Architecture

### Technology Stack

- **React 19** - UI framework
- **RTK Query** - Data fetching and caching
- **Redux Toolkit** - State management
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **TanStack Router** - Navigation (planned)

### Data Flow

```
User Interaction → RTK Query Hook → API Call → Cache Update → UI Re-render
```

### Key Components

- `InspirationGallery` - Main page component
- `InspirationItem` - Individual inspiration card
- Search and filter controls
- Loading and error states

## 📁 File Structure

```
src/pages/InspirationGallery/
├── index.tsx                 # Main component
├── __tests__/
│   └── InspirationGallery.test.tsx  # Unit tests
└── README.md                 # This file
```

## 🔧 Implementation Details

### RTK Query Integration

The page uses RTK Query hooks from the `@repo/gallery` package:

```typescript
import {
  useGetInspirationItemsQuery,
  useLikeInspirationItemMutation,
  type InspirationItem,
  type InspirationFilters,
} from '@repo/gallery'
```

### State Management

- **Local State**: Search query, category filter, sort order
- **RTK Query State**: Loading, error, data, cache
- **Optimistic Updates**: Like/unlike functionality

### API Endpoints

- `GET /api/gallery/inspiration` - Fetch inspiration items with filters
- `POST /api/gallery/inspiration/:id/like` - Like/unlike an item
- `POST /api/gallery/inspiration` - Create new inspiration (planned)
- `PUT /api/gallery/inspiration/:id` - Update inspiration (planned)
- `DELETE /api/gallery/inspiration/:id` - Delete inspiration (planned)

## 🎨 UI Components

### Search and Filter Bar

- **Search Input** - Real-time search with debouncing
- **Category Dropdown** - Filter by predefined categories
- **Sort Dropdown** - Multiple sorting options

### Inspiration Grid

- **Responsive Layout** - 1-4 columns based on screen size
- **Card Design** - Clean, modern card layout
- **Image Display** - Optimized image loading with fallbacks
- **Metadata** - Author, category, likes, tags

### Interactive Elements

- **Like Button** - Heart icon with filled/unfilled states
- **Share Button** - Share functionality (placeholder)
- **Item Click** - Navigate to detail page (planned)

## 🧪 Testing

### Unit Tests

Comprehensive test suite with 24 test cases covering:

- ✅ Rendering and layout
- ✅ Loading states
- ✅ Error states with retry
- ✅ Empty states
- ✅ Search and filtering
- ✅ User interactions
- ✅ Image error handling
- ✅ Accessibility
- ✅ Responsive design

### E2E Tests

Playwright tests covering:

- Page navigation and loading
- Search functionality
- Filter interactions
- Item interactions
- Responsive behavior

## 🚀 Usage

### Basic Usage

```tsx
import InspirationGallery from './pages/InspirationGallery'

function App() {
  return <InspirationGallery />
}
```

### With Custom Configuration

```tsx
// The component automatically handles:
// - Data fetching via RTK Query
// - Loading and error states
// - User interactions
// - Responsive design
```

## 📱 Responsive Design

### Breakpoints

- **Mobile**: 1 column grid
- **Tablet**: 2 columns grid
- **Desktop**: 3 columns grid
- **Large Desktop**: 4 columns grid

### Mobile Optimizations

- Touch-friendly buttons
- Optimized spacing
- Readable text sizes
- Efficient scrolling

## ♿ Accessibility

### ARIA Support

- Proper heading hierarchy (h1, h3)
- Alt text for all images
- Button labels and descriptions
- Form field labels

### Keyboard Navigation

- Tab navigation through all interactive elements
- Enter/Space key support for buttons
- Focus indicators

### Screen Reader Support

- Semantic HTML structure
- Descriptive text for all elements
- Status announcements for loading/error states

## 🔄 State Management

### Loading States

```typescript
if (isLoading) {
  return <LoadingSpinner />;
}
```

### Error States

```typescript
if (error) {
  return <ErrorState onRetry={refetch} />;
}
```

### Empty States

```typescript
if (!data?.data?.length) {
  return <EmptyState />;
}
```

## 🎯 Performance Optimizations

### RTK Query Benefits

- **Automatic Caching** - Reduces API calls
- **Background Updates** - Keeps data fresh
- **Optimistic Updates** - Instant UI feedback
- **Request Deduplication** - Prevents duplicate requests

### Image Optimization

- **Lazy Loading** - Images load as needed
- **Fallback Images** - Placeholder on error
- **Responsive Images** - Different sizes for different screens

### Search Optimization

- **Debouncing** - Reduces API calls during typing
- **Cached Results** - Reuses previous search results

## 🔮 Future Enhancements

### Planned Features

- [ ] **Detail Page Navigation** - Click to view full inspiration
- [ ] **Create New Inspiration** - Upload and share new content
- [ ] **Advanced Filters** - Date range, tags, author
- [ ] **Infinite Scroll** - Load more items as user scrolls
- [ ] **Social Features** - Comments, collections
- [ ] **Offline Support** - Cache for offline viewing

### API Improvements

- [ ] **Real-time Updates** - WebSocket integration
- [ ] **Image Optimization** - CDN integration
- [ ] **Analytics** - Track user interactions
- [ ] **Rate Limiting** - Prevent abuse

## 🐛 Troubleshooting

### Common Issues

#### Data Not Loading

- Check API endpoint availability
- Verify network connectivity
- Check browser console for errors

#### Search Not Working

- Ensure search input is properly connected
- Check RTK Query cache
- Verify API response format

#### Images Not Displaying

- Check image URLs in API response
- Verify CORS settings
- Check network tab for failed requests

#### Like Functionality Issues

- Ensure user is authenticated
- Check API endpoint permissions
- Verify optimistic update logic

### Debug Mode

Enable debug logging by setting:

```typescript
// In development
console.log('Inspiration data:', data)
console.log('Filters:', filters)
```

## 📊 Analytics

### Tracked Events

- Page views
- Search queries
- Filter usage
- Like interactions
- Share clicks
- Item clicks

### Performance Metrics

- Page load time
- Image load time
- Search response time
- Error rates

## 🤝 Contributing

### Development Setup

1. Ensure RTK Query is properly configured
2. Set up API endpoints for inspiration data
3. Configure authentication if required
4. Run tests: `pnpm test:run`

### Code Style

- Follow existing component patterns
- Use TypeScript for type safety
- Write comprehensive tests
- Maintain accessibility standards

### Testing Guidelines

- Test all user interactions
- Verify responsive behavior
- Check accessibility compliance
- Test error scenarios

## 📄 License

This component is part of the LEGO MOC Instructions App and follows the project's licensing terms.

---

_Last Updated: January 2024_
_Version: 1.0.0_
