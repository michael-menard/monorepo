/**
 * Tests for parseSeedYaml parser
 *
 * @see KNOW-006 AC1, AC7, AC8 for parser requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseSeedYaml,
  parseSeedYamlSimple,
  YamlParseError,
  ValidationError,
  DuplicateIdError,
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

describe('parseSeedYaml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Happy Path', () => {
    it('should parse valid YAML with single entry', () => {
      const yaml = `
- id: test-001
  content: "Test knowledge content"
  entry_type: fact
  roles: [dev]
  tags: [testing, example]
`
      const result = parseSeedYaml(yaml, 'test.yaml')

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0]).toMatchObject({
        content: 'Test knowledge content',
        role: 'dev',
        source_file: 'test.yaml',
      })
      expect(result.entries[0].tags).toContain('type:fact')
      expect(result.entries[0].tags).toContain('testing')
      expect(result.entries[0].tags).toContain('example')
      expect(result.warnings).toHaveLength(0)
      expect(result.raw_entry_count).toBe(1)
    })

    it('should expand multi-role entries into separate entries', () => {
      const yaml = `
- id: multi-role
  content: "Applies to dev and pm"
  roles: [dev, pm]
  tags: []
`
      const result = parseSeedYaml(yaml)

      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].role).toBe('dev')
      expect(result.entries[1].role).toBe('pm')
      expect(result.entries[0].content).toBe(result.entries[1].content)
      expect(result.raw_entry_count).toBe(1)
    })

    it('should map entry_type to tag with type: prefix', () => {
      const yaml = `
- content: "Entry type mapping test"
  entry_type: summary
  roles: [all]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries[0].tags).toContain('type:summary')
    })

    it('should handle entries without optional fields', () => {
      const yaml = `
- content: "Minimal entry"
  roles: [qa]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0]).toMatchObject({
        content: 'Minimal entry',
        role: 'qa',
      })
    })

    it('should parse multiple entries', () => {
      const yaml = `
- content: "Entry 1"
  roles: [dev]
- content: "Entry 2"
  roles: [pm]
- content: "Entry 3"
  roles: [qa]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries).toHaveLength(3)
      expect(result.raw_entry_count).toBe(3)
    })

    it('should handle multi-line content strings', () => {
      const yaml = `
- content: |
    This is a multi-line
    content string that
    spans multiple lines.
  roles: [dev]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries[0].content).toContain('multi-line')
      expect(result.entries[0].content).toContain('spans multiple lines')
    })

    it('should handle special characters in content', () => {
      const yaml = `
- content: 'Code example: const x = "hello"; // Comment'
  roles: [dev]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries[0].content).toContain('const x = "hello"')
    })
  })

  describe('Error Cases', () => {
    it('should throw YamlParseError for malformed YAML', () => {
      const malformedYaml = `
- content: "test
  roles: [dev]
`
      expect(() => parseSeedYaml(malformedYaml)).toThrow(YamlParseError)
    })

    it('should throw ValidationError for missing content field', () => {
      const yaml = `
- id: missing-content
  roles: [dev]
  tags: []
`
      expect(() => parseSeedYaml(yaml)).toThrow(ValidationError)
      expect(() => parseSeedYaml(yaml)).toThrow(/content/i)
    })

    it('should throw ValidationError for missing roles field', () => {
      const yaml = `
- content: "Test content"
  tags: []
`
      expect(() => parseSeedYaml(yaml)).toThrow(ValidationError)
    })

    it('should throw ValidationError for invalid role value', () => {
      const yaml = `
- content: "Test content"
  roles: [admin]
`
      expect(() => parseSeedYaml(yaml)).toThrow(ValidationError)
    })

    it('should throw DuplicateIdError for duplicate IDs', () => {
      const yaml = `
- id: dup-001
  content: "First entry"
  roles: [dev]
- id: dup-001
  content: "Second entry"
  roles: [dev]
`
      expect(() => parseSeedYaml(yaml)).toThrow(DuplicateIdError)
      try {
        parseSeedYaml(yaml)
      } catch (error) {
        expect(error).toBeInstanceOf(DuplicateIdError)
        expect((error as DuplicateIdError).duplicateIds).toContain('dup-001')
      }
    })

    it('should throw FileSizeLimitError for files exceeding 1MB', () => {
      const largeContent = 'x'.repeat(MAX_FILE_SIZE_BYTES + 100)
      expect(() => parseSeedYaml(largeContent)).toThrow(FileSizeLimitError)
    })

    it('should throw YamlParseError for non-array root', () => {
      const yaml = `
content: "Not an array"
roles: [dev]
`
      expect(() => parseSeedYaml(yaml)).toThrow(YamlParseError)
      expect(() => parseSeedYaml(yaml)).toThrow(/array/i)
    })
  })

  describe('Security (AC7)', () => {
    it('should reject YAML with custom tags', () => {
      // js-yaml with JSON_SCHEMA doesn't support custom tags
      const yaml = `
- content: !!python/object:__main__.Test {}
  roles: [dev]
`
      // Should either throw or parse as string (not execute)
      expect(() => parseSeedYaml(yaml)).toThrow()
    })

    it('should sanitize control characters from content', () => {
      const yaml = `
- content: "Text with control \\x00 characters \\x1F"
  roles: [dev]
`
      // The control chars are escaped in YAML, but actual raw control chars would be stripped
      const result = parseSeedYaml(yaml)
      expect(result.entries[0].content).not.toContain('\x00')
    })
  })

  describe('Edge Cases', () => {
    it('should return empty array for empty YAML file', () => {
      const result = parseSeedYaml('')

      expect(result.entries).toHaveLength(0)
      expect(result.raw_entry_count).toBe(0)
    })

    it('should return empty array for YAML with only comments', () => {
      const yaml = `# This is a comment
# Another comment
`
      const result = parseSeedYaml(yaml)

      expect(result.entries).toHaveLength(0)
    })

    it('should handle empty tags array', () => {
      const yaml = `
- content: "Entry with empty tags"
  roles: [dev]
  tags: []
`
      const result = parseSeedYaml(yaml)

      // With empty tags array, may have no tags or undefined
      expect(result.entries[0]).toBeDefined()
      expect(result.entries[0].content).toBe('Entry with empty tags')
    })

    it('should handle omitted tags', () => {
      const yaml = `
- content: "Entry without tags"
  roles: [dev]
`
      const result = parseSeedYaml(yaml)
      expect(result.entries[0]).toBeDefined()
      expect(result.entries[0].content).toBe('Entry without tags')
    })

    it('should truncate tags to max 50', () => {
      const tags = Array.from({ length: 60 }, (_, i) => `tag${i}`)
      const yaml = `
- content: "Many tags"
  roles: [dev]
  tags: [${tags.join(', ')}]
`
      const result = parseSeedYaml(yaml)

      // Should have at most 50 tags
      expect(result.entries[0].tags?.length).toBeLessThanOrEqual(50)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should skip invalid tags with warning', () => {
      const yaml = `
- content: "Entry with invalid tag"
  roles: [dev]
  tags: ["valid-tag", "invalid tag with spaces", "another-valid"]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries[0].tags).toContain('valid-tag')
      expect(result.entries[0].tags).toContain('another-valid')
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle unicode content', () => {
      const yaml = `
- content: "Unicode test: \u00e9\u00e0\u00fc \u4e2d\u6587 \u{1F600}"
  roles: [all]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries[0].content).toContain('\u00e9')
    })

    it('should handle large content (15k chars)', () => {
      const largeContent = 'A'.repeat(15000)
      const yaml = `
- content: "${largeContent}"
  roles: [dev]
`
      const result = parseSeedYaml(yaml)

      expect(result.entries[0].content.length).toBe(15000)
    })
  })

  describe('parseSeedYamlSimple', () => {
    it('should return flat array without metadata', () => {
      const yaml = `
- content: "Test"
  roles: [dev]
`
      const entries = parseSeedYamlSimple(yaml)

      expect(Array.isArray(entries)).toBe(true)
      expect(entries).toHaveLength(1)
      expect(entries[0].content).toBe('Test')
    })
  })
})
