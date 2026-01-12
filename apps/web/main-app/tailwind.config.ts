import type { Config } from 'tailwindcss'

const config: Config = {
  // Use the shared design system preset (single source of truth)
  presets: [require('@repo/design-system/tailwind-preset')],
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html', '../../packages/core/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // App-specific extensions only
      // Base theme (colors, spacing, typography, animations) comes from @repo/design-system
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
