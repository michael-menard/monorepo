# Package Creation Guide

This guide explains how to create new packages in this monorepo based on the current structure.

## Current Package Structure

### 1. Auth Package (`packages/auth/`)
Authentication and authorization functionality:
- Auth components (Login, Signup, Password Reset)
- Auth utilities and hooks
- Redux store for auth state management
- Route guards for protected routes

### 2. Feature Packages (`packages/features/`)
Feature-specific functionality:
- FileUpload - File upload components and utilities
- gallery - Image gallery functionality
- profile - User profile management
- wishlist - Wishlist functionality
- moc-instructions - MOC instruction features
- ImageUploadModal - Image upload modal component

### 3. UI Package (`packages/ui/`)
Reusable UI components and design system:
- shadcn/ui components
- Design system tokens
- UI utilities and helpers

### 4. Shared Package (`packages/shared/`)
Shared utilities and configurations:
- Common utilities
- Shared configurations
- TypeScript types

### 5. Tech Radar Package (`packages/tech-radar/`)
Technology radar and assessment tools:
- Tech radar components
- Radar data and configurations
- Radar utilities

## Quick Start: Using the Script

The easiest way to create a new package is using the provided script:

```bash
# Create a new feature package
./scripts/create-package.sh my-feature feature

# Create a new auth package
./scripts/create-package.sh my-auth auth
```

The script will:
1. Copy the appropriate template
2. Update the package name in `package.json`
3. Create necessary configuration files
4. Provide next steps

## Manual Package Creation

### Option 1: Copy Existing Package

```bash
# For feature packages
cp -r packages/features/FileUpload packages/features/my-new-feature

# For auth packages
cp -r packages/auth packages/auth/my-new-auth

# For UI components
cp -r packages/ui packages/ui/my-new-ui
```

### Option 2: Use as Reference

You can browse the existing package directories to understand the structure and copy specific files as needed.

## Package Structure Examples

### Feature Package Structure (e.g., FileUpload)
```
packages/features/FileUpload/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
├── src/
│   ├── index.tsx         # Main component
│   ├── index.d.ts        # TypeScript definitions
│   ├── hooks/            # Custom hooks
│   └── __tests__/        # Test files
├── test/                 # Test utilities
└── README.md             # Documentation
```

### Auth Package Structure
```
packages/auth/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── components/       # Auth components
│   ├── hooks/            # Auth hooks
│   ├── store/            # Redux store
│   ├── schemas/          # Zod schemas
│   ├── types/            # TypeScript types
│   └── __tests__/        # Test files
└── README.md             # Documentation
```

### UI Package Structure
```
packages/ui/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── components.json       # shadcn/ui configuration
├── src/
│   ├── components/       # UI components
│   ├── lib/              # Utility functions
│   └── __tests__/        # Test files
└── README.md             # Documentation
```

## Post-Creation Steps

After creating a new package:

### For Feature Packages:
1. **Install Dependencies**:
   ```bash
   cd packages/features/my-feature
   pnpm install
   ```

2. **Update Package Configuration**:
   - Update `name` and `description` in `package.json`
   - Customize the component in `src/index.tsx`
   - Add your hooks in `src/hooks/`

### For Auth Packages:
1. **Install Dependencies**:
   ```bash
   cd packages/auth/my-auth
   pnpm install
   ```

2. **Update Package Configuration**:
   - Update `name` and `description` in `package.json`
   - Customize auth components in `src/components/`
   - Update auth store in `src/store/`

### For UI Packages:
1. **Install Dependencies**:
   ```bash
   cd packages/ui/my-ui
   pnpm install
   ```

2. **Update Package Configuration**:
   - Update `name` and `description` in `package.json`
   - Add your UI components in `src/components/`
   - Update `components.json` for shadcn/ui if needed

## Package Customization

### Adding New Package Types

To add a new package type:

1. Create a new package directory: `packages/<type>/`
2. Update the `create-package.sh` script to include the new type
3. Document the package structure and usage

### Modifying Existing Packages

When modifying packages, consider:
- Keep packages focused and single-purpose
- Include comprehensive documentation
- Add example code that demonstrates best practices
- Include proper TypeScript configurations
- Add testing setup

## Best Practices

1. **Package Naming**: Use descriptive names like `file-upload`, `user-profile`, `image-gallery`

2. **Consistency**: Keep similar structure across packages where possible

3. **Documentation**: Each package should have a comprehensive README

4. **Dependencies**: Use the shared packages when possible:
   - `@monorepo/shared` for utilities
   - `@monorepo/ui` for UI components
   - `@monorepo/auth` for auth functionality

5. **Testing**: Always include testing setup in packages

6. **TypeScript**: Use proper TypeScript configurations and type definitions

## Troubleshooting

### Common Issues

1. **Package name conflicts**: Ensure the package name doesn't already exist
2. **Dependency issues**: Run `pnpm install` after creating a new package
3. **TypeScript errors**: Check that `tsconfig.json` extends the shared config
4. **Test failures**: Ensure Vitest is properly configured

### Getting Help

- Check the template's README for specific instructions
- Review the `DEPENDENCY-MANAGEMENT.md` for dependency guidelines
- Use the sync script to ensure consistent dependencies across packages 