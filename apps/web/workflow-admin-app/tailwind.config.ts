import type { Config } from 'tailwindcss'

const config: Config = {
  presets: [require('@repo/design-system/tailwind-preset')],
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    '../../packages/core/app-component-library/src/**/*.{ts,tsx}',
    '../workflow-roadmap/src/**/*.{ts,tsx}',
  ],
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
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
