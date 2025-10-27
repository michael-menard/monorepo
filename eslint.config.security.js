import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import security from 'eslint-plugin-security'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        WheelEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        DOMRect: 'readonly',
        Node: 'readonly',
        React: 'readonly',
        // Node.js globals
        process: 'readonly',
        global: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        // File API
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      security: security,
    },
    rules: {
      // Core security rules that work with ESLint 9
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-unsafe-finally': 'error',

      // TypeScript security
      '@typescript-eslint/no-explicit-any': 'error',

      // Additional security best practices
      'no-debugger': 'error',
      'no-process-exit': 'error',

      // Prevent prototype pollution
      'no-param-reassign': 'error',

      // eslint-plugin-security rules (ESLint 9 compatible subset only)
      'security/detect-eval-with-expression': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-bidi-characters': 'error',

      // Disabled rules with ESLint 9 compatibility issues
      // 'security/detect-object-injection': 'warn', // Has context.getScope issues
      // 'security/detect-non-literal-regexp': 'warn', // Has context.getScope issues
      // 'security/detect-possible-timing-attacks': 'warn', // Has context.getScope issues
      // 'security/detect-non-literal-require': 'error', // Has context.getScope issues
      // 'security/detect-non-literal-fs-filename': 'error', // Has context.getScope issues
      // 'security/detect-child-process': 'warn', // Has context.getScope issues
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.config.js',
      '*.config.ts',
      '.storybook/',
      'scripts/',
      '**/__tests__/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.stories.*',
      '**/test/**',
      '**/tests/**',
      '**/*.d.ts',
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
    ],
  },
]
