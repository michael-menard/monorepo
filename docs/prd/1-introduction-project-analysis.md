# 1. Introduction & Project Analysis

## 1.1 Analysis Source

- **Project Brief:** `docs/brief.md` (completed)
- **IDE-based analysis:** Full codebase access
- **Existing Documentation:** `docs/ux-design/`, `docs/front-end-spec/`, `.bmad-coding-style.md`

## 1.2 Current Project State

The LEGO MOC Instructions App is a personal library/organizer for LEGO enthusiasts (AFOLs) who purchase MOC instructions from external sources. Current state:

- **Monolithic React frontend** in `apps/web/main-app/`
- **Complete backend API** in `apps/api/` (AWS serverless)
- **Shared packages:** `@repo/ui`, `@repo/logger`, `@repo/utils`
- **Comprehensive UX documentation** ready for implementation
- **Previous migration attempt** removed due to poor code quality

## 1.3 Enhancement Scope

**Enhancement Type:** UI/UX Overhaul + Major Architecture Transformation

**Description:** Transform the existing monolithic `main-app` into a shell + domain apps architecture where `main-app` becomes the application shell (layout, auth, navigation) and domain features are standalone apps in `apps/web/`.

**Impact Assessment:** Major Impact (architectural changes required)

## 1.4 Goals

- Establish clean shell + domain app architecture pattern
- Achieve 100% compliance with `.bmad-coding-style.md`
- Implement LEGO-inspired design system from `docs/ux-design/`
- Maintain mobile + desktop parity throughout
- Enable independent development of domain features
- All existing functionality works in new architecture

## 1.5 Background Context

This enhancement is needed because the current monolithic frontend has domain code intertwined, making maintenance difficult. A previous migration attempt failed due to poor code quality (not following coding standards, no Zod schemas, incorrect imports). This fresh start with comprehensive planning ensures the architecture is implemented correctly.

## 1.6 Change Log

| Change      | Date       | Version | Description                     | Author    |
| ----------- | ---------- | ------- | ------------------------------- | --------- |
| Initial PRD | 2025-11-28 | 1.0     | Initial brownfield PRD creation | John (PM) |

---
