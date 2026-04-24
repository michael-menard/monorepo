import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'src/__tests__/**', 'src/test/**'],
    }),
  ],
  build: {
    lib: {
      entry: {
        'schemas/cache': resolve(__dirname, 'src/schemas/cache.ts'),
        'utils/memoryCache': resolve(__dirname, 'src/utils/memoryCache.ts'),
        'utils/storageCache': resolve(__dirname, 'src/utils/storageCache.ts'),
        'utils/imageCache': resolve(__dirname, 'src/utils/imageCache.ts'),
        'utils/rtkQueryCache': resolve(__dirname, 'src/utils/rtkQueryCache.ts'),
        'utils/serverlessCache': resolve(__dirname, 'src/utils/serverlessCache.ts'),
        'utils/performanceMonitor': resolve(__dirname, 'src/utils/performanceMonitor.ts'),
        'utils/serverlessCacheManager': resolve(__dirname, 'src/utils/serverlessCacheManager.ts'),
        'managers/IntelligentCacheManager': resolve(
          __dirname,
          'src/managers/IntelligentCacheManager.ts',
        ),
        'rtk/IntelligentRTKCacheEnhancer': resolve(
          __dirname,
          'src/rtk/IntelligentRTKCacheEnhancer.ts',
        ),
        'analytics/CacheAnalytics': resolve(__dirname, 'src/analytics/CacheAnalytics.ts'),
        'hooks/useServerlessCache': resolve(__dirname, 'src/hooks/useServerlessCache.ts'),
        'hooks/useIntelligentCache': resolve(__dirname, 'src/hooks/useIntelligentCache.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['zod', 'react', 'react-dom', /^@repo\/.*/],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
