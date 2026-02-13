# Future Opportunities - REPA-008

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No E2E tests for keyboard navigation | Low | Medium | Add Playwright tests that verify arrow key navigation, screen reader announcements, and keyboard shortcuts work end-to-end in both gallery apps |
| 2 | No performance benchmarks for ResizeObserver | Low | Low | Add performance tests to verify ResizeObserver column detection doesn't cause layout thrashing or excessive re-renders |
| 3 | Missing accessibility regression tests | Low | Medium | Add automated accessibility tests using axe-core or similar to verify WCAG 2.1 compliance is maintained |
| 4 | No documentation for keyboard shortcuts discoverability | Low | Low | Users may not know shortcuts exist. Consider adding a "?" shortcut to show available shortcuts (mentioned as future: REPA-011) |
| 5 | Test coverage goal of 45% is minimum | Low | Low | Hook-level code should target 80-90% coverage given its critical accessibility role. Story says "~95% coverage (existing standard)" which is good |
| 6 | No error boundaries for hook failures | Low | Medium | If ResizeObserver fails or keyboard handlers throw, apps could crash. Consider defensive error handling |
| 7 | Migration guide for future consumers | Low | Low | Document how other apps (sets, instructions) should adopt these hooks. Create usage examples in Storybook |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | useGallerySelection could support shift+click | Medium | Low | AC5 mentions "range selection (Shift+click pattern)" but implementation details are sparse. This could be valuable for multi-select workflows |
| 2 | Keyboard shortcuts help panel | Medium | Medium | Create a modal/overlay showing available shortcuts, their descriptions, and current bindings. Mentioned as REPA-011 future story |
| 3 | Focus trap utilities | Low | Medium | Mentioned in Non-Goals. Could be valuable for modal dialogs and dropdown menus to keep focus contained |
| 4 | Customizable keyboard mappings | Low | High | Power users may want to customize shortcuts. Could store preferences in localStorage |
| 5 | Touch device support for roving tabindex | Low | Medium | Roving tabindex is keyboard-focused. Consider how touch users navigate galleries (currently just scroll/tap) |
| 6 | Screen reader verbosity control | Low | Low | Some users may want more/less verbose announcements. Could add preference setting |
| 7 | Undo/redo for keyboard actions | Medium | High | If user deletes items via keyboard, undo (Ctrl+Z) could be valuable. Mentioned in REPA-007 for drag-and-drop |
| 8 | Analytics for keyboard usage | Low | Low | Track which shortcuts are actually used to inform future UX decisions |
| 9 | International keyboard support | Low | Medium | Current shortcuts use English letters (a, m, e, u, n). Consider how non-QWERTY keyboards work |
| 10 | Gamepad support | Low | High | For TV/console users, gamepad D-pad could map to arrow keys for gallery navigation |
| 11 | Better TypeScript documentation | Low | Low | Add JSDoc examples showing common patterns like multi-select, custom shortcuts, and integration with form libraries |
| 12 | Storybook stories for all hooks | Medium | Medium | Interactive documentation showing all hook options, use cases, and edge cases |

## Categories

### Edge Cases
- **Gap #2**: ResizeObserver performance edge cases (many items, rapid resizing)
- **Gap #6**: Error handling for hook failures
- **Opportunity #5**: Touch device navigation patterns
- **Opportunity #9**: International keyboard layouts

### UX Polish
- **Gap #4**: Keyboard shortcuts discoverability (help panel)
- **Opportunity #2**: Interactive help panel for shortcuts
- **Opportunity #4**: Customizable keyboard mappings
- **Opportunity #6**: Screen reader verbosity preferences
- **Opportunity #7**: Undo/redo for keyboard actions

### Performance
- **Gap #2**: ResizeObserver performance benchmarks
- **Opportunity #12**: Storybook performance testing scenarios

### Observability
- **Opportunity #8**: Analytics for keyboard shortcut usage patterns
- Consider adding debug mode that logs keyboard events and state changes

### Integrations
- **Opportunity #10**: Gamepad API integration for console/TV interfaces
- Consider integration with command palette libraries (cmdk, kbar)
- Integration with focus management libraries (react-focus-lock, focus-trap-react)

### Testing
- **Gap #1**: E2E Playwright tests for keyboard navigation flows
- **Gap #3**: Automated accessibility regression tests
- **Gap #5**: Higher test coverage targets for critical accessibility code
- Consider visual regression tests for focus indicators

### Documentation
- **Gap #7**: Migration guide for other apps to adopt these hooks
- **Opportunity #11**: Enhanced JSDoc with more examples
- **Opportunity #12**: Comprehensive Storybook documentation
- Consider creating video tutorials for accessibility features

### Future-Proofing
- React 19 Compiler compatibility - ensure hooks don't break with auto-memoization
- React Server Components - document client-only nature of these hooks
- Concurrent rendering - verify no tearing issues with keyboard state
- Suspense boundaries - document interaction with loading states

## Notes

### Why These Are Not MVP-Blocking

The core journey is: **Consolidate duplicate keyboard hooks into shared packages**

All opportunities above enhance the hooks but don't block consolidation:
- Apps work today without help panels, analytics, or gamepads
- Tests can be added after consolidation is proven
- Documentation improvements are iterative

### Priority Recommendations

**High Impact, Low Effort (Do Next):**
1. Opportunity #2 - Help panel for shortcuts (quick win, high value)
2. Opportunity #12 - Storybook documentation (helps adoption)
3. Gap #7 - Migration guide (helps remaining apps adopt hooks)

**High Impact, Medium Effort (Short-term backlog):**
4. Gap #1 - E2E tests (quality assurance)
5. Opportunity #1 - Shift+click selection (common user need)

**Low Priority (Long-term backlog):**
- Everything else - nice to have but not urgent

### Dependency Chains

Some opportunities depend on others:
- Help panel (Opp #2) needs shortcut customization infrastructure (Opp #4) to show user's actual bindings
- Analytics (Opp #8) should be added after usage patterns stabilize
- International support (Opp #9) requires help panel (Opp #2) to document locale-specific shortcuts

### Related Stories

- **REPA-007**: SortableGallery - uses these keyboard hooks
- **REPA-010**: Refactor inspiration gallery - depends on REPA-008 completion
- **REPA-011**: GalleryFilterBar - mentioned as "keyboard shortcuts help panel" future
- **WISH-2006**: Original wishlist accessibility implementation
- **INSP-019**: Original inspiration keyboard navigation

### Architecture Notes

The story's layered approach (primitives → opinionated wrappers) is excellent:
- **Primitives**: useKeyboardShortcuts, useRovingTabIndex, useAnnouncer
- **Wrappers**: useGalleryKeyboard, useGallerySelection

This enables:
- Other apps can use primitives for custom behavior
- Gallery apps get opinionated defaults
- Easy to add new wrappers (useFormKeyboard, useModalKeyboard, etc.)

Consider documenting this pattern in a "Creating Custom Keyboard Hooks" guide.
