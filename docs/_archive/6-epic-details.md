# 6. Epic Details

## Epic 1: Shell App (`main-app`)

**Goal:** Establish the application shell with layout, auth, navigation, middleware, and state management.

**Dependencies:** None (foundation)

### Project Setup (Stories 1.1-1.3)

| #   | Story                    | Description                                   | Size | Type |
| --- | ------------------------ | --------------------------------------------- | ---- | ---- |
| 1.1 | Project Scaffolding      | Create app folder, package.json, Vite config  | XS   | 🖥️   |
| 1.2 | Tailwind & Design Tokens | Configure Tailwind 4 with LEGO design tokens  | XS   | 🖥️   |
| 1.3 | ESLint & Prettier        | Configure linting per `.bmad-coding-style.md` | XS   | 🖥️   |

### Redux Store (Stories 1.4-1.7)

| #   | Story            | Description                                              | Size | Type |
| --- | ---------------- | -------------------------------------------------------- | ---- | ---- |
| 1.4 | Redux Store Base | Create store with Redux Toolkit, DevTools                | S    | 🖥️   |
| 1.5 | Auth Slice       | Create `authSlice` with user state, selectors            | S    | 🖥️   |
| 1.6 | Theme Slice      | Create `themeSlice` with light/dark/system, localStorage | S    | 🖥️   |
| 1.7 | Global UI Slice  | Create `globalUISlice` for sidebar, loading flags        | XS   | 🖥️   |

### Layout Components (Stories 1.8-1.12)

| #    | Story             | Description                                       | Size | Type |
| ---- | ----------------- | ------------------------------------------------- | ---- | ---- |
| 1.8  | AppBar Component  | Logo, search placeholder, user menu, theme toggle | S    | 🖥️   |
| 1.9  | Sidebar Component | Nav links, collapse/expand, active state          | S    | 🖥️   |
| 1.10 | Sidebar Mobile    | Hamburger menu, slide-out drawer                  | S    | 🖥️   |
| 1.11 | Footer Component  | Copyright, version info                           | XS   | 🖥️   |
| 1.12 | Main Layout       | Compose AppBar, Sidebar, Footer, content area     | S    | 🖥️   |

### Authentication (Stories 1.13-1.17)

| #    | Story                 | Description                                    | Size | Type |
| ---- | --------------------- | ---------------------------------------------- | ---- | ---- |
| 1.13 | Amplify Configuration | Configure AWS Amplify with Cognito             | S    | 🖥️   |
| 1.14 | Login Page            | Login form with Zod validation, error handling | M    | 🔄   |
| 1.15 | Auth State Sync       | Sync Amplify auth to Redux, token refresh      | M    | 🖥️   |
| 1.16 | Protected Route       | HOC that redirects unauthenticated users       | S    | 🖥️   |
| 1.17 | Logout Flow           | Logout action, clear state, redirect           | S    | 🖥️   |

### Router & Lazy Loading (Stories 1.18-1.19)

| #    | Story                 | Description                                  | Size | Type |
| ---- | --------------------- | -------------------------------------------- | ---- | ---- |
| 1.18 | TanStack Router Setup | Base router configuration, route definitions | S    | 🖥️   |
| 1.19 | Lazy Loading Setup    | React.lazy() wrapper for domain apps         | S    | 🖥️   |

### Loading & Error States (Stories 1.20-1.23)

| #    | Story             | Description                               | Size | Type |
| ---- | ----------------- | ----------------------------------------- | ---- | ---- |
| 1.20 | Loading Animation | LEGO brick building animation component   | S    | 🖥️   |
| 1.21 | Error Boundary    | Global error boundary with retry, logging | S    | 🖥️   |
| 1.22 | 404 Page          | Not found page with navigation back       | XS   | 🖥️   |
| 1.23 | Toast System      | Toast notification component              | S    | 🖥️   |

### Testing (Story 1.24)

| #    | Story            | Description                                  | Size | Type |
| ---- | ---------------- | -------------------------------------------- | ---- | ---- |
| 1.24 | Shell Unit Tests | Tests for components, slices (≥45% coverage) | M    | 🖥️   |

### Auth Middleware (Stories 1.25-1.30)

| #    | Story                  | Description                                | Size | Type |
| ---- | ---------------------- | ------------------------------------------ | ---- | ---- |
| 1.25 | JWT Validation Utility | Decode and validate JWT, check expiry      | S    | 🖥️   |
| 1.26 | Auth Middleware Setup  | TanStack Router middleware infrastructure  | S    | 🖥️   |
| 1.27 | Route Permission Check | Middleware checks user can access route    | S    | 🔄   |
| 1.28 | Token Expiry Handling  | Detect expired JWT, trigger refresh/logout | S    | 🖥️   |
| 1.29 | Invalid Token Redirect | Redirect to login on invalid/missing JWT   | S    | 🖥️   |
| 1.30 | Auth Middleware Tests  | Unit tests for middleware logic            | S    | 🖥️   |

### Page Transitions (Stories 1.31-1.35)

| #    | Story                      | Description                             | Size | Type |
| ---- | -------------------------- | --------------------------------------- | ---- | ---- |
| 1.31 | Navigation Loading State   | Track pending navigation in global UI   | S    | 🖥️   |
| 1.32 | Page Transition Spinner    | Loading indicator component             | S    | 🖥️   |
| 1.33 | Router Loading Integration | Wire TanStack Router pending to spinner | S    | 🖥️   |
| 1.34 | Transition Delay Threshold | Only show spinner if load >300ms        | XS   | 🖥️   |
| 1.35 | Page Transition Tests      | Tests for loading states                | S    | 🖥️   |

**Epic 1 Summary:** 35 stories (7 XS, 25 S, 3 M)

---

## Epic 2: Dashboard App (`dashboard-app`)

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

## Epic 3: Gallery App (`gallery-app`)

**Goal:** Enable users to browse, search, and view their MOC collection.

**Dependencies:** Epic 1 (Shell)

### Setup & API (Stories 3.1-3.4)

| #   | Story                  | Description                                       | Size | Type |
| --- | ---------------------- | ------------------------------------------------- | ---- | ---- |
| 3.1 | Project Scaffolding    | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 3.2 | Gallery API Slice      | Create `galleryApi` RTK Query slice               | S    | 🔄   |
| 3.3 | Get MOCs Endpoint      | GET /mocs with pagination support                 | S    | 🔄   |
| 3.4 | Get MOC by ID Endpoint | GET /mocs/:id for detail view                     | S    | 🔄   |

### Collection Grid (Stories 3.5-3.7)

| #   | Story              | Description                               | Size | Type |
| --- | ------------------ | ----------------------------------------- | ---- | ---- |
| 3.5 | MOC Card Component | Card with image, title, tags, piece count | S    | 🖥️   |
| 3.6 | Collection Grid    | Responsive grid layout (1/2/3/4 columns)  | S    | 🖥️   |
| 3.7 | Infinite Scroll    | Load more MOCs on scroll                  | M    | 🖥️   |

### Search & Filter (Stories 3.8-3.15)

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

### MOC Detail (Stories 3.16-3.24)

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

### Testing & Polish (Stories 3.25-3.26)

| #    | Story                  | Description                          | Size | Type |
| ---- | ---------------------- | ------------------------------------ | ---- | ---- |
| 3.25 | Gallery Loading States | Skeleton loaders for grid and detail | S    | 🖥️   |
| 3.26 | Gallery Unit Tests     | Tests for components (≥45% coverage) | M    | 🖥️   |

**Epic 3 Summary:** 26 stories (6 XS, 17 S, 3 M)

---

## Epic 4: Instructions App (`instructions-app`)

**Goal:** Enable users to upload, edit, and manage their MOCs and files.

**Dependencies:** Epic 1 (Shell)

### Setup & API (Stories 4.1-4.7)

| #   | Story                  | Description                                       | Size | Type |
| --- | ---------------------- | ------------------------------------------------- | ---- | ---- |
| 4.1 | Project Scaffolding    | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 4.2 | Instructions API Slice | Create `instructionsApi` RTK Query slice          | S    | 🔄   |
| 4.3 | Create MOC Endpoint    | POST /mocs for creating new MOC                   | S    | 🔄   |
| 4.4 | Update MOC Endpoint    | PUT /mocs/:id for updating MOC                    | S    | 🔄   |
| 4.5 | Delete MOC Endpoint    | DELETE /mocs/:id with cascade delete              | S    | 🔄   |
| 4.6 | Upload File Endpoint   | POST /mocs/:id/files multipart upload             | M    | 🔄   |
| 4.7 | Delete File Endpoint   | DELETE /mocs/:id/files/:fileId                    | S    | 🔄   |

### MOC Creation (Stories 4.8-4.15)

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

### MOC Editing (Stories 4.16-4.19)

| #    | Story             | Description                           | Size | Type |
| ---- | ----------------- | ------------------------------------- | ---- | ---- |
| 4.16 | Edit MOC Page     | Route and page layout for editing MOC | S    | 🖥️   |
| 4.17 | Prefill Edit Form | Load existing MOC data into form      | S    | 🖥️   |
| 4.18 | Save MOC (Update) | Submit changes, update MOC            | S    | 🖥️   |
| 4.19 | Delete MOC        | Delete button with confirmation modal | S    | 🖥️   |

### File Management (Stories 4.20-4.31)

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

### Testing (Story 4.32)

| #    | Story                   | Description                          | Size | Type |
| ---- | ----------------------- | ------------------------------------ | ---- | ---- |
| 4.32 | Instructions Unit Tests | Tests for components (≥45% coverage) | M    | 🖥️   |

**Epic 4 Summary:** 32 stories (2 XS, 26 S, 4 M)

---

## Epic 5: Wishlist App (`wishlist-app`)

**Goal:** Enable users to manage their wishlist of MOCs, LEGO sets, and alt brick sets.

**Dependencies:** Epic 1 (Shell)

### Setup & API (Stories 5.1-5.6)

| #   | Story                 | Description                                       | Size | Type |
| --- | --------------------- | ------------------------------------------------- | ---- | ---- |
| 5.1 | Project Scaffolding   | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 5.2 | Wishlist API Slice    | Create `wishlistApi` RTK Query slice              | S    | 🔄   |
| 5.3 | Get Wishlist Endpoint | GET /wishlist items                               | S    | 🔄   |
| 5.4 | Add Item Endpoint     | POST /wishlist item                               | S    | 🔄   |
| 5.5 | Update Item Endpoint  | PUT /wishlist/:id                                 | S    | 🔄   |
| 5.6 | Delete Item Endpoint  | DELETE /wishlist/:id                              | S    | 🔄   |

### Display (Stories 5.7-5.11)

| #    | Story              | Description                            | Size | Type |
| ---- | ------------------ | -------------------------------------- | ---- | ---- |
| 5.7  | Wishlist Item Card | Card with name, link, type badge, date | S    | 🖥️   |
| 5.8  | Wishlist List View | Vertical list layout                   | S    | 🖥️   |
| 5.9  | Wishlist Grid View | Card grid layout                       | S    | 🖥️   |
| 5.10 | View Toggle        | Switch between list/grid views         | XS   | 🖥️   |
| 5.11 | Group by Type      | Collapsible sections for MOC/LEGO/Alt  | S    | 🖥️   |

### Item Management (Stories 5.12-5.20)

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

### States & Testing (Stories 5.21-5.23)

| #    | Story                  | Description                          | Size | Type |
| ---- | ---------------------- | ------------------------------------ | ---- | ---- |
| 5.21 | Wishlist Empty State   | Empty state with CTA                 | XS   | 🖥️   |
| 5.22 | Wishlist Loading State | Skeleton loaders                     | XS   | 🖥️   |
| 5.23 | Wishlist Unit Tests    | Tests for components (≥45% coverage) | S    | 🖥️   |

**Epic 5 Summary:** 23 stories (8 XS, 15 S)

---

## Epic 6: Settings App (`settings-app`)

**Goal:** Enable users to manage their preferences and account settings.

**Dependencies:** Epic 1 (Shell)

### Setup & API (Stories 6.1-6.4)

| #   | Story                    | Description                                       | Size | Type |
| --- | ------------------------ | ------------------------------------------------- | ---- | ---- |
| 6.1 | Project Scaffolding      | Create app folder, package.json, connect to shell | XS   | 🖥️   |
| 6.2 | Settings API Slice       | Create `settingsApi` RTK Query slice              | S    | 🔄   |
| 6.3 | Get Settings Endpoint    | GET /settings for user preferences                | S    | 🔄   |
| 6.4 | Update Settings Endpoint | PUT /settings for saving preferences              | S    | 🔄   |

### Appearance (Stories 6.5-6.8)

| #   | Story                | Description                         | Size | Type |
| --- | -------------------- | ----------------------------------- | ---- | ---- |
| 6.5 | Settings Page Layout | Page with sections for settings     | S    | 🖥️   |
| 6.6 | Appearance Section   | Section header and container        | XS   | 🖥️   |
| 6.7 | Theme Selector       | Light/Dark/System radio or dropdown | S    | 🖥️   |
| 6.8 | Gallery Density      | Grid size preference selector       | S    | 🖥️   |

### Account (Stories 6.9-6.13)

| #    | Story             | Description                      | Size | Type |
| ---- | ----------------- | -------------------------------- | ---- | ---- |
| 6.9  | Account Section   | Section header and container     | XS   | 🖥️   |
| 6.10 | Display User Info | Show current name, email, avatar | S    | 🖥️   |
| 6.11 | Edit Display Name | Input to change display name     | S    | 🖥️   |
| 6.12 | Upload Avatar     | Image upload for avatar          | S    | 🔄   |
| 6.13 | Avatar Preview    | Preview before saving            | XS   | 🖥️   |

### Save & Testing (Stories 6.14-6.17)

| #    | Story                     | Description                          | Size | Type |
| ---- | ------------------------- | ------------------------------------ | ---- | ---- |
| 6.14 | Save Settings             | Save button, persist to API          | S    | 🖥️   |
| 6.15 | Settings Success Feedback | Toast on successful save             | XS   | 🖥️   |
| 6.16 | Settings Loading State    | Skeleton while loading               | XS   | 🖥️   |
| 6.17 | Settings Unit Tests       | Tests for components (≥45% coverage) | S    | 🖥️   |

**Epic 6 Summary:** 17 stories (7 XS, 10 S)

---
