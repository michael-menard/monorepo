import rootConfig from '../../tailwind.config.js';
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [rootConfig],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../apps/**/src/**/*.{ts,tsx}',
  ],
  prefix: '',
  safelist: [
    'bg-background',
    'text-foreground',
    'border-border',
    'border-input',
    'bg-primary',
    'text-primary-foreground',
    'bg-secondary',
    'text-secondary-foreground',
    'bg-muted',
    'text-muted-foreground',
    'bg-accent',
    'text-accent-foreground',
    'bg-card',
    'text-card-foreground',
    'ring-ring',
    'bg-destructive',
    'text-destructive-foreground',
  ],
  theme: {
    extend: {
      // Package-specific extensions can go here
    },
  },
  plugins: [tailwindcssAnimate],
}; 