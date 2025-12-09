import type { Preview } from '@storybook/react'

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
        component:
          'Upload components for file and image uploads with drag-and-drop, progress tracking, and validation.',
      },
    },
  },
  argTypes: {
    mode: {
      control: { type: 'select' },
      options: ['inline', 'modal', 'avatar'],
      description: 'Upload component display mode',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disable the upload component',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
}

export default preview
