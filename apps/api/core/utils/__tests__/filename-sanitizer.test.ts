/**
 * Filename Sanitizer Tests
 *
 * Story 3.1.22: Filename & Content Hardening
 *
 * Tests for:
 * - Control character stripping
 * - Windows reserved name blocking
 * - Length limiting
 * - Unicode normalization
 * - Extension preservation
 * - Unsafe character replacement
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeFilename,
  sanitizeFilenameForS3,
  validateFilename,
  isWindowsReservedName,
  extractExtension,
  stripControlCharacters,
  normalizeUnicode,
  replaceUnsafeCharacters,
} from '../filename-sanitizer'

describe('filename-sanitizer', () => {
  describe('sanitizeFilename', () => {
    describe('basic sanitization', () => {
      it('should preserve valid filenames', () => {
        const result = sanitizeFilename('my-file.pdf')
        expect(result.sanitized).toBe('my-file.pdf')
        expect(result.wasModified).toBe(false)
        expect(result.extension).toBe('pdf')
        expect(result.warnings).toHaveLength(0)
      })

      it('should convert to lowercase by default', () => {
        const result = sanitizeFilename('MyFile.PDF')
        expect(result.sanitized).toBe('myfile.pdf')
        expect(result.wasModified).toBe(true)
        expect(result.extension).toBe('pdf')
      })

      it('should preserve case when configured', () => {
        const result = sanitizeFilename('MyFile.PDF', { lowercase: false })
        expect(result.sanitized).toBe('MyFile.PDF')
        expect(result.wasModified).toBe(false)
      })

      it('should handle filenames without extensions', () => {
        const result = sanitizeFilename('readme')
        expect(result.sanitized).toBe('readme')
        expect(result.extension).toBeNull()
      })

      it('should handle hidden files (dot prefix)', () => {
        const result = sanitizeFilename('.gitignore')
        expect(result.sanitized).toBe('.gitignore')
        expect(result.extension).toBeNull() // Leading dot is not extension
      })
    })

    describe('control character handling', () => {
      it('should strip null bytes', () => {
        const result = sanitizeFilename('file\x00name.pdf')
        expect(result.sanitized).toBe('filename.pdf')
        expect(result.warnings).toContain('Control characters removed')
      })

      it('should strip tab characters', () => {
        const result = sanitizeFilename('file\tname.pdf')
        expect(result.sanitized).toBe('filename.pdf')
        expect(result.warnings).toContain('Control characters removed')
      })

      it('should strip newline characters', () => {
        const result = sanitizeFilename('file\nname.pdf')
        expect(result.sanitized).toBe('filename.pdf')
      })

      it('should strip carriage return', () => {
        const result = sanitizeFilename('file\rname.pdf')
        expect(result.sanitized).toBe('filename.pdf')
      })

      it('should strip DEL character (0x7F)', () => {
        const result = sanitizeFilename('file\x7Fname.pdf')
        expect(result.sanitized).toBe('filename.pdf')
      })

      it('should strip C1 control characters (0x80-0x9F)', () => {
        const result = sanitizeFilename('file\x80name.pdf')
        expect(result.sanitized).toBe('filename.pdf')
      })
    })

    describe('Windows reserved names', () => {
      it.each([
        'CON',
        'PRN',
        'AUX',
        'NUL',
        'COM1',
        'COM2',
        'COM9',
        'LPT1',
        'LPT9',
        'con',
        'prn',
        'aux',
        'nul',
      ])('should prefix reserved name "%s" with underscore', (name) => {
        const result = sanitizeFilename(`${name}.txt`)
        expect(result.sanitized).toMatch(/^_/)
        expect(result.warnings.some(w => w.includes('Reserved'))).toBe(true)
      })

      it('should not modify non-reserved names that contain reserved strings', () => {
        const result = sanitizeFilename('console.log')
        expect(result.sanitized).toBe('console.log')
        expect(result.wasModified).toBe(false)
      })

      it('should not modify names like "conclusion.pdf"', () => {
        const result = sanitizeFilename('conclusion.pdf')
        expect(result.sanitized).toBe('conclusion.pdf')
      })
    })

    describe('unsafe character replacement', () => {
      it('should replace spaces with underscores', () => {
        const result = sanitizeFilename('my file.pdf')
        expect(result.sanitized).toBe('my_file.pdf')
      })

      it('should replace special characters', () => {
        const result = sanitizeFilename('file@#$%^&.pdf')
        expect(result.sanitized).toBe('file.pdf')
      })

      it('should collapse multiple underscores', () => {
        const result = sanitizeFilename('file   name.pdf')
        expect(result.sanitized).toBe('file_name.pdf')
      })

      it('should remove leading underscores from replacements', () => {
        const result = sanitizeFilename(' file.pdf')
        expect(result.sanitized).toBe('file.pdf')
        expect(result.sanitized).not.toMatch(/^_/)
      })

      it('should remove trailing underscores from replacements', () => {
        const result = sanitizeFilename('file .pdf')
        expect(result.sanitized).toBe('file.pdf')
      })

      it('should keep hyphens and underscores', () => {
        const result = sanitizeFilename('my-file_name.pdf')
        expect(result.sanitized).toBe('my-file_name.pdf')
      })
    })

    describe('path stripping', () => {
      it('should strip Unix paths', () => {
        const result = sanitizeFilename('/path/to/file.pdf')
        expect(result.sanitized).toBe('file.pdf')
        expect(result.warnings).toContain('Path stripped, keeping filename only')
      })

      it('should strip Windows paths', () => {
        const result = sanitizeFilename('C:\\Users\\Documents\\file.pdf')
        expect(result.sanitized).toBe('file.pdf')
      })

      it('should handle mixed path separators', () => {
        const result = sanitizeFilename('path/to\\file.pdf')
        expect(result.sanitized).toBe('file.pdf')
      })

      it('should handle relative paths', () => {
        const result = sanitizeFilename('../../../etc/passwd')
        expect(result.sanitized).toBe('passwd')
      })
    })

    describe('length limiting', () => {
      it('should truncate overly long filenames', () => {
        const longName = 'a'.repeat(300)
        const result = sanitizeFilename(`${longName}.pdf`)
        expect(result.sanitized.length).toBeLessThanOrEqual(255)
        expect(result.sanitized).toMatch(/\.pdf$/)
        expect(result.warnings).toContain('Filename truncated to 255 characters')
      })

      it('should preserve extension when truncating', () => {
        const longName = 'a'.repeat(260)
        const result = sanitizeFilename(`${longName}.pdf`)
        expect(result.sanitized).toMatch(/\.pdf$/)
        expect(result.extension).toBe('pdf')
      })

      it('should use custom max length', () => {
        const result = sanitizeFilename('verylongfilename.pdf', { maxLength: 10 })
        expect(result.sanitized.length).toBeLessThanOrEqual(10)
      })

      it('should handle case where extension is longer than max', () => {
        const result = sanitizeFilename('file.verylongextension', { maxLength: 10 })
        expect(result.sanitized.length).toBeLessThanOrEqual(10)
      })
    })

    describe('unicode normalization', () => {
      it('should normalize unicode to NFC form', () => {
        // e + combining acute accent (é decomposed) -> é (composed)
        // Then the é gets removed as an unsafe character (non-ASCII)
        const decomposed = 'cafe\u0301.pdf' // café with combining accent
        const result = sanitizeFilename(decomposed)
        // After NFC normalization, 'café' becomes single char, then non-ASCII is removed
        expect(result.sanitized).toBe('caf.pdf')
      })

      it('should handle emoji in filenames', () => {
        const result = sanitizeFilename('file🔥.pdf')
        expect(result.sanitized).toBe('file.pdf')
      })

      it('should handle Chinese characters', () => {
        const result = sanitizeFilename('文件.pdf')
        // Non-ASCII removed, but empty name becomes 'unnamed'
        expect(result.sanitized).toBe('unnamed.pdf')
      })

      it('should handle Japanese characters', () => {
        const result = sanitizeFilename('ファイル.pdf')
        // Non-ASCII removed, but empty name becomes 'unnamed'
        expect(result.sanitized).toBe('unnamed.pdf')
      })
    })

    describe('empty and edge cases', () => {
      it('should handle empty string', () => {
        const result = sanitizeFilename('')
        expect(result.sanitized).toBe('unnamed')
        expect(result.warnings).toContain('Empty filename replaced with "unnamed"')
      })

      it('should handle whitespace-only string', () => {
        const result = sanitizeFilename('   ')
        expect(result.sanitized).toBe('unnamed')
      })

      it('should handle filename that becomes empty after sanitization', () => {
        const result = sanitizeFilename('###')
        expect(result.sanitized).toBe('unnamed')
        expect(result.warnings).toContain('Filename reduced to empty, using "unnamed"')
      })

      it('should handle just a dot', () => {
        const result = sanitizeFilename('.')
        expect(result.sanitized).toBe('unnamed')
      })

      it('should handle multiple dots', () => {
        const result = sanitizeFilename('file.name.with.dots.pdf')
        expect(result.sanitized).toBe('file.name.with.dots.pdf')
        expect(result.extension).toBe('pdf')
      })

      it('should handle trailing dot', () => {
        const result = sanitizeFilename('filename.')
        expect(result.sanitized).toBe('filename.')
        expect(result.extension).toBeNull() // Trailing dot is not an extension
      })
    })
  })

  describe('sanitizeFilenameForS3', () => {
    it('should return just the sanitized string', () => {
      const result = sanitizeFilenameForS3('My File.PDF')
      expect(result).toBe('my_file.pdf')
      expect(typeof result).toBe('string')
    })

    it('should handle dangerous filenames', () => {
      const result = sanitizeFilenameForS3('../../../etc/passwd')
      expect(result).toBe('passwd')
    })
  })

  describe('validateFilename', () => {
    it('should pass valid filenames', () => {
      const result = validateFilename('my-file.pdf')
      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should fail empty filenames', () => {
      const result = validateFilename('')
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Filename is empty')
    })

    it('should fail filenames with control characters', () => {
      const result = validateFilename('file\x00.pdf')
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Contains control characters')
      expect(result.issues).toContain('Contains null bytes')
    })

    it('should fail filenames with path separators', () => {
      const result = validateFilename('path/to/file.pdf')
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Contains path separators')
    })

    it('should fail Windows reserved names', () => {
      const result = validateFilename('CON.txt')
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i => i.includes('reserved'))).toBe(true)
    })

    it('should fail overly long filenames', () => {
      const result = validateFilename('a'.repeat(300))
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Exceeds maximum length of 255 characters')
    })

    it('should pass filenames at exactly 255 characters', () => {
      const result = validateFilename('a'.repeat(251) + '.pdf')
      expect(result.isValid).toBe(true)
    })
  })

  describe('isWindowsReservedName', () => {
    it('should identify reserved names case-insensitively', () => {
      expect(isWindowsReservedName('CON')).toBe(true)
      expect(isWindowsReservedName('con')).toBe(true)
      expect(isWindowsReservedName('Con')).toBe(true)
    })

    it('should return false for non-reserved names', () => {
      expect(isWindowsReservedName('console')).toBe(false)
      expect(isWindowsReservedName('file')).toBe(false)
    })

    it('should handle all COM ports', () => {
      for (let i = 1; i <= 9; i++) {
        expect(isWindowsReservedName(`COM${i}`)).toBe(true)
      }
    })

    it('should handle all LPT ports', () => {
      for (let i = 1; i <= 9; i++) {
        expect(isWindowsReservedName(`LPT${i}`)).toBe(true)
      }
    })
  })

  describe('extractExtension', () => {
    it('should extract simple extensions', () => {
      const result = extractExtension('file.pdf')
      expect(result.name).toBe('file')
      expect(result.extension).toBe('pdf')
    })

    it('should handle multiple dots', () => {
      const result = extractExtension('file.name.pdf')
      expect(result.name).toBe('file.name')
      expect(result.extension).toBe('pdf')
    })

    it('should handle no extension', () => {
      const result = extractExtension('filename')
      expect(result.name).toBe('filename')
      expect(result.extension).toBeNull()
    })

    it('should handle hidden files', () => {
      const result = extractExtension('.gitignore')
      expect(result.name).toBe('.gitignore')
      expect(result.extension).toBeNull()
    })

    it('should handle trailing dot', () => {
      const result = extractExtension('file.')
      expect(result.name).toBe('file.')
      expect(result.extension).toBeNull()
    })
  })

  describe('stripControlCharacters', () => {
    it('should strip ASCII control characters', () => {
      expect(stripControlCharacters('a\x00b\x01c')).toBe('abc')
    })

    it('should preserve normal characters', () => {
      expect(stripControlCharacters('normal text')).toBe('normal text')
    })
  })

  describe('normalizeUnicode', () => {
    it('should normalize to NFC', () => {
      const decomposed = 'e\u0301' // e + combining accent
      const composed = 'é'
      expect(normalizeUnicode(decomposed)).toBe(composed)
    })
  })

  describe('replaceUnsafeCharacters', () => {
    it('should replace unsafe characters', () => {
      expect(replaceUnsafeCharacters('file name', '_')).toBe('file_name')
    })

    it('should collapse multiple replacements', () => {
      expect(replaceUnsafeCharacters('a   b', '_')).toBe('a_b')
    })

    it('should remove leading/trailing replacements', () => {
      expect(replaceUnsafeCharacters(' file ', '_')).toBe('file')
    })

    it('should use custom replacement character', () => {
      expect(replaceUnsafeCharacters('file name', '-')).toBe('file-name')
    })
  })

  describe('integration tests - dangerous filenames', () => {
    it.each([
      ['../../../etc/passwd', 'passwd'],
      ['..\\..\\windows\\system32\\config\\sam', 'sam'],
      ['file\x00.pdf', 'file.pdf'],
      ['CON.txt', '_con.txt'],
      // The '/' in '</script>' is treated as a path separator (security feature)
      // So only 'script>.html' is kept, which becomes 'script.html'
      ['<script>alert(1)</script>.html', 'script.html'],
      ['file%00name.pdf', 'file_00name.pdf'],
      ['a'.repeat(300), 'a'.repeat(255)],
    ])('should sanitize "%s" to "%s"', (input, expected) => {
      const result = sanitizeFilenameForS3(input)
      expect(result).toBe(expected)
    })

    it('should handle complex attack patterns', () => {
      const malicious = '....//....//....//etc/passwd\x00.pdf'
      const result = sanitizeFilenameForS3(malicious)
      expect(result).not.toContain('..')
      expect(result).not.toContain('/')
      expect(result).not.toContain('\x00')
    })
  })
})
