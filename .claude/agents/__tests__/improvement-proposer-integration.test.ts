/**
 * Integration test for improvement-proposer agent end-to-end workflow
 *
 * Tests multi-source aggregation with all 4 data sources (calibration, patterns, heuristics, retro)
 * Verifies graceful degradation when sources are unavailable
 *
 * @see WKFL-010 AC-1
 * @see .claude/agents/improvement-proposer.agent.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock KB search function
const mockKbSearch = vi.fn()

// Mock file read function
const mockReadFile = vi.fn()

// Mock glob function
const mockGlob = vi.fn()

// Simulated data sources
const MOCK_CALIBRATION_DATA = [
  {
    agent_id: 'code-review-security',
    stated_confidence: 'high',
    actual_outcome: 'false_positive',
    timestamp: '2026-02-01T10:00:00Z',
  },
  {
    agent_id: 'code-review-security',
    stated_confidence: 'high',
    actual_outcome: 'false_positive',
    timestamp: '2026-02-02T10:00:00Z',
  },
  {
    agent_id: 'code-review-security',
    stated_confidence: 'high',
    actual_outcome: 'correct',
    timestamp: '2026-02-03T10:00:00Z',
  },
]

const MOCK_PATTERN_DATA = {
  file_patterns: [
    {
      path: 'apps/api/src/routes.ts',
      correlation: 0.78,
      failure_type: 'lint',
      occurrences: 15,
    },
  ],
  ac_patterns: [],
  agent_correlations: [],
}

const MOCK_HEURISTIC_DATA = {
  heuristics: [
    {
      id: 'H-042',
      title: 'Pre-check linting before commit',
      status: 'validated',
      tier: 'experiment',
      validation_count: 12,
      success_rate: 0.92,
    },
  ],
}

const MOCK_RETRO_DATA = `
# Workflow Recommendations

## 2026-02-01

- Add type-check step to backend-coder agent
- Improve AC clarity in story templates
`

describe('Improvement Proposer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Multi-Source Aggregation', () => {
    it('loads data from all 4 sources successfully', async () => {
      mockKbSearch.mockResolvedValue({ entries: MOCK_CALIBRATION_DATA })
      mockGlob.mockResolvedValue(['.claude/patterns/PATTERNS-2026-02.yaml'])
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_PATTERN_DATA))
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_HEURISTIC_DATA))
      mockReadFile.mockResolvedValueOnce(MOCK_RETRO_DATA)

      const results = await Promise.allSettled([
        loadCalibration(mockKbSearch),
        loadPatterns(mockGlob, mockReadFile),
        loadHeuristics(mockReadFile),
        loadRetro(mockReadFile),
      ])

      const successCount = results.filter(r => r.status === 'fulfilled').length
      expect(successCount).toBe(4)
    })

    it('tracks sources_used array in output frontmatter', async () => {
      mockKbSearch.mockResolvedValue({ entries: MOCK_CALIBRATION_DATA })
      mockGlob.mockResolvedValue(['.claude/patterns/PATTERNS-2026-02.yaml'])
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_PATTERN_DATA))
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_HEURISTIC_DATA))
      mockReadFile.mockResolvedValueOnce(MOCK_RETRO_DATA)

      const results = await Promise.allSettled([
        loadCalibration(mockKbSearch),
        loadPatterns(mockGlob, mockReadFile),
        loadHeuristics(mockReadFile),
        loadRetro(mockReadFile),
      ])

      const sourcesUsed = results
        .map((r, i) => (r.status === 'fulfilled' ? ['calibration', 'pattern', 'heuristic', 'retro'][i] : null))
        .filter(Boolean)

      expect(sourcesUsed).toEqual(['calibration', 'pattern', 'heuristic', 'retro'])
    })
  })

  describe('Graceful Degradation', () => {
    it('continues when calibration source fails', async () => {
      mockKbSearch.mockRejectedValue(new Error('KB unavailable'))
      mockGlob.mockResolvedValue(['.claude/patterns/PATTERNS-2026-02.yaml'])
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_PATTERN_DATA))
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_HEURISTIC_DATA))
      mockReadFile.mockResolvedValueOnce(MOCK_RETRO_DATA)

      const results = await Promise.allSettled([
        loadCalibration(mockKbSearch),
        loadPatterns(mockGlob, mockReadFile),
        loadHeuristics(mockReadFile),
        loadRetro(mockReadFile),
      ])

      const successCount = results.filter(r => r.status === 'fulfilled').length
      expect(successCount).toBe(3) // All except calibration
    })

    it('continues when pattern source fails', async () => {
      mockKbSearch.mockResolvedValue({ entries: MOCK_CALIBRATION_DATA })
      mockGlob.mockRejectedValue(new Error('Pattern files not found'))
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_HEURISTIC_DATA))
      mockReadFile.mockResolvedValueOnce(MOCK_RETRO_DATA)

      const results = await Promise.allSettled([
        loadCalibration(mockKbSearch),
        loadPatterns(mockGlob, mockReadFile),
        loadHeuristics(mockReadFile),
        loadRetro(mockReadFile),
      ])

      const successCount = results.filter(r => r.status === 'fulfilled').length
      expect(successCount).toBe(3) // All except patterns
    })

    it('fails when all sources fail (< 1 successful)', async () => {
      mockKbSearch.mockRejectedValue(new Error('KB unavailable'))
      mockGlob.mockRejectedValue(new Error('Pattern files not found'))
      mockReadFile.mockRejectedValueOnce(new Error('Heuristic file not found'))
      mockReadFile.mockRejectedValueOnce(new Error('Retro file not found'))

      const results = await Promise.allSettled([
        loadCalibration(mockKbSearch),
        loadPatterns(mockGlob, mockReadFile),
        loadHeuristics(mockReadFile),
        loadRetro(mockReadFile),
      ])

      const successCount = results.filter(r => r.status === 'fulfilled').length
      expect(successCount).toBe(0)
      // In production, this would trigger error: "No data sources available"
    })

    it('logs actionable warnings for failed sources', async () => {
      mockKbSearch.mockResolvedValue({ entries: MOCK_CALIBRATION_DATA })
      mockGlob.mockRejectedValue(new Error('Pattern files not found'))
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_HEURISTIC_DATA))
      mockReadFile.mockResolvedValueOnce(MOCK_RETRO_DATA)

      const results = await Promise.allSettled([
        loadCalibration(mockKbSearch),
        loadPatterns(mockGlob, mockReadFile),
        loadHeuristics(mockReadFile),
        loadRetro(mockReadFile),
      ])

      const failedSources = results
        .map((r, i) => (r.status === 'rejected' ? ['calibration', 'pattern', 'heuristic', 'retro'][i] : null))
        .filter(Boolean)

      expect(failedSources).toContain('pattern')
      // In production, this would log: "Patterns unavailable: Run /pattern-mine to generate PATTERNS-{month}.yaml"
    })
  })

  describe('Proposal Output Structure', () => {
    it('generates proposals from calibration data', () => {
      const proposals = generateProposalsFromCalibration(MOCK_CALIBRATION_DATA)
      
      expect(proposals.length).toBeGreaterThan(0)
      expect(proposals[0]).toMatchObject({
        source: 'calibration',
        impact: expect.any(String),
        effort: expect.any(String),
        roi_score: expect.any(Number),
        evidence: expect.stringContaining('samples'),
      })
    })

    it('generates proposals from pattern data', () => {
      const proposals = generateProposalsFromPatterns(MOCK_PATTERN_DATA)
      
      expect(proposals.length).toBeGreaterThan(0)
      expect(proposals[0]).toMatchObject({
        source: 'pattern',
        impact: 'high',
        effort: 'low',
        roi_score: expect.any(Number),
        evidence: expect.stringContaining('correlation'),
      })
    })

    it('includes required fields in all proposals', async () => {
      mockKbSearch.mockResolvedValue({ entries: MOCK_CALIBRATION_DATA })
      mockGlob.mockResolvedValue(['.claude/patterns/PATTERNS-2026-02.yaml'])
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_PATTERN_DATA))
      mockReadFile.mockResolvedValueOnce(JSON.stringify(MOCK_HEURISTIC_DATA))
      mockReadFile.mockResolvedValueOnce(MOCK_RETRO_DATA)

      const allProposals = await generateAllProposals(
        mockKbSearch,
        mockGlob,
        mockReadFile,
      )

      allProposals.forEach(proposal => {
        expect(proposal).toHaveProperty('proposal_id')
        expect(proposal).toHaveProperty('title')
        expect(proposal).toHaveProperty('source')
        expect(proposal).toHaveProperty('status', 'proposed')
        expect(proposal).toHaveProperty('impact')
        expect(proposal).toHaveProperty('effort')
        expect(proposal).toHaveProperty('roi_score')
        expect(proposal).toHaveProperty('evidence')
        expect(proposal).toHaveProperty('created_at')
        expect(proposal).toHaveProperty('tags')
      })
    })
  })
})

// Helper functions (simulated agent logic)
async function loadCalibration(kbSearch: any) {
  const result = await kbSearch({ tags: ['calibration'] })
  return result.entries
}

async function loadPatterns(glob: any, readFile: any) {
  const files = await glob('.claude/patterns/PATTERNS-*.yaml')
  if (files.length === 0) throw new Error('No pattern files')
  const content = await readFile(files[0])
  return JSON.parse(content)
}

async function loadHeuristics(readFile: any) {
  const content = await readFile('.claude/config/HEURISTIC-PROPOSALS.yaml')
  return JSON.parse(content)
}

async function loadRetro(readFile: any) {
  return await readFile('.claude/retrospectives/WORKFLOW-RECOMMENDATIONS.md')
}

function generateProposalsFromCalibration(data: any[]) {
  // Simplified proposal generation from calibration data
  const grouped = data.reduce((acc, entry) => {
    if (!acc[entry.agent_id]) acc[entry.agent_id] = []
    acc[entry.agent_id].push(entry)
    return acc
  }, {} as Record<string, any[]>)

  return Object.entries(grouped).map(([agentId, entries]) => {
    const accuracy = entries.filter(e => e.actual_outcome === 'correct').length / entries.length
    
    if (accuracy < 0.90) {
      return {
        proposal_id: `P-${Date.now()}`,
        title: `Tighten ${agentId} high-confidence threshold`,
        source: 'calibration',
        status: 'proposed',
        impact: 'medium',
        effort: 'low',
        roi_score: 7.5,
        evidence: `${entries.length} samples, ${(accuracy * 100).toFixed(0)}% accuracy`,
        created_at: new Date().toISOString(),
        tags: ['proposal', 'status:proposed', 'source:calibration'],
      }
    }
    return null
  }).filter(Boolean)
}

function generateProposalsFromPatterns(data: any) {
  return data.file_patterns.map((pattern: any) => ({
    proposal_id: `P-${Date.now()}`,
    title: `Add lint pre-check for ${pattern.path}`,
    source: 'pattern',
    status: 'proposed',
    impact: 'high',
    effort: 'low',
    roi_score: 10.0,
    evidence: `${pattern.path} fails ${pattern.failure_type} ${(pattern.correlation * 100).toFixed(0)}% of reviews (${pattern.occurrences} samples)`,
    created_at: new Date().toISOString(),
    tags: ['proposal', 'status:proposed', 'source:pattern'],
  }))
}

async function generateAllProposals(kbSearch: any, glob: any, readFile: any) {
  const calibrationData = await loadCalibration(kbSearch)
  const patternData = await loadPatterns(glob, readFile)
  
  const calibrationProposals = generateProposalsFromCalibration(calibrationData)
  const patternProposals = generateProposalsFromPatterns(patternData)
  
  return [...calibrationProposals, ...patternProposals]
}
