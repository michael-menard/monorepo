/**
 * Accessibility Testing Configuration
 *
 * Centralizes WCAG compliance level settings, axe-core rule configurations,
 * and exception rules for the wishlist gallery application.
 *
 * @module a11y/config
 * @see https://www.w3.org/WAI/WCAG21/quickref/ - WCAG 2.1 Quick Reference
 * @see https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md - axe-core rules
 */

import { z } from 'zod'

/**
 * WCAG Compliance Levels
 * - wcag2a: WCAG 2.0/2.1 Level A (minimum)
 * - wcag2aa: WCAG 2.0/2.1 Level AA (recommended for legal compliance)
 * - wcag2aaa: WCAG 2.0/2.1 Level AAA (highest level)
 * - wcag21a: WCAG 2.1 Level A
 * - wcag21aa: WCAG 2.1 Level AA
 * - wcag21aaa: WCAG 2.1 Level AAA
 * - best-practice: Non-WCAG best practices
 */
export const WcagLevelSchema = z.enum([
  'wcag2a',
  'wcag2aa',
  'wcag2aaa',
  'wcag21a',
  'wcag21aa',
  'wcag21aaa',
  'best-practice',
])

export type WcagLevel = z.infer<typeof WcagLevelSchema>

/**
 * Rule exception configuration for axe-core
 */
export const RuleExceptionSchema = z.object({
  /** axe-core rule ID to disable */
  ruleId: z.string(),
  /** Justification for disabling (required for documentation) */
  justification: z.string(),
  /** Selector patterns to exclude from this rule (optional, applies rule exception to specific elements) */
  selectors: z.array(z.string()).optional(),
  /** Story ID that approved this exception */
  approvedBy: z.string().optional(),
})

export type RuleException = z.infer<typeof RuleExceptionSchema>

/**
 * Color contrast configuration
 */
export const ColorContrastConfigSchema = z.object({
  /** Enable color contrast checking */
  enabled: z.boolean().default(true),
  /** Minimum contrast ratio for normal text (WCAG AA: 4.5:1) */
  normalTextRatio: z.number().default(4.5),
  /** Minimum contrast ratio for large text (WCAG AA: 3:1) */
  largeTextRatio: z.number().default(3),
  /** Ignore placeholder text in contrast checks */
  ignorePlaceholders: z.boolean().default(false),
})

export type ColorContrastConfig = z.infer<typeof ColorContrastConfigSchema>

/**
 * Performance configuration for axe-core scanning
 */
export const PerformanceConfigSchema = z.object({
  /** Maximum time (ms) for axe-core to scan a component (default: 500ms per AC14) */
  maxScanTime: z.number().default(500),
  /** Enable performance timing logs */
  logTiming: z.boolean().default(false),
  /** Skip axe-core in CI for faster feedback (not recommended for main branch) */
  skipInCi: z.boolean().default(false),
})

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>

/**
 * Main accessibility configuration schema
 */
export const A11yConfigSchema = z.object({
  /** WCAG compliance level to enforce */
  wcagLevel: WcagLevelSchema.default('wcag21aa'),

  /** Run axe-core by default in all component tests */
  runByDefault: z.boolean().default(true),

  /** Rule exceptions (rules to disable with justification) */
  ruleExceptions: z.array(RuleExceptionSchema).default([]),

  /** Elements to ignore globally (e.g., third-party widgets) */
  ignoredSelectors: z.array(z.string()).default([]),

  /** Color contrast configuration */
  colorContrast: ColorContrastConfigSchema.default({}),

  /** Performance configuration */
  performance: PerformanceConfigSchema.default({}),

  /** Additional axe-core rules to enable beyond WCAG level */
  additionalRules: z.array(z.string()).default([]),

  /** Tags to include in axe-core analysis */
  includeTags: z.array(z.string()).optional(),

  /** Tags to exclude from axe-core analysis */
  excludeTags: z.array(z.string()).optional(),
})

export type A11yConfig = z.infer<typeof A11yConfigSchema>

/**
 * Default accessibility configuration
 *
 * Configured for WCAG 2.1 AA compliance as required by AC9.
 * Includes performance settings per AC14 baseline.
 */
export const defaultA11yConfig: A11yConfig = {
  wcagLevel: 'wcag21aa',
  runByDefault: true,
  ruleExceptions: [
    // Example: third-party date picker with known issues
    // {
    //   ruleId: 'color-contrast',
    //   justification: 'Third-party component, tracked in WISH-2006',
    //   selectors: ['.external-date-picker'],
    //   approvedBy: 'WISH-2012',
    // },
  ],
  ignoredSelectors: [
    // Third-party widgets that we cannot modify
    // '[data-third-party]',
  ],
  colorContrast: {
    enabled: true,
    normalTextRatio: 4.5, // WCAG AA requirement
    largeTextRatio: 3, // WCAG AA requirement for large text (18pt+ or 14pt+ bold)
    ignorePlaceholders: false,
  },
  performance: {
    maxScanTime: 500, // Per AC14: < 500ms per component test
    logTiming: false,
    skipInCi: false,
  },
  additionalRules: [],
  includeTags: undefined,
  excludeTags: undefined,
}

/**
 * Creates a custom accessibility configuration by merging with defaults
 *
 * @param overrides - Partial configuration to override defaults
 * @returns Complete accessibility configuration
 *
 * @example
 * const config = createA11yConfig({
 *   wcagLevel: 'wcag2aaa',
 *   ruleExceptions: [
 *     { ruleId: 'color-contrast', justification: 'Intentional design choice' }
 *   ]
 * })
 */
export function createA11yConfig(overrides: Partial<A11yConfig> = {}): A11yConfig {
  return A11yConfigSchema.parse({
    ...defaultA11yConfig,
    ...overrides,
    colorContrast: {
      ...defaultA11yConfig.colorContrast,
      ...overrides.colorContrast,
    },
    performance: {
      ...defaultA11yConfig.performance,
      ...overrides.performance,
    },
    ruleExceptions: [
      ...defaultA11yConfig.ruleExceptions,
      ...(overrides.ruleExceptions ?? []),
    ],
    ignoredSelectors: [
      ...defaultA11yConfig.ignoredSelectors,
      ...(overrides.ignoredSelectors ?? []),
    ],
    additionalRules: [
      ...defaultA11yConfig.additionalRules,
      ...(overrides.additionalRules ?? []),
    ],
  })
}

/**
 * Converts A11yConfig to axe-core RunOptions format
 *
 * @param config - Accessibility configuration
 * @returns axe-core compatible run options
 */
export function toAxeRunOptions(config: A11yConfig = defaultA11yConfig) {
  const disabledRules = config.ruleExceptions.map(e => e.ruleId)

  return {
    runOnly: {
      type: 'tag' as const,
      values: config.includeTags ?? [config.wcagLevel, 'best-practice'],
    },
    rules: Object.fromEntries(disabledRules.map(ruleId => [ruleId, { enabled: false }])),
  }
}

/**
 * WCAG 2.1 Level AA color contrast requirements
 * Used for validating custom color combinations
 */
export const WCAG_AA_CONTRAST = {
  /** Normal text (< 18pt or < 14pt bold) */
  normalText: 4.5,
  /** Large text (>= 18pt or >= 14pt bold) */
  largeText: 3,
  /** UI components and graphical objects */
  uiComponent: 3,
} as const

/**
 * Common ARIA roles for wishlist components
 * Used for consistent role assertions in tests
 */
export const WISHLIST_ARIA_ROLES = {
  /** Main wishlist container */
  list: 'list',
  /** Individual wishlist item */
  listitem: 'listitem',
  /** Card container */
  article: 'article',
  /** Priority selector */
  combobox: 'combobox',
  /** Tab navigation */
  tablist: 'tablist',
  /** Individual tab */
  tab: 'tab',
  /** Tab panel content */
  tabpanel: 'tabpanel',
  /** Modal dialog */
  dialog: 'dialog',
  /** Status announcements */
  status: 'status',
  /** Alert messages */
  alert: 'alert',
} as const

/**
 * Keyboard interaction patterns for wishlist components
 * Based on WAI-ARIA Authoring Practices
 */
export const KEYBOARD_PATTERNS = {
  /** Tab navigation pattern */
  tab: {
    keys: ['Tab', 'Shift+Tab'],
    description: 'Navigate between focusable elements',
  },
  /** Button activation */
  button: {
    keys: ['Enter', 'Space'],
    description: 'Activate button',
  },
  /** Combobox/dropdown navigation */
  combobox: {
    keys: ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'],
    description: 'Navigate and select options',
  },
  /** Tab panel navigation */
  tabs: {
    keys: ['ArrowLeft', 'ArrowRight', 'Home', 'End'],
    description: 'Navigate between tabs',
  },
  /** Modal dialog */
  dialog: {
    keys: ['Escape', 'Tab'],
    description: 'Close dialog, trap focus within',
  },
  /** Roving tabindex pattern (lists, toolbars) */
  rovingTabindex: {
    keys: ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'],
    description: 'Navigate items with arrows, single tab stop',
  },
} as const
