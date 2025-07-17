import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    // Default stories location
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // UI packages in monorepo
    '../packages/web/avatar-uploader/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../packages/web/file-upload/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../packages/ui/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../packages/auth/src/**/*.stories.@(js|jsx|ts|tsx)',
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
      // Avatar uploader package
      '@monorepo/avatar-uploader': path.resolve(__dirname, '../packages/web/avatar-uploader/src'),
      '@monorepo/file-upload': path.resolve(__dirname, '../packages/web/file-upload/src'),
      '@monorepo/ui': path.resolve(__dirname, '../packages/ui/src'),
      '@monorepo/auth': path.resolve(__dirname, '../packages/auth/src'),
    };
    
    return config;
  },
};

export default config;