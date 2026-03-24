/**
 * Tests for telemetry phase mapping
 *
 * AC-8: mapArtifactPhaseToMcpPhase explicit mapping table — must be tested
 *
 * Story: WINT-9100
 */

import { describe, it, expect } from 'vitest'
import { mapArtifactPhaseToMcpPhase, McpInvocationPhaseSchema } from '../telemetry/index.js'

describe('mapArtifactPhaseToMcpPhase', () => {
  it('maps "setup" → "setup" (identity)', () => {
    expect(mapArtifactPhaseToMcpPhase('setup')).toBe('setup')
  })

  it('maps "analysis" → "plan"', () => {
    expect(mapArtifactPhaseToMcpPhase('analysis')).toBe('plan')
  })

  it('maps "planning" → "plan"', () => {
    expect(mapArtifactPhaseToMcpPhase('planning')).toBe('plan')
  })

  it('maps "implementation" → "execute"', () => {
    expect(mapArtifactPhaseToMcpPhase('implementation')).toBe('execute')
  })

  it('maps "code_review" → "review"', () => {
    expect(mapArtifactPhaseToMcpPhase('code_review')).toBe('review')
  })

  it('maps "qa_verification" → "qa"', () => {
    expect(mapArtifactPhaseToMcpPhase('qa_verification')).toBe('qa')
  })

  it('maps "completion" → "qa"', () => {
    expect(mapArtifactPhaseToMcpPhase('completion')).toBe('qa')
  })

  it('passes through valid MCP phase "plan" unchanged', () => {
    expect(mapArtifactPhaseToMcpPhase('plan')).toBe('plan')
  })

  it('passes through valid MCP phase "execute" unchanged', () => {
    expect(mapArtifactPhaseToMcpPhase('execute')).toBe('execute')
  })

  it('passes through valid MCP phase "review" unchanged', () => {
    expect(mapArtifactPhaseToMcpPhase('review')).toBe('review')
  })

  it('passes through valid MCP phase "qa" unchanged', () => {
    expect(mapArtifactPhaseToMcpPhase('qa')).toBe('qa')
  })

  it('returns undefined for unknown phase string', () => {
    expect(mapArtifactPhaseToMcpPhase('unknown_phase')).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(mapArtifactPhaseToMcpPhase(null)).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(mapArtifactPhaseToMcpPhase(undefined)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(mapArtifactPhaseToMcpPhase('')).toBeUndefined()
  })
})

describe('McpInvocationPhaseSchema', () => {
  it('accepts all valid MCP phase values', () => {
    const validValues = ['setup', 'plan', 'execute', 'review', 'qa']
    for (const val of validValues) {
      expect(McpInvocationPhaseSchema.safeParse(val).success).toBe(true)
    }
  })

  it('rejects invalid values', () => {
    expect(McpInvocationPhaseSchema.safeParse('implementation').success).toBe(false)
    expect(McpInvocationPhaseSchema.safeParse('unknown').success).toBe(false)
  })
})
