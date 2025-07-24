import sharedConfig from '../../tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...sharedConfig,
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
}; 