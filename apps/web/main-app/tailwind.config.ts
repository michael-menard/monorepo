import type { Config } from 'tailwindcss'

const config: Config = {
  // Use the shared design system preset (single source of truth)
  presets: [require('@repo/design-system/tailwind-preset')],
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html', '../../packages/core/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // App-specific extensions only
      // Base theme (colors, spacing, typography) comes from @repo/design-system
      animation: {
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
