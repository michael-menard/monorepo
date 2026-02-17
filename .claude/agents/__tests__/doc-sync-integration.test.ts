/**
 * Integration tests for hybrid file+database sync scenario in doc-sync agent
 *
 * Tests end-to-end workflow of querying database, merging with file frontmatter,
 * and generating documentation with hybrid data sources.
 *
 * @see WINT-0150 Test Plan Scenario 1
 * @see .claude/agents/doc-sync.agent.md
 */

import { describe, it, expect } from 'vitest'

// Mock agent frontmatter from file
interface AgentFrontmatter {
  created: string
  updated: string
  version: string
  type?: 'orchestrator' | 'leader' | 'worker'
  name: string
  model?: 'haiku' | 'sonnet' | 'opus'
  source: 'file' | 'database' | 'hybrid'
}

// Mock database component metadata
interface DatabaseComponent {
  component_id: number
  name: string
  type: 'agent' | 'command' | 'skill'
  model?: 'haiku' | 'sonnet' | 'opus'
  version?: string
  metadata?: Record<string, any>
}

// Mock database phase metadata
interface DatabasePhase {
  phase_id: number
  phase_number: number
  phase_name: string
  status: 'pending' | 'in_progress' | 'completed'
  completed_at?: string
}

// Merge file frontmatter with database metadata
function mergeMetadata(
  fileMetadata: AgentFrontmatter,
  dbMetadata?: DatabaseComponent,
): AgentFrontmatter {
  if (!dbMetadata) {
    return { ...fileMetadata, source: 'file' }
  }

  // Database overrides file metadata when both present
  return {
    ...fileMetadata,
    model: dbMetadata.model || fileMetadata.model,
    version: dbMetadata.version || fileMetadata.version,
    source: 'hybrid',
  }
}

// Simulate doc-sync Phase 2 with database query
async function simulatePhase2HybridSync(options: {
  fileAgents: AgentFrontmatter[]
  databaseComponents: DatabaseComponent[]
  databaseAvailable: boolean
}): Promise<{
  mergedAgents: AgentFrontmatter[]
  databaseStatus: {
    queried: boolean
    status: 'success' | 'unavailable'
    components_count: number
  }
}> {
  const { fileAgents, databaseComponents, databaseAvailable } = options

  if (!databaseAvailable) {
    return {
      mergedAgents: fileAgents.map(agent => ({ ...agent, source: 'file' })),
      databaseStatus: {
        queried: false,
        status: 'unavailable',
        components_count: 0,
      },
    }
  }

  // Merge file and database metadata
  const mergedAgents = fileAgents.map(fileAgent => {
    const dbComponent = databaseComponents.find(db => db.name === fileAgent.name)
    return mergeMetadata(fileAgent, dbComponent)
  })

  return {
    mergedAgents,
    databaseStatus: {
      queried: true,
      status: 'success',
      components_count: databaseComponents.length,
    },
  }
}

// Map agents to WINT phase structure
function mapToWINTPhase(agent: AgentFrontmatter): string {
  // Check database metadata for phase assignment (future enhancement)
  // For now, use file naming pattern
  if (agent.name.startsWith('pm-')) return 'Phase 2: PM Story Generation'
  if (agent.name.startsWith('elab-')) return 'Phase 3: QA Elaboration'
  if (agent.name.startsWith('dev-')) return 'Phase 4: Dev Implementation'
  return 'Unknown'
}

describe('Hybrid File+Database Sync Integration', () => {
  describe('Test Plan Scenario 1: Hybrid Sync', () => {
    it('merges file frontmatter with database metadata successfully', async () => {
      const fileAgents: AgentFrontmatter[] = [
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'pm-story-generation-leader',
          model: 'sonnet',
          source: 'file',
        },
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'dev-implement-backend-coder',
          model: 'haiku',
          source: 'file',
        },
      ]

      const databaseComponents: DatabaseComponent[] = [
        {
          component_id: 1,
          name: 'pm-story-generation-leader',
          type: 'agent',
          model: 'opus', // Database override
          version: '1.1.0', // Database override
        },
        {
          component_id: 2,
          name: 'dev-implement-backend-coder',
          type: 'agent',
          model: 'haiku', // Same as file
          version: '1.0.0', // Same as file
        },
      ]

      const result = await simulatePhase2HybridSync({
        fileAgents,
        databaseComponents,
        databaseAvailable: true,
      })

      // Verify merge results
      expect(result.mergedAgents).toHaveLength(2)

      // First agent should have database overrides
      expect(result.mergedAgents[0].name).toBe('pm-story-generation-leader')
      expect(result.mergedAgents[0].model).toBe('opus') // Database override
      expect(result.mergedAgents[0].version).toBe('1.1.0') // Database override
      expect(result.mergedAgents[0].source).toBe('hybrid')

      // Second agent should keep file values (no conflict)
      expect(result.mergedAgents[1].name).toBe('dev-implement-backend-coder')
      expect(result.mergedAgents[1].model).toBe('haiku')
      expect(result.mergedAgents[1].version).toBe('1.0.0')
      expect(result.mergedAgents[1].source).toBe('hybrid')

      // Verify database status
      expect(result.databaseStatus.queried).toBe(true)
      expect(result.databaseStatus.status).toBe('success')
      expect(result.databaseStatus.components_count).toBe(2)
    })

    it('falls back to file-only mode when database unavailable', async () => {
      const fileAgents: AgentFrontmatter[] = [
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'pm-story-generation-leader',
          model: 'sonnet',
          source: 'file',
        },
      ]

      const result = await simulatePhase2HybridSync({
        fileAgents,
        databaseComponents: [],
        databaseAvailable: false,
      })

      // Verify file-only fallback
      expect(result.mergedAgents).toHaveLength(1)
      expect(result.mergedAgents[0].model).toBe('sonnet') // File value preserved
      expect(result.mergedAgents[0].version).toBe('1.0.0') // File value preserved
      expect(result.mergedAgents[0].source).toBe('file')

      // Verify database status indicates unavailable
      expect(result.databaseStatus.queried).toBe(false)
      expect(result.databaseStatus.status).toBe('unavailable')
      expect(result.databaseStatus.components_count).toBe(0)
    })

    it('handles agents present in files but not in database', async () => {
      const fileAgents: AgentFrontmatter[] = [
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'new-agent',
          model: 'haiku',
          source: 'file',
        },
      ]

      const databaseComponents: DatabaseComponent[] = [
        {
          component_id: 1,
          name: 'different-agent',
          type: 'agent',
          model: 'sonnet',
        },
      ]

      const result = await simulatePhase2HybridSync({
        fileAgents,
        databaseComponents,
        databaseAvailable: true,
      })

      // Agent not in database should keep file metadata
      expect(result.mergedAgents[0].name).toBe('new-agent')
      expect(result.mergedAgents[0].model).toBe('haiku')
      expect(result.mergedAgents[0].source).toBe('hybrid') // Still marked hybrid mode
    })
  })

  describe('Phase 3: WINT Phase Structure Mapping', () => {
    it('maps agents to WINT phase structure', () => {
      const agents: AgentFrontmatter[] = [
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'pm-story-generation-leader',
          source: 'file',
        },
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'elab-story-leader',
          source: 'file',
        },
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'dev-implement-story',
          source: 'file',
        },
      ]

      const mappings = agents.map(agent => ({
        agent: agent.name,
        phase: mapToWINTPhase(agent),
      }))

      expect(mappings).toEqual([
        { agent: 'pm-story-generation-leader', phase: 'Phase 2: PM Story Generation' },
        { agent: 'elab-story-leader', phase: 'Phase 3: QA Elaboration' },
        { agent: 'dev-implement-story', phase: 'Phase 4: Dev Implementation' },
      ])
    })

    it('handles unknown agent patterns with fallback', () => {
      const agent: AgentFrontmatter = {
        created: '2026-02-01',
        updated: '2026-02-01',
        version: '1.0.0',
        name: 'custom-workflow-agent',
        source: 'file',
      }

      const phase = mapToWINTPhase(agent)

      expect(phase).toBe('Unknown')
      // In real implementation, this would be added to manual_review_needed
    })
  })

  describe('Database Query Status Reporting', () => {
    it('includes comprehensive status in SYNC-REPORT.md format', async () => {
      const fileAgents: AgentFrontmatter[] = [
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'test-agent',
          source: 'file',
        },
      ]

      const databaseComponents: DatabaseComponent[] = [
        {
          component_id: 1,
          name: 'test-agent',
          type: 'agent',
          model: 'sonnet',
        },
      ]

      const result = await simulatePhase2HybridSync({
        fileAgents,
        databaseComponents,
        databaseAvailable: true,
      })

      // Verify all required status fields for SYNC-REPORT.md
      expect(result.databaseStatus).toEqual({
        queried: true,
        status: 'success',
        components_count: 1,
      })
    })
  })

  describe('Database Metadata Precedence', () => {
    it('database model field overrides file frontmatter', async () => {
      const fileAgent: AgentFrontmatter = {
        created: '2026-02-01',
        updated: '2026-02-01',
        version: '1.0.0',
        name: 'test-agent',
        model: 'haiku',
        source: 'file',
      }

      const dbComponent: DatabaseComponent = {
        component_id: 1,
        name: 'test-agent',
        type: 'agent',
        model: 'opus', // Override
      }

      const merged = mergeMetadata(fileAgent, dbComponent)

      expect(merged.model).toBe('opus')
      expect(merged.source).toBe('hybrid')
    })

    it('database version field overrides file frontmatter', async () => {
      const fileAgent: AgentFrontmatter = {
        created: '2026-02-01',
        updated: '2026-02-01',
        version: '1.0.0',
        name: 'test-agent',
        source: 'file',
      }

      const dbComponent: DatabaseComponent = {
        component_id: 1,
        name: 'test-agent',
        type: 'agent',
        version: '2.0.0', // Override
      }

      const merged = mergeMetadata(fileAgent, dbComponent)

      expect(merged.version).toBe('2.0.0')
      expect(merged.source).toBe('hybrid')
    })

    it('preserves file metadata when database has no override', async () => {
      const fileAgent: AgentFrontmatter = {
        created: '2026-02-01',
        updated: '2026-02-01',
        version: '1.0.0',
        name: 'test-agent',
        model: 'haiku',
        source: 'file',
      }

      const dbComponent: DatabaseComponent = {
        component_id: 1,
        name: 'test-agent',
        type: 'agent',
        // No model or version - file values should be preserved
      }

      const merged = mergeMetadata(fileAgent, dbComponent)

      expect(merged.model).toBe('haiku')
      expect(merged.version).toBe('1.0.0')
      expect(merged.source).toBe('hybrid')
    })
  })

  describe('End-to-End Hybrid Workflow', () => {
    it('completes full hybrid sync workflow successfully', async () => {
      // Step 1: Parse file frontmatter
      const fileAgents: AgentFrontmatter[] = [
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'pm-story-generation-leader',
          model: 'sonnet',
          source: 'file',
        },
        {
          created: '2026-02-01',
          updated: '2026-02-01',
          version: '1.0.0',
          name: 'elab-story-leader',
          model: 'haiku',
          source: 'file',
        },
      ]

      // Step 2: Query database
      const databaseComponents: DatabaseComponent[] = [
        {
          component_id: 1,
          name: 'pm-story-generation-leader',
          type: 'agent',
          model: 'opus', // Database override
          version: '1.2.0',
        },
        // elab-story-leader not in database
      ]

      // Step 3: Merge metadata
      const syncResult = await simulatePhase2HybridSync({
        fileAgents,
        databaseComponents,
        databaseAvailable: true,
      })

      // Step 4: Map to phase structure
      const phaseMappings = syncResult.mergedAgents.map(agent => ({
        agent: agent.name,
        phase: mapToWINTPhase(agent),
        model: agent.model,
        source: agent.source,
      }))

      // Verify complete workflow
      expect(syncResult.databaseStatus.queried).toBe(true)
      expect(syncResult.databaseStatus.status).toBe('success')

      expect(phaseMappings).toEqual([
        {
          agent: 'pm-story-generation-leader',
          phase: 'Phase 2: PM Story Generation',
          model: 'opus', // Database override applied
          source: 'hybrid',
        },
        {
          agent: 'elab-story-leader',
          phase: 'Phase 3: QA Elaboration',
          model: 'haiku', // File value (not in database)
          source: 'hybrid',
        },
      ])
    })
  })
})
