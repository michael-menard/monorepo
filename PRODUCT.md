# Product

## What This Is

A personal LEGO building app for tracking a growing collection, planning future purchases, sourcing parts, and managing MOC build plans. Single user — no multi-tenancy, no community features.

## Domain Model

### Sets

An official LEGO set or alt-brick set.

**Acquisition type:** New (sealed) or Used (variable completeness — pieces, minifigs, condition may be partial or unknown).

**Lifecycle:** `Wishlist → Owned → Built → Parted Out`

A parted-out set makes its pieces available for MOC builds.

### MOCs (My Own Creations)

A community-designed build with purchased instructions.

**Lifecycle:** `Wishlist → Instructions Owned → Procurement → Building → Complete`

Build tracking is binary — building or done. No micro-management of build stages.

### Minifigs

Minifigures linked to sets. Tracked for completeness — a used set may arrive with some, all, or no minifigs.

### Parts / Pieces

Individual LEGO or alt-brick pieces. Tracked for procurement — sourced from multiple vendors (BrickLink, alt-brick sites) to build MOCs.

### Instructions

Build plans for MOCs (the purchased digital asset). Always associated with a MOC.

### Themes

Category groupings for sets and MOCs (Castle & Medieval, City & Modular, Nature, Trains, etc.).

### Orders / Procurement

Part orders placed across multiple vendors. The procurement system:

- Aggregates part needs across multiple MOCs designated for building
- Bundles orders across MOCs for better pricing
- Tracks what's been ordered vs what still needs purchasing per MOC
- Sources from BrickLink, alt-brick sites, and parted-out sets

## User Persona

AFOL (Adult Fan of LEGO) who builds MOCs, collects sets, and wants a single app to manage the full lifecycle: discover → purchase → source parts → build → display.

## User Flows

### Browse & Manage Collection

View owned sets and MOCs. Filter by theme, status, piece count. See what's built, sealed, or parted out.

### Add a Set

Add by searching scraped data (Rebrickable, BrickLink, LEGO.com). Mark as new or used with completeness metadata. Enters collection as "Owned."

### Plan a MOC Build

Purchase instructions → MOC enters "Instructions Owned." Designate for building → procurement system calculates part needs, cross-references owned parts from parted-out sets, identifies what to order.

### Source Parts

Procurement optimizer aggregates needs across designated MOCs. Suggests vendor splits for best pricing. Place orders → track fulfillment against MOC needs.

### Track Build Progress

Mark a MOC as "Building" when starting. Mark "Complete" when done.

### Wishlist Management

Save sets and MOCs for future purchase. Prioritize and plan acquisition.

## Feature Inventory

### User-Facing Apps

| App                        | Purpose                            |
| -------------------------- | ---------------------------------- |
| `main-app`                 | Shell — hosts all micro-apps       |
| `app-dashboard`            | Collection overview and stats      |
| `app-sets-gallery`         | Browse and manage owned sets       |
| `app-instructions-gallery` | Browse and manage MOC instructions |
| `app-minifigs-gallery`     | Browse and manage minifigs         |
| `app-wishlist-gallery`     | Wishlist management                |
| `app-inspiration-gallery`  | Discover new MOCs and sets         |
| `app-scraper-queue`        | Manage data scraping jobs          |
| `user-settings`            | Account settings                   |
| `reset-password`           | Password reset flow                |

### Dev/Admin Tools

| App                  | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `app-design-system`  | Design system reference (port 8036)           |
| `workflow-admin-app` | Workflow pipeline admin (being rearchitected) |
| `workflow-roadmap`   | Roadmap visualization (being rearchitected)   |
| `plan-chat`          | Plan discussion interface                     |
| `port-monitor`       | Dev tool — service health dashboard           |

### Data Pipeline

| Service        | Purpose                                        |
| -------------- | ---------------------------------------------- |
| Scrapers       | Rebrickable, BrickLink, LEGO.com (more coming) |
| Knowledge Base | Semantic search, story/plan management via MCP |

### Planned

- Part procurement optimizer (cross-MOC bundling, multi-vendor sourcing)
- Additional scraper sources

## Product Principles

1. **Nothing gets deleted** — always prioritize, never discard
2. **Single user** — built for one person, no multi-tenancy complexity
3. **Automate the tedious** — scrapers, procurement optimization, pipeline automation
4. **Data from everywhere** — multiple scraper sources, alt-brick sites, manual entry as fallback
5. **Track everything** — sets, MOCs, minifigs, parts, orders, build progress
6. **AI-assisted development** — KB-driven planning, agent orchestration, automated workflows
