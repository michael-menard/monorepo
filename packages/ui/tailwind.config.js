import sharedPreset from '@monorepo/shared/tailwind-preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../apps/**/src/**/*.{ts,tsx}',
  ],
  presets: [sharedPreset],
  plugins: [],
}; 