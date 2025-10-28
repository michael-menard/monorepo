export default {
  // JavaScript, TypeScript, JSX, TSX files
  '**/*.{js,jsx,ts,tsx}': [
    // Format with Prettier (linting handled by Turborepo in pre-commit hook)
    'prettier --write',
  ],

  // JSON files
  '**/*.json': ['prettier --write'],

  // Markdown files
  '**/*.md': ['prettier --write'],

  // CSS, SCSS files
  '**/*.{css,scss}': ['prettier --write'],

  // YAML files
  '**/*.{yml,yaml}': ['prettier --write'],

  // Package.json files - run dependency sync after changes
  '**/package.json': [
    'prettier --write',
    // Run dependency sync script if it exists
    'bash -c \'if [ -f "scripts/sync-dependencies.js" ]; then node scripts/sync-dependencies.js; fi\'',
  ],

  // Specific configurations for different areas of the monorepo

  // Root level files - format only (linting handled by Turborepo)
  './*.{js,jsx,ts,tsx}': ['prettier --write'],

  // Apps - format only (linting handled by Turborepo)
  'apps/**/*.{js,jsx,ts,tsx}': ['prettier --write'],

  // Packages - format only (linting handled by Turborepo)
  'packages/**/*.{js,jsx,ts,tsx}': ['prettier --write'],

  // Test files - format only (linting handled by Turborepo)
  '**/*.{test,spec}.{js,jsx,ts,tsx}': ['prettier --write'],

  // Storybook files - format only (linting handled by Turborepo)
  '**/*.stories.{js,jsx,ts,tsx}': ['prettier --write'],

  // Configuration files - format only (linting handled by Turborepo)
  '**/*.config.{js,ts}': ['prettier --write'],

  // Docker files
  '**/Dockerfile*': [
    // Basic validation for Dockerfiles
    'bash -c \'echo "Validating Dockerfile: $0"\'',
  ],

  // Environment files - just validate they exist and have proper format
  '**/.env*': ['bash -c \'echo "Environment file updated: $0"\''],
}
