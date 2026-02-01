import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../../state/index.js'
import {
  extractListItems,
  findBaselineFiles,
  loadMostRecentBaseline,
  parseBaselineFile,
  parseMarkdownSections,
  type BaselineRealitySection,
} from '../load-baseline.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock fs module
vi.mock('node:fs/promises')

describe('parseMarkdownSections', () => {
  it('parses simple markdown with sections', () => {
    const content = `# Title

## Section One

Content for section one.

## Section Two

Content for section two.
`
    const sections = parseMarkdownSections(content)

    expect(sections).toHaveLength(3)
    expect(sections[0].heading).toBe('Title')
    expect(sections[1].heading).toBe('Section One')
    expect(sections[1].content).toBe('Content for section one.')
    expect(sections[2].heading).toBe('Section Two')
    expect(sections[2].content).toBe('Content for section two.')
  })

  it('handles empty content', () => {
    const sections = parseMarkdownSections('')
    expect(sections).toHaveLength(0)
  })

  it('handles content with no sections', () => {
    const content = `Just some text
without any headings.`
    const sections = parseMarkdownSections(content)
    expect(sections).toHaveLength(0)
  })

  it('handles multiple heading levels', () => {
    const content = `# Main Title

## Sub Section

### Sub Sub Section

Content here.
`
    const sections = parseMarkdownSections(content)

    expect(sections).toHaveLength(3)
    expect(sections[0].heading).toBe('Main Title')
    expect(sections[1].heading).toBe('Sub Section')
    expect(sections[2].heading).toBe('Sub Sub Section')
  })
})

describe('extractListItems', () => {
  it('extracts list items with dashes', () => {
    const section: BaselineRealitySection = {
      heading: 'Test',
      content: `- Item one
- Item two
- Item three`,
    }

    const items = extractListItems(section)

    expect(items).toEqual(['Item one', 'Item two', 'Item three'])
  })

  it('extracts list items with asterisks', () => {
    const section: BaselineRealitySection = {
      heading: 'Test',
      content: `* Item A
* Item B`,
    }

    const items = extractListItems(section)

    expect(items).toEqual(['Item A', 'Item B'])
  })

  it('returns empty array for content without lists', () => {
    const section: BaselineRealitySection = {
      heading: 'Test',
      content: 'Just some text without lists.',
    }

    const items = extractListItems(section)

    expect(items).toEqual([])
  })

  it('handles mixed content', () => {
    const section: BaselineRealitySection = {
      heading: 'Test',
      content: `Some intro text.

- First item
- Second item

Some outro text.`,
    }

    const items = extractListItems(section)

    expect(items).toEqual(['First item', 'Second item'])
  })
})

describe('findBaselineFiles', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('finds and sorts baseline files by date descending', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'BASELINE-REALITY-2025-01-15.md', isFile: () => true },
      { name: 'BASELINE-REALITY-2025-01-20.md', isFile: () => true },
      { name: 'BASELINE-REALITY-2025-01-10.md', isFile: () => true },
      { name: 'other-file.md', isFile: () => true },
      { name: 'subdir', isFile: () => false },
    ] as unknown as ReturnType<typeof fs.readdir>)

    const files = await findBaselineFiles('/test/baselines')

    expect(files).toEqual([
      { filename: 'BASELINE-REALITY-2025-01-20.md', date: '2025-01-20' },
      { filename: 'BASELINE-REALITY-2025-01-15.md', date: '2025-01-15' },
      { filename: 'BASELINE-REALITY-2025-01-10.md', date: '2025-01-10' },
    ])
  })

  it('returns empty array for non-existent directory', async () => {
    const error = new Error('ENOENT') as NodeJS.ErrnoException
    error.code = 'ENOENT'
    vi.mocked(fs.readdir).mockRejectedValue(error)

    const files = await findBaselineFiles('/non/existent')

    expect(files).toEqual([])
  })

  it('throws other errors', async () => {
    const error = new Error('Permission denied') as NodeJS.ErrnoException
    error.code = 'EACCES'
    vi.mocked(fs.readdir).mockRejectedValue(error)

    await expect(findBaselineFiles('/forbidden')).rejects.toThrow('Permission denied')
  })
})

describe('parseBaselineFile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('parses a complete baseline file', async () => {
    const content = `# Baseline Reality

## What Exists

- Package A is implemented
- Package B is tested

## What In Progress

- Feature C is being developed
- Feature D is in review

## Invalid Assumptions

- Assumption 1 was wrong
- Assumption 2 needs revision

## No Rework

- Module X should not be touched
- Module Y is stable
`
    vi.mocked(fs.readFile).mockResolvedValue(content)

    const baseline = await parseBaselineFile('/test/BASELINE-REALITY-2025-01-20.md', '2025-01-20')

    expect(baseline.date).toBe('2025-01-20')
    expect(baseline.filePath).toBe('/test/BASELINE-REALITY-2025-01-20.md')
    expect(baseline.rawContent).toBe(content)
    expect(baseline.whatExists).toEqual(['Package A is implemented', 'Package B is tested'])
    expect(baseline.whatInProgress).toEqual([
      'Feature C is being developed',
      'Feature D is in review',
    ])
    expect(baseline.invalidAssumptions).toEqual([
      'Assumption 1 was wrong',
      'Assumption 2 needs revision',
    ])
    expect(baseline.noRework).toEqual(['Module X should not be touched', 'Module Y is stable'])
  })

  it('handles partial baseline files', async () => {
    const content = `# Baseline Reality

## What Exists

- Only this section
`
    vi.mocked(fs.readFile).mockResolvedValue(content)

    const baseline = await parseBaselineFile('/test/BASELINE-REALITY-2025-01-20.md', '2025-01-20')

    expect(baseline.whatExists).toEqual(['Only this section'])
    expect(baseline.whatInProgress).toBeUndefined()
    expect(baseline.invalidAssumptions).toBeUndefined()
    expect(baseline.noRework).toBeUndefined()
  })

  it('handles section name variations', async () => {
    const content = `# Baseline

## Exists Today

- Item exists

## In-Progress Work

- Item in progress

## Invalid Assumptions Made

- Wrong assumption
`
    vi.mocked(fs.readFile).mockResolvedValue(content)

    const baseline = await parseBaselineFile('/test/BASELINE-REALITY-2025-01-20.md', '2025-01-20')

    expect(baseline.whatExists).toEqual(['Item exists'])
    expect(baseline.whatInProgress).toEqual(['Item in progress'])
    expect(baseline.invalidAssumptions).toEqual(['Wrong assumption'])
  })
})

describe('loadMostRecentBaseline', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads the most recent baseline file', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'BASELINE-REALITY-2025-01-15.md', isFile: () => true },
      { name: 'BASELINE-REALITY-2025-01-20.md', isFile: () => true },
    ] as unknown as ReturnType<typeof fs.readdir>)

    const content = `# Baseline

## What Exists

- Latest baseline content
`
    vi.mocked(fs.readFile).mockResolvedValue(content)

    const result = await loadMostRecentBaseline({
      baselinesDir: '/test/baselines',
    })

    expect(result.loaded).toBe(true)
    expect(result.baseline).not.toBeNull()
    expect(result.baseline?.date).toBe('2025-01-20')
    expect(result.baseline?.whatExists).toEqual(['Latest baseline content'])
  })

  it('returns loaded: false when no baselines exist and not required', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as ReturnType<typeof fs.readdir>)

    const result = await loadMostRecentBaseline({
      baselinesDir: '/test/baselines',
      requireBaseline: false,
    })

    expect(result.loaded).toBe(false)
    expect(result.baseline).toBeNull()
    expect(result.error).toBeUndefined()
  })

  it('returns error when baseline required but not found', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as ReturnType<typeof fs.readdir>)

    const result = await loadMostRecentBaseline({
      baselinesDir: '/test/baselines',
      requireBaseline: true,
    })

    expect(result.loaded).toBe(false)
    expect(result.baseline).toBeNull()
    expect(result.error).toContain('No baseline reality files found')
  })

  it('resolves relative path with project root', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'BASELINE-REALITY-2025-01-20.md', isFile: () => true },
    ] as unknown as ReturnType<typeof fs.readdir>)

    const content = `# Baseline\n`
    vi.mocked(fs.readFile).mockResolvedValue(content)

    await loadMostRecentBaseline({
      baselinesDir: 'plans/baselines',
      projectRoot: '/my/project',
    })

    expect(fs.readdir).toHaveBeenCalledWith(
      path.join('/my/project', 'plans/baselines'),
      expect.any(Object),
    )
  })

  it('handles parse errors gracefully when not required', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'BASELINE-REALITY-2025-01-20.md', isFile: () => true },
    ] as unknown as ReturnType<typeof fs.readdir>)

    vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'))

    const result = await loadMostRecentBaseline({
      baselinesDir: '/test/baselines',
      requireBaseline: false,
    })

    expect(result.loaded).toBe(false)
    expect(result.baseline).toBeNull()
  })

  it('returns error for parse failures when required', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'BASELINE-REALITY-2025-01-20.md', isFile: () => true },
    ] as unknown as ReturnType<typeof fs.readdir>)

    vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'))

    const result = await loadMostRecentBaseline({
      baselinesDir: '/test/baselines',
      requireBaseline: true,
    })

    expect(result.loaded).toBe(false)
    expect(result.error).toContain('Failed to parse baseline file')
  })
})

describe('loadBaselineRealityNode integration', () => {
  // Note: Full node integration tests would require more setup.
  // These tests focus on the core logic.

  it('creates valid initial state for testing', () => {
    const state = createInitialState({ epicPrefix: 'flow', storyId: 'flow-021' })

    expect(state.epicPrefix).toBe('flow')
    expect(state.storyId).toBe('flow-021')
  })
})
