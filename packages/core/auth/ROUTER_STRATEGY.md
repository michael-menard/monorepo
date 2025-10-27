# Router Adapter Strategy

## Overview

The `@repo/auth` package has been standardized to use **TanStack Router as the primary/default router**, with React Router support available through a separate entry point. This ensures optimal tree-shaking and prevents forcing `react-router-dom` on consumers who don't need it.

## Package Structure

### Main Entry (`@repo/auth`)

- **Default import path**: `@repo/auth`
- **Primary router**: TanStack Router
- **Bundle size**: ~2.19 kB (gzipped: 0.92 kB) - Very lightweight!
- **Key exports**:
  - `createTanStackRouteGuard` - Route protection for TanStack Router
  - `TanStackRouteGuardOptions` - Type definitions
  - All router-agnostic components (Input, Button, etc.)
  - Hooks, store, types, schemas, utils

### React Router Entry (`@repo/auth/react-router`)

- **Import path**: `@repo/auth/react-router`
- **Router**: React Router DOM
- **Bundle size**: ~85.53 kB (gzipped: 20.98 kB) - Contains full form components
- **Key exports**:
  - `RouteGuard` - Component-based route protection for React Router
  - All form components (Login, Signup, ForgotPassword, etc.)
  - Re-exports all router-agnostic exports from main entry

## Usage Examples

### TanStack Router (Recommended)

```typescript
// Import TanStack Router components from main entry
import { createTanStackRouteGuard, type TanStackRouteGuardOptions } from '@repo/auth'

// Use in TanStack Router route definitions
const protectedRoute = createRoute({
  path: '/profile',
  beforeLoad: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/login',
  }),
  component: ProfilePage,
})
```

### React Router (Legacy/Specific Use Cases)

```typescript
// Import React Router components from subpath
import { RouteGuard, LoginForm } from '@repo/auth/react-router';

// Use as wrapper components
function ProtectedProfile() {
  return (
    <RouteGuard requireAuth redirectTo="/login">
      <ProfilePage />
    </RouteGuard>
  );
}
```

## Benefits

### Tree-Shaking Optimization

- **TanStack consumers**: Only get ~2.19 kB bundle (minimal overhead)
- **React Router consumers**: Get full functionality when needed (~85.53 kB)
- **Mixed environments**: Can use both patterns as needed

### Dependency Management

- `react-router-dom` is an **optional peer dependency**
- Projects using only TanStack Router don't need to install `react-router-dom`
- No breaking changes for existing React Router consumers

### TypeScript Support

- Full type definitions for both entry points
- Proper type safety and IntelliSense support
- Source maps for debugging

## Build Configuration

### Package.json Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./react-router": {
      "import": "./dist/react-router.js",
      "require": "./dist/react-router.js",
      "types": "./dist/react-router.d.ts"
    }
  },
  "peerDependenciesMeta": {
    "react-router-dom": {
      "optional": true
    }
  }
}
```

### Vite Build Config

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts', // TanStack Router entry
        'react-router': 'src/react-router.ts', // React Router entry
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-router-dom'],
    },
  },
})
```

## Migration Guide

### For New Projects

- Use `@repo/auth` (main entry) with TanStack Router
- Smaller bundle size and modern router features

### For Existing React Router Projects

- Continue using `@repo/auth/react-router`
- No breaking changes required
- Can gradually migrate to TanStack Router if desired

### For Mixed Projects

- Use both entry points as needed
- TanStack Router for new routes
- React Router for legacy components

## Consistency with Monorepo

This strategy aligns with the overall monorepo standardization goals:

- ✅ **G1**: Vite lib build configuration
- ✅ \*\*G
