/**
 * Content-inspection tests for classification agent
 *
 * Validates the structural integrity and behavioral contracts of the classification.agent.md
 * specification. Tests are content-inspection only — no implementation code is exercised.
 * Exempt from the 45% global coverage threshold per WINT-5020.
 *
 * @see WINT-5020
 * @see .claude/agents/classification.agent.md
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect, beforeAll } from 'vitest'

const AGENT_PATH = resolve(__dirname, '../classification.agent.md')

let agentContent: string

beforeAll(() => {
  agentContent = readFileSync(AGENT_PATH, 'utf-8')
})

// ============================================================================
// Frontmatter
// ============================================================================

describe('classification agent — frontmatter', () => {
  it('declares type: worker', () => {
    expect(agentContent).toContain('type: worker')
  })

  it('declares permission_level: docs-only', () => {
    expect(agentContent).toContain('permission_level: docs-only')
  })

  it('declares model: sonnet', () => {
    expect(agentContent).toContain('model: sonnet')
  })

  it('lists mlModelGetActive in kb_tools', () => {
    expect(agentContent).toContain('mlModelGetActive')
  })

  it('lists mlPredictionRecord in kb_tools', () => {
    expect(agentContent).toContain('mlPredictionRecord')
  })

  it('declares shared: true', () => {
    expect(agentContent).toContain('shared: true')
  })

  it('declares story_id: WINT-5020', () => {
    expect(agentContent).toContain('story_id: WINT-5020')
  })
})

// ============================================================================
// Mission
// ============================================================================

describe('classification agent — mission', () => {
  it('covers querying the active ML model', () => {
    expect(agentContent.toLowerCase()).toMatch(/quer|query/)
    expect(agentContent).toContain('mlModelGetActive')
  })

  it('covers classifying the workflow entity', () => {
    expect(agentContent.toLowerCase()).toContain('classif')
  })

  it('covers recording the prediction via mlPredictionRecord', () => {
    expect(agentContent).toContain('mlPredictionRecord')
    expect(agentContent.toLowerCase()).toContain('record')
  })
})

// ============================================================================
// Inputs
// ============================================================================

describe('classification agent — inputs', () => {
  it('requires storyId as a required input', () => {
    expect(agentContent).toContain('storyId')
    expect(agentContent).toContain('Required')
  })

  it('requires classificationTarget as a required input', () => {
    expect(agentContent).toContain('classificationTarget')
  })

  it('documents classificationTarget enum values: quality, risk, effort', () => {
    expect(agentContent).toContain('quality')
    expect(agentContent).toContain('risk')
    expect(agentContent).toContain('effort')
  })

  it('documents features as an optional override input', () => {
    expect(agentContent).toContain('features')
    expect(agentContent).toContain('Optional')
  })
})

// ============================================================================
// classificationTarget → modelType mapping
// ============================================================================

describe('classification agent — modelType mapping', () => {
  it('maps quality to quality_predictor', () => {
    expect(agentContent).toContain('quality_predictor')
    expect(agentContent).toMatch(/quality[\s\S]*quality_predictor|quality_predictor[\s\S]*quality/)
  })

  it('maps risk to risk_classifier', () => {
    expect(agentContent).toContain('risk_classifier')
    expect(agentContent).toMatch(/risk[\s\S]*risk_classifier|risk_classifier[\s\S]*risk/)
  })

  it('maps effort to effort_estimator', () => {
    expect(agentContent).toContain('effort_estimator')
    expect(agentContent).toMatch(/effort[\s\S]*effort_estimator|effort_estimator[\s\S]*effort/)
  })
})

// ============================================================================
// Heuristic fallback (AC-4)
// ============================================================================

describe('classification agent — heuristic fallback', () => {
  it('defines fallback behavior when mlModelGetActive returns an empty array', () => {
    expect(agentContent).toMatch(/empty array|models is empty|empty|no active model/i)
  })

  it('logs a warning when no active model is found', () => {
    expect(agentContent).toMatch(/log.*warn|warn.*log|\[classification\].*No active model/i)
  })

  it('emits a CLASSIFICATION WARNING signal on the heuristic path', () => {
    expect(agentContent).toContain('CLASSIFICATION WARNING')
  })

  it('explicitly prohibits passing undefined as modelId', () => {
    expect(agentContent).toMatch(/NEVER pass.*undefined.*modelId|undefined.*as.*modelId/i)
  })

  it("uses 'heuristic' as the modelId fallback value", () => {
    expect(agentContent).toContain("'heuristic'")
  })
})

// ============================================================================
// Output (AC-5)
// ============================================================================

describe('classification agent — output', () => {
  it('references mlModelGetActive KB tool call in output section', () => {
    const outputSection = agentContent.indexOf('## Output')
    expect(outputSection).toBeGreaterThan(-1)
    const afterOutput = agentContent.slice(outputSection)
    expect(afterOutput).toContain('mlModelGetActive')
  })

  it('references mlPredictionRecord KB tool call in output section', () => {
    const outputSection = agentContent.indexOf('## Output')
    const afterOutput = agentContent.slice(outputSection)
    expect(afterOutput).toContain('mlPredictionRecord')
  })

  it('includes a classification_result structure in output', () => {
    expect(agentContent).toContain('classification_result')
  })

  it('includes score and confidence fields in classification_result', () => {
    expect(agentContent).toContain('score')
    expect(agentContent).toContain('confidence')
  })
})

// ============================================================================
// Completion signals (AC-6)
// ============================================================================

describe('classification agent — completion signals', () => {
  it('defines a successful model-based completion signal', () => {
    expect(agentContent).toContain('CLASSIFICATION COMPLETE')
    expect(agentContent).toContain('method=model')
  })

  it('defines a successful heuristic completion signal with warning', () => {
    expect(agentContent).toContain('method=heuristic')
    expect(agentContent).toMatch(/WARNING.*no active model|no active model.*WARNING/i)
  })

  it('defines a failure completion signal', () => {
    expect(agentContent).toContain('CLASSIFICATION FAILED')
  })
})

// ============================================================================
// Non-negotiables / constraints
// ============================================================================

describe('classification agent — non-negotiables', () => {
  it('mandates resolving classificationTarget before any KB call', () => {
    expect(agentContent).toMatch(/MUST resolve.*classificationTarget|classificationTarget.*before.*KB/i)
  })

  it('mandates recording prediction via mlPredictionRecord', () => {
    expect(agentContent).toMatch(/MUST.*record.*prediction|MUST.*mlPredictionRecord/i)
  })

  it('prohibits console.* usage — directs to @repo/logger', () => {
    expect(agentContent).toMatch(/console\.\*/i)
    expect(agentContent).toContain('@repo/logger')
  })

  it('prohibits modifying code or configuration files', () => {
    expect(agentContent).toMatch(/Do NOT modify|do not modify/i)
  })
})
