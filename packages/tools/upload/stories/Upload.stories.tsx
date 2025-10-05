import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Upload } from '../src/components/Upload/Upload.tsx';
import { UPLOAD_PRESETS } from '../src/utils/presets.js';

const meta: Meta<typeof Upload> = {
  title: 'Upload/Upload',
  component: Upload,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'The main Upload component that can render in different modes: inline, modal, or avatar.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: { type: 'select' },
      options: ['inline', 'modal', 'avatar'],
      description: 'Display mode for the upload component',
    },
    preset: {
      control: { type: 'select' },
      options: Object.keys(UPLOAD_PRESETS),
      description: 'Predefined upload configuration preset',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disable the upload functionality',
    },
    config: {
      control: { type: 'object' },
      description: 'Custom upload configuration',
    },
  },
  args: {
    onUploadStart: action('onUploadStart'),
    onUploadProgress: action('onUploadProgress'),
    onUploadComplete: action('onUploadComplete'),
    onUploadError: action('onUploadError'),
    onFilesChange: action('onFilesChange'),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  args: {
    mode: 'inline',
  },
  parameters: {
    docs: {
      description: {
        story: 'Inline mode renders the upload area directly in the component tree.',
      },
    },
  },
};

export const Modal: Story = {
  args: {
    mode: 'modal',
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal mode renders a button that opens the upload interface in a modal dialog.',
      },
    },
  },
};

export const Avatar: Story = {
  args: {
    mode: 'avatar',
    preset: 'avatar',
  },
  parameters: {
    docs: {
      description: {
        story: 'Avatar mode is specialized for profile picture uploads with a circular interface.',
      },
    },
  },
};

export const WithImagePreset: Story = {
  args: {
    mode: 'inline',
    preset: 'gallery',
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload configured with the gallery preset for image uploads.',
      },
    },
  },
};

export const WithDocumentPreset: Story = {
  args: {
    mode: 'inline',
    preset: 'document',
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload configured with the document preset for file uploads.',
      },
    },
  },
};

export const CustomConfig: Story = {
  args: {
    mode: 'inline',
    config: {
      maxFiles: 3,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      acceptedFileTypes: ['image/jpeg', 'image/png'],
      multiple: true,
      autoUpload: false,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload with custom configuration: max 3 files, 5MB limit, JPEG/PNG only.',
      },
    },
  },
};

export const SingleFile: Story = {
  args: {
    mode: 'inline',
    config: {
      maxFiles: 1,
      multiple: false,
      acceptedFileTypes: ['image/*'],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload configured for single image file selection.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    mode: 'inline',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload component in disabled state.',
      },
    },
  },
};

export const WithCustomButton: Story = {
  args: {
    mode: 'modal',
    children: (
      <button className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        📁 Choose Files
      </button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal mode with custom trigger button.',
      },
    },
  },
};
