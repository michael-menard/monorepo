/**
 * Content-inspection tests for weekly-analyst agent
 *
 * Validates the structural integrity and behavioral contracts of the weekly-analyst.agent.md
 * specification. Tests are content-inspection only — no implementation code is exercised.
 * Exempt from the 45% global coverage threshold per WINT-6060 AC-3.
 *
 * @see WINT-6060 AC-3
 * @see .claude/agents/weekly-analyst.agent.md
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect, beforeAll } from 'vitest'

const AGENT_PATH = resolve(__dirname, '../weekly-analyst.agent.md')

let agentContent: string

beforeAll(() => {
  agentContent = readFileSync(AGENT_PATH, 'utf-8')
})

// ============================================================================
// Frontmatter
// ============================================================================

describe('weekly-analyst agent — frontmatter', () => {
  it('declares the correct agent name', () => {
    expect(agentContent).toContain('name: weekly-analyst')
  })

  it('uses sonnet model', () => {
    expect(agentContent).toContain('model: sonnet')
  })

  it('declares all four analytics MCP tools', () => {
    expect(agentContent).toContain('kb_get_scoreboard')
    expect(agentContent).toContain('kb_get_bottleneck_analysis')
    expect(agentContent).toContain('kb_get_churn_analysis')
    expect(agentContent).toContain('kb_get_token_summary')
  })

  it('declares kb_write_artifact and kb_read_artifact for artifact persistence', () => {
    expect(agentContent).toContain('kb_write_artifact')
    expect(agentContent).toContain('kb_read_artifact')
  })
})

// ============================================================================
// Required inputs
// ============================================================================

describe('weekly-analyst agent — inputs', () => {
  it('requires week_of as a required input', () => {
    expect(agentContent).toContain('week_of')
  })

  it('documents feature as an optional filter', () => {
    expect(agentContent).toContain('feature')
  })

  it('documents force as an optional boolean for overwrite', () => {
    expect(agentContent).toContain('force')
  })
})

// ============================================================================
// Idempotency guard
// ============================================================================

describe('weekly-analyst agent — idempotency', () => {
  it('checks for an existing analysis artifact before writing', () => {
    expect(agentContent).toContain('kb_read_artifact')
    expect(agentContent).toContain('force')
  })

  it('uses the WEEKLY-ANALYSIS-{week_of} naming convention for artifact lookup', () => {
    expect(agentContent).toMatch(/WEEKLY-ANALYSIS-\{.+week_of.+\}|WEEKLY-ANALYSIS-\$\{week_of\}/)
  })

  it('stops with an informative message when analysis already exists and force is false', () => {
    expect(agentContent).toContain('already exists')
    expect(agentContent).toContain('force=true')
  })
})

// ============================================================================
// Scoreboard as primary health signal
// ============================================================================

describe('weekly-analyst agent — scoreboard requirement', () => {
  it('treats kb_get_scoreboard as a required (STOP on failure) tool', () => {
    // The error handling table must mark scoreboard failure as STOP
    const scoreboardFailureSection = agentContent.indexOf('kb_get_scoreboard` fails')
    expect(scoreboardFailureSection).toBeGreaterThan(-1)
    // The STOP keyword must appear after this entry in the error table
    const afterScoreboard = agentContent.slice(scoreboardFailureSection)
    expect(afterScoreboard).toContain('STOP')
  })

  it('uses the scoreboard for throughput, cycle time, first-pass rate, cost, and reliability', () => {
    expect(agentContent).toContain('throughput')
    expect(agentContent).toContain('cycle_time')
    expect(agentContent).toContain('first_pass')
    expect(agentContent).toContain('cost')
    expect(agentContent).toContain('agent_reliability')
  })
})

// ============================================================================
// Anomaly detection thresholds
// ============================================================================

describe('weekly-analyst agent — anomaly detection', () => {
  it('defines a throughput_drop anomaly type', () => {
    expect(agentContent).toContain('throughput_drop')
  })

  it('defines a cycle_time_spike anomaly type', () => {
    expect(agentContent).toContain('cycle_time_spike')
  })

  it('defines a low_first_pass anomaly type', () => {
    expect(agentContent).toContain('low_first_pass')
  })

  it('defines an agent_unreliable anomaly type', () => {
    expect(agentContent).toContain('agent_unreliable')
  })

  it('defines a cost_spike anomaly type', () => {
    expect(agentContent).toContain('cost_spike')
  })

  it('defines a churn_cluster anomaly type', () => {
    expect(agentContent).toContain('churn_cluster')
  })

  it('specifies a first-pass rate threshold of 70%', () => {
    expect(agentContent).toContain('70%')
  })

  it('specifies an agent reliability threshold of 80%', () => {
    expect(agentContent).toContain('80%')
  })

  it('skips WoW-dependent anomaly checks when no prior-week data exists', () => {
    expect(agentContent).toContain('no prior')
    // Ensure the agent explicitly mentions skipping WoW-dependent checks
    const noWoWSection = agentContent.indexOf('no prior')
    const context = agentContent.slice(noWoWSection - 100, noWoWSection + 200)
    expect(context.toLowerCase()).toMatch(/skip|when no prior/)
  })
})

// ============================================================================
// Recommendations contract
// ============================================================================

describe('weekly-analyst agent — recommendations', () => {
  it('limits recommendations to a maximum of 5', () => {
    expect(agentContent).toContain('5 recommendations')
  })

  it('requires evidence with every recommendation', () => {
    expect(agentContent).toContain('evidence')
    // The non-negotiables or rules section must enforce evidence
    expect(agentContent).toMatch(/evidence.*recommendation|recommendation.*evidence/i)
  })

  it('requires each anomaly to produce at least one recommendation', () => {
    expect(agentContent).toContain('Each anomaly')
  })
})

// ============================================================================
// Artifact output structure
// ============================================================================

describe('weekly-analyst agent — output artifact', () => {
  it('writes to artifact_type: analysis', () => {
    expect(agentContent).toContain("artifact_type: 'analysis'")
  })

  it('uses the WEEKLY-ANALYSIS-{YYYY-MM-DD} artifact_name convention', () => {
    expect(agentContent).toMatch(/WEEKLY-ANALYSIS-\{YYYY-MM-DD\}|WEEKLY-ANALYSIS.*artifact_name/)
  })

  it('uses story_id: SYSTEM for the system-level artifact', () => {
    expect(agentContent).toContain("story_id: 'SYSTEM'")
  })

  it('includes schema: weekly-analysis/v1 in the artifact', () => {
    expect(agentContent).toContain('weekly-analysis/v1')
  })

  it('includes a week_over_week_delta field that can be null', () => {
    expect(agentContent).toContain('week_over_week_delta')
    expect(agentContent).toContain('null')
  })

  it('includes a week_over_week_note field for first-run message', () => {
    expect(agentContent).toContain('week_over_week_note')
    expect(agentContent).toContain('No prior week data available')
  })
})

// ============================================================================
// Non-negotiables
// ============================================================================

describe('weekly-analyst agent — non-negotiables', () => {
  it('prohibits filesystem writes (output goes to KB artifacts only)', () => {
    expect(agentContent).toContain('Do NOT create filesystem files')
  })

  it('prohibits code or configuration modifications', () => {
    expect(agentContent).toContain('Do NOT modify any code')
  })

  it('prohibits write operations besides kb_write_artifact', () => {
    expect(agentContent).toContain('Do NOT execute any write operations besides')
  })

  it('mandates calling kb_get_scoreboard as the primary health signal', () => {
    expect(agentContent).toContain('MUST call `kb_get_scoreboard`')
  })

  it('mandates idempotent check before writing (unless force=true)', () => {
    expect(agentContent).toContain('MUST check for existing analysis')
  })
})

// ============================================================================
// Completion signal
// ============================================================================

describe('weekly-analyst agent — completion signals', () => {
  it('defines a success completion signal with anomaly and recommendation counts', () => {
    expect(agentContent).toContain('WEEKLY ANALYSIS COMPLETE')
    expect(agentContent).toContain('anomalies')
    expect(agentContent).toContain('recommendations')
  })

  it('defines a no-anomaly completion signal', () => {
    expect(agentContent).toContain('No anomalies detected')
  })

  it('defines a failure completion signal', () => {
    expect(agentContent).toContain('WEEKLY ANALYSIS FAILED')
  })
})

// ============================================================================
// Error handling — graceful degradation for non-critical tools
// ============================================================================

describe('weekly-analyst agent — error handling', () => {
  it('degrades gracefully when kb_get_bottleneck_analysis fails', () => {
    expect(agentContent).toContain("kb_get_bottleneck_analysis` fails")
    const bottleneckSection = agentContent.indexOf("kb_get_bottleneck_analysis` fails")
    const context = agentContent.slice(bottleneckSection, bottleneckSection + 200)
    expect(context).toContain('null')
  })

  it('degrades gracefully when kb_get_churn_analysis fails', () => {
    expect(agentContent).toContain("kb_get_churn_analysis` fails")
    const churnSection = agentContent.indexOf("kb_get_churn_analysis` fails")
    const context = agentContent.slice(churnSection, churnSection + 200)
    expect(context).toContain('null')
  })

  it('degrades gracefully when kb_get_token_summary fails', () => {
    expect(agentContent).toContain("kb_get_token_summary` fails")
    const tokenSection = agentContent.indexOf("kb_get_token_summary` fails")
    const context = agentContent.slice(tokenSection, tokenSection + 200)
    expect(context).toContain('null')
  })

  it('stops when kb_write_artifact fails (cannot persist analysis)', () => {
    const writeFailSection = agentContent.indexOf("kb_write_artifact` fails")
    expect(writeFailSection).toBeGreaterThan(-1)
    const context = agentContent.slice(writeFailSection, writeFailSection + 200)
    expect(context).toContain('STOP')
  })
})
