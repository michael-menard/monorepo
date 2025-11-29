# User Dashboard Product Requirements Document (PRD)

**Version:** 0.1
**Date:** 2025-10-15
**Author:** John (Product Manager)

---

## Goals and Background Context

### Goals

- Provide a centralized, post-login command center with a four-tab interface that gives users immediate visibility into their LEGO collection health and status
- Enable data-driven decision-making for LEGO purchases and project planning through financial transparency and comprehensive parts intelligence
- Eliminate friction in content management with a dedicated gallery system for MOCs, official Sets, and Inspiration images
- Transform the platform from a passive organizer to an analytical tool through metric visualizations and financial tracking
- Support multiple user workflows (collection organization, build planning, budget management, activity review) through purpose-driven tabs
- Create a lightweight, joyful experience that enhances building rather than creating administrative burden

### Background Context

The LEGO MOC platform currently lacks a cohesive landing experience after login. Users need a central hub that aggregates collection metrics, provides quick access to different content types (MOCs, official sets, inspiration images), and delivers actionable insights about their LEGO inventory and projects. This dashboard addresses the fundamental need for "what's the state of my collection?" while supporting both organizational needs (galleries, activity tracking) and strategic decision-making (financial intelligence, project readiness).

The dashboard uses a tabbed architecture (Overview, Activity, Galleries, Budget) to organize functionality by user intent, reducing cognitive load and enabling focused workflows. Key differentiators include financial transparency (budget tracking, collection valuation, cost-to-build calculations via parts database with automated pricing) and frictionless data ingestion (URL-based import for LEGO.com, BrickLink, and Rebrickable content). The design philosophy prioritizes being lightweight and joyful - users should be able to engage deeply with analytics or simply glance and go build. This is a desktop-focused experience with responsive design principles to ensure usability across screen sizes.

### Success Metrics & KPIs

The dashboard feature's success will be measured through the following key performance indicators:

**User Engagement Metrics:**

- **Dashboard Visit Frequency:** Target 4+ dashboard visits per week per active user (measured via analytics)
- **Session Duration:** Average 3-5 minutes per dashboard session, indicating users are engaging with visualizations and galleries (not just passing through)
- **Tab Utilization:** 80% of users interact with at least 2 of the 4 dashboard tabs within their first month
- **Feature Adoption - Visualizations:** 70% of users view at least one data visualization (gauge, pie chart, or scatterplot) within first 2 weeks

**Feature-Specific Adoption:**

- **Gallery Usage:** 90% of users use search or filter functionality in galleries within first 30 days (indicates galleries meet organizational needs)
- **Financial Feature Adoption:** 50% of users set a monthly budget within 90 days of dashboard launch
- **URL Ingestion Success Rate:** 60% of new MOCs/Sets added via URL ingestion (vs. manual entry) within 6 months, indicating feature reduces friction
- **View Mode Preference:** 40% of users switch from default grid view to masonry or table view, indicating value in multi-mode galleries

**Business Impact Metrics:**

- **User Retention:** Dashboard reduces monthly churn by 15% (users with dashboard access vs. without)
- **Content Growth:** Users with dashboard access add 30% more MOCs to their collection compared to pre-dashboard baseline
- **Time to Value:** 80% of new users add their first MOC within first session after seeing dashboard empty state CTA

**Technical Performance Metrics:**

- **Page Load Time:** 95th percentile dashboard load time <2 seconds (per NFR1)
- **API Response Time:** 95th percentile metric aggregation API response <500ms with 2000 MOCs
- **Error Rate:** <1% of dashboard page loads result in errors
- **Pricing Scraper Reliability:** 95% successful scraper runs (daily job completes without critical failures)

**Baseline Measurements:**

- Current average user session frequency: 2-3 visits per week (pre-dashboard)
- Current MOC addition rate: X MOCs per user per month (to be measured pre-launch)
- Current user churn rate: Y% per month (to be measured pre-launch)

**Timeframe:**

- **30 days post-launch:** Measure initial feature adoption (dashboard visits, tab usage, gallery interactions)
- **90 days post-launch:** Measure feature-specific adoption (budget setting, URL ingestion, view mode preferences)
- **6 months post-launch:** Measure business impact (retention, content growth, time to value)
- **12 months post-launch:** Full KPI review and decision on Phase 2 investment

**Success Threshold:**

- **MVP Success:** Achieve 70%+ of target metrics at 90-day mark
- **Full Success:** Achieve 85%+ of target metrics at 6-month mark
- **Phase 2 Go Decision:** If user retention improves by 10%+ and financial feature adoption hits 40%+, invest in AI/automation features

### Change Log

| Date       | Version | Description                                      | Author    |
| ---------- | ------- | ------------------------------------------------ | --------- |
| 2025-10-15 | 0.1     | Initial draft from brainstorming session results | John (PM) |

---

## Requirements

### Functional Requirements

#### Dashboard Navigation & Layout

**FR1:** The system shall provide a four-tab navigation structure (Overview, Activity, Galleries, Budget) within the dashboard.

**FR2:** The system shall provide a navigation bar with app logo (left) and profile avatar dropdown (right) containing links to Dashboard, galleries, Budget, Settings, and Logout.

**FR3:** The system shall provide a persistent Floating Action Button (FAB) for adding new MOCs or Sets, accessible from all dashboard tabs.

**FR4:** The system shall remember user preferences including default dashboard tab, gallery view mode (grid/masonry/table), and last-used sort/filter settings, persisting across sessions.

#### Overview Tab - Metrics & Visualizations

**FR5:** The system shall display five core metric tiles on the Overview tab: Total MOCs, Total Pieces, MOCs Built (completed), MOCs Ready to Build (100% parts available), and MOCs in Parts Collection phase.

**FR6:** The system shall make metric tiles clickable, navigating users to filtered views of relevant content (e.g., clicking "MOCs Built" shows only completed MOCs).

**FR7:** The system shall display three data visualizations on the Overview tab: a gauge chart showing part acquisition progress for active MOC (0-100%), a pie/doughnut chart showing theme breakdown by percentage, and a scatterplot showing price vs. piece count with shape/color encoding (triangle=Set, circle=MOC; colors by status).

**FR8:** The system shall determine the "active MOC" for part acquisition gauge as the MOC most recently marked as "collecting parts" or allow user to manually designate one active MOC at a time.

#### Galleries System

**FR9:** The system shall provide four distinct gallery views accessible via the Galleries tab and navigation menu: Recent 10 MOCs list, MOC Gallery (all user MOCs), Sets Gallery (all official LEGO sets), and Inspiration Gallery (user-curated images).

**FR10:** The system shall support sorting within gallery views by: added date, release date (for Sets) / creation date (for MOCs), total piece count, and total cost.

**FR11:** The system shall support search functionality within galleries by: name, set or MOC number, and theme.

**FR12:** The system shall support both LEGO official themes (predefined list) and user-defined custom themes (tags), with autocomplete suggestions in search.

**FR13:** The system shall support three gallery display modes for MOC Gallery and Sets Gallery: grid view, masonry gallery view, and data table view.

**FR14:** The system shall support user-toggleable pagination OR infinite scroll for gallery views, with pagination as default. Pagination shall default to 50 items per page with user-configurable options for 25, 50, 100, or 200 items. Infinite scroll shall load 50 items per batch.

**FR15:** The system shall display helpful empty states for galleries with zero items, including: clear explanation of why content is empty, primary action button to add content, and optional example/tutorial link.

**FR16:** The Inspiration Gallery shall support user-uploaded images with optional metadata including: source URL, notes/description, tags, and association with planned or wishlist MOCs.

#### Financial Intelligence

**FR17:** The system shall maintain a parts database with current market pricing from multiple vendors (BrickLink, BrickOwl, etc.).

**FR18:** The system shall resolve pricing conflicts across vendors by using the average price, with fallback to single-vendor pricing when only one source is available.

**FR19:** The system shall display "Price unavailable" for parts without pricing data and exclude them from cost-to-build calculations with a warning message to the user.

**FR20:** The system shall calculate estimated cost-to-build for any MOC by summing individual part prices from the parts database.

**FR21:** The system shall track spending events when users manually log parts purchases or mark MOCs as purchased.

**FR22:** The system shall display a Budget tab with monthly budget tracking, including user-defined budget amount, actual spending visualization (bar graph), and spending breakdown by theme with variance indicators (over/under budget).

#### Content Management

**FR23:** The system shall support smart URL ingestion for LEGO.com, BrickLink, and Rebrickable links, automatically extracting set/MOC name, piece count, theme, price, images, and instruction PDFs.

**FR24:** The system shall provide meaningful error messages when URL ingestion fails, including: unsupported URL format, extraction failure, network timeout, or partial data extraction, and allow users to manually complete missing fields.

#### Activity Timeline

**FR25:** The system shall display an Activity tab with scrollable, filterable timeline of user actions (Added, Built, Updated, etc.) grouped by date periods.

### Non-Functional Requirements

**NFR1:** The dashboard shall maintain acceptable performance with collections of up to 2000 MOCs, with page load times under 2 seconds on standard broadband connections.

**NFR2:** The system shall use a desktop-focused responsive design that adapts to various screen sizes while optimizing for desktop workflows, leveraging existing Tailwind CSS breakpoints.

**NFR3:** The system shall support the latest two versions of Chrome, Firefox, Safari, and Edge browsers.

**NFR4:** Parts pricing data shall be refreshed via automated scheduled jobs (cron) on a daily or weekly basis, not real-time API calls.

**NFR5:** The parts pricing scraper shall include error handling and monitoring to ensure data quality and system reliability.

**NFR6:** All data operations (URL ingestion, price updates) shall use background processing with progress indicators to prevent blocking the UI.

**NFR7:** The system shall provide loading states and empty states for all data-dependent components to ensure clear user feedback.

**NFR8:** The system shall minimize required user inputs per task (target: ≤3 clicks for common actions) and provide clear visual feedback within 200ms of user interactions.

**NFR9:** The system shall implement client-side caching for gallery data with a 5-minute TTL to reduce server load and improve perceived performance.

#### Security & Compliance

**NFR10:** The system shall inherit existing authentication and authorization mechanisms from the LEGO MOC platform, requiring no new user authentication flows for the dashboard.

**NFR11:** User spending events shall be treated as Personally Identifiable Financial Information (PIFI) and encrypted at rest in the PostgreSQL database using existing encryption standards (AES-256 or equivalent).

**NFR12:** The parts pricing scraper shall not store or transmit any user-specific data to external vendor APIs (BrickLink, BrickOwl). All scraped data shall be public market pricing information only.

**NFR13:** User preferences data shall be scoped per-user with proper authorization checks ensuring users can only access and modify their own preferences (enforced at API level via user_id validation).

**NFR14:** The system shall comply with GDPR and CCPA data privacy regulations:

- User preferences and spending events shall be included in data export requests (user data portability)
- User preferences and spending events shall be permanently deleted when user requests account deletion (right to be forgotten)
- Activity logs containing user actions shall be retained for 1 year maximum, then automatically purged (data minimization)
- Privacy policy shall be updated to disclose: parts pricing data sources, activity tracking, and user preference storage

**NFR15:** The system shall implement rate limiting on the pricing scraper to prevent abuse and respect vendor API terms of service:

- Maximum 100 requests per minute to BrickLink API
- Maximum 50 requests per minute to BrickOwl API
- Exponential backoff on rate limit errors (429 responses)
- IP-based throttling if available to avoid account-level bans

**NFR16:** The dashboard shall not introduce new security vulnerabilities:

- All API endpoints shall require authentication (inherit existing JWT/session validation)
- User input validation via Zod schemas for all form submissions (spending events, budget settings, URL ingestion)
- SQL injection prevention via Drizzle ORM parameterized queries
- XSS prevention via React's built-in escaping and Content Security Policy headers
- CSRF protection for all state-changing operations (inherit existing CSRF token implementation)

**NFR17:** Sensitive operations shall be logged for security auditing:

- User spending event creation/deletion (financial data changes)
- Budget modifications
- Active MOC designation changes
- Bulk data operations (if implemented)
- Failed authentication attempts on dashboard routes
- Logs shall be retained for 90 days for security incident investigation

---

## User Interface Design Goals

### Overall UX Vision

The dashboard should embody a "lightweight and joyful" philosophy that enhances the building experience rather than creating administrative burden. The interface prioritizes clarity and efficiency - users should be able to quickly glance at their collection status and jump into action, or engage deeply with analytics when desired. The design emphasizes visual data (charts, galleries, metrics) over text-heavy interfaces, leveraging the inherently visual nature of LEGO building.

The experience should feel like a **personal command center** rather than a database management tool. Quick access patterns (FAB, clickable metrics, persistent navigation) reduce friction for common tasks. The tabbed layout provides focus - each tab serves a distinct purpose (overview, activity review, content browsing, financial planning) without overwhelming users with everything at once.

### Key Interaction Paradigms

- **Tab-based navigation**: Horizontal tab bar (Overview | Activity | Galleries | Budget) keeps users oriented and enables focused workflows without overwhelming scrolling
- **Persistent FAB (Floating Action Button)**: Bottom-right "+ Add MOC/Set" button is always accessible regardless of tab or scroll position
- **Clickable metrics**: Dashboard tiles act as filters/navigation - clicking "MOCs Built" immediately shows completed MOCs in the appropriate gallery
- **Multi-mode galleries**: Users can switch between grid (thumbnails), masonry (Pinterest-style), and data table (spreadsheet) views depending on task (browsing vs. detailed comparison)
- **Smart defaults with user control**: System remembers preferences (default tab, view mode, sort order) but allows easy override
- **Progressive disclosure**: Empty states guide new users with clear CTAs; advanced features (custom themes, budget breakdowns) appear as users add content
- **Background processing with feedback**: Long-running operations (URL ingestion, price updates) don't block the UI; progress indicators keep users informed

### Core Screens and Views

**Conceptual high-level screens necessary to deliver PRD value:**

1. **Dashboard Home (Post-Login Landing)** - Four-tab interface with Overview as default
2. **Overview Tab** - Metric tiles + three visualizations (gauge, pie/doughnut, scatterplot)
3. **Activity Tab** - Scrollable timeline with filters and date grouping
4. **Galleries Tab** - Unified view with sub-navigation for Recent 10, MOC Gallery, Sets Gallery, Inspiration Gallery
5. **Budget Tab** - Monthly budget input, spending bar graph, theme breakdown visualization
6. **MOC Gallery View** - Grid/masonry/table toggle with search and sort controls
7. **Sets Gallery View** - Grid/masonry/table toggle with search and sort controls
8. **Inspiration Gallery View** - Image-focused layout with metadata overlay
9. **Add MOC/Set Modal** - Quick-add form with URL ingestion field
10. **Empty State Screens** - For galleries with zero items (guidance and CTAs)

### Accessibility

**Target: WCAG AA Compliance**

The dashboard shall meet WCAG 2.1 Level AA standards, including:

- Keyboard navigation support for all interactive elements (tabs, metrics, galleries, FAB)
- Sufficient color contrast for text and interactive elements (minimum 4.5:1 for normal text, 3:1 for large text)
- Screen reader compatibility with semantic HTML and ARIA labels
- Focus indicators for keyboard users
- Alternative text for all data visualizations and images

### Branding

**Design System:** The dashboard shall use the existing LEGO MOC platform design system built with Tailwind CSS and Radix UI components.

**Visual Identity:**

- Clean, modern aesthetic that emphasizes content (MOCs, sets, data) over decorative elements
- Playful but professional - acknowledges the joy of LEGO building without being childish
- Color palette should support theme-based visualizations (pie charts, status badges) while maintaining visual hierarchy
- Typography optimized for data-dense displays (tables, metric tiles) and scannable lists

### Target Device and Platforms

**Desktop-focused with Responsive Design**

- **Primary target**: Desktop browsers (1280px+ width) optimized for multi-column layouts, side-by-side galleries, and detailed data tables
- **Responsive adaptation**: Tablet (768px-1279px) and mobile (≤767px) breakpoints adapt layout (stacked columns, simplified tables, adjusted chart sizing)
- **Supported browsers**: Latest two versions of Chrome, Firefox, Safari, and Edge
- **Performance target**: Optimized for desktop workflows where users manage large collections (up to 2000 MOCs) with multiple tabs and windows

---

## Technical Assumptions

Based on the existing LEGO MOC platform architecture (documented in CLAUDE.md), the dashboard feature will follow established technical patterns. Since this is feature addition to an existing codebase, the technical choices below reflect current system constraints rather than greenfield decisions.

### Repository Structure: Monorepo

**Decision:** The dashboard feature will be developed within the existing **Turborepo-based monorepo** using pnpm workspaces.

**Rationale:**

- Dashboard is a feature of the existing LEGO MOC Instructions App (`apps/web/lego-moc-instructions-app`)
- Leverages existing shared packages (`@repo/ui`, `@repo/auth`, `@repo/gallery`, `@repo/moc-instructions`, etc.)
- Follows "reuse over reinvention" principle - dashboard components may be extracted to shared packages if reused
- Centralizes dependency management and build tooling

**Implementation Notes:**

- Dashboard routes will be added to `apps/web/lego-moc-instructions-app/src/routes/`
- Dashboard components will initially live in `src/components/Dashboard/` within the app
- If gallery components differ significantly from existing `@repo/gallery`, consider creating `@repo/dashboard-gallery` package

### Service Architecture

**Decision:** The dashboard will follow the existing **Microservices within Monorepo** architecture:

- **Frontend**: React 19 SPA served from `apps/web/lego-moc-instructions-app`
- **Backend**: RESTful APIs from `apps/api/lego-projects-api` (Express + PostgreSQL + Drizzle ORM)
- **Pricing Service**: New scheduled job (cron) within `lego-projects-api` for parts pricing scraper
- **Data Storage**: PostgreSQL for all dashboard data (metrics, budgets, parts pricing)
- **Caching**: Redis for gallery data caching (5-minute TTL per NFR9)

**Rationale:**

- Dashboard data (MOCs, sets, parts, budgets) fits naturally into existing PostgreSQL schema
- Pricing scraper can run as a scheduled job via existing infrastructure
- Redis is already available for caching
- No need for new services or databases - feature integrates into current architecture

**New Components:**

- Parts pricing database table(s) in PostgreSQL
- Budget tracking table(s) in PostgreSQL
- Cron job for pricing scraper (daily/weekly schedule)
- New API endpoints for dashboard metrics aggregation

### Testing Requirements

**Decision:** The dashboard shall implement **Full Testing Pyramid** following existing patterns:

**Unit Tests (Vitest + React Testing Library):**

- All dashboard components (metric tiles, charts, gallery views)
- Chart rendering logic (gauge, pie/doughnut, scatterplot)
- Budget calculation functions
- Pricing aggregation logic
- Mock all external dependencies (API calls, Redux store, database)

**Integration Tests (Vitest + MSW):**

- Dashboard tab navigation flows
- Gallery filtering, sorting, search
- URL ingestion flow end-to-end
- Budget tracking workflows
- Mock only external APIs (BrickLink, etc.), test internal integrations

**E2E Tests (Playwright with Gherkin syntax):**

- Critical user journeys:
  - User logs in → sees dashboard Overview tab with metrics
  - User adds MOC via URL ingestion → MOC appears in gallery
  - User sets budget → tracks spending → views breakdown
  - User switches gallery view modes → persists preference
- Feature files in `apps/e2e/features/dashboard/`
- Step definitions in `apps/e2e/step-definitions/dashboard-steps.ts`

**Performance Tests:**

- Gallery rendering with 2000 MOCs
- Metric aggregation queries with large datasets
- Chart rendering performance

**Rationale:**

- Dashboard is user-facing feature requiring high reliability
- Financial calculations (cost-to-build, budget tracking) need thorough testing
- Gallery performance is critical with large collections
- Existing testing infrastructure supports all test types

### Additional Technical Assumptions and Requests

#### Frontend Stack

**Languages & Frameworks:**

- **TypeScript 5.8** (strict mode) - no JavaScript files except config
- **React 19** with functional components and hooks
- **TanStack Router** for routing (do not introduce alternatives)
- **Redux Toolkit + RTK Query** for state management and data fetching
- **TanStack React Query** for server state management
- **Tailwind CSS 4** for styling
- **Radix UI** for accessible component primitives

**Rationale:** Dashboard must integrate seamlessly with existing app architecture.

#### Data Fetching

**Decision:** Use **RTK Query exclusively** for all dashboard API calls. Do not use axios or fetch directly in components.

**Implementation:**

- Create new API slice: `dashboardApi.ts` with endpoints for:
  - Dashboard metrics aggregation
  - Gallery data (MOCs, Sets, Inspiration)
  - Budget tracking CRUD
  - Parts pricing queries
  - URL ingestion
- Leverage automatic caching and invalidation
- Handle CSRF token via existing base query configuration

**Rationale:** Enforces existing codebase standard (per CLAUDE.md: "RTK Query for all data fetching").

#### Charting Library

**Decision:** Use **Recharts** for data visualizations (gauge, pie/doughnut, scatterplot).

**Rationale:**

- React-native, declarative API aligns with project philosophy
- Strong TypeScript support
- Lightweight compared to D3 (bundle size consideration)
- Good performance for the three required chart types
- Radix-compatible styling

**Alternative Considered:** Victory (heavier bundle), D3 (too low-level for this use case)

#### Parts Pricing Data Sources

**Decision:** Integrate with **BrickLink API** as primary source, **BrickOwl API** as secondary source.

**Implementation:**

- Web scraper service within `lego-projects-api`
- Cron job scheduling (recommend daily for active parts, weekly for full catalog)
- Price averaging algorithm: mean of available vendor prices
- Database schema includes: `part_id`, `vendor`, `price`, `currency`, `last_updated`

**Rationale:**

- BrickLink is largest LEGO parts marketplace (primary data source)
- BrickOwl provides price comparison and redundancy
- Scheduled updates (not real-time) balance accuracy with API costs

**Open Questions:**

- Do we need to review BrickLink/BrickOwl Terms of Service for scraping allowances?
- Should pricing data be public or user-specific? (Assume public for MVP)

#### URL Ingestion Services

**Decision:** Support extraction from:

1. **LEGO.com** - Official set data
2. **BrickLink** - MOCs and marketplace listings
3. **Rebrickable** - Alternate builds and parts lists

**Implementation:**

- Backend service using HTML parsing (Cheerio/jsdom) or official APIs where available
- Queue-based processing for background jobs
- Metadata extraction: name, piece count, theme, price, image URLs, instruction PDF URLs
- Image downloading and storage in existing S3 bucket
- PDF downloading and storage in existing S3 bucket

**Rationale:**

- These three sources cover majority of user needs (official sets, community MOCs, alternate builds)
- Existing S3 infrastructure supports image/PDF storage

**Open Questions:**

- Which sources have official APIs vs. requiring scraping?
- Rate limiting considerations for each source?

#### Database Schema Extensions

**Decision:** Extend existing PostgreSQL schema (Drizzle ORM) with new tables:

**Proposed Tables:**

- `parts_pricing` - Parts price data from vendors
- `user_budgets` - Monthly budget settings
- `spending_events` - Logged purchases/spending
- `user_preferences` - Dashboard tab defaults, gallery view modes
- `inspiration_images` - Inspiration gallery metadata

**Rationale:**

- PostgreSQL already used for MOC/set data, natural fit for related data
- Drizzle ORM provides type-safe queries
- Centralizes all dashboard data in one database (no fragmentation)

**Migration Strategy:**

- New migrations in `apps/api/lego-projects-api/src/db/migrations/`
- Follow existing naming convention: `NNNN_description.sql`

#### Browser and Performance Targets

**Browsers:** Latest two versions of Chrome, Firefox, Safari, Edge

**Performance:**

- Page load: <2 seconds on standard broadband (10 Mbps+)
- Time to Interactive (TTI): <3 seconds
- Gallery rendering: <500ms for 50 items
- Chart rendering: <300ms per chart
- API response time: <500ms for metric aggregation queries

**Rationale:** Desktop-focused product with data-intensive displays requires clear performance budgets.

#### Accessibility Tooling

**Decision:** Use existing accessibility setup:

- Radix UI primitives (accessible by default)
- `eslint-plugin-jsx-a11y` for linting
- Axe DevTools for manual testing
- Playwright accessibility tests in E2E suite

**Target:** WCAG 2.1 Level AA compliance

#### Code Quality Standards

**Enforce existing standards:**

- TypeScript strict mode (no `any`, no `@ts-ignore` without justification)
- Zod schemas for all data validation (API requests/responses, form inputs)
- No `console.log` in production code (use existing logging if needed)
- ESLint 9 (Airbnb style) + Prettier formatting
- All new functionality requires tests (unit + integration minimum)

#### Deployment and Infrastructure

**Decision:** Dashboard deploys as part of existing frontend deployment pipeline:

- **Development:** Docker Compose (existing setup)
- **Production:** AWS (existing infrastructure)
- **CI/CD:** Existing GitHub Actions workflows
- **Monitoring:** Existing monitoring setup (extend with dashboard-specific metrics if needed)

**New Infrastructure Needs:**

- Cron job scheduler for pricing scraper (can use existing cron setup or AWS EventBridge)
- Redis cache configuration for dashboard data (extend existing Redis instance)

---

## Epic List

Based on the requirements and brainstorming priorities, I'm proposing **4 epics** that deliver incremental, deployable value. Each epic builds upon the previous one while maintaining logical sequencing.

### Epic 1: Dashboard Foundation & Metrics Overview

Establish dashboard routing, navigation architecture, and metrics visualization so users can see collection health at a glance upon login.

### Epic 2: Gallery System & Content Management

Enable comprehensive browsing and organization of MOCs, Sets, and Inspiration images through multi-view galleries with search and filtering capabilities.

### Epic 3: Financial Intelligence & Budget Tracking

Provide cost transparency and budget management through parts pricing database, cost-to-build calculations, and spending analytics.

### Epic 4: Activity Timeline & User Preferences

Enable activity review and persistent user preferences for optimized, personalized dashboard workflows.

---

## Epic 1: Dashboard Foundation & Metrics Overview

**Expanded Goal:**
Establish the core dashboard architecture including routing, navigation, and the Overview tab with metric tiles and data visualizations. This epic delivers the post-login landing experience where users immediately see their collection health at a glance. The foundation includes the tab structure (Overview, Activity, Galleries, Budget) and reusable navigation patterns that subsequent epics will build upon. By the end of this epic, users can log in, land on the dashboard, see their key metrics (total MOCs, pieces, build status), and visualize their collection through three chart types.

### Story 1.1: Dashboard Route and Navigation Shell

**As a** logged-in user,
**I want** to land on a dashboard page after login,
**so that** I have a central command center for managing my LEGO collection.

**Acceptance Criteria:**

1. When a user successfully logs in, the system redirects to `/dashboard` route
2. The dashboard page displays a navigation bar with app logo (left) and profile avatar (right)
3. The profile avatar dropdown contains links to: Dashboard, Settings, and Logout
4. The navigation bar remains persistent across all dashboard views
5. The dashboard page has a responsive layout that adapts to desktop screen sizes using existing Tailwind breakpoints
6. The dashboard route is protected (requires authentication) and redirects unauthenticated users to login page
7. A loading state displays while dashboard initializes
8. The page passes WCAG AA accessibility standards including keyboard navigation for all interactive elements
9. Unit tests verify routing logic and authentication guards
10. E2E test (Gherkin format) verifies: User logs in → lands on dashboard → sees navigation bar

### Story 1.2: Tab Navigation Component

**As a** user,
**I want** to switch between dashboard tabs (Overview, Activity, Galleries, Budget),
**so that** I can access different dashboard functionality organized by purpose.

**Acceptance Criteria:**

1. The dashboard displays a horizontal tab bar with four tabs: Overview, Activity, Galleries, Budget
2. The Overview tab is active by default when landing on the dashboard
3. Clicking a tab switches the active tab and displays the corresponding tab content
4. The active tab has visual indication (e.g., underline, color change, bold text)
5. Tab switching updates the URL (e.g., `/dashboard/overview`, `/dashboard/activity`) without full page reload
6. Users can navigate directly to a specific tab via URL (e.g., `/dashboard/budget`)
7. The tab bar is keyboard accessible (arrow keys navigate between tabs, Enter activates)
8. The tab component uses Radix UI Tabs primitive for accessibility
9. Tab switching occurs within 200ms (meets NFR8 feedback timing)
10. Unit tests verify tab switching logic and URL synchronization
11. Integration test verifies all four tabs render correctly when activated

### Story 1.3: Metric Tiles Display and Data Aggregation

**As a** user,
**I want** to see five key collection metrics displayed as tiles on the Overview tab,
**so that** I can quickly understand the state of my collection at a glance.

**Acceptance Criteria:**

1. The Overview tab displays five metric tiles in a responsive grid layout (3 tiles top row, 2 bottom row on desktop)
2. Metric tiles display:
   - Total MOCs (count of all user MOCs)
   - Total Pieces (sum of all pieces across user's collection)
   - MOCs Built (count of MOCs with status "completed")
   - MOCs Ready to Build (count of MOCs with 100% parts availability)
   - MOCs in Parts Collection (count of MOCs with status "collecting parts")
3. Each metric tile shows: label, numeric value, and optional icon
4. Backend API endpoint `/api/dashboard/metrics` aggregates data from the database and returns metric values
5. Frontend fetches metrics using RTK Query with automatic caching (5-minute TTL per NFR9)
6. Loading state displays skeleton tiles while metrics are being fetched
7. Empty state displays when user has zero MOCs with helpful message and CTA button to add first MOC
8. Error state displays user-friendly message if metrics fail to load, with retry option
9. Metric tiles use existing Radix UI Card component for consistent styling
10. Metrics update in real-time when user adds/updates MOCs (RTK Query cache invalidation)
11. API response time for metrics aggregation is <500ms with up to 2000 MOCs
12. Unit tests verify metric tile rendering with mock data
13. Integration test verifies API endpoint returns correct aggregated values
14. E2E test verifies: User with MOCs lands on dashboard → sees accurate metric values

### Story 1.4: Data Visualizations (Gauge, Pie Chart, Scatterplot)

**As a** user,
**I want** to see three data visualizations on the Overview tab,
**so that** I can analyze my collection through different analytical perspectives.

**Acceptance Criteria:**

1. The Overview tab displays three charts below the metric tiles in a 3-column layout (side-by-side on desktop)
2. **Gauge Chart** displays part acquisition progress for the active MOC:
   - Shows 0-100% completion based on parts availability
   - Displays MOC name/title
   - Uses Recharts RadialBarChart or similar gauge component
   - If no active MOC is set, displays "No active MOC" message with option to designate one
3. **Pie/Doughnut Chart** displays theme breakdown:
   - Shows percentage distribution of MOCs by theme
   - Each theme segment has distinct color from design system
   - Legend displays theme names and percentages
   - Handles up to 15 themes gracefully (smaller themes grouped into "Other" if needed)
4. **Scatterplot** displays price vs. piece count:
   - X-axis: Piece count, Y-axis: Total cost
   - Shape encoding: Triangle = Official Set, Circle = MOC
   - Color encoding: Based on status (Purchased/Built/Collecting Parts)
   - Static visualization (non-interactive for v1)
   - Legend explains shape and color encoding
5. Backend API endpoint `/api/dashboard/visualizations` provides data for all three charts
6. Charts use Recharts library with TypeScript types
7. Each chart displays loading state (skeleton or spinner) while data is fetched
8. Each chart displays empty state when insufficient data (e.g., "Add MOCs to see theme breakdown")
9. Charts are responsive and resize appropriately on different screen sizes
10. Chart rendering performance: <300ms per chart (meets performance budget)
11. Charts use accessible color palettes with sufficient contrast (WCAG AA)
12. Unit tests verify chart data transformation logic
13. Integration test verifies visualization API endpoint returns correctly formatted data
14. Visual regression test captures chart screenshots to prevent UI breakage

### Story 1.5: Active MOC Designation and Management

**As a** user,
**I want** to designate one MOC as "active" for the gauge chart,
**so that** I can track my progress on my current building project.

**Acceptance Criteria:**

1. The system automatically sets the most recently marked "collecting parts" MOC as the active MOC
2. Users can manually designate any MOC as active via a "Set as Active" action in MOC context menu or detail view
3. Only one MOC can be active at a time (setting new active MOC unsets previous one)
4. The active MOC is persisted in the database (user_preferences table or MOC status field)
5. The gauge chart displays the active MOC's name and part acquisition percentage
6. If no active MOC exists and user has MOCs in "collecting parts" status, system prompts user to designate one
7. If user has no MOCs, gauge chart displays empty state with CTA to add first MOC
8. Backend API endpoint `/api/dashboard/active-moc` supports GET (retrieve) and PUT (update) operations
9. Changing active MOC invalidates RTK Query cache and updates gauge chart immediately
10. Unit tests verify active MOC designation logic
11. Integration test verifies active MOC persists across sessions

### Story 1.6: Clickable Metric Navigation to Filtered Views

**As a** user,
**I want** to click on metric tiles to navigate to filtered gallery views,
**so that** I can quickly drill into specific segments of my collection.

**Acceptance Criteria:**

1. Clicking "Total MOCs" tile navigates to MOC Gallery showing all MOCs
2. Clicking "MOCs Built" tile navigates to MOC Gallery filtered by status="completed"
3. Clicking "MOCs Ready to Build" tile navigates to MOC Gallery filtered by parts availability=100%
4. Clicking "MOCs in Parts Collection" tile navigates to MOC Gallery filtered by status="collecting parts"
5. Clicking "Total Pieces" tile does not navigate (displays tooltip: "View breakdown in visualizations below")
6. Metric tiles have hover state indicating clickability (cursor pointer, subtle background change)
7. Metric tiles have focus state for keyboard navigation
8. Navigation preserves filter state in URL query parameters (e.g., `/dashboard/galleries?filter=completed`)
9. Users can return to Overview tab and previous filters are cleared
10. Metric tile click tracking is logged for analytics (optional, if analytics infrastructure exists)
11. Integration test verifies clicking each metric tile navigates to correct filtered view
12. E2E test verifies: User clicks "MOCs Built" tile → lands on Galleries tab → sees only completed MOCs

---

## Epic 2: Gallery System & Content Management

**Expanded Goal:**
Enable comprehensive browsing, organization, and management of all content types (MOCs, official LEGO sets, and inspiration images) through a robust gallery system. This epic delivers four distinct gallery views with multiple display modes (grid, masonry, data table), powerful search and filtering capabilities, and smart URL ingestion for frictionless content addition. By the end of this epic, users can browse their entire collection, discover specific items through search and filters, switch between visualization modes based on their task, and quickly add new content by simply pasting URLs from LEGO.com, BrickLink, or Rebrickable.

### Story 2.1: Galleries Tab Structure and MOC Gallery Foundation

**As a** user,
**I want** to access a Galleries tab that displays my MOCs,
**so that** I can browse and manage my LEGO MOC collection.

**Acceptance Criteria:**

1. The Galleries tab displays a sub-navigation menu with four options: Recent 10, MOC Gallery, Sets Gallery, Inspiration Gallery
2. MOC Gallery is the default view when navigating to the Galleries tab
3. The MOC Gallery displays all user's MOCs in a grid layout (default view mode)
4. Each MOC card displays: thumbnail image, MOC name, piece count, status badge, and total cost (if available)
5. The gallery uses the existing gallery component from `@repo/gallery` or `@repo/moc-instructions` packages if applicable
6. Backend API endpoint `/api/mocs` supports pagination with query parameters: `page`, `limit`, `sort`, `filter`
7. Frontend fetches MOC data using RTK Query with 5-minute cache TTL
8. Loading state displays skeleton cards while MOCs are being fetched
9. The gallery is responsive and adjusts grid columns based on screen size (4 cols desktop, 3 tablet, 2 mobile)
10. Gallery rendering performance: <500ms for 50 items (meets performance budget)
11. Each MOC card is keyboard accessible and clickable to navigate to MOC detail view
12. Unit tests verify MOC card rendering with various data states
13. Integration test verifies API endpoint returns paginated MOC data
14. E2E test verifies: User navigates to Galleries tab → sees MOC Gallery with all MOCs

### Story 2.2: Gallery View Modes (Grid, Masonry, Data Table)

**As a** user,
**I want** to switch between grid, masonry, and data table view modes in the MOC and Sets galleries,
**so that** I can choose the visualization that best suits my current task (browsing vs. detailed comparison).

**Acceptance Criteria:**

1. The MOC Gallery and Sets Gallery display a view mode toggle with three options: Grid, Masonry, Table
2. Grid view displays MOCs in a uniform grid with equal-sized cards (existing behavior from Story 2.1)
3. Masonry view displays MOCs in a Pinterest-style masonry layout with variable card heights based on image aspect ratios
4. Table view displays MOCs in a data table with columns: Thumbnail, Name, Set/MOC Number, Theme, Piece Count, Status, Total Cost
5. The view mode toggle uses icon buttons (grid icon, masonry icon, table icon) for compact UI
6. The active view mode has visual indication (highlighted icon)
7. Switching view modes updates the display immediately without refetching data
8. The selected view mode is stored in user preferences (persisted across sessions per FR4)
9. Masonry layout uses a masonry library (e.g., `react-masonry-css`) or CSS grid masonry when browser support allows
10. Table view supports column sorting (clicking column header sorts by that column)
11. Table view is responsive: collapses to card view on mobile screens
12. View mode switching occurs within 200ms (meets NFR8)
13. Unit tests verify each view mode renders correctly with mock data
14. Integration test verifies view mode preference persists across page reloads

### Story 2.3: Gallery Search Functionality

**As a** user,
**I want** to search my galleries by name, set/MOC number, or theme,
**so that** I can quickly find specific items in my collection.

**Acceptance Criteria:**

1. The MOC Gallery and Sets Gallery display a search input field above the gallery content
2. Users can search by: MOC/set name, set/MOC number, or theme
3. Search is case-insensitive and supports partial matching (e.g., "castle" matches "Medieval Castle" and "Castle Gate")
4. Search executes as user types with 300ms debounce to prevent excessive API calls
5. Backend API endpoint `/api/mocs` supports `search` query parameter that searches across name, number, and theme fields
6. Search results update the gallery display in real-time
7. Search input has clear button (X icon) to reset search and show all items
8. Search input displays placeholder text: "Search by name, number, or theme..."
9. If search returns zero results, display empty state: "No items found for '[search term]'" with option to clear search
10. Search state is preserved in URL query parameter (e.g., `?search=castle`) for shareable links
11. Search input is keyboard accessible with focus state
12. Search performance: <500ms response time for searches on collections up to 2000 items
13. Unit tests verify search debouncing and input handling
14. Integration test verifies search API returns correct filtered results
15. E2E test verifies: User types in search → sees filtered results → clears search → sees all items

### Story 2.4: Gallery Filtering Functionality

**As a** user,
**I want** to filter my galleries by status, theme, and other attributes,
**so that** I can narrow down my collection to specific segments.

**Acceptance Criteria:**

1. The MOC Gallery displays filter controls with options:
   - Status: All, Completed, Collecting Parts, Ready to Build, Wishlist
   - Theme: All, [user's themes with autocomplete]
   - Type: All, Official Set, MOC
2. Users can apply multiple filters simultaneously (e.g., "Star Wars" theme + "Completed" status)
3. Filter controls use Radix UI Select or Checkbox Group components for accessibility
4. Backend API endpoint `/api/mocs` supports filter query parameters: `status`, `theme`, `type`
5. Filtered results update the gallery display immediately
6. Filter state is preserved in URL query parameters (e.g., `?status=completed&theme=Star Wars`)
7. Active filters display as removable chips/tags above the gallery (e.g., "Status: Completed [X]")
8. Clicking filter chip removes that filter
9. "Clear All Filters" button resets all filters to default (All)
10. If filters return zero results, display empty state with helpful message and option to adjust filters
11. Filters work in combination with search (both applied simultaneously)
12. Filter performance: <500ms response time for filter operations
13. Unit tests verify filter logic and UI state updates
14. Integration test verifies API returns correctly filtered results with multiple filters
15. E2E test verifies: User applies filters → sees filtered results → removes filter → sees updated results

### Story 2.5: Gallery Sorting Functionality

**As a** user,
**I want** to sort my galleries by added date, release date, piece count, or cost,
**so that** I can organize my collection based on different criteria.

**Acceptance Criteria:**

1. The MOC Gallery and Sets Gallery display a sort control with options:
   - Added Date (newest/oldest)
   - Release Date (for Sets) / Creation Date (for MOCs) (newest/oldest)
   - Piece Count (high to low / low to high)
   - Total Cost (high to low / low to high)
2. Sort control uses Radix UI Select component with label "Sort by:"
3. Default sort is "Added Date (newest)" when user first loads gallery
4. Backend API endpoint `/api/mocs` supports `sort` and `order` query parameters
5. Changing sort order updates the gallery display immediately
6. Sort state is preserved in URL query parameters (e.g., `?sort=pieceCount&order=desc`)
7. Sort state is stored in user preferences (persisted across sessions per FR4)
8. Sort order indicator displays in the sort dropdown (e.g., "Piece Count ↓")
9. Sort works in combination with search and filters
10. Sorting performance: <500ms response time for sort operations on up to 2000 items
11. Table view mode: clicking column headers also triggers sorting by that column
12. Unit tests verify sort logic and state management
13. Integration test verifies API returns correctly sorted results
14. E2E test verifies: User changes sort → sees reordered results → preference persists on reload

### Story 2.6: Gallery Pagination and Controls

**As a** user,
**I want** to navigate through my gallery using pagination or infinite scroll,
**so that** I can browse large collections without performance degradation.

**Acceptance Criteria:**

1. The MOC Gallery and Sets Gallery display pagination controls by default (per FR14)
2. Pagination controls show: Previous button, page numbers (with ellipsis for large page counts), Next button
3. Default page size is 50 items with user-configurable dropdown options: 25, 50, 100, 200
4. Page size selection is stored in user preferences (persisted across sessions)
5. Current page number is displayed and highlighted in pagination controls
6. Pagination state is preserved in URL query parameters (e.g., `?page=3&limit=50`)
7. Users can optionally toggle to infinite scroll mode via settings or gallery controls
8. Infinite scroll loads 50 items per batch when user scrolls near bottom (200px threshold)
9. Infinite scroll displays loading indicator while fetching next batch
10. Infinite scroll mode preference is stored in user preferences
11. Both pagination and infinite scroll modes work correctly with search, filters, and sort
12. Backend API supports offset-based pagination via `page` and `limit` parameters
13. Pagination controls are keyboard accessible (arrow keys navigate pages, Enter activates)
14. Performance: Page navigation completes within 500ms
15. Unit tests verify pagination logic and infinite scroll trigger
16. Integration test verifies API returns correct page data
17. E2E test verifies: User navigates pages → sees correct items per page → changes page size → sees updated results

### Story 2.7: Sets Gallery Implementation

**As a** user,
**I want** to browse my official LEGO sets in a dedicated Sets Gallery,
**so that** I can manage my collection of official sets separately from custom MOCs.

**Acceptance Criteria:**

1. The Sets Gallery displays all user's official LEGO sets
2. Each set card displays: thumbnail image, set number, set name, theme, piece count, release year, and total cost (if available)
3. The Sets Gallery supports all view modes: grid, masonry, and data table (reuses components from Story 2.2)
4. The Sets Gallery supports search by set name, set number, or theme (reuses component from Story 2.3)
5. The Sets Gallery supports filtering by: theme, release year range, ownership status (owned, wishlist)
6. The Sets Gallery supports sorting by: added date, release date, piece count, total cost (per FR10)
7. Backend API endpoint `/api/sets` provides set data with pagination, search, filter, and sort support
8. The Sets Gallery uses the same pagination/infinite scroll controls as MOC Gallery (Story 2.6)
9. Empty state displays when user has zero sets with CTA to add first set
10. Sets Gallery maintains separate user preferences from MOC Gallery (view mode, sort, page size)
11. Sets are visually distinguished from MOCs (e.g., "Official Set" badge or icon)
12. Unit tests verify Sets Gallery renders correctly with set data
13. Integration test verifies `/api/sets` endpoint returns correct data
14. E2E test verifies: User navigates to Sets Gallery → sees all sets → applies filters/search → sees filtered results

### Story 2.8: Inspiration Gallery with Metadata Support

**As a** user,
**I want** to save and organize inspiration images in a dedicated Inspiration Gallery,
**so that** I can curate ideas for future builds and reference them later.

**Acceptance Criteria:**

1. The Inspiration Gallery displays all user-uploaded inspiration images
2. The Inspiration Gallery uses a masonry layout optimized for images (Pinterest-style)
3. Each inspiration card displays: image thumbnail, optional title/description overlay on hover
4. Clicking an inspiration card opens a detail modal/view showing:
   - Full-size image
   - Source URL (if provided)
   - Notes/description
   - Tags
   - Associated MOC (if linked to a planned/wishlist MOC)
   - Edit and Delete buttons
5. The Inspiration Gallery supports search by tags or description text
6. The Inspiration Gallery supports filtering by: tags, associated MOC status (linked/unlinked)
7. Users can add inspiration images via upload or URL
8. Users can add metadata when uploading: source URL, notes/description, tags, associated MOC
9. Backend API endpoint `/api/inspiration` supports CRUD operations for inspiration images
10. Images are stored in existing S3 bucket with thumbnails generated (reuse existing image processing pipeline)
11. Empty state displays when user has zero inspiration images with CTA to add first image
12. Inspiration Gallery supports pagination (default page size 50)
13. Image upload supports common formats: JPG, PNG, WebP (max 10MB per FR or existing image constraints)
14. Unit tests verify inspiration card rendering and metadata display
15. Integration test verifies inspiration image CRUD operations
16. E2E test verifies: User uploads inspiration image → adds metadata → sees image in gallery → searches by tag → finds image

### Story 2.9: Recent 10 MOCs Component

**As a** user,
**I want** to see my 10 most recently added or updated MOCs,
**so that** I can quickly access my current projects and recent activity.

**Acceptance Criteria:**

1. The Recent 10 view displays the 10 most recently added or updated MOCs in list format
2. Each list item displays: thumbnail (small), MOC name, status badge, last updated date, and quick action buttons (View, Edit)
3. Items are sorted by most recent activity first (added date or last updated date, whichever is newer)
4. The list is compact and scannable (optimized for quick access, not detailed browsing)
5. Clicking a list item navigates to the MOC detail view
6. If user has fewer than 10 MOCs, display all available MOCs
7. Empty state displays when user has zero MOCs with CTA to add first MOC
8. Backend API endpoint `/api/mocs/recent` returns the 10 most recent MOCs
9. Frontend fetches recent MOCs using RTK Query with 5-minute cache TTL
10. Loading state displays skeleton list items while data is fetching
11. The Recent 10 view does not support search, filters, or sorting (it's a fixed "most recent" list)
12. Recent 10 view is accessible via Galleries tab sub-navigation
13. Unit tests verify Recent 10 component renders correctly
14. Integration test verifies API returns 10 most recent MOCs in correct order
15. E2E test verifies: User adds new MOC → navigates to Recent 10 → sees new MOC at top of list

### Story 2.10: Floating Action Button (FAB) for Adding MOCs/Sets

**As a** user,
**I want** a persistent "Add" button accessible from anywhere on the dashboard,
**so that** I can quickly add new MOCs or Sets without navigating away from my current view.

**Acceptance Criteria:**

1. A Floating Action Button (FAB) displays in the bottom-right corner of all dashboard tabs
2. The FAB displays a "+" icon with tooltip "Add MOC/Set" on hover
3. Clicking the FAB opens a modal or dropdown with two options: "Add MOC" and "Add Set"
4. Selecting "Add MOC" opens the MOC creation modal/form
5. Selecting "Add Set" opens the Set creation modal/form
6. The FAB remains fixed in position when scrolling (CSS position: fixed)
7. The FAB is responsive: displays on desktop and tablet, optionally hidden on small mobile screens if space is constrained
8. The FAB has sufficient contrast and shadow to stand out from page content (meets WCAG AA)
9. The FAB is keyboard accessible (Tab to focus, Enter to activate, arrow keys to navigate dropdown)
10. The FAB uses Radix UI DropdownMenu for the "Add MOC/Set" options
11. Clicking outside the FAB dropdown closes it
12. The FAB z-index ensures it appears above all other content but below modals
13. Unit tests verify FAB rendering and click handling
14. E2E test verifies: User clicks FAB → selects "Add MOC" → sees MOC creation form

### Story 2.11: Smart URL Ingestion for MOCs and Sets

**As a** user,
**I want** to paste URLs from LEGO.com, BrickLink, or Rebrickable to automatically import MOC/set data,
**so that** I can add content without manually entering all details.

**Acceptance Criteria:**

1. The MOC and Set creation forms include a "Import from URL" field at the top
2. Supported URLs: LEGO.com (official sets), BrickLink (MOCs and sets), Rebrickable (alternate builds)
3. When user pastes a URL and clicks "Import" or presses Enter, the system validates the URL format
4. If URL is valid and supported, backend service extracts:
   - Set/MOC name
   - Set/MOC number
   - Piece count
   - Theme
   - Price (if available)
   - Images (primary image and thumbnails)
   - Instruction PDF URL (if available)
5. Extraction happens in background with progress indicator: "Importing from [source]..."
6. Upon successful extraction, form fields are auto-populated with extracted data
7. User can review and edit any auto-populated fields before saving
8. If extraction fails, display error message specifying reason: "Unsupported URL format", "Unable to extract data from [source]", "Network timeout - please try again"
9. Partial extraction is supported: if some fields cannot be extracted, populate available fields and allow manual completion with warning: "Some fields could not be auto-filled. Please complete manually."
10. Backend service uses web scraping (Cheerio/jsdom) or official APIs where available
11. Extracted images are downloaded and stored in S3 bucket
12. Extracted instruction PDFs are downloaded and stored in S3 bucket (if available)
13. URL ingestion respects rate limits for external sources (implement retry with exponential backoff if rate limited)
14. Backend API endpoint `/api/ingest-url` accepts URL and returns extracted data
15. Frontend uses RTK Query mutation for URL ingestion with loading/error states
16. Unit tests verify URL validation logic
17. Integration test verifies extraction service returns correct data for sample URLs from each source
18. E2E test verifies: User pastes LEGO.com URL → clicks Import → sees form auto-populated → saves MOC successfully

---

## Epic 3: Financial Intelligence & Budget Tracking

**Expanded Goal:**
Provide comprehensive financial transparency and budget management capabilities through a parts pricing database, cost-to-build calculations, and spending analytics. This epic delivers the major differentiator feature that transforms the platform from a simple organizer to a financial advisor for LEGO enthusiasts. By the end of this epic, users can understand the true cost of their collection, calculate what it would cost to build any MOC, track their monthly LEGO spending against a budget, and see spending breakdowns by theme. The automated parts pricing infrastructure ensures cost data stays current without manual updates.

### Story 3.1: Parts Database Schema and Infrastructure

**As a** developer,
**I want** a parts database with pricing information from multiple vendors,
**so that** the system can calculate accurate cost-to-build estimates for MOCs.

**Acceptance Criteria:**

1. Database migration creates `parts_pricing` table with columns:
   - `part_id` (string, primary key or foreign key to parts catalog)
   - `vendor` (enum: BrickLink, BrickOwl, etc.)
   - `price` (decimal, precision for currency)
   - `currency` (string, default USD)
   - `last_updated` (timestamp)
   - `availability` (enum: In Stock, Out of Stock, Limited - optional for future)
2. Database indexes created on: `part_id`, `vendor`, `last_updated` for query performance
3. Database migration creates `parts` table (if not exists) with columns:
   - `part_id` (string, primary key)
   - `part_number` (string, LEGO official part number)
   - `part_name` (string)
   - `category` (string, e.g., "Brick", "Plate", "Slope")
   - `color` (string)
4. The schema supports multiple vendor prices per part (one-to-many relationship)
5. Backend includes Drizzle ORM schema definitions for new tables following existing patterns
6. Migration follows existing naming convention: `NNNN_add_parts_pricing_tables.sql`
7. Migration is reversible (includes DOWN migration to drop tables)
8. Database constraints ensure data integrity (NOT NULL on required fields, valid enums)
9. Documentation added to architecture docs explaining parts pricing data model
10. Unit tests verify Drizzle schema definitions are correct
11. Integration test verifies migrations run successfully and create expected tables

### Story 3.2: Parts Pricing Scraper Service

**As a** system administrator,
**I want** an automated service that scrapes parts pricing from BrickLink and BrickOwl,
**so that** cost data stays current without manual updates.

**Acceptance Criteria:**

1. Backend service implemented in `apps/api/lego-projects-api/src/services/pricing-scraper.ts`
2. Service supports scraping from two vendors: BrickLink and BrickOwl
3. Service uses official APIs where available, falls back to web scraping (Cheerio/jsdom) if necessary
4. Scraper implements rate limiting to respect vendor API limits (configurable via environment variables)
5. Scraper implements retry logic with exponential backoff for failed requests (max 3 retries)
6. Scraper logs all operations using Winston: successful scrapes, failures, rate limit hits
7. For each part, scraper fetches current price and availability from both vendors
8. Scraper stores pricing data in `parts_pricing` table with timestamp
9. Scraper updates existing price records (upsert logic) rather than creating duplicates
10. Scraper handles errors gracefully: network timeouts, invalid responses, missing data
11. Scraper provides summary statistics after run: parts updated, failures, duration
12. Service can be invoked manually via API endpoint `/api/admin/pricing/scrape` (admin only)
13. Environment variables configure: vendor API keys, rate limits, scraper schedule
14. Unit tests verify scraper logic with mocked API responses
15. Integration test verifies scraper updates database with sample part data
16. Error handling test verifies scraper handles API failures gracefully

### Story 3.3: Pricing Scraper Cron Job Scheduling

**As a** system,
**I want** the pricing scraper to run automatically on a daily schedule,
**so that** parts pricing data is refreshed without manual intervention.

**Acceptance Criteria:**

1. Cron job configured to run pricing scraper service daily at 2:00 AM UTC (off-peak hours)
2. Cron job uses existing infrastructure (Docker Compose cron service or AWS EventBridge in production)
3. Cron job execution is logged: start time, end time, success/failure status
4. Cron job failures trigger alerts (email or monitoring system notification) for administrators
5. Environment variable `PRICING_SCRAPER_SCHEDULE` allows schedule customization (default: daily)
6. Cron job can be disabled via environment variable `PRICING_SCRAPER_ENABLED=false`
7. Cron job includes timeout protection (max 2 hours execution time)
8. Cron job locks prevent concurrent runs (if previous run is still executing, skip new run)
9. Cron job summary includes: parts scraped, pricing updates, failures, duration
10. Documentation added to deployment docs explaining cron job setup and configuration
11. Local development includes `pnpm scrape:pricing` command to trigger scraper manually
12. Integration test verifies cron job can be triggered and executes successfully

### Story 3.4: Price Aggregation and Conflict Resolution

**As a** system,
**I want** to resolve pricing conflicts when multiple vendors report different prices,
**so that** cost calculations use accurate and consistent pricing data.

**Acceptance Criteria:**

1. Backend service implements price aggregation logic in `src/services/pricing-aggregator.ts`
2. When multiple vendor prices exist for a part, system calculates average price
3. Average calculation excludes outliers (prices >2 standard deviations from mean) to prevent skewed data
4. If only one vendor has pricing data, use that vendor's price (no averaging needed)
5. If no vendor has pricing data, return `null` and flag part as "Price unavailable"
6. Aggregated prices are cached in Redis (5-minute TTL) to reduce database queries
7. Backend API endpoint `/api/parts/:partId/price` returns aggregated price for a part
8. API response includes: `price`, `currency`, `vendor_count`, `last_updated`, `availability_status`
9. Price aggregation logic is reusable across different features (cost-to-build, budget tracking)
10. Price aggregation handles currency conversion if needed (future-proofing, default to USD for MVP)
11. Unit tests verify averaging logic with various vendor price scenarios
12. Unit tests verify outlier detection and exclusion
13. Integration test verifies API returns correct aggregated price for sample parts

### Story 3.5: Cost-to-Build Calculator

**As a** user,
**I want** to see the estimated cost-to-build for any MOC,
**so that** I can make informed purchasing decisions before starting a project.

**Acceptance Criteria:**

1. Each MOC displays an estimated "Cost to Build" field calculated from parts pricing data
2. Cost calculation sums: (part price × quantity) for all parts in the MOC's parts list
3. If a part has no pricing data, it is excluded from calculation with a warning count: "N parts missing pricing data"
4. Cost display format: `$XXX.XX (USD)` with disclaimer: "Estimated based on current market prices"
5. Cost display includes breakdown tooltip on hover: "Based on N parts from M vendors. Last updated: [date]"
6. Backend API endpoint `/api/mocs/:mocId/cost` calculates and returns cost-to-build
7. Cost calculation uses price aggregation service (Story 3.4) for each part
8. Cost is recalculated when:
   - User updates MOC parts list
   - Pricing data is refreshed (daily via cron job)
9. Calculated cost is cached in Redis (1-hour TTL) to improve performance
10. MOC card in galleries displays cost badge: "~$XXX to build"
11. MOC detail view displays full cost breakdown with option to expand and see per-part pricing
12. Scatterplot on Overview tab uses cost-to-build data for Y-axis
13. If MOC has no parts list, display "Parts list required to calculate cost"
14. Unit tests verify cost calculation logic with various parts lists
15. Integration test verifies API returns correct cost for sample MOC
16. E2E test verifies: User views MOC → sees estimated cost-to-build

### Story 3.6: Budget Tab UI and Monthly Budget Settings

**As a** user,
**I want** to set a monthly LEGO budget and track my spending against it,
**so that** I can manage my hobby expenses responsibly.

**Acceptance Criteria:**

1. The Budget tab displays a budget management interface
2. The top section includes a "Monthly Budget" input field where users can set their budget amount
3. Budget input validates: positive numbers only, currency format ($XXX.XX)
4. Budget amount is saved to database (`user_budgets` table) when user clicks "Save" or input loses focus
5. Budget setting persists across sessions (per user preferences)
6. If user has not set a budget, display prompt: "Set your monthly budget to start tracking spending"
7. The Budget tab displays current month spending summary:
   - Budgeted amount
   - Actual spending (sum of spending events for current month)
   - Remaining budget (budgeted - actual)
   - Percentage used (visual indicator: green if <80%, yellow if 80-100%, red if >100%)
8. Backend API endpoint `/api/budget/settings` supports GET and PUT for budget amount
9. Backend API endpoint `/api/budget/summary` returns current month spending summary
10. Budget data is fetched using RTK Query with 5-minute cache TTL
11. Loading state displays while budget data is being fetched
12. The Budget tab uses Radix UI components for inputs and visual indicators
13. Unit tests verify budget input validation and save logic
14. Integration test verifies budget settings are persisted correctly
15. E2E test verifies: User sets monthly budget → sees budget saved → navigates away → returns → sees persisted budget

### Story 3.7: Spending Events Tracking

**As a** user,
**I want** to log my LEGO purchases as spending events,
**so that** the system can track my actual spending against my budget.

**Acceptance Criteria:**

1. Users can manually log spending events via "Log Purchase" button on Budget tab
2. Logging spending event opens a modal with fields:
   - Date (default: today, user can change)
   - Amount (required, positive number)
   - Description (optional, e.g., "BrickLink order #12345")
   - Theme/category (optional, dropdown with user's themes)
   - Associated MOC/Set (optional, link to specific MOC or set)
3. Spending event is saved to database (`spending_events` table) with columns:
   - `event_id` (UUID, primary key)
   - `user_id` (foreign key)
   - `date` (date)
   - `amount` (decimal)
   - `description` (text)
   - `theme` (string, nullable)
   - `moc_id` (foreign key, nullable)
   - `created_at` (timestamp)
4. Backend API endpoint `/api/budget/spending` supports POST (create), GET (list), DELETE (remove)
5. The Budget tab displays a spending history table showing recent spending events
6. Spending history table columns: Date, Description, Theme, Amount, Actions (Delete)
7. Users can delete spending events via trash icon in Actions column
8. Deleting spending event updates budget summary immediately (RTK Query cache invalidation)
9. Spending events are included in budget summary calculations
10. Alternative: Spending events can be auto-created when users mark MOC as "Purchased" (if MOC has cost data)
11. Unit tests verify spending event CRUD operations
12. Integration test verifies spending events are persisted and affect budget summary
13. E2E test verifies: User logs spending event → sees updated budget summary → deletes event → sees summary recalculated

### Story 3.8: Budget Spending Visualization (Bar Graph)

**As a** user,
**I want** to see a bar graph comparing my budgeted vs. actual spending,
**so that** I can quickly understand my spending patterns at a glance.

**Acceptance Criteria:**

1. The Budget tab displays a bar graph below the budget summary
2. Graph displays grouped bars for each month (last 6 months or current year)
3. Each month shows two bars side-by-side:
   - Budgeted amount (e.g., blue bar)
   - Actual spending (e.g., green bar if under budget, red bar if over budget)
4. Y-axis: dollar amount ($0 to max of highest budget or spending value)
5. X-axis: months (e.g., "Jan", "Feb", "Mar"...)
6. Graph includes legend explaining bar colors
7. Hovering over a bar displays tooltip: "[Month]: $XXX budgeted / $YYY spent"
8. Graph uses Recharts BarChart component
9. Graph is responsive and resizes on different screen sizes
10. Backend API endpoint `/api/budget/history` returns monthly budget vs. spending data
11. Graph displays empty state if user has no spending history: "Log your first purchase to see spending trends"
12. Graph rendering performance: <300ms (meets chart performance budget)
13. Unit tests verify graph data transformation logic
14. Integration test verifies API returns correct monthly data
15. Visual regression test captures graph screenshot

### Story 3.9: Budget Spending Breakdown by Theme

**As a** user,
**I want** to see my spending broken down by theme,
**so that** I can understand which categories consume most of my budget.

**Acceptance Criteria:**

1. The Budget tab displays a theme breakdown section below the bar graph
2. Theme breakdown shows spending for current month grouped by theme/category
3. Display format: grouped bar chart or stacked bar chart showing:
   - Each theme's budgeted allocation (if user sets per-theme budgets, optional for MVP)
   - Each theme's actual spending
   - Variance (over/under budget per theme)
4. Themes without spending are excluded from the visualization
5. If user has not categorized spending events by theme, display message: "Add themes to spending events to see breakdown"
6. The breakdown includes a "Total" row summing all theme spending
7. Backend API endpoint `/api/budget/breakdown` returns spending grouped by theme
8. The breakdown uses Recharts or a simple table with visual progress bars
9. Theme breakdown updates when spending events are added/deleted (RTK Query invalidation)
10. Unit tests verify theme aggregation logic
11. Integration test verifies API returns correct theme breakdown data
12. E2E test verifies: User logs spending with theme → sees theme in breakdown → spending amount reflected correctly

### Story 3.10: Price Unavailable Handling and Warnings

**As a** user,
**I want** to see clear warnings when pricing data is unavailable for parts,
**so that** I understand that cost calculations may be incomplete.

**Acceptance Criteria:**

1. When calculating cost-to-build for a MOC, the system tracks how many parts have no pricing data
2. If any parts lack pricing, display warning badge next to cost: "⚠ Partial estimate - N parts missing prices"
3. Hovering over warning badge shows tooltip listing affected part IDs or categories
4. In MOC detail view's cost breakdown, parts without pricing display: "Part #XXXX: Price unavailable"
5. In the scatterplot on Overview tab, MOCs with incomplete cost data are rendered with lower opacity or dashed outline
6. Backend API response for cost calculation includes: `total_cost`, `parts_with_pricing`, `parts_without_pricing`, `pricing_coverage_percentage`
7. If pricing coverage is <50%, display stronger warning: "Cost estimate may be inaccurate - less than half of parts have pricing data"
8. The Budget tab displays a notification if many MOCs have incomplete pricing: "Run pricing scraper to update parts database"
9. Admin users (if role exists) can trigger manual pricing scraper run via Budget tab
10. Parts without pricing are excluded from cost calculations but counted in warnings
11. Unit tests verify warning logic triggers correctly based on pricing coverage
12. E2E test verifies: User views MOC with missing part prices → sees warning badge → hovers to see details

---

## Epic 4: Activity Timeline & User Preferences

**Expanded Goal:**
Enable comprehensive activity review and persistent user preferences to create an optimized, personalized dashboard experience. This epic delivers the Activity tab where users can review their complete LEGO journey through a filterable timeline, and ensures that user preferences (default tabs, view modes, sort orders) persist across sessions for a seamless, customized experience. By the end of this epic, the dashboard provides both historical context (what have I done?) and personalized efficiency (remembers how I like to work), completing the transformation from generic tool to personalized command center.

### Story 4.1: Activity Timeline Foundation and Data Model

**As a** developer,
**I want** an activity tracking system that logs user actions,
**so that** the system can display a comprehensive timeline of user activity.

**Acceptance Criteria:**

1. Database migration creates `activity_events` table with columns:
   - `event_id` (UUID, primary key)
   - `user_id` (foreign key)
   - `event_type` (enum: Added, Built, Updated, Deleted, Purchased, Wishlisted, etc.)
   - `entity_type` (enum: MOC, Set, Inspiration, Budget)
   - `entity_id` (UUID, foreign key to MOC/Set/etc.)
   - `event_data` (JSONB, flexible storage for event-specific metadata)
   - `timestamp` (timestamp with timezone)
2. Database indexes created on: `user_id`, `timestamp`, `event_type`, `entity_type` for query performance
3. Backend service `src/services/activity-tracker.ts` provides methods to log activity events
4. Activity logging is integrated into existing CRUD operations:
   - Creating MOC/Set → logs "Added" event
   - Updating MOC/Set → logs "Updated" event
   - Deleting MOC/Set → logs "Deleted" event
   - Marking MOC as built → logs "Built" event
   - Logging spending → logs "Purchased" event
5. Activity logging is non-blocking (uses async/background jobs) to prevent slowing down user actions
6. Activity logging failures do not break core functionality (graceful degradation)
7. Backend API endpoint `/api/activity` supports GET with query parameters: `limit`, `offset`, `event_type`, `entity_type`, `start_date`, `end_date`
8. Migration follows existing naming convention: `NNNN_add_activity_tracking.sql`
9. Unit tests verify activity logging logic
10. Integration test verifies activity events are persisted correctly
11. Documentation added explaining activity tracking system and event types

### Story 4.2: Activity Tab UI and Timeline Display

**As a** user,
**I want** to see a scrollable timeline of my LEGO activities on the Activity tab,
**so that** I can review my building journey and find past actions.

**Acceptance Criteria:**

1. The Activity tab displays a scrollable, chronological timeline of activity events
2. Timeline displays events in reverse chronological order (most recent first)
3. Each timeline event card displays:
   - Event icon (based on event_type: plus icon for "Added", checkmark for "Built", etc.)
   - Event type and description (e.g., "Added Medieval Castle MOC")
   - Entity name with clickable link to detail view
   - Timestamp (relative format: "2 hours ago", "3 days ago", or absolute: "Jan 15, 2025")
   - Optional thumbnail image for MOC/Set events
4. Timeline uses infinite scroll loading 50 events per batch (per FR17)
5. Loading indicator displays while fetching next batch of events
6. Empty state displays when user has no activity: "Your activity will appear here as you add and manage your collection"
7. Backend API provides paginated activity data via `/api/activity?limit=50&offset=0`
8. Frontend fetches activity using RTK Query with 5-minute cache TTL
9. Timeline is responsive and adjusts layout for different screen sizes
10. Timeline events are keyboard accessible (can tab through events, Enter opens linked entity)
11. Unit tests verify timeline component renders various event types correctly
12. Integration test verifies API returns paginated activity data
13. E2E test verifies: User navigates to Activity tab → sees timeline → scrolls to load more events

### Story 4.3: Activity Timeline Filtering

**As a** user,
**I want** to filter the activity timeline by event type and date range,
**so that** I can find specific activities or review particular time periods.

**Acceptance Criteria:**

1. The Activity tab displays filter controls above the timeline
2. Filter options include:
   - **Event Type**: All, Added, Built, Updated, Deleted, Purchased, Wishlisted (multi-select checkboxes)
   - **Entity Type**: All, MOCs, Sets, Inspiration, Budget (multi-select checkboxes)
   - **Date Range**: Custom date picker (start date and end date) with quick presets: Today, Last 7 Days, Last 30 Days, This Month, This Year, All Time
3. Filters use Radix UI components (Checkbox, Popover for date picker)
4. Applying filters updates the timeline immediately with filtered results
5. Filter state is preserved in URL query parameters (e.g., `?event_type=Added,Built&date_range=last30days`)
6. Active filters display as removable chips/tags above the timeline
7. "Clear All Filters" button resets all filters to default (All)
8. If filters return zero results, display empty state: "No activity found for selected filters" with option to adjust filters
9. Backend API supports filter parameters: `event_type`, `entity_type`, `start_date`, `end_date`
10. Filter performance: <500ms response time for filtered queries
11. Filters work correctly with infinite scroll (fetches next batch with same filters applied)
12. Unit tests verify filter logic and UI state updates
13. Integration test verifies API returns correctly filtered activity data
14. E2E test verifies: User applies event type filter → sees filtered timeline → clears filter → sees all events

### Story 4.4: Activity Timeline Date Grouping

**As a** user,
**I want** activity events grouped by date periods (Today, Yesterday, This Week, etc.),
**so that** I can easily scan through my activity history chronologically.

**Acceptance Criteria:**

1. The Activity timeline groups events into date sections: "Today", "Yesterday", "This Week", "Last Week", "This Month", "[Month Name]", "[Year]"
2. Each date group displays a section header with the period label (e.g., "This Week")
3. Events within each group are sorted by timestamp (most recent first within the group)
4. Date grouping logic automatically determines appropriate grouping based on event timestamps
5. Older events (>1 year) are grouped by year only
6. Date section headers are visually distinct (e.g., sticky headers, bold text, background color)
7. Date section headers remain visible when scrolling (sticky position) for context
8. Date grouping is computed on the frontend to avoid complex backend logic
9. Empty date sections are not displayed (if no events in "Yesterday", skip that section)
10. Date grouping respects user's timezone (uses browser timezone for display)
11. Unit tests verify date grouping logic with various timestamp scenarios
12. Visual regression test captures timeline with date grouping

### Story 4.5: User Preferences Schema and API

**As a** developer,
**I want** a user preferences storage system,
**so that** user settings persist across sessions.

**Acceptance Criteria:**

1. Database migration creates `user_preferences` table with columns:
   - `user_id` (UUID, primary key and foreign key)
   - `default_dashboard_tab` (enum: Overview, Activity, Galleries, Budget - default: Overview)
   - `moc_gallery_view_mode` (enum: Grid, Masonry, Table - default: Grid)
   - `sets_gallery_view_mode` (enum: Grid, Masonry, Table - default: Grid)
   - `moc_gallery_sort` (string, e.g., "addedDate_desc")
   - `sets_gallery_sort` (string, e.g., "releaseDate_desc")
   - `gallery_page_size` (integer, default: 50)
   - `gallery_pagination_mode` (enum: Pagination, InfiniteScroll - default: Pagination)
   - `updated_at` (timestamp)
2. Backend API endpoint `/api/preferences` supports GET (retrieve all preferences) and PATCH (update specific preferences)
3. Preferences API uses partial update pattern (only send changed fields in PATCH request)
4. Preferences are loaded on dashboard mount and stored in Redux state for quick access
5. Preference updates trigger RTK Query cache invalidation to ensure fresh data
6. If user has no preferences record, system creates one with default values on first access
7. Backend includes Drizzle ORM schema definition for user_preferences table
8. Migration follows existing naming convention: `NNNN_add_user_preferences.sql`
9. Unit tests verify preferences CRUD operations
10. Integration test verifies preferences persist correctly across API calls

### Story 4.6: Default Dashboard Tab Preference

**As a** user,
**I want** to set which dashboard tab loads by default when I visit the dashboard,
**so that** I can land on my most frequently used view.

**Acceptance Criteria:**

1. Settings page (or inline on dashboard) includes "Default Dashboard Tab" dropdown with options: Overview, Activity, Galleries, Budget
2. Changing default tab saves preference to backend via `/api/preferences` PATCH request
3. When user navigates to `/dashboard` without a specific tab path, system redirects to user's default tab
4. Default tab preference persists across sessions and devices
5. If user navigates directly to a specific tab (e.g., `/dashboard/budget`), respect that navigation (don't force default tab)
6. Default tab selection displays current preference on page load
7. Changing default tab provides visual feedback: "Default tab updated" success message
8. Frontend stores preference in Redux state after update for immediate access
9. Unit tests verify default tab routing logic
10. E2E test verifies: User sets default tab to Budget → logs out → logs back in → lands on Budget tab

### Story 4.7: Gallery View Mode Persistence

**As a** user,
**I want** my selected gallery view mode (grid/masonry/table) to persist,
**so that** I don't have to re-select my preferred view each time I visit the gallery.

**Acceptance Criteria:**

1. When user switches gallery view mode (grid, masonry, table), the selection is saved to user preferences
2. MOC Gallery and Sets Gallery maintain separate view mode preferences
3. View mode preference saves automatically (debounced by 500ms to avoid excessive API calls)
4. On gallery page load, system applies user's saved view mode preference
5. If user has no saved preference, system uses default: Grid view
6. View mode preference updates via `/api/preferences` PATCH with field: `moc_gallery_view_mode` or `sets_gallery_view_mode`
7. Frontend stores preference in Redux state for instant view mode switching without API call
8. Preference sync happens in background (optimistic UI update, then backend save)
9. Unit tests verify view mode persistence logic
10. E2E test verifies: User switches to Masonry view → refreshes page → still sees Masonry view

### Story 4.8: Gallery Sort and Page Size Persistence

**As a** user,
**I want** my gallery sort order and page size preferences to persist,
**so that** the gallery displays my collection the way I prefer every time.

**Acceptance Criteria:**

1. When user changes gallery sort order, the selection is saved to user preferences
2. When user changes gallery page size (25/50/100/200), the selection is saved to user preferences
3. MOC Gallery and Sets Gallery maintain separate sort preferences
4. Both galleries share the same page size preference (single setting applies to all galleries)
5. On gallery page load, system applies user's saved sort and page size preferences
6. Default preferences: sort by "Added Date (newest)", page size 50
7. Sort preference saves automatically (debounced by 500ms)
8. Page size preference saves immediately (no debounce needed)
9. Preferences update via `/api/preferences` PATCH with fields: `moc_gallery_sort`, `sets_gallery_sort`, `gallery_page_size`
10. Frontend stores preferences in Redux state for instant access
11. Unit tests verify sort and page size persistence logic
12. E2E test verifies: User sets sort to "Piece Count (high to low)" and page size to 100 → refreshes page → sees same sort and page size

### Story 4.9: Pagination vs. Infinite Scroll Preference

**As a** user,
**I want** to choose between pagination and infinite scroll for gallery browsing,
**so that** I can use the navigation pattern I prefer.

**Acceptance Criteria:**

1. Settings page or gallery controls include toggle: "Gallery Navigation Mode" with options: Pagination, Infinite Scroll
2. Changing navigation mode saves preference to backend via `/api/preferences` PATCH
3. When Pagination mode is selected, galleries display pagination controls (per Story 2.6)
4. When Infinite Scroll mode is selected, galleries use infinite scroll loading (per Story 2.6)
5. Navigation mode preference applies to all galleries (MOC, Sets, Inspiration - shared preference)
6. Default preference: Pagination mode (per FR14)
7. Mode switching updates gallery immediately without page refresh
8. Preference persists across sessions
9. Unit tests verify mode switching logic
10. E2E test verifies: User switches to Infinite Scroll → scrolls to load items → refreshes page → still uses Infinite Scroll

### Story 4.10: Comprehensive Empty States Across Dashboard

**As a** user,
**I want** to see helpful guidance when galleries or sections have no data,
**so that** I understand why content is empty and know what action to take.

**Acceptance Criteria:**

1. All galleries (MOC, Sets, Inspiration, Recent 10) display empty states when user has zero items
2. Empty states include:
   - Clear icon (e.g., empty box icon, illustration)
   - Heading explaining why content is empty (e.g., "No MOCs Yet")
   - Brief description (1-2 sentences)
   - Primary CTA button to add first item (e.g., "Add Your First MOC")
   - Optional secondary link to example/tutorial
3. Empty state CTAs trigger same actions as FAB or Add buttons
4. Overview tab metrics display empty state when user has zero MOCs: "Start building your collection to see metrics"
5. Overview tab visualizations display empty states when insufficient data:
   - Gauge: "Designate an active MOC to track progress"
   - Pie chart: "Add MOCs with themes to see breakdown"
   - Scatterplot: "Add 3+ MOCs to see price vs. piece count analysis"
6. Activity timeline displays empty state when user has no activity: "Your activity will appear here as you add and manage your collection"
7. Budget tab displays empty state when user has no spending: "Log your first purchase to start tracking spending"
8. Search with zero results displays: "No items found for '[search term]'" with "Clear search" button
9. Filters with zero results display: "No items found for selected filters" with "Clear filters" button
10. All empty states follow consistent design pattern (same icon style, spacing, button styling)
11. Empty states are accessible (proper semantic HTML, screen reader friendly)
12. Unit tests verify empty state rendering for each component
13. Visual regression test captures all empty state variations

---

## MVP Validation Strategy

### Learning Goals

The MVP dashboard is designed to answer these critical questions:

1. **Do users find value in aggregated metrics?** (validates Overview tab concept)
2. **Which gallery view modes do users prefer and why?** (informs future UI decisions)
3. **Do financial features drive engagement and retention?** (validates key differentiator)
4. **Does URL ingestion significantly reduce friction?** (validates frictionless data philosophy)
5. **What features do users request most after launch?** (guides Phase 2 prioritization)

### User Feedback Mechanisms

**During Development:**

- **Design Review Sessions:** 2-3 sessions with 5-8 target users reviewing wireframes and mockups
- **Prototype Testing:** Interactive Figma prototypes tested with 10 users for core flows (first-time setup, gallery browsing, budget tracking)
- **Usability Testing:** 5-user sessions on staging environment for each epic before production deployment

**Post-Launch (MVP Period):**

- **Beta User Group:** 20-30 early adopters with dashboard access 2 weeks before general launch
  - Weekly feedback surveys
  - Bi-weekly check-in calls with 5 representative users
  - Dedicated Slack/Discord channel for direct feedback
- **In-App Feedback Widget:** "Feedback" button on dashboard (all tabs) for contextual user input
- **NPS Survey:** Delivered at 30-day and 90-day marks to measure user satisfaction
- **Feature Request Tracking:** Dedicated board for user-submitted enhancement ideas

### Analytics & Instrumentation

All dashboard interactions tracked via analytics (e.g., Google Analytics, Mixpanel):

- Page views per tab
- Metric tile clicks (which metrics users interact with)
- Gallery filter/sort/search usage patterns
- View mode switches (grid → masonry → table)
- URL ingestion success vs. failure rates
- Budget setting and spending log actions
- Session duration and bounce rates
- Funnel analysis: Landing → Interaction → Action (e.g., Add MOC)

### Testing Approach

**A/B Testing Opportunities:**

- Default dashboard tab: Test Overview vs. Galleries as landing tab
- Gallery default view: Test Grid vs. Masonry as default
- Empty state CTAs: Test different messaging and button copy
- Metric tile order: Test different arrangements for prominence

### Criteria for Moving Beyond MVP

**Go Decision (Invest in Phase 2):**

- ✅ User retention improves by ≥10%
- ✅ Financial feature adoption ≥40% of active users
- ✅ NPS score ≥40 at 90-day mark
- ✅ Dashboard visit frequency ≥3 visits per week
- ✅ Pricing scraper reliability ≥90%
- ✅ <5 critical bugs reported in 90-day period

**Iterate Decision (Refine MVP):**

- ⚠️ Partial success on metrics (50-70% of targets)
- ⚠️ Strong engagement on some features, weak on others
- ⚠️ User feedback indicates missing critical functionality
- **Action:** Prioritize 2-3 high-impact improvements, re-test in 60 days

**No-Go Decision (Pivot or Sunset):**

- ❌ <50% of target metrics achieved
- ❌ No improvement in user retention
- ❌ NPS score <20
- ❌ High abandonment rate (users try once, never return)
- **Action:** Conduct deep user research to understand failure, consider major redesign or deprioritization

### Success Indicators for Phase 2 Features

If MVP succeeds, these signals guide Phase 2 prioritization:

- **High gallery usage + feature requests for smart filters** → Invest in AI recommendations
- **High budget tracking usage** → Invest in one-click parts ordering
- **High engagement with activity timeline** → Invest in proactive project nudges
- **Power users requesting automation** → Invest in AI agent framework
- **Requests for community features** → Consider social features

### Timeline

- **Weeks 1-2:** Beta user testing and feedback
- **Week 3:** General launch to all users
- **Weeks 4-8:** Active data collection and user feedback gathering
- **Week 12:** 90-day review and Go/Iterate/No-Go decision
- **Week 24:** 6-month comprehensive review and Phase 2 planning

---

## Next Steps

### UX Expert Prompt

You are the UX Expert for the LEGO MOC platform. A comprehensive PRD for a User Dashboard feature has been completed and is ready for design.

**Your task:** Review the attached PRD (`docs/prd.md` or the PRD content) and create a complete UX/UI design for the dashboard feature including:

1. **Wireframes** for all four dashboard tabs (Overview, Activity, Galleries, Budget)
2. **High-fidelity mockups** for key screens and user flows
3. **Interaction specifications** for visualizations, galleries, and navigation
4. **Responsive breakpoints** for desktop, tablet, and mobile views
5. **Design system components** needed (reuse existing Radix UI + Tailwind components where possible)
6. **Accessibility annotations** ensuring WCAG AA compliance

**Key focus areas from the PRD:**

- Four-tab architecture with persistent navigation and FAB
- Three data visualizations on Overview tab (gauge, pie/doughnut, scatterplot)
- Multi-mode galleries (grid, masonry, table) with search/filter/sort
- Budget tracking UI with bar graphs and theme breakdown
- Empty states and loading states for all components
- "Lightweight and joyful" design philosophy

**Input document:** User Dashboard PRD v0.1
**Output deliverables:** Figma/Sketch files with complete dashboard design system

Begin your design work and present wireframes for review when ready.

---

### Architect Prompt

You are the Technical Architect for the LEGO MOC platform. A comprehensive PRD for a User Dashboard feature has been completed and validated, ready for technical design.

**Your task:** Review the attached PRD (`docs/prd.md` or the PRD content) and create a technical architecture document covering:

1. **Database schema extensions** (parts_pricing, user_budgets, spending_events, activity_events, user_preferences tables)
2. **API endpoint specifications** for all dashboard features
3. **Caching strategy** (Redis key structure, TTLs for galleries and metrics)
4. **Parts pricing scraper architecture** (service design, cron scheduling, vendor API integration)
5. **Frontend component architecture** (dashboard routes, Redux state, RTK Query API slices)
6. **Performance optimizations** for gallery rendering and metric aggregation with 2000 MOCs
7. **Integration points** with existing platform infrastructure

**Key technical constraints from the PRD:**

- Monorepo architecture (Turborepo + pnpm workspaces)
- React 19 + TypeScript strict mode + TanStack Router + RTK Query
- PostgreSQL + Drizzle ORM for all data, Redis for caching
- Recharts for visualizations
- BrickLink + BrickOwl APIs for parts pricing
- Existing S3 infrastructure for image/PDF storage

**Input document:** User Dashboard PRD v0.1
**Output deliverables:** Technical architecture document with schema diagrams, API specs, and implementation guidance

Begin your architecture work and present the technical design for review when ready.
