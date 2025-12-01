import { describe, it, expect } from 'vitest'
import { UPLOAD_PRESETS } from '../presets.js'
import { configFixtures } from '../../__tests__/fixtures.js'

describe('presets', () => {
  describe('UPLOAD_PRESETS', () => {
    it('should have all expected upload presets', () => {
      const expectedPresets = ['avatar', 'thumbnail', 'gallery', 'hero', 'document']

      expectedPresets.forEach(presetName => {
        expect(UPLOAD_PRESETS).toHaveProperty(presetName)
      })
    })

    it('should have valid configuration for avatar preset', () => {
      const avatar = UPLOAD_PRESETS.avatar

      expect(avatar.acceptedFileTypes).toContain('image/jpeg')
      expect(avatar.acceptedFileTypes).toContain('image/png')
      expect(avatar.maxFileSize).toBeGreaterThan(0)
      expect(avatar.imageProcessing).toBeDefined()
      expect(avatar.imageProcessing?.width).toBeDefined()
      expect(avatar.imageProcessing?.height).toBeDefined()
    })

    it('should have valid configuration for document preset', () => {
      const document = UPLOAD_PRESETS.document

      expect(document.acceptedFileTypes).toContain('application/pdf')
      expect(document.maxFileSize).toBeGreaterThan(0)
    })

    it('should have different configurations for different presets', () => {
      const avatar = UPLOAD_PRESETS.avatar
      const gallery = UPLOAD_PRESETS.gallery

      expect(avatar.imageProcessing?.width).not.toBe(gallery.imageProcessing?.width)
      expect(avatar.imageProcessing?.height).not.toBe(gallery.imageProcessing?.height)
    })
  })

  describe('preset validation', () => {
    it('should have valid image processing configurations', () => {
      const imagePresets = ['avatar', 'thumbnail', 'gallery', 'hero']

      imagePresets.forEach(presetName => {
        const preset = UPLOAD_PRESETS[presetName]
        expect(preset.imageProcessing).toBeDefined()
        expect(preset.imageProcessing?.width).toBeGreaterThan(0)
        expect(preset.imageProcessing?.height).toBeGreaterThan(0)
        expect(preset.imageProcessing?.quality).toBeGreaterThan(0)
        expect(preset.imageProcessing?.quality).toBeLessThanOrEqual(100)
      })
    })

    it('should have reasonable file size limits', () => {
      Object.values(UPLOAD_PRESETS).forEach(preset => {
        expect(preset.maxFileSize).toBeGreaterThan(0)
        expect(preset.maxFileSize).toBeLessThanOrEqual(100 * 1024 * 1024) // Less than or equal to 100MB
      })
    })

    it('should have appropriate file type restrictions', () => {
      const avatar = UPLOAD_PRESETS.avatar
      const document = UPLOAD_PRESETS.document

      // Avatar should only accept images
      expect(avatar.acceptedFileTypes.every(type => type.startsWith('image/'))).toBe(true)

      // Document should accept document types
      expect(document.acceptedFileTypes.some(type => type.includes('pdf'))).toBe(true)
    })
  })
})
