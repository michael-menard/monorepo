# Packages Directory

This directory contains all the shared packages used across the monorepo. Each package is designed to be reusable, well-tested, and follows consistent conventions.

## 📁 Package Structure

```
packages/
├── .template/              # Template for new packages
├── auth/                   # Authentication utilities and components
├── features/               # Feature-specific packages
│   ├── FileUpload/        # File upload components
│   ├── ImageUploadModal/  # Image upload modal
│   ├── gallery/           # Gallery components
│   ├── moc-instructions/  # MOC instructions features
│   ├── profile/           # Profile management
│   ├── shared/            # Shared feature utilities
│   └── wishlist/          # Wishlist functionality
├── shared/                 # Core shared utilities
├── shared-cache/          # Caching utilities and components
├── shared-image-utils/    # Image processing utilities
├── tech-radar/            # Technology radar component
└── ui/                    # UI component library
```

## 🏷️ Naming Conventions

All packages follow consistent naming conventions:

- **Package names**: Use `@repo/` prefix (e.g., `@repo/auth`, `@repo/ui`)
- **Directory names**: Use kebab-case (e.g., `file-upload`, `image-upload-modal`)
- **Exports**: Use named exports for better tree-shaking

## 📦 Package Categories

### Core Packages
- **@repo/shared** - Core shared utilities, store, design system
- **@repo/ui** - Reusable UI components built with Radix UI and Tailwind
- **@repo/auth** - Authentication utilities and route guards

### Utility Packages
- **@repo/shared-cache** - Caching utilities (memory, storage, RTK Query)
- **@repo/tech-radar** - Interactive technology radar component
- **@monorepo/upload** - Unified file and image upload system with drag-and-drop, progress tracking, validation, and image processing

### Feature Packages
- **@repo/gallery** - Image gallery components
- **@repo/moc-instructions** - LEGO MOC instruction features
- **@repo/profile** - User profile management
- **@repo/features-shared** - Shared feature utilities
- **@repo/features-wishlist** - Wishlist functionality

## 🛠️ Standard Package Configuration

All packages follow these standards:

### package.json Structure
```json
{
  "name": "@repo/package-name",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### Standard Scripts
```json
{
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly --outDir dist",
    "dev": "vite build --watch",
    "check-types": "tsc --noEmit",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/ --ext .ts,.tsx --max-warnings 0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "clean": "rm -rf dist node_modules"
  }
}
```

### Dependencies
- **React**: `^19.1.0` (consistent across all packages)
- **TypeScript**: `5.8.3` (exact version for consistency)
- **Vite**: `^5.2.10` (build tool)
- **Vitest**: `^3.2.4` (testing framework)

## 🚀 Creating New Packages

1. **Copy the template**:
   ```bash
   cp -r packages/.template packages/my-new-package
   ```

2. **Update package.json**:
   - Change the `name` field to `@repo/my-new-package`
   - Update the `description`
   - Add specific dependencies

3. **Install dependencies**:
   ```bash
   cd packages/my-new-package
   pnpm install
   ```

4. **Build and test**:
   ```bash
   pnpm build
   pnpm test
   pnpm check-types
   ```

## 📋 Development Guidelines

### Code Organization
- Use `src/` directory for source code
- Export main functionality from `src/index.ts`
- Include tests in `src/__tests__/` or `__tests__/`
- Add documentation in README.md

### Testing
- Write unit tests for all public APIs
- Use Vitest for testing framework
- Include `@testing-library/react` for component testing
- Aim for high test coverage

### TypeScript
- Use strict TypeScript configuration
- Export types alongside implementations
- Use proper type definitions for all public APIs

### Dependencies
- Keep dependencies minimal and focused
- Use workspace dependencies (`workspace:*`) for internal packages
- Prefer peer dependencies for React and common libraries

## 🔧 Maintenance

### Regular Tasks
- Run `pnpm run sync-deps` to keep dependencies aligned
- Update package versions using changesets
- Run tests across all packages: `pnpm test`
- Check types: `pnpm check-types`

### Troubleshooting
- **Build issues**: Check TypeScript configuration and dependencies
- **Import errors**: Verify package exports and workspace configuration
- **Version conflicts**: Run dependency sync script

## 📚 Additional Resources

- [Dependency Management Guide](../__docs__/DEPENDENCY-MANAGEMENT.md)
- [Testing Guidelines](../__docs__/TESTING.md)
- [TypeScript Configuration](../__docs__/TYPESCRIPT.md)
