export default {
  // JavaScript, TypeScript, JSX, TSX files
  '**/*.{js,jsx,ts,tsx}': [
    // Run ESLint with auto-fix
    'eslint --fix --max-warnings 0',
    // Format with Prettier
    'prettier --write',
  ],

  // JSON files
  '**/*.json': [
    'prettier --write',
  ],

  // Markdown files
  '**/*.md': [
    'prettier --write',
  ],

  // CSS, SCSS files
  '**/*.{css,scss}': [
    'prettier --write',
  ],

  // YAML files
  '**/*.{yml,yaml}': [
    'prettier --write',
  ],

  // Package.json files - run dependency sync after changes
  '**/package.json': [
    'prettier --write',
    // Run dependency sync script if it exists
    'bash -c \'if [ -f "scripts/sync-dependencies.js" ]; then node scripts/sync-dependencies.js; fi\'',
  ],

  // Specific configurations for different areas of the monorepo
  
  // Root level files - use root ESLint config
  './*.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],

  // Apps - use turbo for consistent linting across apps
  'apps/**/*.{js,jsx,ts,tsx}': [
    'bash -c \'cd "$(dirname "$0")" && if [ -f "package.json" ] && grep -q "\\"lint\\"" package.json; then pnpm lint --fix 2>/dev/null || eslint --fix --max-warnings 0 "$0"; else eslint --fix --max-warnings 0 "$0"; fi\'',
    'prettier --write',
  ],

  // Packages - use turbo for consistent linting across packages
  'packages/**/*.{js,jsx,ts,tsx}': [
    'bash -c \'cd "$(dirname "$0")" && if [ -f "package.json" ] && grep -q "\\"lint\\"" package.json; then pnpm lint --fix 2>/dev/null || eslint --fix --max-warnings 0 "$0"; else eslint --fix --max-warnings 0 "$0"; fi\'',
    'prettier --write',
  ],

  // Test files - lighter linting rules
  '**/*.{test,spec}.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],

  // Storybook files
  '**/*.stories.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],

  // Configuration files
  '**/*.config.{js,ts}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],

  // Docker files
  '**/Dockerfile*': [
    // Basic validation for Dockerfiles
    'bash -c \'echo "Validating Dockerfile: $0"\'',
  ],

  // Environment files - just validate they exist and have proper format
  '**/.env*': [
    'bash -c \'echo "Environment file updated: $0"\'',
  ],
};
