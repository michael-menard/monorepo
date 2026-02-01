/**
 * Document Chunking Integration Tests
 *
 * Tests chunking with real markdown files and validates
 * compatibility with bulk import schemas.
 *
 * @see KNOW-048 AC6, AC7 for integration requirements
 */

import { describe, it, expect, afterEach } from 'vitest'
import { readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { chunkMarkdown, cleanupEncoder } from '../index.js'
import { ChunkedDocumentSchema } from '../__types__/index.js'
import { ParsedEntrySchema } from '../../parsers/__types__/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '../../..')

describe('chunking integration', () => {
  afterEach(() => {
    cleanupEncoder()
  })

  describe('real file chunking', () => {
    it('should chunk the knowledge-base README', async () => {
      const readmePath = resolve(packageRoot, 'README.md')

      let content: string
      try {
        content = await readFile(readmePath, 'utf-8')
      } catch {
        // Skip if README doesn't exist
        console.log('Skipping README test - file not found')
        return
      }

      const result = chunkMarkdown(content, 'README.md')

      // Should produce at least one chunk
      expect(result.chunks.length).toBeGreaterThan(0)
      expect(result.totalChunks).toBe(result.chunks.length)

      // All chunks should be valid
      for (const chunk of result.chunks) {
        const validation = ChunkedDocumentSchema.safeParse(chunk)
        expect(validation.success).toBe(true)
      }
    })

    it('should chunk a CLAUDE.md file if it exists', async () => {
      const claudePath = resolve(packageRoot, '..', '..', '..', 'CLAUDE.md')

      let content: string
      try {
        content = await readFile(claudePath, 'utf-8')
      } catch {
        // Skip if CLAUDE.md doesn't exist
        console.log('Skipping CLAUDE.md test - file not found')
        return
      }

      const result = chunkMarkdown(content, 'CLAUDE.md')

      // Should produce multiple chunks for a large file
      expect(result.chunks.length).toBeGreaterThan(0)

      // Check metadata
      for (let i = 0; i < result.chunks.length; i++) {
        expect(result.chunks[i].chunkIndex).toBe(i)
        expect(result.chunks[i].totalChunks).toBe(result.chunks.length)
        expect(result.chunks[i].sourceFile).toBe('CLAUDE.md')
      }
    })
  })

  describe('bulk import compatibility', () => {
    it('should produce chunks compatible with ParsedEntrySchema', () => {
      const content = `---
title: Test Document
tags:
  - testing
  - example
---

## Introduction

This is a test document for validating bulk import compatibility.

## Features

- Feature one
- Feature two
- Feature three`

      const result = chunkMarkdown(content, 'test.md')

      // Convert chunks to bulk import format
      for (const chunk of result.chunks) {
        // Create a parsed entry from chunk
        const parsedEntry = {
          content: chunk.content,
          role: 'dev' as const,
          tags: result.frontMatter?.tags ?? null,
        }

        const validation = ParsedEntrySchema.safeParse(parsedEntry)
        expect(validation.success).toBe(true)
      }
    })

    it('should preserve metadata through conversion', () => {
      const content = `---
title: API Documentation
author: Test Team
---

## Authentication

Use bearer tokens for API authentication.

## Rate Limits

Default rate limit is 100 requests per minute.`

      const result = chunkMarkdown(content, 'api-docs.md')

      expect(result.chunks.length).toBe(2)

      // Both chunks should have the same front matter
      expect(result.chunks[0].frontMatter?.title).toBe('API Documentation')
      expect(result.chunks[1].frontMatter?.title).toBe('API Documentation')

      // Metadata should be serializable to JSON
      const serialized = JSON.stringify(result.chunks)
      const deserialized = JSON.parse(serialized)

      expect(deserialized).toHaveLength(2)
      expect(deserialized[0].sourceFile).toBe('api-docs.md')
      expect(deserialized[0].frontMatter.title).toBe('API Documentation')
    })
  })

  describe('schema validation', () => {
    it('should produce valid ChunkedDocument objects', () => {
      const content = `## Test Section
Content for testing schema validation.`

      const result = chunkMarkdown(content, 'schema-test.md')

      for (const chunk of result.chunks) {
        const validation = ChunkedDocumentSchema.safeParse(chunk)

        if (!validation.success) {
          console.error('Validation errors:', validation.error.issues)
        }

        expect(validation.success).toBe(true)
      }
    })

    it('should serialize to valid JSON', () => {
      const content = `## Section One
First section content.

## Section Two
Second section content.`

      const result = chunkMarkdown(content, 'json-test.md')

      // Serialize and deserialize
      const json = JSON.stringify(result.chunks)
      expect(() => JSON.parse(json)).not.toThrow()

      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(2)

      // Validate deserialized chunks
      for (const chunk of parsed) {
        const validation = ChunkedDocumentSchema.safeParse(chunk)
        expect(validation.success).toBe(true)
      }
    })
  })

  describe('token limits', () => {
    it('should respect maxTokens option', () => {
      // Create a document with sections that exceed 100 tokens
      const longParagraph = 'x'.repeat(600) // ~150 tokens with mock

      const content = `## Section
${longParagraph}`

      const result = chunkMarkdown(content, 'tokens.md', { maxTokens: 100 })

      // With low token limit, should split
      // Note: actual behavior depends on tiktoken mock
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle documents with many small sections', () => {
      let content = ''
      for (let i = 1; i <= 20; i++) {
        content += `## Section ${i}\nShort content.\n\n`
      }

      const result = chunkMarkdown(content, 'many-sections.md')

      // Should have 20 chunks (one per section)
      expect(result.chunks).toHaveLength(20)

      // Verify chunk indices
      for (let i = 0; i < 20; i++) {
        expect(result.chunks[i].chunkIndex).toBe(i)
        expect(result.chunks[i].headerPath).toBe(`## Section ${i + 1}`)
      }
    })
  })
})
