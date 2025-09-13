# Package Development Guidelines

This document outlines the standards and best practices for developing packages in this monorepo.

## 🎯 Package Design Principles

### Single Responsibility
Each package should have a clear, focused purpose:
- **@repo/auth** - Only authentication-related functionality
- **@repo/ui** - Only reusable UI components
- **@repo/shared-cache** - Only caching utilities

### Minimal Dependencies
- Keep external dependencies to a minimum
- Use peer dependencies for common libraries (React, etc.)
- Prefer workspace dependencies for internal packages

### Tree-Shakable Exports
- Use named exports instead of default exports
- Structure exports to enable tree-shaking
- Avoid side effects in modules

## 📝 Code Standards

### File Structure
```
src/
├── __tests__/          # Unit tests
├── components/         # React components (if applicable)
├── hooks/             # Custom hooks (if applicable)
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── schemas/           # Zod schemas or validation
└── index.ts           # Main export file
```

### TypeScript Guidelines
- Use strict TypeScript configuration
- Export all public types
- Use proper JSDoc comments for public APIs
- Prefer interfaces over types for object shapes

```typescript
/**
 * Configuration options for the cache
 */
export interface CacheConfig {
  /** Maximum number of items to store */
  maxSize: number;
  /** Time to live in milliseconds */
  ttl?: number;
}

/**
 * Creates a new cache instance
 */
export function createCache(config: CacheConfig): Cache {
  // Implementation
}
```

### React Component Guidelines
- Use functional components with hooks
- Implement proper TypeScript props interfaces
- Include displayName for debugging
- Use forwardRef when appropriate

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }))} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

## 🧪 Testing Standards

### Test Structure
- Place tests in `src/__tests__/` directory
- Use descriptive test names
- Group related tests with `describe` blocks
- Test both happy path and error cases

```typescript
import { describe, it, expect } from 'vitest';
import { createCache } from '../cache';

describe('createCache', () => {
  describe('when creating a memory cache', () => {
    it('should create cache with default configuration', () => {
      const cache = createCache('memory');
      expect(cache).toBeDefined();
    });

    it('should respect custom configuration', () => {
      const cache = createCache('memory', { maxSize: 100 });
      expect(cache.maxSize).toBe(100);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid cache type', () => {
      expect(() => createCache('invalid')).toThrow();
    });
  });
});
```

### Component Testing
- Use React Testing Library
- Test user interactions, not implementation details
- Use semantic queries (getByRole, getByLabelText)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 📦 Package Configuration

### Exports Configuration
Structure your exports for optimal tree-shaking:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./components": {
      "import": "./dist/components/index.js",
      "types": "./dist/components/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    }
  }
}
```

### Build Configuration
Use consistent Vite configuration:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PackageName',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

## 🔄 Development Workflow

### 1. Development
```bash
# Start development mode
pnpm dev

# Run tests in watch mode
pnpm test:watch

# Check types continuously
pnpm check-types --watch
```

### 2. Before Committing
```bash
# Run all checks
pnpm build
pnpm test
pnpm check-types
pnpm lint

# Or use the combined command
pnpm run check-all
```

### 3. Publishing
```bash
# Create changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish
pnpm changeset publish
```

## 📋 Checklist for New Packages

- [ ] Package name follows `@repo/` convention
- [ ] Directory name uses kebab-case
- [ ] Includes all standard scripts
- [ ] Has proper TypeScript configuration
- [ ] Includes comprehensive tests
- [ ] Has clear documentation
- [ ] Exports are properly configured
- [ ] Dependencies are minimal and appropriate
- [ ] Builds successfully
- [ ] All tests pass
- [ ] Types are properly exported

## 🚨 Common Pitfalls

### Avoid These Mistakes
- Don't use default exports (breaks tree-shaking)
- Don't include unnecessary dependencies
- Don't skip TypeScript types for public APIs
- Don't forget to test error cases
- Don't use relative imports across packages
- Don't include build artifacts in version control

### Performance Considerations
- Use dynamic imports for large dependencies
- Implement proper code splitting
- Avoid importing entire libraries when only using parts
- Use proper bundling strategies for different environments

## 🔧 Debugging Tips

### Common Issues
1. **Import errors**: Check package exports and workspace configuration
2. **Type errors**: Verify TypeScript configuration and type exports
3. **Build failures**: Check Vite configuration and dependencies
4. **Test failures**: Ensure proper test setup and mocking

### Useful Commands
```bash
# Check package dependencies
pnpm list --depth=0

# Analyze bundle size
pnpm build && npx bundlesize

# Check for circular dependencies
npx madge --circular src/

# Validate package.json
npx publint
```
