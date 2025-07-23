import React from 'react';
import { FileUpload } from './index';

// Example 1: Basic image upload
export const BasicImageUpload = () => {
  const handleUpload = async (files: File[] | File) => {
    console.log('Uploading files:', files);
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Upload complete!');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Basic Image Upload</h2>
      <FileUpload
        onUpload={handleUpload}
        accept="image/*"
        uploadButtonLabel="Upload Images"
      />
    </div>
  );
};

// Example 2: Avatar upload with cropping
export const AvatarUpload = () => {
  const handleAvatarUpload = async (file: File[] | File) => {
    console.log('Uploading avatar:', file);
    // Simulate avatar upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Avatar upload complete!');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Avatar Upload</h2>
      <FileUpload
        onUpload={handleAvatarUpload}
        accept="image/*"
        multiple={false}
        mode="avatar"
        showCropper={true}
        cropAspectRatio={1}
        uploadButtonLabel="Upload Avatar"
      />
    </div>
  );
};

// Example 3: Multiple file upload with metadata
export const GalleryUpload = () => {
  const handleGalleryUpload = async (files: File[] | File, metadata?: Record<string, any>) => {
    console.log('Uploading gallery files:', files);
    console.log('Metadata:', metadata);
    // Simulate gallery upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Gallery upload complete!');
  };

  const metadataFields = [
    { name: 'title', label: 'Title', type: 'text' as const, required: true },
    { name: 'description', label: 'Description', type: 'text' as const },
    { name: 'category', label: 'Category', type: 'select' as const, options: ['Art', 'Nature', 'Urban', 'Portrait'] },
    { name: 'tags', label: 'Tags', type: 'text' as const },
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Gallery Upload with Metadata</h2>
      <FileUpload
        onUpload={handleGalleryUpload}
        accept={['image/jpeg', 'image/png', 'image/webp']}
        multiple={true}
        metadataFields={metadataFields}
        uploadButtonLabel="Upload to Gallery"
      />
    </div>
  );
};

// Example 4: Document upload
export const DocumentUpload = () => {
  const handleDocumentUpload = async (files: File[] | File) => {
    console.log('Uploading documents:', files);
    // Simulate document upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Document upload complete!');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Document Upload</h2>
      <FileUpload
        onUpload={handleDocumentUpload}
        accept={['.pdf', '.doc', '.docx', '.txt']}
        multiple={true}
        showPreview={false}
        uploadButtonLabel="Upload Documents"
      />
    </div>
  );
};

// Example 5: Modal upload
export const ModalUpload = () => {
  const handleModalUpload = async (files: File[] | File) => {
    console.log('Uploading via modal:', files);
    // Simulate modal upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Modal upload complete!');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Modal Upload</h2>
      <FileUpload
        onUpload={handleModalUpload}
        accept="image/*"
        mode="modal"
        uploadButtonLabel="Upload in Modal"
      />
    </div>
  );
};

// Example 6: Error handling
export const UploadWithErrorHandling = () => {
  const handleUploadWithErrors = async (files: File[] | File) => {
    console.log('Uploading files:', files);
    // Simulate upload error
    throw new Error('Network error occurred');
  };

  const handleError = (error: string) => {
    console.error('Upload error:', error);
    // You could show a toast notification here
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Upload with Error Handling</h2>
      <FileUpload
        onUpload={handleUploadWithErrors}
        onError={handleError}
        accept="image/*"
        uploadButtonLabel="Upload (Will Fail)"
      />
    </div>
  );
};

// Example 7: Disabled state
export const DisabledUpload = () => {
  const handleUpload = async (files: File[] | File) => {
    console.log('Uploading files:', files);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Disabled Upload</h2>
      <FileUpload
        onUpload={handleUpload}
        accept="image/*"
        disabled={true}
        uploadButtonLabel="Upload (Disabled)"
      />
    </div>
  );
};

// Example 8: Custom styling
export const CustomStyledUpload = () => {
  const handleUpload = async (files: File[] | File) => {
    console.log('Uploading files:', files);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Upload complete!');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Custom Styled Upload</h2>
      <FileUpload
        onUpload={handleUpload}
        accept="image/*"
        className="max-w-md mx-auto"
        dragAreaClassName="border-2 border-purple-300 bg-purple-50 hover:border-purple-400"
        previewClassName="border-purple-200 bg-purple-50"
        uploadButtonLabel="Upload with Custom Style"
      />
    </div>
  );
}; 