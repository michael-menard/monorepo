import type { Config } from 'tailwindcss'

const config: Config = {
  // Extend the shared design system preset
  presets: [require('@repo/design-system/tailwind-preset')],
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    // Include shared package components
    '../../packages/core/app-component-library/src/**/*.{ts,tsx}',
    '../../packages/core/accessibility/src/**/*.{ts,tsx}',
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
      // App-specific theme extensions can go here
      // The base theme comes from @repo/design-system
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
