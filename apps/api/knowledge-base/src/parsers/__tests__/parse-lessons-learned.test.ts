/**
 * Tests for parseLessonsLearned parser
 *
 * @see KNOW-006 AC2 for parser requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseLessonsLearned,
  parseLessonsLearnedSimple,
  FileSizeLimitError,
  MAX_FILE_SIZE_BYTES,
} from '../index.js'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('parseLessonsLearned', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Happy Path', () => {
    it('should parse markdown with sections and bullet points', () => {
      const markdown = `# Knowledge Base - Lessons Learned

## KNOW-001 - Package Setup (2026-01-25)

### What Went Well
- Drizzle ORM worked seamlessly with pgvector
- Port isolation strategy prevented conflicts

### Patterns Established
- MCP Server Package Structure pattern established
`
      const result = parseLessonsLearned(markdown, 'LESSONS-LEARNED.md')

      expect(result.entries.length).toBeGreaterThan(0)
      expect(result.entries[0].content).toContain('Drizzle ORM')
      expect(result.entries[0].source_file).toBe('LESSONS-LEARNED.md')
    })

    it('should infer dev role from backend-related sections', () => {
      const markdown = `## Backend Patterns

### Implementation
- Use dependency injection for testability
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].role).toBe('dev')
    })

    it('should infer qa role from testing-related sections', () => {
      const markdown = `## Testing Strategies

### What Went Well
- Unit tests with Vitest provided fast feedback
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].role).toBe('qa')
    })

    it('should infer all role for documentation sections', () => {
      const markdown = `## Documentation Updates

### What Went Well
- README improvements helped onboarding
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].role).toBe('all')
    })

    it('should extract story reference from section header', () => {
      const markdown = `## KNOW-005 - Search Implementation

### Patterns
- Hybrid search combines vector and keyword
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].tags).toContain('story:know-005')
    })

    it('should add source tag for all entries', () => {
      const markdown = `## Test Section

### Subsection
- Learning point here
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].tags).toContain('source:lessons-learned')
    })
  })

  describe('Format Version Detection (AC15)', () => {
    it('should detect format version from marker', () => {
      const markdown = `<!-- format: v1.0 -->

## Section

### Subsection
- Content here
`
      const result = parseLessonsLearned(markdown)

      expect(result.format_version).toBe('1.0')
      // No warning for matching version
      expect(result.warnings.filter(w => w.includes('mismatch'))).toHaveLength(0)
    })

    it('should warn on format version mismatch', () => {
      const markdown = `<!-- format: v2.0 -->

## Section

### Subsection
- Content here
`
      const result = parseLessonsLearned(markdown)

      expect(result.format_version).toBe('2.0')
      expect(result.warnings.some(w => w.includes('mismatch'))).toBe(true)
    })

    it('should warn when no format version marker found', () => {
      const markdown = `## Section

### Subsection
- Content here
`
      const result = parseLessonsLearned(markdown)

      expect(result.format_version).toBeUndefined()
      expect(result.warnings.some(w => w.includes('No format version'))).toBe(true)
    })
  })

  describe('Code Block Handling', () => {
    it('should preserve code blocks in content', () => {
      const markdown = `## KNOW-002 - Embedding Client

### Patterns
- Use dependency injection pattern:
  \`\`\`typescript
  export interface GetImageDbClient {
    select: () => Promise<any>
  }
  \`\`\`
`
      const result = parseLessonsLearned(markdown)

      // Code blocks should be preserved
      const hasCodeBlock = result.entries.some(e => e.content.includes('```'))
      expect(hasCodeBlock).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should return empty array for empty markdown', () => {
      const result = parseLessonsLearned('')

      expect(result.entries).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return empty array for whitespace-only markdown', () => {
      const result = parseLessonsLearned('   \n\n\t\t\n   ')

      expect(result.entries).toHaveLength(0)
    })

    it('should handle markdown without ## sections', () => {
      const markdown = `# Title

Just some content without sections.

More content.
`
      const result = parseLessonsLearned(markdown)

      // Should not crash, may return empty or process differently
      expect(result).toBeDefined()
    })

    it('should handle nested lists by flattening', () => {
      const markdown = `## Section

### Subsection
- Top level bullet
  - Nested bullet (continuation)
- Another top level
`
      const result = parseLessonsLearned(markdown)

      // Should have entries
      expect(result.entries.length).toBeGreaterThan(0)
    })

    it('should skip very short bullets', () => {
      const markdown = `## Section

### Subsection
- Short
- This is a valid learning point with enough content
`
      const result = parseLessonsLearned(markdown)

      // Should skip "Short" (< 10 chars)
      expect(result.entries.every(e => e.content.length >= 10)).toBe(true)
    })

    it('should handle unicode content', () => {
      const markdown = `## Unicode Section

### Points
- Learning with unicode: \u00e9\u00e0\u00fc and emoji \u{1F600}
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].content).toContain('\u00e9')
    })

    it('should throw FileSizeLimitError for files exceeding 1MB', () => {
      const largeContent = 'x'.repeat(MAX_FILE_SIZE_BYTES + 100)
      expect(() => parseLessonsLearned(largeContent)).toThrow(FileSizeLimitError)
    })
  })

  describe('Tag Inference', () => {
    it('should infer tokens tag from content', () => {
      const markdown = `## Token Optimization

### What Went Well
- Reduced token cost by using grep instead of full file reads
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].tags).toContain('tokens')
    })

    it('should infer testing tag from content', () => {
      const markdown = `## Quality Section

### Patterns
- Vitest provides fast test feedback loop
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].tags).toContain('testing')
    })

    it('should add subsection header as tag', () => {
      const markdown = `## Section

### Key Decisions Made
- Decision point content here with explanation
`
      const result = parseLessonsLearned(markdown)

      expect(result.entries[0].tags).toContain('key-decisions-made')
    })
  })

  describe('Multiple Sections', () => {
    it('should parse multiple sections with different roles', () => {
      const markdown = `## Backend Implementation

### Patterns
- Backend pattern for dependency injection

## Testing Strategy

### What Went Well
- Testing strategy for coverage

## Product Requirements

### Decisions
- PM decision about scope and features
`
      const result = parseLessonsLearned(markdown)

      const roles = result.entries.map(e => e.role)
      expect(roles).toContain('dev')
      expect(roles).toContain('qa')
    })
  })

  describe('parseLessonsLearnedSimple', () => {
    it('should return flat array without metadata', () => {
      const markdown = `## Section

### Subsection
- Learning point with sufficient content
`
      const entries = parseLessonsLearnedSimple(markdown)

      expect(Array.isArray(entries)).toBe(true)
      expect(entries.length).toBeGreaterThan(0)
    })
  })
})
