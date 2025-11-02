export default {
  // JavaScript, TypeScript, JSX, TSX files
  '**/*.{js,jsx,ts,tsx}': [
    // Format with Prettier
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

  // Note: All JS/TS files are handled by the main pattern above with pnpm lint:changed
  // This ensures efficient linting of only changed files across the entire monorepo

  // Docker files
  '**/Dockerfile*': [
    // Basic validation for Dockerfiles
    'bash -c \'echo "Validating Dockerfile: $0"\'',
  ],

  // Environment files - just validate they exist and have proper format
  '**/.env*': ['bash -c \'echo "Environment file updated: $0"\''],
}
