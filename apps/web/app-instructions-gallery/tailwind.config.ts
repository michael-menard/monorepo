import type { Config } from 'tailwindcss'

const config: Config = {
  // Extend the shared design system preset
  presets: [require('@repo/design-system/tailwind-preset')],
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    // Include shared package components
    '../../packages/core/ui/src/**/*.{ts,tsx}',
    '../../packages/core/accessibility/src/**/*.{ts,tsx}',
    
  ],
  theme: {
    extend: {
      // App-specific theme extensions can go here
      // The base theme comes from @repo/design-system
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
