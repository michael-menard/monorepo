# Package Structure Guide

This guide explains the new organized package structure in the monorepo.

## 📁 New Package Structure

```
packages/
├── api/                    # Backend/API packages
│   └── template-backend/   # Backend template
├── web/                    # Frontend/Web packages
│   └── template-frontend/  # Frontend template
├── ui/                     # UI components (existing)
│   └── ui/                # Main UI package
└── shared/                 # Shared packages
    ├── utils/              # Utility functions
    ├── shared-config/      # Shared configuration
    ├── typescript-config/  # TypeScript configs
    └── eslint-config/      # ESLint configs
```

## 🎯 Package Categories

### **API Packages (`packages/api/`)**
Backend and API-related packages:
- **Backend services** - API endpoints, business logic
- **Database utilities** - Prisma clients, database helpers
- **API templates** - Backend service templates
- **Server utilities** - Server-side utilities

**Examples:**
- `template-backend` - Backend service template
- `auth-service` - Authentication service
- `database-utils` - Database utilities

### **Web Packages (`packages/web/`)**
Frontend and web-related packages:
- **Web applications** - React apps, Next.js apps
- **Client utilities** - Browser utilities, client-side helpers
- **Web templates** - Frontend app templates
- **Web components** - Web-specific components

**Examples:**
- `template-frontend` - Frontend app template
- `web-utils` - Web-specific utilities
- `client-auth` - Client-side auth utilities

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
# Backend packages
cp -r packages/api/template-backend packages/api/my-backend

# Frontend packages
cp -r packages/web/template-frontend packages/web/my-frontend

# UI packages
cp -r packages/ui/ui packages/ui/my-ui-component

# Shared packages
mkdir packages/shared/my-shared-utils
```

## 📋 Package Placement Guidelines

### **Where to Place New Packages**

| Package Type | Location | Example |
|-------------|----------|---------|
| Backend service | `packages/api/` | `auth-service` |
| Frontend app | `packages/web/` | `dashboard-app` |
| UI component | `packages/ui/` | `button-component` |
| Shared utility | `packages/shared/` | `date-utils` |
| Configuration | `packages/shared/` | `eslint-config` |

### **Decision Tree**

1. **Is it a backend/API service?** → `packages/api/`
2. **Is it a frontend/web app?** → `packages/web/`
3. **Is it a UI component?** → `packages/ui/`
4. **Is it used by multiple categories?** → `packages/shared/`

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
- **API packages** can depend on `shared/` packages
- **Web packages** can depend on `shared/` and `ui/` packages
- **UI packages** can depend on `shared/` packages
- **Shared packages** should be minimal and focused

### **Documentation**
Each package should include:
- Clear README with usage examples
- TypeScript definitions
- Test coverage
- Usage examples

## 🔄 Migration Notes

### **What Changed**
- Templates moved to appropriate categories
- Shared packages consolidated in `shared/`
- Scripts updated to work with new structure
- Documentation updated

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