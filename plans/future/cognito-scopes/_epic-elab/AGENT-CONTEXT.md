---
schema: 1
command: elab-epic-setup
feature_dir: "/Users/michaelmenard/Development/Monorepo/plans/future/cognito-scopes"
prefix: "COGN"
stories_path: "/Users/michaelmenard/Development/Monorepo/plans/future/cognito-scopes/stories.index.md"
output_path: "/Users/michaelmenard/Development/Monorepo/plans/future/cognito-scopes/_epic-elab/"
story_count: 27
timestamp: "2026-02-04T18:24:00Z"
artifacts:
  index: found
  meta: found
  exec: found
  roadmap: found
  bootstrap: found
---

# Epic Elaboration Context

## Feature: COGN - User Authorization & Tier System

**Prefix:** COGN
**Total Stories:** 27
**Status:** Setup Complete

## Artifact Locations

- Stories Index: `stories.index.md`
- Meta Plan: `PLAN.meta.md`
- Exec Plan: `PLAN.exec.md`
- Roadmap: `roadmap.md`
- Bootstrap Context: `_bootstrap/AGENT-CONTEXT.md`

## Ready-to-Start Stories (No Dependencies)

1. COGN-001: Create user_quotas Database Schema
2. COGN-003: Configure Cognito User Pool & Groups
3. COGN-026: Create Documentation & Runbooks

## Story Dependency Structure

**Phase 1 - Foundation (Stories 1-4):**
- COGN-001: Database schema (no deps)
- COGN-002: Depends on COGN-001
- COGN-003: Cognito config (no deps)
- COGN-004: Depends on COGN-001, COGN-003

**Phase 2 - API Authorization (Stories 5-14):**
- COGN-005: Depends on COGN-003, COGN-004
- COGN-006: Depends on COGN-005
- COGN-007: Depends on COGN-005, COGN-001
- COGN-008: Depends on COGN-007
- COGN-009: Depends on COGN-007
- COGN-010: Depends on COGN-006, COGN-008, COGN-009
- COGN-011: Depends on COGN-006, COGN-008
- COGN-012: Depends on COGN-006, COGN-008
- COGN-013: Depends on COGN-006, COGN-008
- COGN-014: Depends on COGN-006, COGN-007

**Phase 3 - Frontend Integration (Stories 15-18):**
- COGN-015: Depends on COGN-005
- COGN-016: Depends on COGN-015
- COGN-017: Depends on COGN-016
- COGN-018: Depends on COGN-016

**Phase 4 - Age Restrictions & Safety (Stories 19-21):**
- COGN-019: Depends on COGN-001
- COGN-020: Depends on COGN-004, COGN-019
- COGN-021: Depends on COGN-020, COGN-016

**Phase 5 - Monitoring & Operations (Stories 22-24):**
- COGN-022: Depends on COGN-004, COGN-006
- COGN-023: Depends on COGN-004, COGN-006
- COGN-024: Depends on COGN-008, COGN-009

**Phase 6 - Testing & Launch (Stories 25-27):**
- COGN-025: Depends on COGN-004, COGN-006, COGN-007, COGN-008
- COGN-026: Documentation (no deps)
- COGN-027: Depends on COGN-025, COGN-026, COGN-022, COGN-023

## Next Steps

Elaboration phases to execute:
1. **Phase 1 - PM Review** (~5k tokens): Refine business context, constraints, acceptance criteria
2. **Phase 2 - UX/Design Review** (~5k tokens): Validate user flows, messaging, tier positioning
3. **Phase 3 - Tech Architect Review** (~8k tokens): Assess technical feasibility, identify risks
4. **Phase 4 - Scrum Master Review** (~3k tokens): Validate story breakdown, dependencies, sizing
5. **Phase 5 - Aggregation** (~3k tokens): Consolidate feedback and recommendations
6. **Phase 6 - Interactive Refinement** (~10k tokens): Integrate feedback into stories

**Total Estimated Cost:** ~$0.15-0.25 USD (~34k tokens)
