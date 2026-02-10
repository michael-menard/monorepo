# Future Risks: WISH-2014 Smart Sorting Algorithms (Non-MVP)

## Non-MVP Risks

### Risk 1: Sort Performance Degradation at Scale

**Risk**: As wishlist grows (10,000+ items), calculated field sorting may become slow

**Impact**: Query times > 5s will degrade UX, but doesn't block MVP (most users have < 1000 items)

**Recommended Timeline**: Monitor performance metrics post-launch, revisit in Q2 if P95 latency > 2s

**Mitigation Options**:
- Add materialized view for calculated fields
- Add cached column in schema (e.g., `price_per_piece DECIMAL`)
- Implement database-side stored procedure for complex sorts

**Future Story**: "WISH-2XXX: Optimize Smart Sorting Performance"

### Risk 2: Sort Mode Feature Discoverability

**Risk**: Users may not discover new sort modes without onboarding

**Impact**: Low adoption of feature, but doesn't prevent core journey

**Recommended Timeline**: Add onboarding tooltip in Phase 5 (UX Polish)

**Mitigation Options**:
- Add "New" badge on sort dropdown for 30 days post-launch
- Show tooltip on first gallery visit: "Try our new smart sorting modes!"
- Add feature announcement in app changelog

**Future Story**: "WISH-2XXX: Sort Mode Onboarding & Discovery"

### Risk 3: Algorithm Accuracy Perception

**Risk**: Users may disagree with "Hidden Gems" algorithm results (subjective definition)

**Impact**: User confusion or dissatisfaction, but doesn't break functionality

**Recommended Timeline**: Gather user feedback post-launch, iterate in Phase 5

**Mitigation Options**:
- Add algorithm explanation in help modal (see FUTURE-UIUX.md)
- Allow users to customize algorithm weights (future story)
- Add "Why is this a hidden gem?" tooltip on cards

**Future Story**: "WISH-2XXX: Customizable Hidden Gems Algorithm"

### Risk 4: Currency Exchange Rate Handling

**Risk**: "Best Value" sort may be inaccurate when comparing items in different currencies

**Impact**: Misleading sort results for international users, but doesn't prevent usage

**Recommended Timeline**: Phase 6 (Internationalization)

**Mitigation Options**:
- Convert all prices to USD before calculating ratio (requires exchange rate API)
- Filter sort to single currency at a time
- Show currency alongside price in sort results

**Future Story**: "WISH-2XXX: Multi-Currency Best Value Sorting"

### Risk 5: Sort Mode Combinations

**Risk**: Users may want to combine sort modes (e.g., "Best Value among High Priority items")

**Impact**: Feature limitation, but doesn't block core journey

**Recommended Timeline**: Phase 5 (Power User Features)

**Mitigation Options**:
- Add secondary sort dropdown
- Implement filter + sort combinations
- Add "Save View" feature for custom sort+filter presets

**Future Story**: "WISH-2XXX: Advanced Multi-Sort Filtering"

### Risk 6: Mobile Dropdown UX

**Risk**: Dropdown with 9+ sort options may be cluttered on mobile

**Impact**: Usability friction, but doesn't prevent selection

**Recommended Timeline**: Phase 4 (Mobile Optimization)

**Mitigation Options**:
- Use bottom sheet/drawer instead of dropdown on mobile
- Group sort options by category (Basic, Smart, Custom)
- Add search within sort dropdown for > 10 options

**Future Story**: "WISH-2XXX: Mobile Sort Drawer UI"

### Risk 7: Real-time Sort Updates

**Risk**: When new items added, sort order may change unexpectedly

**Impact**: User confusion if viewing sorted gallery while adding items

**Recommended Timeline**: Phase 5 (Real-time Features)

**Mitigation Options**:
- Add toast notification: "New item added, refresh to update sort"
- Implement WebSocket for real-time sort updates
- Freeze sort during item addition (manual refresh required)

**Future Story**: "WISH-2XXX: Real-time Sort Updates"

### Risk 8: Accessibility - Sort Mode Explanations

**Risk**: Screen reader users may not understand algorithm without verbose descriptions

**Impact**: Accessibility gap for blind users, but WCAG AA compliant (tooltips exist)

**Recommended Timeline**: Phase 6 (WCAG AAA Compliance)

**Mitigation Options**:
- Add expanded descriptions in dropdown for screen readers (aria-describedby)
- Provide help page with full algorithm explanations
- Add audio examples of sort logic

**Future Story**: "WISH-2XXX: Enhanced Sort Mode Accessibility"

## Scope Tightening Suggestions

### Suggestion 1: Remove "Hidden Gems" from MVP

**Rationale**: Algorithm is subjective and ambiguous (requires PM definition)

**Impact**: Reduces scope by ~30%, eliminates MR2 blocker

**Recommendation**: Defer "Hidden Gems" to Phase 5 after gathering user feedback on "Best Value" and "Expiring Soon"

**OUT OF SCOPE for MVP**:
- Hidden Gems algorithm implementation
- Hidden Gems tests
- Gem icon in dropdown

**IN SCOPE for MVP**:
- Best Value (objective, easy to explain)
- Expiring Soon (objective, easy to explain)

### Suggestion 2: Remove Tooltips from MVP

**Rationale**: Tooltips are polish, not blocking for core journey

**Impact**: Reduces frontend scope by ~20%, simpler component

**Recommendation**: Add tooltips in Phase 4 (UX Polish) after validating sort mode naming

**OUT OF SCOPE for MVP**:
- Tooltip components on sort dropdown
- Tooltip content writing
- Tooltip accessibility testing

**IN SCOPE for MVP**:
- Clear, self-explanatory dropdown labels ("Best Value - Price per piece")

### Suggestion 3: Remove Icons from Sort Options

**Rationale**: Icons are visual polish, not required for functionality

**Impact**: Reduces frontend scope by ~10%, removes icon color decisions

**Recommendation**: Add icons in Phase 4 (UX Polish) with full design review

**OUT OF SCOPE for MVP**:
- Icon selection (TrendingDown, Clock, Gem)
- Icon color decisions (green, orange, purple)
- Icon positioning and spacing

**IN SCOPE for MVP**:
- Text-only dropdown options

### Suggestion 4: Hardcode Order Direction per Sort Mode

**Rationale**: Each smart sort has logical default order (bestValue: asc, expiringSoon: asc, hiddenGems: desc)

**Impact**: Reduces UI complexity, removes order toggle

**Recommendation**: Always use optimal default order, add toggle in future story if users request it

**OUT OF SCOPE for MVP**:
- Order direction toggle (asc/desc)
- Order direction parameter in API

**IN SCOPE for MVP**:
- Fixed order per sort mode

## Future Requirements

### FR1: Sort Mode Usage Analytics

**Requirement**: Track which sort modes users prefer

**Implementation**: Add analytics events on sort selection

**Timeline**: Phase 5

**Priority**: Medium

### FR2: Sort Mode A/B Testing

**Requirement**: Test different algorithm variations (e.g., Hidden Gems formula tweaks)

**Implementation**: Feature flags with experiment tracking

**Timeline**: Phase 6

**Priority**: Low

### FR3: Personalized Sort Recommendations

**Requirement**: Recommend best sort mode based on user behavior

**Implementation**: ML model predicting preferred sort mode

**Timeline**: Phase 7 (AI Features)

**Priority**: Low

### FR4: Export Sorted Lists

**Requirement**: Allow users to export wishlist in current sort order (CSV, PDF)

**Implementation**: Server-side PDF generation, CSV export endpoint

**Timeline**: Phase 6

**Priority**: Medium

### FR5: Sort Mode Sharing

**Requirement**: Share wishlist with specific sort mode via URL (e.g., ?sort=bestValue)

**Implementation**: Persist sort mode in URL query params

**Timeline**: Phase 5

**Priority**: Medium

## Technical Debt Prevention

### TD1: Extract Sort Algorithms to Shared Package

**Debt Risk**: Duplicating sort logic across domains (e.g., if Sets feature needs similar sorting)

**Prevention**: Create `packages/core/sorting-algorithms/` if reuse needed

**Timeline**: After second domain uses similar sorting

### TD2: Database Index Management

**Debt Risk**: Adding many indexes slows writes, increases storage

**Prevention**: Monitor index usage metrics, remove unused indexes quarterly

**Timeline**: Ongoing post-launch

### TD3: Sort Mode Enum Proliferation

**Debt Risk**: Adding many sort modes clutters dropdown and code

**Prevention**: Limit to 10 total sort modes, require PM approval for new modes

**Timeline**: Ongoing

### TD4: Frontend Sort State Management

**Debt Risk**: Sort state scattered across components (local state, URL params, localStorage)

**Prevention**: Centralize in Redux slice or Zustand store

**Timeline**: If sort state complexity increases (Phase 5)

## Testing Strategy for Future Enhancements

### Strategy 1: Performance Regression Testing

**Need**: Ensure sort performance doesn't degrade as data grows

**Implementation**: Automated performance tests with large datasets (10K, 100K items)

**Timeline**: Phase 4 (before production scale)

### Strategy 2: Algorithm Accuracy Testing

**Need**: Validate sort algorithms produce correct ordering

**Implementation**: Property-based testing (e.g., fast-check) with generated datasets

**Timeline**: Phase 3 (before code review)

### Strategy 3: Cross-device Testing

**Need**: Ensure sort UI works on all devices (mobile, tablet, desktop)

**Implementation**: Playwright tests with multiple viewports

**Timeline**: Phase 4 (before QA)

## Migration Path (If Needed)

**Scenario**: Algorithm changes require re-sorting existing lists

**Migration Steps**:
1. Add `last_sorted_at` column to track stale sorts
2. Add background job to re-sort stale lists
3. Show "Sort may be outdated, refresh to update" banner
4. Implement cache invalidation for sorted results

**Timeline**: Only if algorithm changes post-launch

## Rollout Strategy (Future Consideration)

**Recommended Approach**: Gradual feature flag rollout

**Phases**:
1. **Alpha** (Week 1): Internal team only (10 users)
2. **Beta** (Week 2-3): 10% of users, monitor analytics
3. **General Availability** (Week 4): 100% rollout

**Rollback Plan**: Disable feature flag, revert to default sort modes

**Metrics to Monitor**:
- Sort mode adoption rate
- Query latency P50, P95, P99
- Error rate (400, 500 responses)
- User feedback/support tickets

## Post-Launch Monitoring

**Key Metrics**:
1. Sort mode usage distribution (which modes are most popular?)
2. Query performance by sort mode (are any modes slow?)
3. Null value prevalence (how many items have incomplete data?)
4. Error rate (are users hitting validation errors?)
5. Feature discoverability (are users finding new sort modes?)

**Alert Thresholds**:
- Query latency P95 > 2s → Investigate performance
- Error rate > 1% → Investigate validation or null handling
- Adoption rate < 5% after 30 days → Improve discoverability

**Review Cadence**: Weekly for first month, then monthly
