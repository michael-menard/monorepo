import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    wishlist: 'src/wishlist.ts',
    'moc-instructions': 'src/moc-instructions.ts',
    profile: 'src/profile.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['@repo/features'],
})
