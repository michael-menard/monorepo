import type { Config } from 'tailwindcss'

const config: Config = {
  // Use the shared design system preset (single source of truth)
  presets: [require('@repo/design-system/tailwind-preset')],
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    '../../../packages/core/app-component-library/src/**/*.{ts,tsx}',
    '../../../packages/core/gallery/src/**/*.{ts,tsx}',
    '../app-instructions-gallery/src/**/*.{ts,tsx}',
    '../app-dashboard/src/**/*.{ts,tsx}',
  ],
  // Safelist animation classes used by Radix Dialog/AlertDialog with data-state variants
  // These are needed because Tailwind JIT doesn't always detect them in template strings
  safelist: [
    // Radix animation classes (data-state variants not detectable by JIT)
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
    // Dialog centering (arbitrary values used in app-component-library primitives)
    'left-[50%]',
    'top-[50%]',
    'translate-x-[-50%]',
    'translate-y-[-50%]',
  ],
  theme: {
    extend: {
      // App-specific extensions only
      // Base theme (colors, spacing, typography, animations) comes from @repo/design-system
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}

export default config
