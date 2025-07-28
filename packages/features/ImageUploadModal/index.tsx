import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Label } from '@repo/ui';
import { FileUpload } from '@monorepo/fileupload';

interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    file: File;
    title: string;
    description: string;
    tags?: string[];
    extra?: Record<string, any>;
  }) => void;
  isLoading?: boolean;
  onUploadProgress?: (progress: number) => void;
  renderExtraFields?: (
    extra: Record<string, any>,
    setExtra: (v: Record<string, any>) => void,
  ) => React.ReactNode;
  theme?: 'light' | 'dark';
  maxFileSizeMB?: number;
  acceptedFormats?: string[];
  showTags?: boolean;
}

const DEFAULT_ACCEPTED_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/webp',
];

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  onUploadProgress,
  renderExtraFields,
  theme = 'light',
  maxFileSizeMB = 20,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  showTags = true,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [extra, setExtra] = useState<Record<string, any>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (files: File[] | File, metadata?: Record<string, any>) => {
      const file = Array.isArray(files) ? files[0] : files;
      if (!file) return;

      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        // Simulate upload progress
        const progressInterval = globalThis.setInterval(() => {
          setUploadProgress((prev) => {
            const newProgress = prev + 10;
            onUploadProgress?.(newProgress);
            return newProgress;
          });
        }, 100);

        // Simulate actual upload (replace with real upload logic)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        globalThis.clearInterval(progressInterval);
        setUploadProgress(100);
        onUploadProgress?.(100);

        // Prepare submission data
        const submissionData = {
          file,
          title: title.trim() || metadata?.title || 'Untitled',
          description: description.trim() || metadata?.description || '',
          tags: tags.length > 0 ? tags : metadata?.tags || [],
          extra: { ...extra, ...metadata?.extra },
        };

        onSubmit(submissionData);

        // Reset form
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        console.error('Image upload error:', err);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [title, description, tags, extra, onUploadProgress, onSubmit],
  );

  const handleError = useCallback((error: string) => {
    setError(error);
    console.error('Image upload error:', error);
  }, []);

  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setExtra({});
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
    onClose();
  }, [onClose]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags((prev) => [...prev, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  const metadataFields = [
    { name: 'title', label: 'Title', type: 'text' as const, required: true },
    { name: 'description', label: 'Description', type: 'text' as const },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`max-w-2xl ${theme === 'dark' ? 'dark' : ''}`}>
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* File Upload Component */}
          <FileUpload
            onUpload={handleUpload}
            onError={handleError}
            accept={acceptedFormats}
            multiple={false}
            maxSizeMB={maxFileSizeMB}
            showPreview={true}
            metadataFields={metadataFields}
            uploadButtonLabel="Select Image"
            disabled={isLoading || isUploading}
          />

          {/* Manual Metadata Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter image title"
                disabled={isLoading || isUploading}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter image description"
                disabled={isLoading || isUploading}
              />
            </div>

            {showTags && (
              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add tags (press Enter)"
                      disabled={isLoading || isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                      disabled={isLoading || isUploading || !tagInput.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                            disabled={isLoading || isUploading}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Extra Fields */}
            {renderExtraFields && (
              <div>
                <Label>Additional Fields</Label>
                {renderExtraFields(extra, setExtra)}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading || isUploading}>
            Cancel
          </Button>
          <Button
            onClick={() => handleUpload([], { title, description, tags, extra })}
            disabled={isLoading || isUploading || !title.trim()}
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadModal;
