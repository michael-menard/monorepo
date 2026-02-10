# SETS-MVP-0320: Future Opportunities

**Story ID:** SETS-MVP-0320
**Generated:** 2026-02-09

---

## Overview

This document captures future enhancements and improvements that were identified during the elaboration of SETS-MVP-0320 but are explicitly out of scope for the MVP implementation. These opportunities should be considered for future iterations after the MVP is validated.

---

## Deferred Enhancements

### 1. Toast Component Library Enhancement

**Category:** Developer Experience
**Priority:** Medium
**Effort:** Low

**Description:**
The current toast implementation using Sonner is powerful but lacks comprehensive documentation for action button patterns. The BuildStatusToggle component demonstrates the pattern, but it's not formally documented in the app-component-library.

**Opportunity:**
Create a comprehensive toast pattern guide in `@repo/app-component-library` documentation:
- Action button examples
- Best practices for toast duration
- Accessibility guidelines
- Testing patterns for toast interactions

**Benefits:**
- Faster development for future toast implementations
- Consistent toast UX across the application
- Reduced onboarding time for new developers

**Effort Estimate:** 0.5 story points
**Risk:** Low
**Dependencies:** None

**Rationale for Deferral:**
The existing implementation works well. Documentation improvements are valuable but not blocking for MVP.

---

### 2. Advanced Animation Choreography

**Category:** User Experience
**Priority:** Low
**Effort:** Medium

**Description:**
The current implementation uses a simple fade + height collapse animation. More sophisticated animation sequences could enhance the perceived polish:
- Staggered animations for multiple items purchased in sequence
- Celebratory animation (confetti/sparkles) on first purchase
- Smooth item reordering after removal (items slide into place)
- Cross-fade transition when navigating to collection view

**Opportunity:**
Enhance animation system with:
1. Staggered animation support in `AnimatePresence`
2. Celebration animation component (reuse from BuildStatusToggle pattern)
3. Layout animation using Framer Motion's `layout` prop
4. Page transition animations with TanStack Router

**Benefits:**
- More delightful user experience
- Better perceived performance
- Stronger brand personality (LEGO-inspired playfulness)

**Effort Estimate:** 3 story points
**Risk:** Medium (performance impact on low-end devices)
**Dependencies:** None

**Rationale for Deferral:**
Current simple animation meets MVP needs. Advanced animations are "nice-to-have" and risk over-engineering. Should validate with users first before investing in complex animations.

---

### 3. Toast Action Button Keyboard Shortcuts

**Category:** Accessibility / Power User Features
**Priority:** Low
**Effort:** Low

**Description:**
Currently, users must Tab to the "View in Collection" action button and press Enter. Power users might appreciate keyboard shortcuts like:
- `Ctrl+V` or `Cmd+V` to view in collection (while toast is visible)
- `Ctrl+Z` or `Cmd+Z` for undo (after SETS-MVP-0330 implemented)
- `Esc` to dismiss toast

**Opportunity:**
Implement global keyboard shortcut system:
1. Create `useKeyboardShortcut` hook
2. Register shortcuts while toast is visible
3. Add visual hint in toast (e.g., "Press V to view")
4. Document shortcuts in help system

**Benefits:**
- Faster workflow for power users
- Better keyboard accessibility
- Reduced mouse dependency

**Effort Estimate:** 2 story points
**Risk:** Medium (shortcut conflicts with browser/OS shortcuts)
**Dependencies:** SETS-MVP-0330 (for undo shortcut)

**Rationale for Deferral:**
Keyboard shortcuts are valuable for power users but not essential for MVP. Need to validate user demand and ensure no conflicts with existing shortcuts.

---

### 4. Optimistic UI Updates with Rollback

**Category:** Performance / User Experience
**Priority:** Medium
**Effort:** Medium

**Description:**
Current implementation waits for API response before showing toast and removing item. Optimistic updates could improve perceived performance:
- Immediately update UI (show toast, remove item)
- Roll back changes if API call fails
- Show error state with option to retry

**Opportunity:**
Implement optimistic update pattern:
1. Update RTK Query cache optimistically
2. Trigger animation immediately
3. Roll back on error with reverse animation
4. Show error toast with "Retry" action

**Benefits:**
- Faster perceived performance
- More responsive UI
- Better offline support potential

**Effort Estimate:** 2 story points
**Risk:** Medium (complex error handling, race conditions)
**Dependencies:** None

**Rationale for Deferral:**
Optimistic updates add complexity and risk. Current implementation is reliable and fast enough for MVP. Should validate performance needs with real user data before investing in optimistic updates.

**Note:** This was identified in SETS-MVP-0310/FUTURE-OPPORTUNITIES.md as opportunity #4 - deferred to this story, but still out of MVP scope.

---

### 5. Custom Toast Positioning and Stacking

**Category:** User Experience
**Priority:** Low
**Effort:** Low

**Description:**
Sonner uses default toast positioning (bottom-right). Different contexts might benefit from different positioning:
- Top-center for critical success messages
- Bottom-left for non-blocking notifications
- Custom stacking strategies (newest on top vs. bottom)

**Opportunity:**
Extend toast system with positioning options:
1. Add `position` prop to toast utilities
2. Support multiple toast regions
3. Context-aware positioning (e.g., modals show toasts at top)
4. Custom stacking animation strategies

**Benefits:**
- More flexible notification system
- Better attention management for different priority levels
- Reduced notification fatigue

**Effort Estimate:** 1 story point
**Risk:** Low
**Dependencies:** None

**Rationale for Deferral:**
Default positioning works well for MVP. Custom positioning is a refinement that should be driven by user feedback and specific use cases.

---

### 6. Analytics and Tracking

**Category:** Product Analytics
**Priority:** Medium
**Effort:** Low

**Description:**
Track user behavior around the purchase success flow:
- How often do users click "View in Collection"?
- Do users dismiss the toast before clicking?
- How long does the toast remain visible on average?
- Do users purchase multiple items in quick succession?

**Opportunity:**
Implement analytics tracking:
1. Track toast impressions
2. Track "View in Collection" clicks
3. Track toast dismissals (manual vs. auto)
4. Track time-to-click metrics
5. Track multi-purchase sequences

**Benefits:**
- Data-driven UX decisions
- Validate effectiveness of success messaging
- Identify user patterns for future optimizations
- Measure impact of UX changes

**Effort Estimate:** 1 story point
**Risk:** Low
**Dependencies:** Analytics infrastructure (may not exist yet)

**Rationale for Deferral:**
Analytics are valuable but not required for MVP functionality. Should implement after validating core feature works and is used by real users.

---

### 7. Toast Notification Preferences

**Category:** User Preferences
**Priority:** Low
**Effort:** Medium

**Description:**
Allow users to customize toast notification behavior:
- Enable/disable success toasts
- Customize toast duration
- Choose auto-dismiss vs. manual dismiss
- Enable/disable animations

**Opportunity:**
Implement user preference system:
1. Create preferences UI in settings
2. Store preferences in localStorage or user profile
3. Apply preferences to toast behavior
4. Respect system preferences (reduced motion, etc.)

**Benefits:**
- Personalized user experience
- Reduced notification fatigue for frequent users
- Better accessibility for users with cognitive disabilities

**Effort Estimate:** 3 story points
**Risk:** Medium (complex preference management)
**Dependencies:** User settings/preferences infrastructure

**Rationale for Deferral:**
User preferences add complexity and maintenance burden. Should validate that default behavior works for majority of users before adding customization options.

---

### 8. Cross-Page Toast Persistence

**Category:** User Experience
**Priority:** Low
**Effort:** Low

**Description:**
When user clicks "View in Collection", the toast may disappear during navigation. Sonner may support cross-page toast persistence, but this needs verification and testing.

**Opportunity:**
Ensure toast persists across navigation:
1. Verify Sonner's cross-page behavior
2. If not supported, implement custom toast portal
3. Test toast visibility during page transitions
4. Ensure toast dismisses appropriately on new page

**Benefits:**
- Continuous user feedback during navigation
- Better perceived continuity
- Reduced jarring UX during page transitions

**Effort Estimate:** 1 story point
**Risk:** Low
**Dependencies:** None

**Rationale for Deferral:**
Current implementation shows toast before navigation. If toast disappears, it's not critical since user is actively navigating. Should validate if this is actually a problem before implementing.

---

### 9. Toast Action Button Variants

**Category:** Design System
**Priority:** Low
**Effort:** Low

**Description:**
Current toast action button uses default Sonner styling. Future enhancements could include:
- Primary vs. secondary action button styles
- Icon support in action buttons
- Multiple action buttons (e.g., "View" + "Share")
- Custom button variants matching design system

**Opportunity:**
Extend CustomToast component:
1. Support action button variants
2. Add icon support
3. Support multiple actions
4. Apply LEGO-inspired styling to action buttons

**Benefits:**
- Consistent design system
- More flexible toast interactions
- Better visual hierarchy

**Effort Estimate:** 1 story point
**Risk:** Low
**Dependencies:** Design system updates

**Rationale for Deferral:**
Default button styling is functional for MVP. Design refinements should be driven by broader design system evolution, not a single feature.

---

### 10. Animation Performance Monitoring

**Category:** Performance / Quality
**Priority:** Medium
**Effort:** Low

**Description:**
Monitor animation performance to ensure smooth UX across devices:
- Frame rate monitoring during animations
- Jank detection (missed frames)
- Device performance profiling
- Automatic animation simplification on low-end devices

**Opportunity:**
Implement performance monitoring:
1. Add FPS monitoring during animations
2. Track jank events
3. Log slow devices for analysis
4. Implement adaptive animation quality

**Benefits:**
- Ensure smooth UX on all devices
- Data-driven performance optimization
- Proactive issue detection

**Effort Estimate:** 2 story points
**Risk:** Low
**Dependencies:** Performance monitoring infrastructure

**Rationale for Deferral:**
Animation is simple (opacity + height) and should perform well. Performance monitoring is valuable but not critical for MVP. Should implement if user reports indicate performance issues.

---

### 11. Multi-Item Purchase Batch Feedback

**Category:** User Experience
**Priority:** Low
**Effort:** Medium

**Description:**
If user purchases multiple items in quick succession, show aggregated feedback:
- Single toast: "3 items added to your collection!"
- Batch animation (items disappear together)
- Summary view with list of purchased items

**Opportunity:**
Implement batch purchase feedback:
1. Detect multiple purchases in short time window
2. Aggregate toast messages
3. Show item list in toast
4. Batch animations for better performance

**Benefits:**
- Reduced toast spam
- Better performance for batch operations
- Clearer feedback for bulk actions

**Effort Estimate:** 3 story points
**Risk:** Medium (complex timing and aggregation logic)
**Dependencies:** Batch purchase capability (may not exist)

**Rationale for Deferral:**
Current modal flow doesn't support batch purchases. Single-item feedback is appropriate for MVP. Should only implement if batch purchase feature is added in the future.

---

### 12. Toast Notification Sound/Haptic Feedback

**Category:** Accessibility / User Experience
**Priority:** Low
**Effort:** Medium

**Description:**
Add audio and haptic feedback for success notifications:
- Subtle success sound (opt-in)
- Haptic vibration on mobile devices
- Respect user preferences (sound/haptic disabled)

**Opportunity:**
Implement multi-sensory feedback:
1. Add success sound effect
2. Implement haptic feedback API
3. Add user preferences for sound/haptic
4. Ensure accessibility (no reliance on sound alone)

**Benefits:**
- More engaging user experience
- Better feedback for visually impaired users
- Mobile-native feel

**Effort Estimate:** 2 story points
**Risk:** Medium (browser compatibility, user annoyance)
**Dependencies:** Sound assets, haptic feedback API support

**Rationale for Deferral:**
Sound and haptic feedback can be polarizing. Should validate user demand and ensure it enhances rather than detracts from UX. Not essential for MVP.

---

## Summary

**Total Deferred Opportunities:** 12

**Priority Breakdown:**
- High: 0
- Medium: 4 (Analytics, Optimistic Updates, Performance Monitoring, Toast Component Docs)
- Low: 8

**Effort Breakdown:**
- Low: 8 opportunities (0.5-1 story points each)
- Medium: 4 opportunities (2-3 story points each)

**Recommended Next Steps After MVP:**
1. **Analytics and Tracking** (#6) - Validate feature usage and effectiveness
2. **Toast Component Documentation** (#1) - Improve developer experience
3. **Optimistic UI Updates** (#4) - If performance data indicates need
4. **Performance Monitoring** (#10) - If user reports indicate issues

**Deferred for Later:**
- All animation enhancements (#2, #3, #5) - Wait for user feedback
- User preferences (#7) - Wait for demand signal
- Cross-page persistence (#8) - Only if proven to be a problem
- Design system enhancements (#9) - Align with broader design system work
- Batch feedback (#11) - Requires batch purchase feature
- Sound/haptic (#12) - Needs user research

---

## Documentation References

**Related Future Opportunities:**
- SETS-MVP-0310/FUTURE-OPPORTUNITIES.md #4: Optimistic UI update (mentioned in this doc)
- SETS-MVP-0310/FUTURE-OPPORTUNITIES.md #1: Total calculation real-time feedback (separate concern)

**Architecture Decisions:**
- None required for deferred items

**Testing Considerations:**
- Analytics tracking will require new test patterns
- Performance monitoring needs integration with test suite
- Optimistic updates need rollback test scenarios

---

**FUTURE-OPPORTUNITIES COMPLETE**
