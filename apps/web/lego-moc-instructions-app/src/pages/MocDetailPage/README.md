# MocDetailPage Component

A comprehensive detail page component for displaying and editing MOC (My Own Creation) instructions with advanced features including editable forms, file management, and responsive design.

## Features

### Core Functionality
- **Detailed MOC Display**: Shows complete MOC information including title, description, author, difficulty, and statistics
- **Editable Forms**: Inline editing capabilities for title, description, difficulty, category, and tags
- **File Management**: Image upload and management for cover images and step images
- **Tabbed Interface**: Organized content across Overview, Instructions, Parts List, and Gallery tabs
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Interactive Features
- **Edit Dialog**: Modal form for editing MOC details with validation
- **Image Upload Dialog**: Drag-and-drop file upload with progress tracking
- **Tags Management**: Add, remove, and manage tags with real-time updates
- **Delete Confirmation**: Safe deletion with confirmation dialog
- **Share Functionality**: Native sharing API with clipboard fallback

### Data Management
- **RTK Query Integration**: Efficient data fetching and caching
- **Real-time Updates**: Automatic UI updates when data changes
- **Form Validation**: Zod schema validation for all form inputs
- **Error Handling**: Graceful error states and user feedback

## Component Structure

```
MocDetailPage/
├── index.tsx                 # Main component
├── __tests__/
│   ├── MocDetailPage.test.tsx        # Unit tests
│   ├── MocDetailPage.ux.test.tsx     # UX tests
│   └── MocDetailPage.performance.test.tsx # Performance tests
└── README.md                # This file
```

## Usage

```tsx
import { MocDetailPage } from './pages/MocDetailPage';

// The component automatically fetches data based on the URL parameter
<Route path="/moc-instructions/:id" element={<MocDetailPage />} />
```

## Props

The component doesn't accept props directly. It uses:
- `useParams()` to get the MOC ID from the URL
- `useNavigate()` for navigation
- RTK Query hooks for data management

## Data Flow

1. **Initial Load**: Component fetches MOC data using `useGetInstructionQuery`
2. **User Interactions**: Actions trigger appropriate mutations (update, delete, upload)
3. **State Updates**: RTK Query automatically updates the UI when data changes
4. **Error Handling**: Errors are caught and displayed to the user

## Key Features Implementation

### Editable Forms
- Uses React Hook Form with Zod validation
- Real-time form validation
- Optimistic updates for better UX
- Form state persistence during navigation

### File Management
- Image compression before upload
- File type and size validation
- Progress tracking for uploads
- Lazy loading for gallery images

### Tags Management
- Real-time tag addition/removal
- Duplicate prevention
- Keyboard shortcuts (Enter to add)
- Visual feedback for actions

### Responsive Design
- Mobile-first approach
- Adaptive layouts for different screen sizes
- Touch-friendly interactions
- Optimized for various devices

## Testing Strategy

### Unit Tests (`MocDetailPage.test.tsx`)
- Component rendering
- User interactions
- API calls and responses
- Error handling
- Navigation

### UX Tests (`MocDetailPage.ux.test.tsx`)
- Accessibility compliance
- User interaction flows
- Responsive design
- Performance under load
- Error recovery

### Performance Tests (`MocDetailPage.performance.test.tsx`)
- Rendering performance
- Memory usage
- Large dataset handling
- Network performance
- Bundle size impact

## Dependencies

### Core Dependencies
- `react`: React framework
- `react-router-dom`: Routing
- `react-hook-form`: Form management
- `@hookform/resolvers/zod`: Zod validation
- `@reduxjs/toolkit`: State management
- `@repo/ui`: UI components
- `@repo/moc-instructions`: MOC data and utilities

### External Dependencies
- `lucide-react`: Icons
- `vitest`: Testing framework
- `@testing-library/react`: Testing utilities

## API Integration

### RTK Query Endpoints Used
- `useGetInstructionQuery`: Fetch MOC details
- `useUpdateInstructionMutation`: Update MOC data
- `useDeleteInstructionMutation`: Delete MOC
- `useUploadInstructionsImageMutation`: Upload images

### Data Types
- `MockInstruction`: Main MOC data structure
- `UpdateMockInstruction`: Form data for updates
- `MockInstructionImageUpload`: Image upload data

## Performance Optimizations

### Rendering Optimizations
- Memoized calculations for totals
- Efficient re-renders with React.memo
- Lazy loading for images
- Debounced input handling

### Data Optimizations
- RTK Query caching
- Optimistic updates
- Efficient state management
- Minimal re-renders

### Memory Management
- Proper cleanup of event listeners
- Efficient file handling
- Memory leak prevention
- Garbage collection optimization

## Accessibility Features

### ARIA Compliance
- Proper heading hierarchy
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility

### User Experience
- Clear error messages
- Loading states
- Confirmation dialogs
- Visual feedback

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Future Enhancements

### Planned Features
- Offline support with service workers
- Advanced image editing capabilities
- Collaborative editing features
- Export functionality (PDF, 3D models)
- Social sharing integration

### Performance Improvements
- Virtual scrolling for large lists
- Advanced caching strategies
- Bundle splitting optimization
- Progressive loading

## Contributing

When contributing to this component:

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test performance impact of changes

## Troubleshooting

### Common Issues

**Form validation errors**: Check Zod schema definitions and form field names
**Image upload failures**: Verify file size limits and supported formats
**Performance issues**: Monitor render times and memory usage
**Navigation problems**: Ensure proper route configuration

### Debug Tips

- Use React DevTools for component inspection
- Check Redux DevTools for state changes
- Monitor network requests in browser dev tools
- Test with different data sizes and network conditions

## License

This component is part of the monorepo and follows the project's licensing terms. 