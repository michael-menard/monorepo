import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { UploadArea } from '../src/components/UploadArea/UploadArea.tsx';
import { useUpload } from '../src/hooks/useUpload.js';
import { UPLOAD_PRESETS } from '../src/utils/presets.js';

// Wrapper component to provide upload hook
const UploadAreaWrapper = (props: any) => {
  const upload = useUpload({
    onUploadStart: action('onUploadStart'),
    onUploadProgress: action('onUploadProgress'),
    onUploadComplete: action('onUploadComplete'),
    onUploadError: action('onUploadError'),
    onFilesChange: action('onFilesChange'),
  });

  return <UploadArea upload={upload} {...props} />;
};

const meta: Meta<typeof UploadAreaWrapper> = {
  title: 'Upload/UploadArea',
  component: UploadAreaWrapper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'The UploadArea component provides drag-and-drop file selection interface.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'avatar'],
      description: 'Visual variant of the upload area',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disable the upload area',
    },
    config: {
      control: { type: 'object' },
      description: 'Upload configuration',
    },
    preset: {
      control: { type: 'select' },
      options: Object.keys(UPLOAD_PRESETS),
      description: 'Predefined upload preset',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default upload area with drag-and-drop interface.',
      },
    },
  },
};

export const Avatar: Story = {
  args: {
    variant: 'avatar',
    preset: 'avatar',
  },
  parameters: {
    docs: {
      description: {
        story: 'Circular avatar upload area for profile pictures.',
      },
    },
  },
};

export const ImageOnly: Story = {
  args: {
    config: {
      acceptedFileTypes: ['image/*'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload area configured for images only.',
      },
    },
  },
};

export const SingleFile: Story = {
  args: {
    config: {
      multiple: false,
      maxFiles: 1,
      acceptedFileTypes: ['application/pdf'],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload area for single PDF file selection.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled upload area.',
      },
    },
  },
};

export const WithPreset: Story = {
  args: {
    preset: 'gallery',
  },
  parameters: {
    docs: {
      description: {
        story: 'Upload area using the gallery preset configuration.',
      },
    },
  },
};
