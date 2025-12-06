import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'

export default [
  js.configs.recommended,

  // Base configuration for all TypeScript/JavaScript files
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
        // Universal globals
        console: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,

        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // Browser globals - DOM
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',

        // DOM Element types
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLLabelElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLParagraphElement: 'readonly',

        // DOM Event types
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        WheelEvent: 'readonly',

        // DOM Utility types
        DOMRect: 'readonly',
        DOMPurify: 'readonly',

        // Crypto API
        crypto: 'readonly',

        // Alert
        alert: 'readonly',

        // Browser globals - Storage
        localStorage: 'readonly',
        sessionStorage: 'readonly',

        // Browser globals - Network
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        RequestInit: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',

        // Browser globals - Files
        File: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',

        // Browser globals - Performance
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        PerformanceEntry: 'readonly',
        PerformanceNavigationTiming: 'readonly',
        PerformancePaintTiming: 'readonly',

        // Browser globals - IndexedDB
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        IDBTransaction: 'readonly',
        IDBTransactionMode: 'readonly',
        IDBObjectStore: 'readonly',
        IDBRequest: 'readonly',

        // Browser globals - Service Worker
        ServiceWorker: 'readonly',
        ServiceWorkerRegistration: 'readonly',
        caches: 'readonly',
        CacheStorage: 'readonly',
        Cache: 'readonly',

        // Browser globals - Encoding
        btoa: 'readonly',
        atob: 'readonly',

        // Browser globals - Events
        Event: 'readonly',
        CustomEvent: 'readonly',
        EventTarget: 'readonly',

        // Browser globals - Elements
        HTMLElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        Image: 'readonly',

        // Browser globals - CSS
        getComputedStyle: 'readonly',

        // Browser globals - Types
        Storage: 'readonly',
        Node: 'readonly',
        NodeJS: 'readonly',

        // React globals
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
      import: importPlugin,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'off',

      // General JavaScript rules
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Import rules
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
        },
      ],
      'import/no-duplicates': 'error',
    },
  },

  // React/Frontend specific configuration
  {
    files: [
      'apps/web/**/*.{js,jsx,ts,tsx}',
      'packages/**/src/**/*.{jsx,tsx}',
      'packages/core/ui/**/*.{js,jsx,ts,tsx}',
      'packages/features/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        // Browser/DOM globals
        window: true,
        document: true,
        localStorage: true,
        sessionStorage: true,
        Headers: true,
        URLSearchParams: true,
        FormData: true,
        File: true,
        atob: true,
        btoa: true,
        fetch: true,
        // DOM types
        HTMLDivElement: true,
        HTMLImageElement: true,
        HTMLInputElement: true,
        HTMLButtonElement: true,
        KeyboardEvent: true,
        MouseEvent: true,
        IntersectionObserverEntry: true,
        IntersectionObserver: true,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-leaked-render': 'error',
      'react/jsx-no-bind': ['warn', { allowArrowFunctions: true }],
      'react/jsx-no-constructed-context-values': 'error',

      // React Hooks rules (disabled due to ESLint 9 compatibility issues)
      // 'react-hooks/rules-of-hooks': 'error',
      // 'react-hooks/exhaustive-deps': 'error',

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
    },
  },

  // Node.js/Backend specific configuration
  {
    files: ['apps/api/**/*.{js,ts}', 'packages/tools/**/*.{js,ts}', 'scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        // Node.js globals
        Buffer: true,
        process: true,
        require: true,
        module: true,
        __dirname: true,
        __filename: true,
        global: true,
        setImmediate: true,
        clearImmediate: true,
        // Node.js types
        NodeJS: true,
        Express: true,
        // Fetch API (available in Node 18+)
        fetch: true,
      },
    },
    rules: {
      // Node.js specific rules
      'no-console': 'off', // Console is fine in Node.js
      '@typescript-eslint/no-var-requires': 'off', // CommonJS requires are OK
    },
  },

  // Storybook files configuration
  {
    files: ['**/*.stories.{js,jsx,ts,tsx}', '**/stories/**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Relaxed rules for Storybook
      'react/jsx-no-bind': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // Configuration files
  {
    files: [
      '*.config.{js,ts}',
      '**/*.config.{js,ts}',
      'eslint.config.js',
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.js',
    ],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      // Relaxed rules for config files
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
    },
  },

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/.cache/**',
      '**/public/**',
      '**/static/**',
      '**/*.min.js',
      '**/vendor/**',
      '**/.env*',
      '**/pnpm-lock.yaml',
      '**/package-lock.json',
      '**/yarn.lock',
      '__docs__/**',
      'infrastructure/**',
      // Test files
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/*.integration.{js,jsx,ts,tsx}',
      '**/__tests__/**',
      '**/test/**',
      '**/tests/**',
    ],
  },

  prettierConfig,
]
