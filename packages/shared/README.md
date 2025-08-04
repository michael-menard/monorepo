# @repo/shared

A core shared utilities package providing essential functionality, design system tokens, and common utilities used across the entire monorepo.

## Features

- 🎨 **Design System**: Centralized design tokens and theme configuration
- 🔧 **Core Utilities**: Essential utility functions and helpers
- 📊 **State Management**: Shared state management utilities
- 🎣 **Custom Hooks**: Reusable React hooks
- 🔍 **Type Definitions**: Common TypeScript types and interfaces
- 📱 **Responsive Utilities**: Mobile-first responsive helpers
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/shared
```

## Quick Start

### 1. Using Design System

```tsx
import { designSystem, theme } from '@repo/shared';

function MyComponent() {
  return (
    <div style={{ 
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg
    }}>
      <h1 style={{ 
        color: theme.colors.text.primary,
        fontSize: theme.typography.h1.fontSize
      }}>
        Hello World
      </h1>
    </div>
  );
}
```

### 2. Using Core Utilities

```tsx
import { 
  formatCurrency, 
  validateEmail, 
  generateId,
  debounce,
  throttle 
} from '@repo/shared';

function UtilityExample() {
  // Format currency
  const price = formatCurrency(99.99, 'USD'); // $99.99
  
  // Validate email
  const isValidEmail = validateEmail('user@example.com');
  
  // Generate unique ID
  const uniqueId = generateId();
  
  // Debounce function
  const debouncedSearch = debounce((query: string) => {
    console.log('Searching:', query);
  }, 300);
  
  // Throttle function
  const throttledScroll = throttle(() => {
    console.log('Scrolled');
  }, 100);

  return (
    <div>
      <p>Price: {price}</p>
      <p>Valid Email: {isValidEmail ? 'Yes' : 'No'}</p>
      <p>ID: {uniqueId}</p>
    </div>
  );
}
```

### 3. Using Custom Hooks

```tsx
import { 
  useLocalStorage, 
  useDebounce, 
  useMediaQuery,
  useClickOutside 
} from '@repo/shared';

function HooksExample() {
  // Local storage hook
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  
  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Media query hook
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Click outside hook
  const ref = useClickOutside(() => {
    console.log('Clicked outside');
  });

  return (
    <div ref={ref}>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      
      {isMobile && <p>Mobile view</p>}
    </div>
  );
}
```

## API Reference

### Design System

#### Theme Configuration

```tsx
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  typography: {
    h1: TypographyVariant;
    h2: TypographyVariant;
    h3: TypographyVariant;
    body: TypographyVariant;
    caption: TypographyVariant;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}
```

#### Typography Variant

```tsx
interface TypographyVariant {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
}
```

### Core Utilities

#### Date Utilities

```tsx
// Format date
formatDate(date: Date, format?: string): string

// Parse date string
parseDate(dateString: string): Date

// Get relative time
getRelativeTime(date: Date): string

// Check if date is today
isToday(date: Date): boolean

// Add days to date
addDays(date: Date, days: number): Date

// Get days between dates
getDaysBetween(startDate: Date, endDate: Date): number
```

#### String Utilities

```tsx
// Generate unique ID
generateId(): string

// Slugify string
slugify(text: string): string

// Truncate text
truncate(text: string, maxLength: number, suffix?: string): string

// Capitalize first letter
capitalize(text: string): string

// Convert to camelCase
toCamelCase(text: string): string

// Convert to kebab-case
toKebabCase(text: string): string

// Convert to PascalCase
toPascalCase(text: string): string
```

#### Number Utilities

```tsx
// Format currency
formatCurrency(amount: number, currency?: string): string

// Format number with locale
formatNumber(number: number, locale?: string): string

// Clamp number between min and max
clamp(value: number, min: number, max: number): number

// Round to decimal places
roundToDecimal(value: number, decimals: number): number

// Check if number is in range
isInRange(value: number, min: number, max: number): boolean
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

// Required field validation
isRequired(value: any): boolean
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

// Flatten nested arrays
flatten<T>(array: T[][]): T[]

// Find index by predicate
findIndex<T>(array: T[], predicate: (item: T) => boolean): number
```

#### Object Utilities

```tsx
// Deep clone object
deepClone<T>(obj: T): T

// Merge objects
merge<T>(target: T, ...sources: Partial<T>[]): T

// Pick properties from object
pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>

// Omit properties from object
omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>

// Check if object is empty
isEmpty(obj: any): boolean

// Get nested property value
get(obj: any, path: string, defaultValue?: any): any
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

#### useThrottle

Hook for throttling values.

```tsx
const throttledValue = useThrottle<T>(value: T, delay: number): T;
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

#### useIntersectionObserver

Hook for intersection observer API.

```tsx
const [ref, isIntersecting] = useIntersectionObserver(options?: IntersectionObserverInit);
```

#### useWindowSize

Hook for tracking window size.

```tsx
const { width, height } = useWindowSize(): { width: number; height: number };
```

### State Management

#### createReducer

Create a reducer with immer for immutable updates.

```tsx
const reducer = createReducer<T>(initialState: T, reducers: Record<string, (state: T, action: any) => void>);
```

#### createActions

Create action creators for Redux-style actions.

```tsx
const actions = createActions<T>(actionTypes: string[]): Record<string, (payload?: any) => any>;
```

#### useReducerWithImmer

Hook for using reducer with immer.

```tsx
const [state, dispatch] = useReducerWithImmer<T>(reducer: (state: T, action: any) => T, initialState: T);
```

## Responsive Utilities

### Breakpoints

```tsx
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};
```

### Responsive Helpers

```tsx
// Get responsive class names
getResponsiveClasses(baseClass: string, variants: Record<string, string>): string

// Check if screen size matches
isScreenSize(size: keyof typeof breakpoints): boolean

// Get current screen size
getCurrentScreenSize(): keyof typeof breakpoints
```

## Type Definitions

### Common Types

```tsx
// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// Pagination
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Sort options
interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// Filter options
interface FilterOption {
  field: string;
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';
}
```

## Styling

### CSS Variables

The package provides CSS custom properties for consistent styling:

```css
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  
  /* Border radius */
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.375rem;
  --border-radius-lg: 0.5rem;
  --border-radius-xl: 0.75rem;
}
```

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Utility functions
- Custom hooks
- Design system tokens
- State management utilities
- Responsive helpers

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new utilities and hooks
3. Update documentation for API changes
4. Ensure TypeScript types are accurate
5. Keep utilities generic and reusable

## Related Packages

- `@repo/ui` - UI components
- `@repo/features/shared` - Feature-specific shared utilities
- `@repo/shared-cache` - Caching utilities 