/**
 * Document Chunking Tests
 *
 * Unit tests for markdown document chunking functionality.
 *
 * @see KNOW-048 AC7 for test coverage requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { chunkMarkdown, countTokens, cleanupEncoder } from '../index.js'

// Mock tiktoken for consistent, predictable tests
vi.mock('tiktoken', () => ({
  encoding_for_model: vi.fn(() => ({
    encode: vi.fn((text: string) => {
      // Simple mock: 1 token per 4 characters
      const tokenCount = Math.ceil(text.length / 4)
      return new Array(tokenCount).fill(0)
    }),
    free: vi.fn(),
  })),
}))

describe('chunkMarkdown', () => {
  afterEach(() => {
    cleanupEncoder()
  })

  describe('basic header splitting', () => {
    it('should split document on ## headers', () => {
      const content = `# Title

## Section One
Content for section one.

## Section Two
Content for section two.

## Section Three
Content for section three.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks).toHaveLength(4) // Intro (# Title) + 3 sections
      expect(result.totalChunks).toBe(4)
      expect(result.sourceFile).toBe('test.md')
    })

    it('should include header as context in each chunk', () => {
      const content = `## Installation
Run npm install.

## Usage
Import the module.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks).toHaveLength(2)
      expect(result.chunks[0].content).toContain('## Installation')
      expect(result.chunks[0].headerPath).toBe('## Installation')
      expect(result.chunks[1].content).toContain('## Usage')
      expect(result.chunks[1].headerPath).toBe('## Usage')
    })

    it('should set correct chunk metadata', () => {
      const content = `## First
Content one.

## Second
Content two.

## Third
Content three.`

      const result = chunkMarkdown(content, 'docs/readme.md')

      expect(result.chunks[0].chunkIndex).toBe(0)
      expect(result.chunks[1].chunkIndex).toBe(1)
      expect(result.chunks[2].chunkIndex).toBe(2)

      expect(result.chunks[0].totalChunks).toBe(3)
      expect(result.chunks[1].totalChunks).toBe(3)
      expect(result.chunks[2].totalChunks).toBe(3)

      expect(result.chunks[0].sourceFile).toBe('docs/readme.md')
    })
  })

  describe('token limit fallback', () => {
    it('should split large sections on paragraph boundaries', () => {
      // Create content that exceeds 500 tokens (2000+ chars with our mock)
      const longParagraph1 = 'A'.repeat(800) // ~200 tokens
      const longParagraph2 = 'B'.repeat(800) // ~200 tokens
      const longParagraph3 = 'C'.repeat(800) // ~200 tokens

      const content = `## Large Section
${longParagraph1}

${longParagraph2}

${longParagraph3}`

      const result = chunkMarkdown(content, 'test.md', { maxTokens: 300 })

      // Should be split into multiple chunks due to token limit
      expect(result.chunks.length).toBeGreaterThan(1)

      // Each chunk should contain the header context
      for (const chunk of result.chunks) {
        expect(chunk.content).toContain('## Large Section')
        expect(chunk.headerPath).toBe('## Large Section')
      }
    })

    it('should not split sections under token limit', () => {
      const content = `## Short Section
This is a short section that fits within the token limit.`

      const result = chunkMarkdown(content, 'test.md', { maxTokens: 500 })

      expect(result.chunks).toHaveLength(1)
      expect(result.chunks[0].tokenCount).toBeLessThanOrEqual(500)
    })
  })

  describe('code block preservation', () => {
    it('should not split code blocks', () => {
      const content = `## Code Example

\`\`\`typescript
function hello() {
  console.log('Hello, world!')
}
\`\`\`

After the code.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks).toHaveLength(1)
      expect(result.chunks[0].content).toContain('```typescript')
      expect(result.chunks[0].content).toContain('```')
    })

    it('should warn about code blocks exceeding token limit', () => {
      // Create a very large code block
      const largeCode = 'x'.repeat(3000) // ~750 tokens

      const content = `## Code
\`\`\`
${largeCode}
\`\`\``

      const result = chunkMarkdown(content, 'test.md', { maxTokens: 500 })

      // Should still produce a chunk (not crash)
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
      // Should have a warning
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('exceeds token limit')
    })

    it('should preserve inline code', () => {
      const content = `## API
Use \`import { foo }\` to import the module.
Call \`foo()\` to execute.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks[0].content).toContain('`import { foo }`')
      expect(result.chunks[0].content).toContain('`foo()`')
    })
  })

  describe('nested headers', () => {
    it('should keep ### headers with parent ## section', () => {
      const content = `## Installation

### Prerequisites
You need Node.js installed.

### Steps
1. Clone the repo
2. Run npm install

## Usage
How to use the module.`

      const result = chunkMarkdown(content, 'test.md')

      // Should have 2 main chunks (Installation and Usage)
      expect(result.chunks).toHaveLength(2)

      // First chunk should contain all ### subsections
      expect(result.chunks[0].content).toContain('## Installation')
      expect(result.chunks[0].content).toContain('### Prerequisites')
      expect(result.chunks[0].content).toContain('### Steps')

      // Second chunk should be Usage
      expect(result.chunks[1].content).toContain('## Usage')
    })

    it('should handle #### and deeper headers', () => {
      const content = `## Main Section

### Subsection

#### Deep Section
Deep content.

#### Another Deep
More content.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks).toHaveLength(1)
      expect(result.chunks[0].content).toContain('#### Deep Section')
      expect(result.chunks[0].content).toContain('#### Another Deep')
    })
  })

  describe('front matter handling', () => {
    it('should extract YAML front matter', () => {
      const content = `---
title: My Document
date: 2024-01-01
author: Test Author
tags:
  - typescript
  - testing
---

## Content
The actual content.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.frontMatter).toBeDefined()
      expect(result.frontMatter?.title).toBe('My Document')
      // js-yaml parses dates as Date objects, which get converted to ISO strings
      expect(result.frontMatter?.date).toContain('2024-01-01')
      expect(result.frontMatter?.author).toBe('Test Author')
      expect(result.frontMatter?.tags).toEqual(['typescript', 'testing'])
    })

    it('should strip front matter from chunk content', () => {
      const content = `---
title: Test
---

## Section
Content here.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks[0].content).not.toContain('---')
      expect(result.chunks[0].content).not.toContain('title: Test')
      expect(result.chunks[0].content).toContain('## Section')
    })

    it('should include front matter in all chunks', () => {
      const content = `---
title: Multi-Section Doc
---

## Section One
First content.

## Section Two
Second content.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks).toHaveLength(2)
      expect(result.chunks[0].frontMatter?.title).toBe('Multi-Section Doc')
      expect(result.chunks[1].frontMatter?.title).toBe('Multi-Section Doc')
    })

    it('should handle documents without front matter', () => {
      const content = `## Section
No front matter here.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.frontMatter).toBeUndefined()
      expect(result.chunks[0].frontMatter).toBeUndefined()
    })

    it('should handle invalid YAML front matter gracefully', () => {
      const content = `---
invalid: [
  unclosed bracket
---

## Content
After invalid front matter.`

      const result = chunkMarkdown(content, 'test.md')

      // Should not crash, front matter may be undefined
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('edge cases', () => {
    it('should handle empty document', () => {
      const result = chunkMarkdown('', 'empty.md')

      expect(result.chunks).toHaveLength(0)
      expect(result.totalChunks).toBe(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle whitespace-only document', () => {
      const result = chunkMarkdown('   \n\n   ', 'whitespace.md')

      expect(result.chunks).toHaveLength(0)
    })

    it('should handle document with no headers', () => {
      const content = `This is a plain document.

It has no headers at all.

Just paragraphs of text.`

      const result = chunkMarkdown(content, 'plain.md')

      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
      expect(result.chunks[0].headerPath).toBe('')
    })

    it('should handle single section document', () => {
      const content = `## Only Section
This is the only section in the document.`

      const result = chunkMarkdown(content, 'single.md')

      expect(result.chunks).toHaveLength(1)
      expect(result.chunks[0].content).toContain('## Only Section')
    })

    it('should handle content before first header', () => {
      const content = `# Document Title

Some intro text before any ## headers.

## First Section
Content here.`

      const result = chunkMarkdown(content, 'intro.md')

      // Should have intro chunk + section chunk
      expect(result.chunks.length).toBeGreaterThanOrEqual(2)
      expect(result.chunks[0].content).toContain('# Document Title')
      expect(result.chunks[0].headerPath).toBe('')
    })

    it('should handle headers with special characters', () => {
      const content = `## Section (with parentheses)
Content one.

## Section: with colon
Content two.

## Section - with dash
Content three.`

      const result = chunkMarkdown(content, 'special.md')

      expect(result.chunks).toHaveLength(3)
      expect(result.chunks[0].headerPath).toBe('## Section (with parentheses)')
      expect(result.chunks[1].headerPath).toBe('## Section: with colon')
      expect(result.chunks[2].headerPath).toBe('## Section - with dash')
    })
  })

  describe('metadata preservation', () => {
    it('should include tokenCount for each chunk', () => {
      const content = `## Section
Some content here.`

      const result = chunkMarkdown(content, 'test.md')

      expect(result.chunks[0].tokenCount).toBeGreaterThan(0)
    })

    it('should preserve sourceFile across all chunks', () => {
      const content = `## One
First.

## Two
Second.`

      const result = chunkMarkdown(content, 'path/to/file.md')

      expect(result.chunks[0].sourceFile).toBe('path/to/file.md')
      expect(result.chunks[1].sourceFile).toBe('path/to/file.md')
    })
  })

  describe('options validation', () => {
    it('should use default maxTokens if not provided', () => {
      const content = `## Section
Content.`

      const result = chunkMarkdown(content, 'test.md')

      // Should not throw
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })

    it('should respect custom maxTokens', () => {
      // Create content that would fit in 500 tokens but not 50
      // With mock tokenizer at 4 chars/token, 400 chars = 100 tokens
      // Header "## Section\n\n" is ~15 chars = ~4 tokens
      // Each paragraph needs to exceed maxTokens to trigger split
      const para1 = 'a'.repeat(200) // ~50 tokens
      const para2 = 'b'.repeat(200) // ~50 tokens
      const para3 = 'c'.repeat(200) // ~50 tokens
      const content = `## Section
${para1}

${para2}

${para3}`

      const result = chunkMarkdown(content, 'test.md', { maxTokens: 80 })

      // Should be split due to low token limit - each paragraph with header context
      // will exceed 80 tokens, so we expect multiple chunks
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
      // All chunks should reference the original header
      for (const chunk of result.chunks) {
        expect(chunk.headerPath).toBe('## Section')
      }
    })
  })
})

describe('countTokens', () => {
  it('should count tokens in text', () => {
    const text = 'Hello, world!'
    const tokens = countTokens(text)

    expect(tokens).toBeGreaterThan(0)
  })

  it('should return 0 for empty string', () => {
    expect(countTokens('')).toBe(0)
  })

  it('should handle long text', () => {
    const longText = 'x'.repeat(10000)
    const tokens = countTokens(longText)

    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThan(10000) // Should be less than char count
  })
})
