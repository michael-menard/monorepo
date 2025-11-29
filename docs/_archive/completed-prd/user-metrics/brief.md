# Project Brief: LEGO MOC Dashboard

**Version:** 1.0
**Created:** 2025-10-15
**Author:** Business Analyst Mary
**Stakeholder:** Michael Menard

---

## Executive Summary

The LEGO MOC Dashboard is a post-login command center that transforms how LEGO enthusiasts manage their collections, plan builds, and make purchasing decisions. Rather than being a passive organizer, the dashboard serves as an intelligent assistant that provides actionable insights, financial transparency, and streamlined access to all collection content.

**The Problem:** LEGO enthusiasts face fragmented tools for tracking their collections, lack visibility into what they can build with existing inventory, and struggle to make informed financial decisions in an expensive hobby that doubles as an investment vehicle.

**The Solution:** A tabbed dashboard interface featuring metric tiles, data visualizations, and four distinct gallery types (MOCs, Sets, Inspiration, Activity), with integrated budget tracking and parts pricing intelligence. The MVP focuses on personal management and transparency, with AI agent automations and social features planned for Phase 2.

**Target Market:** LEGO enthusiasts who actively build MOCs (My Own Creations), collect official sets, and want better organization, financial visibility, and discovery tools for their hobby.

**Key Value Proposition:** The only LEGO management platform that combines collection organization with real-time parts pricing, budget tracking, and "cost-to-build" calculations—transforming users from casual builders into informed collectors who understand both the creative and financial dimensions of their hobby.

---

## Problem Statement

LEGO enthusiasts face three interconnected challenges that prevent them from fully enjoying and managing their hobby:

### 1. Fragmented Collection Management

LEGO builders currently juggle multiple disconnected tools—spreadsheets for inventory, BrickLink for parts research, physical notebooks for project tracking, and mental math for budget planning. This fragmentation creates several pain points:

- **No unified view of collection health**: Users cannot quickly answer basic questions like "What can I build right now?" or "How much of my collection is actively being used vs. sitting idle?"
- **Manual data entry overhead**: Every new MOC or set requires tedious manual entry of piece counts, themes, status, and metadata across multiple systems
- **Lost context and forgotten projects**: Without centralized tracking, projects get started and abandoned with no reminder system or project lifecycle visibility

**Impact:** Users spend more time managing spreadsheets than actually building, leading to frustration and reduced engagement with the hobby itself.

### 2. Financial Opacity in an Expensive Hobby

LEGO is both a creative hobby and a significant financial investment. Official sets range from $20 to $800+, and custom MOC builds can require hundreds of dollars in parts sourcing. Yet enthusiasts lack financial visibility tools:

- **No cost-to-build transparency**: Before committing to a MOC project, users cannot easily calculate "If I build this, what will it cost me in missing parts?"
- **Spending blindness**: Monthly LEGO spending happens across multiple vendors (LEGO.com, BrickLink, local stores) with no aggregated budget tracking
- **Collection value unknown**: Users cannot answer "What is my collection worth?" for insurance, resale, or investment tracking purposes

**Impact:** Enthusiasts make uninformed purchasing decisions, overspend without realizing it, and miss opportunities to optimize parts acquisition strategies.

### 3. Discovery Friction Between Inspiration and Action

The gap between "I want to build something" and "I'm actively building" is filled with friction:

- **Inspiration is disconnected from inventory**: Users save inspiring images (Pinterest, Instagram, MOC sites) but have no way to assess "Can I build this with what I own?"
- **Parts availability is opaque**: Even for MOCs with published parts lists, users must manually cross-reference against their inventory to determine buildability
- **No proactive suggestions**: Current tools are purely reactive—users must actively search for builds rather than receiving personalized recommendations based on available parts, skill level, or preferences

**Impact:** Creative momentum is lost in manual research and parts checking, reducing the number of builds users actually complete.

---

### Why Existing Solutions Fall Short

- **Rebrickable**: Strong parts inventory management but weak on financial tracking, no budget features, limited visualization
- **BrickLink Studio**: Excellent for designing MOCs but not a collection management tool, no financial intelligence
- **LEGO.com**: Official sets catalog only, no custom MOC support, no cross-platform collection tracking
- **Spreadsheets**: Flexible but require constant manual updates, no automation, no insights or recommendations

### Urgency

The LEGO enthusiast market is growing rapidly (adult LEGO spending increased 40% from 2020-2023), and the COVID-19 pandemic accelerated interest in at-home creative hobbies. Enthusiasts are actively seeking better tools RIGHT NOW, as evidenced by the 500K+ users on Rebrickable and BrickLink's sustained growth. The window to establish market leadership with a comprehensive solution is open but competitive pressure is increasing.

---

## Proposed Solution

The LEGO MOC Dashboard is a web-based command center that unifies collection management, financial intelligence, and content discovery into a single, lightweight interface. Built on the existing LEGO MOC platform infrastructure, the dashboard serves as the post-login landing page where users gain instant visibility into their collection health and can seamlessly navigate to all core features.

### Core Concept

A tabbed dashboard interface with four focused views:

- **Overview Tab**: Metric tiles + data visualizations for at-a-glance collection insights
- **Activity Tab**: Timeline of all user actions with filtering and search
- **Galleries Tab**: Four distinct gallery types (MOCs, Sets, Inspiration, Recent Activity)
- **Budget Tab**: Financial intelligence with parts pricing database and spending analytics

### Key Differentiators

**1. Financial Transparency Engine**

- Parts pricing database (multi-vendor aggregation via scheduled scrapers)
- Real-time "cost-to-build" calculator for every MOC
- Monthly budget tracking with visual spending breakdown by theme
- Collection valuation for insurance and investment tracking

**2. Intelligent Automation Over Manual Entry**

- Smart URL ingestion: paste LEGO.com/BrickLink/Rebrickable links → auto-extract all metadata
- Proactive insights: "You have 87% of parts for this MOC" without manual inventory checking
- Zero-typing data entry for most common workflows

**3. Multi-Dimensional Visualization**

- Gauge charts for build progress (% parts collected)
- Pie/doughnut charts for theme composition analysis
- Scatterplot for price-vs-pieces relationship analysis
- Metric tiles that serve as navigation shortcuts (click "MOCs Ready to Build" → filtered gallery view)

**4. Comprehensive Gallery System**

- **MOC Gallery**: All custom creations with status tracking
- **Sets Gallery**: Official LEGO sets for collection completeness
- **Inspiration Gallery**: Pinterest-style image curation for future build ideas
- **Activity Feed**: Chronological timeline with filtering by action type

### Why This Solution Will Succeed

- **Solves the whole problem, not fragments**: Unlike competitors who excel at one dimension (Rebrickable = inventory, BrickLink = marketplace), we integrate management + financial + discovery
- **Builds on proven infrastructure**: Leverages existing authentication, database, and file upload systems rather than starting from scratch
- **Lightweight by design**: Users can ignore the dashboard entirely if they just want to build—it enhances the experience without becoming mandatory overhead
- **Progressive value delivery**: Each tab provides standalone value while reinforcing the others (Budget informs MOC selection, Activity provides context for metrics)

### High-Level Product Vision

The dashboard evolves from a "collection snapshot" (MVP) to an "intelligent building advisor" (Phase 2+) by layering on AI agent automations, predictive recommendations, and conversational interfaces. The MVP establishes the data foundation and user trust necessary for advanced features—users won't adopt AI recommendations until they trust the underlying data accuracy and financial calculations.

**Phase 2 Trajectory** _(not in MVP scope)_:

- AI chat interface for natural language queries
- Calendar integration for build session scheduling
- One-click parts ordering with vendor price comparison
- Mood-based recommendation engine
- Proactive project management (stale project nudges)
- "Your Year in LEGO" annual recap and gamification

---

## Target Users

### Primary User Segment: Active MOC Builders

**Demographic/Firmographic Profile:**

- Age: 25-45 years old (adult LEGO enthusiasts, AFOL demographic)
- Income: $60K-$150K+ household income (disposable income for hobby spending)
- Geography: Global, English-speaking markets initially (US, UK, Canada, Australia, EU)
- Occupation: Tech workers, engineers, designers, educators—professions valuing creativity and systematic thinking
- Tech savvy: Comfortable with web applications, active on online LEGO communities (Reddit r/lego, Eurobricks, BrickLink forums)

**Current Behaviors and Workflows:**

- Actively designs and builds custom MOCs (average 3-10 MOCs per year)
- Maintains fragmented tracking systems: spreadsheets for inventory, bookmarks for inspiration, mental notes for project status
- Shops across multiple vendors: BrickLink for parts, LEGO.com for new sets, local stores opportunistically
- Participates in online communities but doesn't deeply engage with social features on MOC platforms
- Spends 5-15 hours per week on LEGO hobby (building, designing, researching, shopping)
- Takes photos of completed builds, shares selectively on Instagram or dedicated LEGO subreddits

**Specific Needs and Pain Points:**

- **Visibility gap**: "What can I build right now with parts I already own?"
- **Financial blindness**: "How much am I actually spending on LEGO each month?"
- **Project abandonment**: "I started that modular castle project 3 months ago—where did I leave off?"
- **Parts sourcing friction**: "Which vendor has the best price for these 47 missing parts?"
- **Inspiration overload**: "I've saved 200 MOC images on Pinterest but don't know which ones are realistic to build"
- **Collection chaos**: "Do I already own this set? How many copies? What condition?"

**Goals They're Trying to Achieve:**

- Build more MOCs with less time spent on planning and parts research
- Make informed financial decisions about which projects to pursue
- Reduce anxiety around "lost" or "forgotten" projects
- Maximize creative use of existing parts inventory
- Track collection value for insurance or resale purposes
- Discover new building techniques and inspiration tailored to their skill level and inventory

---

### Secondary User Segment: Dedicated Set Collectors

**Demographic/Firmographic Profile:**

- Age: 30-55 years old (slightly older demographic, established collectors)
- Income: $75K-$200K+ household income (higher spending capacity)
- Geography: Similar to primary segment (global, English-speaking)
- Occupation: Finance, law, medicine, senior tech roles—high-income professionals
- Tech adoption: Moderate comfort with web tools, prefers simple interfaces over complex features

**Current Behaviors and Workflows:**

- Focuses on acquiring and completing official LEGO sets (average 10-30 sets per year)
- Tracks collection in spreadsheets or dedicated apps like BrickSet
- Values completeness: tracking theme collections, set variations, minifigures
- May build MOCs occasionally but primarily engages with official sets
- Interested in investment value: sealed vs. opened sets, retirement potential, appreciation tracking
- Follows LEGO release calendars and coordinates purchases around sales/promos

**Specific Needs and Pain Points:**

- **Collection completeness tracking**: "Which sets am I missing from the Star Wars UCS theme?"
- **Investment visibility**: "What's my sealed collection worth compared to purchase price?"
- **Purchase coordination**: "Should I buy this retiring set now or wait for a sale?"
- **Storage management**: "Which sets are built, displayed, stored, or sealed?"
- **Budget optimization**: "How do I maximize value while staying within monthly spending limits?"

**Goals They're Trying to Achieve:**

- Complete specific theme collections (Star Wars, Creator Expert, Ideas, etc.)
- Track collection value as an investment portfolio
- Optimize purchasing strategies around sales, retirement dates, and appreciation potential
- Maintain organization for large collections (500+ sets not uncommon)
- Transition into MOC building using parts from duplicate/retired sets (bridge to primary segment)

---

## Goals & Success Metrics

### Business Objectives

- **User Acquisition**: Acquire 1,000 active users within 6 months of MVP launch (defined as users who have added at least 5 MOCs/sets and logged in 3+ times)

- **User Retention**: Achieve 60% 30-day retention rate and 40% 90-day retention rate, demonstrating the dashboard provides ongoing value beyond initial curiosity

- **Engagement**: Average 3+ dashboard visits per week per active user, with 5+ minutes per session (indicates dashboard is a regular part of LEGO workflow)

- **Feature Adoption**: 70% of users engage with at least 2 of the 4 dashboard tabs (Overview, Activity, Galleries, Budget) within first month, proving multi-feature value

- **Financial Feature Validation**: 40% of users set a monthly budget and track spending, validating the financial intelligence differentiator

- **Data Quality**: 80% of MOCs added via Smart URL Ingestion (vs. manual entry), proving automation reduces friction successfully

- **Revenue Readiness**: Establish foundation for Phase 2 monetization with clear upgrade paths identified (premium features, API access, advanced analytics)

### User Success Metrics

- **Time to First Value**: New users add their first MOC/set within 10 minutes of account creation (frictionless onboarding)

- **Collection Organization**: Users successfully migrate from spreadsheets/other tools, with average collection size of 25+ MOCs/sets after 30 days

- **Discovery Success**: Users report discovering "buildable MOCs" (80%+ parts available) they didn't know about, measured via survey or in-app feedback

- **Financial Clarity**: Users can answer "What's my collection worth?" and "What will this MOC cost to build?" accurately within 60 seconds

- **Reduced Tool Fragmentation**: 50% of users report reducing or eliminating other tools (spreadsheets, BrickSet, manual tracking) after 60 days of use

- **Build Completion Rate**: Users complete 20% more MOC builds compared to pre-dashboard baseline (measured via self-reported data or activity tracking)

- **Inspiration Activation**: Users successfully convert saved inspiration images into active MOC projects at 15%+ rate (addressing "save but never build" behavior)

### Key Performance Indicators (KPIs)

- **Daily Active Users (DAU)**: Track daily login rate; target 30% of total user base as DAU (indicates habitual use)

- **Dashboard Tab Distribution**: Measure % of sessions visiting each tab
  - Target: Overview (100%), Galleries (70%), Budget (40%), Activity (30%)
  - Validates that Overview is universal landing page while other tabs serve specific needs

- **Average MOCs per User**: Track collection size growth over time; target 25 MOCs/sets per user after 30 days, 50+ after 90 days

- **Smart URL Ingestion Success Rate**: % of URLs successfully parsed without manual correction; target 90%+ to validate automation quality

- **Budget Feature Engagement**: % of users who set budget AND log spending for 3+ consecutive months; target 25% of user base (indicates sustained financial tracking)

- **Parts Pricing Data Freshness**: Track age of pricing data; target <7 days for 95% of parts to ensure cost calculations remain accurate

- **Collection Value Accuracy**: Measure delta between calculated collection value vs. actual market value (via spot checks); target ±10% accuracy

- **Page Load Performance**: Dashboard loads in <2 seconds for collections up to 500 MOCs; target 95th percentile load time <3 seconds (lightweight promise)

- **Feature Request Volume**: Track top 10 user-requested features; inform Phase 2 roadmap prioritization

- **Net Promoter Score (NPS)**: Measure user satisfaction and likelihood to recommend; target NPS >40 within 3 months of launch

---

## MVP Scope

### Core Features (Must Have)

**1. Overview Tab - Collection Command Center**

- **5 Metric Tiles** displaying collection health at a glance:
  - Total MOCs stored
  - Total pieces in collection
  - MOCs built (completed)
  - MOCs ready to build (100% parts available)
  - MOCs in parts-collection phase
- **Responsive grid layout**: 3 tiles top row, 2 bottom on desktop; stacked on mobile
- **Clickable tiles**: Each tile filters/navigates to relevant gallery view
- **3 Data Visualizations** for analytical depth:
  - **Gauge chart**: Part acquisition progress for user-selected active MOC (0-100% complete)
  - **Pie/Doughnut chart**: Theme breakdown showing % of collection by theme
  - **Scatterplot**: Price vs. Piece count with shape coding (Triangle = Set, Circle = MOC) and color by status
- **3-column layout** for visualizations (equal width, side-by-side on desktop)
- **Rationale**: Foundation of dashboard value—immediate visibility into collection state without clicking through multiple pages

**2. Activity Tab - Timeline & History**

- **Scrollable activity feed** showing all user actions chronologically
- **Filtering by action type**: Added, Built, Updated, Deleted, Status Changed
- **Date grouping**: "This Week", "Last Month", "2024", etc.
- **Card view** with thumbnails, action description, and timestamp
- **Search functionality** to find specific past actions
- **Rationale**: Provides context and prevents "lost project" anxiety by maintaining complete history

**3. Galleries Tab - Content Organization**

- **Four distinct gallery types** (all non-negotiable for v1):
  - **Last 10 MOCs**: Recent activity list with thumbnail, name, status badge
  - **MOC Gallery**: All user's custom MOCs, browsable with filtering (by status, theme, complexity)
  - **Sets Gallery**: All official LEGO sets owned with filtering (by theme, piece count, year)
  - **Inspiration Gallery**: Pinterest-style grid of user-curated images for future build ideas
- **Sorting options**: Recently added (default), alphabetical, piece count, price
- **Pagination or infinite scroll** for large collections (500+ items)
- **Card/grid view toggle** for user preference
- **Rationale**: Different gallery types serve distinct use cases—all four are essential for comprehensive collection management

**4. Budget Tab - Financial Intelligence**

- **Parts pricing database**:
  - Multi-vendor data aggregation (BrickOwl API + LEGO.com Bricks & Pieces + WebBricks via web scraping)
  - Scheduled scraper (cron job) refreshing prices daily/weekly (NOT real-time)
  - Every part has current market price stored in database
- **MOC Cost Calculator**: Display "Cost to build: $X.XX" based on missing parts × current prices
  - **Requires manual parts ownership input** (see Feature #8)
  - Formula: (Total pieces - Owned pieces) × Average part price
- **Monthly budget tracking**:
  - User-defined monthly budget input
  - **Manual purchase entry** (no automatic BrickLink integration in MVP)
  - Bar graph: Budgeted vs. Actual spending by month
  - Grouped bars by theme showing spending breakdown per category
  - Visual variance indicators (over/under budget)
- **Collection valuation**: Display total collection value based on current market prices
- **Rationale**: Major competitive differentiator—addresses expensive hobby reality and enables informed purchasing decisions

**5. Smart URL Ingestion - Frictionless Data Entry**

- **Paste URL → Auto-extract metadata** for:
  - LEGO.com official sets (name, piece count, theme, price, images, instruction PDF)
  - BrickLink MOCs and sets (MOC details, parts list, images, instructions)
  - Rebrickable alternate builds (parts data, images, instructions)
- **Background processing** with progress indicator
- **Manual override**: Allow users to edit extracted data before saving
- **Fallback to manual entry** if URL parsing fails
- **Rationale**: Eliminates primary friction point (manual data entry) and enables rapid collection population

**6. Navigation Architecture**

- **Clean navbar**: App logo (left) + Profile avatar dropdown (right)
- **Profile dropdown menu**: Dashboard, MOC Gallery, Sets Gallery, Inspiration Gallery, Budget, Settings, Logout
- **Tab bar within Dashboard**: Overview | Activity | Galleries | Budget (horizontal tabs)
- **Floating Action Button (FAB)**: "+ Add MOC/Set" button (bottom-right, persistent across tabs)
- **Responsive design**: Mobile-first approach, works on all screen sizes
- **Rationale**: Minimal chrome, maximum content—tab structure reduces cognitive load vs. single long-scrolling page

**7. Core Data Model & Infrastructure**

- **Theme taxonomy**: Config-file managed (`config/lego-themes.json`) with predefined LEGO themes (Star Wars, City, Creator, etc.) and "Other/Custom" option
- **Status tracking**: Not Started, Collecting Parts, Ready to Build, Building, Completed, Paused, Archived
- **File storage**: S3 integration for images, instructions, and parts lists (leverages existing infrastructure)
- **Image optimization**: Sharp-based thumbnail generation and compression
- **Database schema**: PostgreSQL via Drizzle ORM (extends existing lego-projects-api)
- **Authentication**: JWT-based auth via existing auth-service (no new auth system)
- **Rationale**: Builds on proven infrastructure rather than creating parallel systems

**8. Parts Ownership Tracking** ⚠️ **CRITICAL ADDITION**

- **Manual parts ownership input** for each MOC/Set:
  - Slider: "What % of parts do you own? (0-100%)" OR
  - Piece count entry: "You own \_\_\_ of 2,847 pieces"
  - Displayed on MOC detail page, editable anytime
  - Defaults to 0% for new MOCs (conservative assumption)
- **Powers critical metrics**:
  - "Ready to Build" metric (100% parts owned)
  - "Collecting Parts" metric (1-99% owned)
  - Gauge chart progress visualization
  - Cost-to-build calculator (missing pieces calculation)
- **Quick-entry shortcuts**:
  - "I own all parts" button → Sets to 100%
  - "I own none" button → Sets to 0%
  - Import from BrickLink Wanted List (if user has one)
- **Rationale**: Without parts ownership data, core dashboard metrics are meaningless. This is the foundation for "Ready to Build" and financial calculations. Manual input is acceptable for MVP; automated inventory sync is Phase 2.

**9. Bulk Actions in Galleries** (Nice-to-Have - May defer to v1.1)

- **Checkbox selection** for multiple MOCs/sets in gallery view
- **Bulk operations**:
  - Change status (e.g., mark 10 MOCs as "Completed")
  - Change theme/tags
  - Delete selected items
- **Rationale**: Reduces friction during initial collection population (migrating from spreadsheets). If timeline is tight, can defer to v1.1 as users will tolerate one-by-one editing during onboarding.

---

### MVP Scope Clarifications

**Manual Input Requirements (Not Automated in MVP):**

- ✋ **Parts ownership** - Users manually enter % owned or piece count (no automatic BrickLink inventory sync)
- ✋ **Purchase tracking** - Users manually log spending (no BrickLink order import or email parsing)
- ✋ **Build time tracking** - Users manually update status (no automatic "building session" detection)
- ✋ **Theme assignment** - Users select from predefined list (no AI auto-categorization)

**Single-Item Limitations (Not Multi-Item in MVP):**

- 🎯 **Gauge chart** - Tracks ONE user-selected MOC at a time (not all 18 "Collecting Parts" MOCs simultaneously)
- 🎯 **Active project** - User manually designates which MOC is "currently building" for gauge display

**Data Accuracy Dependencies:**

- 📊 **"Ready to Build" metric** - Only accurate if users maintain parts ownership data
- 📊 **Cost-to-build calculator** - Assumes parts pricing data is <7 days old (acceptable lag for MVP)
- 📊 **Collection valuation** - Based on market averages, not user's specific purchase prices

---

### Out of Scope for MVP

**Deferred to Phase 2:**

- ❌ **AI agent automations & chat interface** (complex infrastructure, requires user behavior training data)
- ❌ **Calendar integration** (requires 3rd-party API integrations, build time estimation algorithms)
- ❌ **Mood-based or predictive recommendations** (needs user preference learning system and recommendation engine)
- ❌ **Proactive project management nudges** ("stale project" reminders require activity monitoring and notification logic)
- ❌ **One-click parts ordering** (vendor API integrations, shopping cart, price comparison engine—major scope)
- ❌ **LEGO events integration** (event API or web scraping, location filtering)
- ❌ **Gamification features** (build streaks, achievements, "Your Year in LEGO" recap)
- ❌ **Reflection prompts & questionnaires** (requires content creation and engagement system)
- ❌ **Customizable dashboard layouts** (drag-and-drop widgets, saved configurations)
- ❌ **Journey-stage adaptation** (dashboard evolution based on user maturity level)

**Explicitly NOT Included:**

- ❌ **Social features** (sharing, following, commenting, collaborative builds)—explicitly scoped to Phase 2+ per brainstorming session
- ❌ **Mobile native apps** (iOS/Android)—web-first, responsive design only
- ❌ **Real-time parts pricing** (too expensive, scheduled scraping sufficient for MVP)
- ❌ **Advanced analytics** (trend analysis, predictive modeling, "what-if" scenarios)
- ❌ **Parts inventory management at piece level** (tracking individual bricks in storage containers)—Rebrickable already does this well
- ❌ **MOC designer/builder tool** (BrickLink Studio already excels here)—focus is collection management, not design

---

### MVP Success Criteria

**The MVP is successful if:**

1. **User can answer key questions within 60 seconds:**
   - "What can I build right now?" → Overview Tab metrics + Galleries
   - "How much is my collection worth?" → Budget Tab valuation
   - "What will this MOC cost me?" → Budget Tab cost calculator
   - "What did I add last week?" → Activity Tab timeline

2. **Data entry friction is reduced (not eliminated):**
   - 80%+ of MOCs added via Smart URL Ingestion for metadata
   - **Parts ownership entry takes <30 seconds per MOC** (slider or quick buttons)
   - Average time to fully add a MOC: <3 minutes (paste URL, set parts ownership, save)
   - **Expectation set**: Some manual input is required for accuracy, but it's minimal

3. **Dashboard provides ongoing value:**
   - 60% of users return 3+ times in first 30 days
   - Users voluntarily set dashboard as their post-login landing page (vs. navigating away)

4. **Financial features drive engagement:**
   - 40%+ of users set a monthly budget within first week
   - Users check Budget Tab at least once per week

5. **Performance validates "lightweight" promise:**
   - Dashboard loads in <2 seconds for collections up to 500 MOCs
   - Users report the dashboard "stays out of the way" and doesn't interrupt building workflow

6. **Feature completeness confirmed:**
   - Users don't request features that are already in MVP (indicates discoverability is strong)
   - Top 3 feature requests are all Phase 2 items (AI, calendar, ordering)—validates MVP scope

7. **Parts ownership adoption validates tracking value:**
   - 60%+ of users enter parts ownership data for at least 50% of their MOCs
   - Users who track parts ownership have 2x engagement vs. those who don't (validates feature value)
   - "Ready to Build" metric is trusted by users (validated via survey or feedback)

---

## Post-MVP Vision

### Phase 2 Features (6-12 Months Post-MVP)

**1. AI Agent Automations & Chat Interface**

The dashboard evolves from "collection snapshot" to "intelligent building advisor" through natural language interaction and proactive background agents.

**Features:**

- **Chat widget**: "Find me all Star Wars MOCs under 1000 pieces I can build right now"
- **Background agents**:
  - "I found 3 new MOCs on BrickLink that match your wishlist"
  - "That rare part you need just became available on BrickOwl for $0.12"
- **Proactive notifications**: "Based on your inventory, you can now build 2 additional MOCs without buying parts"
- **Natural language queries**: "Show me what I can build this weekend with 3-4 hours available"

**Why Phase 2:** Requires AI/ML infrastructure, user behavior training data, and chat UI/UX development (3-6 month effort).

**2. Automatic Parts Inventory Sync**

Eliminate manual parts ownership entry through direct integration with existing inventory systems.

**Features:**

- BrickLink "My Wanted Lists" import
- Rebrickable inventory API sync (two-way)
- LEGO Pick-a-Brick order history import
- Real-time inventory updates when purchases are logged

**Why Phase 2:** API integrations with 3rd-party platforms, authentication/authorization complexities, data sync reliability (2-3 months).

**3. One-Click Parts Ordering**

Direct path from "I want to build this MOC" to "Parts are ordered and shipping."

**Features:**

- "3 MOCs ready to order - total cost: $47.23" with single "Order All" button
- Multi-vendor price comparison (BrickLink vs. BrickOwl vs. LEGO Pick-a-Brick)
- Smart bundling to minimize shipping costs
- Order tracking integrated into Activity Tab

**Why Phase 2:** Vendor marketplace API integrations, shopping cart logic, payment processing, legal/terms review (4-6 months).

**4. Predictive Recommendations & Mood-Based Discovery**

Context-aware suggestions that adapt to user preferences, available time, and emotional state.

**Features:**

- **Mood modes**: Creative/Relaxing/Challenge/Quick-win mode filtering
- **Predictive insights**: "Based on your building pace, you'll complete your backlog in 4.2 months"
- **New release filtering**: LEGO.com new releases filtered by user taste profile
- **Skill progression**: "You're 73% of the way to Master Builder status" with technique recommendations

**Why Phase 2:** Recommendation algorithm development, user preference learning system, mood/context detection (4-6 months).

---

### Long-Term Vision (1-2 Years)

**The Adaptive Building Companion**

The dashboard becomes a personalized LEGO advisor that grows smarter over time, understanding each user's unique building style, financial constraints, and creative aspirations.

**Vision Elements:**

- **Journey-Stage Adaptation**: Dashboard automatically evolves based on user maturity
  - **New User**: Simplified onboarding, focus on collection population, basic metrics
  - **Growing Collection**: Organization tools, discovery features, budget optimization
  - **Power User**: Advanced analytics, bulk operations, API access, custom integrations
  - **Collector Focus**: Investment tracking, value appreciation, set completion percentages
  - **Builder Focus**: Build queue management, time tracking, technique progression

- **Smart Inspiration Matching**: Computer vision analyzes inspiration images
  - Upload photo of cool castle MOC → "You can build 80% of this with parts you own"
  - Gap analysis: "You need these 15 specific pieces to complete this vision"
  - Alternative suggestions using available inventory

- **Parts Intelligence Engine**: Deep understanding of parts by purpose and technique
  - "You have lots of green slopes—perfect for a landscape MOC!"
  - Technique library: "You have the parts to try SNOT (Studs Not On Top) techniques"
  - Build recommendations based on parts you're actively collecting

- **Calendar & Build Session Integration**:
  - AI detects free time: "You have 3 hours Saturday—perfect for that Medium complexity MOC!"
  - Build streak tracking and personal records
  - Actual vs. estimated build time learning

- **Gamification & Reflection**:
  - Annual Building Challenge with yearly goals
  - "Your Year in LEGO" recap (Spotify Wrapped style)
  - Monthly reflection prompts: "Which MOC surprised you most this month?"
  - Achievement system and progress badges

---

### Expansion Opportunities

**Adjacent Markets & Use Cases:**

1. **LEGO Stores & Retailers**: White-label dashboard for store loyalty programs
   - Track customer collections, recommend in-store purchases
   - "You're collecting Star Wars—the new UCS set arrives next week"

2. **LEGO User Groups (LUGs)**: Group collaboration features
   - Shared parts pools for collaborative builds
   - Event coordination (conventions, competitions, displays)

3. **Insurance & Valuation Services**: API partnerships
   - Real-time collection valuation for insurance policies
   - Historical value tracking for investment portfolios

4. **Educational Market**: Classroom/STEM program integration
   - Teacher dashboards for tracking student builds
   - Curriculum-aligned MOC libraries
   - Collaborative learning projects

5. **Content Creators**: YouTubers, Instagram builders
   - Public portfolio pages (showcase builds to audience)
   - Build progress documentation tools
   - Sponsor/affiliate link integration for parts

---

## Technical Considerations

**Note:** These are initial thoughts informed by existing platform architecture. Final technical decisions will be made during architecture design phase with the development team.

### Platform Requirements

- **Target Platforms**: Web application (desktop and mobile browsers)
  - Desktop: Chrome, Firefox, Safari, Edge (latest 2 versions)
  - Mobile: iOS Safari, Chrome Android (responsive design, no native apps)
  - Progressive Web App (PWA) capabilities for offline access to cached data

- **Browser/OS Support**:
  - Modern evergreen browsers only (ES2020+ JavaScript support)
  - No IE11 support required
  - Mobile-first responsive design (320px minimum width)

- **Performance Requirements**:
  - Dashboard loads in <2 seconds for collections up to 500 MOCs (95th percentile <3 seconds)
  - Metric tiles update in <500ms after data changes
  - Visualizations render in <1 second
  - Smart URL Ingestion completes in <30 seconds for standard MOC pages
  - Image thumbnails lazy-load with progressive enhancement
  - Supports collections up to 5,000 MOCs without performance degradation

### Technology Preferences

**Frontend:**

- **Framework**: React 19 (existing platform standard)
- **State Management**: Redux Toolkit + RTK Query (existing architecture)
- **Routing**: TanStack Router (existing platform standard—do NOT introduce React Router)
- **Styling**: Tailwind CSS 4 (existing design system)
- **Component Library**: Radix UI (existing `@repo/ui` package)
- **Charts/Visualizations**: D3.js (powerful, customizable)
- **Build Tool**: Vite 6 (existing)
- **Type Safety**: TypeScript 5.8 strict mode (existing standard)

**Backend:**

- **Framework**: Express (existing lego-projects-api)
- **Database**: PostgreSQL (existing) via Drizzle ORM
- **Authentication**: JWT-based via existing auth-service (MongoDB + Mongoose)
  - No new auth system—reuse existing session management
- **File Storage**: AWS S3 (existing infrastructure for MOC images, instructions, parts lists)
- **Image Processing**: Sharp (existing for thumbnail generation and compression)
- **Caching**: Redis (existing infrastructure)
- **Search**: Elasticsearch (existing, may use for gallery filtering/search)

**Parts Pricing Infrastructure:**

- **Web Scraping**:
  - **Options**: Puppeteer (headless Chrome), Cheerio (lightweight HTML parsing), Playwright (multi-browser)
  - **Recommendation**: Start with Cheerio for simple pages, Puppeteer if JavaScript rendering required
- **Scheduling**: Node-cron for scheduled price updates (daily/weekly)
- **Data Storage**: PostgreSQL table for parts pricing history
  - Schema: `part_id`, `vendor`, `price`, `currency`, `scraped_at`, `availability`
  - Indexed on `part_id` and `scraped_at` for fast queries
- **Data Sources**: BrickOwl API + LEGO.com Bricks & Pieces (web scraping) + WebBricks (web scraping)

### Architecture Considerations

**Repository Structure:**

- **Monorepo**: Turborepo with pnpm workspaces (existing structure)
- **Location**:
  - Dashboard frontend: `apps/web/lego-moc-instructions-app/src/pages/DashboardPage/` (new directory)
  - Dashboard API: Extend `apps/api/lego-projects-api/src/handlers/dashboard.ts` (new handler)
  - Shared components: `packages/core/dashboard/` (new package for reusable dashboard widgets)

**Service Architecture:**

- **Extend existing services** (do NOT create new services):
  - **lego-projects-api** (Port 9000): Add dashboard endpoints, parts pricing logic, budget tracking
  - **auth-service** (Port 9300): No changes needed, reuse existing authentication
- **New background jobs**:
  - Parts pricing scraper (cron job within lego-projects-api)
  - Smart URL ingestion processor (synchronous for MVP, async job queue in Phase 2 if needed)

**Integration Requirements:**

- **BrickOwl API**: Public API available for parts pricing and inventory data
  - Authentication: API key-based
  - Rate limits: Check free tier limits
- **Rebrickable API**: Public API available (documented)
  - Authentication: API key-based
  - Rate limits: 1000 requests/day (free tier) or paid plan
- **LEGO.com Bricks & Pieces**: Web scraping (legal review required)
  - Terms of Service review: Ensure scraping is permitted
  - Fallback: Manual entry if scraping violates ToS
- **WebBricks**: Web scraping (secondary data source)

**Database Schema Extensions:**

- **New tables**:
  - `dashboard_metrics` (optional - only if on-demand calculation proves too slow)
  - `parts_pricing` (pricing history from multiple vendors)
  - `budget_tracking` (user monthly budgets and spending transactions)
  - `inspiration_gallery` (user-curated inspiration images with tags)
  - `moc_parts_ownership` (% or count of parts owned per MOC)
- **Extended tables**:
  - `mocs` table: Add `parts_owned_percentage`, `cost_to_build`, `theme_id`
  - `sets` table: Add `quantity` column (for multiple copies)
  - `users` table: Add `monthly_budget`, `default_currency`

### Architecture Decisions Made

✅ **Dashboard metrics**: Calculated on-demand (not pre-cached)

- Rationale: Simpler implementation, real-time accuracy, acceptable performance for MVP scale
- Performance monitoring: Track query times, add caching if >2s load times observed

✅ **Smart URL Ingestion**: Synchronous processing (no job queue)

- Rationale: Reduces complexity, acceptable for MVP (<30s processing time)
- Future consideration: Add job queue if processing time exceeds user tolerance

✅ **Parts pricing history**: Keep all historical data

- Rationale: Enables trending analysis, collection value appreciation tracking
- Storage impact: ~10MB per 10K parts over 1 year (acceptable)

✅ **API architecture**: Developer's decision (GraphQL vs REST)

- Current platform uses REST + RTK Query—maintain consistency unless compelling reason to switch

✅ **Internationalization (i18n)**: Deferred to Phase 2

- MVP: English-only interface and documentation
- Currency support: USD default, allow manual currency selection in user settings

### Security & Compliance

- **CSRF Protection**: Already enabled on auth endpoints, extend to dashboard mutations
- **CORS**: Configure specific origins (no wildcard `*` in production)
- **Rate Limiting**: API endpoints limited to 100 requests/minute per user
- **Data Privacy**:
  - User collection data is private by default (no public sharing in MVP)
  - GDPR compliance: Data export and deletion endpoints required
  - No tracking/analytics without user consent
- **Web Scraping Ethics**:
  - Respect robots.txt for all external sites
  - Implement user-agent identification
  - Cache scraped data to minimize requests
  - Legal review of LEGO.com, WebBricks terms of service

### Deployment & Infrastructure

- **Development**: Docker Compose (existing setup) with new service for scraper jobs
- **Staging**: AWS (existing infrastructure)
  - Frontend: S3 + CloudFront (existing pattern)
  - Backend: ECS or EC2 (existing)
  - Database: RDS PostgreSQL (existing)
- **Production**: Same as staging with enhanced monitoring
- **Cron Jobs**: AWS EventBridge or ECS Scheduled Tasks for parts pricing scraper
- **Monitoring**:
  - CloudWatch for logs and metrics (existing)
  - Sentry for error tracking (if not already implemented)
  - Dashboard-specific metrics: API response times, scraper success rates, visualization render times

---

## Constraints & Assumptions

### Constraints

**Budget:**

- **Personal project with minimal budget** (cloud costs only, no paid services)
- Leverage AWS free tier where possible
- No paid API subscriptions (BrickOwl/Rebrickable free tiers only)
- No external contractors, agencies, or paid tools
- Existing infrastructure costs absorbed by current platform hosting

**Timeline:**

- **Target MVP delivery**: 8-10 weeks (solo developer, part-time development assumed)
  - Realistic expectation: ~15-20 hours/week development time
  - Total effort: ~120-200 hours for full MVP
  - Week 1-2: Architecture design, database schema, tech spikes (URL parsing, scraping)
  - Week 3-5: Core features (Overview Tab, Galleries Tab, parts ownership)
  - Week 6-7: Budget Tab with parts pricing scraper
  - Week 8: Smart URL Ingestion implementation
  - Week 9-10: Testing, bug fixes, performance optimization, self-dogfooding
- **Phase 2**: 6+ months post-MVP (allows for real user feedback and priority adjustment)

**Resources:**

- **Development team**: Solo developer (Michael Menard)
- **Design**: Reuse existing `@repo/ui` Radix components exclusively (no custom design)
- **QA/Testing**: Self-testing + invite 5-10 LEGO enthusiast friends for beta feedback
- **DevOps**: Existing CI/CD pipeline, minimal new infrastructure
- **Product/PM**: Solo (wearing all hats)

**Technical:**

- **Must extend existing architecture**: Cannot introduce new services or frameworks (time constraint)
- **Solo developer efficiency**: Prioritize features that reuse existing code patterns
- **No complex infrastructure**: Avoid distributed systems, message queues, or complex background jobs in MVP
- **PostgreSQL limits**: Maximum 5,000 MOCs per user (acceptable for personal project scale)
- **Desktop-first**: Mobile responsive design only (no time for native apps)

---

### Key Assumptions

**User Behavior Assumptions:**

- Users are willing to manually enter parts ownership data (0-100% slider)
- Users will tolerate 24-hour lag in parts pricing data (not real-time)
- Users prefer tabbed dashboard layout over single long-scroll page
- 40% of users will engage with Budget Tab financial tracking features
- Users will adopt the dashboard as their primary LEGO management tool within 30 days

**Technical Assumptions:**

- BrickOwl API and web scraping (LEGO.com, WebBricks) allow parts pricing data collection
- Existing PostgreSQL database has sufficient capacity for dashboard queries
- Smart URL Ingestion can achieve 80%+ accuracy without AI/ML
- Redis caching is available and can be used for transient data
- Existing auth-service can handle dashboard user load (no auth refactor needed)

**Solo Developer Assumptions:**

- 15-20 hours/week development time is sustainable for 8-10 weeks
- Sufficient full-stack experience to build frontend, backend, and infrastructure solo
- Existing codebase is familiar enough to extend efficiently
- No major platform bugs or refactoring needs will derail dashboard development
- Can make architecture decisions quickly without extensive team collaboration

**Market Assumptions:**

- Target market (AFOL builders) values financial transparency as a differentiator
- 1,000 active users within 6 months is achievable through organic growth + community outreach
- Competitors (Rebrickable, BrickSet) will not immediately copy financial features
- LEGO enthusiasts are actively seeking better collection management tools
- No major LEGO platform will launch competing dashboard in next 12 months

**Business Assumptions:**

- MVP can be delivered without monetization (free to use, build user base first)
- Phase 2 features (AI, ordering) will justify premium pricing model
- Dashboard drives engagement with broader platform features (increases overall platform value)
- User data (collection size, spending) is valuable for future partnerships or analytics products

**Data Quality Assumptions:**

- Parts pricing data from BrickOwl is representative of market rates (±10% accuracy acceptable)
- Users will self-report build completion and status changes accurately
- MOC metadata extracted from URLs is 90%+ accurate (set name, piece count, theme)
- Collection valuation based on market averages is "close enough" for user decision-making

**Scope Assumptions:**

- **Full MVP is feasible solo in 8-10 weeks** given existing platform foundation
- Smart URL Ingestion can be built without complex AI/ML (parsing libraries sufficient)
- Parts pricing scraper is simple enough to build and maintain solo
- Four dashboard tabs + all features are achievable (no descoping needed)

---

## Risks & Open Questions

### Key Risks

**1. Web Scraping Legal & Technical Risk** ⚠️ **HIGH**

- **Risk**: LEGO.com or WebBricks Terms of Service may prohibit web scraping
- **Impact**: Parts pricing database completeness is reduced if primary sources are blocked
- **Likelihood**: Medium (many sites allow scraping with rate limiting, but some explicitly forbid)
- **Mitigation**:
  - Immediate: Review Terms of Service for all target sites before implementation
  - Primary reliance: BrickOwl API (legitimate, documented access)
  - Fallback: Manual price entry or user-contributed pricing (Wikipedia model)

**2. Solo Developer Bandwidth & Burnout Risk** ⚠️ **MEDIUM-HIGH**

- **Risk**: 8-10 weeks of part-time solo development on complex features is ambitious; may lead to burnout or timeline slip
- **Impact**: MVP delivery delayed or features cut, quality issues, technical debt accumulates
- **Likelihood**: Medium (personal projects often slip due to life events, day job demands, motivation fluctuations)
- **Mitigation**:
  - Build buffer: Acknowledge 12-14 weeks is more realistic, set 8-10 as stretch goal
  - Phased delivery: Deliver Overview + Galleries in Week 6, Budget + URL Ingestion in Week 10
  - Ruthless prioritization: If timeline slips, cut Smart URL Ingestion first (nice-to-have), keep core metrics
  - Accountability: Share progress updates with beta testers weekly to maintain momentum

**3. Parts Pricing Data Quality & Maintenance Risk** ⚠️ **MEDIUM**

- **Risk**: Scraped pricing data is inaccurate, stale, or inconsistent across vendors; scraper breaks when sites change structure
- **Impact**: Cost-to-build calculations are wrong, users lose trust, manual maintenance burden grows
- **Likelihood**: Medium (websites change frequently, pricing varies widely, scraper maintenance is ongoing)
- **Mitigation**:
  - Start simple: BrickOwl API as primary source (most stable)
  - Graceful degradation: Show data staleness ("Prices last updated 3 days ago")
  - User override: Allow manual price entry/correction if data seems wrong
  - Monitoring: Alert if scraper fails for >7 days, manual intervention required

**4. User Adoption of Manual Parts Ownership Entry Risk** ⚠️ **MEDIUM**

- **Risk**: Users refuse to manually enter parts ownership %, rendering core metrics useless
- **Impact**: "Ready to Build" metric and gauge chart have no data, dashboard loses value
- **Likelihood**: Medium (manual data entry is always friction, especially for large collections)
- **Mitigation**:
  - Frictionless UX: Slider + quick buttons ("I own all parts", "I own none") make entry <30 seconds
  - Progressive disclosure: Don't require parts ownership during initial MOC creation, prompt later
  - Batch operations: Allow bulk "mark 10 MOCs as 100% owned" for efficiency
  - Clear value communication: Show preview of what gauge chart will look like with data

**5. Database Query Performance at Scale Risk** ⚠️ **LOW-MEDIUM**

- **Risk**: Dashboard metric calculations (aggregations across 500+ MOCs) cause slow page loads
- **Impact**: Violates "lightweight" promise, users abandon dashboard
- **Likelihood**: Low for MVP scale (500 MOCs), Medium at 1000+
- **Mitigation**:
  - Indexing: Add database indexes on frequently queried fields (status, theme, user_id)
  - Caching: Use Redis to cache metric calculations for 5 minutes (on-demand recalculation)
  - Pagination: Galleries use pagination/infinite scroll, not loading all MOCs at once
  - Performance testing: Test with 1000 MOC dataset before launch

**6. Smart URL Ingestion Accuracy Risk** ⚠️ **MEDIUM**

- **Risk**: URL parsing fails or extracts incorrect data >20% of the time
- **Impact**: Users lose trust, revert to manual entry, feature adoption drops
- **Likelihood**: Medium (websites have inconsistent HTML structure, edge cases abound)
- **Mitigation**:
  - Manual review step: Always show extracted data for user confirmation before saving
  - Error handling: Graceful fallback to manual entry if parsing fails
  - Start with 1-2 sites: Master BrickLink parsing before adding LEGO.com and Rebrickable
  - Community feedback: Beta testers report failed URLs, incrementally improve parser

---

### Open Questions (DECISIONS MADE)

**Product & Feature Questions:**

- ✅ **Q1**: **Themes from config file, admin-managed** (avoids misspellings/duplicates)
- ✅ **Q2**: **Recently added default sort** with sortable columns
- ✅ **Q3**: **Budget tracking is LEGO parts/sets only** (no tools/supplies in MVP)
- ✅ **Q4**: **Major actions only** for activity tracking (reduces noise)
- ✅ **Q5**: **Hybrid approach** - thumbnails in S3, link to original source

**Technical Questions:**

- ✅ **Q6**: **D3.js** for visualizations (powerful, customizable)
- ✅ **Q7**: **Avoid BrickLink** (no public API); use **BrickOwl API** + web scraping for **LEGO.com Bricks & Pieces** and **WebBricks**
- ✅ **Q8**: **Add quantity column** to sets table (for multiple copies)

**User Experience Questions:**

- ✅ **Q9**: **Dashboard is default landing page** (solo user initially, can change later)
- ✅ **Q10**: **Friendly empty state** with clear CTA ("Add your first MOC!")
- ✅ **Q11**: **No tutorial/onboarding** (solo user, not needed in MVP)

---

### Areas Needing Further Research

**1. BrickOwl & Rebrickable Data Access**

- Research BrickOwl API capabilities (parts pricing, inventory data, rate limits)
- Test Rebrickable API free tier limits (1000 requests/day sufficient for MVP?)
- Identify alternative data sources if primary sources fail (other LEGO marketplaces)
- Benchmark pricing accuracy across vendors

**2. Parts Pricing Data Sources & Accuracy**

- Prototype BrickOwl API integration (test free tier limits and response times)
- Determine refresh frequency needed (daily, weekly, on-demand?)
- Research if historical pricing data is available (for trend analysis)
- Estimate storage requirements for full parts catalog pricing history

**3. Smart URL Ingestion Technical Feasibility**

- Prototype parsers for BrickLink, LEGO.com, Rebrickable
- Measure success rate on sample dataset (50-100 URLs)
- Identify edge cases (non-English sites, mobile URLs, redirects)
- Estimate parsing time (must be <30 seconds)

**4. Performance Benchmarking**

- Load test database with 1000-MOC collection, measure query times
- Test D3 visualization rendering with large datasets (100+ data points on scatterplot)
- Measure Smart URL Ingestion throughput (how many URLs can process per minute?)
- Identify performance bottlenecks before launch

---

## Appendices

### A. Research Summary

**Source:** Brainstorming Session Results (2025-10-15)
**Facilitator:** Business Analyst Mary
**Participant:** Michael Menard

**Key Findings:**

1. **User Dashboard Concept Validation**
   - 50+ ideas generated across "What If" and SCAMPER techniques
   - Strong consensus on financial transparency as primary differentiator
   - Clear preference for tabbed layout over single long-scroll page
   - AI features explicitly deferred to Phase 2 (focus on personal management first)

2. **Feature Prioritization**
   - **Top 3 priorities identified**:
     1. Overview Tab with metrics & visualizations (foundation)
     2. Four Gallery System (core content management)
     3. Financial Intelligence - Budget Tab + Parts Database (differentiator)
   - Smart URL Ingestion ranked high for reducing friction
   - Activity Timeline provides valuable context without being primary feature

3. **Design Insights**
   - Multiple data visualization types serve different analytical needs
   - "Lightweight and joyful" principle - dashboard enhances building, doesn't obstruct it
   - Clean navigation: Minimal navbar + FAB for quick actions
   - Empty states guide users to first actions

4. **Technical Discovery**
   - Parts pricing requires scheduled scraper (not real-time)
   - Smart URL parsing feasible for LEGO.com, BrickLink, Rebrickable
   - Theme taxonomy needs centralized management (config file)
   - Parts ownership tracking is manual in MVP (auto-sync is Phase 2)

5. **Scope Learnings**
   - Social features explicitly out of scope for MVP and Phase 2
   - Four galleries are all non-negotiable (each serves distinct purpose)
   - Gamification and AI are Phase 2+ moonshots
   - Full MVP is achievable solo in 8-10 weeks given existing platform

**Follow-up Questions from Brainstorming:**

- How do we handle MOCs spanning multiple themes? (Answer: Primary theme + tags system, defer to v1.1)
- Should scatterplot be interactive in Phase 2? (Defer decision until user feedback)
- What's the ideal parts pricing refresh frequency? (Daily scraper, <7 day staleness target)

---

### B. Stakeholder Input

**Primary Stakeholder:** Michael Menard (Solo Developer, Product Owner, User)

**Context:**

- Personal project with minimal budget
- Solo developer wearing all hats (PM, engineering, QA, DevOps)
- 15-20 hours/week development capacity
- Existing LEGO MOC platform with auth-service and lego-projects-api infrastructure

**Key Input:**

- Full MVP scope is acceptable (no descoping needed)
- 8-10 week timeline is realistic for solo development
- Willing to do manual testing and self-dogfooding
- Will invite 5-10 LEGO enthusiast friends for beta feedback post-launch

**Decisions Made:**

- Dashboard metrics calculated on-demand (not pre-cached)
- Smart URL Ingestion is synchronous (no job queue)
- Parts pricing history kept indefinitely (for trending analysis)
- API architecture decision deferred to developer (REST vs. GraphQL)
- Internationalization deferred to Phase 2 (English-only MVP)
- Themes managed in config file (admin-controlled)
- D3.js for visualizations
- BrickOwl API + LEGO.com/WebBricks web scraping (avoid BrickLink, no public API)

---

### C. References

**Technical Documentation:**

- Repository: `/Users/michaelmenard/Development/Monorepo/`
- Architecture: `docs/architecture/`
- PRD location: `docs/prd/`
- Tech stack: `docs/architecture/tech-stack.md`
- Coding standards: `docs/architecture/coding-standards.md`

**Platform Services:**

- Auth Service: `apps/api/auth-service/` (Port 9300, MongoDB + Mongoose)
- LEGO Projects API: `apps/api/lego-projects-api/` (Port 9000, PostgreSQL + Drizzle)
- Frontend: `apps/web/lego-moc-instructions-app/` (Port 3002, React 19 + TanStack Router)

**Shared Packages:**

- UI Components: `packages/core/ui/`
- Auth: `packages/core/auth/`
- File Upload: `packages/core/upload/`
- MOC Instructions: `packages/features/moc-instructions/`
- Gallery: `packages/features/Gallery/`

**External APIs & Data Sources:**

- BrickOwl API: https://www.brickowl.com/api (parts pricing, inventory data)
- Rebrickable API: https://rebrickable.com/api/ (MOC metadata, alternate builds)
- LEGO.com Bricks & Pieces: Web scraping (legal review required)
- WebBricks: Web scraping (secondary parts data source)

**Brainstorming Session:**

- Results document: `docs/brainstorming-session-results.md`
- Session date: 2025-10-15
- Techniques used: What If Scenarios, SCAMPER Method

**Project Brief:**

- Output file: `docs/brief.md`
- Version: 1.0 (this document)
- Created: 2025-10-15

---

## Next Steps

### Immediate Actions

1. **Legal & Terms of Service Review** (Week 0, before development starts)
   - Review LEGO.com Terms of Service for web scraping permissions
   - Review WebBricks Terms of Service
   - Check BrickOwl API usage limits and restrictions
   - Document findings and acceptable use boundaries

2. **Technical Spike - Parts Pricing Scraper** (Week 0-1, 4-6 hours)
   - Prototype BrickOwl API integration (test free tier limits)
   - Prototype LEGO.com Bricks & Pieces scraper (test feasibility)
   - Prototype WebBricks scraper (fallback data source)
   - Measure scraping success rate and processing time
   - Select primary data source based on results

3. **Technical Spike - Smart URL Ingestion** (Week 1, 4-6 hours)
   - Prototype BrickLink MOC page parser (HTML structure analysis)
   - Prototype Rebrickable parser (API-based, should be straightforward)
   - Prototype LEGO.com set page parser
   - Test with 20-30 sample URLs, measure accuracy (target: 80%+)
   - Document edge cases and fallback strategies

4. **Database Schema Design** (Week 1, 4 hours)
   - Design `parts_pricing` table (vendor, price, currency, scraped_at)
   - Design `budget_tracking` table (amount, theme, date, category)
   - Design `inspiration_gallery` table (image_url, thumbnail_s3_key, tags, notes)
   - Add `parts_owned_percentage` and `quantity` columns to existing tables
   - Create migration scripts

5. **Theme Configuration File** (Week 1, 1 hour)
   - Create `config/lego-themes.json` with official LEGO theme list
   - Include: Star Wars, City, Creator, Modular Buildings, Technic, etc.
   - Add "Other/Custom" option for non-standard themes
   - Document admin process for adding/removing themes

6. **D3.js Visualization Prototyping** (Week 2, 6-8 hours)
   - Build gauge chart prototype (0-100% progress visualization)
   - Build pie/doughnut chart prototype (theme breakdown)
   - Build scatterplot prototype (price vs. pieces, shape/color coding)
   - Test with sample data, ensure responsive design
   - Document reusable chart components for `packages/core/dashboard/`

7. **Create Project Brief Handoff** (Completed)
   - ✅ Saved Project Brief to `docs/brief.md`
   - Review brief thoroughly for any gaps or questions
   - Share with any stakeholders (if applicable)
   - **Ready to transition to PRD development**

---

### PM Handoff

This Project Brief provides the full context for the **LEGO MOC Dashboard** project.

**Project Summary:**

- **What**: Post-login dashboard with 4 tabs (Overview, Activity, Galleries, Budget) providing collection insights, financial transparency, and content organization
- **Why**: LEGO enthusiasts lack unified tools for managing collections with financial visibility
- **Who**: Solo developer (Michael Menard), personal project, minimal budget
- **When**: 8-10 week MVP timeline, ~15-20 hours/week
- **How**: Extend existing platform infrastructure, React + PostgreSQL + D3.js

**Key Decisions Made:**

- Full MVP scope approved (no descoping)
- Parts ownership tracking is manual (slider + quick buttons)
- BrickOwl API + LEGO.com/WebBricks scraping for pricing data
- D3.js for visualizations
- Themes config-file managed
- Dashboard is default landing page
- Solo user for MVP (no onboarding tutorial needed)

**Critical Success Factors:**

1. Parts pricing scraper legality validated (Week 0)
2. Smart URL Ingestion achieves 80%+ accuracy
3. Dashboard loads in <2 seconds for 500 MOC collections
4. "Lightweight" promise maintained (doesn't obstruct building)

**Next Phase:** Please start in **PRD Generation Mode**. Review this brief thoroughly, then work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.

---

_Project Brief created by Business Analyst Mary using the BMAD-METHOD™ framework_
