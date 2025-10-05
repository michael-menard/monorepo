import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

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
        browser: true,
        es2021: true,
        node: true,
        process: true,
        module: true,
        // DOM globals
        window: true,
        document: true,
        console: true,
        setTimeout: true,
        clearTimeout: true,
        localStorage: true,
        Headers: true,
        URLSearchParams: true,
        FormData: true,
        File: true,
        atob: true,
        // DOM types
        HTMLDivElement: true,
        HTMLImageElement: true,
        KeyboardEvent: true,
        IntersectionObserverEntry: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '.turbo/',
      'coverage/',
      '*.config.js',
      '*.config.ts',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/__tests__/**',
      '**/test/**',
      '**/tests/**',
      '**/*.stories.{js,jsx,ts,tsx}',
    ],
  },
  prettierConfig,
]; 