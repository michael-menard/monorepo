# Package Structure Guide

This guide explains the new organized package structure in the monorepo.

## 📁 New Package Structure

```
packages/
├── auth/                   # Authentication package
│   └── src/               # Auth components and utilities
├── features/               # Feature-specific packages
│   ├── FileUpload/        # File upload functionality
│   ├── gallery/           # Gallery feature
│   ├── ImageUploadModal/  # Image upload modal
│   ├── moc-instructions/  # MOC instructions feature
│   ├── profile/           # User profile feature
│   └── wishlist/          # Wishlist feature
├── shared/                 # Shared packages
│   └── src/               # Shared utilities and configurations
├── tech-radar/             # Technology radar package
│   └── src/               # Tech radar components and data
└── ui/                     # UI components (existing)
    └── src/               # Main UI component library
```

## 🎯 Package Categories

### **Auth Package (`packages/auth/`)**
Authentication and authorization functionality:
- **Auth components** - Login, signup, password reset forms
- **Auth utilities** - Authentication hooks and utilities
- **Auth store** - Redux store for auth state management
- **Route guards** - Protected route components

**Examples:**
- `LoginForm` - User login component
- `SignupForm` - User registration component
- `RouteGuard` - Protected route wrapper
- `useAuth` - Authentication hook

### **Feature Packages (`packages/features/`)**
Feature-specific functionality:
- **File upload** - File upload components and utilities
- **Gallery** - Image gallery functionality
- **Profile** - User profile management
- **Wishlist** - Wishlist functionality
- **MOC instructions** - MOC instruction features

**Examples:**
- `FileUpload` - File upload component
- `gallery` - Gallery feature package
- `profile` - User profile management
- `wishlist` - Wishlist functionality

### **UI Packages (`packages/ui/`)**
Reusable UI components and design system:
- **UI components** - Reusable React components
- **Design system** - Design tokens, themes
- **UI utilities** - Styling utilities, component helpers
- **UI templates** - UI component templates

**Examples:**
- `ui` - Main UI component library
- `design-system` - Design tokens and themes
- `ui-utils` - UI utility functions

### **Shared Packages (`packages/shared/`)**
Packages used across multiple categories:
- **Configuration** - Shared configs (TypeScript, ESLint)
- **Utilities** - General utilities used by API and web
- **Types** - Shared TypeScript types
- **Constants** - Shared constants and enums

**Examples:**
- `utils` - General utility functions
- `shared-config` - Shared configuration
- `typescript-config` - TypeScript configurations
- `eslint-config` - ESLint configurations

### **Tech Radar Package (`packages/tech-radar/`)**
Technology radar and assessment tools:
- **Tech radar components** - Components for displaying technology assessments
- **Radar data** - Technology assessment data and configurations
- **Radar utilities** - Utilities for managing tech radar data

**Examples:**
- `radar.json` - Technology assessment data
- `generate-radar.ts` - Radar generation utilities

## 🚀 Creating New Packages

### **Using the Script (Recommended)**
```bash
# Create a new backend package
./scripts/create-package.sh my-backend backend

# Create a new frontend package
./scripts/create-package.sh my-frontend frontend
```

### **Manual Creation**
```bash
# Auth packages
cp -r packages/auth packages/auth/my-auth-package

# Feature packages
cp -r packages/features/FileUpload packages/features/my-feature

# UI packages
cp -r packages/ui packages/ui/my-ui-component

# Shared packages
mkdir packages/shared/my-shared-utils

# Tech radar packages
cp -r packages/tech-radar packages/tech-radar/my-radar-tool
```

## 📋 Package Placement Guidelines

### **Where to Place New Packages**

| Package Type | Location | Example |
|-------------|----------|---------|
| Auth functionality | `packages/auth/` | `auth-components` |
| Feature-specific | `packages/features/` | `file-upload` |
| UI component | `packages/ui/` | `button-component` |
| Shared utility | `packages/shared/` | `date-utils` |
| Tech radar | `packages/tech-radar/` | `radar-components` |

### **Decision Tree**

1. **Is it authentication-related?** → `packages/auth/`
2. **Is it a specific feature?** → `packages/features/`
3. **Is it a UI component?** → `packages/ui/`
4. **Is it a tech radar tool?** → `packages/tech-radar/`
5. **Is it used by multiple categories?** → `packages/shared/`

## 🔧 Workspace Configuration

The workspace configuration in `pnpm-workspace.yaml` automatically includes all subdirectories:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/*/*'  # This includes api/, web/, ui/, shared/
```

## 📝 Best Practices

### **Naming Conventions**
- Use kebab-case for package names
- Be descriptive and specific
- Include the purpose in the name

**Good examples:**
- `auth-service` (backend service)
- `dashboard-app` (frontend app)
- `button-component` (UI component)
- `date-utils` (shared utility)

### **Dependencies**
- **Auth packages** can depend on `shared/` and `ui/` packages
- **Feature packages** can depend on `shared/`, `ui/`, and `auth/` packages
- **UI packages** can depend on `shared/` packages
- **Tech radar packages** can depend on `shared/` and `ui/` packages
- **Shared packages** should be minimal and focused

### **Documentation**
Each package should include:
- Clear README with usage examples
- TypeScript definitions
- Test coverage
- Usage examples

## 🔄 Migration Notes

### **What Changed**
- Auth functionality consolidated in `auth/` package
- Feature-specific packages organized in `features/` directory
- Tech radar moved from root to `packages/tech-radar/`
- Shared packages consolidated in `shared/`
- Documentation updated to reflect current structure

### **Benefits**
- ✅ Better organization and discovery
- ✅ Clearer separation of concerns
- ✅ Easier team collaboration
- ✅ Scalable structure for growth

## 🛠️ Maintenance

### **Regular Tasks**
1. **Audit package placement** - Ensure packages are in correct categories
2. **Update dependencies** - Keep shared packages minimal
3. **Documentation** - Keep READMEs up-to-date
4. **Testing** - Ensure all packages have proper tests

### **Adding New Categories**
If you need a new category (e.g., `mobile/` for React Native):
1. Create the directory: `packages/mobile/`
2. Update this documentation
3. Update the create-package script if needed
4. Add templates for the new category 