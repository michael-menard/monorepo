/**
 * Compression Presets Tests
 *
 * Story WISH-2046: Client-side Image Compression Quality Presets
 */

import { describe, it, expect } from 'vitest'
import {
  COMPRESSION_PRESETS,
  getPresetByName,
  isValidPresetName,
  DEFAULT_COMPRESSION_CONFIG,
} from '../index'

describe('COMPRESSION_PRESETS', () => {
  it('should have 3 presets', () => {
    expect(COMPRESSION_PRESETS).toHaveLength(3)
  })

  it('should have low-bandwidth, balanced, and high-quality presets', () => {
    const names = COMPRESSION_PRESETS.map(p => p.name)
    expect(names).toEqual(['low-bandwidth', 'balanced', 'high-quality'])
  })

  it('should have valid settings for each preset', () => {
    COMPRESSION_PRESETS.forEach(preset => {
      expect(preset.name).toBeTruthy()
      expect(preset.label).toBeTruthy()
      expect(preset.description).toBeTruthy()
      expect(preset.settings).toBeDefined()
      expect(preset.settings.maxSizeMB).toBeGreaterThan(0)
      expect(preset.settings.maxWidthOrHeight).toBeGreaterThan(0)
      expect(preset.settings.initialQuality).toBeGreaterThan(0)
      expect(preset.settings.initialQuality).toBeLessThanOrEqual(1)
      expect(preset.estimatedSize).toBeTruthy()
    })
  })
})

describe('getPresetByName', () => {
  it('should return correct preset for low-bandwidth', () => {
    const preset = getPresetByName('low-bandwidth')
    expect(preset.name).toBe('low-bandwidth')
    expect(preset.settings.maxSizeMB).toBe(0.5)
  })

  it('should return correct preset for balanced', () => {
    const preset = getPresetByName('balanced')
    expect(preset.name).toBe('balanced')
    expect(preset.settings.maxSizeMB).toBe(1)
  })

  it('should return correct preset for high-quality', () => {
    const preset = getPresetByName('high-quality')
    expect(preset.name).toBe('high-quality')
    expect(preset.settings.maxSizeMB).toBe(2)
  })

  it('should fall back to balanced for invalid name', () => {
    const preset = getPresetByName('invalid-name')
    expect(preset.name).toBe('balanced')
  })

  it('should fall back to balanced for empty string', () => {
    const preset = getPresetByName('')
    expect(preset.name).toBe('balanced')
  })
})

describe('isValidPresetName', () => {
  it('should return true for low-bandwidth', () => {
    expect(isValidPresetName('low-bandwidth')).toBe(true)
  })

  it('should return true for balanced', () => {
    expect(isValidPresetName('balanced')).toBe(true)
  })

  it('should return true for high-quality', () => {
    expect(isValidPresetName('high-quality')).toBe(true)
  })

  it('should return false for invalid name', () => {
    expect(isValidPresetName('invalid')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isValidPresetName('')).toBe(false)
  })
})

describe('DEFAULT_COMPRESSION_CONFIG', () => {
  it('should match balanced preset settings', () => {
    const balancedPreset = COMPRESSION_PRESETS[1]
    expect(DEFAULT_COMPRESSION_CONFIG).toEqual(balancedPreset.settings)
  })

  it('should have expected default values', () => {
    expect(DEFAULT_COMPRESSION_CONFIG.maxSizeMB).toBe(1)
    expect(DEFAULT_COMPRESSION_CONFIG.maxWidthOrHeight).toBe(1920)
    expect(DEFAULT_COMPRESSION_CONFIG.initialQuality).toBe(0.8)
    expect(DEFAULT_COMPRESSION_CONFIG.useWebWorker).toBe(true)
    expect(DEFAULT_COMPRESSION_CONFIG.fileType).toBe('image/webp')
  })
})
