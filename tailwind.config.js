/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // Design system colors from __design__/styles/css/main.css
      colors: {
        // ShadCN UI colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
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
        
        // Design system gray scale
        gray: {
          0: 'var(--gray-0)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          850: 'var(--gray-850)',
          900: 'var(--gray-900)',
          1000: 'var(--gray-1000)',
          1100: 'var(--gray-1100)',
        },
        
        // Design system accent colors
        blue: 'var(--blue-accent)',
        green: 'var(--green-accent)',
        violet: 'var(--violet-accent)',
        orange: 'var(--orange-accent)',
        yellow: 'var(--yellow-accent)',
        indigo: 'var(--indigo-accent)',
        emerald: 'var(--emerald-accent)',
        fuchsia: 'var(--fuchsia-accent)',
        red: 'var(--red-accent)',
        sky: 'var(--sky-accent)',
        pink: 'var(--pink-accent)',
        neutral: 'var(--neutral-accent)',
        
        // Design system color system
        'color-brands': 'var(--color-brands)',
        'neutral-bg': 'var(--neutral-bg)',
        'dark-neutral-bg': 'var(--dark-neutral-bg)',
        'dark-neutral-border': 'var(--dark-neutral-border)',
        
        // Dark mode gray variants
        'gray-dark-0': 'var(--dark-gray-0)',
        'gray-dark-100': 'var(--dark-gray-100)',
        'gray-dark-200': 'var(--dark-gray-200)',
        'gray-dark-300': 'var(--dark-gray-300)',
        'gray-dark-400': 'var(--dark-gray-400)',
        'gray-dark-500': 'var(--dark-gray-500)',
        'gray-dark-600': 'var(--dark-gray-600)',
        'gray-dark-700': 'var(--dark-gray-700)',
        'gray-dark-800': 'var(--dark-gray-800)',
        'gray-dark-850': 'var(--dark-gray-850)',
        'gray-dark-900': 'var(--dark-gray-900)',
        'gray-dark-1000': 'var(--dark-gray-1000)',
        'gray-dark-1100': 'var(--dark-gray-1100)',
        
        // Additional design system colors
        'green-900': 'var(--green-900)',
        'green-500': 'var(--green-500)',
        'green-100': 'var(--green-100)',
        'green-1000': 'var(--green-1000)',
        'orange-100': 'var(--orange-100)',
        'orange-500': 'var(--orange-500)',
        'orange-900': 'var(--orange-900)',
        
        // Background colors
        'bg-1': 'var(--bg-1)',
        'bg-2': 'var(--bg-2)',
        'bg-3': 'var(--bg-3)',
        'bg-4': 'var(--bg-4)',
        'bg-5': 'var(--bg-5)',
        'bg-6': 'var(--bg-6)',
        'bg-7': 'var(--bg-7)',
        'bg-8': 'var(--bg-8)',
        'bg-9': 'var(--bg-9)',
        'bg-10': 'var(--bg-10)',
      },
      
      // Design system typography from __design__/tailwind.config.js
      fontSize: {
        'header-1': ['40px', '60px'],
        'header-2': ['32px', '39px'],
        'header-3': ['28px', '34px'],
        'header-4': ['28px', '34px'],
        'header-5': ['24px', '30px'],
        'header-6': ['20px', '18px'],
        'header-7': ['18px', '22px'],
        normal: ['14px', '16px'],
        subtitle: ['16px', '16px'],
        'subtitle-semibold': ['16px', '20px'],
        'btn-label': ['16px', '16px'],
        'mini-btn-label': ['14px', '12px'],
        desc: ['12px', '16px'],
        'mini-desc': ['9px', '11px'],
      },
      
      // Design system font families
      fontFamily: {
        inter: 'Inter',
        poppins: 'Poppins, system-ui, sans-serif',
      },
      
      // Additional screen breakpoints
      screen: {
        xs: '500px',
      },
      
      // Border radius
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      
      // Keyframes
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      
      // Animations
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
  ],
}; 