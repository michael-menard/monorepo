import sharedPreset from '@monorepo/shared/tailwind-preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [sharedPreset],
  plugins: [],
}; 