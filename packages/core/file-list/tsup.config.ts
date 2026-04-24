import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@repo/app-component-library', 'lucide-react'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
