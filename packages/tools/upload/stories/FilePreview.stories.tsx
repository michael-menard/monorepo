import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FilePreview } from '../src/components/FilePreview/FilePreview.tsx';
import type { UploadFile } from '../src/types/index.js';

// Mock file objects for stories
const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const createUploadFile = (
  name: string, 
  type: string, 
  size: number, 
  status: UploadFile['status'] = 'pending',
  progress: number = 0,
  error?: string
): UploadFile => ({
  id: crypto.randomUUID(),
  file: createMockFile(name, type, size),
  status,
  progress,
  error,
});

const meta: Meta<typeof FilePreview> = {
  title: 'Upload/FilePreview',
  component: FilePreview,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'FilePreview component displays file information, preview, and upload status.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onRemove: {
      action: 'onRemove',
      description: 'Callback when remove button is clicked',
    },
  },
  args: {
    onRemove: action('onRemove'),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ImagePending: Story = {
  args: {
    file: createUploadFile('vacation-photo.jpg', 'image/jpeg', 2.5 * 1024 * 1024),
  },
  parameters: {
    docs: {
      description: {
        story: 'Image file in pending state, ready for upload.',
      },
    },
  },
};

export const ImageUploading: Story = {
  args: {
    file: createUploadFile('profile-picture.png', 'image/png', 1.2 * 1024 * 1024, 'uploading', 65),
  },
  parameters: {
    docs: {
      description: {
        story: 'Image file currently uploading with progress indicator.',
      },
    },
  },
};

export const ImageCompleted: Story = {
  args: {
    file: {
      ...createUploadFile('banner-image.jpg', 'image/jpeg', 3.8 * 1024 * 1024, 'completed', 100),
      url: 'https://example.com/uploads/banner-image.jpg',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Image file successfully uploaded.',
      },
    },
  },
};

export const ImageError: Story = {
  args: {
    file: createUploadFile(
      'corrupted-image.jpg', 
      'image/jpeg', 
      15 * 1024 * 1024, 
      'error', 
      0, 
      'File size exceeds maximum limit'
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Image file with upload error.',
      },
    },
  },
};

export const DocumentPending: Story = {
  args: {
    file: createUploadFile('report.pdf', 'application/pdf', 5.2 * 1024 * 1024),
  },
  parameters: {
    docs: {
      description: {
        story: 'PDF document file ready for upload.',
      },
    },
  },
};

export const DocumentUploading: Story = {
  args: {
    file: createUploadFile('presentation.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 12.8 * 1024 * 1024, 'uploading', 42),
  },
  parameters: {
    docs: {
      description: {
        story: 'PowerPoint document currently uploading.',
      },
    },
  },
};

export const VideoFile: Story = {
  args: {
    file: createUploadFile('demo-video.mp4', 'video/mp4', 25.6 * 1024 * 1024, 'processing', 100),
  },
  parameters: {
    docs: {
      description: {
        story: 'Video file in processing state after upload.',
      },
    },
  },
};

export const AudioFile: Story = {
  args: {
    file: createUploadFile('podcast-episode.mp3', 'audio/mpeg', 8.4 * 1024 * 1024, 'completed', 100),
  },
  parameters: {
    docs: {
      description: {
        story: 'Audio file successfully uploaded.',
      },
    },
  },
};

export const LargeFile: Story = {
  args: {
    file: createUploadFile('database-backup.sql', 'application/sql', 156.7 * 1024 * 1024, 'uploading', 23),
  },
  parameters: {
    docs: {
      description: {
        story: 'Large file with detailed size information.',
      },
    },
  },
};

export const WithoutRemoveButton: Story = {
  args: {
    file: createUploadFile('readonly-file.txt', 'text/plain', 1024, 'completed', 100),
    onRemove: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'File preview without remove functionality.',
      },
    },
  },
};
