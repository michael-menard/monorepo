# Future Opportunities - SETS-MVP-0340

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No decimal rounding on blur | Low | Low | User enters "99.999" → could auto-round to "99.99" instead of showing error (friendlier UX but changes input behavior) |
| 2 | No negative sign prevention at keystroke level | Low | Low | User can type "-" in price field → HTML5 `min="0"` + Zod validation catch it, but could prevent at input level with `onKeyDown` handler |
| 3 | Progressive validation mode explicit in code but not in ACs | Low | Low | Story Architecture Notes show `mode: 'onBlur'` but not in formal ACs - could make explicit requirement for consistency |
| 4 | No success state indicator | Low | Medium | When user corrects invalid input, could show brief green checkmark (positive reinforcement) - UIUX-NOTES mentions as "optional enhancement" |
| 5 | No layout shift prevention | Medium | Low | Error messages cause content jump - UIUX-NOTES recommends `min-h-[calc(theme(spacing.4)+theme(fontSize.sm))]` container but not in ACs |
| 6 | No error icon for visual reinforcement | Low | Low | UIUX-NOTES suggests AlertCircle icon next to error text for users with cognitive disabilities - improves scannability |
| 7 | Scientific notation handling | Low | Low | AC18 boundary tests mention 1e6 rejection - HTML5 input type="number" with step="0.01" prevents it, Zod range validation is fallback |
| 8 | Browser autofill compatibility not tested | Low | Low | Risk section mentions "handle gracefully" but no explicit test case or AC - React Hook Form handles gracefully by default |
| 9 | No maximum decimal precision validation in shared schema | Low | Medium | `createEnhancedSchemas.price()` validates range (0-999999.99) but not decimal places explicitly - can be handled in component schema with refinement |
| 10 | No async validation support | Low | High | If backend price validation needed in future (e.g., price vs retail price comparison), would need async Zod refinement - not in current scope |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Currency symbol localization | Medium | High | Hardcoded "$" prefix - future internationalization would need dynamic currency symbol based on user locale |
| 2 | Touch/gesture accessibility | Medium | Medium | Story explicitly excludes touch accessibility - future story for swipe gestures, pinch-to-zoom on mobile form |
| 3 | Custom number formatting | Medium | Medium | Non-goal: thousands separators (e.g., "1,000.00") - could enhance UX for large prices but adds complexity |
| 4 | Advanced validation rules | Medium | High | Non-goal: price comparison with retail, tax percentage validation - future story for business logic validation |
| 5 | Form field masking | Low | Medium | Non-goal: auto-inserting decimal points (e.g., "9999" → "99.99") - improves data entry speed but can confuse users |
| 6 | Undo/redo for form changes | Low | High | Power user feature: Ctrl+Z to undo field changes before submit - requires form history tracking |
| 7 | Inline help tooltips | Medium | Low | Add (?) icon next to labels with explanatory tooltips (e.g., "What counts as tax?") - improves discoverability |
| 8 | Real-time price calculation | Medium | Medium | Show "Total: $X.XX" (price + tax + shipping) as user types - useful feedback but requires controlled inputs (performance impact) |
| 9 | Keyboard shortcuts for field navigation | Low | Medium | Alt+P → Price field, Alt+T → Tax field, etc. - power user feature but adds complexity |
| 10 | Voice input accessibility | Medium | High | Support for voice-controlled form filling (Web Speech API) - future accessibility enhancement beyond WCAG AA |
| 11 | Smart defaults based on item history | Medium | High | Pre-fill tax/shipping based on user's previous purchases - requires backend analytics |
| 12 | Form analytics | Medium | Medium | Track which fields users struggle with (high error rates) - inform future UX improvements |
| 13 | A/B test progressive validation timing | Low | Medium | Test `mode: 'onBlur'` vs `mode: 'onChange'` vs `mode: 'onSubmit'` - data-driven decision on validation timing |
| 14 | Accessibility audit automation in CI/CD | High | Medium | Run axe-core tests in CI pipeline on every PR - prevent accessibility regressions proactively |
| 15 | Shared form validation component | High | High | Extract validated input components (PriceInput, DateInput) into @repo/app-component-library - DRY for future forms |

## Categories

### Edge Cases
- **Decimal rounding behavior** (Gap #1): Auto-round vs show error
- **Scientific notation handling** (Gap #7): Explicit test coverage
- **Browser autofill** (Gap #8): Compatibility testing
- **Negative number input** (Gap #2): Keystroke-level prevention

### UX Polish
- **Success state indicator** (Gap #4): Green checkmark on valid input
- **Layout shift prevention** (Gap #5): Min-height error containers
- **Error icons** (Gap #6): Visual reinforcement for cognitive disabilities
- **Inline help tooltips** (Enhancement #7): Explanatory text for fields
- **Real-time price calculation** (Enhancement #8): Total price preview

### Performance
- **Controlled vs uncontrolled inputs** (already optimized): React Hook Form uses uncontrolled for better performance
- **Validation timing optimization** (Gap #3): Progressive validation config
- **Form history tracking** (Enhancement #6): Undo/redo performance impact

### Observability
- **Form analytics** (Enhancement #12): Error rate tracking
- **A/B testing framework** (Enhancement #13): Validation timing experiments

### Integrations
- **Currency localization** (Enhancement #1): i18n integration
- **Voice input** (Enhancement #10): Web Speech API integration
- **Smart defaults** (Enhancement #11): Backend analytics integration

### Reusability
- **Shared validation schemas** (Gap #9): Enhance validation-messages.ts with decimal precision
- **Shared validated components** (Enhancement #15): Extract PriceInput, DateInput to component library
- **CI/CD accessibility gates** (Enhancement #14): Automated axe-core in pipeline

---

## Priority Recommendations

### Short-term (Next Sprint)
1. **Layout shift prevention** (Gap #5) - Easy win, improves UX significantly
2. **Decimal precision in shared schema** (Gap #9) - Benefits all apps using price validation
3. **Progressive validation config** (Gap #3) - Clarify in story ACs for consistency

### Medium-term (Next Quarter)
4. **CI/CD accessibility automation** (Enhancement #14) - Prevent regressions at scale
5. **Shared validated components** (Enhancement #15) - Reduce duplication across forms
6. **Form analytics** (Enhancement #12) - Data-driven UX improvements

### Long-term (6+ Months)
7. **Currency localization** (Enhancement #1) - Required for international expansion
8. **Advanced validation rules** (Enhancement #4) - Business logic validation layer
9. **Voice input accessibility** (Enhancement #10) - Cutting-edge accessibility

---

## Notes

- Many "future opportunities" are explicitly called out as **Non-goals** in the story (masking, custom formatting, server validation, touch accessibility) - intentional scope control
- Some enhancements (error icons, success indicators, layout shift prevention) are mentioned in UIUX-NOTES.md as "optional" or "nice to have" - candidate for follow-up polish story
- **Gap #9** (decimal precision in shared schema) is the most impactful non-MVP item - could be bundled into this story if time permits during implementation
- **Enhancement #14** (CI/CD accessibility gates) would prevent future regressions and is high ROI for long-term maintenance

---

## Related Stories

Potential follow-up stories to track:
- **SETS-MVP-0341**: Form Validation UX Polish (layout shift prevention, success indicators, error icons)
- **SETS-MVP-0342**: Shared Validated Form Components (extract PriceInput, DateInput to component library)
- **SETS-MVP-0343**: Advanced Purchase Validation (price vs retail, tax percentage, business rules)
- **SETS-FUTURE-001**: Internationalization - Currency Localization
- **SETS-FUTURE-002**: CI/CD Accessibility Gates (axe-core automation)
