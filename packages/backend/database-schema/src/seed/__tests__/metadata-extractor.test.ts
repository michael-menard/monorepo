import { describe, it, expect, vi } from 'vitest'
import path from 'path'
import {
  extractAgentMetadata,
  extractCommandMetadata,
  extractSkillMetadata,
} from '../parsers/metadata-extractor.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const fixturesDir = path.resolve(
  import.meta.dirname,
  '../__fixtures__',
)

describe('extractAgentMetadata', () => {
  it('extracts agent metadata with all fields from well-formed file', async () => {
    const agents = await extractAgentMetadata([path.join(fixturesDir, 'test-agent.md')])

    expect(agents).toHaveLength(1)
    expect(agents[0]).toMatchObject({
      name: 'test-agent',
      agentType: 'worker',
      permissionLevel: 'read-write',
      model: 'sonnet',
      spawnedBy: ['orchestrator'],
      triggers: ['/test'],
      skillsUsed: ['commit', 'review'],
    })
    // Verify metadata captures extra fields
    expect(agents[0].metadata).toHaveProperty('mission', 'Test agent for seeding')
  })

  it('uses filename as fallback for missing name field', async () => {
    const agents = await extractAgentMetadata([path.join(fixturesDir, 'minimal-agent.md')])

    expect(agents).toHaveLength(1)
    // Name should be extracted from filename (minimal-agent)
    expect(agents[0].name).toBe('minimal-agent')
    expect(agents[0].agentType).toBe('worker')
    expect(agents[0].permissionLevel).toBe('docs-only')
    expect(agents[0].model).toBeNull()
    expect(agents[0].spawnedBy).toBeNull()
    expect(agents[0].triggers).toBeNull()
    expect(agents[0].skillsUsed).toBeNull()
  })

  it('handles parse failures gracefully (skips bad files)', async () => {
    const agents = await extractAgentMetadata([
      path.join(fixturesDir, 'test-agent.md'),
      path.join(fixturesDir, 'malformed-agent.md'), // may or may not parse
    ])

    // At minimum the valid agent should be returned
    expect(agents.length).toBeGreaterThanOrEqual(1)
    // The valid agent should be there
    const testAgent = agents.find(a => a.name === 'test-agent')
    expect(testAgent).toBeDefined()
  })

  it('handles empty file list', async () => {
    const agents = await extractAgentMetadata([])
    expect(agents).toHaveLength(0)
  })
})

describe('extractCommandMetadata', () => {
  it('extracts command metadata from a markdown file', async () => {
    const commands = await extractCommandMetadata([path.join(fixturesDir, 'test-agent.md')])

    // Should parse the file (it's a valid markdown)
    expect(commands).toHaveLength(1)
    expect(commands[0]).toHaveProperty('name')
    expect(commands[0]).toHaveProperty('description')
    expect(commands[0]).toHaveProperty('triggers')
    expect(commands[0]).toHaveProperty('metadata')
  })

  it('uses filename as fallback for missing name', async () => {
    const commands = await extractCommandMetadata([path.join(fixturesDir, 'minimal-agent.md')])

    expect(commands).toHaveLength(1)
    expect(commands[0].name).toBe('minimal-agent') // filename without .md
  })

  it('handles empty file list', async () => {
    const commands = await extractCommandMetadata([])
    expect(commands).toHaveLength(0)
  })
})

describe('extractSkillMetadata', () => {
  it('handles empty directory list', async () => {
    const skills = await extractSkillMetadata([])
    expect(skills).toHaveLength(0)
  })

  it('handles directory without skill metadata file', async () => {
    // Use the fixtures directory itself which has no skill.md or index.md
    const skills = await extractSkillMetadata([fixturesDir])

    // Should skip directories with no skill metadata file
    expect(skills).toHaveLength(0)
  })
})
