# Legacy Application Migration Analysis

## Executive Summary

**Migration Scope**: Migrate `apps/web/lego-moc-instructions-app` to `apps/web/main-app` shell architecture
**Complexity**: Medium-High (22 story points across 6 sprints)
**Risk Level**: Low-Medium (well-defined architecture, existing components)
**Timeline**: 6 sprints (6-7 weeks)

## Legacy Application Inventory

### 📱 **Pages & Components (Complexity Rating: 1-5)**

#### **High Priority Pages**
- **HomePage** (Complexity: 2) - Simple landing page, minimal state
- **InspirationGallery** (Complexity: 4) - Complex masonry layout, filtering, search
- **MocInstructionsGallery** (Complexity: 4) - Advanced filtering, infinite scroll
- **WishlistGalleryPage** (Complexity: 3) - Priority management, CRUD operations
- **ProfilePage** (Complexity: 3) - User data, settings, activity history
- **MocDetailPage** (Complexity: 5) - Most complex: editing, file management, PDF viewer

#### **Authentication Pages**
- **LoginPage** (Complexity: 2) - AWS Cognito integration
- **SignupPage** (Complexity: 2) - Registration flow
- **ForgotPasswordPage** (Complexity: 1) - Simple form
- **ResetPasswordPage** (Complexity: 1) - Simple form
- **VerifyEmailPage** (Complexity: 1) - Simple verification

### 🏗️ **Architecture Analysis**

#### **Current Legacy Structure**
```
lego-moc-instructions-app/
├── src/
│   ├── pages/           # 11 pages (to migrate)
│   ├── components/      # 15+ components (Layout, Navigation, etc.)
│   ├── routes/          # TanStack Router (19 routes)
│   ├── store/           # Redux Toolkit + RTK Query
│   ├── services/        # API clients, auth integration
│   └── lib/             # Utilities, auth guards
```

#### **Target Main-App Structure**
```
main-app/
├── src/
│   ├── components/Layout/    # ✅ Header, Sidebar, Footer (existing)
│   ├── store/slices/         # ✅ Auth, Theme, Navigation (existing)
│   ├── services/auth/        # ✅ AuthProvider, Cognito (existing)
│   ├── routes/               # ✅ TanStack Router setup (existing)
│   └── pages/                # 🔄 Migrate legacy pages here
```

### 🔄 **State Management Migration**

#### **Legacy Redux Store**
- **gallerySlice** - Layout, sorting, search state
- **wishlistReducer** - Wishlist management (from @repo/mock-data)
- **mocInstructionsReducer** - MOC data management
- **profileReducer** - User profile state
- **RTK Query APIs** - api.ts, offlineApi.ts

#### **Target Main-App Store**
- **authSlice** ✅ - Authentication state (existing)
- **themeSlice** ✅ - Theme management (existing)
- **navigationSlice** ✅ - Navigation state (existing)
- **enhancedGalleryApi** ✅ - Enhanced API client (existing)
- **enhancedWishlistApi** ✅ - Enhanced API client (existing)

### 🔌 **API Integration Points**

#### **Legacy API Clients**
- **api.ts** - Main RTK Query API (42 endpoints)
- **offlineApi.ts** - Offline-first API client
- **apiClient.ts** - Base HTTP client with auth
- **AWS Cognito** - Authentication integration

#### **Target Enhanced APIs**
- **@repo/api-client** ✅ - Serverless-optimized client (existing)
- **Enhanced RTK Query** ✅ - With retry logic, caching (existing)
- **Cognito Integration** ✅ - Token management, refresh (existing)

## Migration Standards & Patterns

### 🎨 **Component Migration Standards**
1. **Use @repo/ui design system** - shadcn/ui components
2. **Apply LEGO visual language** - Teal colors, Inter typography, 8px grid
3. **Implement WCAG 2.1 AA** - Accessibility compliance
4. **Mobile-first responsive** - 44px touch targets, swipe gestures
5. **Performance optimization** - React.memo, lazy loading, code splitting

### 🧪 **Testing Migration Standards**
1. **Unit tests** - Component behavior and rendering
2. **Integration tests** - API integration, state management
3. **E2E tests** - User workflows and navigation
4. **Accessibility tests** - Screen reader, keyboard navigation
5. **Performance tests** - Loading times, bundle size

### 🔒 **Security & Auth Standards**
1. **Route protection** - TanStack Router guards
2. **Token management** - Enhanced Cognito integration
3. **API authentication** - Automatic token injection
4. **Error handling** - Graceful auth failures

## Risk Assessment & Mitigation

### 🔴 **High Risk Areas**
1. **MOC Detail Page** - Complex editing interface, file management
   - *Mitigation*: Phase migration, extensive testing
2. **State Management Integration** - Redux store consolidation
   - *Mitigation*: Gradual migration, parallel state management
3. **API Endpoint Compatibility** - Legacy vs enhanced APIs
   - *Mitigation*: Backward compatibility layer, feature flags

### 🟡 **Medium Risk Areas**
1. **Gallery Performance** - Large datasets, infinite scroll
   - *Mitigation*: Implement virtualization, optimize queries
2. **Mobile Responsiveness** - Complex layouts on small screens
   - *Mitigation*: Mobile-first design, extensive device testing

### 🟢 **Low Risk Areas**
1. **Authentication Pages** - Simple forms, existing Cognito integration
2. **Layout Components** - Well-defined, existing in main-app
3. **Basic CRUD Operations** - Standard patterns, existing APIs

## Technical Debt Cleanup

### 🧹 **Areas Requiring Cleanup**
1. **Commented Code** - Remove disabled offline API, unused imports
2. **Type Safety** - Improve TypeScript coverage, fix any types
3. **Performance** - Optimize re-renders, implement proper memoization
4. **Testing Coverage** - Increase from 66% to 90%+ coverage
5. **Bundle Size** - Remove unused dependencies, optimize imports

### 📦 **Dependencies to Consolidate**
- **UI Components** - Migrate to @repo/ui design system
- **API Clients** - Use enhanced @repo/api-client
- **State Management** - Consolidate Redux slices
- **Testing Utils** - Standardize testing patterns

## Success Metrics & KPIs

### 📊 **Technical Metrics**
- **Bundle Size** - Reduce by 20% through optimization
- **Performance** - Maintain <3s initial load time
- **Test Coverage** - Achieve 90%+ coverage
- **Accessibility** - 100% WCAG 2.1 AA compliance

### 👥 **User Experience Metrics**
- **Page Load Time** - <2s for all migrated pages
- **Mobile Performance** - 90+ Lighthouse mobile score
- **User Satisfaction** - Maintain current UX quality
- **Feature Parity** - 100% feature compatibility

## Next Steps

1. **Complete Migration Analysis** ✅
2. **Create UX Implementation Guidelines** (In Progress)
3. **Validate Requirements & Acceptance Criteria** (In Progress)
4. **Begin Navigation System Implementation**
5. **Implement Layout System Integration**
6. **Start Page-by-Page Migration**

---

**Migration Analysis Complete** - Ready for Sprint 1 execution with detailed component inventory, risk assessment, and technical standards defined.
