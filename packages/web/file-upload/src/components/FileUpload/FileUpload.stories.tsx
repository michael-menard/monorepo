import { FileUpload } from './index';

export default {
  title: 'Components/FileUpload',
  component: FileUpload,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A comprehensive file upload component with drag-and-drop support, progress tracking, and security validation.',
      },
    },
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {},
};

export const WithInstructions = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'The FileUpload component provides a complete file upload experience with drag-and-drop functionality, progress tracking, and comprehensive security validation.',
      },
    },
  },
};

export const UploadZone = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'The upload zone supports both click-to-select and drag-and-drop file selection with visual feedback.',
      },
    },
  },
}; 