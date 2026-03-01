/**
 * artifact_write Tool Handler Tests
 *
 * Tests the handleArtifactWrite tool handler (handler-level: auth, validation, error format)
 * and artifact_write function (unit-level: dual-write logic, failure isolation).
 *
 * Handler tests use vi.hoisted + vi.mock to stub artifact_write at the module boundary.
 * Dual-write tests use vi.importActual to bypass the mock and test the real function.
 *
 * @see KBAR-0110 AC-7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockEmbeddingClient } from './test-helpers.js'

// ============================================================================
// Hoisted mocks (must appear before vi.mock calls)
// ============================================================================

const { mockArtifactWrite, mockMkdir, mockWriteFile } = vi.hoisted(() => ({
  mockArtifactWrite: vi.fn(),
  mockMkdir: vi.fn(),
  mockWriteFile: vi.fn(),
}))

// Mock the logger
vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock artifact-operations to control artifact_write behavior at handler boundary
vi.mock('../../crud-operations/artifact-operations.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../crud-operations/artifact-operations.js')>()
  return {
    ...actual,
    artifact_write: mockArtifactWrite,
  }
})

// Mock fs/promises for dual-write unit tests (actual artifact_write imports dynamically)
vi.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
}))

// Mock js-yaml for dual-write unit tests
vi.mock('js-yaml', () => ({
  dump: (obj: unknown) => `# yaml\n${JSON.stringify(obj, null, 2)}\n`,
}))

import { handleArtifactWrite, type ToolHandlerDeps } from '../tool-handlers.js'

// ============================================================================
// Helpers
// ============================================================================

function createMockDeps(): ToolHandlerDeps {
  return {
    db: {} as ToolHandlerDeps['db'],
    embeddingClient: createMockEmbeddingClient(),
  }
}

function baseInput(overrides?: Record<string, unknown>) {
  return {
    story_id: 'KBAR-0110',
    artifact_type: 'checkpoint',
    content: { current_phase: 'plan', blocked: false, iteration: 0 },
    story_dir: '/tmp/stories/KBAR-0110',
    phase: 'implementation',
    iteration: 0,
    write_to_kb: true,
    ...overrides,
  }
}

function mockSuccessResult(overrides?: Record<string, unknown>) {
  return {
    file_written: true,
    file_path: '/tmp/stories/KBAR-0110/_implementation/CHECKPOINT.yaml',
    kb_written: true,
    kb_artifact_id: 'artifact-uuid-001',
    kb_error: null,
    ...overrides,
  }
}

// ============================================================================
// Handler-level tests (via handleArtifactWrite)
// ============================================================================

describe('handleArtifactWrite', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()
    mockDeps = createMockDeps()
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockArtifactWrite.mockResolvedValue(mockSuccessResult())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // EC-1: Happy path — handler returns file_written + kb_written
  it('EC-1: should return file_written and kb_artifact_id on success', async () => {
    const result = await handleArtifactWrite(baseInput(), mockDeps)

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse((result.content[0] as { text: string }).text)
    expect(parsed.file_written).toBe(true)
    expect(parsed.file_path).toContain('CHECKPOINT.yaml')
    expect(parsed.kb_written).toBe(true)
    expect(parsed.kb_artifact_id).toBe('artifact-uuid-001')
    expect(parsed.kb_error).toBeNull()
    expect(mockArtifactWrite).toHaveBeenCalledOnce()
  })

  // EC-4: Input validation rejects invalid artifact_type
  it('EC-4: should return VALIDATION_ERROR for invalid artifact_type', async () => {
    const result = await handleArtifactWrite(
      baseInput({ artifact_type: 'not_a_valid_type' }),
      mockDeps,
    )

    expect(result.isError).toBe(true)
    const text = (result.content[0] as { text: string }).text
    expect(text).toContain('VALIDATION_ERROR')
  })

  // EC-5: Input validation rejects empty story_dir
  it('EC-5: should return VALIDATION_ERROR when story_dir is empty string', async () => {
    const result = await handleArtifactWrite(
      baseInput({ story_dir: '' }),
      mockDeps,
    )

    expect(result.isError).toBe(true)
    const text = (result.content[0] as { text: string }).text
    expect(text).toContain('VALIDATION_ERROR')
  })

  // EC-7: artifact_write throws propagates as error
  it('EC-7: should return isError when artifact_write throws', async () => {
    mockArtifactWrite.mockRejectedValue(new Error('EACCES: permission denied'))

    const result = await handleArtifactWrite(baseInput(), mockDeps)

    expect(result.isError).toBe(true)
  })
})

// ============================================================================
// Dual-write unit tests (via artifact_write directly using vi.importActual)
// ============================================================================

describe('artifact_write (dual-write logic)', () => {
  let actualArtifactWrite: typeof import('../../crud-operations/artifact-operations.js')['artifact_write']
  const mockKbWriteFn = vi.fn()
  const baseDeps = { db: {} as ToolHandlerDeps['db'] }
  const artifactContent = { current_phase: 'plan', blocked: false }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    // Get the REAL artifact_write bypassing the mock
    const actual = await vi.importActual<typeof import('../../crud-operations/artifact-operations.js')>(
      '../../crud-operations/artifact-operations.js',
    )
    actualArtifactWrite = actual.artifact_write
    // Default KB mock: success
    mockKbWriteFn.mockResolvedValue({
      id: 'artifact-uuid-001',
      story_id: 'KBAR-0110',
      artifact_type: 'checkpoint',
      artifact_name: 'CHECKPOINT',
      phase: 'implementation',
      iteration: 0,
      content: {},
      summary: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  // EC-2: KB write failure does NOT block file write (failure isolation)
  it('EC-2: should succeed with file write even when KB write fails', async () => {
    const failingKbWrite = vi.fn().mockRejectedValue(new Error('DB connection timeout'))

    const result = await actualArtifactWrite(
      {
        story_id: 'KBAR-0110',
        artifact_type: 'checkpoint',
        content: artifactContent,
        story_dir: '/tmp/stories/KBAR-0110',
        phase: 'implementation',
        iteration: 0,
        write_to_kb: true,
      },
      baseDeps,
      failingKbWrite,
    )

    expect(result.file_written).toBe(true)
    expect(result.kb_written).toBe(false)
    expect(result.kb_error).toBe('DB connection timeout')
    expect(result.kb_artifact_id).toBeNull()
    expect(mockWriteFile).toHaveBeenCalledOnce()
  })

  // EC-3: write_to_kb: false skips KB write
  it('EC-3: should skip KB write when write_to_kb is false', async () => {
    const result = await actualArtifactWrite(
      {
        story_id: 'KBAR-0110',
        artifact_type: 'checkpoint',
        content: artifactContent,
        story_dir: '/tmp/stories/KBAR-0110',
        phase: null,
        iteration: 0,
        write_to_kb: false,
      },
      baseDeps,
      mockKbWriteFn,
    )

    expect(result.file_written).toBe(true)
    expect(result.kb_written).toBeNull()
    expect(result.kb_artifact_id).toBeNull()
    expect(result.kb_error).toBeNull()
    expect(mockKbWriteFn).not.toHaveBeenCalled()
  })

  // EC-6: Iteration > 0 produces .iterN suffix in file path
  it('EC-6: should produce .iterN suffix in file path for iteration > 0', async () => {
    const result = await actualArtifactWrite(
      {
        story_id: 'KBAR-0110',
        artifact_type: 'checkpoint',
        content: artifactContent,
        story_dir: '/tmp/stories/KBAR-0110',
        phase: null,
        iteration: 2,
        write_to_kb: false,
      },
      baseDeps,
      mockKbWriteFn,
    )

    expect(result.file_path).toContain('CHECKPOINT.iter2.yaml')
  })

  // EC-8: evidence artifact produces EVIDENCE.yaml
  it('EC-8: should produce correct filename for evidence artifact type', async () => {
    const result = await actualArtifactWrite(
      {
        story_id: 'KBAR-0110',
        artifact_type: 'evidence',
        content: artifactContent,
        story_dir: '/tmp/stories/KBAR-0110',
        phase: null,
        iteration: 0,
        write_to_kb: false,
      },
      baseDeps,
      mockKbWriteFn,
    )

    expect(result.file_path).toContain('EVIDENCE.yaml')
  })
})
