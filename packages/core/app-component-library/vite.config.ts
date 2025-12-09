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
        exclude: [
          '**/*.stories.ts',
          '**/*.stories.tsx',
          '**/*.test.ts',
          '**/*.test.tsx',
          'src/__tests__/**',
          'src/__stories__/**',
          'src/__examples__/**',
        ],
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
          // Main entry point
          index: path.resolve(__dirname, 'src/index.ts'),

          // App components - inputs
          'inputs/AppInput': path.resolve(__dirname, 'src/inputs/AppInput.tsx'),
          'inputs/AppLabel': path.resolve(__dirname, 'src/inputs/AppLabel.tsx'),
          'inputs/AppSelect': path.resolve(__dirname, 'src/inputs/AppSelect.tsx'),
          'inputs/AppTextarea': path.resolve(__dirname, 'src/inputs/AppTextarea.tsx'),

          // App components - forms
          'forms/AppForm': path.resolve(__dirname, 'src/forms/AppForm.tsx'),
          'forms/FormSection': path.resolve(__dirname, 'src/forms/FormSection.tsx'),
          'forms/form-error-message': path.resolve(__dirname, 'src/forms/form-error-message.tsx'),
          'forms/validation-messages': path.resolve(__dirname, 'src/forms/validation-messages.ts'),

          // App components - cards
          'cards/stats-cards': path.resolve(__dirname, 'src/cards/stats-cards.tsx'),

          // App components - avatars
          'avatars/AppAvatar': path.resolve(__dirname, 'src/avatars/AppAvatar.tsx'),

          // App components - feedback
          'feedback/skeleton': path.resolve(__dirname, 'src/feedback/skeleton.tsx'),
          'feedback/loading-spinner': path.resolve(
            __dirname,
            'src/feedback/loading-spinner/index.tsx',
          ),
          'feedback/progress-indicator': path.resolve(
            __dirname,
            'src/feedback/progress-indicator.tsx',
          ),

          // App components - errors
          'errors/error-boundary': path.resolve(__dirname, 'src/errors/error-boundary.tsx'),
          'errors/error-boundary-specialized': path.resolve(
            __dirname,
            'src/errors/error-boundary-specialized.tsx',
          ),

          // App components - notifications
          'notifications/sonner': path.resolve(__dirname, 'src/notifications/sonner.tsx'),
          'notifications/toast-utils': path.resolve(__dirname, 'src/notifications/toast-utils.tsx'),

          // App components - selects
          'selects/multi-select': path.resolve(__dirname, 'src/selects/multi-select.tsx'),

          // App components - dialogs
          'dialogs/ConfirmationDialog': path.resolve(
            __dirname,
            'src/dialogs/ConfirmationDialog.tsx',
          ),

          // App components - data
          'data/AppDataTable': path.resolve(__dirname, 'src/data/AppDataTable.tsx'),
          'data/TabPanel': path.resolve(__dirname, 'src/data/TabPanel.tsx'),

          // App components - content
          'content/AppSafeContent': path.resolve(__dirname, 'src/content/AppSafeContent.tsx'),
          'content/PageHeader': path.resolve(__dirname, 'src/content/PageHeader.tsx'),

          // App components - buttons
          'buttons/custom-button': path.resolve(__dirname, 'src/buttons/custom-button.tsx'),

          // App components - tour
          'tour/guided-tour': path.resolve(__dirname, 'src/tour/guided-tour.tsx'),

          // Hooks
          'hooks/useLoadingStates': path.resolve(__dirname, 'src/hooks/useLoadingStates.ts'),
          'hooks/useToast': path.resolve(__dirname, 'src/hooks/useToast.ts'),

          // Utilities
          'lib/sanitization': path.resolve(__dirname, 'src/lib/sanitization.ts'),
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
          /^@repo\/.*/,
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
          'dompurify',
        ],
        output: {
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
