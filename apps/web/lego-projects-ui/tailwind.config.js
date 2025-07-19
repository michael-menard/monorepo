import sharedConfig from '../../../tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...sharedConfig,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/*/src/**/*.{js,ts,jsx,tsx}",
  ],
}; 