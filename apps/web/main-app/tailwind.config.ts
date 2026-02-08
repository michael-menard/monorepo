import type { Config } from 'tailwindcss'

const config: Config = {
  // Use the shared design system preset (single source of truth)
  presets: [require('@repo/design-system/tailwind-preset')],
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    '../../packages/core/app-component-library/src/**/*.{ts,tsx}',
  ],
  // Safelist animation classes used by Radix Dialog/AlertDialog with data-state variants
  // These are needed because Tailwind JIT doesn't always detect them in template strings
  safelist: [
    'animate-in',
    'animate-out',
    'fade-in-0',
    'fade-out-0',
    'zoom-in-95',
    'zoom-out-95',
    'slide-in-from-top-[48%]',
    'slide-in-from-left-1/2',
    'slide-out-to-top-[48%]',
    'slide-out-to-left-1/2',
  ],
  theme: {
    extend: {
      // App-specific extensions only
      // Base theme (colors, spacing, typography, animations) comes from @repo/design-system
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
