import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/types/**',
        '**/__tests__/**',
        'sst.config.ts',
        'drizzle.config.ts',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: [
      'src/**/__tests__/**/*.test.ts',
      'websocket/**/__tests__/**/*.test.ts',
      'moc-parts-lists/**/__tests__/**/*.test.ts',
      'scripts/**/__tests__/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist', '.sst'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/functions': path.resolve(__dirname, './src/functions'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/db': path.resolve(__dirname, './src/db'),
    },
  },
})
