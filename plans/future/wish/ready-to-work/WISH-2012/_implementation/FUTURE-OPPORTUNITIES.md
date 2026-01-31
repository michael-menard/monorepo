# Future Opportunities - WISH-2012

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Real screen reader E2E testing gap | Medium | High | Deferred to WISH-2121 (Playwright MSW setup) per AC17. Mock utilities in WISH-2012 provide foundation but don't replace real screen reader testing with NVDA, JAWS, VoiceOver. Manual testing guide (AC13, line 90-91) partially mitigates. Consider dedicated E2E story for real screen reader automation. |
| 2 | Advanced ARIA pattern testing (combobox, treegrid, etc.) | Low | Medium | WISH-2012 focuses on common patterns (buttons, dropdowns, modals, forms per AC10 line 172). Advanced ARIA patterns like combobox, treegrid, menubar, toolbar are not explicitly covered. Add to future story if wishlist feature requires these patterns. |
| 3 | Automated color contrast checking beyond WCAG AA | Low | Low | AC5 (line 134) targets WCAG AA (4.5:1). WCAG AAA requires 7:1 contrast ratio. Consider future enhancement if user feedback or compliance requirements demand AAA level. |
| 4 | Mobile accessibility testing patterns | Medium | Medium | Explicitly marked as Non-goal (line 61). Touch interactions, mobile screen readers (TalkBack, VoiceOver iOS), and mobile-specific ARIA patterns deferred to future. Add dedicated story when mobile wishlist feature is prioritized. |
| 5 | Internationalization accessibility testing | Low | Medium | Explicitly marked as Non-goal (line 60). RTL language support, locale-specific screen reader behavior, and translation accessibility deferred to future. Add when i18n is prioritized. |
| 6 | Visual regression testing for accessibility | Medium | High | Integrate visual regression testing (Percy, Chromatic) to catch unintended color contrast changes or focus indicator regressions. Defer to Phase 5. |
| 7 | Performance optimization for axe-core | Low | Low | AC14 measures baseline but doesn't optimize. If axe-core adds >500ms per test, investigate selective scanning, parallelization, or caching strategies. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Accessibility testing dashboard | Medium | High | Aggregate WCAG violation reports across all tests. Visualize coverage by component, rule type, severity. Track improvements over time. Defer to Phase 5 (Observability). |
| 2 | Shared accessibility testing package for monorepo | High | Medium | WISH-2012 creates utilities in `apps/web/app-wishlist-gallery/src/test/a11y/`. If other apps (gallery, instructions, sets) need same utilities, refactor to `packages/core/accessibility-testing/` for monorepo-wide reuse. AC16 requires evaluation of @repo/accessibility enhancements, which partially addresses this. Monitor usage before extraction. |
| 3 | Custom axe-core rules for design system | Medium | Medium | Design system has specific accessibility requirements (LEGO theme contrast ratios, custom focus indicators). Create custom axe rules to validate design system compliance. Defer to Phase 4. |
| 4 | Accessibility linting (eslint-plugin-jsx-a11y) | Medium | Low | Complement runtime axe-core checks with static analysis. Catches common mistakes at authoring time (missing alt text, incorrect ARIA usage). Low effort addition. |
| 5 | Keyboard shortcuts documentation generator | Low | Medium | Auto-generate keyboard shortcut documentation from test utilities. Ensures documentation stays in sync with implementation. Defer to Phase 4 (UX Polish). |
| 6 | Focus order visualization tool | Medium | Medium | Developer tool to visualize tab order and focus flow in components. Helps identify roving tabindex issues and focus trap bugs during development. |
| 7 | Integration with paid accessibility tools | Medium | Medium | Explicitly marked as Non-goal (line 59). Open-source axe-core is MVP. If team needs advanced features (Deque axe Pro, Accessibility Insights, guided testing, compliance reports), consider future integration story. |
| 8 | A11y test fixtures generator | Low | Medium | Tool to generate accessibility test fixtures from component props. Reduces boilerplate for creating accessible mock data. |

## Categories

### Edge Cases
- **Nested focus contexts:** Modal within dropdown within page (covered in story's edge case testing)
- **Dynamic content announcements:** Live region updates with varying politeness levels
- **Duplicate ARIA IDs:** Multiple elements with same aria-labelledby ID (error case in story)
- **Advanced ARIA patterns:** Combobox, treegrid, menubar (Gap #2)

### UX Polish
- **Keyboard shortcut documentation generator** (Finding #5): Auto-sync docs with implementation
- **Focus order visualization tool** (Finding #6): Developer experience improvement
- **Accessibility testing dashboard** (Finding #1): Track progress and regressions

### Performance
- **axe-core optimization** (Gap #7): Selective scanning if >500ms impact
- **Test parallelization:** Run accessibility tests in parallel to reduce CI time

### Observability
- **Accessibility violation tracking:** CloudWatch metrics for WCAG violations by rule type
- **Accessibility regression alerts:** Notify when new violations introduced
- **Coverage reporting:** Track which components have accessibility tests

### Integrations
- **Visual regression testing** (Gap #6): Percy/Chromatic integration for contrast/focus
- **eslint-plugin-jsx-a11y** (Finding #4): Static analysis complement
- **Paid accessibility tools** (Finding #7): Deque axe Pro, Accessibility Insights
- **Pa11y CI integration:** Alternative to axe-core for cross-validation

### Testing Infrastructure
- **Real screen reader E2E testing** (Gap #1): NVDA/JAWS/VoiceOver automation (defer to WISH-2121)
- **Mobile touch accessibility** (Gap #4): Touch target sizing, gesture testing
- **Custom axe rules** (Finding #3): Design system-specific validation
- **Shared utilities package** (Finding #2): Extract to @repo/accessibility-testing if reused

### Documentation
- **Migration guide:** Document migration path for existing components to add a11y tests
- **Best practices guide:** Common accessibility patterns and anti-patterns
- **Screen reader testing checklist:** Manual testing steps for real devices (partially covered by AC13)
- **Accessibility review template:** PR checklist for reviewers

### Future-Proofing
- **WCAG AAA compliance** (Gap #3): Enhanced contrast and requirements
- **ARIA 1.3 support:** Future ARIA spec updates
- **Web Accessibility Directive (EU):** Compliance requirements for European markets
- **Section 508 compliance:** US federal accessibility standards

## Deferred Items from Story

### Mobile Accessibility (Non-goal, line 61)
- Touch target sizing validation (minimum 44x44px)
- Gesture alternatives for drag-and-drop
- Mobile screen reader testing (TalkBack, VoiceOver iOS)
- Zoom and reflow testing (up to 200% zoom)

### Advanced Screen Reader Testing (Non-goal, line 62)
- Automated NVDA/JAWS/VoiceOver testing in CI
- Screen reader announcement verification (beyond mock utilities)
- Complex widget testing (trees, grids, accordions)

### Third-Party Tools (Non-goal, line 59)
- Accessibility Insights integration
- Deque axe Pro (paid features)
- Stark plugin integration
- Lighthouse CI accessibility scoring

### Internationalization (Non-goal, line 60)
- RTL (right-to-left) language support
- Locale-specific screen reader behavior
- Translated ARIA labels and descriptions
- Cultural accessibility considerations

## Rationale for Deferral

All items above are deferred because:

1. **Not MVP-blocking:** WISH-2012's core goal is to enable WISH-2006 implementation. Automated WCAG AA checks, keyboard testing, and screen reader mock utilities are sufficient for MVP.
2. **Incremental value:** Enhancements above add polish and depth but don't block the core accessibility journey.
3. **Reuse-first principle:** Shared package (#2) should wait until multiple apps demonstrate need (YAGNI principle). AC16 requires evaluation first.
4. **Complexity management:** Advanced features (#1, #3, #6) require significant engineering effort and should be prioritized after core accessibility work (WISH-2006) proves value.

## Recommendations

### Immediate (Phase 2)
1. **AC16 implementation:** Evaluate @repo/accessibility package enhancements during implementation
2. **AC17 clarification:** Confirm Playwright E2E dependency on WISH-2121 (manual screen reader testing only until then)

### Short-term (Phase 3-4)
1. **eslint-plugin-jsx-a11y:** Low-effort static analysis addition (Finding #4)
2. **Custom axe rules:** Design system-specific validation as design system matures (Finding #3)
3. **Shared utilities extraction:** Monitor usage across apps before extracting to @repo/accessibility-testing (Finding #2)

### Long-term (Phase 5-6)
1. **Accessibility testing dashboard:** Track violations and coverage over time (Finding #1)
2. **Visual regression testing:** Catch unintended contrast/focus changes (Gap #6)
3. **Mobile touch accessibility:** When mobile app prioritized (Gap #4)
4. **Real screen reader E2E testing:** High effort, defer until critical mass of components (Gap #1, WISH-2121 dependency)

### Deferred Indefinitely
1. **WCAG AAA compliance:** Wait for business requirement (premium features, government contracts) (Gap #3)
2. **Paid tool integrations:** Deque axe Pro, Accessibility Insights not justified for MVP (Finding #7)
3. **Internationalization a11y:** Wait for i18n story prioritization (Gap #5)

## Recommended Follow-up Stories

1. **WISH-2121** (Already in backlog): Playwright E2E MSW setup for browser-mode accessibility testing (resolves Gap #1)
2. **New Story - Shared Accessibility Testing Package:** Refactor app-specific utilities to `packages/core/accessibility-testing/` after WISH-2006 validates patterns (Finding #2)
3. **New Story - Advanced ARIA Pattern Testing:** Add utilities for combobox, treegrid, menubar patterns if required by future features (Gap #2)
4. **New Story - Accessibility Metrics Dashboard:** Build CloudWatch/Grafana dashboard for WCAG violation trends and compliance tracking (Finding #1)
5. **New Story - eslint-plugin-jsx-a11y Integration:** Add static accessibility linting to complement runtime axe-core checks (Finding #4)
