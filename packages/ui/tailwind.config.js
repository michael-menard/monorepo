import rootConfig from '../../tailwind.config.js';
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [rootConfig],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    extend: {
      // Package-specific extensions can go here
    },
  },
  plugins: [tailwindcssAnimate],
}; 