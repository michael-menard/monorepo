import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Disable DTS generation for now due to React 19 type issues
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@repo/app-component-library', 'lucide-react'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
