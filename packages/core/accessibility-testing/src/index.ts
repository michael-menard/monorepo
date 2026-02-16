/**
 * Accessibility Testing Utilities
 *
 * Comprehensive accessibility testing infrastructure for the wishlist gallery.
 * Provides axe-core integration, keyboard navigation testing, screen reader
 * compatibility testing, and semantic HTML validation.
 *
 * @module a11y
 * @see WISH-2012
 */

// Configuration
export {
  defaultA11yConfig,
  createA11yConfig,
  toAxeRunOptions,
  WCAG_AA_CONTRAST,
  WISHLIST_ARIA_ROLES,
  KEYBOARD_PATTERNS,
  type A11yConfig,
  type RuleException,
  type WcagLevel,
  type ColorContrastConfig,
  type PerformanceConfig,
} from './config'

// axe-core integration
export {
  axe,
  toHaveNoViolations,
  checkAccessibility,
  assertNoViolations,
  assertViolationsExist,
  checkColorContrast,
  filterBySeverity,
  formatViolations,
  createA11yChecker,
  type A11yCheckResult,
  type SimplifiedViolation,
  type ScanPerformance,
  type ViolationSeverity,
} from './axe'

// Keyboard navigation
export {
  createKeyboardUser,
  getFocusableElements,
  getActiveElement,
  pressTab,
  pressEnter,
  pressSpace,
  pressEscape,
  pressArrow,
  pressHome,
  pressEnd,
  tabThrough,
  testFocusTrap,
  testRovingTabindex,
  assertHasFocus,
  assertFocusWithin,
  waitForFocus,
  testModalFocus,
  pressShortcut,
  testKeyboardAccessibility,
  type KeyboardKey,
  type FocusTrapResult,
  type FocusAssertionOptions,
  type KeyboardNavigationResult,
} from './keyboard'

// Screen reader testing
export {
  AnnouncementCollector,
  getAccessibleName,
  getAccessibleDescription,
  validateAriaAttributes,
  validateLiveRegion,
  validateSemanticHTML,
  findDuplicateIds,
  assertAnnounces,
  assertLiveRegion,
  createMockScreenReader,
  type AriaLive,
  type AriaRole,
  type MockAnnouncement,
  type AriaValidationResult,
  type AriaIssue,
  type SemanticValidationResult,
  type SemanticIssue,
} from './screen-reader'

/**
 * Quick accessibility check for common use cases
 *
 * Combines axe-core check with keyboard accessibility validation.
 *
 * @param container - Container element to check
 * @returns Combined check result
 *
 * @example
 * it('should be fully accessible', async () => {
 *   const { container } = render(<MyComponent />)
 *   const result = await quickA11yCheck(container)
 *   expect(result.axePassed).toBe(true)
 *   expect(result.keyboardPassed).toBe(true)
 * })
 */
export async function quickA11yCheck(container: Element): Promise<{
  axePassed: boolean
  keyboardPassed: boolean
  axeViolations: number
  inaccessibleElements: number
}> {
  const { checkAccessibility } = await import('./axe')
  const { testKeyboardAccessibility } = await import('./keyboard')

  const axeResult = await checkAccessibility(container)
  const keyboardResult = await testKeyboardAccessibility(container)

  return {
    axePassed: axeResult.passed,
    keyboardPassed: keyboardResult.allAccessible,
    axeViolations: axeResult.totalViolations,
    inaccessibleElements: keyboardResult.inaccessibleElements.length,
  }
}
