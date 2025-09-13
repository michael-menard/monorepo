import type { Preview } from '@storybook/react';
import '../src/styles/globals.css'; // If you have global styles

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      description: {
        component: 'Gallery component system for displaying collections of items with various layouts and interactions.',
      },
    },
  },
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the gallery container',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the gallery is in a loading state',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
  },
};

export default preview;
