---
doc_type: story
title: "SETS-MVP-0321: Purchase UX Polish - Unit Tests"
story_id: SETS-MVP-0321
story_prefix: SETS-MVP
status: ready-for-qa
follow_up_from: SETS-MVP-0320
phase: 2
created_at: "2026-02-09T23:30:00Z"
updated_at: "2026-02-10T03:51:00Z"
depends_on: [SETS-MVP-0320]
estimated_points: 1
---

# SETS-MVP-0321: Purchase UX Polish - Unit Tests

## Context

Follow-up from SETS-MVP-0320 to add unit tests for the purchase UX polish features (success toast, "View in Collection" navigation callback, error handling).

E2E Playwright tests split to SETS-MVP-0322 (requires live dev server).

## Acceptance Criteria

- [x] AC1: Unit tests for GotItModal success toast (message content, action button, navigation callback)
- [x] AC2: Unit tests verify toast duration is 5000ms and includes item title as description
