# Vite Build Configuration

This document describes the Vite build setup implemented for the monorepo frontend packages.

## Overview

The Vite configuration has been set up to support:
- **TypeScript** with ESNext module resolution
- **React** with SWC for fast compilation
- **Shared packages** with proper library builds
- **Environment variables** with VITE_ prefix
- **Asset handling** with organized output structure
- **Development server** with HMR and proxy configuration
- **Production builds** with optimization and minification

## Configuration Files

### Base Configuration (`vite.config.base.ts`)

The base configuration provides shared settings for all packages:

- **Plugins**: React SWC for fast compilation
- **Resolve**: Path aliases for workspace packages
- **Build**: Optimized production builds with proper asset naming
- **Server**: Development server with HMR
- **CSS**: SCSS support with shared variables
- **Dependencies**: Optimized dependency handling

### Root Configuration (`vite.config.ts`)

Extends the base configuration with:
- **Proxy settings** for API endpoints
- **Development server** configuration for the main app

### Package Configurations

Each package has its own Vite configuration:

- **UI Package**: Extends base config for component library
- **Auth Package**: Extends base config for auth components
- **Shared Package**: Library build configuration
- **Feature Packages**: Extend base config for feature components

## Key Features

### 1. TypeScript Support
- ESNext target for modern JavaScript features
- Strict type checking enabled
- Path mapping for clean imports

### 2. Asset Handling
- Organized asset output structure
- Image and font file organization
- Hash-based file naming for cache busting

### 3. Environment Variables
- VITE_ prefix for client-side variables
- Automatic loading based on mode
- Type-safe environment access

### 4. Development Server
- Hot Module Replacement (HMR)
- Proxy configuration for API calls
- Automatic browser opening

### 5. Production Builds
- ESBuild minification
- Tree shaking for unused code
- Source maps for debugging
- Optimized chunk splitting

## Usage

### Development
```bash
# Start development server for a package
pnpm dev --filter=@packages/shared

# Start all packages in development mode
pnpm dev
```

### Building
```bash
# Build a specific package
pnpm build --filter=@packages/shared

# Build all packages
pnpm build
```

### Preview
```bash
# Preview production build
pnpm preview --filter=@packages/shared
```

## Package Structure

### Shared Package
- **Purpose**: Common utilities and design tokens
- **Build Type**: Library (ES and UMD formats)
- **Exports**: Design variables, utilities, and test functions

### UI Package
- **Purpose**: Reusable UI components
- **Build Type**: Component library
- **Dependencies**: ShadCN UI, Tailwind CSS

### Auth Package
- **Purpose**: Authentication components and logic
- **Build Type**: Feature package
- **Dependencies**: React Hook Form, Zod validation

## Environment Variables

The configuration supports environment variables with the `VITE_` prefix:

```bash
# .env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=React Constructs
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Asset Organization

Built assets are organized as follows:
```
dist/
├── assets/
│   ├── images/
│   ├── fonts/
│   └── js/
└── [package-name].es.js
└── [package-name].umd.js
```

## Dependencies

### Core Dependencies
- `vite`: Build tool and dev server
- `@vitejs/plugin-react-swc`: React compilation
- `typescript`: Type checking and compilation

### Development Dependencies
- `vitest`: Testing framework
- `@testing-library/react`: React testing utilities
- `jsdom`: DOM environment for tests

## Best Practices

1. **Use path aliases** for clean imports
2. **External dependencies** for library packages
3. **Environment variables** for configuration
4. **Asset optimization** for production builds
5. **Type safety** with TypeScript

## Troubleshooting

### Common Issues

1. **Module resolution errors**: Check path aliases in tsconfig.json
2. **Build failures**: Ensure all dependencies are installed
3. **HMR not working**: Check file extensions and import paths
4. **Environment variables**: Ensure VITE_ prefix is used

### Debug Commands

```bash
# Check TypeScript errors
pnpm check-types

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Future Enhancements

- [ ] Add Storybook integration
- [ ] Implement CSS-in-JS support
- [ ] Add bundle analysis
- [ ] Configure PWA features
- [ ] Add internationalization support 