import rootConfig from '../../../tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [rootConfig],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
    '../../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
}; 