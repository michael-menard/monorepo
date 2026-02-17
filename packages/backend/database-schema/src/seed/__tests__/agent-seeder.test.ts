import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock local schema
vi.mock('../schema/index.js', () => ({
  agents: {
    name: 'agents',
    agentType: { name: 'agent_type' },
    permissionLevel: { name: 'permission_level' },
    model: { name: 'model' },
    spawnedBy: { name: 'spawned_by' },
    triggers: { name: 'triggers' },
    skillsUsed: { name: 'skills_used' },
    metadata: { name: 'metadata' },
    updatedAt: { name: 'updated_at' },
  },
  insertAgentSchema: {
    safeParse: (data: any) => {
      if (data.name && data.agentType && data.permissionLevel) {
        return { success: true, data }
      }
      return {
        success: false,
        error: { message: 'Validation failed', errors: [{ message: 'Required fields missing' }] },
      }
    },
  },
}))

describe('seedAgents', () => {
  let mockTx: any

  beforeEach(() => {
    mockTx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                name: 'test-agent',
                agentType: 'worker',
                permissionLevel: 'read-write',
              },
            ]),
          }),
        }),
      }),
    }
  })

  it('seeds agents from fixture directory', async () => {
    const { seedAgents } = await import('../agent-seeder.js')
    const fixturesDir = path.resolve(import.meta.dirname, '../__fixtures__')

    const result = await seedAgents(mockTx, fixturesDir)

    expect(result.success).toBe(true)
    expect(result.rowCount).toBeGreaterThanOrEqual(1)
  })

  it('returns success with 0 rows when no agent files found', async () => {
    const { seedAgents } = await import('../agent-seeder.js')

    // Use a directory with no .agent.md files
    const result = await seedAgents(mockTx, import.meta.dirname)

    expect(result.success).toBe(true)
    expect(result.rowCount).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('handles parse failures gracefully', async () => {
    const { seedAgents } = await import('../agent-seeder.js')
    const fixturesDir = path.resolve(import.meta.dirname, '../__fixtures__')

    // Even with malformed files in fixtures, it should succeed
    const result = await seedAgents(mockTx, fixturesDir)

    expect(result.success).toBe(true)
    expect(typeof result.rowCount).toBe('number')
  })
})
