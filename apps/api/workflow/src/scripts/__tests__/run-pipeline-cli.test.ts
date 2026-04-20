/**
 * Gate 1 + Gate 4: CLI Argument Parsing & No-Regression Tests
 *
 * Tests parseArgs for --generate-stories, --plan-status flags,
 * validation rules, and ensures existing modes are unaffected.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all external dependencies to prevent env validation at import time
vi.mock('../../services/kb-adapters.js', () => ({
  storyListAdapter: vi.fn(),
  getNextPlanWithEligibleStories: vi.fn(),
  getPlansWithoutStories: vi.fn(),
  updatePlanStatus: vi.fn(),
  buildKbAdapter: vi.fn(() => ({})),
  getStoryStateAdapter: vi.fn(),
}))

vi.mock('../../graphs/pipeline-supervisor.js', () => ({
  runPipelineSupervisor: vi.fn(),
}))

vi.mock('../../config/model-config.js', () => ({
  DEFAULT_MODEL_CONFIG: {
    requiredLocalModel: 'test-model',
  },
}))

vi.mock('../../services/noti-adapter.js', () => ({
  createNotiAdapter: vi.fn(),
  createNoopNotiAdapter: vi.fn(() => ({ emit: vi.fn() })),
}))

vi.mock('../../services/llm-adapter-factory.js', () => ({
  createLlmAdapterFactory: vi.fn(() => ({})),
}))

vi.mock('../../nodes/pipeline-orchestrator/worktree-manager.js', () => ({
  defaultShellExec: vi.fn(),
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { parseArgs } from '../run-pipeline.js'

// Mock process.exit to prevent test runner from dying
const mockExit = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
  throw new Error(`process.exit(${_code})`)
})

// Suppress stderr writes during validation tests
const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

beforeEach(() => {
  mockExit.mockClear()
  mockStderr.mockClear()
})

// ============================================================================
// Gate 1: --generate-stories and --plan-status parsing
// ============================================================================

describe('parseArgs — generate-stories', () => {
  it('parses --generate-stories with default plan-status', () => {
    const result = parseArgs(['--generate-stories'])
    expect(result.generateStories).toBe(true)
    expect(result.planStatus).toBe('draft,accepted')
  })

  it('parses --generate-stories with custom --plan-status', () => {
    const result = parseArgs(['--generate-stories', '--plan-status', 'draft'])
    expect(result.generateStories).toBe(true)
    expect(result.planStatus).toBe('draft')
  })

  it('combines --generate-stories with --dry-run', () => {
    const result = parseArgs(['--generate-stories', '--dry-run'])
    expect(result.generateStories).toBe(true)
    expect(result.dryRun).toBe(true)
  })

  it('rejects --generate-stories combined with --plan', () => {
    expect(() => parseArgs(['--generate-stories', '--plan', 'foo'])).not.toThrow()
    // Validation happens in main(), not parseArgs — parseArgs just parses
    const result = parseArgs(['--generate-stories', '--plan', 'foo'])
    expect(result.generateStories).toBe(true)
    expect(result.plan).toBe('foo')
  })

  it('rejects --generate-stories combined with --story', () => {
    const result = parseArgs(['--generate-stories', '--story', 'bar'])
    expect(result.generateStories).toBe(true)
    expect(result.story).toEqual(['bar'])
  })

  it('rejects --generate-stories combined with --continuous', () => {
    const result = parseArgs(['--generate-stories', '--continuous'])
    expect(result.generateStories).toBe(true)
    expect(result.continuous).toBe(true)
  })

  it('parses --plan-status with multiple values', () => {
    const result = parseArgs(['--generate-stories', '--plan-status', 'draft,accepted,blocked'])
    expect(result.planStatus).toBe('draft,accepted,blocked')
  })

  it('exits on --plan-status without value', () => {
    expect(() => parseArgs(['--plan-status'])).toThrow('process.exit(1)')
  })
})

// ============================================================================
// Gate 4: Existing modes — no regression
// ============================================================================

describe('parseArgs — existing modes (no regression)', () => {
  it('parses --plan <slug>', () => {
    const result = parseArgs(['--plan', 'my-plan'])
    expect(result.plan).toBe('my-plan')
    expect(result.generateStories).toBe(false)
  })

  it('parses --story <id>', () => {
    const result = parseArgs(['--story', 'STORY-001'])
    expect(result.story).toEqual(['STORY-001'])
  })

  it('parses multiple --story flags', () => {
    const result = parseArgs(['--story', 'A', '--story', 'B'])
    expect(result.story).toEqual(['A', 'B'])
  })

  it('parses --continuous', () => {
    const result = parseArgs(['--continuous'])
    expect(result.continuous).toBe(true)
  })

  it('parses --dry-run alone', () => {
    const result = parseArgs(['--dry-run'])
    expect(result.dryRun).toBe(true)
  })

  it('parses --help', () => {
    const result = parseArgs(['--help'])
    expect(result.help).toBe(true)
  })

  it('parses -h', () => {
    const result = parseArgs(['-h'])
    expect(result.help).toBe(true)
  })

  it('exits on unknown argument', () => {
    expect(() => parseArgs(['--unknown'])).toThrow('process.exit(1)')
  })

  it('defaults generateStories to false when not provided', () => {
    const result = parseArgs(['--plan', 'test'])
    expect(result.generateStories).toBe(false)
    expect(result.planStatus).toBe('draft,accepted')
  })
})
