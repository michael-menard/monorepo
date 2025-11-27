import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      dts({
        insertTypesEntry: true,
        exclude: ['**/*.stories.ts', '**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx'],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      lib: {
        entry: {
          'index': path.resolve(__dirname, 'src/index.ts'),
          'alert': path.resolve(__dirname, 'src/alert.tsx'),
          'avatar': path.resolve(__dirname, 'src/avatar.tsx'),
          'badge': path.resolve(__dirname, 'src/badge.tsx'),
          'button': path.resolve(__dirname, 'src/button.tsx'),
          'card': path.resolve(__dirname, 'src/card.tsx'),
          'checkbox': path.resolve(__dirname, 'src/checkbox.tsx'),
          'dialog': path.resolve(__dirname, 'src/dialog.tsx'),
          'dropdown-menu': path.resolve(__dirname, 'src/dropdown-menu.tsx'),
          'form': path.resolve(__dirname, 'src/form.tsx'),
          'input': path.resolve(__dirname, 'src/input.tsx'),
          'label': path.resolve(__dirname, 'src/label.tsx'),
          'popover': path.resolve(__dirname, 'src/popover.tsx'),
          'select': path.resolve(__dirname, 'src/select.tsx'),
          'separator': path.resolve(__dirname, 'src/separator.tsx'),
          'switch': path.resolve(__dirname, 'src/switch.tsx'),
          'tabs': path.resolve(__dirname, 'src/tabs.tsx'),
          'tooltip': path.resolve(__dirname, 'src/tooltip.tsx'),
          'guided-tour': path.resolve(__dirname, 'src/guided-tour.tsx'),
          'loading-spinner/index': path.resolve(__dirname, 'src/loading-spinner/index.tsx'),
          'progress': path.resolve(__dirname, 'src/progress.tsx'),
          'lib/utils': path.resolve(__dirname, 'src/lib/utils.ts'),
          'providers/ThemeProvider': path.resolve(__dirname, 'src/providers/ThemeProvider.tsx'),
        },
        formats: ['es'],
      },
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          /^@radix-ui\/.*/,
          'class-variance-authority',
          'clsx',
          'framer-motion',
          'lucide-react',
          'tailwind-merge',
          'tailwindcss',
          'tailwindcss-animate',
          '@reduxjs/toolkit',
          'react-hook-form',
          '@hookform/resolvers',
          'zod',
          'browser-image-compression',
          'react-dropzone',
          'react-easy-crop',
          'cmdk',
          'i18next',
          'react-i18next',
          'next-themes',
          'sonner',
        ],
        output: {
          // Ensure proper file extensions for ES modules
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
    },
    define: {
      __DEV__: mode === 'development',
    },
  }
})
