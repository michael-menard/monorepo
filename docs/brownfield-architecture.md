# LEGO MOC Instructions App - Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the LEGO MOC Instructions application codebase, including technical patterns, existing architecture, and real-world implementation details. It serves as a reference for AI agents working on the comprehensive frontend modernization project.

### Document Scope

Focused on areas relevant to: **Frontend Modular Architecture Refactor + Serverless Backend Integration + UX Enhancement**

### Change Log

| Date       | Version | Description                 | Author    |
| ---------- | ------- | --------------------------- | --------- |
| 2024-11-24 | 1.0     | Initial brownfield analysis | Architect |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `apps/web/lego-moc-instructions-app/src/main.tsx`
- **App Component**: `apps/web/lego-moc-instructions-app/src/App.tsx`
- **Routing**: `apps/web/lego-moc-instructions-app/src/routes/` (TanStack Router)
- **API Configuration**: `apps/web/lego-moc-instructions-app/src/config/api.ts`
- **API Service**: `apps/web/lego-moc-instructions-app/src/services/api.ts` (RTK Query)
- **Store**: `apps/web/lego-moc-instructions-app/src/store/` (Redux Toolkit)
- **Components**: `apps/web/lego-moc-instructions-app/src/components/`
- **Pages**: `apps/web/lego-moc-instructions-app/src/pages/`

### Enhancement Impact Areas

**Modular Architecture Refactor:**

- `apps/web/lego-moc-instructions-app/src/pages/` - Will be split into separate apps
- `apps/web/lego-moc-instructions-app/src/routes/` - Routing will be restructured
- `packages/features/` - Already has modular packages that align with target structure

**Serverless Backend Integration:**

- `apps/web/lego-moc-instructions-app/src/services/api.ts` - RTK Query endpoints need migration
- `apps/web/lego-moc-instructions-app/src/config/api.ts` - API configuration needs serverless URLs
- `apps/web/lego-moc-instructions-app/src/services/apiClient.ts` - Client needs serverless patterns

**UX Enhancement:**

- `packages/core/ui/` - Existing UI components need modernization
- `packages/core/design-system/` - Design system needs expansion
- All page components need UX improvements

## High Level Architecture

### Technical Summary

**Current Architecture**: Monolithic React SPA with modular packages in monorepo
**Target Architecture**: Modular micro-frontends with serverless backend and enhanced UX

### Actual Tech Stack

| Category        | Technology      | Version | Notes                        |
| --------------- | --------------- | ------- | ---------------------------- |
| Runtime         | Node.js         | >=18    | Specified in package.json    |
| Frontend        | React           | 19.0.0  | Latest version               |
| Routing         | TanStack Router | 1.130.2 | Modern file-based routing    |
| State           | Redux Toolkit   | 2.8.2   | With RTK Query for API       |
| Styling         | Tailwind CSS    | 4.1.11  | Latest v4 with custom colors |
| Build           | Vite            | 6.3.5   | Fast build tool              |
| Testing         | Vitest          | 3.0.5   | Vite-native testing          |
| Monorepo        | Turborepo       | 2.5.4   | Build orchestration          |
| Package Manager | pnpm            | 9.0.0   | Workspace management         |
| Auth            | AWS Cognito     | 6.15.7  | Via AWS Amplify              |

### Repository Structure Reality Check

- **Type**: Monorepo with Turborepo
- **Package Manager**: pnpm with workspaces
- **Notable**: Well-organized with clear separation between apps, packages, and shared code

## Source Tree and Module Organization

### Current Monolithic Structure (Target for Refactor)

```text
apps/web/lego-moc-instructions-app/
├── src/
│   ├── pages/
│   │   ├── HomePage/                    # Home page features
│   │   ├── InspirationGallery/          # Gallery features (→ gallery-app)
│   │   ├── WishlistGalleryPage/         # Wishlist features (→ wishlist-app)
│   │   ├── MocInstructionsGallery/      # MOC features (→ moc-instructions-app)
│   │   ├── MocDetailPage/               # MOC detail features (→ moc-instructions-app)
│   │   ├── ProfilePage/                 # Profile features (→ profile-app)
│   │   └── auth/                        # Auth pages (→ shared or main-app)
│   ├── routes/                          # TanStack Router definitions
│   ├── components/                      # Mixed shared and feature-specific components
│   ├── services/                        # API services (needs serverless migration)
│   ├── store/                           # Redux store (needs modularization)
│   └── config/                          # Configuration (needs serverless URLs)
└── package.json                         # Dependencies (needs splitting)
```

### Existing Modular Packages (Aligned with Target)

```text
packages/
├── features/
│   ├── gallery/                         # ✅ Already modular - maps to gallery-app
│   ├── wishlist/                        # ✅ Already modular - maps to wishlist-app
│   ├── moc-instructions/                # ✅ Already modular - maps to moc-instructions-app
│   └── profile/                         # ✅ Already modular - maps to profile-app
├── core/
│   ├── ui/                              # ✅ Shared components (needs UX enhancement)
│   ├── design-system/                   # ✅ Design system (needs expansion)
│   ├── cache/                           # ✅ Caching utilities
│   └── accessibility/                   # ✅ A11y utilities
└── tools/
    ├── upload/                          # ✅ File upload utilities
    ├── mock-data/                       # ✅ Development data
    └── [other tools]/                   # Various utilities
```

### Target Modular Structure (Post-Refactor)

```text
apps/web/
├── main-app/                            # Shell app (routing, layout, deployment)
├── gallery-app/                         # Standalone gallery module
├── wishlist-app/                        # Standalone wishlist module
├── moc-instructions-app/                # Standalone MOC module
├── profile-app/                         # Standalone profile module
└── shared-components/                   # Enhanced shared UI library
```

## Current API Integration Patterns

### Existing API Architecture

**Current Pattern**: RTK Query with environment-aware configuration

- **API Service**: `src/services/api.ts` - RTK Query endpoints
- **API Client**: `src/services/apiClient.ts` - Environment-aware HTTP client
- **Configuration**: `src/config/api.ts` - Multi-environment API URLs
- **Authentication**: AWS Cognito JWT tokens (automatic injection)

### API Endpoints (Current)

```typescript
// Current API configuration
const API_CONFIG = {
  development: {
    LEGO_API_URL: 'http://localhost:3000', // Local Docker
  },
  staging: {
    LEGO_API_URL: 'https://lego-api-staging.yourdomain.com', // AWS staging
  },
  production: {
    LEGO_API_URL: 'https://api.yourdomain.com', // AWS production
  },
}
```

### Current RTK Query Implementation

- **Cache Strategy**: Multi-level caching with `@repo/cache`
- **Authentication**: Cognito JWT auto-injection
- **Error Handling**: Standard RTK Query patterns
- **Type Safety**: Zod schemas for API responses

**Key API Endpoints**:

- `GET /api/mocs/search` - MOC instructions listing
- `GET /api/mocs/{id}` - Individual MOC details
- `POST /api/mocs` - Create MOC instruction
- `POST /api/mocs/{id}/files` - File uploads
- `GET /api/mocs/stats/*` - Analytics endpoints

## Current UX/UI Implementation

### Existing Design System

**Current State**: Basic design system with Tailwind CSS v4

- **Location**: `packages/core/ui/` and `packages/core/design-system/`
- **Styling**: Tailwind CSS v4 with custom color palette
- **Components**: Basic UI components (buttons, cards, forms)
- **Theme Support**: Custom colors defined, dark mode partially implemented

### Current UI Components

**Existing Components** (need UX enhancement):

- `@repo/ui` - Basic UI components
- Custom color system (primary, secondary, tertiary, accent, success, warning, error, info)
- Layout components (Header, Navigation, Layout)
- Feature-specific components in pages

### UX Patterns (Current)

- **Navigation**: Traditional SPA navigation
- **Loading States**: Basic loading indicators
- **Error Handling**: Standard error boundaries
- **Responsive Design**: Basic responsive patterns
- **Accessibility**: Some a11y utilities in `packages/core/accessibility/`

## Technical Debt and Known Issues

### Critical Areas for Modernization

1. **Monolithic Page Structure**: All features mixed in single app
   - Pages contain both routing and business logic
   - Difficult to develop features in isolation
   - Bundle size includes all features for all users

2. **API Integration Patterns**: Current backend not serverless
   - RTK Query configured for traditional REST API
   - No serverless-specific optimizations (cold start handling)
   - Environment configuration needs serverless endpoints

3. **UX/Design System**: Basic implementation needs enhancement
   - Limited component library
   - Inconsistent design patterns across features
   - No comprehensive design system documentation
   - Limited accessibility implementation

### Opportunities for Improvement

1. **Existing Modular Packages**: Already have feature packages that align with target
2. **Modern Tech Stack**: Using latest React, Vite, Tailwind CSS v4
3. **Good Testing Setup**: Vitest, Testing Library, Playwright E2E
4. **Monorepo Structure**: Well-organized with Turborepo

## Integration Points and External Dependencies

### Current External Services

| Service         | Purpose        | Integration Type | Key Files               |
| --------------- | -------------- | ---------------- | ----------------------- |
| AWS Cognito     | Authentication | AWS Amplify SDK  | `src/config/amplify.ts` |
| AWS S3          | File Storage   | Direct API calls | File upload components  |
| Current Backend | LEGO API       | REST API         | `src/services/api.ts`   |

### Internal Integration Points

- **State Management**: Redux Toolkit with RTK Query
- **Routing**: TanStack Router (file-based routing)
- **Caching**: Custom caching layer with `@repo/cache`
- **Performance**: Performance monitoring with custom hooks

## Development and Deployment

### Current Development Setup

```bash
# Start full development environment
pnpm dev                    # Starts all services
pnpm start:lego            # Starts LEGO app specifically

# Individual app development
cd apps/web/lego-moc-instructions-app && pnpm dev

# Build and test
pnpm build                 # Build all packages
pnpm test                  # Run all tests
pnpm lint                  # Lint all packages
```

### Build and Deployment Process

- **Build Tool**: Vite with SWC for fast builds
- **Deployment**: SST (Serverless Stack) for AWS deployment
- **CI/CD**: Turborepo for incremental builds
- **Environments**: Local, Staging, Production configurations

## Enhancement Impact Analysis

### Files That Will Need Modification

**Modular Architecture Refactor**:

- `apps/web/lego-moc-instructions-app/src/pages/*` - Split into separate apps
- `apps/web/lego-moc-instructions-app/src/routes/*` - Restructure routing
- `apps/web/lego-moc-instructions-app/package.json` - Split dependencies
- `packages/features/*` - Enhance existing feature packages

**Serverless Backend Integration**:

- `src/services/api.ts` - Migrate RTK Query endpoints
- `src/config/api.ts` - Update to serverless URLs
- `src/services/apiClient.ts` - Add serverless patterns (retry, cold start handling)
- All API-consuming components - Update error handling

**UX Enhancement**:

- `packages/core/ui/*` - Expand component library
- `packages/core/design-system/*` - Create comprehensive design system
- All page components - Apply new UX patterns
- Add accessibility improvements across all components

### New Files/Modules Needed

**Modular Architecture**:

- `apps/web/main-app/` - New shell application
- `apps/web/gallery-app/` - Extracted gallery module
- `apps/web/wishlist-app/` - Extracted wishlist module
- `apps/web/moc-instructions-app/` - Extracted MOC module
- `apps/web/profile-app/` - Extracted profile module

**Serverless Integration**:

- Enhanced API client with serverless patterns
- Serverless-specific error handling and retry logic
- Environment configuration for serverless endpoints

**UX Enhancement**:

- Comprehensive design system documentation
- Enhanced component library with modern patterns
- Accessibility-first component implementations
- Animation and interaction libraries

### Integration Considerations

- Must maintain existing Cognito authentication flow
- Preserve current caching strategies during migration
- Ensure backward compatibility during phased rollout
- Maintain existing build and deployment processes
- Keep current testing patterns and coverage

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
# Development
pnpm dev                   # Start full development environment
pnpm build                 # Build all packages
pnpm test                  # Run all tests
pnpm lint                  # Lint all packages

# Specific to LEGO app
cd apps/web/lego-moc-instructions-app
pnpm dev                   # Start individual app
pnpm build                 # Build individual app
pnpm test                  # Test individual app

# Monorepo management
pnpm build:changed         # Build only changed packages
pnpm test:changed          # Test only changed packages
turbo run build --filter='...[HEAD^1]'  # Turborepo incremental builds
```

### Debugging and Troubleshooting

- **Logs**: Check browser console and network tab
- **API Issues**: Verify environment configuration in `src/config/api.ts`
- **Build Issues**: Check Vite configuration and dependencies
- **Auth Issues**: Verify Cognito configuration in `src/config/amplify.ts`
