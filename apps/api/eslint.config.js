// @ts-check
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // SST globals
        $config: 'readonly',
        $app: 'readonly',
        sst: 'readonly',
        aws: 'readonly',
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: [
      '**/core/database/client.ts',
      '**/core/database/retry.ts',
      '**/core/database/setup-umami.ts',
      '**/core/observability/tracing.ts',
      '**/core/observability/metrics.ts',
      '**/core/observability/web-vitals.ts',
      '**/core/storage/retry.ts',
      '**/core/utils/lambda-wrapper.ts',
      '**/core/utils/retry.ts',
      '**/core/cache/redis.ts',
      '**/endpoints/health/handler.ts',
      '**/endpoints/moc-instructions/_shared/*.ts',
      '**/endpoints/moc-instructions/*/handler.ts',
      '**/endpoints/moc-parts-lists/parse/handler.ts',
      '**/endpoints/websocket/_shared/message-types.ts',
      '**/endpoints/websocket/connect/handler.ts',
      '**/sst.config.ts',
      '**/layers/sst-config-example.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: ['dist', '.sst', 'node_modules', '**/*.d.ts', 'drizzle', 'scripts/**/*'],
  },
]
