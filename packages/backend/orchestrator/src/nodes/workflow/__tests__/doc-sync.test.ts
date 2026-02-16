/**
 * Unit tests for doc-sync node.
 *
 * WINT-0160: Create doc-sync Agent (LangGraph Node Integration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { GraphState } from '../../../state/index.js'
import {
  docSyncNode,
  createDocSyncNode,
  DocSyncConfigSchema,
  DocSyncResultSchema,
  type DocSyncConfig,
  type DocSyncResult,
} from '../doc-sync.js'

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

// Mock subprocess execution
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}))

// Mock logger with full interface
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Import mocked modules
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { logger } from '@repo/logger'

describe('DocSyncConfigSchema', () => {
  it('should parse valid config with defaults', () => {
    const config = DocSyncConfigSchema.parse({})
    expect(config.checkOnly).toBe(false)
    expect(config.force).toBe(false)
    expect(config.agentPath).toBeUndefined()
  })

  it('should parse config with checkOnly flag', () => {
    const config = DocSyncConfigSchema.parse({ checkOnly: true })
    expect(config.checkOnly).toBe(true)
    expect(config.force).toBe(false)
  })

  it('should parse config with force flag', () => {
    const config = DocSyncConfigSchema.parse({ force: true })
    expect(config.force).toBe(true)
    expect(config.checkOnly).toBe(false)
  })

  it('should parse config with custom paths', () => {
    const config = DocSyncConfigSchema.parse({
      workingDir: '/custom/path',
      reportPath: '/custom/report.md',
    })
    expect(config.workingDir).toBe('/custom/path')
    expect(config.reportPath).toBe('/custom/report.md')
  })
})

describe('DocSyncResultSchema', () => {
  it('should validate complete result', () => {
    const result: DocSyncResult = {
      success: true,
      filesChanged: 3,
      sectionsUpdated: 2,
      diagramsRegenerated: 1,
      manualReviewNeeded: 0,
      changelogDrafted: true,
      reportPath: '/path/to/SYNC-REPORT.md',
      errors: [],
    }

    const validated = DocSyncResultSchema.parse(result)
    expect(validated).toEqual(result)
  })

  it('should validate result with errors', () => {
    const result: DocSyncResult = {
      success: false,
      filesChanged: 0,
      sectionsUpdated: 0,
      diagramsRegenerated: 0,
      manualReviewNeeded: 0,
      changelogDrafted: false,
      reportPath: '/path/to/SYNC-REPORT.md',
      errors: ['Command failed', 'File not found'],
    }

    const validated = DocSyncResultSchema.parse(result)
    expect(validated).toEqual(result)
  })
})

describe('docSyncNode', () => {
  const mockState: GraphState = {
    storyId: 'TEST-001',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully sync and parse report', async () => {
    const reportContent = `
# Documentation Sync Report

**Run Date:** 2026-02-14

## Summary

- Total files changed: 3
- Total sections updated: 2
- Total diagrams regenerated: 1
- Manual review items: 0

## Changelog Entry

**Status:** [DRAFT]
`

    // Mock subprocess to succeed
    const mockChild = {
      stdout: { on: vi.fn((event, handler) => event === 'data' && handler('')) },
      stderr: { on: vi.fn((event, handler) => event === 'data' && handler('')) },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(0) // Exit code 0 = success
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    // Mock readFile to return report content
    vi.mocked(readFile).mockResolvedValue(reportContent as never)

    const result = await docSyncNode(mockState)

    expect(result.docSync).toBeDefined()
    expect(result.docSync?.success).toBe(true)
    expect(result.docSync?.filesChanged).toBe(3)
    expect(result.docSync?.sectionsUpdated).toBe(2)
    expect(result.docSync?.diagramsRegenerated).toBe(1)
    expect(result.docSync?.manualReviewNeeded).toBe(0)
    expect(result.docSync?.changelogDrafted).toBe(true)
    expect(result.docSync?.errors).toEqual([])
  })

  it('should handle check-only mode with out-of-sync (exit code 1)', async () => {
    const reportContent = `
# Documentation Sync Report

**Run Mode:** Check only

## Summary

- Total files changed: 2
- Total sections updated: 1
- Total diagrams regenerated: 0
- Manual review items: 1

## Changelog Entry

**Status:** [DRAFT]
`

    // Mock subprocess to return exit code 1 (out of sync in check-only mode)
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(1) // Exit code 1 = out of sync
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    vi.mocked(readFile).mockResolvedValue(reportContent as never)

    const checkOnlyNode = createDocSyncNode({ checkOnly: true })
    const result = await checkOnlyNode(mockState)

    expect(result.docSync).toBeDefined()
    expect(result.docSync?.success).toBe(false) // Exit code 1 means not in sync
    expect(result.docSync?.filesChanged).toBe(2)
    expect(result.docSync?.manualReviewNeeded).toBe(1)
  })

  it('should handle force mode flag correctly', async () => {
    const reportContent = `
# Documentation Sync Report

**Run Mode:** Full sync

## Summary

- Total files changed: 5
- Total sections updated: 3
- Total diagrams regenerated: 2
- Manual review items: 0
`

    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(0)
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    vi.mocked(readFile).mockResolvedValue(reportContent as never)

    const forceNode = createDocSyncNode({ force: true })
    const result = await forceNode(mockState)

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      ['doc-sync', '--force'],
      expect.objectContaining({ shell: true }),
    )
    expect(result.docSync?.success).toBe(true)
    expect(result.docSync?.filesChanged).toBe(5)
  })

  it('should handle missing SYNC-REPORT.md file', async () => {
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(0)
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    // Mock file not found error
    const fileNotFoundError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    vi.mocked(readFile).mockRejectedValue(fileNotFoundError)

    const result = await docSyncNode(mockState)

    expect(result.docSync).toBeDefined()
    expect(result.docSync?.success).toBe(false)
    expect(result.docSync?.errors.length).toBeGreaterThan(0)
    expect(result.docSync?.errors[0]).toContain('SYNC-REPORT.md not found')
    expect(logger.error).toHaveBeenCalled()
  })

  it('should handle subprocess failure (non-zero exit code)', async () => {
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler('Error: Command failed')
          }
        }),
      },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(2) // Exit code 2 = error
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    const result = await docSyncNode(mockState)

    expect(result.docSync).toBeDefined()
    expect(result.docSync?.success).toBe(false)
    expect(result.docSync?.errors.length).toBeGreaterThan(0)
    expect(result.docSync?.errors[0]).toContain('exit code 2')
  })

  it('should handle malformed SYNC-REPORT.md with missing sections', async () => {
    const reportContent = `
# Documentation Sync Report

Some content but missing structured sections.
`

    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(0)
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    vi.mocked(readFile).mockResolvedValue(reportContent as never)

    const result = await docSyncNode(mockState)

    expect(result.docSync).toBeDefined()
    expect(result.docSync?.success).toBe(true)
    // Missing sections should default to 0
    expect(result.docSync?.filesChanged).toBe(0)
    expect(result.docSync?.sectionsUpdated).toBe(0)
    expect(result.docSync?.diagramsRegenerated).toBe(0)
    expect(result.docSync?.manualReviewNeeded).toBe(0)
    expect(result.docSync?.changelogDrafted).toBe(false)
    // Should log warnings for missing sections
    expect(logger.warn).toHaveBeenCalled()
  })

  it('should handle SYNC-REPORT.md with partial counts', async () => {
    const reportContent = `
# Documentation Sync Report

## Summary

- Total files changed: 4
- Total sections updated: 2
(missing diagrams section)
- Manual review items: 1

## Changelog Entry

**Status:** [APPLIED]
`

    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(0)
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    vi.mocked(readFile).mockResolvedValue(reportContent as never)

    const result = await docSyncNode(mockState)

    expect(result.docSync).toBeDefined()
    expect(result.docSync?.filesChanged).toBe(4)
    expect(result.docSync?.sectionsUpdated).toBe(2)
    expect(result.docSync?.diagramsRegenerated).toBe(0) // Missing, defaults to 0
    expect(result.docSync?.manualReviewNeeded).toBe(1)
    expect(result.docSync?.changelogDrafted).toBe(false) // APPLIED != DRAFT
  })

  it('should handle subprocess spawn error', async () => {
    // Mock spawn to throw error
    vi.mocked(spawn).mockImplementation(() => {
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Failed to spawn process'))
          }
        }),
      }
      return mockChild as never
    })

    const result = await docSyncNode(mockState)

    expect(result.docSync).toBeDefined()
    expect(result.docSync?.success).toBe(false)
    expect(result.docSync?.errors.length).toBeGreaterThan(0)
    expect(result.docSync?.errors[0]).toContain('Failed to spawn')
  })

  it('should use custom working directory and report path', async () => {
    const customWorkingDir = '/custom/working/dir'
    const customReportPath = '/custom/report/SYNC-REPORT.md'

    const reportContent = `
## Summary
- Total files changed: 1
- Total sections updated: 1
- Total diagrams regenerated: 0
- Manual review items: 0
`

    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(0)
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    vi.mocked(readFile).mockResolvedValue(reportContent as never)

    const customNode = createDocSyncNode({
      workingDir: customWorkingDir,
      reportPath: customReportPath,
    })
    const result = await customNode(mockState)

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      ['doc-sync'],
      expect.objectContaining({ cwd: customWorkingDir }),
    )
    expect(readFile).toHaveBeenCalledWith(customReportPath, 'utf-8')
    expect(result.docSync?.reportPath).toBe(customReportPath)
  })

  it('should preserve graph state immutability', async () => {
    const reportContent = `
## Summary
- Total files changed: 1
- Total sections updated: 0
- Total diagrams regenerated: 0
- Manual review items: 0
`

    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, handler) => {
        if (event === 'close') {
          handler(0)
        }
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as never)

    vi.mocked(readFile).mockResolvedValue(reportContent as never)

    const originalState: GraphState = {
      storyId: 'TEST-002',
      metadata: { key: 'value' },
    }

    const result = await docSyncNode(originalState)

    // Original state should not be mutated
    expect(originalState.docSync).toBeUndefined()
    expect(originalState.metadata).toEqual({ key: 'value' })

    // Result should include doc-sync data
    expect(result.docSync).toBeDefined()
    expect(result.docSync?.filesChanged).toBe(1)
  })
})
