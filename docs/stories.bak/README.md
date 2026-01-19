# User Stories - LEGO MOC Organization App

## Overview

This directory contains all user stories organized by epic, following a logical user flow.

## Story Naming Convention

**Format:** `{prefix}-{number}-{slug}.md`

| Prefix | Epic | Description |
|--------|------|-------------|
| `hskp` | 0 | Housekeeping - bugs, tests, maintenance |
| `auth` | 1 | Auth - authentication, email, security |
| `dash` | 2 | Dashboard - home, overview, real-time |
| `glry` | 3 | Shared Gallery - reusable components |
| `inst` | 4 | Instructions - MOC CRUD operations |
| `insp` | 5 | Inspiration - inspiration gallery |
| `wish` | 6 | Wishlist - wishlist gallery |
| `sets` | 7 | Sets - LEGO sets gallery |
| `pref` | 8 | Settings - user preferences |

**Number Format:** Sequential from 1000 within each epic (e.g., `inst-1000`, `inst-1001`)

## Directory Structure

```
docs/stories/
├── epic-0-housekeeping/     # Bugs, tests, maintenance
├── epic-1-auth/             # Auth and email
├── epic-2-dashboard/        # Dashboard features
├── epic-3-shared-gallery/   # Shared gallery components
├── epic-4-instructions/     # Instructions CRUD
├── epic-5-inspiration/      # Inspiration gallery
├── epic-6-wishlist/         # Wishlist gallery
├── epic-7-sets/             # Sets gallery
├── epic-8-settings/         # User preferences
├── _archive/                # Archived and reference docs
└── README.md
```

## Epic Summary

| Epic | Stories | Focus |
|------|---------|-------|
| 0 - Housekeeping | 4 | E2E tests, bug fixes |
| 1 - Auth | 2 | SES email integration |
| 2 - Dashboard | 8 | Real-time dashboard |
| 3 - Shared Gallery | 1 | Reusable gallery components |
| 4 - Instructions | 30 | MOC create/edit/delete |
| 5 - Inspiration | 6 | Inspiration features |
| 6 - Wishlist | 4 | Wishlist features |
| 7 - Sets | 5 | Sets features |
| 8 - Settings | 17 | User preferences |

**Total Active Stories:** 77

## User Flow Organization

The epics follow a logical user journey:

1. **Auth (E1)** - User logs in, password reset, email verification
2. **Dashboard (E2)** - User lands on home/dashboard
3. **Gallery (E3)** - Shared components for all galleries
4. **Instructions (E4)** - Primary content: view, create, edit, delete MOCs
5. **Inspiration (E5)** - Browse/save inspiration images
6. **Wishlist (E6)** - Track wanted items
7. **Sets (E7)** - Manage owned LEGO sets
8. **Settings (E8)** - Configure preferences

## Story Structure

Each story follows the vertical slice approach:

- **Frontend Changes** - UI components, interactions
- **Backend Changes** - API endpoints, business logic
- **Database Changes** - Schema, migrations
- **Testing** - Unit, integration, E2E tests

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests passing (>45% coverage)
- [ ] Linter passes (ESLint + Prettier)
- [ ] Accessibility requirements met
- [ ] QA gate passed

## Archives

- `_archive/story-id-mapping.md` - Maps old story IDs to new naming scheme
- `_archive/completed-stories/` - Completed stories from previous sprints

---
*Last updated: 2025-12-26*
