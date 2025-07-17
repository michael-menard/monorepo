import AvatarUploader from './index.tsx';

export default {
  title: 'Components/AvatarUploader',
  component: AvatarUploader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A reusable avatar upload component that supports image selection, preview, and upload functionality.',
      },
    },
  },
  argTypes: {
    userId: {
      control: 'text',
      description: 'The user ID for the avatar upload',
    },
    onUpload: {
      action: 'upload',
      description: 'Function called when upload is triggered',
    },
    onSuccess: {
      action: 'success',
      description: 'Callback when upload succeeds',
    },
    onError: {
      action: 'error',
      description: 'Callback when upload fails',
    },
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    userId: 'user-123',
    onUpload: async (file: File, userId: string) => {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Uploading file:', file.name, 'for user:', userId);
    },
  },
};

export const WithSuccessCallback = {
  args: {
    userId: 'user-456',
    onUpload: async (file: File, userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Upload successful for user:', userId);
    },
    onSuccess: () => {
      alert('Avatar uploaded successfully!');
    },
  },
};

export const WithErrorCallback = {
  args: {
    userId: 'user-789',
    onUpload: async (file: File, userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      throw new Error('Upload failed: Network error');
    },
    onError: (error: Error) => {
      alert(`Upload failed: ${error.message}`);
    },
  },
};

export const LoadingState = {
  args: {
    userId: 'user-101',
    onUpload: async (file: File, userId: string) => {
      // Simulate a longer upload time to show loading state
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Upload completed for user:', userId);
    },
  },
}; 