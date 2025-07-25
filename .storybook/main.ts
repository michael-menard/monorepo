import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    // Default stories location
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // UI packages in monorepo
    '../packages/ui/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../packages/auth/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../features/profile/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../features/mock-instructions/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (config) => {
    // Ensure resolve exists
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Ensure alias exists
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Add path aliases for monorepo packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@repo/ui': path.resolve(__dirname, '../packages/ui/src'),
      '@repo/auth': path.resolve(__dirname, '../packages/auth/src'),
      '@repo/profile': path.resolve(__dirname, '../features/profile/src'),
    };
    
    return config;
  },
};

export default config;