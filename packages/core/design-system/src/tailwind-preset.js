/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      // LEGO MOC Color Palette - Teal/Sage/Taupe + Cyberpunk Glow
      colors: {
        // Primary Brand - Teal Family
        teal: {
          100: 'var(--color-teal-100)', // #D1E3E8 - Disabled states
          400: 'var(--color-teal-400)', // #5FA3B8 - Secondary interactive
          600: 'var(--color-teal-600)', // #1B5E6D - Primary (DEFAULT)
          800: 'var(--color-teal-800)', // #0F4654 - Hover states
          950: 'var(--color-teal-950)', // #082B34 - Dark mode bg
          DEFAULT: 'var(--color-teal-600)',
        },
        // Accent - Green/Sage Family
        green: {
          100: 'var(--color-green-100)', // #E9EDE8 - Soft backgrounds
          300: 'var(--color-green-300)', // #C4D1C5 - Borders, dividers
          500: 'var(--color-green-500)', // #A8B8A3 - Accents (DEFAULT)
          700: 'var(--color-green-700)', // #6B7E68 - Secondary elements
          900: 'var(--color-green-900)', // #2D5F4F - Success states
          DEFAULT: 'var(--color-green-500)',
        },
        // Neutral - Taupe/Earth Family
        neutral: {
          50: 'var(--color-neutral-50)', // #F9F7F5 - Light backgrounds
          100: 'var(--color-neutral-100)', // #F5F1ED - Primary background
          300: 'var(--color-neutral-300)', // #D9CFC5 - Borders
          500: 'var(--color-neutral-500)', // #9B8B7E - Secondary text
          700: 'var(--color-neutral-700)', // #6B5D52 - Emphasis text
          900: 'var(--color-neutral-900)', // #2C2C2C - Primary text
          DEFAULT: 'var(--color-neutral-500)',
        },
        // Semantic Colors
        success: 'var(--color-success)', // #2D5F4F - Forest Green
        warning: 'var(--color-warning)', // #D4A574 - Warm Ochre
        error: 'var(--color-error)', // #A85B4B - Terracotta Red
        info: 'var(--color-info)', // #5FA3B8 - Soft Teal
        // Additional Accents
        clay: 'var(--color-clay)', // #B89968 - MOC highlights
        'dusty-blue': 'var(--color-dusty-blue)', // #7B8FA3 - Secondary accent
        gold: 'var(--color-gold)', // #B8A876 - Premium/featured

        // Cyberpunk Glow Colors (for border/ring accents)
        glow: {
          primary: 'var(--glow-primary)', // sky-500/30
          accent: 'var(--glow-accent)', // amber-500/30
          success: 'var(--glow-success)', // emerald-500/30
          error: 'var(--glow-error)', // red-500/30
          info: 'var(--glow-info)', // blue-500/30
          violet: 'var(--glow-violet)', // violet-500/30
        },

        // Translucent Surface Colors
        surface: {
          DEFAULT: 'var(--surface-translucent)', // slate-900/50
          light: 'var(--surface-translucent-light)', // slate-800/50
          border: 'var(--surface-border)', // slate-700/50
          'border-glow': 'var(--surface-border-glow)', // sky-500/30
        },
      },

      // Gradient color stops for use with bg-gradient-to-r
      gradientColorStops: {
        'primary-from': 'var(--gradient-primary-from)', // sky-400
        'primary-to': 'var(--gradient-primary-to)', // teal-600
        'accent-from': 'var(--gradient-accent-from)', // amber-400
        'accent-to': 'var(--gradient-accent-to)', // orange-500
        'success-from': 'var(--gradient-success-from)', // emerald-400
        'success-to': 'var(--gradient-success-to)', // green-600
      },

      // Typography
      fontFamily: {
        primary: ['var(--font-primary)'],
        mono: ['var(--font-mono)'],
      },

      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-normal)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-snug)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
      },

      fontWeight: {
        light: 'var(--font-light)',
        normal: 'var(--font-normal)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
      },

      // Spacing
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
      },

      // Border Radius
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-base)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      // Z-Index
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
        toast: 'var(--z-toast)',
      },

      // Animation
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'fade-out': 'fadeOut 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-out',
        // Subtle bounce for UI accents
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        // Cyberpunk spinner animations
        'spin-slow': 'spinSlow 3s linear infinite',
        'spin-slower': 'spinSlower 6s linear infinite',
        // Glow pulse for status indicators
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },

      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        // Cyberpunk spinner keyframes
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        spinSlower: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        // Glow pulse for live indicators
        glowPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },

      // Box shadows including glow effects
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-base)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        // Cyberpunk glow shadows
        'glow-primary': 'var(--shadow-glow-primary)',
        'glow-accent': 'var(--shadow-glow-accent)',
      },
    },
  },
  plugins: [],
}
