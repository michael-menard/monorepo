# UI Package

This package contains reusable UI components for the monorepo.

## Loading Spinner Components

The package includes three types of loading spinners built with Framer Motion and following shadcn/ui patterns:

### LoadingSpinner

A rotating circular spinner with optional text.

```tsx
import { LoadingSpinner } from '@repo/ui'

// Basic usage
<LoadingSpinner />

// With text
<LoadingSpinner showText text="Loading..." />

// Different sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="default" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />

// Different variants
<LoadingSpinner variant="default" />
<LoadingSpinner variant="secondary" />
<LoadingSpinner variant="muted" />
<LoadingSpinner variant="destructive" />
```

### PulseSpinner

A pulsing dot animation with configurable count.

```tsx
import { PulseSpinner } from '@repo/ui'

// Basic usage
<PulseSpinner />

// Different sizes
<PulseSpinner size="sm" />
<PulseSpinner size="default" />
<PulseSpinner size="lg" />
<PulseSpinner size="xl" />

// Different variants
<PulseSpinner variant="default" />
<PulseSpinner variant="secondary" />
<PulseSpinner variant="muted" />
<PulseSpinner variant="destructive" />

// Different counts
<PulseSpinner count={2} />
<PulseSpinner count={4} />
<PulseSpinner count={6} />
```

### DotsSpinner

A bouncing dots animation with configurable count.

```tsx
import { DotsSpinner } from '@repo/ui'

// Basic usage
<DotsSpinner />

// Different sizes
<DotsSpinner size="sm" />
<DotsSpinner size="default" />
<DotsSpinner size="lg" />
<DotsSpinner size="xl" />

// Different variants
<DotsSpinner variant="default" />
<DotsSpinner variant="secondary" />
<DotsSpinner variant="muted" />
<DotsSpinner variant="destructive" />

// Different counts
<DotsSpinner count={2} />
<DotsSpinner count={4} />
<DotsSpinner count={6} />
```

## Props

### LoadingSpinnerProps

- `variant`: 'default' | 'secondary' | 'muted' | 'destructive'
- `size`: 'sm' | 'default' | 'lg' | 'xl'
- `text`: string (default: "Loading...")
- `showText`: boolean (default: false)
- `className`: string (for custom styling)

### PulseSpinnerProps

- `variant`: 'default' | 'secondary' | 'muted' | 'destructive'
- `size`: 'sm' | 'default' | 'lg' | 'xl'
- `count`: number (default: 3)
- `className`: string (for custom styling)

### DotsSpinnerProps

- `variant`: 'default' | 'secondary' | 'muted' | 'destructive'
- `size`: 'sm' | 'default' | 'lg' | 'xl'
- `count`: number (default: 3)
- `className`: string (for custom styling)

## Dependencies

- React 19.1.0
- Framer Motion 12.23.3
- class-variance-authority 0.7.0
- clsx 2.1.1
- tailwind-merge 2.6.0
- lucide-react 0.468.0

## Usage in Apps

```tsx
import { LoadingSpinner, PulseSpinner, DotsSpinner } from '@repo/ui'

function MyComponent() {
  return (
    <div>
      <LoadingSpinner showText text="Loading data..." />
      <PulseSpinner variant="secondary" />
      <DotsSpinner count={4} />
    </div>
  )
}
``` 