/**
 * Tests for createMockFile utility
 *
 * Story: WISH-2120
 */

import { describe, it, expect } from 'vitest'
import { createMockFile } from '../createMockFile'

describe('createMockFile', () => {
  describe('Default behavior (AC1)', () => {
    it('returns a valid File object with sensible defaults', () => {
      const file = createMockFile()

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('test-image.jpg')
      expect(file.type).toBe('image/jpeg')
      expect(file.size).toBe(1024)
    })
  })

  describe('Custom properties (AC2)', () => {
    it('creates file with custom name', () => {
      const file = createMockFile({ name: 'custom-photo.png' })

      expect(file.name).toBe('custom-photo.png')
    })

    it('creates file with custom type', () => {
      const file = createMockFile({ type: 'image/png' })

      expect(file.type).toBe('image/png')
    })

    it('creates file with custom size', () => {
      const file = createMockFile({ size: 2048 })

      expect(file.size).toBe(2048)
    })

    it('creates file with all custom properties', () => {
      const file = createMockFile({
        name: 'photo.webp',
        type: 'image/webp',
        size: 5 * 1024 * 1024, // 5MB
      })

      expect(file.name).toBe('photo.webp')
      expect(file.type).toBe('image/webp')
      expect(file.size).toBe(5 * 1024 * 1024)
    })
  })

  describe('Explicit content (AC3)', () => {
    it('allows explicit content to be set', () => {
      const content = 'custom file content'
      const file = createMockFile({ content })

      expect(file.size).toBe(content.length)
    })

    it('uses explicit content with custom type', () => {
      const file = createMockFile({
        content: 'text content',
        type: 'text/plain',
      })

      expect(file.type).toBe('text/plain')
      expect(file.size).toBe('text content'.length)
    })
  })

  describe('Zero-byte files (AC4)', () => {
    it('creates zero-byte file', () => {
      const file = createMockFile({ size: 0 })

      expect(file.size).toBe(0)
      expect(file).toBeInstanceOf(File)
    })

    it('creates zero-byte file with custom name', () => {
      const file = createMockFile({ name: 'empty.jpg', size: 0 })

      expect(file.name).toBe('empty.jpg')
      expect(file.size).toBe(0)
    })
  })

  describe('Large file performance (AC5)', () => {
    it('creates large files efficiently (< 100ms)', () => {
      const startTime = performance.now()
      const file = createMockFile({ size: 10 * 1024 * 1024 }) // 10MB
      const endTime = performance.now()

      const duration = endTime - startTime

      expect(file.size).toBe(10 * 1024 * 1024)
      expect(duration).toBeLessThan(100)
    })

    it('creates 20MB file efficiently', () => {
      const startTime = performance.now()
      const file = createMockFile({ size: 20 * 1024 * 1024 }) // 20MB
      const endTime = performance.now()

      const duration = endTime - startTime

      expect(file.size).toBe(20 * 1024 * 1024)
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Edge cases', () => {
    it('handles special characters in file name', () => {
      const file = createMockFile({ name: 'file with spaces & special-chars.jpg' })

      expect(file.name).toBe('file with spaces & special-chars.jpg')
    })

    it('handles Unicode characters in file name', () => {
      const file = createMockFile({ name: '测试文件.jpg' })

      expect(file.name).toBe('测试文件.jpg')
    })

    it('handles very small sizes (1 byte)', () => {
      const file = createMockFile({ size: 1 })

      expect(file.size).toBe(1)
    })

    it('handles boundary between small and large file logic (10KB)', () => {
      const file = createMockFile({ size: 10000 })

      expect(file.size).toBe(10000)
    })

    it('handles boundary just over 10KB (uses ArrayBuffer)', () => {
      const file = createMockFile({ size: 10001 })

      expect(file.size).toBe(10001)
    })
  })

  describe('File object properties', () => {
    it('has lastModified timestamp', () => {
      const file = createMockFile()

      expect(file.lastModified).toBeGreaterThan(0)
      expect(typeof file.lastModified).toBe('number')
    })

    it('is instanceof File', () => {
      const file = createMockFile()

      expect(file).toBeInstanceOf(File)
      expect(file).toBeInstanceOf(Blob)
    })
  })
})
