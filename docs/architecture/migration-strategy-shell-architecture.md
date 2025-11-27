# Migration Strategy - Shell Architecture

## Project Overview
**Goal:** Migrate legacy React UI monolithic app to modern page-based micro-apps architecture within existing monorepo.

**Current Status:** Migration 70% complete with excellent foundation already established.

## Corrected Architecture Principles

1. **`main-app` = Application Shell** - Layout, Auth, Global Navigation
2. **Domain Apps = Pure Business Logic** - No layout, no cross-cutting concerns  
3. **Complete Domain Isolation** - Each app owns ALL its domain logic
4. **Shell-Embedded Rendering** - Domain apps render within shell layout

## Revised App Responsibilities

### 🏠 `main-app` - Application Shell
**✅ Should contain:**
- **Layout Components** (AppBar, Sidebar, Footer, MainArea)
- **Authentication** (RTK slice + Context Provider)
- **Global Navigation** (cross-app routing)
- **Landing Page** (`/` route)
- **Error Boundaries** (global error handling)
- **Theme Provider** (global theming)

**❌ Should NOT contain:**
- Domain-specific components (Gallery, MOC, User components)
- Domain-specific state (gallery state, user state, etc.)
- Domain-specific business logic

**Current Issues to Fix:**
- Remove `components/Gallery/` → Move to `gallery-app`
- Remove `routes/modules/GalleryModule.tsx` → Move to `gallery-app`
- Remove `store/slices/gallerySlice.ts` → Move to `gallery-app`
- Remove any other domain-specific code

### 🖼️ `gallery-app` - Complete Gallery Domain
**Structure:**
```
apps/web/gallery-app/
├── src/
│   ├── App.tsx                      # Gallery app root
│   ├── main.tsx                     # Entry point
│   ├── components/
│   │   ├── Gallery/                 # All gallery components
│   │   │   ├── MocCard.tsx         # Moved from main-app
│   │   │   ├── GalleryControls.tsx # Moved from main-app
│   │   │   ├── GridView.tsx        # Moved from main-app
│   │   │   └── ListView.tsx        # Moved from main-app
│   │   └── Layout/
│   │       └── GalleryLayout.tsx   # Gallery-specific layout
│   ├── routes/
│   │   ├── index.ts                # Gallery routing
│   │   └── pages/
│   │       ├── GalleryPage.tsx     # Moved from main-app
│   │       ├── SearchPage.tsx      # Gallery search
│   │       └── UploadPage.tsx      # MOC upload
│   ├── store/
│   │   ├── index.ts                # Gallery store
│   │   └── slices/
│   │       └── gallerySlice.ts     # Moved from main-app
│   └── services/
│       └── galleryApi.ts           # Gallery API
```

### 👤 `user-app` - Complete User Domain
**Routes to migrate from `lego-moc-instructions-app`:**
- `profile.tsx` → `ProfilePage.tsx`
- `settings.tsx` → `SettingsPage.tsx`  
- `wishlist.tsx` → `WishlistPage.tsx`

### 🧱 `moc-app` - Complete MOC Domain
**Routes to migrate from `lego-moc-instructions-app`:**
- `moc-detail.tsx` → `MocDetailPage.tsx`
- MOC management functionality

## Shell Integration Pattern

### 1. Shell Layout Wrapper
```typescript
// apps/web/main-app/src/components/Layout/ShellLayout.tsx
export function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <AppBar />
        <div className="flex flex-1">
          <Sidebar />
          <MainArea>
            {children} {/* Domain apps render here */}
          </MainArea>
        </div>
        <Footer />
      </div>
    </AuthProvider>
  )
}
```

### 2. Domain App Integration
```typescript
// apps/web/gallery-app/src/App.tsx
export function GalleryApp() {
  return (
    <Provider store={galleryStore}>
      <RouterProvider router={galleryRouter} />
    </Provider>
  )
}
// Rendered within main-app's ShellLayout
```

### 3. Cross-App Navigation
```typescript
// apps/web/main-app/src/components/Navigation/GlobalNav.tsx
export function GlobalNav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/gallery">Gallery</Link>      {/* → gallery-app */}
      <Link href="/user/profile">Profile</Link> {/* → user-app */}
      <Link href="/moc/123">MOCs</Link>         {/* → moc-app */}
    </nav>
  )
}
```

## Migration Execution Plan

### Phase 1: Establish Shell Pattern
1. **Clean `main-app`** - Remove all domain-specific code
2. **Create Shell Layout** - AppBar, Sidebar, Footer, MainArea
3. **Centralize Auth** - RTK slice + Context in main-app
4. **Setup Global Navigation** - Cross-app routing

### Phase 2: Extract Gallery Domain  
1. **Move Gallery Components** - From main-app to gallery-app
2. **Move Gallery State** - gallerySlice to gallery-app store
3. **Move Gallery Routes** - Gallery pages and routing
4. **Test Gallery Integration** - Ensure it renders in shell

### Phase 3: Extract User Domain
1. **Move User Components** - From lego-moc-instructions-app
2. **Create User Store** - Profile, settings, wishlist state
3. **Setup User Routing** - User-specific routes
4. **Test User Integration** - Ensure shell integration

### Phase 4: Extract MOC Domain
1. **Move MOC Components** - From lego-moc-instructions-app
2. **Create MOC Store** - MOC-specific state
3. **Setup MOC Routing** - MOC detail and management routes
4. **Test MOC Integration** - Ensure shell integration

## URL Routing Strategy

Each app owns specific URL patterns:
```
/ → main-app (landing page only)
/gallery/* → gallery-app (all gallery functionality)
/moc/* → moc-app (MOC details, management)
/user/* → user-app (profile, settings, wishlist)
```

## Package Dependencies

### Shell Dependencies (`main-app`)
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*",           // Layout components
    "@repo/api-client": "workspace:*",   // Auth integration
    "@tanstack/react-router": "^1.130.2",
    "@reduxjs/toolkit": "^2.8.2",
    "react": "^19.0.0"
  }
}
```

### Domain App Dependencies (e.g., `gallery-app`)
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*",           // Shared UI components
    "@repo/gallery": "workspace:*",      // Gallery-specific features
    "@repo/cache": "workspace:*",        // Caching utilities
    "@tanstack/react-router": "^1.130.2",
    "@reduxjs/toolkit": "^2.8.2",
    "react": "^19.0.0"
  }
}
```

## Benefits of Shell Architecture

1. **True Domain Isolation** - Each app owns its complete domain
2. **Consistent Layout** - All apps share the same shell structure
3. **Centralized Auth** - Authentication managed in one place
4. **Independent Development** - Teams can work on apps independently
5. **Easy Testing** - Each domain can be tested in isolation
6. **Clear Boundaries** - No confusion about where code belongs

## Success Criteria

To be successful, the migration must achieve:
- **Full feature parity or better** with current functionality
- **Complete unit and integration test suite** that passes
- **Lighthouse tests integrated** into CI/CD pipeline
- **Bundle monitoring** and performance tracking
- **All tests pass** including linting
- **Clean domain boundaries** with no architectural leakage
