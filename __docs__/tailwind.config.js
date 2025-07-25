/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./apps/*/src/**/*.{js,ts,jsx,tsx}",
    "./packages/*/src/**/*.{js,ts,jsx,tsx}",
    "./packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Design System Colors
      colors: {
        // Primary brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Secondary colors
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Success colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Warning colors
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Error colors
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // LEGO-specific colors
        lego: {
          red: '#d40000',
          blue: '#0055bf',
          yellow: '#ffd700',
          green: '#00af3e',
          orange: '#ff8200',
          purple: '#7b2c83',
          bright: '#ffffff',
          dark: '#1a1a1a',
        },
        // UI semantic colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      
      // Typography
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"Fira Code"',
          '"JetBrains Mono"',
          'Consolas',
          '"Liberation Mono"',
          'Menlo',
          'Monaco',
          'monospace',
        ],
      },
      
      // Custom spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      
      // Animation and timing
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      
      // Border radius
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      
      // Box shadows
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'elevation-2': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'elevation-3': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'elevation-4': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'elevation-5': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
      },
      
      // Backdrop blur
      backdropBlur: {
        xs: '2px',
      },
      
      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // Use .form-input, .form-select etc classes
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
    // Custom component utilities
    function({ addUtilities, addComponents, theme }) {
      // Custom utilities for common patterns
      addUtilities({
        '.flex-center': {
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'center',
        },
        '.flex-between': {
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
        },
        '.flex-col-center': {
          'display': 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': 'center',
        },
        '.absolute-center': {
          'position': 'absolute',
          'top': '50%',
          'left': '50%',
          'transform': 'translate(-50%, -50%)',
        },
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.text-gradient': {
          'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
      });
      
      // Custom components for consistent styling
      addComponents({
        '.btn': {
          'padding': `${theme('spacing.2')} ${theme('spacing.4')}`,
          'border-radius': theme('borderRadius.md'),
          'font-weight': theme('fontWeight.medium'),
          'transition': 'all 0.2s ease-in-out',
          'cursor': 'pointer',
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'gap': theme('spacing.2'),
          '&:disabled': {
            'opacity': '0.6',
            'cursor': 'not-allowed',
          },
        },
        '.btn-primary': {
          'background-color': theme('colors.primary.600'),
          'color': theme('colors.white'),
          '&:hover:not(:disabled)': {
            'background-color': theme('colors.primary.700'),
            'transform': 'translateY(-1px)',
            'box-shadow': theme('boxShadow.elevation-2'),
          },
          '&:active': {
            'transform': 'translateY(0)',
          },
        },
        '.btn-secondary': {
          'background-color': theme('colors.secondary.100'),
          'color': theme('colors.secondary.700'),
          'border': `1px solid ${theme('colors.secondary.300')}`,
          '&:hover:not(:disabled)': {
            'background-color': theme('colors.secondary.200'),
            'border-color': theme('colors.secondary.400'),
          },
        },
        '.btn-ghost': {
          'background-color': 'transparent',
          'color': theme('colors.secondary.600'),
          '&:hover:not(:disabled)': {
            'background-color': theme('colors.secondary.100'),
            'color': theme('colors.secondary.700'),
          },
        },
        '.card': {
          'background-color': theme('colors.white'),
          'border-radius': theme('borderRadius.lg'),
          'box-shadow': theme('boxShadow.elevation-1'),
          'border': `1px solid ${theme('colors.secondary.200')}`,
          'padding': theme('spacing.6'),
          'transition': 'all 0.2s ease-in-out',
          '&:hover': {
            'box-shadow': theme('boxShadow.elevation-2'),
            'transform': 'translateY(-1px)',
          },
        },
        '.input': {
          'width': '100%',
          'padding': `${theme('spacing.3')} ${theme('spacing.4')}`,
          'border': `1px solid ${theme('colors.secondary.300')}`,
          'border-radius': theme('borderRadius.md'),
          'background-color': theme('colors.white'),
          'font-size': theme('fontSize.sm'),
          'transition': 'all 0.2s ease-in-out',
          '&:focus': {
            'outline': 'none',
            'border-color': theme('colors.primary.500'),
            'box-shadow': `0 0 0 3px ${theme('colors.primary.100')}`,
          },
          '&:disabled': {
            'background-color': theme('colors.secondary.50'),
            'color': theme('colors.secondary.500'),
            'cursor': 'not-allowed',
          },
          '&::placeholder': {
            'color': theme('colors.secondary.400'),
          },
        },
        '.label': {
          'display': 'block',
          'font-size': theme('fontSize.sm'),
          'font-weight': theme('fontWeight.medium'),
          'color': theme('colors.secondary.700'),
          'margin-bottom': theme('spacing.2'),
        },
        '.badge': {
          'display': 'inline-flex',
          'align-items': 'center',
          'padding': `${theme('spacing.1')} ${theme('spacing.2')}`,
          'font-size': theme('fontSize.xs'),
          'font-weight': theme('fontWeight.medium'),
          'border-radius': theme('borderRadius.full'),
          'text-transform': 'uppercase',
          'letter-spacing': theme('letterSpacing.wide'),
        },
        '.badge-primary': {
          'background-color': theme('colors.primary.100'),
          'color': theme('colors.primary.700'),
        },
        '.badge-success': {
          'background-color': theme('colors.success.100'),
          'color': theme('colors.success.700'),
        },
        '.badge-warning': {
          'background-color': theme('colors.warning.100'),
          'color': theme('colors.warning.700'),
        },
        '.badge-error': {
          'background-color': theme('colors.error.100'),
          'color': theme('colors.error.700'),
        },
      });
    },
  ],
}; 