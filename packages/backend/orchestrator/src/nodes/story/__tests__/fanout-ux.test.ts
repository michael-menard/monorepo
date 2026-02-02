import { describe, expect, it, vi } from 'vitest'
import type { BaselineReality } from '../../reality/index.js'
import type { StoryStructure } from '../seed.js'
import {
  generateGapId,
  calculateGapSummary,
  determineUXReadiness,
  analyzeAccessibilityGaps,
  analyzeUsabilityGaps,
  analyzeDesignPatternGaps,
  analyzeUserFlowGaps,
  generateUXGapAnalysis,
  COMMON_WCAG_CRITERIA,
  USABILITY_HEURISTICS,
  WCAGLevelSchema,
  WCAGCriterionSchema,
  GapSeveritySchema,
  BaseGapSchema,
  AccessibilityGapSchema,
  UsabilityGapSchema,
  DesignPatternGapSchema,
  UserFlowGapSchema,
  UXGapAnalysisSchema,
  FanoutUXConfigSchema,
  FanoutUXResultSchema,
  type UXGap,
  type FanoutUXConfig,
} from '../fanout-ux.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

describe('generateGapId', () => {
  it('generates accessibility gap IDs with 3-digit padding', () => {
    expect(generateGapId('A11Y', 1)).toBe('A11Y-GAP-001')
    expect(generateGapId('A11Y', 23)).toBe('A11Y-GAP-023')
    expect(generateGapId('A11Y', 999)).toBe('A11Y-GAP-999')
  })

  it('generates different types of gap IDs', () => {
    expect(generateGapId('USAB', 1)).toBe('USAB-GAP-001')
    expect(generateGapId('DPAT', 5)).toBe('DPAT-GAP-005')
    expect(generateGapId('FLOW', 10)).toBe('FLOW-GAP-010')
  })

  it('handles numbers over 3 digits', () => {
    expect(generateGapId('A11Y', 1234)).toBe('A11Y-GAP-1234')
  })
})

describe('calculateGapSummary', () => {
  it('returns zero counts for empty array', () => {
    const summary = calculateGapSummary([])

    expect(summary).toEqual({
      critical: 0,
      major: 0,
      minor: 0,
      suggestion: 0,
      total: 0,
    })
  })

  it('counts gaps by severity', () => {
    const gaps: UXGap[] = [
      {
        id: 'A11Y-GAP-001',
        type: 'accessibility',
        description: 'Critical gap',
        severity: 'critical',
        recommendation: 'Fix it',
        wcagCriterion: COMMON_WCAG_CRITERIA.KEYBOARD,
        userImpact: 'High',
        fromBaseline: false,
        affectedACs: [],
      },
      {
        id: 'A11Y-GAP-002',
        type: 'accessibility',
        description: 'Major gap',
        severity: 'major',
        recommendation: 'Fix it',
        wcagCriterion: COMMON_WCAG_CRITERIA.KEYBOARD,
        userImpact: 'Medium',
        fromBaseline: false,
        affectedACs: [],
      },
      {
        id: 'USAB-GAP-001',
        type: 'usability',
        description: 'Minor gap',
        severity: 'minor',
        recommendation: 'Consider it',
        heuristic: 'Visibility of system status',
        affectedTask: 'Navigation',
        fromBaseline: false,
        affectedACs: [],
      },
      {
        id: 'USAB-GAP-002',
        type: 'usability',
        description: 'Suggestion',
        severity: 'suggestion',
        recommendation: 'Nice to have',
        heuristic: 'Help and documentation',
        affectedTask: 'Learning',
        fromBaseline: false,
        affectedACs: [],
      },
    ]

    const summary = calculateGapSummary(gaps)

    expect(summary).toEqual({
      critical: 1,
      major: 1,
      minor: 1,
      suggestion: 1,
      total: 4,
    })
  })
})

describe('determineUXReadiness', () => {
  it('returns blocked for critical gaps', () => {
    const summary = { critical: 1, major: 0, minor: 0, suggestion: 0, total: 1 }
    expect(determineUXReadiness(summary, 'critical')).toBe('blocked')
  })

  it('returns blocked when major gaps exceed blocking threshold', () => {
    const summary = { critical: 0, major: 2, minor: 0, suggestion: 0, total: 2 }
    expect(determineUXReadiness(summary, 'major')).toBe('blocked')
  })

  it('returns needs_review for major gaps with critical blocking', () => {
    const summary = { critical: 0, major: 2, minor: 0, suggestion: 0, total: 2 }
    expect(determineUXReadiness(summary, 'critical')).toBe('needs_review')
  })

  it('returns needs_review for minor gaps', () => {
    const summary = { critical: 0, major: 0, minor: 3, suggestion: 0, total: 3 }
    expect(determineUXReadiness(summary, 'critical')).toBe('needs_review')
  })

  it('returns ready when no gaps', () => {
    const summary = { critical: 0, major: 0, minor: 0, suggestion: 0, total: 0 }
    expect(determineUXReadiness(summary, 'critical')).toBe('ready')
  })
})

describe('analyzeAccessibilityGaps', () => {
  const defaultConfig: FanoutUXConfig = {
    wcagLevel: 'AA',
    checkDesignPatterns: true,
    checkUserFlows: true,
    blockingSeverity: 'critical',
    maxGapsPerCategory: 10,
  }

  it('returns empty array for simple story with no UI', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Update database schema',
      description: 'Add new column to users table',
      domain: 'backend',
      acceptanceCriteria: [{ id: 'AC-1', description: 'Column added', fromBaseline: false }],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeAccessibilityGaps(story, null, defaultConfig)
    expect(gaps).toEqual([])
  })

  it('identifies keyboard accessibility gaps for interactive elements', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add dropdown menu',
      description: 'Create a dropdown component for navigation',
      domain: 'frontend',
      acceptanceCriteria: [{ id: 'AC-1', description: 'Dropdown works', fromBaseline: false }],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeAccessibilityGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].wcagCriterion.id).toBe('2.1.1') // Keyboard
    expect(gaps[0].severity).toBe('major')
  })

  it('identifies alt text gaps for visual content', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add image gallery',
      description: 'Display product images in a grid',
      domain: 'frontend',
      acceptanceCriteria: [{ id: 'AC-1', description: 'Images display', fromBaseline: false }],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeAccessibilityGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].wcagCriterion.id).toBe('1.1.1') // Non-text Content
    expect(gaps[0].severity).toBe('critical')
  })

  it('identifies form error handling gaps', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add contact form',
      description: 'Create form with name and email input fields',
      domain: 'frontend',
      acceptanceCriteria: [{ id: 'AC-1', description: 'Form works', fromBaseline: false }],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeAccessibilityGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    const errorGap = gaps.find(g => g.wcagCriterion.id === '3.3.1')
    expect(errorGap).toBeDefined()
  })

  it('includes baseline accessibility constraints', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Update button',
      description: 'Change button styling',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      noRework: ['Existing accessibility features must be preserved'],
    }

    const gaps = analyzeAccessibilityGaps(story, baseline, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.some(g => g.fromBaseline)).toBe(true)
  })

  it('does not flag keyboard when already mentioned', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add dropdown with keyboard navigation',
      description: 'Create a dropdown component with focus management',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeAccessibilityGaps(story, null, defaultConfig)

    // Should not have keyboard gap since it's mentioned
    const keyboardGap = gaps.find(g => g.wcagCriterion.id === '2.1.1')
    expect(keyboardGap).toBeUndefined()
  })
})

describe('analyzeUsabilityGaps', () => {
  const defaultConfig: FanoutUXConfig = {
    wcagLevel: 'AA',
    checkDesignPatterns: true,
    checkUserFlows: true,
    blockingSeverity: 'critical',
    maxGapsPerCategory: 10,
  }

  it('identifies missing feedback for state changes', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Save user preferences',
      description: 'Allow users to save their settings',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeUsabilityGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].heuristic).toBe('Visibility of system status')
  })

  it('identifies missing confirmation for destructive actions', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Delete user account',
      description: 'Allow users to delete their accounts',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeUsabilityGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].heuristic).toBe('Error prevention')
    expect(gaps[0].severity).toBe('critical')
  })

  it('identifies missing help for complex features', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Complex workflow',
      description: 'Multi-step process',
      domain: 'frontend',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Step 1', fromBaseline: false },
        { id: 'AC-2', description: 'Step 2', fromBaseline: false },
        { id: 'AC-3', description: 'Step 3', fromBaseline: false },
        { id: 'AC-4', description: 'Step 4', fromBaseline: false },
        { id: 'AC-5', description: 'Step 5', fromBaseline: false },
        { id: 'AC-6', description: 'Step 6', fromBaseline: false },
      ],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      estimatedComplexity: 'large',
      tags: [],
    }

    const gaps = analyzeUsabilityGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.some(g => g.heuristic === 'Help and documentation')).toBe(true)
  })

  it('does not flag when confirmation is mentioned', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Delete with confirmation',
      description: 'Delete items with confirm dialog',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeUsabilityGaps(story, null, defaultConfig)

    const deleteGap = gaps.find(g => g.heuristic === 'Error prevention')
    expect(deleteGap).toBeUndefined()
  })
})

describe('analyzeDesignPatternGaps', () => {
  const defaultConfig: FanoutUXConfig = {
    wcagLevel: 'AA',
    checkDesignPatterns: true,
    checkUserFlows: true,
    blockingSeverity: 'critical',
    maxGapsPerCategory: 10,
  }

  it('returns empty array when checkDesignPatterns is false', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add data table',
      description: 'Display data in a table format',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeDesignPatternGaps(story, null, { ...defaultConfig, checkDesignPatterns: false })
    expect(gaps).toEqual([])
  })

  it('identifies missing table patterns', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add data table',
      description: 'Display user data in a table',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeDesignPatternGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].expectedPattern).toBe('Data Table with Controls')
  })

  it('identifies missing modal close mechanism', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add confirmation modal',
      description: 'Show a modal dialog for confirmation',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeDesignPatternGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].expectedPattern).toBe('Modal Dialog Pattern')
    expect(gaps[0].severity).toBe('major')
  })

  it('includes baseline design system references', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Add new component',
      description: 'Create component',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      noRework: ['Use existing design system components'],
    }

    const gaps = analyzeDesignPatternGaps(story, baseline, defaultConfig)

    expect(gaps.some(g => g.fromBaseline)).toBe(true)
    expect(gaps.some(g => g.designSystemRef)).toBe(true)
  })
})

describe('analyzeUserFlowGaps', () => {
  const defaultConfig: FanoutUXConfig = {
    wcagLevel: 'AA',
    checkDesignPatterns: true,
    checkUserFlows: true,
    blockingSeverity: 'critical',
    maxGapsPerCategory: 10,
  }

  it('returns empty array when checkUserFlows is false', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Multi-step wizard',
      description: 'Guide users through steps',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeUserFlowGaps(story, null, { ...defaultConfig, checkUserFlows: false })
    expect(gaps).toEqual([])
  })

  it('identifies missing progress indicator in multi-step flow', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Checkout wizard',
      description: 'Guide users through checkout steps',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeUserFlowGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].affectedFlow).toBe('Multi-step workflow')
    expect(gaps[0].severity).toBe('major')
  })

  it('identifies missing navigation aids', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Navigate to settings page',
      description: 'Allow users to access settings screen',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeUserFlowGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].affectedFlow).toBe('Page navigation')
  })

  it('identifies missing auth redirect handling', () => {
    const story: StoryStructure = {
      storyId: 'flow-025',
      title: 'Implement login',
      description: 'Add authentication flow',
      domain: 'frontend',
      acceptanceCriteria: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
    }

    const gaps = analyzeUserFlowGaps(story, null, defaultConfig)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.some(g => g.affectedFlow === 'Authentication')).toBe(true)
  })
})

describe('generateUXGapAnalysis', () => {
  const validStory: StoryStructure = {
    storyId: 'flow-025',
    title: 'Add user profile modal with image upload',
    description: 'Create modal for users to update their profile with image upload',
    domain: 'frontend',
    acceptanceCriteria: [{ id: 'AC-1', description: 'Modal opens', fromBaseline: false }],
    constraints: [],
    affectedFiles: ['src/components/ProfileModal.tsx'],
    dependencies: [],
    tags: ['ui', 'modal'],
  }

  it('generates comprehensive analysis from valid story', async () => {
    const result = await generateUXGapAnalysis(validStory, null)

    expect(result.analyzed).toBe(true)
    expect(result.uxGapAnalysis).not.toBeNull()
    expect(result.uxGapAnalysis?.storyId).toBe('flow-025')
    expect(result.uxGapAnalysis?.analyzedAt).toBeDefined()
  })

  it('includes warnings when baseline is missing', async () => {
    const result = await generateUXGapAnalysis(validStory, null)

    expect(result.warnings).toContainEqual(
      'No baseline reality available - some context-dependent gaps may be missed',
    )
  })

  it('includes all gap categories in analysis', async () => {
    const result = await generateUXGapAnalysis(validStory, null)

    expect(result.uxGapAnalysis?.accessibilityGaps).toBeDefined()
    expect(result.uxGapAnalysis?.usabilityGaps).toBeDefined()
    expect(result.uxGapAnalysis?.designPatternGaps).toBeDefined()
    expect(result.uxGapAnalysis?.userFlowGaps).toBeDefined()
  })

  it('calculates summary correctly', async () => {
    const result = await generateUXGapAnalysis(validStory, null)

    const summary = result.uxGapAnalysis?.summary
    expect(summary).toBeDefined()
    expect(summary?.total).toBeGreaterThanOrEqual(0)
    expect(summary?.critical).toBeGreaterThanOrEqual(0)
    expect(summary?.major).toBeGreaterThanOrEqual(0)
    expect(summary?.minor).toBeGreaterThanOrEqual(0)
    expect(summary?.suggestion).toBeGreaterThanOrEqual(0)
  })

  it('determines ux readiness', async () => {
    const result = await generateUXGapAnalysis(validStory, null)

    expect(['ready', 'needs_review', 'blocked']).toContain(result.uxGapAnalysis?.uxReadiness)
  })

  it('handles null story structure', async () => {
    const result = await generateUXGapAnalysis(null, null)

    expect(result.analyzed).toBe(false)
    expect(result.uxGapAnalysis).toBeNull()
    expect(result.error).toBe('No story structure provided for UX analysis')
  })

  it('respects config options', async () => {
    const result = await generateUXGapAnalysis(validStory, null, {
      checkDesignPatterns: false,
      checkUserFlows: false,
      maxGapsPerCategory: 2,
    })

    expect(result.uxGapAnalysis?.designPatternGaps).toEqual([])
    expect(result.uxGapAnalysis?.userFlowGaps).toEqual([])
  })
})

describe('Schema validation', () => {
  describe('WCAGLevelSchema', () => {
    it('accepts valid levels', () => {
      expect(() => WCAGLevelSchema.parse('A')).not.toThrow()
      expect(() => WCAGLevelSchema.parse('AA')).not.toThrow()
      expect(() => WCAGLevelSchema.parse('AAA')).not.toThrow()
    })

    it('rejects invalid levels', () => {
      expect(() => WCAGLevelSchema.parse('B')).toThrow()
      expect(() => WCAGLevelSchema.parse('AAAA')).toThrow()
    })
  })

  describe('WCAGCriterionSchema', () => {
    it('validates criterion format', () => {
      const valid = { id: '1.1.1', name: 'Non-text Content', level: 'A' }
      expect(() => WCAGCriterionSchema.parse(valid)).not.toThrow()
    })

    it('rejects invalid criterion ID format', () => {
      const invalid = { id: '1.1', name: 'Test', level: 'A' }
      expect(() => WCAGCriterionSchema.parse(invalid)).toThrow()
    })
  })

  describe('GapSeveritySchema', () => {
    it('accepts valid severities', () => {
      expect(() => GapSeveritySchema.parse('critical')).not.toThrow()
      expect(() => GapSeveritySchema.parse('major')).not.toThrow()
      expect(() => GapSeveritySchema.parse('minor')).not.toThrow()
      expect(() => GapSeveritySchema.parse('suggestion')).not.toThrow()
    })

    it('rejects invalid severities', () => {
      expect(() => GapSeveritySchema.parse('high')).toThrow()
      expect(() => GapSeveritySchema.parse('low')).toThrow()
    })
  })

  describe('AccessibilityGapSchema', () => {
    it('validates complete accessibility gap', () => {
      const gap = {
        id: 'A11Y-GAP-001',
        type: 'accessibility',
        description: 'Missing alt text',
        severity: 'critical',
        recommendation: 'Add alt text',
        wcagCriterion: { id: '1.1.1', name: 'Non-text Content', level: 'A' },
        userImpact: 'Screen reader users cannot access content',
        fromBaseline: false,
        affectedACs: [],
      }

      expect(() => AccessibilityGapSchema.parse(gap)).not.toThrow()
    })
  })

  describe('UsabilityGapSchema', () => {
    it('validates complete usability gap', () => {
      const gap = {
        id: 'USAB-GAP-001',
        type: 'usability',
        description: 'No feedback on save',
        severity: 'major',
        recommendation: 'Add success toast',
        heuristic: 'Visibility of system status',
        affectedTask: 'Saving data',
        fromBaseline: false,
        affectedACs: [],
      }

      expect(() => UsabilityGapSchema.parse(gap)).not.toThrow()
    })
  })

  describe('DesignPatternGapSchema', () => {
    it('validates complete design pattern gap', () => {
      const gap = {
        id: 'DPAT-GAP-001',
        type: 'design_pattern',
        description: 'Modal missing close button',
        severity: 'major',
        recommendation: 'Add close button',
        expectedPattern: 'Modal Dialog Pattern',
        affectedComponent: 'ConfirmModal',
        fromBaseline: false,
        affectedACs: [],
      }

      expect(() => DesignPatternGapSchema.parse(gap)).not.toThrow()
    })
  })

  describe('UserFlowGapSchema', () => {
    it('validates complete user flow gap', () => {
      const gap = {
        id: 'FLOW-GAP-001',
        type: 'user_flow',
        description: 'No progress indicator',
        severity: 'major',
        recommendation: 'Add step indicator',
        affectedFlow: 'Checkout process',
        flowIssue: 'Users cannot see their progress',
        userGoal: 'Complete checkout',
        fromBaseline: false,
        affectedACs: [],
      }

      expect(() => UserFlowGapSchema.parse(gap)).not.toThrow()
    })
  })

  describe('UXGapAnalysisSchema', () => {
    it('validates complete analysis', () => {
      const analysis = {
        storyId: 'flow-025',
        analyzedAt: new Date().toISOString(),
        accessibilityGaps: [],
        usabilityGaps: [],
        designPatternGaps: [],
        userFlowGaps: [],
        summary: { critical: 0, major: 0, minor: 0, suggestion: 0, total: 0 },
        uxReadiness: 'ready',
      }

      expect(() => UXGapAnalysisSchema.parse(analysis)).not.toThrow()
    })

    it('validates all readiness states', () => {
      const base = {
        storyId: 'flow-025',
        analyzedAt: new Date().toISOString(),
        accessibilityGaps: [],
        usabilityGaps: [],
        designPatternGaps: [],
        userFlowGaps: [],
        summary: { critical: 0, major: 0, minor: 0, suggestion: 0, total: 0 },
      }

      expect(() => UXGapAnalysisSchema.parse({ ...base, uxReadiness: 'ready' })).not.toThrow()
      expect(() => UXGapAnalysisSchema.parse({ ...base, uxReadiness: 'needs_review' })).not.toThrow()
      expect(() => UXGapAnalysisSchema.parse({ ...base, uxReadiness: 'blocked' })).not.toThrow()
    })
  })

  describe('FanoutUXConfigSchema', () => {
    it('applies all defaults', () => {
      const parsed = FanoutUXConfigSchema.parse({})

      expect(parsed.wcagLevel).toBe('AA')
      expect(parsed.checkDesignPatterns).toBe(true)
      expect(parsed.checkUserFlows).toBe(true)
      expect(parsed.blockingSeverity).toBe('critical')
      expect(parsed.maxGapsPerCategory).toBe(10)
    })

    it('validates custom config', () => {
      const config = {
        wcagLevel: 'AAA',
        checkDesignPatterns: false,
        checkUserFlows: false,
        blockingSeverity: 'major',
        maxGapsPerCategory: 5,
      }

      const parsed = FanoutUXConfigSchema.parse(config)
      expect(parsed).toEqual(config)
    })
  })

  describe('FanoutUXResultSchema', () => {
    it('validates successful result', () => {
      const result = {
        uxGapAnalysis: {
          storyId: 'flow-025',
          analyzedAt: new Date().toISOString(),
          accessibilityGaps: [],
          usabilityGaps: [],
          designPatternGaps: [],
          userFlowGaps: [],
          summary: { critical: 0, major: 0, minor: 0, suggestion: 0, total: 0 },
          uxReadiness: 'ready',
        },
        analyzed: true,
        warnings: [],
      }

      expect(() => FanoutUXResultSchema.parse(result)).not.toThrow()
    })

    it('validates failed result', () => {
      const result = {
        uxGapAnalysis: null,
        analyzed: false,
        error: 'Something went wrong',
        warnings: ['Warning 1'],
      }

      expect(() => FanoutUXResultSchema.parse(result)).not.toThrow()
    })
  })
})

describe('COMMON_WCAG_CRITERIA', () => {
  it('contains standard accessibility criteria', () => {
    expect(COMMON_WCAG_CRITERIA.KEYBOARD).toBeDefined()
    expect(COMMON_WCAG_CRITERIA.KEYBOARD.id).toBe('2.1.1')
    expect(COMMON_WCAG_CRITERIA.NON_TEXT_CONTENT).toBeDefined()
    expect(COMMON_WCAG_CRITERIA.NON_TEXT_CONTENT.id).toBe('1.1.1')
    expect(COMMON_WCAG_CRITERIA.CONTRAST_MINIMUM).toBeDefined()
    expect(COMMON_WCAG_CRITERIA.CONTRAST_MINIMUM.level).toBe('AA')
  })

  it('all criteria have valid format', () => {
    for (const [key, criterion] of Object.entries(COMMON_WCAG_CRITERIA)) {
      expect(() => WCAGCriterionSchema.parse(criterion)).not.toThrow()
    }
  })
})

describe('USABILITY_HEURISTICS', () => {
  it('contains Nielsen heuristics', () => {
    expect(USABILITY_HEURISTICS).toContain('Visibility of system status')
    expect(USABILITY_HEURISTICS).toContain('Error prevention')
    expect(USABILITY_HEURISTICS).toContain('Help and documentation')
    expect(USABILITY_HEURISTICS.length).toBe(10)
  })
})
