import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import type { StorybookConfig } from '@storybook/react-vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // TODO: Include stories from the component library once their imports are fixed
    // '../../../../packages/core/app-component-library/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@chromatic-com/storybook',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async config => {
    const { mergeConfig } = await import('vite')

    return mergeConfig(config, {
      resolve: {
        alias: {
          '@repo/ui': resolve(__dirname, '../../../../packages/core/app-component-library/src'),
          '@repo/app-component-library': resolve(
            __dirname,
            '../../../../packages/core/app-component-library/src',
          ),
          '@repo/design-system': resolve(__dirname, '../../../../packages/core/design-system/src'),
          '@repo/logger': resolve(__dirname, '../../../../packages/core/logger/src'),
        },
      },
    })
  },
  docs: {},
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
}

export default config
