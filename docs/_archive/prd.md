# LEGO MOC Instructions Frontend Modular Architecture PRD

## Document Info

| Field       | Value                      |
| ----------- | -------------------------- |
| **Project** | LEGO MOC Instructions App  |
| **Type**    | Brownfield Enhancement PRD |
| **Version** | 1.0                        |
| **Created** | 2025-11-28                 |
| **Author**  | John (PM Agent)            |
| **Source**  | `docs/brief.md`            |

---

## 1. Introduction & Project Analysis

### 1.1 Analysis Source

- **Project Brief:** `docs/brief.md` (completed)
- **IDE-based analysis:** Full codebase access
- **Existing Documentation:** `docs/ux-design/`, `docs/front-end-spec/`, `.bmad-coding-style.md`

### 1.2 Current Project State

The LEGO MOC Instructions App is a personal library/organizer for LEGO enthusiasts (AFOLs) who purchase MOC instructions from external sources. Current state:

- **Monolithic React frontend** in `apps/web/main-app/`
- **Complete backend API** in `apps/api/` (AWS serverless)
- **Shared packages:** `@repo/ui`, `@repo/logger`, `@repo/utils`
- **Comprehensive UX documentation** ready for implementation
- **Previous migration attempt** removed due to poor code quality

### 1.3 Enhancement Scope

**Enhancement Type:** UI/UX Overhaul + Major Architecture Transformation

**Description:** Transform the existing monolithic `main-app` into a shell + domain apps architecture where `main-app` becomes the application shell (layout, auth, navigation) and domain features are standalone apps in `apps/web/`.

**Impact Assessment:** Major Impact (architectural changes required)

### 1.4 Goals

- Establish clean shell + domain app architecture pattern
- Achieve 100% compliance with `.bmad-coding-style.md`
- Implement LEGO-inspired design system from `docs/ux-design/`
- Maintain mobile + desktop parity throughout
- Enable independent development of domain features
- All existing functionality works in new architecture

### 1.5 Background Context

This enhancement is needed because the current monolithic frontend has domain code intertwined, making maintenance difficult. A previous migration attempt failed due to poor code quality (not following coding standards, no Zod schemas, incorrect imports). This fresh start with comprehensive planning ensures the architecture is implemented correctly.

### 1.6 Change Log

| Change      | Date       | Version | Description                     | Author    |
| ----------- | ---------- | ------- | ------------------------------- | --------- |
| Initial PRD | 2025-11-28 | 1.0     | Initial brownfield PRD creation | John (PM) |

---

## 2. Requirements

### 2.1 App Structure

**6 Apps (1 Shell + 5 Domain Apps):**

| App                | Route               | Purpose                                     |
| ------------------ | ------------------- | ------------------------------------------- |
| `main-app`         | -                   | Shell: Layout, Auth, Navigation, Middleware |
| `dashboard-app`    | `/` or `/dashboard` | Landing page with stats and quick actions   |
| `gallery-app`      | `/gallery/*`        | Browse, search, view MOC collection         |
| `wishlist-app`     | `/wishlist/*`       | Manage wishlist items                       |
| `instructions-app` | `/instructions/*`   | Upload, edit, manage MOCs and files         |
| `settings-app`     | `/settings/*`       | User preferences and account settings       |

### 2.2 Functional Requirements

#### Shell App (`main-app`)

**Layout & Structure:**

- FR1: Shell SHALL render AppBar with logo, global search input, user menu, theme toggle
- FR2: Shell SHALL render collapsible Sidebar with navigation links to all domain apps
- FR3: Shell SHALL render Footer with copyright and version info
- FR4: Shell SHALL render Main Content Area where domain apps are mounted
- FR5: Shell SHALL implement responsive breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- FR6: Sidebar SHALL collapse to hamburger menu on mobile
- FR7: Shell SHALL display LEGO brick building loading animation when lazy-loading domain apps

**Authentication:**

- FR8: Shell SHALL integrate AWS Amplify Auth for login/logout flows
- FR9: Shell SHALL redirect unauthenticated users to login page
- FR10: Shell SHALL store authenticated user info in Redux `auth` slice
- FR11: Shell SHALL handle token refresh automatically via Amplify
- FR12: Shell SHALL display user avatar and name in AppBar when authenticated
- FR13: Shell SHALL provide logout functionality that clears auth state

**Auth Middleware:**

- FR14: Shell SHALL validate JWT on every route navigation
- FR15: Shell SHALL check JWT expiry and trigger refresh when needed
- FR16: Shell SHALL redirect to login on invalid/expired tokens
- FR17: Shell SHALL verify user has permission to access requested route

**Routing & Navigation:**

- FR18: Shell SHALL use TanStack Router for top-level routing
- FR19: Shell SHALL lazy-load domain apps via React.lazy() at route boundaries
- FR20: Shell SHALL define route prefixes: `/`, `/gallery/*`, `/wishlist/*`, `/instructions/*`, `/settings/*`
- FR21: Shell SHALL highlight active navigation item based on current route
- FR22: Shell SHALL support deep linking
- FR23: Shell SHALL render 404 page for unknown routes

**Page Transitions:**

- FR24: Shell SHALL track navigation loading state globally
- FR25: Shell SHALL show transition spinner if navigation takes >300ms
- FR26: Shell SHALL hide spinner and render page when route loads

**State Management:**

- FR27: Shell SHALL create and provide Redux store to all domain apps
- FR28: Shell SHALL maintain shared slices: `auth`, `theme`, `globalUI`
- FR29: Shell SHALL persist theme preference to localStorage
- FR30: Shell SHALL expose store configuration for domain apps to inject slices

#### Dashboard App (`dashboard-app`)

- FR31: Dashboard SHALL be the default landing page after login
- FR32: Dashboard SHALL display collection summary: total MOCs, total wishlist items
- FR33: Dashboard SHALL display theme breakdown (top themes with counts)
- FR34: Dashboard SHALL display recently added MOCs (last 5-10) with thumbnails
- FR35: Dashboard SHALL provide quick actions: Add New MOC, Browse Gallery, View Wishlist
- FR36: Dashboard SHALL define RTK Query `dashboardApi` slice

#### Gallery App (`gallery-app`)

**Collection View:**

- FR37: Gallery SHALL display MOCs in responsive grid (1/2/3/4 columns by breakpoint)
- FR38: Gallery grid cards SHALL show: cover image, title, tag pills, piece count
- FR39: Gallery SHALL implement infinite scroll or pagination
- FR40: Gallery SHALL display empty state with CTA when collection is empty
- FR41: Gallery SHALL show total MOC count in header

**Search & Filter:**

- FR42: Gallery SHALL provide search input that filters by title, description, tags
- FR43: Gallery search SHALL debounce input (300ms)
- FR44: Gallery SHALL provide tag filter dropdown/pills
- FR45: Gallery SHALL provide theme filter dropdown
- FR46: Gallery SHALL display "No results" state when search returns empty
- FR47: Gallery SHALL preserve search/filter state in URL params

**MOC Detail View:**

- FR48: Gallery detail SHALL display full MOC info: title, description, tags, theme, dates
- FR49: Gallery detail SHALL display image gallery with thumbnail strip and main image
- FR50: Gallery detail SHALL support image zoom/lightbox
- FR51: Gallery detail SHALL list instruction PDFs with download buttons
- FR52: Gallery detail SHALL list parts lists with format indicator and download
- FR53: Gallery detail SHALL provide "Edit" button linking to Instructions app
- FR54: Gallery detail SHALL display breadcrumb navigation
- FR55: Gallery SHALL define RTK Query `galleryApi` slice

#### Wishlist App (`wishlist-app`)

- FR56: Wishlist SHALL display all items in list or grid view (toggleable)
- FR57: Wishlist items SHALL show: name, external link, type badge, date added
- FR58: Wishlist SHALL group items by type (MOCs, LEGO Sets, Alt Brick Sets)
- FR59: Wishlist SHALL provide "Add Item" button opening add form/modal
- FR60: Add item form SHALL capture: name (required), URL (required), type (required)
- FR61: Wishlist item types SHALL be: MOC, LEGO Set, Alt Brick Set
- FR62: Wishlist SHALL validate URL format before saving
- FR63: Wishlist SHALL provide delete button per item with confirmation
- FR64: Wishlist external links SHALL open in new tab securely
- FR65: Wishlist SHALL provide edit functionality for existing items
- FR66: Wishlist SHALL define RTK Query `wishlistApi` slice

#### Instructions App (`instructions-app`)

**MOC Creation:**

- FR67: Instructions SHALL provide "Add New MOC" button/page
- FR68: New MOC form SHALL capture: title (required), description, theme, tags
- FR69: New MOC form SHALL allow uploading cover image (required)
- FR70: Instructions SHALL show upload progress indicator

**File Management:**

- FR71: Instructions SHALL allow uploading multiple images per MOC
- FR72: Instructions SHALL allow uploading multiple instruction PDFs
- FR73: Instructions SHALL allow uploading parts lists (BrickLink XML, CSV, JSON)
- FR74: Instructions SHALL validate file types before upload
- FR75: Instructions SHALL enforce max file size limits
- FR76: Instructions SHALL provide replace functionality for files
- FR77: Instructions SHALL provide delete functionality for files
- FR78: Instructions SHALL allow reordering images
- FR79: Instructions SHALL allow setting primary/cover image

**MOC Editing:**

- FR80: Instructions SHALL provide edit page for existing MOCs
- FR81: Edit page SHALL pre-populate all current MOC data
- FR82: Instructions SHALL provide "Delete MOC" with confirmation
- FR83: Instructions SHALL define RTK Query `instructionsApi` slice

#### Settings App (`settings-app`)

**Appearance:**

- FR84: Settings SHALL allow selecting theme: Light, Dark, System
- FR85: Settings SHALL allow selecting default gallery view density
- FR86: Theme changes SHALL apply immediately

**Account:**

- FR87: Settings SHALL display current user info (name, email, avatar)
- FR88: Settings SHALL allow updating display name
- FR89: Settings SHALL allow updating avatar

**Preferences:**

- FR90: Settings SHALL allow configuring default sort order for gallery
- FR91: Settings SHALL persist all preferences via API
- FR92: Settings SHALL define RTK Query `settingsApi` slice

---

## 3. User Interface Enhancement Goals

### 3.1 Design System Integration

All apps SHALL implement the **LEGO MOC Enhanced Design Language** documented in:

- `docs/ux-design/ux-migration-design-system.md` - Component specs, interactions
- `docs/ux-design/ux-page-designs.md` - Page layouts
- `docs/front-end-spec/branding-style-guide.md` - Colors, typography
- `docs/front-end-spec/component-library-design-system.md` - Core components

### 3.2 Design Foundation

| Aspect             | Specification                      |
| ------------------ | ---------------------------------- |
| **Component Base** | `@repo/ui` (shadcn/ui)             |
| **Styling**        | Tailwind CSS 4                     |
| **Grid System**    | 8px grid spacing (LEGO stud = 8px) |
| **Icons**          | Lucide React (exclusively)         |

### 3.3 Color Palette

| Token                | Value                | Usage                                  |
| -------------------- | -------------------- | -------------------------------------- |
| Primary              | `hsl(178, 79%, 32%)` | Vibrant Teal - buttons, links, accents |
| Secondary            | `hsl(45, 67%, 90%)`  | Warm Cream - backgrounds, cards        |
| Accent (LEGO Red)    | `hsl(4, 90%, 45%)`   | Emphasis, notifications                |
| Accent (LEGO Yellow) | `hsl(51, 100%, 50%)` | Highlights, badges                     |
| Accent (LEGO Blue)   | `hsl(213, 76%, 42%)` | Links, info states                     |

### 3.4 Typography

| Element        | Font            | Sizes                        |
| -------------- | --------------- | ---------------------------- |
| Headings       | Inter (Bold)    | H1: 32px, H2: 24px, H3: 20px |
| Body           | Inter (Regular) | 16px base, 14px small        |
| Code/Technical | JetBrains Mono  | 14px                         |

### 3.5 Micro-Interactions

| Interaction         | Description                               |
| ------------------- | ----------------------------------------- |
| LEGO Snap Animation | Click feedback with subtle "snap" motion  |
| Brick Stack Loading | Loading animation with stacking bricks    |
| Stud Hover Effects  | Buttons show subtle depth change on hover |

### 3.6 Responsive Breakpoints

| Breakpoint | Width      | Layout Behavior                                     |
| ---------- | ---------- | --------------------------------------------------- |
| Mobile     | <768px     | Single column, hamburger nav, stacked cards         |
| Tablet     | 768-1024px | Two columns, collapsible sidebar                    |
| Desktop    | >1024px    | Full layout, persistent sidebar, multi-column grids |

### 3.7 Accessibility

- WCAG 2.1 AA compliance required
- Minimum 4.5:1 contrast ratio for text
- Focus indicators on all interactive elements
- Keyboard navigation support throughout
- ARIA labels on interactive components
- 44px minimum touch target on mobile

---

## 4. Technical Constraints and Integration

### 4.1 Technology Stack

| Layer      | Technology                | Version        | Constraint                 |
| ---------- | ------------------------- | -------------- | -------------------------- |
| Language   | TypeScript                | 5.x            | Strict mode                |
| Framework  | React                     | 19.0.0         | Functional components only |
| Routing    | TanStack Router           | Latest         | Type-safe, file-based      |
| State      | Redux Toolkit + RTK Query | Latest         | Single store in shell      |
| Validation | Zod                       | Latest         | All props/forms            |
| Styling    | Tailwind CSS              | 4.x            | Design tokens              |
| Components | shadcn/ui                 | Via `@repo/ui` | No direct imports          |
| Icons      | Lucide React              | Latest         | Exclusive                  |
| Build      | Vite                      | 6.x            | Code splitting             |
| Testing    | Vitest + RTL              | Latest         | Min 45% coverage           |
| Monorepo   | Turborepo + pnpm          | Latest         | Workspace orchestration    |
| Auth       | AWS Amplify               | v6             | Cognito                    |
| Backend    | `apps/api`                | Existing       | AWS Lambda + API Gateway   |

### 4.2 Integration Strategy

**API Integration:**

- Each domain app defines its own RTK Query API slice
- Shared base query from `@repo/api` provides auth headers, error handling
- Domain apps inject endpoints at runtime via `injectEndpoints`

**Frontend Integration:**

- Shell creates Redux store with shared slices
- React.lazy() for code splitting at route boundaries
- Shared components via `@repo/ui` only

**Testing Integration:**

- Unit tests per component using Vitest + RTL
- API mocking via MSW (Mock Service Worker)
- Each app owns its test suite

### 4.3 File Structure

```
apps/web/{app-name}/
├── src/
│   ├── components/       # App-specific components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom hooks
│   ├── store/            # RTK Query API slice
│   ├── schemas/          # Zod schemas
│   ├── types/            # TypeScript types (from Zod)
│   ├── utils/            # App-specific utilities
│   └── index.tsx         # App entry point
├── tests/                # Test files
├── package.json
└── vite.config.ts
```

### 4.4 Coding Standards

Per `.bmad-coding-style.md`:

- No semicolons, single quotes, trailing commas
- 2-space indentation
- Functional components with `function` declarations
- Zod schemas for all props validation
- Named exports (no default exports)
- No barrel files
- Import from `@repo/ui` for shadcn components
- Import from `@repo/logger` instead of console.log

---

## 5. Epic Structure

### 5.1 Epic Overview

| Order     | Epic             | App                | Dependencies | Stories |
| --------- | ---------------- | ------------------ | ------------ | ------- |
| 1         | Shell App        | `main-app`         | None         | 35      |
| 2         | Dashboard App    | `dashboard-app`    | Epic 1       | 10      |
| 3         | Gallery App      | `gallery-app`      | Epic 1       | 26      |
| 4         | Instructions App | `instructions-app` | Epic 1       | 32      |
| 5         | Wishlist App     | `wishlist-app`     | Epic 1       | 23      |
| 6         | Settings App     | `settings-app`     | Epic 1       | 17      |
| **Total** |                  |                    |              | **143** |

### 5.2 Story Sizing

| Size | Description                        | Typical Effort |
| ---- | ---------------------------------- | -------------- |
| XS   | Trivial change, single file        | < 2 hours      |
| S    | Small feature, few files           | 2-4 hours      |
| M    | Medium feature, multiple files     | 4-8 hours      |
| L    | Large feature, complex integration | 1-2 days       |

### 5.3 Story Type Indicators

| Indicator  | Meaning                                  |
| ---------- | ---------------------------------------- |
| 🖥️ FE Only | Frontend only, no backend changes needed |
| 🔄 FE+BE   | May require backend API/model changes    |

**Backend Coordination Note:** Stories marked 🔄 FE+BE should:

- Verify API endpoint exists and matches expected contract
- Coordinate backend changes first if endpoint missing/different
- Document any model/schema changes needed

---

## 6. Epic Details

### Epic 1: Shell App (`main-app`)

**Goal:** Establish the application shell with layout, auth, navigation, middleware, and state management.

**Dependencies:** None (foundation)

#### Project Setup (Stories 1.1-1.3)

| #   | Story                    | Description                                   | Size | Type |
| --- | ------------------------ | --------------------------------------------- | ---- | ---- |
| 1.1 | Project Scaffolding      | Create app folder, package.json, Vite config  | XS   | 🖥️   |
| 1.2 | Tailwind & Design Tokens | Configure Tailwind 4 with LEGO design tokens  | XS   | 🖥️   |
| 1.3 | ESLint & Prettier        | Configure linting per `.bmad-coding-style.md` | XS   | 🖥️   |

#### Redux Store (Stories 1.4-1.7)

| #   | Story            | Description                                              | Size | Type |
| --- | ---------------- | -------------------------------------------------------- | ---- | ---- |
| 1.4 | Redux Store Base | Create store with Redux Toolkit, DevTools                | S    | 🖥️   |
| 1.5 | Auth Slice       | Create `authSlice` with user state, selectors            | S    | 🖥️   |
| 1.6 | Theme Slice      | Create `themeSlice` with light/dark/system, localStorage | S    | 🖥️   |
| 1.7 | Global UI Slice  | Create `globalUISlice` for sidebar, loading flags        | XS   | 🖥️   |

#### Layout Components (Stories 1.8-1.12)

| #    | Story             | Description                                       | Size | Type |
| ---- | ----------------- | ------------------------------------------------- | ---- | ---- |
| 1.8  | AppBar Component  | Logo, search placeholder, user menu, theme toggle | S    | 🖥️   |
| 1.9  | Sidebar Component | Nav links, collapse/expand, active state          | S    | 🖥️   |
| 1.10 | Sidebar Mobile    | Hamburger menu, slide-out drawer                  | S    | 🖥️   |
| 1.11 | Footer Component  | Copyright, version info                           | XS   | 🖥️   |
| 1.12 | Main Layout       | Compose AppBar, Sidebar, Footer, content area     | S    | 🖥️   |

#### Authentication (Stories 1.13-1.17)

| #    | Story                 | Description                                    | Size | Type |
| ---- | --------------------- | ---------------------------------------------- | ---- | ---- |
| 1.13 | Amplify Configuration | Configure AWS Amplify with Cognito             | S    | 🖥️   |
| 1.14 | Login Page            | Login form with Zod validation, error handling | M    | 🔄   |
| 1.15 | Auth State Sync       | Sync Amplify auth to Redux, token refresh      | M    | 🖥️   |
| 1.16 | Protected Route       | HOC that redirects unauthenticated users       | S    | 🖥️   |
| 1.17 | Logout Flow           | Logout action, clear state, redirect           | S    | 🖥️   |

#### Router & Lazy Loading (Stories 1.18-1.19)

| #    | Story                 | Description                                  | Size | Type |
| ---- | --------------------- | -------------------------------------------- | ---- | ---- |
| 1.18 | TanStack Router Setup | Base router configuration, route definitions | S    | 🖥️   |
| 1.19 | Lazy Loading Setup    | React.lazy() wrapper for domain apps         | S    | 🖥️   |

#### Loading & Error States (Stories 1.20-1.23)

| #    | Story             | Description                               | Size | Type |
| ---- | ----------------- | ----------------------------------------- | ---- | ---- |
| 1.20 | Loading Animation | LEGO brick building animation component   | S    | 🖥️   |
| 1.21 | Error Boundary    | Global error boundary with retry, logging | S    | 🖥️   |
| 1.22 | 404 Page          | Not found page with navigation back       | XS   | 🖥️   |
| 1.23 | Toast System      | Toast notification component              | S    | 🖥️   |

#### Testing (Story 1.24)

| #    | Story            | Description                                  | Size | Type |
| ---- | ---------------- | -------------------------------------------- | ---- | ---- |
| 1.24 | Shell Unit Tests | Tests for components, slices (≥45% coverage) | M    | 🖥️   |

#### Auth Middleware (Stories 1.25-1.30)

| #    | Story                  | Description                                | Size | Type |
| ---- | ---------------------- | ------------------------------------------ | ---- | ---- |
| 1.25 | JWT Validation Utility | Decode and validate JWT, check expiry      | S    | 🖥️   |
| 1.26 | Auth Middleware Setup  | TanStack Router middleware infrastructure  | S    | 🖥️   |
| 1.27 | Route Permission Check | Middleware checks user can access route    | S    | 🔄   |
| 1.28 | Token Expiry Handling  | Detect expired JWT, trigger refresh/logout | S    | 🖥️   |
| 1.29 | Invalid Token Redirect | Redirect to login on invalid/missing JWT   | S    | 🖥️   |
| 1.30 | Auth Middleware Tests  | Unit tests for middleware logic            | S    | 🖥️   |

#### Page Transitions (Stories 1.31-1.35)

| #    | Story                      | Description                             | Size | Type |
| ---- | -------------------------- | --------------------------------------- | ---- | ---- |
| 1.31 | Navigation Loading State   | Track pending navigation in global UI   | S    | 🖥️   |
| 1.32 | Page Transition Spinner    | Loading indicator component             | S    | 🖥️   |
| 1.33 | Router Loading Integration | Wire TanStack Router pending to spinner | S    | 🖥️   |
| 1.34 | Transition Delay Threshold | Only show spinner if load >300ms        | XS   | 🖥️   |
| 1.35 | Page Transition Tests      | Tests for loading states                | S    | 🖥️   |

**Epic 1 Summary:** 35 stories (7 XS, 25 S, 3 M)

---

### Epic 2: Dashboard App (`dashboard-app`)

**Goal:** Create landing page with collection stats and quick actions; validate shell integration.

**Dependencies:** Epic 1 (Shell)

| #    | Story                   | Description                                       | Size | Type |
| ---- | ----------------------- | ------------------------------------------------- | ---- | ---- |
| 2.1  | Project Scaffolding     | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 2.2  | Dashboard API Slice     | Create `dashboardApi` RTK Query slice             | S    | 🔄   |
| 2.3  | Stats Endpoint          | GET /dashboard/stats endpoint integration         | S    | 🔄   |
| 2.4  | Recent MOCs Endpoint    | GET /dashboard/recent endpoint integration        | S    | 🔄   |
| 2.5  | Stats Cards             | Display total MOCs, wishlist items, themes        | S    | 🖥️   |
| 2.6  | Recent MOCs Grid        | Display last 5 MOCs with thumbnails               | S    | 🖥️   |
| 2.7  | Quick Actions           | Buttons linking to Add MOC, Gallery, Wishlist     | XS   | 🖥️   |
| 2.8  | Dashboard Empty State   | First-time user experience with CTAs              | S    | 🖥️   |
| 2.9  | Dashboard Loading State | Skeleton loaders for stats and MOCs               | XS   | 🖥️   |
| 2.10 | Dashboard Unit Tests    | Tests for components (≥45% coverage)              | S    | 🖥️   |

**Epic 2 Summary:** 10 stories (3 XS, 7 S)

---

### Epic 3: Gallery App (`gallery-app`)

**Goal:** Enable users to browse, search, and view their MOC collection.

**Dependencies:** Epic 1 (Shell)

#### Setup & API (Stories 3.1-3.4)

| #   | Story                  | Description                                       | Size | Type |
| --- | ---------------------- | ------------------------------------------------- | ---- | ---- |
| 3.1 | Project Scaffolding    | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 3.2 | Gallery API Slice      | Create `galleryApi` RTK Query slice               | S    | 🔄   |
| 3.3 | Get MOCs Endpoint      | GET /mocs with pagination support                 | S    | 🔄   |
| 3.4 | Get MOC by ID Endpoint | GET /mocs/:id for detail view                     | S    | 🔄   |

#### Collection Grid (Stories 3.5-3.7)

| #   | Story              | Description                               | Size | Type |
| --- | ------------------ | ----------------------------------------- | ---- | ---- |
| 3.5 | MOC Card Component | Card with image, title, tags, piece count | S    | 🖥️   |
| 3.6 | Collection Grid    | Responsive grid layout (1/2/3/4 columns)  | S    | 🖥️   |
| 3.7 | Infinite Scroll    | Load more MOCs on scroll                  | M    | 🖥️   |

#### Search & Filter (Stories 3.8-3.15)

| #    | Story                  | Description                             | Size | Type |
| ---- | ---------------------- | --------------------------------------- | ---- | ---- |
| 3.8  | Search Input           | Debounced search input component        | S    | 🖥️   |
| 3.9  | Search Integration     | Wire search to API, filter results      | S    | 🔄   |
| 3.10 | Tag Filter             | Dropdown/pills for filtering by tags    | S    | 🔄   |
| 3.11 | Theme Filter           | Dropdown for filtering by theme         | S    | 🔄   |
| 3.12 | URL State Sync         | Persist search/filters in URL params    | S    | 🖥️   |
| 3.13 | Clear Filters          | Button to reset all filters             | XS   | 🖥️   |
| 3.14 | No Results State       | Empty state when search returns nothing | XS   | 🖥️   |
| 3.15 | Collection Empty State | Empty state when no MOCs exist          | XS   | 🖥️   |

#### MOC Detail (Stories 3.16-3.24)

| #    | Story                   | Description                             | Size | Type |
| ---- | ----------------------- | --------------------------------------- | ---- | ---- |
| 3.16 | MOC Detail Page         | Route and layout for single MOC view    | S    | 🖥️   |
| 3.17 | MOC Detail Header       | Title, description, tags, theme, dates  | S    | 🖥️   |
| 3.18 | Image Thumbnail Strip   | Row of clickable thumbnails             | S    | 🖥️   |
| 3.19 | Main Image Display      | Large image view with selected image    | S    | 🖥️   |
| 3.20 | Image Lightbox          | Full-screen zoom/lightbox on click      | M    | 🖥️   |
| 3.21 | File List - PDFs        | List instruction PDFs with download     | S    | 🖥️   |
| 3.22 | File List - Parts Lists | List parts lists with format, download  | S    | 🖥️   |
| 3.23 | Edit MOC Link           | Button linking to Instructions app edit | XS   | 🖥️   |
| 3.24 | Breadcrumb Navigation   | Gallery > MOC Title breadcrumb          | XS   | 🖥️   |

#### Testing & Polish (Stories 3.25-3.26)

| #    | Story                  | Description                          | Size | Type |
| ---- | ---------------------- | ------------------------------------ | ---- | ---- |
| 3.25 | Gallery Loading States | Skeleton loaders for grid and detail | S    | 🖥️   |
| 3.26 | Gallery Unit Tests     | Tests for components (≥45% coverage) | M    | 🖥️   |

**Epic 3 Summary:** 26 stories (6 XS, 17 S, 3 M)

---

### Epic 4: Instructions App (`instructions-app`)

**Goal:** Enable users to upload, edit, and manage their MOCs and files.

**Dependencies:** Epic 1 (Shell)

#### Setup & API (Stories 4.1-4.7)

| #   | Story                  | Description                                       | Size | Type |
| --- | ---------------------- | ------------------------------------------------- | ---- | ---- |
| 4.1 | Project Scaffolding    | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 4.2 | Instructions API Slice | Create `instructionsApi` RTK Query slice          | S    | 🔄   |
| 4.3 | Create MOC Endpoint    | POST /mocs for creating new MOC                   | S    | 🔄   |
| 4.4 | Update MOC Endpoint    | PUT /mocs/:id for updating MOC                    | S    | 🔄   |
| 4.5 | Delete MOC Endpoint    | DELETE /mocs/:id with cascade delete              | S    | 🔄   |
| 4.6 | Upload File Endpoint   | POST /mocs/:id/files multipart upload             | M    | 🔄   |
| 4.7 | Delete File Endpoint   | DELETE /mocs/:id/files/:fileId                    | S    | 🔄   |

#### MOC Creation (Stories 4.8-4.15)

| #    | Story                   | Description                           | Size | Type |
| ---- | ----------------------- | ------------------------------------- | ---- | ---- |
| 4.8  | Add MOC Page            | Route and page layout for new MOC     | S    | 🖥️   |
| 4.9  | MOC Form - Basic Fields | Title, description inputs with Zod    | S    | 🖥️   |
| 4.10 | MOC Form - Theme Select | Theme dropdown with options           | S    | 🔄   |
| 4.11 | MOC Form - Tags Input   | Multi-select/input for tags           | S    | 🔄   |
| 4.12 | Cover Image Upload      | Single image upload for cover         | M    | 🖥️   |
| 4.13 | Image Upload Preview    | Preview uploaded image before save    | S    | 🖥️   |
| 4.14 | Upload Progress         | Progress bar during file uploads      | S    | 🖥️   |
| 4.15 | Save MOC (Create)       | Submit form, create MOC, show success | S    | 🖥️   |

#### MOC Editing (Stories 4.16-4.19)

| #    | Story             | Description                           | Size | Type |
| ---- | ----------------- | ------------------------------------- | ---- | ---- |
| 4.16 | Edit MOC Page     | Route and page layout for editing MOC | S    | 🖥️   |
| 4.17 | Prefill Edit Form | Load existing MOC data into form      | S    | 🖥️   |
| 4.18 | Save MOC (Update) | Submit changes, update MOC            | S    | 🖥️   |
| 4.19 | Delete MOC        | Delete button with confirmation modal | S    | 🖥️   |

#### File Management (Stories 4.20-4.31)

| #    | Story                       | Description                           | Size | Type |
| ---- | --------------------------- | ------------------------------------- | ---- | ---- |
| 4.20 | File Manager Section        | List all files for a MOC              | S    | 🖥️   |
| 4.21 | Upload Additional Images    | Add more images after creation        | S    | 🖥️   |
| 4.22 | Upload Instruction PDFs     | Upload PDF files for MOC              | S    | 🖥️   |
| 4.23 | Upload Parts Lists          | Upload XML/CSV/JSON parts lists       | S    | 🖥️   |
| 4.24 | File Type Validation        | Validate file types before upload     | S    | 🖥️   |
| 4.25 | File Size Validation        | Enforce max file size limits          | XS   | 🖥️   |
| 4.26 | Delete Individual File      | Remove single file with confirmation  | S    | 🖥️   |
| 4.27 | Replace File                | Replace existing file with new upload | S    | 🖥️   |
| 4.28 | Reorder Images              | Drag-drop or buttons to reorder       | M    | 🔄   |
| 4.29 | Set Cover Image             | Select which image is cover           | S    | 🔄   |
| 4.30 | Upload Error Handling       | Handle failures with retry option     | S    | 🖥️   |
| 4.31 | Instructions Loading States | Skeleton loaders, progress indicators | S    | 🖥️   |

#### Testing (Story 4.32)

| #    | Story                   | Description                          | Size | Type |
| ---- | ----------------------- | ------------------------------------ | ---- | ---- |
| 4.32 | Instructions Unit Tests | Tests for components (≥45% coverage) | M    | 🖥️   |

**Epic 4 Summary:** 32 stories (2 XS, 26 S, 4 M)

---

### Epic 5: Wishlist App (`wishlist-app`)

**Goal:** Enable users to manage their wishlist of MOCs, LEGO sets, and alt brick sets.

**Dependencies:** Epic 1 (Shell)

#### Setup & API (Stories 5.1-5.6)

| #   | Story                 | Description                                       | Size | Type |
| --- | --------------------- | ------------------------------------------------- | ---- | ---- |
| 5.1 | Project Scaffolding   | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 5.2 | Wishlist API Slice    | Create `wishlistApi` RTK Query slice              | S    | 🔄   |
| 5.3 | Get Wishlist Endpoint | GET /wishlist items                               | S    | 🔄   |
| 5.4 | Add Item Endpoint     | POST /wishlist item                               | S    | 🔄   |
| 5.5 | Update Item Endpoint  | PUT /wishlist/:id                                 | S    | 🔄   |
| 5.6 | Delete Item Endpoint  | DELETE /wishlist/:id                              | S    | 🔄   |

#### Display (Stories 5.7-5.11)

| #    | Story              | Description                            | Size | Type |
| ---- | ------------------ | -------------------------------------- | ---- | ---- |
| 5.7  | Wishlist Item Card | Card with name, link, type badge, date | S    | 🖥️   |
| 5.8  | Wishlist List View | Vertical list layout                   | S    | 🖥️   |
| 5.9  | Wishlist Grid View | Card grid layout                       | S    | 🖥️   |
| 5.10 | View Toggle        | Switch between list/grid views         | XS   | 🖥️   |
| 5.11 | Group by Type      | Collapsible sections for MOC/LEGO/Alt  | S    | 🖥️   |

#### Item Management (Stories 5.12-5.20)

| #    | Story                  | Description                     | Size | Type |
| ---- | ---------------------- | ------------------------------- | ---- | ---- |
| 5.12 | Add Item Button        | Button that opens add modal     | XS   | 🖥️   |
| 5.13 | Add Item Modal         | Modal with form fields          | S    | 🖥️   |
| 5.14 | Add Item Form          | Name, URL, type inputs with Zod | S    | 🖥️   |
| 5.15 | URL Validation         | Validate URL format             | XS   | 🖥️   |
| 5.16 | Save New Item          | Submit form, optimistic update  | S    | 🖥️   |
| 5.17 | Edit Item Modal        | Modal pre-filled with item data | S    | 🖥️   |
| 5.18 | Save Item Changes      | Submit edits, optimistic update | S    | 🖥️   |
| 5.19 | Delete Item            | Delete button with confirmation | S    | 🖥️   |
| 5.20 | External Link Handling | Open links in new tab securely  | XS   | 🖥️   |

#### States & Testing (Stories 5.21-5.23)

| #    | Story                  | Description                          | Size | Type |
| ---- | ---------------------- | ------------------------------------ | ---- | ---- |
| 5.21 | Wishlist Empty State   | Empty state with CTA                 | XS   | 🖥️   |
| 5.22 | Wishlist Loading State | Skeleton loaders                     | XS   | 🖥️   |
| 5.23 | Wishlist Unit Tests    | Tests for components (≥45% coverage) | S    | 🖥️   |

**Epic 5 Summary:** 23 stories (8 XS, 15 S)

---

### Epic 6: Settings App (`settings-app`)

**Goal:** Enable users to manage their preferences and account settings.

**Dependencies:** Epic 1 (Shell)

#### Setup & API (Stories 6.1-6.4)

| #   | Story                    | Description                                       | Size | Type |
| --- | ------------------------ | ------------------------------------------------- | ---- | ---- |
| 6.1 | Project Scaffolding      | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 6.2 | Settings API Slice       | Create `settingsApi` RTK Query slice              | S    | 🔄   |
| 6.3 | Get Settings Endpoint    | GET /settings for user preferences                | S    | 🔄   |
| 6.4 | Update Settings Endpoint | PUT /settings for saving preferences              | S    | 🔄   |

#### Appearance (Stories 6.5-6.8)

| #   | Story                | Description                         | Size | Type |
| --- | -------------------- | ----------------------------------- | ---- | ---- |
| 6.5 | Settings Page Layout | Page with sections for settings     | S    | 🖥️   |
| 6.6 | Appearance Section   | Section header and container        | XS   | 🖥️   |
| 6.7 | Theme Selector       | Light/Dark/System radio or dropdown | S    | 🖥️   |
| 6.8 | Gallery Density      | Grid size preference selector       | S    | 🖥️   |

#### Account (Stories 6.9-6.13)

| #    | Story             | Description                      | Size | Type |
| ---- | ----------------- | -------------------------------- | ---- | ---- |
| 6.9  | Account Section   | Section header and container     | XS   | 🖥️   |
| 6.10 | Display User Info | Show current name, email, avatar | S    | 🖥️   |
| 6.11 | Edit Display Name | Input to change display name     | S    | 🖥️   |
| 6.12 | Upload Avatar     | Image upload for avatar          | S    | 🔄   |
| 6.13 | Avatar Preview    | Preview before saving            | XS   | 🖥️   |

#### Save & Testing (Stories 6.14-6.17)

| #    | Story                     | Description                          | Size | Type |
| ---- | ------------------------- | ------------------------------------ | ---- | ---- |
| 6.14 | Save Settings             | Save button, persist to API          | S    | 🖥️   |
| 6.15 | Settings Success Feedback | Toast on successful save             | XS   | 🖥️   |
| 6.16 | Settings Loading State    | Skeleton while loading               | XS   | 🖥️   |
| 6.17 | Settings Unit Tests       | Tests for components (≥45% coverage) | S    | 🖥️   |

**Epic 6 Summary:** 17 stories (7 XS, 10 S)

---

## 7. Summary

### 7.1 Total Effort

| Epic      | App          | Stories | XS     | S       | M      | FE Only | FE+BE  |
| --------- | ------------ | ------- | ------ | ------- | ------ | ------- | ------ |
| 1         | Shell        | 35      | 7      | 25      | 3      | 33      | 2      |
| 2         | Dashboard    | 10      | 3      | 7       | 0      | 6       | 4      |
| 3         | Gallery      | 26      | 6      | 17      | 3      | 21      | 5      |
| 4         | Instructions | 32      | 2      | 26      | 4      | 22      | 10     |
| 5         | Wishlist     | 23      | 8      | 15      | 0      | 17      | 6      |
| 6         | Settings     | 17      | 7      | 10      | 0      | 13      | 4      |
| **Total** |              | **143** | **33** | **100** | **10** | **112** | **31** |

### 7.2 Implementation Order

1. **Epic 1 (Shell)** - Must complete first; establishes foundation
2. **Epic 2 (Dashboard)** - Validates shell integration pattern
3. **Epics 3-6** - Can be built in any order after shell
   - Recommended: Gallery → Instructions → Wishlist → Settings

### 7.3 Risk Areas

| Risk                        | Stories Affected        | Mitigation                                            |
| --------------------------- | ----------------------- | ----------------------------------------------------- |
| TanStack Router integration | 1.18, 1.19, 1.26, 1.33  | Build shell router first, validate before domain apps |
| RTK Query slice injection   | 2.2, 3.2, 4.2, 5.2, 6.2 | Follow official docs, test with Dashboard first       |
| File upload complexity      | 4.6, 4.12, 4.21-4.23    | Use established patterns, thorough error handling     |
| Backend API gaps            | All 🔄 FE+BE stories    | Verify endpoints early, coordinate changes            |

### 7.4 Success Criteria

- [ ] All 6 apps build and run successfully
- [ ] 100% compliance with `.bmad-coding-style.md`
- [ ] ≥45% test coverage per app
- [ ] All functional requirements (FR1-FR92) implemented
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Mobile and desktop parity
- [ ] Existing functionality preserved

---

## 8. Next Steps

1. **Validate PRD** - Review with stakeholders
2. **Architecture Review** - Validate technical approach
3. **Story Creation** - SM agent creates detailed stories from summaries
4. **Sprint Planning** - Prioritize and sequence stories
5. **Development** - Begin with Epic 1 (Shell)

---

_Document generated by PM Agent (John) using BMad Brownfield PRD Template_
