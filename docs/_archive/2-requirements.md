# 2. Requirements

## 2.1 App Structure

**6 Apps (1 Shell + 5 Domain Apps):**

| App                | Route               | Purpose                                     |
| ------------------ | ------------------- | ------------------------------------------- |
| `main-app`         | -                   | Shell: Layout, Auth, Navigation, Middleware |
| `dashboard-app`    | `/` or `/dashboard` | Landing page with stats and quick actions   |
| `gallery-app`      | `/gallery/*`        | Browse, search, view MOC collection         |
| `wishlist-app`     | `/wishlist/*`       | Manage wishlist items                       |
| `instructions-app` | `/instructions/*`   | Upload, edit, manage MOCs and files         |
| `settings-app`     | `/settings/*`       | User preferences and account settings       |

## 2.2 Functional Requirements

### Shell App (`main-app`)

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

### Dashboard App (`dashboard-app`)

- FR31: Dashboard SHALL be the default landing page after login
- FR32: Dashboard SHALL display collection summary: total MOCs, total wishlist items
- FR33: Dashboard SHALL display theme breakdown (top themes with counts)
- FR34: Dashboard SHALL display recently added MOCs (last 5-10) with thumbnails
- FR35: Dashboard SHALL provide quick actions: Add New MOC, Browse Gallery, View Wishlist
- FR36: Dashboard SHALL define RTK Query `dashboardApi` slice

### Gallery App (`gallery-app`)

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

### Wishlist App (`wishlist-app`)

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

### Instructions App (`instructions-app`)

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

### Settings App (`settings-app`)

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
