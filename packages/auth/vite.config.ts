import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Add this plugin to rewrite extensionless imports to .js
function addJsExtension() {
  return {
    name: 'add-js-extension',
    generateBundle(_: Record<string, unknown>, bundle: Record<string, any>) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          file.code = file.code.replace(
            /from\s+(['"])(\.{1,2}\/[^'".]+?)\1/g,
            (match: string, quote: string, importPath: string) => {
              // Only add .js if not already present and not a .css or .json import
              if (!importPath.endsWith('.js') && !importPath.endsWith('.css') && !importPath.endsWith('.json')) {
                return `from ${quote}${importPath}.js${quote}`;
              }
              return match;
            }
          );
        }
      }
    },
  };
}

export default {
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Auth',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-hook-form', '@hookform/resolvers', 'zod', 'clsx', 'tailwind-merge'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-hook-form': 'ReactHookForm',
          '@hookform/resolvers': 'HookformResolvers',
          zod: 'zod',
          clsx: 'clsx',
          'tailwind-merge': 'tailwindMerge',
        },
      },
      plugins: [addJsExtension()], // <-- Add the plugin here
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}; 