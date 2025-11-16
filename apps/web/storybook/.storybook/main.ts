import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import type { StorybookConfig } from '@storybook/react-vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config: StorybookConfig = {
  stories: [
    // Local stories in this app
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    
    // Core UI packages
    '../../../../packages/core/ui/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../../../packages/core/auth/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../../../packages/core/accessibility/src/**/*.stories.@(js|jsx|ts|tsx)',
    
    // Feature packages
    '../../../../packages/features/gallery/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../../../packages/features/moc-instructions/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../../../packages/features/wishlist/src/**/*.stories.@(js|jsx|ts|tsx)',
    
    // Tool packages
    '../../../../packages/tools/upload/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@chromatic-com/storybook',
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  
  viteFinal: async (config) => {
    // Ensure resolve exists
    if (!config.resolve) {
      config.resolve = {}
    }

    // Ensure alias exists
    if (!config.resolve.alias) {
      config.resolve.alias = {}
    }

    // Add path aliases for monorepo packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@repo/ui': resolve(__dirname, '../../../../packages/core/ui/src'),
      '@repo/upload': resolve(__dirname, '../../../../packages/tools/upload/src'),
      '@repo/gallery': resolve(__dirname, '../../../../packages/features/gallery/src'),
      '@repo/moc-instructions': resolve(__dirname, '../../../../packages/features/moc-instructions/src'),
      '@repo/accessibility': resolve(__dirname, '../../../../packages/core/accessibility/src'),
      '@repo/wishlist': resolve(__dirname, '../../../../packages/features/wishlist/src'),
    }

    return config
  },
  
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  
  core: {
    disableTelemetry: true,
  },
}

export default config
