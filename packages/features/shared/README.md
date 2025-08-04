# @repo/features/shared

A shared utilities and components package for feature packages, providing common functionality, hooks, and utilities used across multiple feature packages.

## Features

- 🔧 **Shared Utilities**: Common utility functions and helpers
- 🎣 **Custom Hooks**: Reusable React hooks for features
- 🎨 **Shared Components**: Common UI components for features
- 📊 **Data Management**: Shared state management utilities
- 🔍 **Search & Filter**: Common search and filtering logic
- 📱 **Responsive Helpers**: Mobile-first responsive utilities
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/features/shared
```

## Quick Start

### 1. Using Shared Utilities

```tsx
import { 
  formatDate, 
  validateEmail, 
  generateId,
  debounce 
} from '@repo/features/shared';

function MyComponent() {
  // Format dates consistently
  const formattedDate = formatDate(new Date(), 'MMM dd, yyyy');
  
  // Validate email addresses
  const isValidEmail = validateEmail('user@example.com');
  
  // Generate unique IDs
  const uniqueId = generateId();
  
  // Debounce function calls
  const debouncedSearch = debounce((query: string) => {
    console.log('Searching for:', query);
  }, 300);

  return (
    <div>
      <p>Date: {formattedDate}</p>
      <p>Valid Email: {isValidEmail ? 'Yes' : 'No'}</p>
      <p>ID: {uniqueId}</p>
    </div>
  );
}
```

### 2. Using Shared Hooks

```tsx
import { 
  useLocalStorage, 
  useDebounce, 
  useIntersectionObserver,
  useMediaQuery 
} from '@repo/features/shared';

function ComponentWithHooks() {
  // Local storage hook
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  
  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Intersection observer for lazy loading
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.1
  });
  
  // Media query hook
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      
      <div ref={ref}>
        {isVisible && <LazyLoadedContent />}
      </div>
      
      {isMobile && <MobileOnlyContent />}
    </div>
  );
}
```

### 3. Using Shared Components

```tsx
import { 
  LoadingSpinner, 
  ErrorBoundary, 
  EmptyState,
  Pagination 
} from '@repo/features/shared';

function DataList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      {loading && <LoadingSpinner />}
      
      {error && <div>Error: {error.message}</div>}
      
      {!loading && !error && data.length === 0 && (
        <EmptyState
          title="No data found"
          description="Try adjusting your search criteria"
          action={<button>Refresh</button>}
        />
      )}
      
      {data.length > 0 && (
        <div>
          {data.map(item => (
            <div key={item.id}>{item.name}</div>
          ))}
          
          <Pagination
            currentPage={1}
            totalPages={10}
            onPageChange={(page) => console.log('Page:', page)}
          />
        </div>
      )}
    </ErrorBoundary>
  );
}
```

## API Reference

### Utility Functions

#### Date Utilities

```tsx
// Format dates consistently
formatDate(date: Date, format?: string): string

// Parse date strings
parseDate(dateString: string): Date

// Get relative time (e.g., "2 hours ago")
getRelativeTime(date: Date): string

// Check if date is today
isToday(date: Date): boolean
```

#### Validation Utilities

```tsx
// Email validation
validateEmail(email: string): boolean

// URL validation
validateUrl(url: string): boolean

// Phone number validation
validatePhone(phone: string): boolean

// Password strength validation
validatePassword(password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}
```

#### String Utilities

```tsx
// Generate unique IDs
generateId(): string

// Slugify strings
slugify(text: string): string

// Truncate text
truncate(text: string, maxLength: number): string

// Capitalize first letter
capitalize(text: string): string
```

#### Array Utilities

```tsx
// Group array by key
groupBy<T>(array: T[], key: keyof T): Record<string, T[]>

// Remove duplicates
unique<T>(array: T[]): T[]

// Sort by multiple criteria
sortBy<T>(array: T[], ...criteria: (keyof T)[]): T[]

// Chunk array into smaller arrays
chunk<T>(array: T[], size: number): T[][]
```

### Custom Hooks

#### useLocalStorage

Hook for managing local storage with type safety.

```tsx
const [value, setValue] = useLocalStorage<T>(key: string, defaultValue: T);
```

#### useDebounce

Hook for debouncing values.

```tsx
const debouncedValue = useDebounce<T>(value: T, delay: number): T;
```

#### useIntersectionObserver

Hook for intersection observer API.

```tsx
const [ref, isIntersecting] = useIntersectionObserver(options?: IntersectionObserverInit);
```

#### useMediaQuery

Hook for media queries.

```tsx
const matches = useMediaQuery(query: string): boolean;
```

#### useClickOutside

Hook for detecting clicks outside an element.

```tsx
const ref = useClickOutside(callback: () => void): RefObject<HTMLElement>;
```

#### usePrevious

Hook for accessing previous value.

```tsx
const previousValue = usePrevious<T>(value: T): T | undefined;
```

### Shared Components

#### LoadingSpinner

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}
```

#### ErrorBoundary

```tsx
interface ErrorBoundaryProps {
  fallback: React.ReactNode | ((error: Error) => React.ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  children: React.ReactNode;
}
```

#### EmptyState

```tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}
```

#### Pagination

```tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  className?: string;
}
```

## Data Management

### Search and Filter Utilities

```tsx
// Search through array of objects
searchArray<T>(
  array: T[],
  query: string,
  searchFields: (keyof T)[]
): T[]

// Filter array by multiple criteria
filterArray<T>(
  array: T[],
  filters: Record<keyof T, any>
): T[]

// Sort array by field
sortArray<T>(
  array: T[],
  field: keyof T,
  direction: 'asc' | 'desc'
): T[]
```

### State Management Utilities

```tsx
// Create reducer with immer
createReducer<T>(
  initialState: T,
  reducers: Record<string, (state: T, action: any) => void>
): (state: T, action: any) => T

// Create action creators
createActions<T>(actionTypes: string[]): Record<string, (payload?: any) => any>
```

## Styling Utilities

### Responsive Helpers

```tsx
// Get responsive breakpoints
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Generate responsive classes
getResponsiveClasses(baseClass: string, variants: Record<string, string>): string
```

### Theme Utilities

```tsx
// Get theme colors
getThemeColors(): Record<string, string>

// Generate color variants
generateColorVariants(baseColor: string): Record<string, string>
```

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Utility functions
- Custom hooks
- Shared components
- Data management functions
- Styling utilities

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new utilities and hooks
3. Update documentation for API changes
4. Ensure TypeScript types are accurate
5. Keep utilities generic and reusable

## Related Packages

- `@repo/ui` - Base UI components
- `@repo/shared` - Core shared utilities
- `@repo/shared-cache` - Caching utilities 