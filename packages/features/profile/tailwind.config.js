import rootConfig from '../../tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [rootConfig],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  theme: {
    extend: {
      // Package-specific extensions can go here
    },
  },
  plugins: [],
}; 