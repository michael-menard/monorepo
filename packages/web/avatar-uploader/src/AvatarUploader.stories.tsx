/// <reference types="vite/client" />

import type { Meta, StoryObj } from '@storybook/react';
import AvatarUploader from './index.tsx';

const meta: Meta<typeof AvatarUploader> = {
  title: 'Components/AvatarUploader',
  component: AvatarUploader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    userId: {
      control: 'text',
      description: 'The user ID for the avatar upload',
    },
    baseUrl: {
      control: 'text',
      description: 'Base URL for the API endpoint',
    },
    onSuccess: {
      action: 'success',
      description: 'Callback called when upload completes successfully',
    },
    onError: {
      action: 'error',
      description: 'Callback called when upload fails',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userId: 'user123',
    baseUrl: 'http://localhost:3000',
  },
};

export const WithCallbacks: Story = {
  args: {
    userId: 'user456',
    baseUrl: 'https://api.example.com',
    onSuccess: () => {
      console.log('Avatar uploaded successfully!');
    },
    onError: (error: Error) => {
      console.error('Upload failed:', error);
    },
  },
};

export const DevelopmentEnvironment: Story = {
  args: {
    userId: 'dev-user',
    baseUrl: 'http://localhost:8000',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example for development environment with local API server.',
      },
    },
  },
};

export const ProductionEnvironment: Story = {
  args: {
    userId: 'prod-user',
    baseUrl: 'https://api.yourapp.com',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example for production environment with deployed API.',
      },
    },
  },
}; 