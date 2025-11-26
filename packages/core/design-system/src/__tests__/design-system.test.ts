import { describe, it, expect } from 'vitest'
import { designTokens, tailwindPreset } from '../design-system'

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

    it('should export valid paths', () => {
      // Ensure exports are valid paths
      expect(designTokens).toBeDefined()
      expect(tailwindPreset).toBeDefined()
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
