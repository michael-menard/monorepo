#!/usr/bin/env node

/**
 * Script to set up Tailwind CSS configuration for new packages
 * Usage: node scripts/setup-tailwind.js <package-name>
 */

/* eslint-env node */
/* global process */
import fs from 'fs';
import path from 'path';

const packageName = process.argv[2];

if (!packageName) {
  console.error('Usage: node scripts/setup-tailwind.js <package-name>');
  console.error('Example: node scripts/setup-tailwind.js my-new-package');
  process.exit(1);
}

const packagePath = path.join(process.cwd(), 'packages', packageName);

if (!fs.existsSync(packagePath)) {
  console.error(`Package directory not found: ${packagePath}`);
  process.exit(1);
}

const tailwindConfigPath = path.join(packagePath, 'tailwind.config.js');

if (fs.existsSync(tailwindConfigPath)) {
  console.log(`Tailwind config already exists at: ${tailwindConfigPath}`);
  process.exit(0);
}

const tailwindConfigContent = `import rootConfig from '../../tailwind.config.js';

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
`;

fs.writeFileSync(tailwindConfigPath, tailwindConfigContent);

console.log(`✅ Created Tailwind config for package: ${packageName}`);
console.log(`📁 Location: ${tailwindConfigPath}`);
console.log('');
console.log('Next steps:');
console.log('1. Import the shared styles in your main CSS file:');
console.log('   @import "../../src/styles/globals.css";');
console.log('2. Add Tailwind dependencies to your package.json if needed');
console.log('3. Start using the design system tokens in your components!'); 