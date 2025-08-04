import { describe, it, expect } from 'vitest'
import {
  IMAGE_PRESETS,
  getPreset,
  createCustomPreset,
  getOptimalPreset,
  createResponsiveVariants,
  RESPONSIVE_BREAKPOINTS,
  createStandardResponsiveVariants
} from '../utils/presets.js'

describe('Image Presets', () => {
  describe('IMAGE_PRESETS', () => {
    it('should have all required presets', () => {
      expect(IMAGE_PRESETS).toHaveProperty('avatar')
      expect(IMAGE_PRESETS).toHaveProperty('thumbnail')
      expect(IMAGE_PRESETS).toHaveProperty('gallery')
      expect(IMAGE_PRESETS).toHaveProperty('hero')
      expect(IMAGE_PRESETS).toHaveProperty('background')
    })

    it('should have correct avatar preset configuration', () => {
      const avatar = IMAGE_PRESETS.avatar
      expect(avatar.maxWidth).toBe(200)
      expect(avatar.maxHeight).toBe(200)
      expect(avatar.quality).toBe(90)
      expect(avatar.format).toBe('jpeg')
      expect(avatar.fit).toBe('cover')
      expect(avatar.sharpen).toBe(true)
    })

    it('should have correct thumbnail preset configuration', () => {
      const thumbnail = IMAGE_PRESETS.thumbnail
      expect(thumbnail.maxWidth).toBe(150)
      expect(thumbnail.maxHeight).toBe(150)
      expect(thumbnail.quality).toBe(80)
      expect(thumbnail.format).toBe('jpeg')
      expect(thumbnail.fit).toBe('cover')
      expect(thumbnail.sharpen).toBe(false)
    })

    it('should have correct gallery preset configuration', () => {
      const gallery = IMAGE_PRESETS.gallery
      expect(gallery.maxWidth).toBe(800)
      expect(gallery.maxHeight).toBe(800)
      expect(gallery.quality).toBe(85)
      expect(gallery.format).toBe('jpeg')
      expect(gallery.fit).toBe('inside')
      expect(gallery.sharpen).toBe(true)
    })

    it('should have correct hero preset configuration', () => {
      const hero = IMAGE_PRESETS.hero
      expect(hero.maxWidth).toBe(1200)
      expect(hero.maxHeight).toBe(800)
      expect(hero.quality).toBe(90)
      expect(hero.format).toBe('jpeg')
      expect(hero.fit).toBe('cover')
      expect(hero.sharpen).toBe(true)
    })

    it('should have correct background preset configuration', () => {
      const background = IMAGE_PRESETS.background
      expect(background.maxWidth).toBe(1920)
      expect(background.maxHeight).toBe(1080)
      expect(background.quality).toBe(80)
      expect(background.format).toBe('jpeg')
      expect(background.fit).toBe('cover')
      expect(background.sharpen).toBe(false)
    })
  })

  describe('getPreset', () => {
    it('should return avatar preset', () => {
      const preset = getPreset('avatar')
      expect(preset).toEqual(IMAGE_PRESETS.avatar)
    })

    it('should return thumbnail preset', () => {
      const preset = getPreset('thumbnail')
      expect(preset).toEqual(IMAGE_PRESETS.thumbnail)
    })

    it('should return gallery preset', () => {
      const preset = getPreset('gallery')
      expect(preset).toEqual(IMAGE_PRESETS.gallery)
    })

    it('should return hero preset', () => {
      const preset = getPreset('hero')
      expect(preset).toEqual(IMAGE_PRESETS.hero)
    })

    it('should return background preset', () => {
      const preset = getPreset('background')
      expect(preset).toEqual(IMAGE_PRESETS.background)
    })
  })

  describe('createCustomPreset', () => {
    it('should create custom preset based on avatar', () => {
      const customPreset = createCustomPreset('avatar', {
        maxWidth: 300,
        quality: 95,
        format: 'webp' as const
      })

      expect(customPreset.maxWidth).toBe(300)
      expect(customPreset.maxHeight).toBe(200) // From original avatar
      expect(customPreset.quality).toBe(95)
      expect(customPreset.format).toBe('webp')
      expect(customPreset.fit).toBe('cover') // From original avatar
    })

    it('should create custom preset based on gallery', () => {
      const customPreset = createCustomPreset('gallery', {
        maxWidth: 1200,
        fit: 'cover' as const
      })

      expect(customPreset.maxWidth).toBe(1200)
      expect(customPreset.maxHeight).toBe(800) // From original gallery
      expect(customPreset.quality).toBe(85) // From original gallery
      expect(customPreset.fit).toBe('cover')
    })
  })

  describe('getOptimalPreset', () => {
    it('should return optimal preset for small images', () => {
      const preset = getOptimalPreset(500, 400, 'gallery')
      expect(preset.quality).toBe(85) // Default quality for medium images
    })

    it('should return optimal preset for large images', () => {
      const preset = getOptimalPreset(4000, 3000, 'gallery')
      expect(preset.quality).toBe(75) // Reduced quality for large images
    })

    it('should return optimal preset for medium images', () => {
      const preset = getOptimalPreset(1500, 1000, 'gallery')
      expect(preset.quality).toBe(85) // Default quality for medium images
    })

    it('should use specified use case', () => {
      const avatarPreset = getOptimalPreset(1000, 1000, 'avatar')
      const galleryPreset = getOptimalPreset(1000, 1000, 'gallery')

      expect(avatarPreset.maxWidth).toBe(200) // Avatar dimensions
      expect(galleryPreset.maxWidth).toBe(800) // Gallery dimensions
    })

    it('should default to gallery use case', () => {
      const preset = getOptimalPreset(1000, 1000)
      expect(preset.maxWidth).toBe(800) // Gallery dimensions
    })
  })

  describe('createResponsiveVariants', () => {
    it('should create responsive variants', () => {
      const baseConfig = IMAGE_PRESETS.gallery
      const breakpoints = [
        { name: 'mobile', width: 480 },
        { name: 'tablet', width: 768 },
        { name: 'desktop', width: 1024 }
      ]

      const variants = createResponsiveVariants(baseConfig, breakpoints)

      expect(variants).toHaveLength(3)
      expect(variants[0]).toEqual({
        name: 'mobile',
        config: { ...baseConfig, maxWidth: 480, maxHeight: 480 }
      })
      expect(variants[1]).toEqual({
        name: 'tablet',
        config: { ...baseConfig, maxWidth: 768, maxHeight: 768 }
      })
      expect(variants[2]).toEqual({
        name: 'desktop',
        config: { ...baseConfig, maxWidth: 1024, maxHeight: 1024 }
      })
    })

    it('should use custom height when provided', () => {
      const baseConfig = IMAGE_PRESETS.gallery
      const breakpoints = [
        { name: 'hero', width: 1200, height: 600 }
      ]

      const variants = createResponsiveVariants(baseConfig, breakpoints)

      expect(variants[0]).toEqual({
        name: 'hero',
        config: { ...baseConfig, maxWidth: 1200, maxHeight: 600 }
      })
    })
  })

  describe('RESPONSIVE_BREAKPOINTS', () => {
    it('should have all standard breakpoints', () => {
      expect(RESPONSIVE_BREAKPOINTS).toHaveProperty('mobile')
      expect(RESPONSIVE_BREAKPOINTS).toHaveProperty('tablet')
      expect(RESPONSIVE_BREAKPOINTS).toHaveProperty('desktop')
      expect(RESPONSIVE_BREAKPOINTS).toHaveProperty('large')
      expect(RESPONSIVE_BREAKPOINTS).toHaveProperty('xlarge')
    })

    it('should have correct breakpoint values', () => {
      expect(RESPONSIVE_BREAKPOINTS.mobile).toEqual({ name: 'mobile', width: 480 })
      expect(RESPONSIVE_BREAKPOINTS.tablet).toEqual({ name: 'tablet', width: 768 })
      expect(RESPONSIVE_BREAKPOINTS.desktop).toEqual({ name: 'desktop', width: 1024 })
      expect(RESPONSIVE_BREAKPOINTS.large).toEqual({ name: 'large', width: 1440 })
      expect(RESPONSIVE_BREAKPOINTS.xlarge).toEqual({ name: 'xlarge', width: 1920 })
    })
  })

  describe('createStandardResponsiveVariants', () => {
    it('should create standard responsive variants', () => {
      const baseConfig = IMAGE_PRESETS.gallery
      const variants = createStandardResponsiveVariants(baseConfig)

      expect(variants).toHaveLength(5)
      expect(variants.map(v => v.name)).toEqual([
        'mobile',
        'tablet',
        'desktop',
        'large',
        'xlarge'
      ])

      expect(variants[0].config.maxWidth).toBe(480)
      expect(variants[1].config.maxWidth).toBe(768)
      expect(variants[2].config.maxWidth).toBe(1024)
      expect(variants[3].config.maxWidth).toBe(1440)
      expect(variants[4].config.maxWidth).toBe(1920)
    })

    it('should preserve base config properties', () => {
      const baseConfig = IMAGE_PRESETS.avatar
      const variants = createStandardResponsiveVariants(baseConfig)

      variants.forEach(variant => {
        expect(variant.config.quality).toBe(baseConfig.quality)
        expect(variant.config.format).toBe(baseConfig.format)
        expect(variant.config.fit).toBe(baseConfig.fit)
        expect(variant.config.sharpen).toBe(baseConfig.sharpen)
      })
    })
  })
}) 