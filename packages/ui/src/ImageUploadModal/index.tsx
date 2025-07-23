import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '../dialog';
import { FileUpload } from '../FileUpload';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';

interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { file: File; title: string; description: string; extra?: Record<string, any> }) => void;
  isLoading?: boolean;
  onUploadProgress?: (progress: number) => void;
  renderExtraFields?: (extra: Record<string, any>, setExtra: (v: Record<string, any>) => void) => React.ReactNode;
  theme?: 'light' | 'dark';
}

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/heic'];

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  onUploadProgress,
  renderExtraFields,
  theme = 'light',
}) => {
  const { t } = useTranslation();

  const handleUpload = async (files: File[] | File, metadata?: Record<string, any>) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;

    // Compress/resize image before upload
    let uploadFile = file;
    try {
      uploadFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true });
    } catch (err) {
      throw new Error(t('Failed to compress image.'));
    }

    // Simulate upload progress or use onUploadProgress
    if (onUploadProgress) {
      onUploadProgress(0);
    }
    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      if (onUploadProgress) onUploadProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        const title = metadata?.title || '';
        const description = metadata?.description || '';
        const extra = metadata?.extra || {};
        
        onSubmit({ file: uploadFile, title, description, extra });
      }
    }, 50);
  };

  const handleError = (error: string) => {
    console.error('Image upload error:', error);
  };

  const metadataFields = [
    { name: 'title', label: t('Title'), type: 'text' as const, required: true },
    { name: 'description', label: t('Description'), type: 'text' as const },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl ${theme === 'dark' ? 'dark' : ''}`}>
        <DialogTitle>{t('Upload Image')}</DialogTitle>
        
        <div className="space-y-4">
          <FileUpload
            onUpload={handleUpload}
            onError={handleError}
            accept={ACCEPTED_FORMATS}
            multiple={false}
            maxSizeMB={20}
            showPreview={true}
            metadataFields={metadataFields}
            uploadButtonLabel={t('Upload Image')}
            disabled={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadModal; 