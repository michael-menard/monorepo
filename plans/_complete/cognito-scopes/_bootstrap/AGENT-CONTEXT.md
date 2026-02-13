---
schema: 2
command: pm-bootstrap-workflow
feature_dir: "/Users/michaelmenard/Development/Monorepo/plans/future/cognito-scopes"
prefix: "COGN"
project_name: "cognito-scopes"
created: "2026-02-03T23:04:00Z"
raw_plan_file: "/Users/michaelmenard/Development/Monorepo/plans/future/cognito-scopes/PLAN.md"
raw_plan_summary: |
  # Epic: User Authorization & Tier System

  **Status:** Draft
  **Priority:** P0 - Critical
  **Owner:** TBD
  **Created:** 2025-12-01

  ---

  ## Overview

  Implement a comprehensive authorization system using AWS Cognito JWT (groups + scopes) with a freemium tier model that controls feature access and usage quotas for a LEGO inventory management platform.

  ---

  ## Business Context

  ### Problem Statement

  - Need to control infrastructure costs (storage, bandwidth, compute) for a small user base (<100 users initially)
  - Want users to try all features in limited quantities before committing to payment
  - Require age-appropriate restrictions for chat features (minors vs adults)
  - Need flexible monetization through tiers and add-ons

  ### Goals

  1. **Cost Protection:** Prevent unlimited storage/bandwidth usage through quotas
  2. **User Experience:** Allow users to experience all features before upgrading
  3. **Safety:** Implement age-appropriate restrictions for chat/social features
  4. **Scalability:** Design system that works for 1 user today, 100+ users tomorrow
  5. **Simplicity:** Avoid over-engineering while maintaining flexibility
---
