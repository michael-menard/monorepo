# Future Risks: WISH-2006 - Accessibility

## Non-MVP Risks

### Risk 1: Accessibility Regression in Future Features

**Impact (if not addressed post-MVP):**
- New features added to wishlist may not follow accessibility patterns
- Keyboard navigation breaks when new modals or components are added
- WCAG compliance drifts over time

**Recommended Timeline:** Ongoing

**Mitigation:**
- Add ESLint accessibility rules to enforce ARIA patterns
- Include accessibility checklist in PR template
- Run axe-core in CI for every deploy
- Periodic accessibility audits (quarterly)

---

### Risk 2: Performance Degradation with Large Lists

**Impact (if not addressed post-MVP):**
- Roving tabindex with 1000+ items may cause lag
- ResizeObserver recalculations on every resize
- Screen reader announcements overwhelm on rapid navigation

**Recommended Timeline:** Phase 2 (after 100+ items in production)

**Mitigation:**
- Virtualize gallery grid (react-window or similar)
- Debounce ResizeObserver callbacks
- Throttle screen reader announcements (max 1 per 300ms)
- Pagination or infinite scroll for large lists

---

### Risk 3: Browser/OS Compatibility Issues

**Impact (if not addressed post-MVP):**
- Safari may handle focus differently than Chrome
- Firefox keyboard shortcuts may conflict
- Mobile browsers (iOS Safari, Chrome Mobile) have limited keyboard support

**Recommended Timeline:** Phase 2 (after initial deployment)

**Mitigation:**
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Document known browser quirks
- Polyfills for older browsers (focus-visible, ResizeObserver)
- Mobile-specific fallbacks (touch gestures instead of keyboard)

---

### Risk 4: Internationalization (i18n) for Screen Readers

**Impact (if not addressed post-MVP):**
- Screen reader announcements are hardcoded in English
- Non-English users get English announcements
- ARIA labels don't translate

**Recommended Timeline:** When i18n is added to app

**Mitigation:**
- Use i18n library for all announcement strings
- Translate ARIA labels via i18n
- Test screen readers in multiple languages

---

### Risk 5: Custom Theme Color Contrast

**Impact (if not addressed post-MVP):**
- User-customizable themes may break WCAG contrast requirements
- Dark mode vs light mode may have different contrast issues
- Focus ring color may not be visible on all backgrounds

**Recommended Timeline:** Before theme customization feature

**Mitigation:**
- Lock focus ring color to high-contrast value (don't allow customization)
- Run axe-core against all theme variants
- Provide high-contrast theme option
- Warn users if custom colors break contrast

---

### Risk 6: Accessibility for Drag-and-Drop Priority Reorder

**Impact (if not addressed post-MVP):**
- Current story assumes drag-and-drop for priority reordering (from WISH-2005)
- Drag-and-drop is not keyboard accessible
- Screen reader users can't reorder items

**Recommended Timeline:** Phase 2 (high priority if drag-and-drop is primary method)

**Mitigation:**
- Add keyboard-accessible alternative for reordering
- Option A: Arrow keys + Shift to move item up/down
- Option B: Context menu with "Move Up" / "Move Down" options
- Option C: Dedicated reorder mode with keyboard controls
- Follow ARIA drag-and-drop pattern

---

### Risk 7: Third-Party Library Updates Breaking Accessibility

**Impact (if not addressed post-MVP):**
- Radix UI updates may change focus trap behavior
- React 19 updates may break keyboard event handling
- Tailwind CSS updates may change focus ring styles

**Recommended Timeline:** Ongoing (every major dependency update)

**Mitigation:**
- Pin major versions of accessibility-critical libraries
- Regression tests for accessibility in CI
- Test focus trap and keyboard nav after every Radix update
- Subscribe to Radix/React accessibility changelogs

---

### Risk 8: Advanced Screen Reader Features

**Impact (if not addressed post-MVP):**
- Missing ARIA landmarks (main, navigation, complementary)
- No logical heading hierarchy (h1 → h2 → h3)
- No skip links ("Skip to gallery", "Skip to filters")
- Table semantics for grid layout not implemented

**Recommended Timeline:** Phase 2 (nice-to-have, not critical)

**Mitigation:**
- Add ARIA landmarks to app layout
- Enforce heading hierarchy with ESLint rule
- Add skip links to top of page
- Consider role="grid" for gallery (more complex than role="list")

---

## Scope Tightening Suggestions

### Defer to Future Iterations

**1. Voice Control Support**
- Complex, low user demand
- Defer until user feedback requests it

**2. Custom Keyboard Shortcuts**
- MVP uses hardcoded shortcuts (A, G, Delete)
- Customization adds complexity
- Defer until power users request it

**3. WCAG AAA Compliance**
- MVP targets WCAG AA (4.5:1 contrast)
- AAA (7:1 contrast) is stricter but not required
- Defer unless legal compliance demands it

**4. Automated Screen Reader Testing**
- Manual testing is sufficient for MVP
- Automated testing with @guidepup/guidepup is nice-to-have
- Defer until manual testing shows frequent regressions

**5. Advanced Focus Styles (Animations)**
- Animated focus rings are polish
- Static focus ring is sufficient for MVP
- Defer to UX polish phase

---

## Future Requirements

### Nice-to-Have Requirements (Post-MVP)

**1. Keyboard Shortcut Help Overlay**
- Press `?` to show all keyboard shortcuts
- Helpful for discoverability
- Not critical for MVP (can document in help docs)

**2. Focus Visible Polyfill**
- Show focus ring only on keyboard, not mouse clicks
- Cleaner UX for mouse users
- Not critical for MVP (always show focus ring is acceptable)

**3. Reduced Motion Preferences**
- Respect `prefers-reduced-motion` media query
- Disable animations for users who prefer no motion
- Not critical for MVP (minimal animations anyway)

**4. High Contrast Mode**
- Windows high contrast mode support
- Forced colors mode for low vision users
- Not critical for MVP (WCAG AA sufficient)

**5. Touch-Friendly Focus States**
- Show focus ring on tap (not just keyboard)
- Larger touch targets on mobile (48x48px)
- Not critical for MVP (focus on keyboard-only users first)

---

## Polish and Edge Case Handling

### Edge Cases to Handle in Future

**1. Focus During Loading States**
- What happens if user presses arrow keys while gallery is loading?
- MVP: Ignore gracefully
- Future: Queue navigation commands until load complete

**2. Focus with Empty Gallery**
- No items to focus
- MVP: Show message, focus Add button
- Future: Skip link directly to Add button

**3. Focus with Single Item**
- Arrow keys do nothing
- MVP: Focus stays on single item (no errors)
- Future: Visual hint that navigation is disabled

**4. Focus During Filter/Sort**
- Gallery re-renders, focus may be lost
- MVP: Return focus to first item
- Future: Preserve focus on same logical item (by ID)

**5. Focus with Server Error**
- Gallery fails to load
- MVP: Show error, focus Retry button
- Future: Announce error to screen reader

---

## Maintenance Recommendations

### Post-Launch Monitoring

**1. Analytics for Keyboard Usage**
- Track keyboard shortcut usage (how often A, G, Delete are pressed)
- Helps prioritize future keyboard features

**2. User Feedback on Accessibility**
- Add "Accessibility Feedback" link
- Collect feedback from screen reader users
- Helps identify missed issues

**3. Periodic Accessibility Audits**
- Run axe-core quarterly (even if no changes)
- Manual screen reader testing semi-annually
- External accessibility audit annually

**4. Dependency Update Testing**
- Test accessibility after every Radix/React update
- Run full Playwright accessibility suite
- Verify no regressions

---
