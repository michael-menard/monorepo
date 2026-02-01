/**
 * Lessons Parser Tests
 *
 * @see KNOW-043 AC1, AC2 for parsing requirements
 */

import { describe, it, expect } from 'vitest'
import {
  parseLessonsFile,
  parseAlternativeFormat,
  smartParseLessonsFile,
  PATTERNS,
} from '../lessons-parser.js'
import { lessonToKbEntry, generateContentHash } from '../__types__/index.js'

describe('PATTERNS', () => {
  describe('storyHeading', () => {
    it('matches STORY-XXX format', () => {
      const match = '## STORY-007: Gallery - Images Read'.match(PATTERNS.storyHeading)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('STORY-007')
      expect(match?.[2]).toBe('Gallery - Images Read')
    })

    it('matches WRKF-XXXX format', () => {
      const match = '## WRKF-1000: Package Scaffolding'.match(PATTERNS.storyHeading)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('WRKF-1000')
      expect(match?.[2]).toBe('Package Scaffolding')
    })

    it('matches KNOW-XXX format', () => {
      const match = '## KNOW-001 - Package Infrastructure Setup'.match(PATTERNS.storyHeading)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('KNOW-001')
    })

    it('handles heading without title', () => {
      const match = '## STORY-123'.match(PATTERNS.storyHeading)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('STORY-123')
      expect(match?.[2]).toBeUndefined()
    })
  })

  describe('dateLine', () => {
    it('matches ISO date format', () => {
      const match = 'Date: 2026-01-25'.match(PATTERNS.dateLine)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('2026-01-25')
    })
  })

  describe('categoryHeading', () => {
    it('matches category headings', () => {
      const match = '### Reuse Discoveries'.match(PATTERNS.categoryHeading)
      expect(match).toBeTruthy()
      expect(match?.[1]).toBe('Reuse Discoveries')
    })
  })
})

describe('parseLessonsFile', () => {
  const sampleContent = `# Lessons Learned

This file captures implementation learnings.

---

## STORY-007: Gallery - Images Read
Date: 2026-01-19

### Reuse Discoveries
- **DI pattern for core functions**: The dependency injection pattern was highly reusable.
- **Discriminated union result types**: The success/failure pattern worked well.

### Blockers Hit
- **None**: This was a smooth implementation.

### Plan vs Reality
- Files planned: **17**
- Files actually touched: **18**

---

## STORY-008: Gallery - Images Write
Date: 2026-01-19

### Reuse Discoveries
- **S3 cleanup in adapter**: The cleanup pattern was validated.

### Blockers Hit
- **None**: Smooth implementation.

---
`

  it('parses story sections', () => {
    const result = parseLessonsFile(sampleContent, 'test.md')
    expect(result.story_count).toBe(2)
    expect(result.lessons.length).toBeGreaterThan(0)
  })

  it('extracts story IDs correctly', () => {
    const result = parseLessonsFile(sampleContent, 'test.md')
    const storyIds = new Set(result.lessons.map(l => l.story_id))
    expect(storyIds.has('STORY-007')).toBe(true)
    expect(storyIds.has('STORY-008')).toBe(true)
  })

  it('extracts dates correctly', () => {
    const result = parseLessonsFile(sampleContent, 'test.md')
    const datedLessons = result.lessons.filter(l => l.captured_date)
    expect(datedLessons.length).toBeGreaterThan(0)
    expect(datedLessons[0].captured_date).toBe('2026-01-19')
  })

  it('extracts category names', () => {
    const result = parseLessonsFile(sampleContent, 'test.md')
    const categories = new Set(result.lessons.map(l => l.category))
    expect(categories.has('Reuse Discoveries')).toBe(true)
    expect(categories.has('Blockers Hit')).toBe(true)
    expect(categories.has('Plan vs Reality')).toBe(true)
  })

  it('includes source file in lessons', () => {
    const result = parseLessonsFile(sampleContent, 'plans/LESSONS-LEARNED.md')
    for (const lesson of result.lessons) {
      expect(lesson.source_file).toBe('plans/LESSONS-LEARNED.md')
    }
  })

  it('handles empty content', () => {
    const result = parseLessonsFile('', 'empty.md')
    expect(result.lessons).toHaveLength(0)
    expect(result.story_count).toBe(0)
  })

  it('handles content without story sections', () => {
    const noStoryContent = `# Some Header

Just some text without story sections.
`
    const result = parseLessonsFile(noStoryContent, 'no-stories.md')
    expect(result.lessons).toHaveLength(0)
    // No warnings expected for very short content
  })
})

describe('parseAlternativeFormat', () => {
  const alternativeContent = `# Knowledge Base MCP Server - Lessons Learned

## What Went Well

1. **Drizzle Custom Types** - Using custom types worked seamlessly.
2. **Port Isolation Strategy** - Port 5433 avoided conflicts.

## Patterns Established

1. **MCP Server Package Structure** - The pattern is reusable.
2. **pgvector Integration** - Hybrid approach works well.

## Key Decisions Made

1. **Drizzle ORM Choice** - Provides type safety.
`

  it('parses sections without standard story format', () => {
    const result = parseAlternativeFormat(alternativeContent, 'KNOW-001/LESSONS-LEARNED.md')
    expect(result.lessons.length).toBeGreaterThan(0)
  })

  it('extracts section headings as categories', () => {
    const result = parseAlternativeFormat(alternativeContent, 'KNOW-001/LESSONS-LEARNED.md')
    const categories = new Set(result.lessons.map(l => l.category))
    expect(categories.has('What Went Well')).toBe(true)
    expect(categories.has('Patterns Established')).toBe(true)
  })
})

describe('smartParseLessonsFile', () => {
  it('uses standard format when it works', () => {
    const standardContent = `## STORY-001: Test
Date: 2026-01-01

### Reuse Discoveries
- Found something useful.
`
    const result = smartParseLessonsFile(standardContent, 'test.md')
    expect(result.lessons.length).toBeGreaterThan(0)
    expect(result.lessons[0].story_id).toBe('STORY-001')
  })

  it('falls back to alternative format', () => {
    const alternativeContent = `## What Went Well

Things went great with this approach.

## Patterns Established

New patterns were created.
`
    const result = smartParseLessonsFile(alternativeContent, 'KNOW-001/LESSONS.md')
    expect(result.lessons.length).toBeGreaterThan(0)
  })
})

describe('lessonToKbEntry', () => {
  it('converts lesson to KB entry format', () => {
    const lesson = {
      story_id: 'STORY-007',
      story_title: 'Test Story',
      captured_date: '2026-01-19',
      category: 'Reuse Discoveries',
      content: 'Found a useful pattern.',
      source_file: 'test.md',
    }

    const entry = lessonToKbEntry(lesson)

    expect(entry.content).toContain('STORY-007')
    expect(entry.content).toContain('Reuse Discoveries')
    expect(entry.content).toContain('Found a useful pattern')
    expect(entry.role).toBe('dev')
    expect(entry.tags).toContain('lesson-learned')
    expect(entry.tags).toContain('story:story-007')
    expect(entry.tags).toContain('category:reuse-discoveries')
    expect(entry.source_file).toBe('test.md')
  })

  it('includes date tag when available', () => {
    const lesson = {
      story_id: 'STORY-001',
      captured_date: '2026-01-15',
      category: 'Test',
      content: 'Content',
      source_file: 'test.md',
    }

    const entry = lessonToKbEntry(lesson)
    expect(entry.tags).toContain('date:2026-01')
  })

  it('handles missing optional fields', () => {
    const lesson = {
      story_id: 'STORY-001',
      category: 'Test',
      content: 'Content',
      source_file: 'test.md',
    }

    const entry = lessonToKbEntry(lesson)
    expect(entry.content).toBeDefined()
    expect(entry.tags).toContain('lesson-learned')
  })
})

describe('generateContentHash', () => {
  it('generates consistent hash for same content', () => {
    const content = 'Test content'
    const hash1 = generateContentHash(content)
    const hash2 = generateContentHash(content)
    expect(hash1).toBe(hash2)
  })

  it('normalizes whitespace before hashing', () => {
    const content1 = 'Test  content'
    const content2 = 'Test content'
    const hash1 = generateContentHash(content1)
    const hash2 = generateContentHash(content2)
    expect(hash1).toBe(hash2)
  })

  it('generates different hash for different content', () => {
    const hash1 = generateContentHash('Content A')
    const hash2 = generateContentHash('Content B')
    expect(hash1).not.toBe(hash2)
  })
})
