import { describe, it, expect } from 'vitest'
import { designTokens, tailwindPreset } from '../design-system'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load preset by evaluating the CJS module in a sandbox
function loadPreset() {
  const presetPath = resolve(__dirname, '../tailwind-preset.js')
  const code = readFileSync(presetPath, 'utf-8')
  const _module = { exports: {} as Record<string, unknown> }
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('module', 'exports', code)(_module, _module.exports)
  return _module.exports as { theme: { extend: Record<string, unknown> } }
}

const preset = loadPreset()

describe('Design System Package', () => {
  describe('Core Exports', () => {
    it('should export design tokens path correctly', () => {
      expect(designTokens).toBe('./design-tokens.css')
    })

    it('should export tailwind preset path', () => {
      expect(tailwindPreset).toBe('./tailwind-preset.js')
    })
  })

  describe('Tailwind Preset — Font Families', () => {
    const fontFamily = preset.theme.extend.fontFamily

    it('should expose font-heading for Cormorant Garamond', () => {
      expect(fontFamily.heading).toBeDefined()
      expect(fontFamily.heading[0]).toBe('var(--font-heading)')
    })

    it('should expose font-body for Lora', () => {
      expect(fontFamily.body).toBeDefined()
      expect(fontFamily.body[0]).toBe('var(--font-body)')
    })

    it('should expose font-sans for Geist', () => {
      expect(fontFamily.sans).toBeDefined()
      expect(fontFamily.sans[0]).toBe('var(--font-sans)')
    })

    it('should expose font-mono for Geist Mono', () => {
      expect(fontFamily.mono).toBeDefined()
      expect(fontFamily.mono[0]).toBe('var(--font-mono)')
    })

    it('should not expose legacy font-primary', () => {
      expect(fontFamily.primary).toBeUndefined()
    })
  })

  describe('Tailwind Preset — Semantic Colors', () => {
    const colors = preset.theme.extend.colors

    it('should use oklch() for semantic colors', () => {
      expect(colors.background).toBe('oklch(var(--background))')
      expect(colors.foreground).toBe('oklch(var(--foreground))')
      expect(colors.border).toBe('oklch(var(--border))')
    })

    it('should expose primary with foreground variant', () => {
      expect(colors.primary.DEFAULT).toBe('oklch(var(--primary))')
      expect(colors.primary.foreground).toBe('oklch(var(--primary-foreground))')
    })

    it('should expose success color with foreground', () => {
      expect(colors.success.DEFAULT).toBe('oklch(var(--success))')
      expect(colors.success.foreground).toBe('oklch(var(--success-foreground))')
    })

    it('should expose warning color with foreground', () => {
      expect(colors.warning.DEFAULT).toBe('oklch(var(--warning))')
      expect(colors.warning.foreground).toBe('oklch(var(--warning-foreground))')
    })

    it('should expose info color with foreground', () => {
      expect(colors.info.DEFAULT).toBe('oklch(var(--info))')
      expect(colors.info.foreground).toBe('oklch(var(--info-foreground))')
    })

    it('should expose destructive (error) color with foreground', () => {
      expect(colors.destructive.DEFAULT).toBe('oklch(var(--destructive))')
      expect(colors.destructive.foreground).toBe('oklch(var(--destructive-foreground))')
    })

    it('should not use hsl() anywhere in semantic colors', () => {
      const semanticKeys = [
        'background',
        'foreground',
        'border',
        'input',
        'ring',
      ]
      for (const key of semanticKeys) {
        expect(colors[key]).not.toContain('hsl')
      }
    })
  })

  describe('Design Tokens CSS — Font Variables', () => {
    const tokensPath = resolve(__dirname, '../design-tokens.css')
    const css = readFileSync(tokensPath, 'utf-8')

    it('should define --font-heading with Cormorant Garamond', () => {
      expect(css).toContain("--font-heading: 'Cormorant Garamond'")
    })

    it('should define --font-body with Lora', () => {
      expect(css).toContain("--font-body: 'Lora'")
    })

    it('should define --font-sans with Geist', () => {
      expect(css).toContain("--font-sans: 'Geist'")
    })

    it('should define --font-mono with Geist Mono', () => {
      expect(css).toContain("--font-mono: 'Geist Mono'")
    })

    it('should not reference Inter or JetBrains Mono', () => {
      expect(css).not.toContain("'Inter'")
      expect(css).not.toContain("'JetBrains Mono'")
    })
  })

  describe('Design Tokens CSS — oklch Color Format', () => {
    const tokensPath = resolve(__dirname, '../design-tokens.css')
    const css = readFileSync(tokensPath, 'utf-8')

    it('should use oklch format for light theme semantic colors', () => {
      // Parameter-only format in @layer base :root
      expect(css).toMatch(/--background:\s*0\.\d+\s+0\.\d+\s+\d+/)
      expect(css).toMatch(/--foreground:\s*0\.\d+\s+0\.\d+\s+\d+/)
      expect(css).toMatch(/--primary:\s*0\.\d+\s+0\.\d+\s+\d+/)
    })

    it('should define success, warning, and info tokens in light theme', () => {
      expect(css).toMatch(/--success:\s*0\.\d+\s+0\.\d+\s+\d+/)
      expect(css).toMatch(/--warning:\s*0\.\d+\s+0\.\d+\s+\d+/)
      expect(css).toMatch(/--info:\s*0\.\d+\s+0\.\d+\s+\d+/)
    })

    it('should define success-foreground, warning-foreground, info-foreground', () => {
      expect(css).toMatch(/--success-foreground:\s*0\.\d+\s+0\.\d+\s+\d+/)
      expect(css).toMatch(/--warning-foreground:\s*0\.\d+\s+0\.\d+\s+\d+/)
      expect(css).toMatch(/--info-foreground:\s*0\.\d+\s+0\.\d+\s+\d+/)
    })

    it('should not use hsl values in semantic theme colors', () => {
      // The @layer base section should not contain hsl degree/percent patterns
      const layerBase = css.split('@layer base')[1]
      if (layerBase) {
        expect(layerBase).not.toMatch(/--(?:background|foreground|primary|secondary):\s*\d+\s+\d+%\s+\d+%/)
      }
    })
  })

  describe('Font Files', () => {
    const fontsDir = resolve(__dirname, '../../fonts')

    it('should have Cormorant Garamond roman woff2', () => {
      const stat = readFileSync(resolve(fontsDir, 'CormorantGaramond-roman.woff2'))
      expect(stat.length).toBeGreaterThan(0)
    })

    it('should have Cormorant Garamond italic woff2', () => {
      const stat = readFileSync(resolve(fontsDir, 'CormorantGaramond-italic.woff2'))
      expect(stat.length).toBeGreaterThan(0)
    })

    it('should have Lora roman woff2', () => {
      const stat = readFileSync(resolve(fontsDir, 'Lora-roman.woff2'))
      expect(stat.length).toBeGreaterThan(0)
    })

    it('should have Lora italic woff2', () => {
      const stat = readFileSync(resolve(fontsDir, 'Lora-italic.woff2'))
      expect(stat.length).toBeGreaterThan(0)
    })

    it('should have Geist variable woff2', () => {
      const stat = readFileSync(resolve(fontsDir, 'Geist-Variable.woff2'))
      expect(stat.length).toBeGreaterThan(0)
    })

    it('should have Geist Mono variable woff2', () => {
      const stat = readFileSync(resolve(fontsDir, 'GeistMono-Variable.woff2'))
      expect(stat.length).toBeGreaterThan(0)
    })
  })

  describe('Font CSS — @font-face Declarations', () => {
    const fontsCssPath = resolve(__dirname, '../fonts.css')
    const css = readFileSync(fontsCssPath, 'utf-8')

    it('should declare Cormorant Garamond font-face', () => {
      expect(css).toContain("font-family: 'Cormorant Garamond'")
    })

    it('should declare Lora font-face', () => {
      expect(css).toContain("font-family: 'Lora'")
    })

    it('should declare Geist font-face', () => {
      expect(css).toContain("font-family: 'Geist'")
    })

    it('should declare Geist Mono font-face', () => {
      expect(css).toContain("font-family: 'Geist Mono'")
    })

    it('should use woff2 format', () => {
      expect(css).toContain("format('woff2')")
    })

    it('should use font-display: swap', () => {
      expect(css).toContain('font-display: swap')
    })
  })
})
