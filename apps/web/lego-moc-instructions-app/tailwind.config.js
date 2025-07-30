import sharedPreset from '@monorepo/shared/tailwind-preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
    '../../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [sharedPreset],
  plugins: [],
}; 