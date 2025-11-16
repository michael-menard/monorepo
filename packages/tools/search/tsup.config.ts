import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disabled due to drizzle-orm peer dependency typing issues
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
})
