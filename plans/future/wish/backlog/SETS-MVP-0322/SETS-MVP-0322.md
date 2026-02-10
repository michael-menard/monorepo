---
doc_type: story
title: "SETS-MVP-0322: Purchase UX Polish - E2E Tests"
story_id: SETS-MVP-0322
story_prefix: SETS-MVP
status: backlog
follow_up_from: SETS-MVP-0321
phase: 2
created_at: "2026-02-10T03:51:00Z"
updated_at: "2026-02-10T03:51:00Z"
depends_on: [SETS-MVP-0320, SETS-MVP-0321]
estimated_points: 1
---

# SETS-MVP-0322: Purchase UX Polish - E2E Tests

## Context

Split from SETS-MVP-0321. E2E Playwright tests for the purchase UX polish features implemented in SETS-MVP-0320 (success toast, "View in Collection" navigation, item removal animation, toast auto-dismiss).

Feature file and step definitions are already written. This story covers running them against a live dev server and fixing any issues.

## Pre-existing Files

- `apps/web/playwright/features/wishlist/wishlist-purchase-toast.feature` (4 scenarios)
- `apps/web/playwright/steps/wishlist-purchase-toast.steps.ts` (step definitions)

## Acceptance Criteria

- [ ] AC1: E2E test: user purchases item, success toast appears with "Added to your collection!"
- [ ] AC2: E2E test: user clicks "View in Collection" in toast, navigates to /collection page
- [ ] AC3: E2E test: item disappears from wishlist view after purchase
- [ ] AC4: E2E test: toast auto-dismisses after timeout
- [ ] AC5: All tests run in live mode (not mocked) per ADR-006
- [ ] AC6: All 4 Playwright scenarios pass against live dev server
