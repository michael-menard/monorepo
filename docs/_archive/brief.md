# Project Brief: LEGO MOC Instructions Frontend Modular Architecture

## Executive Summary

**Project:** LEGO MOC Instructions Frontend Modular Architecture

**Concept:** Transform the existing monolithic React frontend into a modular micro-apps architecture with a shell pattern, where `main-app` provides layout, auth, and navigation while domain-specific features live in separate apps (Gallery, Wishlist, Instructions, Profile).

**Primary Problem:** The current monolithic frontend has domain code mixed throughout, making it difficult to maintain, test, and scale. Previous migration attempts failed due to poor code quality and not following established coding standards.

**Target Users:** LEGO enthusiasts (AFOLs) who purchase and organize MOC instructions.

**Value Proposition:** A clean, maintainable, modular architecture that enables independent development of features while maintaining a seamless user experience with the LEGO-inspired design system.

---

## Problem Statement

### Current State & Pain Points

The LEGO MOC Instructions App exists as a monolithic React application where:

- Domain-specific code (Gallery, Wishlist, Instructions, Dashboard) is intertwined within a single `main-app`
- Feature boundaries are unclear, making code navigation and maintenance difficult
- Changes to one domain can unexpectedly affect others
- Testing is complicated due to tight coupling between features

### Previous Migration Failure

A prior attempt to modularize the frontend failed because:

- Generated code did not follow `.bmad-coding-style.md` standards
- No proper use of Zod schemas for validation
- Incorrect import patterns (not using `@repo/ui`, `@repo/logger`)
- Poor visual quality - code "looked terrible"
- The work was partially completed, leaving the codebase in an inconsistent state

### Critical Architecture Clarification

**Each domain feature MUST be a standalone React application in `apps/web/`, NOT a shared package in `packages/`.**

| Location    | Purpose                                                                   | Examples                                                                     |
| ----------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/web/` | **Standalone React apps** - Each domain is its own deployable application | `main-app`, `gallery-app`, `wishlist-app`, `instructions-app`, `profile-app` |
| `packages/` | **Shared libraries only** - Reusable code consumed by multiple apps       | `@repo/ui`, `@repo/logger`, `@repo/utils`, `@repo/api`                       |

This distinction is critical:

- ✅ `apps/web/gallery-app/` → Standalone app with its own routes, pages, entry point
- ❌ `packages/gallery/` → Wrong! This would be a shared library, not an app

### Impact

- **Developer Productivity:** Difficulty onboarding, slower feature development
- **Code Quality:** Accumulated technical debt, inconsistent patterns
- **Scalability:** Hard to add new features without affecting existing ones
- **Maintainability:** Bug fixes risk introducing regressions

### Why Now?

The UX design work is complete (`docs/ux-design/`, `docs/front-end-spec/`), providing clear specifications. Coding standards are documented (`.bmad-coding-style.md`). The foundation exists—we need a clean implementation that respects these artifacts.

---

## Proposed Solution

### Core Concept: Shell + Domain Apps Architecture

Transform the frontend into a **modular micro-apps architecture** where:

**`main-app` (Shell)** - The application shell that provides:

- Layout components (AppBar, Sidebar, Footer, Main Content Area)
- Authentication (AWS Amplify integration, auth context)
- Global navigation and routing
- Cross-app communication infrastructure

**Domain Apps** - Standalone React applications in `apps/web/`:

| App                | Route             | Responsibility                                       |
| ------------------ | ----------------- | ---------------------------------------------------- |
| `gallery-app`      | `/gallery/*`      | Browse, search, filter MOC gallery, view MOC details |
| `wishlist-app`     | `/wishlist/*`     | User wishlists, saved MOCs, wishlist management      |
| `instructions-app` | `/instructions/*` | Create, edit, view step-by-step instructions         |
| `profile-app`      | `/profile/*`      | User profile, settings, account management           |

### Key Differentiators from Previous Attempt

| Aspect       | Previous (Failed)               | New Approach                              |
| ------------ | ------------------------------- | ----------------------------------------- |
| Code Quality | Ignored `.bmad-coding-style.md` | Strict adherence to coding standards      |
| Validation   | TypeScript interfaces only      | Zod schemas with `z.infer<>`              |
| Imports      | Random import patterns          | `@repo/ui`, `@repo/logger` exclusively    |
| Components   | Custom styling                  | shadcn/ui from `@repo/ui` package         |
| Structure    | Inconsistent                    | Follow UX specs in `docs/front-end-spec/` |

### Why This Will Succeed

1. **Clear specifications exist** - UX design and front-end spec are complete
2. **Coding standards documented** - `.bmad-coding-style.md` provides explicit rules
3. **Incremental approach** - Build one domain app at a time, validate before proceeding
4. **Shell-first** - Establish the shell pattern correctly before extracting domains

---

## Target Users

### Primary User Segment: LEGO Enthusiast Buyer (AFOL)

**Profile:**

- Adult fans of LEGO who purchase custom MOCs (My Own Creations)
- Technically comfortable with web applications
- Value high-quality imagery and detailed documentation
- Looking for unique builds not available in official LEGO sets

**Current Behaviors:**

- Browse galleries to discover interesting MOC designs
- Research builds before purchasing instructions
- Search purchased MOCs by keywords (theme or meta tags)
- Maintain wishlists of builds they want to buy/build

**Needs & Pain Points:**

- Need a central place to upload MOC instructions with images, instruction documents, and parts list documents
- Easy search functionality to locate purchased MOC directions
- Simple wishlist to track builds of interest—this may include MOCs, LEGO sets, or alt brick sets

**Goals:**

- Find unique MOC builds in their collection
- Download previously uploaded instructions and part lists
- Organize potential purchases for later

### Collection & Usage Details

**Collection Size:**

- Varies widely (10 to 200+ MOCs)
- Must support small casual collectors and large power users equally
- Robust search/filtering essential for scalability

**Document Types per MOC:**

- **Images** - Cover photos, build progress, finished model
- **Instruction PDFs** - Step-by-step building instructions
- **Parts Lists** - BrickLink XML, CSV, JSON formats
- All files stored via existing AWS serverless backend (`apps/api`)

**Wishlist Items:**

- Simple tracking: name + link
- Can include: MOCs, official LEGO sets, alt brick sets
- Lightweight—not full product management

**Access Patterns:**

- **Desktop** - Primary for uploading, organizing, detailed browsing
- **Mobile** - Equally important for quick lookups (at LEGO store, conventions, building sessions)
- Responsive design is critical, not an afterthought

---

## Goals & Success Metrics

### Business Objectives

- **Complete modular architecture migration** - Transform monolithic `main-app` into shell + domain apps within defined timeline
- **Zero functionality regression** - All existing features work identically after migration
- **100% coding standards compliance** - All code follows `.bmad-coding-style.md` (Zod schemas, @repo/ui, @repo/logger, etc.)
- **Maintainable codebase** - Clear domain boundaries enable independent feature development

### User Success Metrics

- **Collection Management** - Users can upload, organize, and retrieve MOC instructions without friction
- **Search Efficiency** - Users can find any MOC in their collection within 10 seconds
- **Cross-Device Experience** - Seamless experience on both desktop and mobile
- **Wishlist Utility** - Users can quickly add/remove items and access saved links

### Key Performance Indicators (KPIs)

| KPI              | Definition                                 | Target                      |
| ---------------- | ------------------------------------------ | --------------------------- |
| Build Success    | All apps build without errors              | 100%                        |
| Type Safety      | TypeScript strict mode, no `any` abuse     | 100% compliance             |
| Test Coverage    | Unit test coverage across apps             | ≥45% (per coding standards) |
| Lighthouse Score | Performance, accessibility, best practices | ≥90 mobile, ≥95 desktop     |
| Bundle Size      | Individual app bundle sizes                | <500KB initial load per app |
| Code Standards   | Adherence to `.bmad-coding-style.md`       | 100% compliance             |

---

## MVP Scope

### Core Features (Must Have)

**Shell App (`main-app`):**

- **Layout Shell** - AppBar, Sidebar, Footer, Main Content Area
- **Authentication** - AWS Amplify integration, login/logout, auth context
- **Global Navigation** - Route to all domain apps, active state indicators
- **Responsive Layout** - Works on desktop and mobile equally well

**Gallery App (`gallery-app`):**

- **Collection Grid View** - Display user's uploaded MOCs with cover images
- **Search & Filter** - Keyword search, filter by tags/themes
- **MOC Detail View** - View single MOC with all associated files
- **Download Files** - Download instructions, parts lists from detail view

**Wishlist App (`wishlist-app`):**

- **Wishlist Management** - Add, view, remove wishlist items
- **Item Types** - Support MOCs, LEGO sets, alt brick sets
- **Simple Display** - Name + link for each item
- **Quick Add** - Easy way to add new items

**Instructions App (`instructions-app`):**

- **Upload MOC** - Upload images, PDFs, parts lists (XML, CSV, JSON)
- **Edit MOC Metadata** - Title, description, tags, theme
- **File Management** - View, replace, delete associated files
- **Integration with Backend** - Connect to existing `apps/api` AWS serverless

**Profile App (`profile-app`):**

- **User Profile View** - Basic user information display
- **Account Settings** - Manage account preferences
- **Activity Summary** - Overview of collection stats

### Out of Scope for MVP

- Public gallery/marketplace features (sharing with other users)
- Social features (comments, likes, follows)
- Advanced analytics/reporting
- Bulk import tools
- Price tracking for wishlist items
- Notification system
- Offline mode/PWA features
- Multi-language support

### MVP Success Criteria

The MVP is successful when:

1. All five apps (`main-app`, `gallery-app`, `wishlist-app`, `instructions-app`, `profile-app`) build and run independently
2. Shell correctly renders each domain app within its layout
3. All existing functionality from monolithic app works in new architecture
4. 100% compliance with `.bmad-coding-style.md`
5. Mobile and desktop experiences are equally functional
6. All apps connect to existing `apps/api` backend successfully

---

## Post-MVP Vision

### Phase 2 Features

After the architecture migration is complete and stable:

- **Bulk Import** - Import multiple MOCs at once from folder/zip
- **Advanced Search** - Filter by part count, difficulty, designer, date added
- **Collection Statistics** - Total MOCs, parts across collection, theme breakdown
- **Wishlist Enhancements** - Price field, priority ranking, purchase date tracking
- **Tag Management** - Create, merge, rename custom tags across collection
- **Improved File Preview** - In-app PDF viewer, image galleries with zoom

### Long-term Vision (6-12 months)

- **AI-Powered Features:**
  - Auto-tagging MOCs from images
  - Smart search (natural language queries)
  - Part recognition from photos

- **Enhanced Mobile Experience:**
  - PWA with offline access to collection
  - Camera integration for quick MOC photo capture
  - Barcode scanning for LEGO sets

- **Build Planning:**
  - Part inventory tracking (what you own)
  - "Can I build this?" checker against inventory
  - Shopping list generation for missing parts

### Expansion Opportunities

- **Community Features** - Optional sharing, public profiles, MOC discovery
- **Integration Ecosystem** - BrickLink, Rebrickable, BrickOwl API connections
- **Multi-Platform** - Native mobile apps (React Native) sharing codebase
- **Collaboration** - Shared collections, family accounts

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Web (SPA), responsive for all devices
- **Browser Support:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- **Performance Requirements:**
  - First Contentful Paint: <1.5s
  - Time to Interactive: <3s
  - Lighthouse Performance Score: ≥90 mobile, ≥95 desktop

### Technology Stack (Existing)

| Layer                  | Technology                     | Notes                             |
| ---------------------- | ------------------------------ | --------------------------------- |
| **Frontend Framework** | React 19                       | Latest with concurrent features   |
| **Routing**            | TanStack Router                | Type-safe routing                 |
| **State Management**   | Redux Toolkit + RTK Query      | Global state + API caching        |
| **Validation**         | Zod                            | Schema validation, type inference |
| **Styling**            | Tailwind CSS 4                 | Utility-first                     |
| **Components**         | shadcn/ui (`@repo/ui`)         | Component library                 |
| **Icons**              | Lucide React                   | Consistent, accessible icons      |
| **Logging**            | `@repo/logger`                 | Centralized logging               |
| **Build**              | Vite 6                         | Fast dev server, optimized builds |
| **Testing**            | Vitest + React Testing Library | Unit + integration tests          |
| **Monorepo**           | Turborepo + pnpm               | Workspace management              |
| **Auth**               | AWS Amplify                    | Authentication                    |
| **Backend**            | `apps/api`                     | Existing AWS serverless API       |

### Repository Structure

```
apps/
├── api/                    # Existing backend (AWS serverless)
└── web/
    ├── main-app/           # Shell: Layout, Auth, Navigation
    ├── gallery-app/        # Domain: Collection browsing
    ├── wishlist-app/       # Domain: Wishlist management
    ├── instructions-app/   # Domain: MOC upload/management
    └── profile-app/        # Domain: User settings
packages/
├── ui/                     # @repo/ui - shadcn components
├── logger/                 # @repo/logger - centralized logging
├── utils/                  # @repo/utils - shared utilities
└── api/                    # @repo/api - API client/types
docs/
├── ux-design/              # Design system specs (MUST follow)
└── front-end-spec/         # UI/UX specifications (MUST follow)
```

### Design System Integration

**All apps MUST implement the LEGO-inspired design system documented in:**

- `docs/ux-design/ux-migration-design-system.md` - Component specs, interactions
- `docs/front-end-spec/branding-style-guide.md` - Colors, typography, spacing

**Key Design Principles:**

- LEGO-Inspired Modularity: Components snap together like LEGO bricks
- Playful Professionalism: Serious functionality with delightful interactions
- Builder-Centric: Optimized for creators and builders
- Accessibility First: WCAG 2.1 AA compliance throughout

**Color Palette (LEGO MOC Semantic):**

- Primary: Vibrant Teal `hsl(178, 79%, 32%)`
- Secondary: Warm Cream `hsl(45, 67%, 90%)`
- Accents: LEGO Red, Yellow, Blue, Green

**Spacing System (LEGO Grid - 8px base):**

- `--space-1`: 8px (LEGO stud)
- `--space-2`: 16px (2 studs)
- `--space-4`: 32px (4 studs)

**Micro-Interactions:**

- LEGO Snap Animation for form submissions
- Brick Stack Loading states
- Stud Hover Effects on buttons
- Modular page transitions

### Shell-to-Domain Communication

**Pattern:** Redux shared store across all apps

- Shell creates and exports the Redux store (single store file)
- Domain apps receive store via Provider (no store creation)
- Domain apps can add their own slices for domain-specific state
- Shared slices: `auth`, `theme`, `globalUI`

### Routing Strategy

**Pattern:** Nested routers - each domain app has its own TanStack Router

- Shell router handles top-level routing and lazy loads domain apps
- Each domain app has its own complete router for internal navigation
- Domain routers are scoped to their route prefix

### Domain App Integration

**Pattern:** Dynamic imports with React.lazy()

- Each domain app is lazy-loaded on first route access
- Loading fallback uses LEGO brick building animation
- Domain apps render within shell layout

### API Client Configuration

**Pattern:** Each domain app defines its own RTK Query endpoints

- Each app owns its API slice (domain isolation)
- Shared base query config from `@repo/api` (auth headers, base URL)
- Domain-specific caching and invalidation strategies

### Deployment Model

**Pattern:** Monolith bundle with code splitting

- Single deployable artifact containing all apps
- Vite code splitting at route boundaries
- Domain apps lazy-loaded on first access
- Shared chunks for common dependencies (`@repo/ui`, React, Redux)

### Build & Dev Experience

**Pattern:** Turborepo orchestrated development

- `pnpm dev` starts all apps
- Turborepo handles dependency graph, parallel execution, caching, watch mode

### Security/Compliance

- AWS Amplify handles authentication
- API calls authenticated via Amplify tokens
- No sensitive data stored in frontend state
- Auth state managed in shell, propagated to domain apps

---

## Constraints & Assumptions

### Constraints

**Budget:**

- Solo developer project (AI-assisted)
- No external design or development resources
- Existing infrastructure (AWS serverless) already provisioned

**Timeline:**

- No hard deadline, but incremental progress expected
- Each domain app should be completable in focused sessions
- Quality over speed (previous rush led to poor implementation)

**Resources:**

- Single developer with AI assistance (BMad workflow)
- Existing backend API (`apps/api`) - no backend changes required
- Existing shared packages (`@repo/ui`, `@repo/logger`, etc.)

**Technical:**

- Must use existing tech stack (React 19, TanStack Router, RTK, etc.)
- Must follow `.bmad-coding-style.md` standards strictly
- Must implement design system from `docs/ux-design/`
- Must maintain mobile + desktop parity
- Must integrate with existing AWS Amplify auth

### Key Assumptions

- **Backend API is stable** - `apps/api` endpoints are complete and won't change significantly during frontend migration
- **Design system is finalized** - UX specs in `docs/ux-design/` and `docs/front-end-spec/` are the source of truth
- **Coding standards are non-negotiable** - `.bmad-coding-style.md` compliance is mandatory, not optional
- **Shared packages work** - `@repo/ui`, `@repo/logger` are functional and don't need modification
- **Monorepo tooling is stable** - Turborepo, pnpm workspace configuration is correct
- **No new features during migration** - Focus is on architecture transformation, not adding functionality
- **Incremental delivery is acceptable** - Apps can be built one at a time; not all needed simultaneously

---

## Risks & Open Questions

### Key Risks

| Risk                                        | Impact | Likelihood | Mitigation                                                               |
| ------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------ |
| **AI generates non-compliant code (again)** | High   | Medium     | Strict adherence to coding standards checklist before accepting any code |
| **Shell-to-domain integration complexity**  | Medium | Medium     | Build shell + one domain app first to validate pattern before scaling    |
| **Redux store sharing issues**              | Medium | Low        | Clear documentation of which slices are shared vs domain-specific        |
| **Routing conflicts between apps**          | Medium | Low        | Well-defined route prefixes, test navigation thoroughly                  |
| **Design system interpretation drift**      | Medium | Medium     | Reference `docs/ux-design/` for every component, visual review           |
| **Backend API changes mid-migration**       | High   | Low        | Assume API is stable per constraints; isolate API calls in each domain   |
| **Scope creep into new features**           | Medium | Medium     | Strict adherence to MVP scope; defer all enhancements                    |
| **Mobile experience neglected**             | Medium | Medium     | Test mobile at every step, not as an afterthought                        |

### Open Questions

- **Authentication flow:** How exactly does the shell pass auth context to lazy-loaded domain apps?
- **Deep linking:** If a user navigates directly to `/gallery/123`, does the shell load first, then lazy-load gallery-app correctly?
- **Error boundaries:** Should each domain app have its own error boundary, or one global in the shell?
- **Shared component customization:** If a domain app needs a variant of a `@repo/ui` component, where does that live?
- **Testing strategy:** Unit tests per app, or integration tests across shell + domains?

### Areas Needing Further Research

- **TanStack Router nested routing patterns** - Verify best practices for shell + domain app router composition
- **RTK Query code splitting** - How to properly inject domain-specific API slices into shared store
- **Vite build optimization** - Ensure lazy-loaded chunks are properly split and cached
- **AWS Amplify + Redux integration** - Patterns for syncing auth state between Amplify and Redux

---

## Appendices

### A. Reference Documents

| Document                         | Location                                                     | Purpose                                                      |
| -------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **UX Migration Design System**   | `docs/ux-design/ux-migration-design-system.md`               | LEGO-inspired component specs, colors, spacing, interactions |
| **UX Page Designs**              | `docs/ux-design/ux-page-designs.md`                          | Specific page layouts and wireframes                         |
| **UX Implementation Guidelines** | `docs/ux-design/ux-implementation-guidelines.md`             | How to implement the design system                           |
| **User Research & Personas**     | `docs/ux-design/user-research-and-personas.md`               | Detailed user personas                                       |
| **Front-End Spec Index**         | `docs/front-end-spec/index.md`                               | Complete UI/UX specification                                 |
| **Information Architecture**     | `docs/front-end-spec/information-architecture-ia.md`         | Site map, navigation structure                               |
| **User Flows**                   | `docs/front-end-spec/user-flows.md`                          | Key user journeys                                            |
| **Component Library**            | `docs/front-end-spec/component-library-design-system.md`     | Core component definitions                                   |
| **Branding & Style Guide**       | `docs/front-end-spec/branding-style-guide.md`                | Colors, typography, icons                                    |
| **Accessibility Requirements**   | `docs/front-end-spec/accessibility-requirements.md`          | WCAG compliance requirements                                 |
| **Responsiveness Strategy**      | `docs/front-end-spec/responsiveness-strategy.md`             | Breakpoints, mobile patterns                                 |
| **Coding Standards**             | `.bmad-coding-style.md`                                      | Mandatory code style rules                                   |
| **Migration Strategy**           | `docs/architecture/migration-strategy-shell-architecture.md` | Original architecture plan (reference)                       |

### B. Existing Codebase Assets

| Asset               | Location             | Status                         |
| ------------------- | -------------------- | ------------------------------ |
| Backend API         | `apps/api/`          | ✅ Complete - AWS serverless   |
| Main App (monolith) | `apps/web/main-app/` | 🔄 To be refactored into shell |
| UI Components       | `packages/ui/`       | ✅ Complete - @repo/ui         |
| Logger              | `packages/logger/`   | ✅ Complete - @repo/logger     |
| Shared Utils        | `packages/utils/`    | ✅ Complete - @repo/utils      |

---

## Next Steps

### Immediate Actions

1. **Review and approve this Project Brief** - Ensure all details are accurate before proceeding
2. **Create PRD from Brief** - Hand off to PM agent to expand into detailed Product Requirements Document
3. **Architecture validation** - Architect agent reviews and validates technical approach
4. **Story creation** - SM agent creates implementation stories from PRD
5. **Begin implementation** - Dev agent implements stories following coding standards

### PM Handoff

This Project Brief provides the full context for the **LEGO MOC Instructions Frontend Modular Architecture Migration**.

**Key Points for PRD Creation:**

- This is a **rebuild from scratch** following proper architecture, not a migration of existing code
- **Five standalone apps** in `apps/web/`: `main-app` (shell), `gallery-app`, `wishlist-app`, `instructions-app`, `profile-app`
- **Strict coding standards** - `.bmad-coding-style.md` is non-negotiable
- **Design system compliance** - `docs/ux-design/` and `docs/front-end-spec/` are the source of truth
- **Mobile + Desktop parity** - Both equally important
- **Existing backend** - `apps/api` is complete, frontend consumes it
- **Previous attempt failed** due to poor code quality; this attempt must not repeat that mistake

**Recommended PRD Structure:**

1. Shell App (`main-app`) - Layout, Auth, Navigation
2. Gallery App - Collection browsing, search, detail view
3. Wishlist App - Wishlist management
4. Instructions App - Upload, edit, file management
5. Profile App - User settings
