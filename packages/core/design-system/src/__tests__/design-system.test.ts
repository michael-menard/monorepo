import { describe, it, expect } from 'vitest'
import { designTokens, tailwindPreset } from '../design-system'
import { designTokensCss, tailwindPreset as indexTailwindPreset } from '../index'

describe('Design System Package', () => {
  describe('Core Exports', () => {
    it('should export design tokens path correctly', () => {
      expect(designTokens).toBeDefined()
      expect(typeof designTokens).toBe('string')
      expect(designTokens).toBe('./design-tokens.css')
    })

    it('should export tailwind preset path', () => {
      expect(tailwindPreset).toBeDefined()
      expect(typeof tailwindPreset).toBe('string')
      expect(tailwindPreset).toBe('./tailwind-preset.js')
    })
  })

  describe('Index Exports', () => {
    it('should re-export design tokens from index', () => {
      expect(designTokensCss).toBeDefined()
      expect(typeof designTokensCss).toBe('string')
      expect(designTokensCss).toBe('./design-tokens.css')
    })

    it('should re-export tailwind preset from index', () => {
      expect(indexTailwindPreset).toBeDefined()
      expect(typeof indexTailwindPreset).toBe('string')
      expect(indexTailwindPreset).toBe('./tailwind-preset.js')
    })
  })

  describe('Package Structure', () => {
    it('should have consistent export paths', () => {
      // Verify that the exported paths match the actual file structure
      expect(designTokens).toMatch(/\.css$/)
      expect(tailwindPreset).toMatch(/\.js$/)
    })

    it('should provide relative paths for imports', () => {
      // Ensure paths are relative for proper module resolution
      expect(designTokens.startsWith('./')).toBe(true)
      expect(tailwindPreset.startsWith('./')).toBe(true)
    })

    it('should maintain consistency between design-system and index exports', () => {
      // Ensure both export the same paths
      expect(designTokens).toBe(designTokensCss)
      expect(tailwindPreset).toBe(indexTailwindPreset)
    })
  })

  describe('Design System Utilities', () => {
    it('should export valid file extensions', () => {
      expect(designTokens.endsWith('.css')).toBe(true)
      expect(tailwindPreset.endsWith('.js')).toBe(true)
    })

    it('should use relative path format for bundler compatibility', () => {
      // Paths should start with ./ for proper module resolution
      expect(designTokens).toMatch(/^\.\/[^/]+\.css$/)
      expect(tailwindPreset).toMatch(/^\.\/[^/]+\.js$/)
    })
  })
})
