// AvatarUploader React component
// Reusable avatar upload UI for monorepo apps
// Usage: import AvatarUploader from '@monorepo/avatar-uploader'
// See README.md for details
import React from 'react';
import { FileUpload } from '../../../../../ui/src/index.js';

export interface AvatarUploaderProps {
  userId: string;
  baseUrl: string; // Base URL for the API endpoint
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  uploadFunction?: (request: { userId: string; file: File }) => Promise<{ avatarUrl: string }>;
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
];

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ 
  userId, 
  baseUrl, 
  onSuccess, 
  onError, 
  uploadFunction 
}) => {
  const handleUpload = async (files: File[] | File) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;

    try {
      if (uploadFunction) {
        // Use the provided upload function instead of fetch
        const result = await uploadFunction({ userId, file });
        console.log('Avatar upload successful:', result);
        onSuccess?.();
      } else {
        // Fallback to original fetch behavior
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${baseUrl}/api/users/${userId}/avatar`, {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for authentication
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Avatar upload successful:', result);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(new Error(errorMessage));
      throw error;
    }
  };

  const handleError = (error: string) => {
    console.error('Avatar upload error:', error);
    onError?.(new Error(error));
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Upload Avatar</h2>
        <p className="text-sm text-gray-600">
          Select an image file to upload as your avatar
        </p>
        
        <FileUpload
          onUpload={handleUpload}
          onError={handleError}
          accept={ACCEPTED_TYPES}
          multiple={false}
          maxSizeMB={20}
          showPreview={true}
          mode="avatar"
          uploadButtonLabel="Upload Avatar"
        />
      </div>
    </div>
  );
};

export default AvatarUploader; 