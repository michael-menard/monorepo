# Code Consolidation & Package Optimization PRD

## Product Overview

### Problem Statement
The monorepo contains significant code duplication across packages, particularly in gallery components, file upload functionality, and shared utilities. This duplication leads to:
- Inconsistent user experiences
- Increased maintenance burden
- Reduced code reusability
- Potential bugs from maintaining multiple implementations
- Larger bundle sizes

### Solution Summary
Consolidate duplicated functionality into shared, reusable packages while maintaining backward compatibility and improving the overall architecture.

## Business Objectives

### Primary Goals
1. **Reduce code duplication by 70%** across gallery and file upload components
2. **Improve maintainability** by centralizing common functionality
3. **Enhance user experience consistency** across all gallery implementations
4. **Reduce bundle size** by eliminating duplicate code
5. **Establish clear package boundaries** and responsibilities

### Success Metrics
- Number of duplicate components eliminated
- Reduction in total lines of code
- Improved test coverage for shared components
- Faster development velocity for new features
- Consistent UI/UX across all gallery implementations

## Technical Requirements

### 1. Gallery Component Consolidation

#### Current State
- `@repo/gallery` - Main gallery package with advanced features
- `@repo/moc-instructions` - Custom MOC instructions gallery
- App-level custom implementations in `lego-moc-instructions-app`
- Multiple similar gallery components with different APIs

#### Target State
- Single `@repo/gallery` package as the source of truth
- Extensible architecture supporting different content types
- Consistent API across all gallery implementations
- Shared components: ImageCard, FilterBar, Search, BatchOperations

#### Technical Specifications
```typescript
// Unified Gallery API
interface GalleryProps<T = any> {
  items: T[];
  itemRenderer: (item: T) => React.ReactNode;
  layout: 'grid' | 'masonry' | 'list';
  searchable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  onItemClick?: (item: T) => void;
  onItemsSelected?: (items: T[]) => void;
  // ... other common props
}
```

### 2. File Upload Consolidation

#### Current State
- `@repo/FileUpload` - Generic file upload component
- `@repo/ImageUploadModal` - Image-specific upload modal
- `@repo/moc-instructions` - Custom upload schemas and logic
- Duplicate drag & drop implementations

#### Target State
- Single `@repo/FileUpload` package with plugins/extensions
- Image-specific features as extensions
- Shared validation and progress tracking
- Consistent drag & drop behavior

#### Technical Specifications
```typescript
// Unified File Upload API
interface FileUploadProps {
  accept: string | string[];
  maxSize: number;
  multiple?: boolean;
  plugins?: FileUploadPlugin[];
  onUpload: (files: File[], metadata?: any) => Promise<void>;
}

interface FileUploadPlugin {
  name: string;
  validate?: (file: File) => boolean | string;
  process?: (file: File) => Promise<File>;
  render?: (props: any) => React.ReactNode;
}
```

### 3. Hook & Utility Consolidation

#### Current State
- Multiple drag & drop implementations
- Duplicate intersection observer logic
- Similar progress tracking across packages
- Inconsistent utility functions

#### Target State
- `@repo/shared-hooks` package for common hooks
- `@repo/shared-utils` package for utilities
- Consistent APIs across all packages

#### Technical Specifications
```typescript
// Shared Hooks Package
export const useDragAndDrop = (options: DragDropOptions) => DragDropState;
export const useIntersectionObserver = (options: ObserverOptions) => ObserverState;
export const useUploadProgress = (files: File[]) => ProgressState;
export const useInfiniteScroll = (options: ScrollOptions) => ScrollState;
```

### 4. Schema & Type Consolidation

#### Current State
- Duplicate image/file schemas across packages
- Similar validation logic
- Inconsistent API response formats

#### Target State
- `@repo/shared-schemas` package for common schemas
- Standardized validation patterns
- Consistent API response formats

#### Technical Specifications
```typescript
// Shared Schemas Package
export const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string().url(),
});

export const ImageSchema = FileSchema.extend({
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().optional(),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    errors: z.array(z.string()).optional(),
  });
```

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
1. **Create shared packages structure**
   - `@repo/shared-hooks`
   - `@repo/shared-utils`
   - `@repo/shared-schemas`

2. **Extract common functionality**
   - Move drag & drop logic to shared hooks
   - Consolidate utility functions
   - Create base schemas

3. **Update existing packages**
   - Refactor packages to use shared dependencies
   - Maintain backward compatibility
   - Update tests

### Phase 2: Gallery Consolidation (Weeks 3-4)
1. **Enhance `@repo/gallery` package**
   - Add extensibility for different content types
   - Create unified API
   - Add MOC instructions support

2. **Migrate app implementations**
   - Replace custom gallery components
   - Update routes and pages
   - Ensure all tests pass

3. **Deprecate duplicate components**
   - Mark old components as deprecated
   - Provide migration guides
   - Remove unused code

### Phase 3: File Upload Consolidation (Weeks 5-6)
1. **Enhance `@repo/FileUpload` package**
   - Add plugin system
   - Create image-specific extensions
   - Improve validation and error handling

2. **Migrate upload implementations**
   - Update MOC instructions upload
   - Replace custom upload modals
   - Standardize upload flows

3. **Update related components**
   - Image upload modals
   - File validation
   - Progress tracking

### Phase 4: Cleanup & Optimization (Weeks 7-8)
1. **Remove duplicate code**
   - Delete deprecated components
   - Clean up unused dependencies
   - Optimize bundle sizes

2. **Documentation & Testing**
   - Update package documentation
   - Improve test coverage
   - Create migration guides

3. **Performance optimization**
   - Analyze bundle sizes
   - Optimize imports
   - Implement code splitting

## Technical Architecture

### Package Structure
```
packages/
├── shared-hooks/          # Common React hooks
├── shared-utils/          # Utility functions
├── shared-schemas/        # Common Zod schemas
├── gallery/              # Enhanced gallery package
├── file-upload/          # Enhanced file upload package
├── ui/                   # UI components (unchanged)
└── [other packages]      # Domain-specific packages
```

### Dependencies
```json
{
  "@repo/shared-hooks": "workspace:*",
  "@repo/shared-utils": "workspace:*", 
  "@repo/shared-schemas": "workspace:*",
  "@repo/gallery": "workspace:*",
  "@repo/file-upload": "workspace:*"
}
```

### Migration Strategy
1. **Backward Compatibility**: Maintain existing APIs during transition
2. **Gradual Migration**: Update packages one at a time
3. **Feature Flags**: Use feature flags for new implementations
4. **Comprehensive Testing**: Ensure all functionality works after migration

## Risk Assessment

### High Risk
- **Breaking Changes**: Existing implementations may break
- **Performance Impact**: Bundle size changes
- **Development Velocity**: Temporary slowdown during migration

### Medium Risk
- **API Inconsistencies**: Different packages may have different APIs
- **Testing Complexity**: More complex test setup with shared dependencies

### Low Risk
- **Documentation**: Keeping docs up to date
- **Developer Experience**: Learning new APIs

### Mitigation Strategies
1. **Comprehensive Testing**: Extensive test coverage for all changes
2. **Gradual Rollout**: Migrate one package at a time
3. **Feature Flags**: Allow easy rollback if issues arise
4. **Documentation**: Clear migration guides and examples

## Success Criteria

### Quantitative Metrics
- **Code Reduction**: 70% reduction in duplicate code
- **Bundle Size**: 20% reduction in total bundle size
- **Test Coverage**: 90%+ coverage for shared components
- **Performance**: No regression in load times

### Qualitative Metrics
- **Developer Experience**: Easier to add new gallery/file upload features
- **User Experience**: Consistent UI/UX across all implementations
- **Maintainability**: Easier to fix bugs and add features
- **Code Quality**: Cleaner, more maintainable codebase

## Timeline

### Week 1-2: Foundation
- Create shared packages
- Extract common functionality
- Update existing packages

### Week 3-4: Gallery Consolidation
- Enhance gallery package
- Migrate app implementations
- Deprecate duplicate components

### Week 5-6: File Upload Consolidation
- Enhance file upload package
- Migrate upload implementations
- Update related components

### Week 7-8: Cleanup & Optimization
- Remove duplicate code
- Documentation & testing
- Performance optimization

## Conclusion

This consolidation effort will significantly improve the codebase quality, reduce maintenance burden, and provide a better foundation for future development. The phased approach ensures minimal disruption while achieving substantial improvements in code organization and reusability. 