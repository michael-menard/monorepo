# WINT-8090 Phase 0 Setup - Summary

**Story ID**: WINT-8090  
**Title**: Add Backlog Metrics to Dashboard  
**Status**: Ready for Implementation  
**Setup Date**: 2026-03-22  

## Story Overview

Add backlog health and activity metrics to the workflow-roadmap dashboard. Extend `dashboardService.getDashboard()` with new SQL queries against `workflow.stories` to compute backlog summary metrics (total open, by priority, by type, intake rate, aging distribution), add corresponding fields to the `DashboardResponse` type, and build 2-3 new frontend dashboard panels (`BacklogSummaryCard`, `BacklogAgingList`) that render within the existing `DashboardPage` grid layout and participate in its 60-second polling cycle.

## Elaboration Status

- **Verdict**: CONDITIONAL_PASS
- **Total ACs**: 8 (all mapped to implementation)
- **Key Notes**: 
  - BacklogIntakeChart explicitly OUT of scope
  - Test plan added
  - Chart ambiguity resolved
  - Opportunities logged: empty state handling, composite index, logging, chart (all deferred)

## Scope Analysis

### Touches

| Area | Status |
|------|--------|
| Backend | TRUE - dashboardService.ts SQL queries |
| Frontend | TRUE - Dashboard page + new components |
| Packages | FALSE |
| Database | FALSE - uses existing tables |
| Contracts | TRUE - DashboardResponse type extension |
| UI | TRUE - New panels + cards |
| Infrastructure | FALSE |

### Files to Create

1. `apps/web/workflow-roadmap/src/components/dashboard/BacklogSummaryCard/index.tsx`
2. `apps/web/workflow-roadmap/src/components/dashboard/BacklogSummaryCard/__tests__/BacklogSummaryCard.test.tsx`
3. `apps/web/workflow-roadmap/src/components/dashboard/BacklogAgingList/index.tsx`
4. `apps/web/workflow-roadmap/src/components/dashboard/BacklogAgingList/__tests__/BacklogAgingList.test.tsx`

### Files to Modify

1. `apps/api/workflow-admin/roadmap-svc/src/services/dashboardService.ts` - Extend getDashboard() with backlog metric queries
2. `apps/web/workflow-roadmap/src/pages/DashboardPage/index.tsx` - Integrate new components
3. `apps/web/workflow-roadmap/src/store/roadmapApi.ts` - Extend DashboardResponse type

## Dependencies

### Database
- `workflow.stories` table - for backlog metrics
- `workflow.story_state_history` table - for aging distribution

### Code Dependencies
- Existing `DashboardResponse` type in dashboardService.ts
- RTK Query `useGetDashboardQuery` hook
- @repo/app-component-library components (Card, Button, Table, Badge)
- Tailwind CSS utilities

### Frontend Polling
- Existing 60-second polling cycle in DashboardPage
- Both new panels must integrate seamlessly

## Risk Assessment

### Performance (FLAGGED)
- New SQL queries must be efficient
- Test coverage required for query performance
- Composite indexes may be needed for large backlog tables

### No Other High Risks
- No auth changes needed
- No payments involved
- No migrations required
- No external APIs
- No security concerns identified

## Implementation Notes

### Backend Phase
1. Analyze current `getDashboard()` SQL patterns (5 parallel queries)
2. Add new queries for:
   - Total open backlog count
   - Breakdown by priority (P1-P5)
   - Breakdown by story type
   - Intake rate (last 7/30 days)
   - Aging distribution (stories by days_in_state ranges)
3. Extend `DashboardResponse` type with new fields
4. Implement unit tests for SQL queries (AC-7)

### Frontend Phase
1. Create `BacklogSummaryCard` component
   - Display summary stats in grid
   - Show total, by priority, by type
   - Integrate into dashboard grid layout
   - Component tests (AC-8)

2. Create `BacklogAgingList` component
   - Show aging distribution
   - Display stories in state ranges
   - Integrate into dashboard layout
   - Component tests

3. Update DashboardPage
   - Import new components
   - Add to grid layout
   - Ensure polling cycle includes new data

## Key Constraints

1. No barrel files (direct imports only)
2. Zod schemas for all types
3. Use @repo/logger, not console
4. No TypeScript interfaces - use Zod with z.infer
5. Use @repo/app-component-library components
6. Minimum 45% test coverage
7. Named exports preferred
8. Tailwind CSS only for styling

## Acceptance Criteria Summary

| AC # | Title | Status |
|------|-------|--------|
| AC-1 | getDashboard() returns backlog metrics | Implementation |
| AC-2 | BacklogSummaryCard renders summary | Implementation |
| AC-3 | BacklogAgingList renders aging data | Implementation |
| AC-4 | New panels integrate into DashboardPage | Implementation |
| AC-5 | Polling cycle includes new data | Implementation |
| AC-6 | Empty state handling works | Implementation |
| AC-7 | Unit tests for SQL queries | Implementation |
| AC-8 | Component tests for panels | Implementation |

## Next Steps

1. Create backlog metric SQL queries in dashboardService.ts
2. Extend DashboardResponse type
3. Create BacklogSummaryCard component
4. Create BacklogAgingList component
5. Update DashboardPage to integrate components
6. Write comprehensive tests
7. Verify 60-second polling cycle
8. Code review and QA

## Worktree Details

- **Path**: /Users/michaelmenard/Development/monorepo/tree/story/WINT-8090
- **Branch**: story/WINT-8090
- **Status**: Ready for implementation
